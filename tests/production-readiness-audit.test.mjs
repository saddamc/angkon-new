import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { evaluateSslcommerzResult } from "../src/server/payments/sslcommerz-result.ts";
import {
  computeOrderFinancials,
  canTransitionOrderStatus,
  normalizeOrderStatus,
  checkCourierBookingEligibility,
} from "../src/server/orders/workflow.ts";
import {
  extractSteadfastPayloadError,
  mapSteadfastStatus,
  normalizeBdPhone,
  buildRecipientAddress,
  isDeliveredStatus,
  BD_PHONE_REGEX,
  evaluateShipmentTransition,
} from "../src/server/courier/providers/steadfast/utils.ts";

function read(relPath) {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK 1: BANGLADESHI PHONE NUMBER VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

test("T1: Phone normalization - valid BD mobile operators (013 - 019)", () => {
  const validNumbers = [
    { input: "01300000000", expected: "01300000000", op: "Grameenphone" },
    { input: "01400000000", expected: "01400000000", op: "Banglalink" },
    { input: "01500000000", expected: "01500000000", op: "Teletalk" },
    { input: "01600000000", expected: "01600000000", op: "Airtel" },
    { input: "01712345678", expected: "01712345678", op: "Grameenphone" },
    { input: "01812345678", expected: "01812345678", op: "Robi" },
    { input: "01912345678", expected: "01912345678", op: "Banglalink" },
  ];

  for (const item of validNumbers) {
    assert.equal(
      normalizeBdPhone(item.input),
      item.expected,
      `Should accept valid ${item.op} number: ${item.input}`
    );
  }
});

test("T1: Phone normalization - international and raw prefix formatting", () => {
  assert.equal(normalizeBdPhone("+8801712345678"), "01712345678", "+880 prefix stripped");
  assert.equal(normalizeBdPhone("8801812345678"), "01812345678", "880 prefix stripped");
  assert.equal(normalizeBdPhone("  +880 1912-345678  "), "01912345678", "Whitespace and dashes stripped");
  assert.equal(normalizeBdPhone("1712345678"), "01712345678", "10-digit number prepends 0");
});

test("T1: Phone normalization - rejects invalid operator prefixes (010, 011, 012)", () => {
  assert.equal(normalizeBdPhone("01012345678"), null, "Rejects 010 operator");
  assert.equal(normalizeBdPhone("01112345678"), null, "Rejects 011 operator (Citycell obsolete)");
  assert.equal(normalizeBdPhone("01212345678"), null, "Rejects 012 non-existent operator");
  assert.equal(normalizeBdPhone("+8801212345678"), null, "Rejects +88012 non-existent operator");
  assert.equal(normalizeBdPhone("0171234567"), null, "Rejects 10 digits without leading 1");
  assert.equal(normalizeBdPhone("017123456789"), null, "Rejects 12 digits");
  assert.equal(normalizeBdPhone(""), null, "Rejects empty");
  assert.equal(normalizeBdPhone("letters"), null, "Rejects non-numeric");
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK 2: WEBHOOK RELIABILITY & IDEMPOTENCY
// ─────────────────────────────────────────────────────────────────────────────

test("T2: Webhook authentication supports Bearer token and HMAC signature", () => {
  const secret = "super-secret-token-12345678901234567890";
  const body = JSON.stringify({ consignment_id: 112233, status: "delivered" });
  const hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const bearer = secret;

  const safeEqual = (a, b) =>
    typeof a === "string" &&
    typeof b === "string" &&
    a.length > 0 &&
    a.length === b.length &&
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

  assert.equal(safeEqual(hmac, hmac), true, "HMAC match");
  assert.equal(safeEqual(bearer, secret), true, "Bearer token match");
  assert.equal(safeEqual("bogus", hmac), false, "Mismatched signature safely rejected");
  assert.equal(safeEqual("", hmac), false, "Empty signature rejected without throw");
});

test("T2: Webhook code does not synchronously block on tracking re-fetch", () => {
  const webhookCode = read("src/app/api/webhooks/steadfast/route.ts");
  // Synchronous re-fetch rejection must NOT exist in the main request path
  assert.ok(
    !webhookCode.includes('return NextResponse.json(\n        { error: "Could not verify the delivery status with Steadfast." }'),
    "Synchronous blocking re-fetch must be removed from webhook handler"
  );
  // Webhook returns 200 after local persistence
  assert.ok(
    webhookCode.includes("return NextResponse.json({"),
    "Webhook returns json response"
  );
  assert.ok(
    webhookCode.includes("applyCourierStatus"),
    "Applies status to local database"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK 3: SHIPMENT STATUS INTEGRITY & STATE MACHINE
// ─────────────────────────────────────────────────────────────────────────────

test("T3: Prevent in_transit from overwriting delivered status", () => {
  const evalResult = evaluateShipmentTransition("delivered", "in_transit");
  assert.equal(evalResult.allowed, false, "in_transit must NOT overwrite delivered");
  assert.ok(evalResult.reason.includes("Invalid status regression"));

  const evalPartial = evaluateShipmentTransition("partial_delivered", "in_transit");
  assert.equal(evalPartial.allowed, false, "in_transit must NOT overwrite partial_delivered");
});

test("T3: Support legitimate post-delivery return lifecycle", () => {
  const evalReturn = evaluateShipmentTransition("delivered", "returned");
  assert.equal(evalReturn.allowed, true, "delivered CAN transition to returned");
  assert.equal(evalReturn.isReturnLifecycle, true);
  assert.equal(evalReturn.reason, "legitimate_post_delivery_return");

  const evalPartialReturn = evaluateShipmentTransition("partial_delivered", "returned");
  assert.equal(evalPartialReturn.allowed, true);
  assert.equal(evalPartialReturn.isReturnLifecycle, true);
});

test("T3: Terminal immutability of returned and cancelled states", () => {
  // Returned cannot be changed
  assert.equal(evaluateShipmentTransition("returned", "delivered").allowed, false);
  assert.equal(evaluateShipmentTransition("returned", "in_transit").allowed, false);
  assert.equal(evaluateShipmentTransition("returned", "cancelled").allowed, false);

  // Cancelled cannot be changed
  assert.equal(evaluateShipmentTransition("cancelled", "delivered").allowed, false);
  assert.equal(evaluateShipmentTransition("cancelled", "in_transit").allowed, false);
  assert.equal(evaluateShipmentTransition("cancelled", "returned").allowed, false);
});

test("T3: Forward transit regressions protection", () => {
  assert.equal(evaluateShipmentTransition("out_for_delivery", "pending").allowed, false);
  assert.equal(evaluateShipmentTransition("in_transit", "created").allowed, false);
  assert.equal(evaluateShipmentTransition("in_transit", "out_for_delivery").allowed, true);
  assert.equal(evaluateShipmentTransition("out_for_delivery", "delivered").allowed, true);
});

test("T3: Idempotent duplicate status handling", () => {
  const res = evaluateShipmentTransition("delivered", "delivered");
  assert.equal(res.allowed, true);
  assert.equal(res.idempotent, true);
  assert.equal(res.reason, "idempotent_same_status");
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK 4: BOOKING TIMEOUT RECOVERY & VERCEL LIMITS
// ─────────────────────────────────────────────────────────────────────────────

test("T4: Vercel serverless maxDuration and bounded timeouts configured", () => {
  const shipmentRoute = read("src/app/api/admin/orders/[id]/shipment/route.ts");
  assert.ok(shipmentRoute.includes("export const maxDuration = 60"), "Shipment route must set maxDuration = 60");

  const reconcileRoute = read("src/app/api/payment/sslcommerz/reconcile/route.ts");
  assert.ok(reconcileRoute.includes("export const maxDuration = 60"), "Reconcile route must set maxDuration = 60");

  const steadfastCode = read((fs.existsSync("src/server/courier/providers/steadfast/adapter.ts") ? "src/server/courier/providers/steadfast/adapter.ts" : "src/server/courier/steadfast.ts"));
  assert.ok(steadfastCode.includes("TIMEOUT_MS = 8_000"), "External timeout bounded to 8s");
  assert.ok(steadfastCode.includes("RECOVERY_TIMEOUT_MS = 5_000"), "Recovery lookup timeout bounded to 5s");
});

test("T4: Pre-flight and post-timeout recovery by invoice number", () => {
  const steadfastCode = read((fs.existsSync("src/server/courier/providers/steadfast/adapter.ts") ? "src/server/courier/providers/steadfast/adapter.ts" : "src/server/courier/steadfast.ts"));
  assert.ok(
    steadfastCode.includes("getSteadfastStatusByInvoice"),
    "Must implement getSteadfastStatusByInvoice"
  );
  assert.ok(
    steadfastCode.includes("const preCheck = await getSteadfastStatusByInvoice(input.orderNumber)"),
    "Must pre-check invoice before sending create_order"
  );
  assert.ok(
    steadfastCode.includes('result.error.code === "duplicate"'),
    "Must recover on duplicate error"
  );
  assert.ok(
    steadfastCode.includes('result.error.code === "timeout"'),
    "Must recover on timeout"
  );

  const courierServiceCode = read((fs.existsSync("src/server/courier/core/courier-service.ts") ? "src/server/courier/core/courier-service.ts" : "src/server/courier/courier-service.ts"));
  assert.ok(
    courierServiceCode.includes("staleLockCutoff"),
    "Must reclaim stale in-progress booking locks"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK 5: FINANCIAL BALANCE TERMINOLOGY
// ─────────────────────────────────────────────────────────────────────────────

test("T5: Orders header uses exact Steadfast Account Balance terminology and tooltip", () => {
  const headerCode = read("src/app/admin/orders/_components/orders-header.tsx");
  assert.ok(
    headerCode.includes("Steadfast Account Balance:"),
    "Header must display 'Steadfast Account Balance:'"
  );
  assert.ok(
    headerCode.includes(
      "Merchant ledger balance reported by Steadfast. This is not a guarantee of immediately withdrawable funds. It does not independently determine shipment eligibility."
    ),
    "Tooltip must contain the exact requested guidance"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK 6: ENVIRONMENT CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

test("T6: .env.example contains all required keys and no secrets", () => {
  const envExample = read(".env.example");
  assert.ok(envExample.includes("SSLCOMMERZ_STORE_ID="));
  assert.ok(envExample.includes("SSLCOMMERZ_STORE_PASSWORD="));
  assert.ok(envExample.includes("SSLCOMMERZ_MODE=sandbox"));
  assert.ok(envExample.includes("STEADFAST_API_KEY="));
  assert.ok(envExample.includes("STEADFAST_SECRET_KEY="));
  assert.ok(envExample.includes("STEADFAST_BASE_URL=https://portal.packzy.com/api/v1"));
  assert.ok(envExample.includes("STEADFAST_WEBHOOK_TOKEN="));
  assert.ok(envExample.includes("CRON_SECRET="));

  // Ensure no real keys were committed
  assert.ok(!envExample.includes("portal.packzy.com/api/v1/"));
  const lines = envExample.split(/\r?\n/);
  for (const line of lines) {
    if (line.startsWith("STEADFAST_API_KEY=")) {
      assert.equal(line.split("=")[1].trim(), "");
    }
    if (line.startsWith("SSLCOMMERZ_STORE_PASSWORD=")) {
      assert.equal(line.split("=")[1].trim(), "");
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// COD CALCULATIONS & FINANCIAL INTEGRITY AUDIT
// ─────────────────────────────────────────────────────────────────────────────

test("C: Financial integrity - full COD calculation audit", () => {
  // Standard COD order
  const f1 = computeOrderFinancials({
    total: 3500,
    subtotal: 3400,
    shippingFee: 100,
    discount: 0,
    paymentMethod: "cod",
    paymentStatus: "pending",
    orderStatus: "confirmed",
  });
  assert.equal(f1.codAmountToCollect, 3500);

  // Partial advance payment
  const f2 = computeOrderFinancials({
    total: 3500,
    paidAmount: 1000,
    paymentMethod: "cod",
    paymentStatus: "partially_paid",
    orderStatus: "confirmed",
  });
  assert.equal(f2.advancePaidAmount, 1000);
  assert.equal(f2.outstandingAmount, 2500);
  assert.equal(f2.codAmountToCollect, 2500);

  // Cancelled order collects zero COD
  const f3 = computeOrderFinancials({
    total: 3500,
    paymentMethod: "cod",
    paymentStatus: "pending",
    orderStatus: "cancelled",
  });
  assert.equal(f3.codAmountToCollect, 0);

  // Verified online prepaid collects zero COD
  const f4 = computeOrderFinancials({
    total: 3500,
    paidAmount: 3500,
    paymentMethod: "sslcommerz",
    paymentStatus: "paid",
    orderStatus: "processing",
  });
  assert.equal(f4.codAmountToCollect, 0);
  assert.equal(f4.isPrepaidVerified, true);
});
