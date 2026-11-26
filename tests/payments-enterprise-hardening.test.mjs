import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  createReturnToken,
  verifyReturnToken,
} from "../src/server/payments/return-token-core.ts";

/**
 * Enterprise payment hardening regression suite.
 *
 * These tests pin the properties that made the module unsafe before:
 * one status vocabulary, authenticated money-moving endpoints, a fail-closed
 * reconciliation trigger, and failure notifications that cannot downgrade a
 * payment without validator evidence.
 */

const read = (file) => fs.readFileSync(file, "utf8");

const stateMachine = read("src/server/payments/payment-state-machine.ts");
const attemptRepository = read("src/server/payments/repositories/payment-attempt.repository.ts");
const initiateRoute = read("src/app/api/payments/sslcommerz/initiate/route.ts");
const retryRoute = read("src/app/api/payments/[attemptId]/retry/route.ts");
const statusRoute = read("src/app/api/payments/[attemptId]/status/route.ts");
const reconcileRoute = read("src/app/api/payments/reconcile/route.ts");
const legacyReconcileRoute = read("src/app/api/payment/sslcommerz/reconcile/route.ts");
const finalizeService = read("src/server/payments/services/finalize-payment.ts");
const failureService = read("src/server/payments/services/process-failure.ts");
const cancellationService = read("src/server/payments/services/process-cancellation.ts");
const ipnService = read("src/server/payments/services/process-ipn.ts");
const retryService = read("src/server/payments/services/retry-payment.ts");
const refundService = read("src/server/payments/services/process-refund.ts");
const expireService = read("src/server/payments/services/expire-payment-attempts.ts");
const adminPage = read("src/app/admin/payments/page.tsx");
const statusPage = read("src/app/checkout/payment/result/page.tsx");
const capi = read("src/server/payments/capi.ts");
const csrf = read(fs.existsSync("src/server/security/csrf.ts") ? "src/server/security/csrf.ts" : "src/server/csrf.ts");
const vercel = JSON.parse(read("vercel.json"));

test("status vocabulary: legacy paid/initiated normalize without losing safety", () => {
  assert.ok(stateMachine.includes("paid: \"succeeded\""));
  assert.ok(stateMachine.includes("initiated: \"pending\""));
  assert.ok(stateMachine.includes("normalizePaymentStatus"));
  assert.ok(stateMachine.includes('currentStatus === "succeeded"'));
  // A late failure must never downgrade a successful payment.
  assert.ok(
    stateMachine.includes('targetStatus === "failed"') &&
      stateMachine.includes("return false")
  );
});

test("atomic transition blocks downgrades of succeeded and legacy paid rows", () => {
  assert.ok(attemptRepository.includes("normalizePaymentStatus"));
  assert.ok(attemptRepository.includes('$nin: ["succeeded", "paid"]'));
  assert.ok(attemptRepository.includes("isDowngradeTarget"));
});

test("payment initiation requires an authenticated order owner", () => {
  assert.ok(initiateRoute.includes("requireCustomerId"));
  assert.ok(initiateRoute.includes("assertOrderOwnership"));
  assert.ok(initiateRoute.includes("PaymentError"));
});

test("retry requires ownership or the signed status token and blocks unresolved attempts", () => {
  assert.ok(retryRoute.includes("requireCustomerId"));
  assert.ok(retryRoute.includes("assertAttemptOwnership"));
  assert.ok(retryRoute.includes("verifyPaymentStatusToken"));
  assert.ok(retryService.includes("RETRY_NOT_ALLOWED"));
  assert.ok(retryService.includes("We are still checking your previous payment"));
  assert.ok(retryService.includes('latestStatus === "unknown"'));
});

test("status API is token-or-owner gated and rate limited", () => {
  assert.ok(statusRoute.includes("verifyPaymentStatusToken"));
  assert.ok(statusRoute.includes("assertAttemptOwnership"));
  assert.ok(statusRoute.includes("checkDualRateLimit"));
  assert.ok(statusRoute.includes("no-store"));
});

test("status page refuses enumeration without a token or owning session", () => {
  assert.ok(statusPage.includes("verifyPaymentStatusToken"));
  assert.ok(statusPage.includes("customerOwnsOrder"));
  assert.ok(statusPage.includes("notFound()"));
});

test("reconcile trigger fails closed and accepts admin or cron only", () => {
  assert.ok(reconcileRoute.includes("getCronSecret"));
  assert.ok(reconcileRoute.includes("requireAdminSessionCore"));
  assert.ok(reconcileRoute.includes("Unauthorized"));
  assert.ok(reconcileRoute.includes("runAllPaymentJobs"));
  assert.ok(legacyReconcileRoute.includes("requireAdminSessionCore"));
  assert.ok(legacyReconcileRoute.includes("getCronSecret"));
});

