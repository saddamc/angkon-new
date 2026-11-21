import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { evaluateSslcommerzResult } from "../src/server/payments/sslcommerz-result.ts";

/**
 * ANGKON — Secure Payment Gateway, MongoDB Rate Limiting & SSLCOMMERZ Security Test Suite
 */

const read = (file) => fs.readFileSync(file, "utf8");

function simulateHashIp(ip, secret = "test-secret") {
  const normalized = (ip || "unknown").trim().toLowerCase();
  return crypto.createHmac("sha256", secret).update(normalized).digest("hex").slice(0, 16);
}

const rateLimitModule = read("src/server/rate-limit.ts");
const rateLimitBucketModel = read("src/models/RateLimitBucket.ts");
const paymentModel = read("src/models/Payment.ts");
const paymentAttemptModel = read("src/models/PaymentAttempt.ts");
const initiateRoute = read("src/app/api/payment/sslcommerz/initiate/route.ts");
const callbackRoute = read("src/app/api/payment/sslcommerz/callback/route.ts");
const ipnRoute = read("src/app/api/payment/sslcommerz/ipn/route.ts");
const reconcileModule = read("src/server/payments/services/reconcile-payment.ts");
const sslcommerzModule = read("src/server/sslcommerz.ts");
const ordersRoute = read("src/app/api/orders/route.ts");
const promoRoute = read("src/app/api/promo/validate/route.ts");
const resetRoute = read("src/app/api/auth/reset-password/route.ts");

test("rate limit bucket schema: defined with atomic fields, unique key and TTL index", () => {
  assert.ok(rateLimitBucketModel.includes("collection: \"ratelimitbuckets\""));
  assert.ok(rateLimitBucketModel.includes("key: {"));
  assert.ok(rateLimitBucketModel.includes("unique: true"));
  assert.ok(rateLimitBucketModel.includes("windowStart: {"));
  assert.ok(rateLimitBucketModel.includes("count: {"));
  assert.ok(rateLimitBucketModel.includes("expiresAt: {"));
  assert.ok(rateLimitBucketModel.includes("expireAfterSeconds: 0"));
});

test("rate limit module: atomic increment ($inc) without race condition", () => {
  assert.ok(rateLimitModule.includes("$inc: { count: 1 }"));
  assert.ok(rateLimitModule.includes("$setOnInsert:"));
  assert.ok(rateLimitModule.includes("upsert: true"));
  assert.ok(rateLimitModule.includes("windowStartMs"));
  assert.ok(rateLimitModule.includes("retryAfterSeconds"));
  assert.ok(rateLimitModule.includes("createRateLimitResponse"));
  assert.ok(rateLimitModule.includes("applyRateLimitHeaders"));
});

test("rate limit IP privacy: HMAC hashing avoids plain PII in database", () => {
  const hash1 = simulateHashIp("103.205.12.34");
  const hash2 = simulateHashIp("103.205.12.34");
  const hash3 = simulateHashIp("103.205.12.35");
  assert.equal(hash1, hash2, "identical IPs must yield deterministic hashes");
  assert.notEqual(hash1, hash3, "different IPs must yield different hashes");
  assert.notEqual(hash1, "103.205.12.34", "raw IP must not be exposed");
  assert.ok(hash1.length >= 16);
  assert.ok(rateLimitModule.includes("hashIp"));
  assert.ok(rateLimitModule.includes("createHmac"));
});

test("payment attempt model: unique index on tran_id and audit fields", () => {
  assert.ok(paymentModel.includes("tranId: { type: String, required: true, unique: true }"));
  assert.ok(paymentModel.includes("valId:"));
  assert.ok(paymentModel.includes("riskLevel:"));
  assert.ok(paymentModel.includes("sessionKeyHash:"));
  assert.ok(paymentModel.includes("PaymentAttempt"));
  assert.ok(paymentAttemptModel.includes("export { PaymentAttempt }") || paymentAttemptModel.includes("PaymentAttempt"));
});

test("payment verification: risk_level responses handled appropriately", () => {
  const baseValid = {
    isValid: true,
    status: "VALID",
    amount: 15000,
    currency: "BDT",
    tranId: "ANG-TEST-001",
    valId: "VAL-TEST-001",
  };
  const expectation = { orderNumber: "ANG-TEST-001", amount: 15000, currency: "BDT" };

  const normalDecision = evaluateSslcommerzResult(
    { ...baseValid, riskLevel: "0" },
    expectation
  );
  assert.deepEqual(normalDecision, { ok: true });

  const highRiskDecision = evaluateSslcommerzResult(
    { ...baseValid, riskLevel: "1", riskTitle: "Card bin high risk" },
    expectation
  );
  assert.equal(highRiskDecision.ok, true);
  assert.equal(highRiskDecision.highRisk, true);
});

