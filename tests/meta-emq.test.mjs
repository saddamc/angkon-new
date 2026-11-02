import test, { before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { registerHooks } from "node:module";

/* ──────────────────────────────────────────────────────────────────────────
 * Module hooks: resolve the `@/` alias and swap the outbound dependencies of
 * the EMQ route for in-memory stubs so no Meta or database call is made.
 * ────────────────────────────────────────────────────────────────────────── */

const STUBS = {
  "@/lib/integrations/meta/client": "tests/stubs/meta-client-stub.mjs",
  "@/server/admin-auth": "tests/stubs/admin-auth-stub.mjs",
  "@/server/pixel-settings": "tests/stubs/pixel-settings-stub.mjs",
};

function resolveAlias(specifier) {
  const target = path.resolve(process.cwd(), "src", specifier.slice(2));
  if (fs.existsSync(target) && fs.statSync(target).isFile()) return target;
  if (fs.existsSync(`${target}.ts`)) return `${target}.ts`;
  if (fs.existsSync(`${target}.json`)) return `${target}.json`;
  return `${target}/index.ts`;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") {
      return nextResolve("next/server.js", context);
    }
    if (STUBS[specifier]) {
      return nextResolve(
        pathToFileURL(path.resolve(process.cwd(), STUBS[specifier])).href,
        context
      );
    }
    if (specifier.startsWith("@/")) {
      return nextResolve(pathToFileURL(resolveAlias(specifier)).href, context);
    }
    if (
      !context.parentURL?.includes("node_modules") &&
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !/\.[cm]?[jt]s$/.test(specifier)
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (!url.includes("node_modules") && url.endsWith(".json")) {
      const content = fs.readFileSync(new URL(url), "utf8");
      return {
        format: "module",
        shortCircuit: true,
        source: `export default ${content};`,
      };
    }
    return nextLoad(url, context);
  },
});

const { normaliseDatasetQuality, fetchEventMatchQuality, resolveEmqTokens } =
  await import("../src/server/meta-emq.ts");
const { graphState, resetGraph, MetaGraphApiError } = await import(
  "./stubs/meta-client-stub.mjs"
);
const { sessionState, resetSession } = await import(
  "./stubs/admin-auth-stub.mjs"
);
const { pixelState, resetPixelSettings } = await import(
  "./stubs/pixel-settings-stub.mjs"
);
const { GET } = await import("../src/app/api/admin/meta/emq/route.ts");
const { NextRequest } = await import("next/server");

/* ──────────────────────────────────────────────────────────────────────────
 * Fixtures
 * ────────────────────────────────────────────────────────────────────────── */

/** Shaped from Meta's Dataset Quality API reference response. */
function datasetQualityPayload() {
  return {
    web: [
      {
        event_name: "Purchase",
        event_match_quality: [
          {
            composite_score: 7.4,
            match_key_feedback: [
              { identifier: "em", coverage: { percentage: 0.82 } },
              { identifier: "ph", coverage: { percentage: 46 } },
              { identifier: "external_id", coverage: { percentage: 0.1 } },
            ],
          },
        ],
        event_coverage: 0.9,
        diagnostics: [
          {
            name: "Missing email address",
            description: "30% of Purchase events have no email.",
            solution: "Hash and send the email address at page load.",
            percentage: 0.3,
            affected_event_count: 300,
            total_event_count: 1000,
          },
        ],
        data_freshness: "REAL_TIME",
        event_spend: 12000.5,
      },
      {
        event_name: "ViewContent",
        // Same payload, but delivered as an object rather than an array —
        // Meta has shipped both shapes across API versions.
        event_match_quality: {
          composite_score: 6,
          match_key_feedback: [
            { identifier: "em", coverage: { percentage: 0.55 } },
            { identifier: "ph", coverage: { percentage: 0.9 } },
          ],
        },
        event_coverage: 0.75,
      },
    ],
  };
}

function emqRequest() {
  return new NextRequest("http://localhost/api/admin/meta/emq");
}

function suppressWarn(fn) {
  const original = console.warn;
  console.warn = () => {};
  return fn().finally(() => {
    console.warn = original;
  });
}

