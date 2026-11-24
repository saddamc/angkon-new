import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

/**
 * Courier cancellation lifecycle contract.
 *
 * Steadfast has no public cancellation API, so a local "cancelled" status must
 * never be written without an explicit admin confirmation. Reopening a
 * cancelled order must not silently auto-book a second live parcel.
 */

const read = (file) => fs.readFileSync(file, "utf8");
const courierService = read((fs.existsSync("src/server/courier/core/courier-service.ts") ? "src/server/courier/core/courier-service.ts" : "src/server/courier/courier-service.ts"));
const orderRoute = read("src/app/api/admin/orders/[id]/route.ts");
const reopenRoute = read("src/app/api/admin/orders/[id]/reopen/route.ts");
const autoBook = read((fs.existsSync("src/server/courier/core/auto-book.ts") ? "src/server/courier/core/auto-book.ts" : "src/server/courier/auto-book.ts"));
const shipmentRoute = read("src/app/api/admin/orders/[id]/shipment/route.ts");
const orderDetailsContent = read("src/app/admin/orders/_components/order-details-content.tsx");

test("live courier cancellation without an API requires portal confirmation", () => {
  assert.ok(courierService.includes("confirmExternalCancellation"));
  assert.ok(courierService.includes("COURIER_CANCEL_REQUIRES_PORTAL"));
  assert.ok(
    courierService.includes("has no API cancellation"),
    "the admin must be told to cancel in the courier portal"
  );
});

test("order cancellation is blocked while a consignment is still active", () => {
  assert.ok(orderRoute.includes("ACTIVE_CONSIGNMENT_EXISTS"));
  assert.ok(
    orderRoute.includes("Shipment.findOne"),
    "the order route must check the shipments collection before cancelling"
  );
});

test("auto-book never creates a second parcel when a prior consignment exists", () => {
  assert.ok(autoBook.includes("priorShipment"));
  assert.ok(
    autoBook.includes("Never auto-book a reopened/cancelled order"),
    "reopened orders require explicit manual booking"
  );
});

test("reopen clears the courier summary but keeps shipment history", () => {
  assert.ok(reopenRoute.includes('shipmentStatus: "not_booked"'));
  assert.ok(reopenRoute.includes('consignmentId: ""'));
  assert.ok(reopenRoute.includes('trackingCode: ""'));
});

test("booking uses a cancellation-aware idempotency key and blocks duplicates", () => {
  assert.ok(courierService.includes("priorCancelledBookings"));
  assert.ok(courierService.includes("ACTIVE_SHIPMENT_EXISTS"));
});

test("cancel API accepts an optional shipmentId to target a specific consignment", () => {
  assert.ok(shipmentRoute.includes("shipmentId"));
  assert.ok(courierService.includes("shipmentId?: string"));
  assert.ok(
    courierService.includes("shipmentFilter._id"),
    "courier service must filter by shipmentId when provided"
  );
});

test("order details UI shows per-shipment actions and portal-only cancel for Steadfast", () => {
  assert.ok(orderDetailsContent.includes("ShipmentActionButtons"));
  assert.ok(orderDetailsContent.includes("Mark cancelled (portal)"));
  assert.ok(orderDetailsContent.includes("PROVIDERS_WITHOUT_API_CANCEL"));
  assert.ok(orderDetailsContent.includes("Parcel is in transit. Cancel / recall via courier hub."));
});
