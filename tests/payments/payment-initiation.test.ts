import test from "node:test";
import assert from "node:assert/strict";
import { generateTranId } from "../../src/server/payments/utils/generate-tran-id.ts";
import { isAmountValid } from "../../src/server/payments/utils/validate-amount.ts";
import { redactSensitiveData } from "../../src/server/payments/utils/redact-sensitive-data.ts";
import { maskSessionKey } from "../../src/server/payments/payment-idempotency.ts";
import { PaymentStateMachine } from "../../src/server/payments/payment-state-machine.ts";

test("payment initiation: generates correct tranId for attempts", () => {
  const tranId1 = generateTranId("ANG-261120-1001", 1);
  assert.equal(tranId1, "ANG-261120-1001");

  const tranId2 = generateTranId("ANG-261120-1001", 2);
  assert.equal(tranId2, "ANG-261120-1001-A2");

  const tranId3 = generateTranId("ANG-261120-1001", 3);
  assert.equal(tranId3, "ANG-261120-1001-A3");
});

test("payment initiation: validates amount within 0.01 tolerance", () => {
  assert.equal(isAmountValid(1500, 1500), true);
  assert.equal(isAmountValid(1500.005, 1500), true);
  assert.equal(isAmountValid(1500.02, 1500), false);
  assert.equal(isAmountValid(1499.98, 1500), false);
  assert.equal(isAmountValid(0, 0), true);
  assert.equal(isAmountValid(-5, -5), false);
});

test("payment initiation: redacts sensitive data (passwords, card numbers)", () => {
  const sensitivePayload = {
    store_passwd: "secret_password_123",
    card_number: "4111111111111234",
    cvv: "999",
    customer_name: "Customer Name",
    amount: "1500.00",
  };

  const redacted = redactSensitiveData(sensitivePayload);
  assert.equal(redacted.store_passwd, "[REDACTED]");
  assert.equal(redacted.cvv, "[REDACTED]");
  assert.equal(redacted.card_number, "[REDACTED]");
  assert.equal(redacted.customer_name, "Customer Name");
});

test("payment initiation: masks session keys safely", () => {
  const sessionKey = "E78F9B61876D805647573A99BFCC09E3";
  const masked = maskSessionKey(sessionKey);
  assert.equal(typeof masked, "string");
  assert.equal(masked.length, 64); // SHA-256 hex digest
  assert.equal(maskSessionKey(""), null);
  assert.equal(maskSessionKey(null), null);
});

test("payment initiation: state machine transition rules", () => {
  assert.equal(PaymentStateMachine.canTransition("created", "initiating"), true);
  assert.equal(PaymentStateMachine.canTransition("initiating", "pending"), true);
  assert.equal(PaymentStateMachine.canTransition("initiating", "failed"), true);
  assert.equal(PaymentStateMachine.canTransition("succeeded", "failed"), false);
  assert.equal(PaymentStateMachine.canTransition("succeeded", "cancelled"), false);
});