test("failure and cancellation notifications require validator evidence", () => {
  for (const source of [failureService, cancellationService]) {
    assert.ok(source.includes("verifyFailureNotification"));
    assert.ok(source.includes("Unverified"));
    assert.ok(source.includes("reconciliationStatus: \"scheduled\""));
  }
  assert.ok(ipnService.includes("verifyFailureNotification"));
  assert.ok(ipnService.includes("ignored"));
});

test("success settlement is idempotent and sends CAPI at most once", () => {
  assert.ok(finalizeService.includes("alreadySettled: true"));
  assert.ok(finalizeService.includes("isSuccessfulStatus"));
  assert.ok(finalizeService.includes("Success is terminal"));
  assert.ok(finalizeService.includes("sendVerifiedPurchaseCapi"));
  assert.ok(capi.includes("capiPurchaseSentAt"));
  assert.ok(capi.includes("if (!isSslcommerzLive()) return;"));
});

test("refunds accept legacy paid rows but never downgrade the success", () => {
  assert.ok(refundService.includes("isSuccessfulStatus"));
  assert.ok(refundService.includes('attempt.status !== "partially_refunded"'));
  assert.ok(refundService.includes("Cannot refund a payment"));
});

test("expiry never releases stock for a session that may have succeeded", () => {
  assert.ok(expireService.includes('status: { $in: ["created", "initiating"] }'));
  assert.ok(expireService.includes("gatewayPageUrl"));
});

test("dashboard counts legacy paid rows as successful revenue", () => {
  assert.ok(adminPage.includes('["succeeded", "paid"]'));
  assert.ok(adminPage.includes("succeededFilter"));
  assert.ok(adminPage.includes("cancelledCount"));
});

test("CSRF guard covers the new browser-initiated payment mutations", () => {
  assert.ok(csrf.includes("/^\\/api\\/payments\\/sslcommerz\\/initiate$/"));
  assert.ok(csrf.includes("/^\\/api\\/payments\\/[^/]+\\/retry$/"));
  assert.ok(csrf.includes("/^\\/api\\/payments\\/[^/]+\\/refund$/"));
  assert.ok(csrf.includes("/^\\/api\\/payments\\/reconcile$/"));
  assert.ok(!csrf.includes("/api/payments/sslcommerz/ipn"));
});

test("the canonical reconciliation route is scheduled once per day", () => {
  const cron = vercel.crons.find((entry) => entry.path === "/api/payments/reconcile");
  assert.ok(cron, "reconcile cron must be registered");
  assert.equal(cron.schedule, "0 3 * * *");
  assert.ok(!vercel.crons.some((entry) => entry.path === "/api/payment/sslcommerz/reconcile"));
});

test("status token is bound to the attempt and expires", () => {
  const secret = "test-status-secret";
  const token = createReturnToken("attempt-123", secret, Date.now());
  assert.equal(verifyReturnToken(token, "attempt-123", secret), true);
  assert.equal(verifyReturnToken(token, "attempt-999", secret), false);
  assert.equal(
    verifyReturnToken(token, "attempt-123", secret, Date.now() + 48 * 60 * 60 * 1000),
    false
  );
});

test("legacy rows without expectedAmount are still verified against their amount", () => {
  const successService = read("src/server/payments/services/process-success.ts");
  const ipn = read("src/server/payments/services/process-ipn.ts");
  assert.ok(successService.includes("attempt.expectedAmount ?? attempt.amount"));
  assert.ok(ipn.includes("attempt.expectedAmount ?? attempt.amount"));
  assert.ok(adminPage.includes('$ifNull: ["$expectedAmount", "$amount"]'));
});

test("reconciliation dry-run is read-only and reports queue counters", () => {
  const inspection = read("src/server/payments/reconcile-inspection.ts");
  const probe = read("scripts/sandbox/probe-integrations.mjs");
  assert.ok(reconcileRoute.includes("dryRun"));
  assert.ok(reconcileRoute.includes("inspectReconciliationQueue"));
  assert.ok(inspection.includes("failedWebhooks"));
  assert.ok(inspection.includes("skipped"));
  assert.ok(probe.includes("/api/payments/reconcile?dryRun=1"));
  assert.ok(!probe.includes("/api/payment/sslcommerz/reconcile?dryRun=1"));
});

test("status normalization migration is documented and dry-run by default", () => {
  const migrationPath = "scripts/migrations/2026-11-20-payment-status-normalize.mjs";
  assert.ok(fs.existsSync(migrationPath));
  const migration = read(migrationPath);
  assert.ok(migration.includes('from: "paid", to: "succeeded"'));
  assert.ok(migration.includes("--apply"));
  assert.ok(migration.includes("Dry run only"));
});
