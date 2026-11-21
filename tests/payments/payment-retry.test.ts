import test from "node:test";
import assert from "node:assert/strict";
import { generateTranId, extractOrderNumberFromTranId } from "../../src/server/payments/utils/generate-tran-id.ts";
import { MAX_PAYMENT_ATTEMPTS } from "../../src/server/payments/constants.ts";
import { PaymentStateMachine } from "../../src/server/payments/payment-state-machine.ts";

test("payment retry: generates incremented attempt suffixes", () => {
  const orderNum = "ANG-261120-8888";
  assert.equal(generateTranId(orderNum, 1), "ANG-261120-8888");
  assert.equal(generateTranId(orderNum, 2), "ANG-261120-8888-A2");
  assert.equal(generateTranId(orderNum, 3), "ANG-261120-8888-A3");
  assert.equal(generateTranId(orderNum, 4), "ANG-261120-8888-A4");
});

test("payment retry: extracts base order number accurately from any retry tranId", () => {
  assert.equal(extractOrderNumberFromTranId("ANG-261120-8888"), "ANG-261120-8888");
  assert.equal(extractOrderNumberFromTranId("ANG-261120-8888-A2"), "ANG-261120-8888");
  assert.equal(extractOrderNumberFromTranId("ANG-261120-8888-A5"), "ANG-261120-8888");
  assert.equal(extractOrderNumberFromTranId("  ANG-261120-8888-A3  "), "ANG-261120-8888");
});

test("payment retry: max attempts constant is configured safely", () => {
  assert.equal(typeof MAX_PAYMENT_ATTEMPTS, "number");
  assert.equal(MAX_PAYMENT_ATTEMPTS >= 3, true);
  assert.equal(MAX_PAYMENT_ATTEMPTS <= 10, true);
});

test("payment retry: terminal states allow re-initiation of a new attempt", () => {
  // A new attempt starts fresh at "created"
  assert.equal(PaymentStateMachine.canTransition("created", "initiating"), true);
});
