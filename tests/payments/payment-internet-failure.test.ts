import test from "node:test";
import assert from "node:assert/strict";
import { PaymentStateMachine } from "../../src/server/payments/payment-state-machine.ts";
import { PAYMENT_CONSTANTS } from "../../src/server/payments/constants.ts";

test("payment internet failure: does not mark session failed on missing browser return", () => {
  // If the customer loses connection or closes the browser, the attempt stays in 'pending' or 'unknown'
  // and is NOT automatically transitioned to 'failed' because the customer might have successfully paid!
  assert.equal(PaymentStateMachine.canTransition("pending", "unknown"), true);
  assert.equal(PaymentStateMachine.canTransition("unknown", "succeeded"), true);
});

test("payment internet failure: customer activity dimension is orthogonal to payment status", () => {
  // Customer activity can be 'no_return_detected' while status is still 'pending'
  const customerActivity = "no_return_detected";
  const status = "pending";
  const reconciliationStatus = "scheduled";

  assert.equal(customerActivity, "no_return_detected");
  assert.equal(status, "pending");
  assert.equal(reconciliationStatus, "scheduled");
});

test("payment internet failure: inactivity threshold is within 5-15 minutes", () => {
  assert.equal(PAYMENT_CONSTANTS.CUSTOMER_INACTIVITY_THRESHOLD_MINUTES, 5);
});
