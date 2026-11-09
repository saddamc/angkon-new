import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

/**
 * Accuracy contract for the Meta Events Manager page.
 *
 * Every number on this page must come from the storefront ledger or from Meta.
 * These guards fail if a placeholder count, a frozen date range, or a sampled
 * deduplication rate ever creeps back in.
 */

const PAGE = "src/app/admin/meta/events/page.tsx";
const TELEMETRY = "src/app/admin/meta/events/_components/telemetry-tab.tsx";
const HEADER = "src/app/admin/meta/events/_components/events-workspace-header.tsx";
const VOLUMES = "src/server/meta-event-volumes.ts";
const PIXEL_SETTINGS = "src/server/pixel-settings.ts";

const page = fs.readFileSync(PAGE, "utf8");
const telemetry = fs.readFileSync(TELEMETRY, "utf8");
const header = fs.readFileSync(HEADER, "utf8");
const volumes = fs.readFileSync(VOLUMES, "utf8");
const pixelSettings = fs.readFileSync(PIXEL_SETTINGS, "utf8");

test("events: no fabricated fallback volumes", () => {
  for (const fake of ["?? 982", "?? 230", "?? 15", "?? 9", "?? 26"]) {
    assert.ok(!page.includes(fake), `${fake} is an invented count`);
  }
  for (const name of ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase"]) {
    assert.ok(
      page.includes(`eventStats.${name} ?? 0`),
      `${name} must fall back to zero, not to a made-up number`
    );
  }
});

test("events: no fabricated chart series", () => {
  assert.ok(!page.includes("DEFAULT_META_TIMESERIES"), "the fake series must be gone");
  assert.ok(
    page.includes("setTimeseries(Array.isArray(data.series) ? data.series : [])"),
    "the chart must render the API series (or nothing), never a stand-in"
  );
});

test("events: no fabricated channel split", () => {
  assert.ok(!page.includes("return { browserPct: 50, serverPct: 50 };"), "50/50 is a guess");
  assert.ok(
    page.includes("if (total === 0) return { browserPct: 0, serverPct: 0 };"),
    "unknown delivery mix must read as 0/0"
  );
  assert.ok(page.includes("eventChannelStats"), "per-event split must come from the ledger");
});

test("events: Meta volume permission is surfaced, not hidden", () => {
  assert.ok(
    page.includes('value === null && reason === "no-permission"'),
    "a denied token must be distinguishable from missing data"
  );
  assert.ok(
    page.includes('"Permission required"'),
    "the table must say why the Meta column is empty"
  );
});

test("events: window labels are computed, not frozen", () => {
  assert.ok(!page.includes("Oct 5"), "the frozen month must not return");
  assert.ok(!header.includes("Oct 5"), "the menu must not hard-code October");
  assert.ok(
    header.includes("formatWindowLabel("),
    "the header must use the live range helper"
  );
});

test("events: Meta volumes use the documented stats edge", () => {
  assert.ok(volumes.includes('aggregation: "event_total_counts"'));
  assert.ok(volumes.includes("/stats"));
  assert.ok(volumes.includes("normalisePixelStats"));
  assert.ok(
    page.includes("/api/admin/meta/events/volumes"),
    "the page must consume Meta-reported volumes"
  );
});

test("events: deduplication covers the whole ledger, not the recent sample", () => {
  assert.ok(
    pixelSettings.includes("dedupGroups") &&
      pixelSettings.includes('{ $addToSet: "$source" }'),
    "dedupe must aggregate every eventId"
  );
  assert.ok(
    !pixelSettings.includes("for (const doc of docs as any[])"),
    "the 200-row sample must not drive the dedupe rate"
  );
});

test("events: no percentage is invented when the stat is missing", () => {
  assert.ok(!telemetry.includes('"100% Dispatched"'));
  assert.ok(!telemetry.includes('totalEventsCount > 0 ? "100%" : "0%"'));
  assert.ok(!telemetry.includes("?? (totalEventsCount > 0 ? 50 : 0)"));
});
