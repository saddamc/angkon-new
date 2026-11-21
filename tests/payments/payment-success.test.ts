import test from "node:test";
import assert from "node:assert/strict";
import { VerifyPaymentService } from "../../src/server/payments/services/verify-payment.ts";
import type { NormalizedGatewayResult } from "../../src/server/payments/types.ts";

test("payment success: valid response verifies successfully", () => {
  const normalized: NormalizedGatewayResult = {
    provider: "sslcommerz",
    tranId: "ANG-261120-1001",
    valId: "VAL-123456",
    status: "VALID",
    amount: 1500,
    currency: "BDT",
    bankTranId: "BANK-999",
    cardType: "VISA",
    cardBrand: "VISA",
    riskLevel: "0",
    riskTitle: "Safe",
    rawResponse: {},
  };

  const verification = VerifyPaymentService.verifyResult({
    expectedOrderNumber: "ANG-261120-1001",
    expectedAmount: 1500,
    expectedCurrency: "BDT",
    normalized,
  });

  assert.equal(verification.isValid, true);
  assert.equal(verification.decision, "succeeded");
});

test("payment success: risk level 1 triggers review_required decision", () => {
  const normalized: NormalizedGatewayResult = {
    provider: "sslcommerz",
    tranId: "ANG-261120-1001",
    valId: "VAL-123456",
    status: "VALID",
    amount: 1500,
    currency: "BDT",
    bankTranId: "BANK-999",
    cardType: "VISA",
    cardBrand: "VISA",
    riskLevel: "1",
    riskTitle: "High risk foreign card transaction",
    rawResponse: {},
  };

  const verification = VerifyPaymentService.verifyResult({
    expectedOrderNumber: "ANG-261120-1001",
    expectedAmount: 1500,
    expectedCurrency: "BDT",
    normalized,
  });

  assert.equal(verification.decision, "review_required");
  assert.equal(verification.reason, "high_risk_flagged");
});

test("payment success: flags amount mismatch for manual review", () => {
  const normalized: NormalizedGatewayResult = {
    provider: "sslcommerz",
    tranId: "ANG-261120-1001",
    valId: "VAL-123456",
    status: "VALID",
    amount: 100, // Attacker paid 100 instead of 1500
    currency: "BDT",
    riskLevel: "0",
    rawResponse: {},
  };

  const verification = VerifyPaymentService.verifyResult({
    expectedOrderNumber: "ANG-261120-1001",
    expectedAmount: 1500,
    expectedCurrency: "BDT",
    normalized,
  });

  assert.equal(verification.isValid, false);
  assert.equal(verification.decision, "review_required");
  assert.equal(verification.reason, "amount_mismatch");
});

test("payment success: flags currency mismatch for manual review", () => {
  const normalized: NormalizedGatewayResult = {
    provider: "sslcommerz",
    tranId: "ANG-261120-1001",
    valId: "VAL-123456",
    status: "VALID",
    amount: 1500,
    currency: "USD",
    riskLevel: "0",
    rawResponse: {},
  };

  const verification = VerifyPaymentService.verifyResult({
    expectedOrderNumber: "ANG-261120-1001",
    expectedAmount: 1500,
    expectedCurrency: "BDT",
    normalized,
  });

  assert.equal(verification.isValid, false);
  assert.equal(verification.decision, "review_required");
  assert.equal(verification.reason, "currency_mismatch");
});
