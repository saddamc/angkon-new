import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");

const orderRoute = read("src/app/api/admin/orders/[id]/route.ts");
const processCancellation = read("src/server/payments/services/process-cancellation.ts");
const processFailure = read("src/server/payments/services/process-failure.ts");
const orderPaymentRepo = read("src/server/payments/repositories/order-payment.repository.ts");
const stockService = read(fs.existsSync("src/server/products/stock.ts") ? "src/server/products/stock.ts" : "src/server/stock.ts");
const orderTypes = read("src/app/admin/orders/_types/orders.types.ts");
const orderDetailsContent = read("src/app/admin/orders/_components/order-details-content.tsx");
const orderCancellationModal = read("src/app/admin/orders/_components/order-cancellation-modal.tsx");

// ─────────────────────────────────────────────────────────────────────────────
// 1. SSLCOMMERZ cancellation → payment status cancelled
// ─────────────────────────────────────────────────────────────────────────────
test("1. SSLCOMMERZ cancellation transitions payment status to cancelled", () => {
  assert.ok(
    processCancellation.includes('const orderFailureStatus = targetStatus === "cancelled" ? "cancelled" : "failed";'),
    "ProcessCancellationService must assign 'cancelled' order failure status"
  );
  assert.ok(
    processCancellation.includes("OrderPaymentRepository.markOrderPaymentFailed({"),
    "ProcessCancellationService must record failure/cancellation on the order repository"
  );
  assert.ok(
    orderPaymentRepo.includes("paymentStatus: args.status"),
    "OrderPaymentRepository must persist the exact status (cancelled) rather than hardcoded failed"
  );
  assert.ok(
    orderPaymentRepo.includes('failedAt: args.status === "failed" ? now : null'),
    "Cancelled payments must not record a failedAt timestamp"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. SSLCOMMERZ failure → payment status failed
// ─────────────────────────────────────────────────────────────────────────────
test("2. SSLCOMMERZ failure transitions payment status to failed", () => {
  assert.ok(
    processFailure.includes('lastErrorCode: "PAYMENT_FAILED"'),
    "ProcessFailureService must record PAYMENT_FAILED error code"
  );
  assert.ok(
    processFailure.includes("actor: \"sslcommerz_fail_callback\""),
    "ProcessFailureService must attribute callback actor correctly"
  );
  assert.ok(
    processFailure.includes('targetStatus,\n      customerActivity: "returned_failed"'),
    "ProcessFailureService must record customerActivity as returned_failed"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Paid order cannot be downgraded by cancel callback
// ─────────────────────────────────────────────────────────────────────────────
test("3. Paid order cannot be downgraded by cancel callback", () => {
  assert.ok(
    processCancellation.includes("if (isSuccessfulStatus(attempt.status)) {"),
    "ProcessCancellationService must protect against downgrading successful payments"
  );
  assert.ok(
    processFailure.includes("if (isSuccessfulStatus(attempt.status)) {"),
    "ProcessFailureService must protect against downgrading successful payments"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Active courier shipment blocks order cancellation
// ─────────────────────────────────────────────────────────────────────────────
test("4. Active courier shipment blocks order cancellation", () => {
  assert.ok(
    orderRoute.includes('code: "ACTIVE_CONSIGNMENT_EXISTS"'),
    "Order route must return ACTIVE_CONSIGNMENT_EXISTS code when consignment is active"
  );
  assert.ok(
    orderRoute.includes("const activeConsignment = await Shipment.findOne({"),
    "Order route must query Shipment model for active consignments before cancellation"
  );
  assert.ok(
    orderRoute.includes('$nin: ["cancelled", "failed", "returned", "delivered", "partial_delivered"]'),
    "Active consignment filter must exempt cancelled, returned, or failed shipments"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. In-transit shipment gives a clear error
// ─────────────────────────────────────────────────────────────────────────────
test("5. In-transit shipment gives a clear error", () => {
  assert.ok(
    orderRoute.includes('code: "SHIPMENT_IN_TRANSIT"'),
    "Order route must return SHIPMENT_IN_TRANSIT code when parcel is moving"
  );
  assert.ok(
    orderRoute.includes("beforeOrder.shipmentStatus === \"in_transit\""),
    "Order route must check for in_transit status"
  );
  assert.ok(
    orderRoute.includes("beforeOrder.shipmentStatus === \"out_for_delivery\""),
    "Order route must check for out_for_delivery status"
  );
  assert.ok(
    orderRoute.includes("beforeOrder.shipmentStatus === \"picked_up\""),
    "Order route must check for picked_up status"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Cancelled order cannot be cancelled twice
// ─────────────────────────────────────────────────────────────────────────────
test("6. Cancelled order cannot be cancelled twice (locked from direct edits)", () => {
  assert.ok(
    orderRoute.includes('if (currentStatusNormalized === "cancelled") {'),
    "Order route must check if current status is already cancelled"
  );
  assert.ok(
    orderRoute.includes('code: "ORDER_CANCELLED_LOCKED"'),
    "Order route must return ORDER_CANCELLED_LOCKED on repeat status edits"
  );
  assert.ok(
    orderRoute.includes("dedicated Reopen Order action"),
    "Error message must instruct admin to use dedicated Reopen Order action"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Cancellation releases stock exactly once
// ─────────────────────────────────────────────────────────────────────────────
test("7. Cancellation releases stock exactly once (atomic claim)", () => {
  assert.ok(
    orderRoute.includes("await releaseStockForOrder(orderDoc)"),
    "Order route must invoke releaseStockForOrder when status changes to cancelled"
  );
  assert.ok(
    stockService.includes("export async function releaseStockForOrder"),
    "Stock service must export releaseStockForOrder"
  );
  assert.ok(
    stockService.includes("stockReleasedAt: { $exists: false }"),
    "releaseStockForOrder must check that stockReleasedAt is null or nonexistent"
  );
  assert.ok(
    stockService.includes("$set: { stockReleasedAt: new Date() }"),
    "releaseStockForOrder must atomically stamp stockReleasedAt"
  );
  assert.ok(
    stockService.includes("if (!claimed) return { released: false };"),
    "releaseStockForOrder must abort if lock/claim was not acquired"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. UI exposes only one cancellation action & excludes cancelled from generic status
// ─────────────────────────────────────────────────────────────────────────────
test("8. UI exposes only one cancellation action and dedicated modal", () => {
  // Extract MANUAL_ORDER_STATUS_OPTIONS block to verify cancelled is not in manual transitions
  const manualBlock = orderTypes.substring(
    orderTypes.indexOf("export const MANUAL_ORDER_STATUS_OPTIONS"),
    orderTypes.indexOf("export const STATUS_BADGE")
  );
  assert.ok(
    !manualBlock.includes('key: "cancelled"'),
    "MANUAL_ORDER_STATUS_OPTIONS must never contain 'cancelled' as a generic radio option"
  );

  // order-details-content.tsx must filter cancelled out of forwardStatuses
  assert.ok(
    orderDetailsContent.includes('const forwardStatuses = allowed.filter'),
    "order-details-content must filter allowed statuses"
  );
  assert.ok(
    orderDetailsContent.includes('s !== "cancelled"'),
    "forwardStatuses must explicitly filter out cancelled"
  );

  // Single Cancel Order trigger in Available Next Actions card
  assert.ok(
    orderDetailsContent.includes("requestOrderCancellation"),
    "UI must define a single requestOrderCancellation trigger"
  );
  assert.ok(
    orderDetailsContent.includes("<OrderCancellationModal"),
    "UI must render the dedicated OrderCancellationModal"
  );

  // Dedicated modal must mandate cancellation reason (>= 3 chars)
  assert.ok(
    orderCancellationModal.includes("trimmedReason.length >= 3"),
    "Dedicated modal must enforce reason >= 3 characters matching server rule"
  );
  assert.ok(
    orderCancellationModal.includes("min 3 chars"),
    "Dedicated modal must show min 3 chars indicator"
  );

  // Dedicated modal must warn about active shipment & payment/refund
  assert.ok(
    orderCancellationModal.includes("Courier Shipment Status"),
    "Dedicated modal must display courier status when shipment exists"
  );
  assert.ok(
    orderCancellationModal.includes("Active courier consignment exists"),
    "Dedicated modal must warn when active courier consignment exists"
  );
  assert.ok(
    orderCancellationModal.includes("Inventory items will be released back to product stock"),
    "Dedicated modal must inform about inventory restocking"
  );
  assert.ok(
    orderCancellationModal.includes("Payment & Refund Requirement"),
    "Dedicated modal must warn about online refund requirement if prepaid"
  );
  assert.ok(
    orderCancellationModal.includes("Please process a refund through the"),
    "Dedicated modal must guide admin to process refund via Payments panel"
  );
});
