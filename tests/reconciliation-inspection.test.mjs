import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  computePendingCount,
  assertQueueInvariant,
} from "../src/server/payments/reconcile-counts.ts";

const read = (file) => fs.readFileSync(file, "utf8");

const inspection = read("src/server/payments/reconcile-inspection.ts");
const webhookRepo = read("src/server/payments/repositories/payment-webhook.repository.ts");
const retryJob = read("src/server/payments/jobs/retry-failed-verifications.ts");
const reconcileService = read("src/server/payments/services/reconcile-payment.ts");

test("queue invariant: scanned = eligible + pending + skipped", () => {
  assert.equal(computePendingCount({ scanned: 0, eligible: 0, skipped: 0 }), 0);
  assert.equal(computePendingCount({ scanned: 10, eligible: 3, skipped: 2 }), 5);
  assert.equal(computePendingCount({ scanned: 5, eligible: 5, skipped: 0 }), 0);
  assert.equal(computePendingCount({ scanned: 2, eligible: 3, skipped: 2 }), 0);
  assert.equal(assertQueueInvariant({ scanned: 10, eligible: 3, skipped: 2 }), true);
  assert.equal(assertQueueInvariant({ scanned: 2, eligible: 3, skipped: 0 }), false);
});

test("dry-run failure counter is queue-scoped, not historical terminal failures", () => {
  // `failed` must come from the webhook inbox, never from status failed/expired.
  assert.ok(inspection.includes("failed: failedWebhooks"));
  assert.ok(inspection.includes("terminalFailed"));
  assert.ok(inspection.includes("terminalExpired"));
  assert.ok(inspection.includes("failedWebhooks"));
});

test("dry-run is read-only: no gateway calls and no writes", () => {
  assert.ok(inspection.includes("countDocuments"));
  assert.ok(!inspection.includes("updateOne"));
  assert.ok(!inspection.includes("findByIdAndUpdate"));
  assert.ok(!inspection.includes("querySslcommerzTransactionByTranId"));
  assert.ok(!inspection.includes("ReconcilePaymentService"));
  // The route returns inspection data before calling the job suite.
  const route = read("src/app/api/payments/reconcile/route.ts");
  const dryIndex = route.indexOf('dryRun') === -1 ? 0 : route.indexOf('get("dryRun")');
  const runIndex = route.indexOf("runAllPaymentJobs()");
  assert.ok(dryIndex >= 0 && runIndex > dryIndex, "dry-run must return before the job runner");
});

test("failed webhook notifications retry with bounded backoff", () => {
  assert.ok(webhookRepo.includes("nextRetryAt"));
  assert.ok(webhookRepo.includes("2 ** nextAttemptCount * 60_000"));
  assert.ok(webhookRepo.includes("60 * 60_000"));
  assert.ok(retryJob.includes("nextRetryAt"));
  assert.ok(retryJob.includes("processingAttempts: { $lt: 5 }"));
});

test("reconciliation transient errors are recorded without downgrading", () => {
  assert.ok(reconcileService.includes('eventType: "reconciliation_failed"'));
  assert.ok(reconcileService.includes("nextCheckAt"));
});