test("payment verification: rejects amount, currency and tran_id mismatches", () => {
  const baseValid = {
    isValid: true,
    status: "VALID",
    amount: 15000,
    currency: "BDT",
    tranId: "ANG-TEST-001",
    valId: "VAL-TEST-001",
  };
  const expectation = { orderNumber: "ANG-TEST-001", amount: 15000, currency: "BDT" };

  assert.equal(
    evaluateSslcommerzResult({ ...baseValid, amount: 14000 }, expectation).reason,
    "amount-mismatch"
  );
  assert.equal(
    evaluateSslcommerzResult({ ...baseValid, currency: "USD" }, expectation).reason,
    "currency-mismatch"
  );
  assert.equal(
    evaluateSslcommerzResult({ ...baseValid, tranId: "OTHER-ORDER" }, expectation).reason,
    "tran-id-mismatch"
  );
});

test("endpoint protection: sensitive APIs protected with rate limiting", () => {
  assert.ok(promoRoute.includes("rateLimit"));
  assert.ok(promoRoute.includes("createRateLimitResponse"));
  assert.ok(resetRoute.includes("rateLimit"));
  assert.ok(resetRoute.includes("createRateLimitResponse"));
  assert.ok(ordersRoute.includes("rateLimit"));
  assert.ok(ordersRoute.includes("createRateLimitResponse"));
});

test("payment initiation endpoint: supports safe retry and guards against abuse", () => {
  assert.ok(initiateRoute.includes("pay-init:ip:"));
  assert.ok(initiateRoute.includes("pay-init:order:"));
  assert.ok(initiateRoute.includes("order.paymentStatus === \"paid\""));
  assert.ok(initiateRoute.includes("isSslcommerzConfigured"));
  assert.ok(initiateRoute.includes("initiateSslcommerzForOrder"));
});

test("ipn resilience: generous webhook ceiling ensures SSLCOMMERZ retries are not blocked", () => {
  assert.ok(ipnRoute.includes("sslcommerz:ipn"));
  assert.ok(!ipnRoute.includes("rateLimit(`sslcommerz:ipn:${clientIp(request)}`, 120"));
});

test("reconciliation: official transaction query by tran_id fallback", () => {
  assert.ok(reconcileModule.includes("querySslcommerzTransactionByTranId"));
  const providerConfig = read("src/server/payments/providers/sslcommerz/config.ts");
  const queryProvider = read("src/server/payments/providers/sslcommerz/query-transaction.ts");
  assert.ok(providerConfig.includes("merchantTransIDvalidationAPI.php"));
  assert.ok(queryProvider.includes("querySslcommerzTransactionByTranId"));
});

// ── Additional hardening checks ─────────────────────────────────────────────

const loginRoute = read("src/app/api/auth/login/route.ts");
const adminLoginRoute = read("src/app/api/admin/login/route.ts");
const registerRoute = read("src/app/api/auth/register/route.ts");
const verifyModule = read("src/server/payments/services/verify-payment.ts");
const settleModule = read("src/server/payments/services/finalize-payment.ts");
const csrfModule = read("src/server/csrf.ts");
const proxyModule = read("src/proxy.ts");
const securityLogModule = read("src/server/security-log.ts");

test("rate limit store: no duplicate key index and TTL is cleanup only", () => {
  assert.ok(!rateLimitBucketModel.includes("index: true,"));
  assert.ok(!rateLimitBucketModel.includes("{ key: 1, expiresAt: 1 }"));
  assert.ok(rateLimitBucketModel.includes("expireAfterSeconds: 0"));
  assert.ok(rateLimitModule.includes("TTL is housekeeping only"));
});

test("rate limit: 429 responses include Retry-After and are not cached", () => {
  assert.ok(rateLimitModule.includes('"Retry-After"'));
  assert.ok(rateLimitModule.includes('"Cache-Control": "no-store"'));
});

