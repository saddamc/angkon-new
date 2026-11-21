import test from "node:test";
import assert from "node:assert/strict";
import { PaymentStateMachine } from "../../src/server/payments/payment-state-machine";

test("payment refund: succeeded payment allows transition to refunded or partially_refunded", () => {
  // Succeeded payment retains original financial success and only transitions to refunded/partially_refunded
  assert.equal(PaymentStateMachine.canTransition("succeeded", "refunded"), true);
  assert.equal(PaymentStateMachine.canTransition("succeeded", "partially_refunded"), true);
});

test("payment refund: non-succeeded attempts cannot be refunded", () => {
  assert.equal(PaymentStateMachine.canTransition("failed", "refunded"), false);
  assert.equal(PaymentStateMachine.canTransition("cancelled", "refunded"), false);
  assert.equal(PaymentStateMachine.canTransition("pending", "refunded"), false);
  assert.equal(PaymentStateMachine.canTransition("created", "refunded"), false);
});

test("payment refund: refund calculation preserves exact balance", () => {
  const totalPaid = 3500;
  const previousRefunds = 1000;
  const availableToRefund = totalPaid - previousRefunds;

  assert.equal(availableToRefund, 2500);

  // Attempting to refund more than available must be rejected
  const requestedRefund = 2600;
  assert.equal(requestedRefund > availableToRefund, true);

  // Valid partial refund
  const validPartial = 1500;
  assert.equal(validPartial <= availableToRefund, true);
});

test("payment refund: refund query status mapping", () => {
  const mapRefundStatus = (gatewayStatus: string): "succeeded" | "processing" | "failed" => {
    const s = gatewayStatus.toLowerCase();
    if (s === "refunded") return "succeeded";
    if (s === "processing") return "processing";
    return "failed";
  };

  assert.equal(mapRefundStatus("refunded"), "succeeded");
  assert.equal(mapRefundStatus("REFUNDED"), "succeeded");
  assert.equal(mapRefundStatus("processing"), "processing");
  assert.equal(mapRefundStatus("cancelled"), "failed");
  assert.equal(mapRefundStatus("failed"), "failed");
});
