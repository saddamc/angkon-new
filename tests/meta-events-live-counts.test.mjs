import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

/**
 * The Events page used to render hand-written Meta counts ("~1,600", "321",
 * "77"…) baked into the component. Those numbers never changed, so the
 * "Meta" column lied the moment real traffic moved.
 *
 * Meta's reported volume now comes from the Dataset Quality API via EMQ, and
 * the page polls instead of showing a frozen snapshot.
 */

const PAGE = "src/app/admin/meta/events/page.tsx";
const EMQ = "src/server/meta-emq.ts";

const page = fs.readFileSync(PAGE, "utf8");
const emq = fs.readFileSync(EMQ, "utf8");

test("events: no hand-written Meta event counts remain", () => {
  const hardcoded = page.match(/metaReported:\s*"[^"]*"/g) || [];
  assert.deepEqual(
    hardcoded,
    [],
    `these Meta counts were fabricated rather than fetched: ${hardcoded.join(", ")}`
  );
});

test("events: every funnel row reads its Meta count from EMQ", () => {
  for (const source of ["pvMetaTotal", "vcMetaTotal", "atcMetaTotal", "icMetaTotal", "purMetaTotal"]) {
    assert.ok(
      page.includes(`metaReported: ${source},`),
      `${source} must feed the Meta column`
    );
  }
  assert.ok(page.includes("const getEmqTotal = (eventName: string)"));
});

test("events: a missing Meta count renders as 'Not reported', not a number", () => {
  assert.ok(page.includes("function formatMetaReported"));
  assert.ok(
    page.includes('value === null ? "Not reported"'),
    "null must be surfaced honestly"
  );
  assert.ok(page.includes('eventName === "TestEvent"'));
  // Both the table and the detail drawer go through the same formatter.
  assert.ok(
    (page.match(/formatMetaReported\(/g) || []).length >= 3,
    "table and drawer must share one formatter"
  );
});

test("events: the page polls instead of showing a frozen snapshot", () => {
  assert.ok(
    page.includes("const timer = setInterval"),
    "an auto-refresh timer must exist"
  );
  assert.ok(
    page.includes("void fetchTelemetry();\n      reloadEmq();") ||
      /void fetchTelemetry\(\);[\s\S]{0,40}reloadEmq\(\);/.test(page),
    "the timer must refresh both local telemetry and Meta's EMQ report"
  );
  assert.ok(page.includes("}, 60_000);"), "refresh cadence should be one minute");
});

test("emq: the report carries Meta's event volume to the client", () => {
  assert.ok(emq.includes("totalEventCount: number | null;"));
  assert.ok(
    emq.includes("totalEventCount: directEventCount ?? diagnosticEventCount"),
    "the normaliser must read the event's own count, then fall back to diagnostics"
  );
  assert.ok(emq.includes("readFirstNumber([\n    raw.total_event_count"));
});
