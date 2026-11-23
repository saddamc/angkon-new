import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

/**
 * Orders page courier-status honesty contracts.
 *
 * Context: Steadfast reports `delivery_status: "unknown"` for consignments
 * cancelled in the merchant portal (verified live). The orders table used to
 * render that as a green "Success" booking — admins who had cancelled the
 * parcel at Steadfast saw a healthy active booking and were confused. These
 * pins keep cancelled / unknown consignments unmistakable on the page.
 */

const read = (file) => fs.readFileSync(file, "utf8");
const orderRow = read("src/app/admin/orders/_components/order-row.tsx");
const ordersHeader = read("src/app/admin/orders/_components/orders-header.tsx");
const ordersHook = read("src/app/admin/orders/_hooks/use-admin-orders.ts");
const ordersModals = read("src/app/admin/orders/_components/orders-modals.tsx");
const orderRoute = read("src/app/api/admin/orders/[id]/route.ts");

test("unknown courier status can never render as a successful booking", () => {
  assert.ok(
    orderRow.includes("isUnknownCourierStatus"),
    "the row must detect the unknown courier status explicitly"
  );
  assert.ok(
    orderRow.includes("Check Courier"),
    "unknown status must render a Check Courier badge"
  );
  // The isBooked (green "Success") branch must explicitly exclude unknown.
  assert.ok(
    orderRow.includes("!isUnknownCourierStatus"),
    "the Success branch must exclude unknown-status consignments"
  );
  assert.ok(
    orderRow.includes("This commonly happens after the parcel is cancelled in the Steadfast portal"),
    "the badge must explain the portal-cancellation cause"
  );
});

test("consignments cancelled at the courier get a dedicated row state", () => {
  assert.ok(orderRow.includes("isConsignmentCancelled"));
  // The dedicated cancelled branch must render before the generic
  // "Attention required" bucket so it can never be swallowed by it.
  const cancelledBranch = orderRow.indexOf("isConsignmentCancelled ?");
  const genericBranch = orderRow.indexOf("isReturnOrException ?");
  assert.ok(cancelledBranch !== -1, "a dedicated cancelled branch must exist");
  assert.ok(genericBranch !== -1, "the generic attention branch must exist");
  assert.ok(
    cancelledBranch < genericBranch,
    "the cancelled branch must take precedence over the generic attention badge"
  );
  assert.ok(
    orderRow.includes("Re-book"),
    "the row must offer the next step (rebook the parcel)"
  );
});

test("the bulk sync button shows when courier statuses were last pulled", () => {
  assert.ok(
    ordersHook.includes("lastCourierSyncAt"),
    "the hook must track the last successful courier sync time"
  );
  assert.ok(
    ordersHeader.includes("lastCourierSyncAt"),
    "the Sync Status button must display the last-synced time"
  );
  assert.ok(
    ordersHeader.includes("including parcels cancelled in the Steadfast portal"),
    "the button tooltip must explain that portal cancellations are picked up by syncing"
  );
});

test("the order status modal guides unknown courier statuses to a resolution", () => {
  assert.ok(
    ordersModals.includes("Courier Status Unknown"),
    "an unknown courier status must never render as a healthy managed booking"
  );
  assert.ok(
    ordersModals.includes("Mark Consignment Cancelled (portal)"),
    "the modal must offer the one-click portal-cancellation confirmation"
  );
  assert.ok(
    ordersModals.includes("confirmExternalCancellation: true"),
    "the portal-cancellation action must go through the server-verified portal flow"
  );
  // The unknown banner must only apply when the consignment is not already resolved.
  assert.ok(
    ordersModals.includes('statusModal.shipmentStatus === "unknown"'),
    "the banner must be keyed off the unknown shipment status"
  );
});

test("cancelling an order with an unknown-status consignment gets an actionable error", () => {
  assert.ok(orderRoute.includes("CONSIGNMENT_STATUS_UNKNOWN"));
  assert.ok(
    orderRoute.includes("Mark Consignment Cancelled (portal)"),
    "the error must tell the admin exactly how to resolve the unknown consignment"
  );
});
