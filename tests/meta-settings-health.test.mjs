import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSettingsHealth,
  computeReadiness,
  formatStamp,
  truncateMiddle,
} from "../src/components/admin/meta/settings-health.ts";

/* ──────────────────────────────────────────────────────────────────────────
 * Fixtures
 * ────────────────────────────────────────────────────────────────────────── */

/** Every subsystem fully configured. */
function fullyConfigured() {
  return {
    general: { businessId: "109876543210987", appId: "1234567890", hasAppSecret: true, status: "Connected" },
    dataset: { pixelId: "1304551066085265", enabled: true, status: "Connected" },
    ads: {
      adAccountId: "act_9876543210",
      hasMarketingToken: true,
      status: "Verified",
      lastVerifiedAt: "2026-11-01T10:00:00.000Z",
    },
    capi: { hasCapiToken: true, status: "Connected" },
    catalog: { catalogId: "1112170671558899", hasFeedKey: true, productCount: 16, status: "Connected" },
    domain: {
      domain: "angkon.net",
      status: "Verified",
      lastVerifiedAt: "2026-11-01T10:00:00.000Z",
    },
    security: {
      encryptionAlgorithm: "aes-256-gcm",
      capiTokenEncrypted: true,
      marketingTokenEncrypted: true,
      lastCredentialUpdate: "2026-11-01T10:00:00.000Z",
    },
    sync: {
      status: "Success",
      lastSuccessfulSync: "2026-11-02T04:00:00.000Z",
      nextScheduledSync: "2026-11-03T04:00:00.000Z",
      durationMs: 1840,
      lastError: null,
    },
  };
}

/** Nothing configured at all. */
function emptyConfig() {
  return {
    general: { businessId: "", appId: "", hasAppSecret: false, status: "Pending" },
    dataset: { pixelId: "", enabled: false, status: "Pending" },
    ads: { adAccountId: "", hasMarketingToken: false, status: "Pending", lastVerifiedAt: null },
    capi: { hasCapiToken: false, status: "Pending" },
    catalog: { catalogId: "", hasFeedKey: false, productCount: 0, status: "Pending" },
    domain: { domain: "", status: "Pending", lastVerifiedAt: null },
    security: {
      encryptionAlgorithm: "aes-256-gcm",
      capiTokenEncrypted: false,
      marketingTokenEncrypted: false,
      lastCredentialUpdate: null,
    },
    sync: {
      status: "Idle",
      lastSuccessfulSync: null,
      nextScheduledSync: null,
      durationMs: 0,
      lastError: null,
    },
  };
}

const byId = (items, id) => items.find((item) => item.id === id);

/* ──────────────────────────────────────────────────────────────────────────
 * Readiness derivation
 * ────────────────────────────────────────────────────────────────────────── */

test("health: a fully configured suite reports every subsystem ready", () => {
  const items = buildSettingsHealth(fullyConfigured());

  assert.equal(items.length, 8);
  for (const item of items) {
    assert.equal(item.state, "ready", `${item.id} should be ready`);
  }

  const readiness = computeReadiness(items);
  assert.equal(readiness.readyCount, 8);
  assert.equal(readiness.percent, 100);
  assert.equal(readiness.ratio, 1);
});

test("health: an unconfigured suite reports every subsystem missing", () => {
  const items = buildSettingsHealth(emptyConfig());

  for (const item of items) {
    assert.equal(item.state, "missing", `${item.id} should be missing`);
  }

  const readiness = computeReadiness(items);
  assert.equal(readiness.readyCount, 0);
  assert.equal(readiness.percent, 0);
});

test("health: a null payload degrades to the empty map instead of throwing", () => {
  const items = buildSettingsHealth(null);
  assert.equal(items.length, 8);
  assert.ok(items.every((item) => item.state === "missing"));

  // The fallback must be a copy — mutating one result cannot leak into the next.
  items[0].state = "ready";
  assert.equal(buildSettingsHealth(null)[0].state, "missing");
});

