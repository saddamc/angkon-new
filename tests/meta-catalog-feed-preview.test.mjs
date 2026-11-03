import test, { beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { registerHooks } from "node:module";

/**
 * The public catalog feed is key-protected, so opening it bare always answers
 * 401. The admin "Preview feed" action must therefore run server-side with
 * META_CATALOG_FEED_KEY — without ever exposing that key to the browser.
 */

const STUBS = {
  "@/server/admin-auth": "tests/stubs/admin-auth-stub.mjs",
  "@/app/api/meta/catalog-feed/route": "tests/stubs/catalog-feed-route-stub.mjs",
};

function resolveAlias(specifier) {
  const target = path.resolve(process.cwd(), "src", specifier.slice(2));
  if (fs.existsSync(target) && fs.statSync(target).isFile()) return target;
  if (fs.existsSync(`${target}.ts`)) return `${target}.ts`;
  return `${target}/index.ts`;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    if (STUBS[specifier]) {
      return nextResolve(pathToFileURL(path.resolve(process.cwd(), STUBS[specifier])).href, context);
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
});

const { GET } = await import("../src/app/api/admin/meta/catalog-feed/preview/route.ts");
const { NextRequest } = await import("next/server");
const { sessionState, resetSession } = await import("./stubs/admin-auth-stub.mjs");
const { feedState, resetFeed } = await import("./stubs/catalog-feed-route-stub.mjs");

const ORIGINAL_KEY = process.env.META_CATALOG_FEED_KEY;
const TEST_KEY = "preview-test-key-9f3a";

function previewRequest(query = "") {
  return new NextRequest(`http://localhost/api/admin/meta/catalog-feed/preview${query}`);
}

beforeEach(() => {
  resetSession();
  resetFeed();
  process.env.META_CATALOG_FEED_KEY = TEST_KEY;
});

after(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.META_CATALOG_FEED_KEY;
  else process.env.META_CATALOG_FEED_KEY = ORIGINAL_KEY;
});

test("preview: rejects unauthenticated callers without touching the feed", async () => {
  sessionState.authorized = false;

  const res = await GET(previewRequest());

  assert.equal(res.status, 401);
  assert.equal(feedState.calls, 0, "no feed work before auth");
});

test("preview: returns the real feed for an authenticated superadmin", async () => {
  const res = await GET(previewRequest());

  assert.equal(res.status, 200);
  assert.equal(feedState.calls, 1);

  const body = await res.text();
  assert.ok(body.includes("<rss version=\"2.0\">"));
  assert.equal(res.headers.get("x-catalog-total-items"), "16", "feed headers are preserved");
});

test("preview: applies the environment key server-side", async () => {
  await GET(previewRequest());

  assert.ok(feedState.lastUrl, "the public handler must be invoked");
  assert.equal(
    feedState.lastUrl.searchParams.get("feed_key"),
    TEST_KEY,
    "the key from the environment must be injected into the internal call"
  );
});

test("preview: never leaks the key to the browser", async () => {
  const res = await GET(previewRequest());
  const body = await res.text();

  assert.ok(!body.includes(TEST_KEY), "the feed body must not contain the key");
  for (const [, value] of res.headers.entries()) {
    assert.ok(!value.includes(TEST_KEY), "no response header may contain the key");
  }
});

test("preview: marks the response as uncacheable and non-indexable", async () => {
  const res = await GET(previewRequest());

  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(res.headers.get("x-robots-tag"), "noindex, nofollow");
});

test("preview: forwards a requested diagnostic format", async () => {
  await GET(previewRequest("?format=json"));

  assert.equal(feedState.lastUrl.searchParams.get("format"), "json");
});

test("preview: explains a missing environment key instead of failing silently", async () => {
  delete process.env.META_CATALOG_FEED_KEY;

  const res = await GET(previewRequest());

  assert.equal(res.status, 409);
  const body = await res.json();
  assert.match(body.error, /META_CATALOG_FEED_KEY/);
  assert.equal(feedState.calls, 0);
});

test("preview: surfaces the feed's own failure status", async () => {
  feedState.status = 503;

  const res = await GET(previewRequest());

  assert.equal(res.status, 503, "a 503 from the feed must not be masked as 200");
});
