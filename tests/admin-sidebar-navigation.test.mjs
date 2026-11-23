/**
 * Admin sidebar navigation contract.
 *
 * Pins the approved navigation decisions:
 *  1. Active-state highlighting must use Next.js useSearchParams (reactive +
 *     hydration-safe), never a raw window.location.search read during render.
 *  2. The ANGKON brand logo navigates to the Dashboard (collapsing the
 *     sidebar stays on the header toggle button).
 *  3. The settings item is labeled "Settings" (not "Store Settings").
 *  4. Marketing (Super Admin only) lives in the Operations group next to
 *     Payments and Couriers, not in the main navigation group.
 *  5. Marketing and Users & Access remain hidden from non-superadmins.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layout = readFileSync("src/app/admin/layout.tsx", "utf8");

test("active-state highlight reads search params reactively, not from window during render", () => {
  assert.ok(
    layout.includes('import { usePathname, useSearchParams } from "next/navigation"'),
    "layout must import useSearchParams from next/navigation"
  );
  assert.ok(
    layout.includes('searchParams.has("payment_status")'),
    "the Orders/Payments shared-route highlight must key off useSearchParams"
  );
  assert.ok(
    !layout.includes("const currentSearch"),
    "no raw window.location.search read may remain in the nav active logic"
  );
});

test("the ANGKON logo navigates to the Dashboard instead of toggling the sidebar", () => {
  const logoLinks = layout.match(/<Link[^>]*href="\/admin\/dashboard"/g) || [];
  assert.ok(
    layout.includes('title="Go to Dashboard"'),
    "the brand logo must advertise that it opens the Dashboard"
  );
  assert.ok(
    logoLinks.length >= 2,
    "both the desktop and mobile brand logos must link to /admin/dashboard"
  );
  // The header PanelLeft button is now the only sidebar collapse toggle.
  const toggleUses = layout.match(/onClick=\{toggleSidebarExpanded\}/g) || [];
  assert.equal(
    toggleUses.length,
    1,
    "the logo must no longer toggle the sidebar — exactly one header toggle remains"
  );
});

test("the settings nav item is labeled \"Settings\"", () => {
  assert.ok(
    layout.includes('{ href: "/admin/settings", label: "Settings", icon: Store }'),
    "the nav item must read Settings, matching the page title Settings & Configuration"
  );
  assert.ok(
    !layout.includes('label: "Store Settings"'),
    "the long Store Settings label must be gone"
  );
});

test("Marketing (Super Admin only) lives in the Operations group, after Couriers", () => {
  const operationsAt = layout.indexOf("const OPERATIONS_NAV");
  const marketingAt = layout.indexOf('{ href: "/admin/meta", label: "Marketing"');
  const settingsGroupAt = layout.indexOf("const SETTINGS_NAV");
  const mainNavEnd = layout.indexOf("const OPERATIONS_NAV");

  assert.ok(operationsAt !== -1 && marketingAt !== -1 && settingsGroupAt !== -1);
  assert.ok(
    operationsAt < marketingAt && marketingAt < settingsGroupAt,
    "Marketing must be declared inside OPERATIONS_NAV, not the main group"
  );
  assert.ok(
    mainNavEnd > layout.indexOf("const MAIN_NAV"),
    "MAIN_NAV must still be declared before OPERATIONS_NAV"
  );

  // And the main group no longer contains it between Customers and Reports.
  const mainGroup = layout.slice(layout.indexOf("const MAIN_NAV"), operationsAt);
  assert.ok(
    !mainGroup.includes('"/admin/meta"'),
    "the main navigation group must not contain the Marketing item"
  );
});

test("Marketing and Users & Access stay hidden from non-superadmin accounts", () => {
  assert.ok(
    layout.includes('if (item.href === "/admin/meta" || item.href === "/admin/users")'),
    "the nav filter must keep hiding Marketing and Users & Access from admins"
  );
  assert.ok(
    layout.includes('return isSuperAdmin;'),
    "both restricted items must resolve through the superadmin role check"
  );
});