test("health: a partially populated payload degrades instead of throwing", () => {
  const empty = buildSettingsHealth({});
  assert.equal(empty.length, 8);
  assert.ok(empty.every((item) => item.state === "missing"));

  // Only the dataset block arrived — everything else must stay "not set".
  const partial = buildSettingsHealth({
    dataset: { pixelId: "1304551066085265", enabled: true, status: "Connected" },
  });
  assert.equal(byId(partial, "dataset").state, "ready");
  assert.equal(byId(partial, "capi").state, "missing");
  assert.equal(byId(partial, "sync").detail, "Never synced");
});

test("health: business portfolio needs ID, app ID and secret to be ready", () => {
  const config = fullyConfigured();

  config.general.hasAppSecret = false;
  assert.equal(byId(buildSettingsHealth(config), "general").state, "partial");

  config.general.appId = "";
  config.general.businessId = "";
  assert.equal(byId(buildSettingsHealth(config), "general").state, "missing");
});

test("health: a pixel that is saved but disabled is partial, not ready", () => {
  const config = fullyConfigured();
  config.dataset.enabled = false;

  const dataset = byId(buildSettingsHealth(config), "dataset");
  assert.equal(dataset.state, "partial");
  // The tile must say *why* it is partial, not just repeat the pixel id.
  assert.equal(dataset.detail, "Tracking disabled");
});

test("health: a partial subsystem always explains what is missing", () => {
  const config = fullyConfigured();

  config.general.hasAppSecret = false;
  assert.equal(byId(buildSettingsHealth(config), "general").detail, "App secret not saved");

  config.dataset.enabled = false;
  assert.equal(byId(buildSettingsHealth(config), "dataset").detail, "Tracking disabled");

  config.ads.hasMarketingToken = false;
  assert.equal(byId(buildSettingsHealth(config), "ads").detail, "Ad account or token missing");

  config.catalog.hasFeedKey = false;
  assert.equal(byId(buildSettingsHealth(config), "catalog").detail, "Feed key or catalog missing");

  config.domain.status = "Pending";
  assert.equal(byId(buildSettingsHealth(config), "domain").detail, "Not verified yet");

  config.security.marketingTokenEncrypted = false;
  assert.equal(byId(buildSettingsHealth(config), "security").detail, "Some tokens unencrypted");

  config.sync.lastError = "Graph API timeout";
  assert.equal(byId(buildSettingsHealth(config), "sync").detail, "Last run reported an error");
});

test("health: ready subsystems show their identifier, not a warning", () => {
  const items = buildSettingsHealth(fullyConfigured());

  assert.match(byId(items, "general").detail, /^10987654…/);
  assert.match(byId(items, "dataset").detail, /^Pixel /);
  assert.equal(byId(items, "capi").detail, "Token stored");
  assert.match(byId(items, "catalog").detail, /products$/);
  assert.equal(byId(items, "domain").detail, "angkon.net");
});

test("health: ads needs both an account and a marketing token", () => {
  const config = fullyConfigured();

  config.ads.hasMarketingToken = false;
  assert.equal(byId(buildSettingsHealth(config), "ads").state, "partial");

  config.ads.adAccountId = "";
  assert.equal(byId(buildSettingsHealth(config), "ads").state, "missing");
});

test("health: catalog readiness tracks the catalog ID and the feed key", () => {
  const config = fullyConfigured();

  config.catalog.hasFeedKey = false;
  assert.equal(byId(buildSettingsHealth(config), "catalog").state, "partial");

  config.catalog.catalogId = "";
  assert.equal(byId(buildSettingsHealth(config), "catalog").state, "missing");
});

test("health: a saved domain only counts as ready once Meta verifies it", () => {
  const config = fullyConfigured();

  config.domain.status = "Pending";
  assert.equal(byId(buildSettingsHealth(config), "domain").state, "partial");

  config.domain.domain = "";
  assert.equal(byId(buildSettingsHealth(config), "domain").state, "missing");
});

