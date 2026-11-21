import test from "node:test";
import assert from "node:assert/strict";
import { generateEventFingerprint, maskSessionKey } from "../../src/server/payments/payment-idempotency.ts";
import { PaymentStateMachine } from "../../src/server/payments/payment-state-machine.ts";

test("payment idempotency: webhook fingerprint is deterministic across whitespace/casing", () => {
  const fpA = generateEventFingerprint({
    provider: "SSLCOMMERZ",
    tranId: "  ANG-999-001  ",
    valId: "VAL-1234",
    status: "valid",
    amount: "5000",
  });

  const fpB = generateEventFingerprint({
    provider: "sslcommerz",
    tranId: "ANG-999-001",
    valId: "VAL-1234",
    status: "VALID",
    amount: 5000,
  });

  assert.equal(fpA, fpB);
});

test("payment idempotency: state machine forbids downgrading terminal states", () => {
  // Succeeded can NEVER be downgraded
  assert.equal(PaymentStateMachine.canTransition("succeeded", "failed"), false);
  assert.equal(PaymentStateMachine.canTransition("succeeded", "cancelled"), false);
  assert.equal(PaymentStateMachine.canTransition("succeeded", "pending"), false);
  assert.equal(PaymentStateMachine.canTransition("succeeded", "created"), false);

  // Refund is the only permitted forward path from succeeded
  assert.equal(PaymentStateMachine.canTransition("succeeded", "refunded"), true);
});

test("payment idempotency: session key masking is one-way cryptographic SHA-256", () => {
  const key = "MY_VERY_SECRET_SSLCOMMERZ_SESSION_KEY";
  const masked = maskSessionKey(key);
  assert.equal(typeof masked, "string");
  assert.equal(masked.length, 64);
  assert.notEqual(masked, key);
  assert.equal(masked.includes("SECRET"), false);
});
