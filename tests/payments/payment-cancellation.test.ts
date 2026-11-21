import test from "node:test";
import assert from "node:assert/strict";
import { mapGatewayStatus } from "../../src/server/payments/utils/map-gateway-status.ts";
import { PaymentStateMachine } from "../../src/server/payments/payment-state-machine.ts";

test("payment cancellation: gateway CANCELLED maps to internal cancelled status", () => {
  const mapped = mapGatewayStatus("CANCELLED");
  assert.equal(mapped.normalized, "CANCELLED");
  assert.equal(mapped.internalStatus, "cancelled");

  const mappedCancel = mapGatewayStatus("CANCEL");
  assert.equal(mappedCancel.normalized, "CANCELLED");
  assert.equal(mappedCancel.internalStatus, "cancelled");
});

test("payment cancellation: cannot downgrade an already succeeded payment to cancelled", () => {
  assert.equal(PaymentStateMachine.canTransition("succeeded", "cancelled"), false);
});

test("payment cancellation: pending and initiating can transition to cancelled", () => {
  assert.equal(PaymentStateMachine.canTransition("pending", "cancelled"), true);
  assert.equal(PaymentStateMachine.canTransition("initiating", "cancelled"), true);
});

test("payment cancellation: is terminal", () => {
  assert.equal(PaymentStateMachine.isTerminal("cancelled"), true);
});
