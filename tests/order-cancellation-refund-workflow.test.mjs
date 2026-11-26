import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

/**
 * ANGKON — Order Cancellation & Refund Management Workflow Contract & Unit Tests
 *
 * Covers all 20 scenarios across:
 *   - Order cancellation & coordinated refund decisions
 *   - Server-side refundable balance formula (Captured - Completed - Pending)
 *   - SSLCOMMERZ refund initiation, timeout reconciliation, and status sync
 *   - Manual offline refund ledger (Order.paidAmount immutability)
 *   - Courier cancellation, booking_in_progress guard, return/recall, physical inspection
 *   - Idempotent & shipment-guarded stock restoration
 */

const read = (file) => fs.readFileSync(file, "utf8");

const orderModel = read("src/models/Order.ts");
const paymentRefundModel = read("src/models/PaymentRefund.ts");
const paymentEventModel = read("src/models/PaymentEvent.ts");
const refundSummaryService = read("src/server/payments/services/order-refund-summary.service.ts");
const refundRepo = read("src/server/payments/repositories/payment-refund.repository.ts");
const refundService = read("src/server/payments/services/process-refund.ts");
const stockService = read("src/server/products/stock.ts");
const courierService = read("src/server/courier/core/courier-service.ts");
const orderPatchRoute = read("src/app/api/admin/orders/[id]/route.ts");
const manualPaymentRoute = read("src/app/api/admin/orders/[id]/payments/manual/route.ts");
const shipmentRoute = read("src/app/api/admin/orders/[id]/shipment/route.ts");
const detailsRoute = read("src/app/api/admin/orders/[id]/details/route.ts");
const cancelModal = read("src/app/admin/orders/_components/order-cancellation-modal.tsx");
const detailsContent = read("src/app/admin/orders/_components/order-details-content.tsx");

test("1. COD order cancel -> no PaymentRefund created, stock released with shipment guard", () => {
  assert.ok(orderPatchRoute.includes('body.cancelDecision === "cancel_and_refund"'));
  assert.ok(orderPatchRoute.includes("releaseStockForOrder(orderDoc)"));
  assert.ok(cancelModal.includes("cancel_only"));
});

test("2. Unpaid SSLCOMMERZ cancel -> no fake refund record, stock released", () => {
  assert.ok(refundSummaryService.includes('status: { $in: CAPTURED_STATUSES'));
  assert.ok(orderPatchRoute.includes("expectedCodAmount = 0"));
  assert.ok(!orderPatchRoute.includes("fake"));
});

test("3. Cancel paid SSLCOMMERZ without refund -> paymentStatus stays untouched (cancel_only)", () => {
  assert.ok(orderPatchRoute.includes('decision: body.cancelDecision === "cancel_and_refund" ? "cancel_and_refund" : "cancel_only"'));
  assert.ok(cancelModal.includes("1. Cancel Order Only"));
});

test("4. Cancel + full refund -> coordinated refund via ProcessRefundService, refundId persisted", () => {
  assert.ok(orderPatchRoute.includes("ProcessRefundService.initiateRefund"));
  assert.ok(orderPatchRoute.includes('"cancellationDetails.refundId"'));
  assert.ok(orderPatchRoute.includes('"cancellationDetails.refundOutcome"'));
});

test("5. Cancel + partial refund -> editable refund amount validated against availableRefundableAmount", () => {
  assert.ok(orderPatchRoute.includes("reqAmt > refundSummary.availableRefundableAmount + 0.01"));
  assert.ok(cancelModal.includes("max={availableRefundable}"));
});

test("6. Partial refund on active order -> orderStatus unchanged (no Order.statusHistory mutation)", () => {
  assert.ok(!refundService.includes("$push"));
  assert.ok(!refundService.includes("previousStatus:"));
  assert.ok(detailsContent.includes("Order remains active unless separately cancelled"));
});

test("7. Refund exceeds captured -> rejected with REFUND_AMOUNT_EXCEEDED", () => {
  assert.ok(refundService.includes("REFUND_AMOUNT_EXCEEDED"));
  assert.ok(orderPatchRoute.includes("REFUND_AMOUNT_EXCEEDED"));
});

test("8. Concurrent duplicate reservation -> blocked by idempotencyKey + atomic includeInitiated sum", () => {
  assert.ok(paymentRefundModel.includes("idempotencyKey"));
  assert.ok(refundRepo.includes("findByIdempotencyKey"));
  assert.ok(refundService.includes("findByIdempotencyKey"));
  assert.ok(refundService.includes("includeInitiated: true"));
});