before(() => {
  resetGraph();
  resetSession();
  resetPixelSettings();
});

beforeEach(() => {
  resetGraph();
  resetSession();
  resetPixelSettings();
});

after(() => {
  resetGraph();
  resetSession();
  resetPixelSettings();
});

/* ──────────────────────────────────────────────────────────────────────────
 * Normalisation
 * ────────────────────────────────────────────────────────────────────────── */

test("EMQ: computes the headline score as the mean of per-event scores", () => {
  const report = normaliseDatasetQuality(datasetQualityPayload(), "123");

  assert.equal(report.datasetId, "123");
  assert.equal(report.events.length, 2);
  // (7.4 + 6.0) / 2
  assert.ok(Math.abs(report.compositeScore - 6.7) < 1e-9);
});

test("EMQ: normalises match keys, labels, and whole-percentage coverage", () => {
  const report = normaliseDatasetQuality(datasetQualityPayload(), "123");
  const purchase = report.events.find((event) => event.eventName === "Purchase");

  assert.equal(purchase.matchKeys.length, 3);

  const email = purchase.matchKeys.find((key) => key.identifier === "em");
  assert.equal(email.label, "Email address");
  assert.equal(email.coverage, 0.82);

  // Meta sometimes reports 0-100 instead of 0-1; both must land on 0..1.
  const phone = purchase.matchKeys.find((key) => key.identifier === "ph");
  assert.equal(phone.coverage, 0.46);
  assert.equal(phone.label, "Phone number");
});

test("EMQ: tolerates event_match_quality arriving as an object", () => {
  const report = normaliseDatasetQuality(datasetQualityPayload(), "123");
  const view = report.events.find((event) => event.eventName === "ViewContent");

  assert.equal(view.score, 6);
  assert.equal(view.coverage, 0.75);
});

test("EMQ: surfaces Meta's diagnostic solution as the first suggestion", () => {
  const report = normaliseDatasetQuality(datasetQualityPayload(), "123");

  assert.equal(report.suggestions[0], "Hash and send the email address at page load.");

  const purchase = report.events.find((event) => event.eventName === "Purchase");
  assert.equal(purchase.diagnostics.length, 1);
  assert.equal(purchase.diagnostics[0].affectedEventCount, 300);
  assert.equal(purchase.diagnostics[0].totalEventCount, 1000);
});

test("EMQ: derives fix advice for weak match keys, worst first", () => {
  const report = normaliseDatasetQuality(datasetQualityPayload(), "123");

  const externalAdvice = report.suggestions.find((text) =>
    text.includes("External ID reaches only 10%")
  );
  assert.ok(externalAdvice, `missing derived advice, got: ${report.suggestions.join(" | ")}`);

  // Strong keys must not generate noise: email is 82% on Purchase, but its
  // weakest event (ViewContent, 55%) is what the advice is keyed on — and
  // that same line is asserted below, so nothing strong-only is invented.
  const emailAdvice = report.suggestions.filter((text) =>
    text.startsWith("Email address reaches")
  );
  assert.equal(emailAdvice.length, 1, "one aggregated line per weak key");

  // Worst key is listed before better-but-still-weak keys.
  const externalIndex = report.suggestions.indexOf(externalAdvice);
  const emailIndex = report.suggestions.findIndex((text) =>
    text.includes("Email address reaches only 55%")
  );
  assert.ok(emailIndex > externalIndex, "weaker coverage should be listed first");
});

test("EMQ: aggregate match keys keep the worst coverage per identifier", () => {
  const report = normaliseDatasetQuality(datasetQualityPayload(), "123");

  const email = report.matchKeys.find((key) => key.identifier === "em");
  assert.equal(email.coverage, 0.55, "aggregate must report the weaker event");

  const phone = report.matchKeys.find((key) => key.identifier === "ph");
  assert.equal(phone.coverage, 0.46);

  // Sorted weakest-first so the panel leads with the biggest gap.
  const coverages = report.matchKeys
    .map((key) => key.coverage)
    .filter((value) => value !== null);
  assert.deepEqual(coverages, [...coverages].sort((a, b) => a - b));
});

