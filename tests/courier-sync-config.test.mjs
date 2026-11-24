import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

/**
 * Courier sync & configuration contracts.
 *
 * Pins the audit findings that made the courier setup imperfect:
 *   1. The bulk/cron sync scan list omitted `booked`, `pickup_pending` and
 *      `picked_up` — a freshly booked live parcel sits at `booked` and was
 *      never polled until a webhook or manual refresh moved it.
 *   2. Courier settings were read without a tenant scope while writes were
 *      tenant-scoped.
 *   3. The webhook-configured indicator ignored STEADFAST_WEBHOOK_TOKEN even
 *      though the webhook route accepts it.
 *   4. The dead "auto-advance to Shipped" toggle promised behavior no code
 *      implemented (booking always moves the order to Ready to Ship; Shipped
 *      arrives only on physical pickup via tracking sync).
 */

const read = (file) => fs.readFileSync(file, "utf8");
const steadfastUtils = read((fs.existsSync("src/server/courier/providers/steadfast/utils.ts") ? "src/server/courier/providers/steadfast/utils.ts" : "src/server/courier/steadfast-utils.ts"));
const cronSyncRoute = read("src/app/api/cron/courier-sync/route.ts");
const adminSyncRoute = read("src/app/api/admin/shipments/sync/route.ts");
const courierSettingsModule = read("src/server/courier/settings.ts");
const couriersOverviewRoute = read("src/app/api/admin/couriers/overview/route.ts");
const courierSettingsApiRoute = read("src/app/api/admin/settings/courier/route.ts");
const courierSettingsUi = read("src/app/admin/settings/courier-settings.tsx");

test("the shared active-shipment scan list covers freshly booked parcels", () => {
  assert.ok(
    steadfastUtils.includes("export const ACTIVE_SHIPMENT_STATUSES"),
    "the canonical scan list must live beside SHIPMENT_STATUSES"
  );
  for (const status of ["booked", "pickup_pending", "picked_up", "in_transit", "out_for_delivery"]) {
    assert.ok(
      steadfastUtils.includes(`"${status}"`),
      `ACTIVE_SHIPMENT_STATUSES must include "${status}"`
    );
  }
  // Booking-local / terminal statuses must never be polled.
  for (const excluded of ["not_booked", "booking_failed", "delivered", "returned", "cancelled"]) {
    const listStart = steadfastUtils.indexOf("export const ACTIVE_SHIPMENT_STATUSES");
    const listEnd = steadfastUtils.indexOf("];", listStart);
    const listBody = steadfastUtils.slice(listStart, listEnd);
    assert.ok(
      !listBody.includes(`"${excluded}"`),
      `"${excluded}" must stay out of the active scan list`
    );
  }
});

test("both sync routes import the shared list — no local drift is possible", () => {
  for (const route of [cronSyncRoute, adminSyncRoute]) {
    assert.ok(
      route.includes('ACTIVE_SHIPMENT_STATUSES } from "@/server/courier/providers/steadfast/utils"') ||
      route.includes('ACTIVE_SHIPMENT_STATUSES } from "@/server/courier/steadfast-utils"'),
      "the route must import the canonical list from steadfast-utils"
    );
    assert.ok(
      !route.includes("const ACTIVE_SHIPMENT_STATUSES"),
      "the route must not redefine its own scan list"
    );
  }
});

test("courier settings reads are scoped to the default tenant like the writes", () => {
  assert.ok(courierSettingsModule.includes("DEFAULT_TENANT_ID"));
  assert.ok(
    courierSettingsModule.includes("tenantId: DEFAULT_TENANT_ID"),
    "the findOne must be tenant-scoped"
  );
});

test("webhook-configured indicator honours TOKEN or SECRET like the webhook route", () => {
  for (const route of [couriersOverviewRoute, courierSettingsApiRoute]) {
    assert.ok(
      route.includes("STEADFAST_WEBHOOK_TOKEN") && route.includes("STEADFAST_WEBHOOK_SECRET"),
      "the indicator must accept both accepted env variables"
    );
  }
});

test("the dead auto-advance toggle is gone and the real status flow is documented", () => {
  assert.ok(
    !courierSettingsUi.includes("Auto-advance order status to Shipped after courier booking"),
    "the misleading toggle must not be offered to admins"
  );
  assert.ok(
    courierSettingsUi.includes("Order status flow"),
    "the settings page must explain the real Ready-to-Ship → Shipped flow"
  );
  assert.ok(
    courierSettingsUi.includes("never directly to") &&
      courierSettingsUi.includes("Shipped"),
    "the note must state that booking never sets Shipped directly"
  );
});
