import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const repository = readFileSync(
  "src/server/payments/repositories/order-payment.repository.ts",
  "utf8"
);

test("verified SSLCOMMERZ cancellation preserves cancelled payment status", () => {
  assert.ok(
    repository.includes('paymentStatus: args.status'),
    "cancellation must not be mislabeled as a gateway failure"
  );
  assert.ok(
    repository.includes('failedAt: args.status === "failed" ? now : null'),
    "cancelled payments must not receive a failed timestamp"
  );
});