test("EMQ: preserves freshness and spend without interpreting them", () => {
  const report = normaliseDatasetQuality(datasetQualityPayload(), "123");
  const purchase = report.events.find((event) => event.eventName === "Purchase");

  assert.equal(purchase.freshness, "REAL_TIME");
  assert.equal(purchase.spend, 12000.5);
});

test("EMQ: empty or malformed payloads degrade instead of throwing", () => {
  for (const payload of [{}, null, [], "nonsense", { web: [] }, { web: [{}] }]) {
    const report = normaliseDatasetQuality(payload, "123");
    assert.equal(report.events.length, 0);
    assert.equal(report.compositeScore, null);
    assert.deepEqual(report.suggestions, []);
  }

  // Partial events must not crash the reporter either.
  const partial = normaliseDatasetQuality(
    { web: [{ event_name: "Purchase" }] },
    "123"
  );
  assert.equal(partial.events.length, 1);
  assert.equal(partial.events[0].score, null);
  assert.deepEqual(partial.events[0].matchKeys, []);
});

/* ──────────────────────────────────────────────────────────────────────────
 * Fetching
 * ────────────────────────────────────────────────────────────────────────── */

test("EMQ fetch: returns not-configured without calling Meta", async () => {
  const result = await fetchEventMatchQuality({ datasetId: "", accessToken: "" });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "not-configured");
  assert.equal(graphState.calls.length, 0);
});

test("EMQ fetch: normalises a live Graph response", async () => {
  graphState.payload = datasetQualityPayload();

  const result = await fetchEventMatchQuality({
    datasetId: "999",
    accessToken: "token-a",
  });

  assert.equal(result.ok, true);
  assert.ok(Math.abs(result.report.compositeScore - 6.7) < 1e-9);
  assert.equal(graphState.calls.length, 1);
  assert.equal(graphState.calls[0].path, "dataset_quality");
  assert.equal(graphState.calls[0].params.dataset_id, "999");
  // The selected field list keeps the payload small and stable.
  assert.ok(String(graphState.calls[0].params.fields).startsWith("web{"));
});

test("EMQ fetch: reports Meta's empty dataset as not-found", async () => {
  graphState.payload = { web: [] };

  const result = await fetchEventMatchQuality({
    datasetId: "999",
    accessToken: "token-a",
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "not-found");
  assert.match(result.message, /no events/i);
});

test("EMQ fetch: retries once with an unfiltered field list", async () => {
  graphState.payload = datasetQualityPayload();
  graphState.rejectFieldsOnce = true;

  const result = await fetchEventMatchQuality({
    datasetId: "999",
    accessToken: "token-a",
  });

  assert.equal(result.ok, true);
  assert.equal(graphState.calls.length, 2);
  assert.equal(graphState.calls[1].params.fields, "web");
});

test("EMQ fetch: falls back to the second token on permission errors", async () => {
  // The first token is rejected for missing permissions; the second succeeds.
  graphState.payload = datasetQualityPayload();
  graphState.errors = [
    new MetaGraphApiError(403, {
      code: 200,
      message: "Requires ads_read permission",
      category: "MISSING_PERMISSIONS",
    }),
  ];

  const result = await suppressWarn(() =>
    fetchEventMatchQuality({
      datasetId: "999",
      accessToken: "token-a",
      fallbackAccessTokens: ["token-b"],
    })
  );

  assert.equal(result.ok, true);
  assert.equal(graphState.calls.length, 2, "the fallback token should be attempted");
  assert.equal(graphState.calls[0].token, "token-a");
  assert.equal(graphState.calls[1].token, "token-b");
});

test("EMQ fetch: does not retry after a rate limit", async () => {
  graphState.error = new MetaGraphApiError(429, {
    code: 32,
    message: "Application request limit reached",
    category: "RATE_LIMITED",
  });

  const result = await suppressWarn(() =>
    fetchEventMatchQuality({
      datasetId: "999",
      accessToken: "token-a",
      fallbackAccessTokens: ["token-b"],
    })
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "rate-limited");
  assert.equal(graphState.calls.length, 1, "retrying a rate limit makes it worse");
});

test("EMQ fetch: maps invalid tokens to a secret-free message", async () => {
  graphState.error = new MetaGraphApiError(400, {
    code: 190,
    message: "Error validating access token: Session has expired",
    category: "INVALID_TOKEN",
  });

  const result = await suppressWarn(() =>
    fetchEventMatchQuality({ datasetId: "999", accessToken: "EAABwzLixnj" })
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "unauthorized");
  assert.ok(!result.message.includes("EAABwzLixnj"), "token must not leak");
});

test("EMQ tokens: prefers the marketing token, then the CAPI token", () => {
  assert.deepEqual(resolveEmqTokens({}), { primary: "", fallbacks: [], source: null });

  const capiOnly = resolveEmqTokens({ capiAccessToken: " capi-token " });
  assert.equal(capiOnly.primary, "capi-token");
  assert.equal(capiOnly.source, "capi");

  const both = resolveEmqTokens({
    marketingApiAccessToken: " mkt ",
    capiAccessToken: " capi ",
  });
  assert.equal(both.primary, "mkt");
  assert.equal(both.source, "marketing");
  assert.deepEqual(both.fallbacks, ["capi"]);
});

/* ──────────────────────────────────────────────────────────────────────────
 * API route
 * ────────────────────────────────────────────────────────────────────────── */

test("EMQ route: rejects unauthenticated callers with 401", async () => {
  sessionState.authorized = false;

  const res = await GET(emqRequest());

  assert.equal(res.status, 401);
  const body = await res.json();
  assert.ok(body.error);
  assert.equal(graphState.calls.length, 0, "no Meta call before auth");
});

test("EMQ route: rejects non-superadmins with 403", async () => {
  sessionState.role = "admin";

  const res = await GET(emqRequest());

  assert.equal(res.status, 403);
  assert.equal(graphState.calls.length, 0);
});

test("EMQ route: answers 409 when no pixel or token is configured", async () => {
  const res = await GET(emqRequest());

  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.ok, false);
  assert.equal(body.reason, "not-configured");
  assert.equal(graphState.calls.length, 0);
});

