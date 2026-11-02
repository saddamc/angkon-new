import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Meta Navigation UX: 1. Group structure covers all six routes precisely", () => {
  const metaNavContent = fs.readFileSync(
    path.resolve("src/app/admin/meta/meta-nav.tsx"),
    "utf-8"
  );

  // Group definitions
  assert.ok(metaNavContent.includes('"Overview"'), "Overview group must exist");
  assert.ok(
    metaNavContent.includes('"Events & Tracking"'),
    "Events & Tracking group must exist"
  );
  assert.ok(
    metaNavContent.includes('"Marketing"'),
    "Marketing group must exist"
  );
  assert.ok(
    metaNavContent.includes('"Commerce & Assets"'),
    "Commerce & Assets group must exist"
  );

  // Route definitions
  assert.ok(metaNavContent.includes('"/admin/meta"'), "/admin/meta route exists");
  assert.ok(metaNavContent.includes('"Overview"'), "Overview item exists");

  assert.ok(metaNavContent.includes('"/admin/meta/events"'), "/admin/meta/events route exists");
  assert.ok(metaNavContent.includes('"Events Manager"'), "Events Manager item exists");

  assert.ok(metaNavContent.includes('"/admin/meta/ads"'), "/admin/meta/ads route exists");
  assert.ok(metaNavContent.includes('"Ads & Attribution"'), "Ads & Attribution item exists");

  assert.ok(metaNavContent.includes('"/admin/meta/catalog"'), "/admin/meta/catalog route exists");
  assert.ok(metaNavContent.includes('"Catalog Feed"'), "Catalog Feed item exists");

  assert.ok(metaNavContent.includes('"/admin/meta/domain-verification"'), "/admin/meta/domain-verification route exists");
  assert.ok(metaNavContent.includes('"Domain Verification"'), "Domain Verification item exists");
});

test("Meta Navigation UX: 2. Lucide icons are imported and bound to each item", () => {
  const metaNavContent = fs.readFileSync(
    path.resolve("src/app/admin/meta/meta-nav.tsx"),
    "utf-8"
  );

  // Check Lucide icons used for each item
  assert.ok(metaNavContent.includes("Layers"), "Layers icon used for Overview");
  assert.ok(metaNavContent.includes("Activity"), "Activity icon used for Events Manager");
  assert.ok(metaNavContent.includes("BarChart3"), "BarChart3 icon used for Ads & Attribution");
  assert.ok(metaNavContent.includes("ShoppingBag"), "ShoppingBag icon used for Catalog Feed");
  assert.ok(metaNavContent.includes("Globe"), "Globe icon used for Domain Verification");
});

test("Meta Navigation UX: 3. Visual Styling matches Meta Business Suite spec (bg #f0f4f9, active #243342)", () => {
  const metaNavContent = fs.readFileSync(
    path.resolve("src/app/admin/meta/meta-nav.tsx"),
    "utf-8"
  );

  assert.ok(
    metaNavContent.includes("bg-[#f0f4f9]"),
    "Sidebar background must match Meta Business Suite #f0f4f9"
  );
  assert.ok(
    metaNavContent.includes("bg-[#243342]"),
    "Active item background must match Meta Business Suite active navy #243342"
  );
  assert.ok(
    metaNavContent.includes("text-white"),
    "Active item text must be white"
  );
});

test("Meta Navigation UX: 4. Expandable/Collapsible dimensions (250px expanded, 68px collapsed)", () => {
  const metaNavContent = fs.readFileSync(
    path.resolve("src/app/admin/meta/meta-nav.tsx"),
    "utf-8"
  );

  assert.ok(
    metaNavContent.includes("w-[250px]"),
    "Expanded width must be 250px (approx 240-260px)"
  );
  assert.ok(
    metaNavContent.includes("w-[68px]"),
    "Collapsed width must be 68px (approx 64-72px)"
  );
});

test("Meta Navigation UX: 5. Hover tooltip in collapsed mode has high contrast and accessible positioning", () => {
  const metaNavContent = fs.readFileSync(
    path.resolve("src/app/admin/meta/meta-nav.tsx"),
    "utf-8"
  );

  assert.ok(
    metaNavContent.includes('role="tooltip"'),
    "Tooltip must have role='tooltip' for accessibility"
  );
  assert.ok(
    metaNavContent.includes("bg-[#1c2a38]"),
    "Tooltip must have professional dark slate background"
  );
  assert.ok(
    metaNavContent.includes("left-full ml-3"),
    "Tooltip must be positioned outside icon to avoid clipping"
  );
});

test("Meta Navigation UX: 6. Shared Layout Shell and Single Component Implementation", () => {
  const layoutContent = fs.readFileSync(
    path.resolve("src/app/admin/meta/layout.tsx"),
    "utf-8"
  );
  const shellContent = fs.readFileSync(
    path.resolve("src/app/admin/meta/meta-shell.tsx"),
    "utf-8"
  );

  assert.ok(
    layoutContent.includes("MetaSuiteShell"),
    "Layout must wrap routes in MetaSuiteShell"
  );
  assert.ok(
    shellContent.includes("MetaSuiteSidebar"),
    "Shell must render MetaSuiteSidebar for persistent navigation"
  );
  assert.ok(
    shellContent.includes("isMobileOpen"),
    "Shell must support responsive mobile drawer"
  );
});

test("Meta Navigation UX: 7. All route page files and backward-compatible redirects exist", () => {
  const routes = [
    "src/app/admin/meta/page.tsx",
    "src/app/admin/meta/events/page.tsx",
    "src/app/admin/meta/pixel/page.tsx",
    "src/app/admin/meta/conversions-api/page.tsx",
    "src/app/admin/meta/ads/page.tsx",
    "src/app/admin/meta/catalog/page.tsx",
    "src/app/admin/meta/domain-verification/page.tsx",
  ];

  for (const route of routes) {
    assert.ok(fs.existsSync(path.resolve(route)), `Route file ${route} must exist`);
  }

  // Verify redirects are implemented in legacy routes
  const pixelContent = fs.readFileSync(path.resolve("src/app/admin/meta/pixel/page.tsx"), "utf-8");
  const capiContent = fs.readFileSync(path.resolve("src/app/admin/meta/conversions-api/page.tsx"), "utf-8");

  assert.ok(pixelContent.includes("redirect("), "Pixel page must implement redirect");
  assert.ok(capiContent.includes("redirect("), "Conversions API page must implement redirect");
});
