import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  createReturnToken,
  verifyReturnToken,
} from "../src/server/payments/return-token-core.ts";

const RETURN_SECRET = "test-return-token-secret";
const createPaymentReturnToken = (orderNumber, now = Date.now()) =>
  createReturnToken(orderNumber, RETURN_SECRET, now);
const verifyPaymentReturnToken = (token, orderNumber, now = Date.now()) =>
  verifyReturnToken(token, orderNumber, RETURN_SECRET, now);

/**
 * P1 contract: signed return URLs, reconciliation safety, admin payment UI.
 */

const read = (file) => fs.readFileSync(file, "utf8");

const reconcile = [
  read("src/server/payments/services/reconcile-payment.ts"),
  read("src/server/payments/repositories/payment-attempt.repository.ts"),
  read("src/server/payments/run-reconciliation.ts"),
].join("\n");
const reconcileRoute = read("src/app/api/payment/sslcommerz/reconcile/route.ts");
const adminPayments = read("src/app/api/admin/orders/[id]/payments/route.ts");
const initiate = read("src/server/payments/initiate.ts");
const initiateService = read("src/server/payments/services/initiate-payment.ts");
const sslcommerz = read("src/server/sslcommerz.ts");
const hook = read("src/app/admin/orders/_hooks/use-admin-orders.ts");
const modals = read("src/app/admin/orders/_components/orders-modals.tsx");
const row = read("src/app/admin/orders/_components/order-row.tsx");
const vercel = JSON.parse(read("vercel.json"));

test("return token: a valid token for the order is accepted", () => {
  const token = createPaymentReturnToken("ANG-261112-0001");
  assert.equal(verifyPaymentReturnToken(token, "ANG-261112-0001"), true);
});

test("return token: a token for another order is rejected", () => {
  const token = createPaymentReturnToken("ANG-261112-0001");
  assert.equal(verifyPaymentReturnToken(token, "ANG-261112-0002"), false);
});

test("return token: tampering and missing tokens are rejected", () => {
  const token = createPaymentReturnToken("ANG-261112-0001");
  const [payload, signature] = token.split(".");
  assert.equal(verifyPaymentReturnToken(`${payload}.deadbeef`, "ANG-261112-0001"), false);
  assert.equal(verifyPaymentReturnToken("", "ANG-261112-0001"), false);
  assert.equal(verifyPaymentReturnToken(null, "ANG-261112-0001"), false);
  assert.equal(
    verifyPaymentReturnToken(`${payload}x.${signature}`, "ANG-261112-0001"),
    false
  );
});

test("return token: expired and future tokens are rejected", () => {
  const now = Date.now();
  const token = createPaymentReturnToken("ANG-261112-0001", now);
  assert.equal(
    verifyPaymentReturnToken(token, "ANG-261112-0001", now + 31 * 60 * 1000),
    false
  );
  assert.equal(
    verifyPaymentReturnToken(token, "ANG-261112-0001", now - 2 * 60 * 1000),
    false
  );
});

test("return URLs carry the signed token", () => {
  assert.ok(initiate.includes("InitiatePaymentService"));
  assert.ok(initiateService.includes("createPaymentReturnToken"));
  assert.ok(initiateService.includes("token=${encodeURIComponent("));
});

test("reconcile: only unresolved payments are queried and settled once", () => {
  assert.ok(reconcile.includes("findEligibleForReconciliation"));
  assert.ok(reconcile.includes("querySslcommerzTransactionByTranId"));
  assert.ok(reconcile.includes("VerifyPaymentService"));
  assert.ok(reconcile.includes("atomicTransition"));
  assert.ok(reconcile.includes("manual_review"));
  assert.ok(reconcile.includes("reconcileAttempts"));
});

test("reconcile endpoint: cron secret or superadmin only", () => {
  assert.ok(reconcileRoute.includes("getCronSecret"));
  assert.ok(reconcileRoute.includes("requireAdminSessionCore"));
  assert.ok(reconcileRoute.includes('auth.role !== "superadmin"'));
  assert.ok(!reconcileRoute.includes("requireSuperAdminSession"), "must not depend on the Meta flag");
});

test("reconcile cron is Hobby-compliant and registered", () => {
  const cron = vercel.crons.find(
    (c) => c.path === "/api/payments/reconcile"
  );
  assert.ok(cron, "the reconcile cron must be registered");
  assert.equal(cron.schedule, "0 3 * * *");
});

test("admin payments endpoint: authorized and sanitised", () => {
  assert.ok(adminPayments.includes("requireAdminSessionCore"));
  assert.ok(adminPayments.includes("Payment.find({ orderNumber: order.orderNumber })"));
  assert.ok(!adminPayments.includes("sessionKeyHash"), "never expose the session-key hash");
  assert.ok(!adminPayments.includes("gatewayPageUrl"), "never expose the gateway session URL");
  assert.ok(!adminPayments.includes("rawValidation"), "never expose raw provider payloads");
  assert.ok(adminPayments.includes("reconcileNote"));
});

test("admin UI: payment timeline is wired to the row", () => {
  assert.ok(hook.includes("openPaymentDetails"));
  assert.ok(hook.includes("reconcilePayments"));
  assert.ok(hook.includes("/api/admin/orders/${order.id}/payments"));
  assert.ok(modals.includes("Payment timeline"));
  assert.ok(modals.includes("Reconcile now"));
  assert.ok(row.includes("openPaymentDetails(order)"));
  assert.ok(row.includes("View payment validation & history"));
});
