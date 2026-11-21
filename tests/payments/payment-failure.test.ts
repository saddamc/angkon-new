import test from "node:test";
import assert from "node:assert/strict";
import { mapGatewayStatus } from "../../src/server/payments/utils/map-gateway-status.ts";
import { PaymentStateMachine } from "../../src/server/payments/payment-state-machine.ts";

test("payment failure: gateway FAILED maps to internal failed status", () => {
  const mapped = mapGatewayStatus("FAILED");
  assert.equal(mapped.normalized, "FAILED");
  assert.equal(mapped.internalStatus, "failed");

  const mappedFail = mapGatewayStatus("FAIL");
  assert.equal(mappedFail.normalized, "FAILED");
  assert.equal(mappedFail.internalStatus, "failed");
});

test("payment failure: cannot downgrade an already succeeded payment to failed", () => {
  // P0 Invariant: A succeeded payment can NEVER be overwritten by late failure callback or webhook
  assert.equal(PaymentStateMachine.canTransition("succeeded", "failed"), false);
});

test("payment failure: pending can transition to failed", () => {
  assert.equal(PaymentStateMachine.canTransition("pending", "failed"), true);
  assert.equal(PaymentStateMachine.canTransition("initiating", "failed"), true);
  assert.equal(PaymentStateMachine.canTransition("created", "failed"), true);
});

test("payment failure: is marked as a terminal state", () => {
  assert.equal(PaymentStateMachine.isTerminal("failed"), true);
});
