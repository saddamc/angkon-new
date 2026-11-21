import test from "node:test";
import assert from "node:assert/strict";
import { PAYMENT_CONSTANTS } from "../../src/server/payments/constants.ts";
import { PaymentStateMachine } from "../../src/server/payments/payment-state-machine.ts";

test("payment reconciliation: backoff schedule is ordered monotonically", () => {
  const schedule = PAYMENT_CONSTANTS.BACKOFF_SCHEDULE_MINUTES;
  assert.equal(Array.isArray(schedule), true);
  assert.equal(schedule.length >= 5, true);

  for (let i = 1; i < schedule.length; i++) {
    assert.equal(schedule[i] >= schedule[i - 1], true, "Backoff schedule must increase or stay level");
  }
});

test("payment reconciliation: thresholds are production-calibrated", () => {
  assert.equal(PAYMENT_CONSTANTS.SESSION_EXPIRATION_HOURS, 4);
  assert.equal(PAYMENT_CONSTANTS.MAX_RECONCILE_ATTEMPTS, 8);
  assert.equal(PAYMENT_CONSTANTS.AMOUNT_TOLERANCE_BDT, 0.01);
});

test("payment reconciliation: state machine reconciliation dimensions", () => {
  // Orthogonal dimension: reconciliation status does not alter immutable succeeded payment
  assert.equal(PaymentStateMachine.isTerminal("succeeded"), true);
  assert.equal(PaymentStateMachine.canTransition("unknown", "succeeded"), true);
  assert.equal(PaymentStateMachine.canTransition("pending", "succeeded"), true);
});