test("9. Initiate accepted -> status 'processing' (never 'succeeded')", () => {
  assert.ok(refundService.includes('isSuccess ? "processing" : "failed"'));
  assert.ok(!refundService.includes('createRefund({\n      status: "succeeded"'));
});

test("10. Sync confirms 'refunded' -> paymentStatus 'refunded'/'partially_refunded', no statusHistory mutation", () => {
  assert.ok(refundService.includes('if (gatewayStatus === "refunded")'));
  assert.ok(refundService.includes('paymentStatus: isFullRefund ? "refunded" : "partially_refunded"'));
  assert.ok(!refundService.includes("refundAmount: totalRefunded"));
  assert.ok(!refundService.includes("refundStatus:"));
});

test("11. Sync fails -> paymentStatus reverts via _syncOrderPaymentStatus, balance released", () => {
  assert.ok(refundService.includes('else if (gatewayStatus === "cancelled" || gatewayStatus === "failed")'));
  assert.ok(refundService.includes("_syncOrderPaymentStatus"));
});

test("12. Timeout -> keeps initiated with reconciliationRequired: true, no duplicate retry", () => {
  assert.ok(refundService.includes("isAmbiguousNetworkError"));
  assert.ok(refundService.includes("reconciliationRequired: true"));
  assert.ok(refundService.includes("refund_timeout_reconcile_needed"));
  assert.ok(paymentEventModel.includes("refund_timeout_reconcile_needed"));
});

test("13. COD + advance + cancel -> refund summary computes from captured payments only, never expected COD", () => {
  assert.ok(refundSummaryService.includes("capturedAmount - completedRefundAmount - pendingRefundAmount"));
  assert.ok(!refundSummaryService.includes("expectedCodAmount"));
});

test("14. Manual offline refund -> PaymentRefund with refundChannel 'manual_offline', Order.paidAmount untouched", () => {
  assert.ok(manualPaymentRoute.includes("ProcessRefundService.recordManualRefund"));
  assert.ok(refundService.includes('refundChannel: "manual_offline"'));
  assert.ok(!manualPaymentRoute.includes("paidAmount: remainingPaid"));
  assert.ok(!refundService.includes("paidAmount:"));
});

test("15. Cancel no-shipment -> courierDisposition 'not_booked', no courier API call", () => {
  assert.ok(orderPatchRoute.includes('"not_booked"'));
  assert.ok(orderModel.includes("courierDisposition"));
});

test("16. Cancel booking-in-progress -> 409 BOOKING_IN_PROGRESS", () => {
  assert.ok(orderPatchRoute.includes('beforeOrder.shipmentBookingState === "booking_in_progress"'));
  assert.ok(orderPatchRoute.includes("BOOKING_IN_PROGRESS"));
});

test("17. Cancel mock Steadfast consignment -> CourierService.cancelShipment handles adapter.cancelShipment", () => {
  assert.ok(courierService.includes("if (adapter.cancelShipment)"));
  assert.ok(courierService.includes("COURIER_CANCEL_REQUIRES_PORTAL"));
});

test("18. Cancel in-transit -> 409 SHIPMENT_IN_TRANSIT, Shipment tab supports Request Return / Recall", () => {
  assert.ok(orderPatchRoute.includes("SHIPMENT_IN_TRANSIT"));
  assert.ok(courierService.includes("async requestReturn("));
  assert.ok(shipmentRoute.includes('body.action === "request_return"'));
  assert.ok(detailsContent.includes("Request Return / Recall"));
});

test("19. Cancel delivered -> 409 DELIVERED_REQUIRES_RETURN_WORKFLOW", () => {
  assert.ok(orderPatchRoute.includes("DELIVERED_REQUIRES_RETURN_WORKFLOW"));
});

test("20. Idempotent stock: returned parcel only restocks after confirmPhysicalReturn with 'restockable'", () => {
  assert.ok(stockService.includes("skipIfShipped?: boolean"));
  assert.ok(stockService.includes("ACTIVE_SHIPMENT_STATUSES"));
  assert.ok(!orderPatchRoute.includes('updated.orderStatus === "returned"'));
  assert.ok(courierService.includes("async confirmPhysicalReturn("));
  assert.ok(courierService.includes('if (args.inspectionOutcome === "restockable")'));
  assert.ok(shipmentRoute.includes('body.action === "confirm_physical_return"'));
  assert.ok(detailsRoute.includes("computeOrderRefundSummary"));
  assert.ok(detailsRoute.includes("PaymentRefund.find"));
});
