import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  ALLOWED_ORDER_STATUS_TRANSITIONS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  SHIPMENT_STATUS_LABELS,
  COURIER_SETTLEMENT_LABELS,
  canTransitionOrderStatus,
  getAllowedNextStatuses,
  normalizeOrderStatus,
  computeOrderFinancials,
  evaluateReopenOrderEligibility,
} from "../src/server/orders/workflow.ts";
import {
  mapSteadfastStatus,
  evaluateShipmentTransition,
  isDeliveredStatus,
  isTerminalShipmentStatus,
} from "../src/server/courier/steadfast-utils.ts";

const read = (file) => fs.readFileSync(file, "utf8");

// ── 1. SEPARATE LIFECYCLES INTEGRITY ──────────────────────────────────────────
test("1. Separate Lifecycles: Order, Payment, Shipment, and Courier Settlement maintain distinct state spaces", () => {
  // Order status labels
  const expectedOrderStatuses = [
    "pending",
    "confirmed",
    "processing",
    "ready_to_ship",
    "shipped",
    "delivered",
    "cancelled",
    "returned",
  ];
  for (const s of expectedOrderStatuses) {
    assert.ok(ORDER_STATUS_LABELS[s], `Order status label missing for: ${s}`);
  }

  // Payment status labels
  const expectedPaymentStatuses = [
    "pending",
    "paid",
    "partially_paid",
    "failed",
    "refund_pending",
    "refunded",
  ];
  for (const s of expectedPaymentStatuses) {
    assert.ok(PAYMENT_STATUS_LABELS[s], `Payment status label missing for: ${s}`);
  }

  // Shipment status labels
  const expectedShipmentStatuses = [
    "not_booked",
    "booking_in_progress",
    "booked",
    "picked_up",
    "in_transit",
    "out_for_delivery",
    "delivered",
    "cancelled",
    "returned",
  ];
  for (const s of expectedShipmentStatuses) {
    assert.ok(SHIPMENT_STATUS_LABELS[s], `Shipment status label missing for: ${s}`);
  }

  // Courier settlement status labels
  const expectedSettlementStatuses = [
    "none",
    "expected",
    "collected",
    "settled",
    "discrepancy",
  ];
  for (const s of expectedSettlementStatuses) {
    assert.ok(COURIER_SETTLEMENT_LABELS[s], `Courier settlement label missing for: ${s}`);
  }

  // Verify Mongoose models define independent fields
  const orderModelSource = read("src/models/Order.ts");
  assert.match(orderModelSource, /orderStatus:\s*\{/, "Order schema must define orderStatus");
  assert.match(orderModelSource, /paymentStatus:\s*\{/, "Order schema must define paymentStatus");
  assert.match(orderModelSource, /refund_pending/, "Order schema must include refund_pending enum");
  assert.match(orderModelSource, /shipmentStatus:\s*\{/, "Order schema must define shipmentStatus");
  assert.match(orderModelSource, /codSettlementStatus:\s*\{/, "Order schema must define codSettlementStatus");

  const shipmentModelSource = read("src/models/Shipment.ts");
  assert.match(
    shipmentModelSource,
    /SHIPMENT_STATUSES/,
    "Shipment schema must use the canonical SHIPMENT_STATUSES enum"
  );
  const canonicalStatusSource = read("src/server/courier/steadfast-utils.ts");
  assert.match(
    canonicalStatusSource,
    /picked_up/,
    "Canonical shipment statuses must include picked_up"
  );
  assert.match(
    canonicalStatusSource,
    /"unknown"/,
    "Canonical shipment statuses must include unknown (provider fallback)"
  );
});

// ── 2. AUTOMATED COURIER STATUS SYNCHRONIZATION ──────────────────────────────
test("2. Automated Courier Status Synchronization: Status mappings & courier cancellation independence", () => {
  // Map Steadfast statuses correctly
  assert.equal(mapSteadfastStatus("picked_up"), "picked_up");
  assert.equal(mapSteadfastStatus("pickup"), "picked_up");
  assert.equal(mapSteadfastStatus("in_transit"), "in_transit");
  assert.equal(mapSteadfastStatus("out_for_delivery"), "out_for_delivery");
  assert.equal(mapSteadfastStatus("delivered"), "delivered");
  assert.equal(mapSteadfastStatus("cancelled"), "cancelled");
  assert.equal(mapSteadfastStatus("returned"), "returned");

  // Verify sync.ts implements automated mappings
  const syncSource = read("src/server/courier/sync.ts");

  // Consignment created -> Order Ready to Ship
  assert.match(
    syncSource,
    /status === "created"/,
    "Consignment created event must update order to ready_to_ship"
  );

  // Physical pickup / In transit / Out for delivery -> Order Shipped
  assert.match(
    syncSource,
    /status === "picked_up"/,
    "Physical pickup event must update order to shipped"
  );

  // Courier cancellation MUST NOT cancel customer order
  assert.match(
    syncSource,
    /if \(status === "cancelled"\)\s*\{\s*orderUpdate\.shipmentBookingState = "cancelled"/,
    "Courier cancellation must update shipmentBookingState to cancelled"
  );
  assert.doesNotMatch(
    syncSource,
    /if \(status === "cancelled"\)\s*\{\s*orderUpdate\.orderStatus = "cancelled"/,
    "Courier cancellation must NEVER automatically cancel the customer order"
  );

  // Anti-regression transitions in evaluateShipmentTransition
  assert.equal(evaluateShipmentTransition("in_transit", "picked_up").allowed, false);
  // Out-for-delivery is the furthest forward state before a terminal outcome;
  // an older `in_transit` webhook must not regress it.
  assert.equal(evaluateShipmentTransition("out_for_delivery", "in_transit").allowed, false);
  assert.equal(evaluateShipmentTransition("out_for_delivery", "picked_up").allowed, false);
  assert.equal(evaluateShipmentTransition("delivered", "in_transit").allowed, false);
  assert.equal(evaluateShipmentTransition("delivered", "returned").allowed, true);
  assert.equal(evaluateShipmentTransition("in_transit", "in_transit").idempotent, true);
});

// ── 3. CONTROLLED MANUAL STATUS MANAGEMENT ───────────────────────────────────
test("3. Controlled Manual Status Management: Transition gating & exceptional change protection", () => {
  // State machine allows forward valid transitions
  assert.ok(canTransitionOrderStatus("pending", "confirmed"));
  assert.ok(canTransitionOrderStatus("pending", "processing"));
  assert.ok(canTransitionOrderStatus("confirmed", "processing"));
  assert.ok(canTransitionOrderStatus("confirmed", "ready_to_ship"));
  assert.ok(canTransitionOrderStatus("ready_to_ship", "shipped"));
  assert.ok(canTransitionOrderStatus("shipped", "delivered"));
  assert.ok(canTransitionOrderStatus("delivered", "returned"));

  // State machine rejects illegal backwards jumps
  assert.equal(canTransitionOrderStatus("delivered", "pending"), false);
  assert.equal(canTransitionOrderStatus("shipped", "pending"), false);
  assert.equal(canTransitionOrderStatus("cancelled", "shipped"), false);
  assert.equal(canTransitionOrderStatus("cancelled", "confirmed"), false);
  assert.deepEqual(getAllowedNextStatuses("cancelled"), []);

  // API route verification for mandatory reasons and conditions
  const routeSource = read("src/app/api/admin/orders/[id]/route.ts");
  assert.match(
    routeSource,
    /ADMIN_REASON_REQUIRED/,
    "PATCH /api/admin/orders/[id] must enforce mandatory admin reason for exceptional changes"
  );
  assert.match(
    routeSource,
    /ORDER_CANCELLED_LOCKED/,
    "PATCH /api/admin/orders/[id] must reject direct edits to cancelled orders in favor of reopen workflow"
  );
  assert.match(
    routeSource,
    /SHIPMENT_IN_TRANSIT/,
    "PATCH /api/admin/orders/[id] must block order cancellation if parcel is in transit or out for delivery"
  );
  assert.match(
    routeSource,
    /PRECONDITION_FAILED/,
    "PATCH /api/admin/orders/[id] must prevent marking unconfirmed order as shipped"
  );
  assert.match(
    routeSource,
    /ONLINE_PAYMENT_VALIDATION_REQUIRED/,
    "Online payments require gateway validation or explicit confirmation"
  );
});

// ── 4. REOPEN CANCELLED ORDERS RECOVERY SYSTEM ───────────────────────────────
test("4. Reopen Cancelled Orders: Preconditions, stock re-reservation & non-automatic safeguards", () => {
  // Dedicated route exists
  const reopenRouteSource = read("src/app/api/admin/orders/[id]/reopen/route.ts");
  assert.ok(reopenRouteSource.length > 0, "Dedicated reopen route must exist");
  assert.match(reopenRouteSource, /requireAdminSessionCore/, "Reopen route must require admin authorization");
  assert.match(reopenRouteSource, /reserveStockForOrder/, "Reopen route must re-check and re-reserve inventory");
  assert.match(reopenRouteSource, /ADMIN_REASON_REQUIRED/, "Reopen route must enforce minimum 3-char admin reason");
  assert.match(reopenRouteSource, /AdminAuditLog\.create/, "Reopen route must write immutable audit log");

  // Rule 4A: Only cancelled orders can be reopened
  const nonCancelledCheck = evaluateReopenOrderEligibility({
    orderStatus: "confirmed",
    paymentStatus: "pending",
  });
  assert.equal(nonCancelledCheck.eligible, false);
  assert.equal(nonCancelledCheck.code, "NOT_CANCELLED");

  // Rule 4B: Active consignment blocks reopening
  const activeConsignmentCheck = evaluateReopenOrderEligibility({
    orderStatus: "cancelled",
    paymentStatus: "pending",
    hasActiveShipment: true,
  });
  assert.equal(activeConsignmentCheck.eligible, false);
  assert.equal(activeConsignmentCheck.code, "ACTIVE_CONSIGNMENT_EXISTS");

  const uncancelledConsignmentIdCheck = evaluateReopenOrderEligibility({
    orderStatus: "cancelled",
    paymentStatus: "pending",
    consignmentId: "SF12345678",
    shipmentStatus: "in_transit",
  });
  assert.equal(uncancelledConsignmentIdCheck.eligible, false);
  assert.equal(uncancelledConsignmentIdCheck.code, "ACTIVE_CONSIGNMENT_EXISTS");

  // Verified courier cancellation permits reopening
  const verifiedCancelledConsignmentCheck = evaluateReopenOrderEligibility({
    orderStatus: "cancelled",
    paymentStatus: "pending",
    paymentMethod: "cod",
    consignmentId: "SF12345678",
    shipmentStatus: "cancelled",
    shipmentBookingState: "cancelled",
    hasActiveShipment: false,
  });
  assert.equal(verifiedCancelledConsignmentCheck.eligible, true);
  assert.equal(verifiedCancelledConsignmentCheck.targetOrderStatus, "pending");

  // Rule 4C: Refunded orders cannot be directly reopened without new payment
  const refundedCheck = evaluateReopenOrderEligibility({
    orderStatus: "cancelled",
    paymentStatus: "refunded",
  });
  assert.equal(refundedCheck.eligible, false);
  assert.equal(refundedCheck.code, "PAYMENT_REFUNDED_LOCKED");

  const refundPendingCheck = evaluateReopenOrderEligibility({
    orderStatus: "cancelled",
    paymentStatus: "refund_pending",
  });
  assert.equal(refundPendingCheck.eligible, false);
  assert.equal(refundPendingCheck.code, "PAYMENT_REFUNDED_LOCKED");
});

// ── 5. UNPAID ONLINE VS PAID ONLINE RESTORATION ──────────────────────────────
test("5. Unpaid Online vs Paid Online Restoration: Safe state targets without auto-COD", () => {
  // Case A: Unpaid online order -> Restores to Pending, payment remains Pending, NO auto-COD
  const unpaidOnline = evaluateReopenOrderEligibility({
    orderStatus: "cancelled",
    paymentStatus: "pending",
    paymentMethod: "sslcommerz",
    total: 2500,
  });
  assert.equal(unpaidOnline.eligible, true);
  assert.equal(unpaidOnline.targetOrderStatus, "pending");
  assert.equal(unpaidOnline.targetPaymentStatus, "pending");
  assert.equal(unpaidOnline.shouldRestoreCodBalance, false);
  assert.match(unpaidOnline.summary, /without switching to COD/);

  // Case B: Paid online order with unverified gateway check -> Rejected
  const unverifiedPaidOnline = evaluateReopenOrderEligibility({
    orderStatus: "cancelled",
    paymentStatus: "paid",
    paymentMethod: "sslcommerz",
    total: 2500,
    hasVerifiedPaymentTxn: false,
  });
  assert.equal(unverifiedPaidOnline.eligible, false);
  assert.equal(unverifiedPaidOnline.code, "UNVERIFIED_PAID_GATEWAY");

  // Case C: Paid online order with verified gateway transaction -> Restores to Confirmed, payment Paid
  const verifiedPaidOnline = evaluateReopenOrderEligibility({
    orderStatus: "cancelled",
    paymentStatus: "paid",
    paymentMethod: "sslcommerz",
    total: 2500,
    hasVerifiedPaymentTxn: true,
  });
  assert.equal(verifiedPaidOnline.eligible, true);
  assert.equal(verifiedPaidOnline.targetOrderStatus, "confirmed");
  assert.equal(verifiedPaidOnline.targetPaymentStatus, "paid");
  assert.equal(verifiedPaidOnline.shouldRestoreCodBalance, false);

  // Case D: COD order cancelled -> Restores to Pending, restores expected COD balance
  const codOrder = evaluateReopenOrderEligibility({
    orderStatus: "cancelled",
    paymentStatus: "pending",
    paymentMethod: "cod",
    total: 1800,
  });
  assert.equal(codOrder.eligible, true);
  assert.equal(codOrder.targetOrderStatus, "pending");
  assert.equal(codOrder.targetPaymentStatus, "pending");
  assert.equal(codOrder.shouldRestoreCodBalance, true);
});

// ── 6. FINANCIAL SAFETY & INDEPENDENT SETTLEMENT ─────────────────────────────
test("6. Financial Safety: COD calculations, advance payments, and independent settlement decoupling", () => {
  // Verified prepaid order total ৳3,000 -> COD collectible is strictly 0
  const prepaid = computeOrderFinancials({
    total: 3000,
    paidAmount: 3000,
    paymentStatus: "paid",
    paymentMethod: "sslcommerz",
    orderStatus: "confirmed",
  });
  assert.equal(prepaid.codAmountToCollect, 0);
  assert.equal(prepaid.isPrepaidVerified, true);
  assert.equal(prepaid.codSettlementStatus, "none");

  // Partially paid order (advance ৳500 on ৳2000 total) -> collectible COD = ৳1500
  const partial = computeOrderFinancials({
    total: 2000,
    paidAmount: 500,
    paymentStatus: "partially_paid",
    paymentMethod: "cod",
    orderStatus: "confirmed",
  });
  assert.equal(partial.codAmountToCollect, 1500);
  assert.equal(partial.outstandingAmount, 1500);
  assert.equal(partial.isPartiallyPaid, true);
  assert.equal(partial.codSettlementStatus, "expected");

  // Delivered parcel: courier collected ৳1500, courier fee ৳100, bank remitted ৳1400 -> balanced settlement
  const settled = computeOrderFinancials({
    total: 2000,
    paidAmount: 500,
    paymentStatus: "paid",
    paymentMethod: "cod",
    orderStatus: "delivered",
    expectedCodAmount: 1500,
    collectedCodAmount: 1500,
    settledCodAmount: 1400,
    courierCharge: 100,
    codSettlementStatus: "settled",
  });
  assert.equal(settled.collectedCodAmount, 1500);
  assert.equal(settled.settledCodAmount, 1400);
  assert.equal(settled.discrepancyAmount, 0);
  assert.equal(settled.codSettlementStatus, "settled");

  // Discrepancy scenario: courier collected ৳1500, courier fee ৳100, bank remitted ৳1200 -> ৳200 discrepancy
  const discrepancy = computeOrderFinancials({
    total: 2000,
    paidAmount: 500,
    paymentStatus: "paid",
    paymentMethod: "cod",
    orderStatus: "delivered",
    expectedCodAmount: 1500,
    collectedCodAmount: 1500,
    settledCodAmount: 1200,
    courierCharge: 100,
    codSettlementStatus: "discrepancy",
  });
  assert.equal(discrepancy.discrepancyAmount, 200);
  assert.equal(discrepancy.codSettlementStatus, "discrepancy");
});

// ── 7. UI PRESENTATION & ORDER ACTIONS MENU ──────────────────────────────────
test("7. UI Improvements: 4 distinct lifecycles, Order Actions menu, and Reopen modal", () => {
  const contentSource = read("src/app/admin/orders/_components/order-details-content.tsx");

  // 4 distinct lifecycles displayed separately
  assert.match(contentSource, /renderLifecycleBadgesStrip/, "Component must render 4 distinct lifecycles strip");
  assert.match(contentSource, /Order Status/, "Strip must show Order Status");
  assert.match(contentSource, /Payment \(/, "Strip must show Payment Status with method");
  assert.match(contentSource, /Shipment/, "Strip must show Shipment Status");
  assert.match(contentSource, /COD Settlement/, "Strip must show COD Settlement Status");

  // Order Actions dropdown menu
  assert.match(contentSource, /Order Actions/, "Component must provide dedicated Order Actions menu");
  assert.match(contentSource, /Update Order Status/, "Order Actions menu must offer Update Order Status");
  assert.match(contentSource, /Reopen Cancelled Order/, "Order Actions menu must offer Reopen Cancelled Order when cancelled");

  // Modals
  assert.match(contentSource, /renderUpdateStatusModal/, "Component must have Update Order Status modal");
  assert.match(contentSource, /renderReopenModal/, "Component must have Reopen Cancelled Order recovery modal");
  assert.match(contentSource, /Pre-Flight Safety Verifications/, "Reopen modal must verify pre-flight conditions");
  assert.match(contentSource, /Mandatory for audit trail/, "Reopen modal must require mandatory admin reason");

  // Chronological audit history
  assert.match(contentSource, /Immutable Audit Trail/, "Timeline card must show immutable status history and audit trail");
});