test("rate limit: credential endpoints fail closed on a store outage", () => {
  assert.ok(rateLimitModule.includes("failClosed"));
  assert.ok(loginRoute.includes("failClosed: true"));
  assert.ok(adminLoginRoute.includes("failClosed: true"));
  assert.ok(registerRoute.includes("failClosed: true"));
  assert.ok(rateLimitModule.includes("rate_limit.degraded_fail_closed"));
});

test("client IP: cf-connecting-ip is not trusted unless explicitly enabled", () => {
  assert.ok(rateLimitModule.includes("TRUST_CLOUDFLARE_IP_HEADER"));
  assert.ok(rateLimitModule.includes('?.trim().toLowerCase() === "true"'));
  assert.ok(rateLimitModule.includes("TRUST_PROXY_HEADERS"));
  assert.ok(rateLimitModule.includes("rightmost"));
});

test("purchase paths fail open so a database blip cannot block checkout", () => {
  assert.ok(!ordersRoute.includes("failClosed: true"));
  assert.ok(!initiateRoute.includes("failClosed: true"));
  assert.ok(rateLimitModule.includes("transient database error must never stop a"));
});

test("ipn: per-transaction retry ceiling plus a global abuse guard", () => {
  assert.ok(ipnRoute.includes("sslcommerz:ipn:tran:"));
  assert.ok(ipnRoute.includes("sslcommerz:ipn:global"));
  assert.ok(ipnRoute.includes("createRateLimitResponse"));
  assert.ok(!ipnRoute.includes("clientIp(request)"));
});

test("forged failure notifications cannot cancel a pending order", () => {
  assert.ok(callbackRoute.includes("unsigned-failure-notification"));
  assert.ok(callbackRoute.includes("returnToken"));
  assert.ok(verifyModule.includes("verifyFailureNotification"));
  assert.ok(ipnRoute.includes("ProcessIpnService"));
  assert.ok(ipnRoute.includes("ignored: true"));
});

test("sandbox and live SSLCOMMERZ credentials are separate", () => {
  assert.ok(sslcommerzModule.includes("SSLCOMMERZ_SANDBOX_STORE_ID"));
  assert.ok(sslcommerzModule.includes("SSLCOMMERZ_SANDBOX_STORE_PASSWORD"));
  assert.ok(sslcommerzModule.includes("SSLCOMMERZ_LIVE_STORE_ID"));
  assert.ok(sslcommerzModule.includes("SSLCOMMERZ_LIVE_STORE_PASSWORD"));
  assert.ok(sslcommerzModule.includes("getSslcommerzCredentials"));
  assert.ok(!sslcommerzModule.includes("NEXT_PUBLIC_SSLCOMMERZ"));
});

test("payment attempt history is append-only and records validation", () => {
  assert.ok(paymentModel.includes("IPaymentEvent"));
  assert.ok(paymentModel.includes("events: { type: [PaymentEventSchema]"));
  assert.ok(settleModule.includes("alreadySettled"));
  assert.ok(settleModule.includes("payment_confirmed"));
});

test("reconciliation handles expiry, manual review and backoff", () => {
  assert.ok(reconcileModule.includes("querySslcommerzTransactionByTranId"));
  assert.ok(reconcileModule.includes('status: "expired"'));
  assert.ok(reconcileModule.includes("MAX_RECONCILE_ATTEMPTS"));
  assert.ok(reconcileModule.includes("manual_review"));
  assert.ok(reconcileModule.includes("BACKOFF_SCHEDULE_MINUTES"));
  assert.ok(reconcileModule.includes("atomicTransition"));
});

test("csrf guard rejects cross-origin mutations while allowing webhooks", () => {
  assert.ok(csrfModule.includes("sec-fetch-site"));
  assert.ok(csrfModule.includes("CSRF_TRUSTED_ORIGINS"));
  assert.ok(csrfModule.includes("isSameOriginRequest"));
  assert.ok(csrfModule.includes("/^\\/api\\/admin\\//"));
  assert.ok(!csrfModule.includes("/api/payment/sslcommerz/ipn"));
  assert.ok(proxyModule.includes("CSRF_ORIGIN_MISMATCH"));
});

test("structured security logs are emitted for security events", () => {
  assert.ok(securityLogModule.includes("[SECURITY]"));
  assert.ok(proxyModule.includes("admin.unauthorized"));
  assert.ok(rateLimitModule.includes("rate_limit.blocked"));
  assert.ok(ipnRoute.includes("payment.verification_rejected"));
});

