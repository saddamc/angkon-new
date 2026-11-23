import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

/**
 * Refund safety contracts.
 *
 * Pins the two audit findings that made refunds imperfect:
 *   1. The refundable-balance check was non-atomic (two concurrent admin
 *      refunds could both pass and double-refund). The fix reserves the
 *      balance by creating the durable refund doc FIRST (`initiated` counts
 *      toward the sum) and only then validates the authoritative total.
 *   2. Refunds stuck in `processing` at the gateway were never polled
 *      automatically — only an admin clicking "Sync" moved them. The fix adds
 *      a refund-sync job to the shared reconciliation suite.
 */

const read = (file) => fs.readFileSync(file, "utf8");
const refundService = read("src/server/payments/services/process-refund.ts");
const refundRepository = read("src/server/payments/repositories/payment-refund.repository.ts");
const refundRoute = read("src/app/api/payments/[attemptId]/refund/route.ts");
const refundSyncJob = read("src/server/payments/jobs/sync-processing-refunds.ts");
const jobSuite = read("src/server/payments/run-reconciliation.ts");
const sslcommerzConfig = read("src/server/payments/providers/sslcommerz/config.ts");
const envExample = read(".env.example");

test("refund balance is reserved atomically before it is validated", () => {
  // The durable refund doc is created BEFORE the authoritative balance check,
  // and `initiated` rows count toward the refundable sum — so two concurrent
  // refunds can never both claim the same balance.
  const createIndex = refundService.indexOf("PaymentRefundRepository.createRefund");
  const checkIndex = refundService.indexOf("alreadyRefunded > expectedAmount + 0.01");
  assert.ok(createIndex !== -1, "initiateRefund must create the durable refund record");
  assert.ok(checkIndex !== -1, "initiateRefund must run an authoritative post-reservation check");
  assert.ok(
    createIndex < checkIndex,
    "the refund doc must be created before the authoritative balance check"
  );

  // Both checks count `initiated` reservations.
  const includeInitiatedCount = (refundService.match(/includeInitiated: true/g) || []).length;
  assert.ok(includeInitiatedCount >= 2, "pre-check and post-check must both count initiated rows");

  // A failed concurrent reservation releases its hold.
  assert.ok(
    refundService.includes("Concurrent refund request exceeded the available refundable balance"),
    "the losing concurrent refund must be rolled back to failed (reservation released)"
  );
});

test("refund repository counts initiated rows toward the balance on request", () => {
  assert.ok(refundRepository.includes("includeInitiated"));
  assert.ok(
    refundRepository.includes('"initiated", "processing", "succeeded"'),
    "includeInitiated must add initiated to the counted statuses"
  );
  assert.ok(
    refundRepository.includes('["processing", "succeeded"]'),
    "the default (committed-only) sum must stay unchanged for display purposes"
  );
});

test("refunds stuck in processing are polled automatically by the reconciliation suite", () => {
  assert.ok(
    refundSyncJob.includes('status: "processing"'),
    "the job must poll refunds in processing state"
  );
  assert.ok(
    refundSyncJob.includes("ProcessRefundService.syncRefundStatus"),
    "the job must reuse the admin sync service, not duplicate its logic"
  );
  // Observability without auto-resolution: an `initiated` refund has an
  // unknowable gateway outcome and must never be auto-failed.
  const normalizedJob = refundSyncJob.replace(/\r/g, "");
  assert.ok(normalizedJob.includes("stuckInitiated"));
  assert.ok(normalizedJob.includes("NEVER"));
  assert.ok(normalizedJob.includes("auto-resolved"));

  assert.ok(
    jobSuite.includes("runSyncProcessingRefundsJob"),
    "the shared job suite must include the refund sync job"
  );
  assert.ok(
    jobSuite.includes("refundSync"),
    "the suite result must expose refundSync stats to the security log"
  );
});

test("the money-moving refund endpoint is rate limited", () => {
  assert.ok(refundRoute.includes("rateLimit"));
  assert.ok(refundRoute.includes("payment_refund:"));
  assert.ok(refundRoute.includes("createRateLimitResponse"));
});

test("live-mode detection has a single source of truth", () => {
  assert.ok(
    sslcommerzConfig.includes("getSslcommerzCredentials"),
    "gateway config must delegate mode/credential selection to getSslcommerzCredentials()"
  );
  // The duplicate env parsing must be gone from the transport config.
  assert.ok(
    !sslcommerzConfig.includes("SSLCOMMERZ_IS_LIVE?.trim"),
    "config.ts must not re-implement live-mode env parsing"
  );
});

test("payment session TTL in .env.example covers the hosted-checkout window", () => {
  assert.ok(envExample.includes("PAYMENT_SESSION_TTL_MINUTES=240"));
  assert.ok(
    !envExample.includes("PAYMENT_SESSION_TTL_MINUTES=60"),
    "the 60-minute example value expired sessions aggressively and must not return"
  );
});
