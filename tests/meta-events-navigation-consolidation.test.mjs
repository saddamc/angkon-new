import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Events Consolidation: 1. Consolidated route /admin/meta/events exists with 4 tabs", () => {
  const eventsPagePath = path.resolve("src/app/admin/meta/events/page.tsx");
  assert.ok(fs.existsSync(eventsPagePath), "src/app/admin/meta/events/page.tsx must exist");

  const content = fs.readFileSync(eventsPagePath, "utf-8");

  // Verify the 4 approved tabs exist
  assert.ok(content.includes('"events-manager"'), "Must provide Events Manager tab");
  assert.ok(content.includes('"conversions-api"'), "Must provide Conversions API tab");
  assert.ok(content.includes('"diagnostics"'), "Must provide Diagnostics tab");
  assert.ok(content.includes('"event-logs"'), "Must provide Event Logs tab");

  // Verify URL search param synchronization
  assert.ok(content.includes("useSearchParams"), "Must sync active tab with searchParams");
  assert.ok(content.includes("history.replaceState"), "Must update URL query without full reload");
});

test("Events Consolidation: 2. Legacy /admin/meta/pixel redirects to /admin/meta/events?tab=events-manager", () => {
  const pixelPagePath = path.resolve("src/app/admin/meta/pixel/page.tsx");
  assert.ok(fs.existsSync(pixelPagePath), "Legacy pixel page must exist for bookmarked URL support");

  const content = fs.readFileSync(pixelPagePath, "utf-8");
  assert.ok(content.includes("redirect("), "Must call redirect()");
  assert.ok(
    content.includes('"/admin/meta/events?tab=events-manager"'),
    "Must redirect to events-manager tab"
  );
});

test("Events Consolidation: 3. Legacy /admin/meta/conversions-api redirects to /admin/meta/events?tab=conversions-api", () => {
  const capiPagePath = path.resolve("src/app/admin/meta/conversions-api/page.tsx");
  assert.ok(fs.existsSync(capiPagePath), "Legacy conversions-api page must exist for bookmarked URL support");

  const content = fs.readFileSync(capiPagePath, "utf-8");
  assert.ok(content.includes("redirect("), "Must call redirect()");
  assert.ok(
    content.includes('"/admin/meta/events?tab=conversions-api"'),
    "Must redirect to conversions-api tab"
  );
});

test("Events Consolidation: 4. next.config.ts contains server redirects for legacy URLs", () => {
  const nextConfigPath = path.resolve("next.config.ts");
  const content = fs.readFileSync(nextConfigPath, "utf-8");

  assert.ok(
    content.includes('source: "/admin/meta/pixel"'),
    "next.config.ts must redirect /admin/meta/pixel"
  );
  assert.ok(
    content.includes('source: "/admin/meta/conversions-api"'),
    "next.config.ts must redirect /admin/meta/conversions-api"
  );
});

test("Events Consolidation: 5. Meta sidebar navigation points to /admin/meta/events", () => {
  const metaNavPath = path.resolve("src/app/admin/meta/meta-nav.tsx");
  const content = fs.readFileSync(metaNavPath, "utf-8");

  assert.ok(
    content.includes('href: "/admin/meta/events"'),
    "Sidebar item must point directly to /admin/meta/events"
  );
});

test("Events Consolidation: 6. Overview page links point directly to /admin/meta/events with tabs", () => {
  const overviewPath = path.resolve("src/app/admin/meta/page.tsx");
  const content = fs.readFileSync(overviewPath, "utf-8");

  assert.ok(
    content.includes('href="/admin/meta/events?tab=events-manager"'),
    "Overview must link to events-manager tab"
  );
  assert.ok(
    content.includes('href="/admin/meta/events?tab=conversions-api"'),
    "Overview must link to conversions-api tab"
  );
});