test("health: security is ready only when every stored token is encrypted", () => {
  const config = fullyConfigured();

  config.security.marketingTokenEncrypted = false;
  assert.equal(byId(buildSettingsHealth(config), "security").state, "partial");

  config.security.capiTokenEncrypted = false;
  assert.equal(byId(buildSettingsHealth(config), "security").state, "missing");
});

test("health: a sync that errored is partial even if it once succeeded", () => {
  const config = fullyConfigured();
  config.sync.lastError = "Graph API timeout";

  assert.equal(byId(buildSettingsHealth(config), "sync").state, "partial");

  config.sync.lastSuccessfulSync = null;
  assert.equal(byId(buildSettingsHealth(config), "sync").state, "missing");
});

/* ──────────────────────────────────────────────────────────────────────────
 * Details shown on the tiles
 * ────────────────────────────────────────────────────────────────────────── */

test("health: catalog detail pluralises the product count correctly", () => {
  const config = fullyConfigured();

  assert.equal(byId(buildSettingsHealth(config), "catalog").detail, "16 products");

  config.catalog.productCount = 1;
  assert.equal(byId(buildSettingsHealth(config), "catalog").detail, "1 product");

  config.catalog.productCount = 0;
  assert.equal(byId(buildSettingsHealth(config), "catalog").detail, "0 products");
});

test("health: missing subsystems explain what is absent", () => {
  const items = buildSettingsHealth(emptyConfig());

  assert.equal(byId(items, "general").detail, "No Business ID");
  assert.equal(byId(items, "dataset").detail, "No dataset");
  assert.equal(byId(items, "ads").detail, "No ad account");
  assert.equal(byId(items, "capi").detail, "No CAPI token");
  assert.equal(byId(items, "catalog").detail, "No catalog");
  assert.equal(byId(items, "domain").detail, "No domain");
  assert.equal(byId(items, "sync").detail, "Never synced");
});

test("health: long identifiers are shortened in the middle", () => {
  assert.equal(truncateMiddle("1304551066085265", 6, 4), "130455…5265");
  // Short values are returned untouched.
  assert.equal(truncateMiddle("act_123", 6, 4), "act_123");
});

/* ──────────────────────────────────────────────────────────────────────────
 * Scoring
 * ────────────────────────────────────────────────────────────────────────── */

test("readiness: partial subsystems count half, so 50% is not 'ready'", () => {
  const items = [
    { id: "a", label: "A", state: "ready", detail: "" },
    { id: "b", label: "B", state: "partial", detail: "" },
    { id: "c", label: "C", state: "missing", detail: "" },
    { id: "d", label: "D", state: "missing", detail: "" },
  ];

  const readiness = computeReadiness(items);
  assert.equal(readiness.score, 1.5);
  assert.equal(readiness.ratio, 0.375);
  assert.equal(readiness.percent, 38);
  assert.equal(readiness.readyCount, 1);
  assert.equal(readiness.total, 4);
});

test("readiness: an empty list cannot divide by zero", () => {
  const readiness = computeReadiness([]);
  assert.equal(readiness.ratio, 0);
  assert.equal(readiness.percent, 0);
  assert.equal(readiness.total, 0);
});

/* ──────────────────────────────────────────────────────────────────────────
 * Deterministic timestamps (hydration-safe)
 * ────────────────────────────────────────────────────────────────────────── */

test("formatStamp: renders a fixed UTC stamp regardless of host timezone", () => {
  assert.equal(formatStamp("2026-11-02T04:05:00.000Z"), "2026-11-02 04:05 UTC");
  // Offset input normalises to UTC, so server and browser agree.
  assert.equal(formatStamp("2026-11-02T10:05:00.000+06:00"), "2026-11-02 04:05 UTC");
});

test("formatStamp: absent or invalid input renders an em dash", () => {
  assert.equal(formatStamp(null), "—");
  assert.equal(formatStamp(undefined), "—");
  assert.equal(formatStamp(""), "—");
  assert.equal(formatStamp("not-a-date"), "—");
});
