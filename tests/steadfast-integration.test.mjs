import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildRecipientAddress,
  mapSteadfastStatus,
  normalizeBdPhone,
} from "../src/server/courier/steadfast-utils.ts";

/**
 * P2 contract: Steadfast adapter, shipment model, admin API/UI and webhook.
 */

const read = (file) => fs.readFileSync(file, "utf8");

const adapter = read("src/server/courier/steadfast.ts");
const shipmentModel = read("src/models/Shipment.ts");
const createRoute = read("src/app/api/admin/orders/[id]/shipment/route.ts");
const courierService = read("src/server/courier/courier-service.ts");
const workflow = read("src/server/orders/workflow.ts");
const refreshRoute = read("src/app/api/admin/shipments/[id]/refresh/route.ts");
const webhook = read("src/app/api/webhooks/steadfast/route.ts");
const sync = read("src/server/courier/sync.ts");
const hook = read("src/app/admin/orders/_hooks/use-admin-orders.ts");
const modals = read("src/app/admin/orders/_components/orders-modals.tsx");
const row = read("src/app/admin/orders/_components/order-row.tsx");
const envExample = read(".env.example");

test("phone: normalises local, +880 and 880-prefixed BD numbers", () => {
  assert.equal(normalizeBdPhone("01700000000"), "01700000000");
  assert.equal(normalizeBdPhone("+8801700000000"), "01700000000");
  assert.equal(normalizeBdPhone("8801700000000"), "01700000000");
  assert.equal(normalizeBdPhone("1700000000"), "01700000000");
  assert.equal(normalizeBdPhone("0170000000"), null);
  assert.equal(normalizeBdPhone("abc"), null);
  assert.equal(normalizeBdPhone(""), null);
});

test("address: joins and trims parts into one courier line", () => {
  assert.equal(
    buildRecipientAddress(["  H-93, Road 2 ", "Dhaka", "", null, "1212"]),
    "H-93, Road 2, Dhaka, 1212"
  );
});

test("status: maps Steadfast states onto the shipment enum", () => {
  assert.equal(mapSteadfastStatus("delivered"), "delivered");
  assert.equal(mapSteadfastStatus("Partial Delivered"), "partial_delivered");
  assert.equal(mapSteadfastStatus("in-transit"), "in_transit");
  assert.equal(mapSteadfastStatus("out for delivery"), "out_for_delivery");
  assert.equal(mapSteadfastStatus("CANCELLED"), "cancelled");
  assert.equal(mapSteadfastStatus("hold"), "delivery_failed");
  assert.equal(mapSteadfastStatus("in_review"), "in_review");
  assert.equal(mapSteadfastStatus("returned"), "returned");
  assert.equal(mapSteadfastStatus("something-new"), "unknown");
});

test("adapter: credentials are server-only and configurable", () => {
  assert.ok(adapter.includes('process.env.STEADFAST_API_KEY'));
  assert.ok(adapter.includes('process.env.STEADFAST_SECRET_KEY'));
  assert.ok(adapter.includes('process.env.STEADFAST_BASE_URL'));
  assert.ok(adapter.includes('"Api-Key"'));
  assert.ok(adapter.includes('"Secret-Key"'));
  assert.ok(!adapter.includes("NEXT_PUBLIC_STEADFAST"), "credentials must never be public");
  assert.ok(!adapter.includes("localStorage"), "credentials must never reach the browser");
});

test("shipment model: one active consignment per order + provider", () => {
  assert.ok(shipmentModel.includes("idempotencyKey: { type: String, required: true, unique: true }"));
  assert.ok(shipmentModel.includes('{ consignmentId: 1 }, { unique: true, sparse: true }'));
  assert.ok(shipmentModel.includes('{ trackingCode: 1 }, { unique: true, sparse: true }'));
  assert.ok(shipmentModel.includes("events: { type: [ShipmentEventSchema]"));
});

test("create shipment: auth, idempotency, server-side COD", () => {
  assert.ok(createRoute.includes("requireAdminSessionCore"));
  assert.ok(createRoute.includes("courierService.bookShipment"));
  assert.ok(courierService.includes("settings.defaultProvider"));
  assert.ok(courierService.includes("idempotencyKey"));
  assert.ok(courierService.includes("computeOrderFinancials"));
  assert.ok(workflow.includes("codAmountToCollect"));
  assert.ok(courierService.includes("normalizeBdPhone"));
  assert.ok(courierService.includes("Shipment.create"));
  assert.ok(courierService.includes("orderStatus: nextOrderStatus"));
});

test("refresh + sync: courier status drives the order atomically", () => {
  assert.ok(refreshRoute.includes("requireAdminSessionCore"));
  assert.ok(refreshRoute.includes("adapter.getStatus"));
  assert.ok(refreshRoute.includes("applyCourierStatus"));
  assert.ok(sync.includes('orderUpdate.paymentStatus = "paid"'));
  assert.ok(sync.includes("shipment.codAmount > 0"));
  assert.ok(sync.includes('orderUpdate.orderStatus = "delivered"'));
  assert.ok(sync.includes('orderUpdate.codSettlementStatus = "collected"'));
});

test("webhook: signature + server-side re-fetch before applying", () => {
  assert.ok(webhook.includes("STEADFAST_WEBHOOK_SECRET"));
  assert.ok(webhook.includes("timingSafeEqual"));
  assert.ok(webhook.includes("x-steadfast-signature"));
  assert.ok(webhook.includes("adapter.getStatus"), "must re-read the status from Steadfast");
  assert.ok(webhook.includes("applyCourierStatus"));
  assert.ok(webhook.includes("ignored: true"), "unknown consignments must not retry forever");
});

test("admin UI: shipment modal is wired to the row", () => {
  assert.ok(hook.includes("openShipment"));
  assert.ok(hook.includes("/api/admin/orders/${order.id}/shipment"));
  assert.ok(hook.includes("/api/admin/shipments/${shipmentId}/refresh"));
  assert.ok(modals.includes("Shipment Details"));
  assert.ok(modals.includes("Create Steadfast shipment"));
  assert.ok(modals.includes("Refresh status"));
  assert.ok(row.includes("openShipment(order)"));
  assert.ok(row.includes("Manage courier shipment"));
});

test("env: courier credentials are documented server-only", () => {
  assert.ok(envExample.includes("STEADFAST_API_KEY"));
  assert.ok(envExample.includes("STEADFAST_SECRET_KEY"));
  assert.ok(envExample.includes("STEADFAST_BASE_URL"));
  assert.ok(envExample.includes("STEADFAST_WEBHOOK_SECRET"));
  assert.ok(!envExample.includes("NEXT_PUBLIC_STEADFAST"));
});
