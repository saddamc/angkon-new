import test from "node:test";
import assert from "node:assert/strict";
import { generateEventFingerprint } from "../../src/server/payments/payment-idempotency.ts";
import { normalizeSslcommerzResponse } from "../../src/server/payments/providers/sslcommerz/normalize-response.ts";

test("payment ipn: generates deterministic event fingerprint", () => {
  const fp1 = generateEventFingerprint({
    provider: "sslcommerz",
    tranId: "ANG-261120-1001",
    valId: "VAL-123456",
    status: "VALID",
    amount: 1500,
  });

  const fp2 = generateEventFingerprint({
    provider: "sslcommerz",
    tranId: "ANG-261120-1001",
    valId: "VAL-123456",
    status: "VALID",
    amount: "1500",
  });

  assert.equal(typeof fp1, "string");
  assert.equal(fp1.length, 64);
  assert.equal(fp1, fp2); // Must be strictly identical for idempotent webhook dedup
});

test("payment ipn: different status or amount creates distinct fingerprint", () => {
  const fpValid = generateEventFingerprint({
    provider: "sslcommerz",
    tranId: "ANG-261120-1001",
    valId: "VAL-123456",
    status: "VALID",
    amount: 1500,
  });

  const fpFailed = generateEventFingerprint({
    provider: "sslcommerz",
    tranId: "ANG-261120-1001",
    valId: "VAL-123456",
    status: "FAILED",
    amount: 1500,
  });

  assert.notEqual(fpValid, fpFailed);
});

test("payment ipn: normalizes raw IPN payload fields safely", () => {
  const rawIpn = {
    tran_id: "ANG-261120-1001",
    val_id: "VAL-987654",
    status: "VALID",
    amount: "2500.50",
    currency: "BDT",
    bank_tran_id: "BANK-777",
    card_type: "BKASH-BKash",
    card_brand: "MOBILEBANKING",
    risk_level: "0",
    risk_title: "Safe",
  };

  const normalized = normalizeSslcommerzResponse(rawIpn);
  assert.equal(normalized.tranId, "ANG-261120-1001");
  assert.equal(normalized.valId, "VAL-987654");
  assert.equal(normalized.status, "VALID");
  assert.equal(normalized.amount, 2500.5);
  assert.equal(normalized.currency, "BDT");
  assert.equal(normalized.bankTranId, "BANK-777");
  assert.equal(normalized.cardType, "BKASH-BKash");
  assert.equal(normalized.riskLevel, "0");
});
