import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");

const webhook = read("src/app/api/webhooks/steadfast/route.ts");
const shipmentRoute = read("src/app/api/admin/orders/[id]/shipment/route.ts");
const courierService = read((fs.existsSync("src/server/courier/core/courier-service.ts") ? "src/server/courier/core/courier-service.ts" : "src/server/courier/courier-service.ts"));
const syncRoute = read("src/app/api/admin/shipments/sync/route.ts");
const adminOrdersRoute = read("src/app/api/admin/orders/route.ts");
const orderTypes = read("src/app/admin/orders/_types/orders.types.ts");
const ordersHook = read("src/app/admin/orders/_hooks/use-admin-orders.ts");
const orderRow = read("src/app/admin/orders/_components/order-row.tsx");
const ordersSearch = read("src/app/admin/orders/_components/orders-search-bar.tsx");
const ordersHeader = read("src/app/admin/orders/_components/orders-header.tsx");
const ordersModals = read("src/app/admin/orders/_components/orders-modals.tsx");

test("steadfast webhook supports Bearer token alongside HMAC signature and query token", () => {
  assert.ok(webhook.includes('request.headers.get("authorization")'));
  assert.ok(webhook.includes("bearerValid"));
  assert.ok(webhook.includes("signatureValid"));
  assert.ok(webhook.includes("tokenValid"));
});

test("shipment route supports provider selection, failed retry, and audited manual delivery", () => {
  assert.ok(shipmentRoute.includes("providers"));
  assert.ok(shipmentRoute.includes("courierService.bookShipment"));
  assert.ok(courierService.includes("requestedProvider"));
  assert.ok(shipmentRoute.includes("export async function PATCH"));
  assert.ok(shipmentRoute.includes("AdminAuditLog.create"));
  assert.ok(shipmentRoute.includes("order.delivery.manual_update"));
});

test("bulk courier sync route requires admin session and applies verified statuses", () => {
  assert.ok(syncRoute.includes("requireAdminSessionCore"));
  assert.ok(syncRoute.includes("adapter.getStatus"));
  assert.ok(syncRoute.includes("applyCourierStatus"));
});

test("admin orders API and UI expose courier tracking, shipped tab, bulk send, and manual fallback", () => {
  assert.ok(adminOrdersRoute.includes("courier: o.courier"));
  assert.ok(adminOrdersRoute.includes("shipmentStatus: o.shipmentStatus"));
  assert.ok(adminOrdersRoute.includes("trackingCode: o.trackingCode"));
  assert.ok(adminOrdersRoute.includes("courierProviders"));
  assert.ok(orderTypes.includes('key: "shipped"'));
  assert.ok(ordersHook.includes("bulkSendToCourier"));
  assert.ok(ordersHook.includes("syncActiveShipments"));
  assert.ok(ordersHook.includes("saveManualDelivery"));
  assert.ok(orderRow.includes("Send to Steadfast"));
  assert.ok(ordersSearch.includes("Send to Steadfast"));
  // Courier sync lives once in the page header, not duplicated in the toolbar.
  assert.ok(ordersHeader.includes("Sync Status"));
  assert.ok(ordersHeader.includes("lastCourierSyncAt"));
  assert.ok(ordersModals.includes("Confirm & Book Steadfast"));
  assert.ok(ordersModals.includes("Booking Time & Last Sync"));
});