test("EMQ route: returns the normalised report and never the token", async () => {
  pixelState.pixelId = "123456789012345";
  pixelState.marketingApiAccessToken = "secret-marketing-token";
  graphState.payload = datasetQualityPayload();

  const res = await GET(emqRequest());
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.tokenSource, "marketing");
  assert.ok(Math.abs(body.report.compositeScore - 6.7) < 1e-9);
  assert.equal(body.report.events.length, 2);
  assert.ok(body.report.suggestions.length >= 2);
  assert.ok(body.report.datasetId === "123456789012345");

  const serialised = JSON.stringify(body);
  assert.ok(!serialised.includes("secret-marketing-token"), "token leaked to the client");
});

test("EMQ route: maps token rejection to 409 with a generic message", async () => {
  pixelState.pixelId = "123456789012345";
  pixelState.capiAccessToken = "secret-capi-token";
  graphState.error = new MetaGraphApiError(400, {
    code: 190,
    message: "Error validating access token",
    category: "INVALID_TOKEN",
  });

  const res = await suppressWarn(() => GET(emqRequest()));

  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.ok, false);
  assert.equal(body.reason, "unauthorized");
  assert.ok(!JSON.stringify(body).includes("secret-capi-token"));
});

test("EMQ route: surfaces upstream failures as 502 without internals", async () => {
  pixelState.pixelId = "123456789012345";
  pixelState.capiAccessToken = "secret-capi-token";
  graphState.error = new MetaGraphApiError(500, {
    code: 2,
    message: "An unexpected error has occurred",
    category: "TRANSIENT",
  });

  const res = await suppressWarn(() => GET(emqRequest()));

  assert.equal(res.status, 502);
  const body = await res.json();
  assert.equal(body.reason, "upstream-error");
  assert.ok(!JSON.stringify(body).includes("secret-capi-token"));
});

test("EMQ route: an empty dataset answers 404 with guidance", async () => {
  pixelState.pixelId = "123456789012345";
  pixelState.capiAccessToken = "secret-capi-token";
  graphState.payload = { web: [] };

  const res = await suppressWarn(() => GET(emqRequest()));

  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.reason, "not-found");
  assert.match(body.error, /no events/i);
});
