import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { evaluateSslcommerzResult } from "../src/server/payments/sslcommerz-result.ts";

/**
 * P0 hardening contract for SSLCOMMERZ + order creation.
 *
 * These tests lock the security decisions:
 *  - a redirect alone can never mark an order paid;
 *  - the validator amount/currency/tran_id must match the order;
 *  - order creation is idempotent and never fakes success after a DB failure;
 *  - admin order APIs authorize in the handler, not only at the proxy.
 */

const read = (file) => fs.readFileSync(file, "utf8");

const callback = read("src/app/api/payment/sslcommerz/callback/route.ts");
const ipn = read("src/app/api/payment/sslcommerz/ipn/route.ts");
const verify = read("src/server/payments/services/verify-payment.ts");
const ordersRoute = read("src/app/api/orders/route.ts");
const adminOrders = read("src/app/api/admin/orders/route.ts");
const adminOrder = read("src/app/api/admin/orders/[id]/route.ts");
const adminAuth = read("src/server/admin-auth.ts");
const orderModel = read("src/models/Order.ts");
const paymentModel = read("src/models/Payment.ts");
const checkoutHook = read("src/app/checkout/_hooks/use-checkout-flow.ts");
const envExample = read(".env.example");
const settleModule = read("src/server/payments/services/finalize-payment.ts");
const verifyTracking = read("src/app/api/orders/verify-tracking/route.ts");
const tracker = read("src/components/analytics/thankyou-order-tracker.tsx");

const valid = {
  isValid: true,
  status: "VALID",
  amount: 31000,
  currency: "BDT",
  tranId: "ANG-261112-0001",
  valId: "VAL-1",
};
const expected = { orderNumber: "ANG-261112-0001", amount: 31000, currency: "BDT" };

test("payment result: a valid matching transaction is accepted", () => {
  assert.deepEqual(evaluateSslcommerzResult(valid, expected), { ok: true });
});

test("payment result: invalid transactions are rejected", () => {
  assert.equal(evaluateSslcommerzResult({ ...valid, isValid: false }, expected).ok, false);
  assert.equal(
    evaluateSslcommerzResult({ ...valid, status: "FAILED" }, expected).reason,
    "status"
  );
});

test("payment result: tran_id must belong to the order", () => {
  assert.equal(
    evaluateSslcommerzResult({ ...valid, tranId: "ANG-OTHER" }, expected).reason,
    "tran-id-mismatch"
  );
  assert.equal(evaluateSslcommerzResult({ ...valid, tranId: "" }, expected).reason, "tran-id-mismatch");
});

test("payment result: the amount must match exactly (one-cent tolerance)", () => {
  assert.equal(
    evaluateSslcommerzResult({ ...valid, amount: 30999 }, expected).reason,
    "amount-mismatch"
  );
  assert.equal(
    evaluateSslcommerzResult({ ...valid, amount: 31001 }, expected).reason,
    "amount-mismatch"
  );
  assert.equal(evaluateSslcommerzResult({ ...valid, amount: 31000.005 }, expected).ok, true);
});

test("payment result: currency must match BDT", () => {
  assert.equal(
    evaluateSslcommerzResult({ ...valid, currency: "USD" }, expected).reason,
    "currency-mismatch"
  );
});

test("callback: never marks paid from the redirect status alone", () => {
  assert.ok(callback.includes("ProcessSuccessService"), "must delegate to the verified service");
  assert.ok(callback.includes("valId"), "must forward val_id for server-side validation");
  assert.ok(
    !callback.includes('order.paymentStatus = "paid"'),
    "callback must not assign paid directly"
  );
});

test("ipn: requires validation, not a status string", () => {
  assert.ok(ipn.includes("ProcessIpnService"));
  assert.ok(ipn.includes("sslcommerz:ipn:tran"));
  assert.ok(
    !ipn.includes('order.paymentStatus = "paid"'),
    "ipn must not assign paid directly"
  );
});

test("verify: compares validity, status, tran_id, amount and currency", () => {
  for (const token of ["isValid", "status", "tranId", "amount", "currency"]) {
    assert.ok(verify.includes(token), `verify must check ${token}`);
  }
});

test("orders: idempotent creation and no fake success on DB failure", () => {
  assert.ok(ordersRoute.includes("readIdempotencyKey"), "idempotency key must be read");
  assert.ok(ordersRoute.includes("respondWithExistingOrder"), "duplicates must replay");
  assert.ok(ordersRoute.includes("nextOrderNumber"), "atomic order numbers must be used");
  assert.ok(ordersRoute.includes("PAYMENT_NOT_CONFIGURED"));
  assert.ok(ordersRoute.includes("ORDER_PERSIST_FAILED"));
  assert.ok(ordersRoute.includes('status: 503'), "DB failure must be a retryable 503");
  assert.ok(
    !ordersRoute.includes("returning confirmed order number"),
    "the fake-success catch must be gone"
  );
  assert.ok(
    !/catch \(dbErr\)[\s\S]{0,1500}status:\s*"success"/.test(ordersRoute),
    "the DB catch must never return a success payload"
  );
});

test("orders: no gateway session means no success screen", () => {
  assert.ok(checkoutHook.includes('"Idempotency-Key"'));
  assert.ok(checkoutHook.includes("isOnlineActive && !result.gatewayUrl"));
});

test("admin orders: authorize inside the route handlers", () => {
  assert.ok(adminOrders.includes("requireAdminSessionCore"));
  assert.ok(adminOrder.includes("requireAdminSessionCore"));
  assert.ok(adminAuth.includes("export async function requireAdminSessionCore"));
  assert.ok(
    adminAuth.includes("export async function requireAdminSession("),
    "the Meta-gated wrapper must remain for Meta routes"
  );
});

test("schema: replay + payment/shipment fields and indexes exist", () => {
  assert.ok(orderModel.includes("idempotencyKey"));
  assert.ok(orderModel.includes("OrderSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true })"));
  assert.ok(orderModel.includes("capiPurchaseSentAt"));
  assert.ok(orderModel.includes("shipmentStatus"));
  assert.ok(paymentModel.includes("tranId: { type: String, required: true, unique: true }"));
  assert.ok(paymentModel.includes("{ valId: 1 }, { unique: true, sparse: true }"));
});

test("env: payment and courier credentials are documented server-only", () => {
  assert.ok(envExample.includes("SSLCOMMERZ_STORE_ID"));
  assert.ok(envExample.includes("SSLCOMMERZ_STORE_PASSWORD"));
  assert.ok(envExample.includes("SSLCOMMERZ_IS_LIVE=false"));
  assert.ok(envExample.includes("STEADFAST_API_KEY"));
  assert.ok(!envExample.includes("NEXT_PUBLIC_SSLCOMMERZ"));
  assert.ok(!envExample.includes("NEXT_PUBLIC_STEADFAST"));
});

test("migration: the production index migration exists", () => {
  assert.ok(
    fs.existsSync("scripts/migrations/2026-11-12-payments-shipments-indexes.mjs"),
    "autoIndex is disabled in production; a migration must create the indexes"
  );
});

test("sandbox payments do not emit production Meta events", () => {
  const capiModule = read("src/server/payments/capi.ts");
  assert.ok(capiModule.includes("if (!isSslcommerzLive()) return;"));
  assert.ok(capiModule.includes("capiPurchaseSentAt"));
  assert.ok(verifyTracking.includes("sandbox: !isSslcommerzLive()"));
  assert.ok(tracker.includes("if (data.sandbox)"));
});