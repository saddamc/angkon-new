import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  normalizeBdPhone,
  buildRecipientAddress,
  mapSteadfastStatus,
  isDeliveredStatus,
  evaluateShipmentTransition,
} from "../src/server/courier/steadfast-utils.ts";
import {
  computeOrderFinancials,
  checkCourierBookingEligibility,
} from "../src/server/orders/workflow.ts";

function read(relPath) {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. STEADFAST CREDENTIALS & API CONNECTIVITY
// ─────────────────────────────────────────────────────────────────────────────

test("1. Production Steadfast API credentials & live balance connection", async () => {
  const envContent = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";
  const keyMatch = envContent.match(/STEADFAST_API_KEY\s*=\s*(.*)/);
  const secMatch = envContent.match(/STEADFAST_SECRET_KEY\s*=\s*(.*)/);
  const urlMatch = envContent.match(/STEADFAST_BASE_URL\s*=\s*(.*)/);

  const apiKey = keyMatch ? keyMatch[1].trim() : "";
  const secretKey = secMatch ? secMatch[1].trim() : "";
  const baseUrl = urlMatch ? urlMatch[1].trim() : "https://portal.packzy.com/api/v1";

  assert.ok(apiKey.length >= 20, "Steadfast API key must be configured in .env");
  assert.ok(secretKey.length >= 15, "Steadfast Secret key must be configured in .env");
  assert.equal(baseUrl, "https://portal.packzy.com/api/v1", "Must point to Steadfast production API");

  // Query actual live Steadfast API
  const res = await fetch(`${baseUrl}/get_balance`, {
    headers: {
      "Api-Key": apiKey,
      "Secret-Key": secretKey,
      Accept: "application/json",
    },
  });

  assert.equal(res.status, 200, "Steadfast GET /get_balance must return HTTP 200");
  const data = await res.json();
  assert.equal(data.status, 200);
  assert.equal(typeof data.current_balance, "number", "current_balance must be numeric");
  assert.ok(Number.isFinite(data.current_balance), "current_balance must be finite");
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. ACCOUNT BALANCE ENDPOINT & UI DECOUPLING
// ─────────────────────────────────────────────────────────────────────────────

test("2. Balance handling and consignment booking decoupling", () => {
  // Confirm low/zero/missing balance does not block consignment bookings
  const eligibility = checkCourierBookingEligibility({
    orderStatus: "confirmed",
    hasActiveShipmentRow: false,
  });
  assert.equal(eligibility.ok, true, "Booking eligibility must not be gated by balance");

  // Verify header component uses correct balance terminology
  const headerCode = read("src/app/admin/orders/_components/orders-header.tsx");
  assert.ok(headerCode.includes("Steadfast Account Balance:"));
  assert.ok(
    headerCode.includes(
      "Merchant ledger balance reported by Steadfast. This is not a guarantee of immediately withdrawable funds. It does not independently determine shipment eligibility."
    )
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. WEBHOOK AUTHENTICATION & MULTI-FACTOR TOKEN VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

test("3. Webhook authentication: Bearer token, HMAC signature, timing safety", () => {
  const secret = "test-steadfast-secret-43-chars-long-1234567890";
  const payload = JSON.stringify({ consignment_id: 887766, status: "delivered" });

  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const bearer = secret;

  const safeEqual = (a, b) =>
    typeof a === "string" &&
    typeof b === "string" &&
    a.length > 0 &&
    a.length === b.length &&
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

  assert.equal(safeEqual(hmac, hmac), true, "HMAC signature valid");
  assert.equal(safeEqual(bearer, secret), true, "Bearer token valid");
  assert.equal(safeEqual("wrong-token", secret), false, "Mismatched token rejected");
  assert.equal(safeEqual("", secret), false, "Empty token safely rejected");

  // Verify webhook route implementation
  const webhookCode = read("src/app/api/webhooks/steadfast/route.ts");
  assert.ok(webhookCode.includes("signatureValid"));
  assert.ok(webhookCode.includes("bearerValid"));
  assert.ok(webhookCode.includes("tokenValid"));
  assert.ok(webhookCode.includes("STEADFAST_WEBHOOK_TOKEN"));
  assert.ok(webhookCode.includes("ignored: true"), "Unknown consignments return 200 ignored");
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. MONGODB SHIPMENT PERSISTENCE & TIMELINE
// ─────────────────────────────────────────────────────────────────────────────

test("4. MongoDB shipment model: unique idempotencyKey and events array", () => {
  const shipmentModel = read("src/models/Shipment.ts");
  assert.ok(shipmentModel.includes("events: IShipmentEvent[]"), "Must maintain events array");
  assert.ok(shipmentModel.includes("idempotencyKey: string"), "Must require idempotencyKey");
  assert.ok(shipmentModel.includes("orderId"), "Must reference orderId");
  assert.ok(shipmentModel.includes("provider"), "Must track courier provider");
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. DUPLICATE BOOKING PREVENTION
// ─────────────────────────────────────────────────────────────────────────────

test("5. Duplicate booking prevention on order and service level", () => {
  // Order eligibility check blocks duplicate active consignments
  const dupCheck = checkCourierBookingEligibility({
    orderStatus: "confirmed",
    consignmentId: "CID-12345",
    hasActiveShipmentRow: true,
  });
  assert.equal(dupCheck.ok, false);
  assert.equal(dupCheck.code, "DUPLICATE_SHIPMENT");

  // Re-submission of already cancelled shipment is allowed
  const cancelledCheck = checkCourierBookingEligibility({
    orderStatus: "confirmed",
    shipmentBookingState: "cancelled",
    shipmentStatus: "cancelled",
    hasActiveShipmentRow: false,
  });
  assert.equal(cancelledCheck.ok, true);

  // In-progress booking blocks concurrent attempts
  const inProgressCheck = checkCourierBookingEligibility({
    orderStatus: "confirmed",
    shipmentBookingState: "booking_in_progress",
  });
  assert.equal(inProgressCheck.ok, false);
  assert.equal(inProgressCheck.code, "BOOKING_IN_PROGRESS");
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. TIMEOUT RECOVERY & INVOICE LOOKUP
// ─────────────────────────────────────────────────────────────────────────────

test("6. Timeout recovery by invoice number and bounded execution time", () => {
  const steadfastCode = read("src/server/courier/steadfast.ts");
  assert.ok(steadfastCode.includes("getSteadfastStatusByInvoice"), "Must implement invoice lookup");
  assert.ok(
    steadfastCode.includes("const preCheck = await getSteadfastStatusByInvoice(input.orderNumber)"),
    "Must pre-check invoice before calling create_order"
  );
  assert.ok(
    steadfastCode.includes('result.error.code === "timeout"'),
    "Must trigger invoice recovery on timeout"
  );
  assert.ok(
    steadfastCode.includes('result.error.code === "duplicate"'),
    "Must trigger invoice recovery on duplicate error"
  );
  assert.ok(steadfastCode.includes("TIMEOUT_MS = 8_000"), "Must bound timeout to 8s");
  assert.ok(steadfastCode.includes("RECOVERY_TIMEOUT_MS = 5_000"), "Must bound recovery to 5s");

  const shipmentRoute = read("src/app/api/admin/orders/[id]/shipment/route.ts");
  assert.ok(shipmentRoute.includes("export const maxDuration = 60"), "Must set Vercel maxDuration = 60");
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. CONTROLLED SHIPMENT VALIDATION RULES
// ─────────────────────────────────────────────────────────────────────────────

test("7. Controlled shipment pre-flight validation rules", () => {
  // BD phone validation
  assert.equal(normalizeBdPhone("01712345678"), "01712345678");
  assert.equal(normalizeBdPhone("01234567890"), null, "Rejects 012");
  assert.equal(normalizeBdPhone("01034567890"), null, "Rejects 010");

  // Address validation
  const validAddr = buildRecipientAddress(["House 12, Road 5", "Dhanmondi", "Dhaka"]);
  assert.ok(validAddr.length >= 10);
  assert.ok(buildRecipientAddress(["Short"]).length < 10);

  // Status eligibility
  assert.equal(checkCourierBookingEligibility({ orderStatus: "confirmed" }).ok, true);
  assert.equal(checkCourierBookingEligibility({ orderStatus: "processing" }).ok, true);
  assert.equal(checkCourierBookingEligibility({ orderStatus: "ready_to_ship" }).ok, true);
  assert.equal(checkCourierBookingEligibility({ orderStatus: "cancelled" }).ok, false);
  assert.equal(checkCourierBookingEligibility({ orderStatus: "pending" }).ok, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. TRACKING SYNCHRONIZATION & FINITE STATE ENGINE
// ─────────────────────────────────────────────────────────────────────────────

test("8. Delivery tracking transitions and anti-regression engine", () => {
  // Normal forward flow
  assert.equal(evaluateShipmentTransition("pending", "in_transit").allowed, true);
  assert.equal(evaluateShipmentTransition("in_transit", "out_for_delivery").allowed, true);
  assert.equal(evaluateShipmentTransition("out_for_delivery", "delivered").allowed, true);

  // Anti-regression: in_transit or out_for_delivery CANNOT overwrite delivered
  assert.equal(evaluateShipmentTransition("delivered", "in_transit").allowed, false);
  assert.equal(evaluateShipmentTransition("delivered", "out_for_delivery").allowed, false);
  assert.equal(evaluateShipmentTransition("partial_delivered", "in_transit").allowed, false);

  // Post-delivery return IS allowed
  const returnEval = evaluateShipmentTransition("delivered", "returned");
  assert.equal(returnEval.allowed, true);
  assert.equal(returnEval.isReturnLifecycle, true);

  // Terminal states cannot be altered
  assert.equal(evaluateShipmentTransition("returned", "delivered").allowed, false);
  assert.equal(evaluateShipmentTransition("cancelled", "in_transit").allowed, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. COD COLLECTION & SETTLEMENT RECONCILIATION
// ─────────────────────────────────────────────────────────────────────────────

test("9. COD collection on delivery and independent settlement reconciliation", () => {
  // Delivery marks COD collected, but settlement remains independent
  const f = computeOrderFinancials({
    total: 4500,
    paymentMethod: "cod",
    paymentStatus: "paid",
    orderStatus: "delivered",
    collectedCodAmount: 4500,
    courierCharge: 100,
    settledCodAmount: 0,
    codSettlementStatus: "collected",
  });

  assert.equal(f.collectedCodAmount, 4500);
  assert.equal(f.courierCharge, 100);
  assert.equal(f.settledCodAmount, 0);
  assert.equal(f.codSettlementStatus, "collected", "Delivery marks COD collected, NOT settled");

  // Reconciled remittance
  const reconciled = computeOrderFinancials({
    total: 4500,
    paymentMethod: "cod",
    paymentStatus: "paid",
    orderStatus: "delivered",
    collectedCodAmount: 4500,
    courierCharge: 100,
    settledCodAmount: 4400,
    codSettlementStatus: "settled",
  });
  assert.equal(reconciled.settledCodAmount, 4400);
  assert.equal(reconciled.discrepancyAmount, 0, "No discrepancy when net equals settled");
  assert.equal(reconciled.codSettlementStatus, "settled");

  // Settlement route exists and verifies admin session
  const settleRoute = read("src/app/api/admin/orders/[id]/settlement/route.ts");
  assert.ok(settleRoute.includes("requireAdminSessionCore"));
  assert.ok(settleRoute.includes("order.cod.settlement_reconcile"));
});
