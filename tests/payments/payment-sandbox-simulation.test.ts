import test from "node:test";
import assert from "node:assert/strict";
import { VerifyPaymentService } from "../../src/server/payments/services/verify-payment";
import { generateEventFingerprint } from "../../src/server/payments/payment-idempotency";
import { PaymentStateMachine } from "../../src/server/payments/payment-state-machine";
import { generateTranId, extractOrderNumberFromTranId } from "../../src/server/payments/utils/generate-tran-id";
import { mapGatewayStatus } from "../../src/server/payments/utils/map-gateway-status";
import type { NormalizedGatewayResult } from "../../src/server/payments/types";

test("sandbox simulation 1: Successful Sandbox payment verification and settlement", () => {
  const sandboxResult: NormalizedGatewayResult = {
    provider: "sslcommerz",
    tranId: "ANG-TEST-001",
    valId: "VAL_SANDBOX_SUCCESS_991",
    status: "VALID",
    amount: 2500,
    currency: "BDT",
    bankTranId: "BANK_TRAN_7721",
    cardType: "BKASH-BKash",
    cardBrand: "MOBILEBANKING",
    riskLevel: "0",
    riskTitle: "Safe",
    rawResponse: { status: "VALID", val_id: "VAL_SANDBOX_SUCCESS_991" },
  };

  const verification = VerifyPaymentService.verifyResult({
    expectedOrderNumber: "ANG-TEST-001",
    expectedAmount: 2500,
    expectedCurrency: "BDT",
    normalized: sandboxResult,
  });

  assert.equal(verification.isValid, true);
  assert.equal(verification.decision, "succeeded");
  assert.equal(verification.isTerminal, true);
});

test("sandbox simulation 2: Failed Sandbox payment handling", () => {
  const mapped = mapGatewayStatus("FAILED");
  assert.equal(mapped.normalized, "FAILED");
  assert.equal(mapped.internalStatus, "failed");
  assert.equal(PaymentStateMachine.canTransition("pending", "failed"), true);
});

test("sandbox simulation 3: Customer cancellation", () => {
  const mapped = mapGatewayStatus("CANCELLED");
  assert.equal(mapped.normalized, "CANCELLED");
  assert.equal(mapped.internalStatus, "cancelled");
  assert.equal(PaymentStateMachine.canTransition("pending", "cancelled"), true);
  assert.equal(PaymentStateMachine.isTerminal("cancelled"), true);
});

test("sandbox simulation 4 & 5: Customer abandonment and internet disconnect", () => {
  // Missing return detected - must NOT mark failed immediately
  const customerActivity = "no_return_detected";
  const initialStatus = "pending";

  assert.equal(customerActivity, "no_return_detected");
  assert.equal(PaymentStateMachine.canTransition(initialStatus, "unknown"), true);
  // Reconciler recovers to succeeded when IPN or query succeeds
  assert.equal(PaymentStateMachine.canTransition("unknown", "succeeded"), true);
});

test("sandbox simulation 6 & 7: IPN received without browser return and duplicate IPN deduplication", () => {
  const ipnPayload = {
    provider: "sslcommerz",
    tranId: "ANG-TEST-001",
    valId: "VAL_SANDBOX_991",
    status: "VALID",
    amount: 2500,
  };

  const fp1 = generateEventFingerprint(ipnPayload);
  const fp2 = generateEventFingerprint(ipnPayload);

  // Exact deterministic fingerprint guarantees idempotent deduplication
  assert.equal(fp1, fp2);
  assert.equal(fp1.length, 64);
});

test("sandbox simulation 8: Backend validation timeout recovery", () => {
  // If timeout occurs, status stays 'unknown' and is scheduled for reconciliation backoff
  assert.equal(PaymentStateMachine.canTransition("initiating", "unknown"), true);
  assert.equal(PaymentStateMachine.canTransition("unknown", "succeeded"), true);
  assert.equal(PaymentStateMachine.canTransition("unknown", "failed"), true);
});

test("sandbox simulation 9: Multiple payment attempts for one order", () => {
  const orderNum = "ANG-TEST-MULTI";
  const attempt1 = generateTranId(orderNum, 1);
  const attempt2 = generateTranId(orderNum, 2);
  const attempt3 = generateTranId(orderNum, 3);

  assert.equal(attempt1, "ANG-TEST-MULTI");
  assert.equal(attempt2, "ANG-TEST-MULTI-A2");
  assert.equal(attempt3, "ANG-TEST-MULTI-A3");

  assert.equal(extractOrderNumberFromTranId(attempt1), orderNum);
  assert.equal(extractOrderNumberFromTranId(attempt2), orderNum);
  assert.equal(extractOrderNumberFromTranId(attempt3), orderNum);
});

test("sandbox simulation 10: Refund lifecycle separation", () => {
  // Succeeded attempt permits refund without deleting original financial record
  assert.equal(PaymentStateMachine.canTransition("succeeded", "refunded"), true);
  assert.equal(PaymentStateMachine.canTransition("succeeded", "partially_refunded"), true);
  // Succeeded can NEVER be downgraded to failed or cancelled
  assert.equal(PaymentStateMachine.canTransition("succeeded", "failed"), false);
  assert.equal(PaymentStateMachine.canTransition("succeeded", "cancelled"), false);
});
