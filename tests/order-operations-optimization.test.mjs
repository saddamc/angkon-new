import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  canTransitionOrderStatus,
  checkCourierBookingEligibility,
  computeOrderFinancials,
  getAllowedNextStatuses,
  normalizeOrderStatus,
} from "../src/server/orders/workflow.ts";
import { normalizeBdPhone, buildRecipientAddress } from "../src/server/courier/providers/steadfast/utils.ts";

const read = (file) => fs.readFileSync(file, "utf8");

// ── 1. STEADFAST ACCOUNT BALANCE TESTS ───────────────────────────────────────
test("Steadfast Balance: GET /get_balance response semantics & decoupling from booking", () => {
  // Balance response parsing
  const overviewRouteSource = read("src/app/api/admin/couriers/overview/route.ts");
  assert.match(
    overviewRouteSource,
    /steadfastBalancePayload/,
    "Courier overview must return structured balance payload with lastSyncedAt and error fields"
  );
  assert.match(
    overviewRouteSource,
    /lastSyncedAt:/,
    "Overview route must include lastSyncedAt timestamp when Steadfast balance sync succeeds"
  );
  assert.match(
    overviewRouteSource,
    /error:/,
    "Overview route must expose connection/upstream errors cleanly without crashing"
  );

  // UI displays "Steadfast Account Balance" and refresh action
  const headerSource = read("src/app/admin/orders/_components/orders-header.tsx");
  assert.match(
    headerSource,
    /Steadfast Account Balance:/,
    "Header must display renamed label 'Steadfast Account Balance'"
  );
  assert.match(
    headerSource,
    /formatSyncTime/,
    "Header must display formatted last synchronization time"
  );
  assert.match(
    headerSource,
    /loadCourierOverview/,
    "Header must provide a refresh action to re-fetch balance on demand"
  );

  // Balance unavailability MUST NOT block consignment booking
  const eligibility = checkCourierBookingEligibility({
    orderStatus: "confirmed",
    shipmentStatus: "none",
    shipmentBookingState: "not_booked",
    hasActiveShipmentRow: false,
  });
  assert.equal(
    eligibility.ok,
    true,
    "Steadfast balance availability does not block confirmed order from courier booking"
  );
});

// ── 2. PAYMENT CLARITY & COD FALLBACK TESTS ──────────────────────────────────
test("Payment Clarity: order channel, payment method and status separation", () => {
  const rowSource = read("src/app/admin/orders/_components/order-row.tsx");
  assert.doesNotMatch(
    rowSource,
    />\s*Online\s*<\/span>/,
    "Row must not display ambiguous bare 'Online' pill under order number"
  );
  assert.match(
    rowSource,
    /Website Order|Admin Order/,
    "Row must clearly differentiate Website vs Admin order channel"
  );
  assert.match(
    rowSource,
    /getPaymentMethodBadge/,
    "Row must badge the gateway channel distinctly from COD via the shared payment-method helper"
  );
  assert.match(
    rowSource,
    /isOnlinePaymentMethod/,
    "Row must treat every SSLCOMMERZ channel (sslcommerz/cards/bkash/nagad) as an online order — not just the generic one"
  );

  const kpiBarSource = read("src/app/admin/orders/_components/orders-kpi-bar.tsx");
  assert.match(
    kpiBarSource,
    /Payment Issues/,
    "Orders KPI bar must include Payment Issues card tracking unresolved online payment attempts"
  );
});

test("COD Fallback: API endpoint strictly validates customer agreement, reason, and updates financials", () => {
  const codFallbackRoute = read(
    "src/app/api/admin/orders/[id]/payment/cod-fallback/route.ts"
  );

  // Preconditions
  assert.match(
    codFallbackRoute,
    /customerAgreed/,
    "COD fallback requires explicit customer agreement flag"
  );
  assert.match(
    codFallbackRoute,
    /reason\.length < 5/,
    "COD fallback requires admin reason of at least 5 characters"
  );
  assert.match(
    codFallbackRoute,
    /cancelled|refunded|failed/,
    "COD fallback rejects cancelled or refunded orders"
  );
  assert.match(
    codFallbackRoute,
    /order\.paymentStatus === "paid"/,
    "COD fallback rejects already paid orders"
  );

  // Financial recomputation
  assert.match(
    codFallbackRoute,
    /expectedCodAmount = outstandingCod/,
    "COD fallback recalculates expected COD strictly from outstanding balance"
  );
  assert.match(
    codFallbackRoute,
    /AdminAuditLog\.create/,
    "COD fallback creates immutable admin audit log entry"
  );
});

test("Financial calculation: COD fallback recalculates collectible balance from total minus paid", () => {
  const onlineOrder = {
    total: 3500,
    paidAmount: 500, // advance partial
    paymentMethod: "sslcommerz",
    paymentStatus: "partially_paid",
    orderStatus: "confirmed",
  };

  const fin = computeOrderFinancials(onlineOrder);
  assert.equal(fin.orderTotal, 3500);
  assert.equal(fin.advancePaidAmount, 500);
  assert.equal(fin.outstandingAmount, 3000);
  assert.equal(fin.codAmountToCollect, 3000);
});

// ── 3. NEEDS ACTION CENTER TESTS ─────────────────────────────────────────────
test("Needs Action: categorizes prioritized action queue across all 7 operational states", async () => {
  const helperSource = read("src/app/admin/orders/_components/needs-action-helper.ts");

  assert.match(helperSource, /booking_failed/, "Covers shipment booking failures");
  assert.match(helperSource, /payment_verification/, "Covers unresolved online payments");
  assert.match(helperSource, /awaiting_confirmation/, "Covers pending confirmation orders");
  assert.match(helperSource, /ready_to_ship/, "Covers orders ready for dispatch");
  assert.match(helperSource, /delivery_exception/, "Covers courier delivery exceptions");
  assert.match(helperSource, /refund_pending/, "Covers pending refunds");
  assert.match(helperSource, /settlement_pending/, "Covers delivered COD awaiting settlement");

  const pillsSource = read("src/app/admin/orders/_components/status-filter-pills.tsx");
  assert.match(
    pillsSource,
    /key:\s*"needs_action"/,
    "Status filter pills must include Needs Action tab"
  );
});

// ── 4. ORDER STATUS WORKFLOW & NON-ADVANCING BOOKING TESTS ────────────────────
test("Workflow: Booking consignment transitions order to ready_to_ship, NEVER straight to shipped", () => {
  const courierServiceSource = read((fs.existsSync("src/server/courier/core/courier-service.ts") ? "src/server/courier/core/courier-service.ts" : "src/server/courier/courier-service.ts"));

  // Booking result sets ready_to_ship
  assert.match(
    courierServiceSource,
    /ready_to_ship/,
    "Booking Steadfast shipment sets order status to ready_to_ship"
  );
  assert.doesNotMatch(
    courierServiceSource,
    /nextOrderStatus\s*=\s*.*"shipped"/,
    "Booking must not jump directly to shipped before physical courier pickup"
  );

  // Allowed transitions validation
  assert.equal(canTransitionOrderStatus("pending", "confirmed"), true);
  assert.equal(canTransitionOrderStatus("confirmed", "processing"), true);
  assert.equal(canTransitionOrderStatus("processing", "ready_to_ship"), true);
  assert.equal(canTransitionOrderStatus("ready_to_ship", "shipped"), true);
  assert.equal(canTransitionOrderStatus("shipped", "delivered"), true);

  // Backward or prohibited jumps
  assert.equal(canTransitionOrderStatus("delivered", "pending"), false);
  assert.equal(canTransitionOrderStatus("cancelled", "shipped"), false);
  assert.equal(canTransitionOrderStatus("cancelled", "ready_to_ship"), false);
});

test("Workflow: Physical courier pickup (in_transit) moves order to shipped via sync", () => {
  const syncSource = read((fs.existsSync("src/server/courier/core/sync.ts") ? "src/server/courier/core/sync.ts" : "src/server/courier/sync.ts"));
  assert.match(
    syncSource,
    /in_transit|out_for_delivery/,
    "Sync detects physical transit pickup events"
  );
  assert.match(
    syncSource,
    /orderUpdate\.orderStatus = "shipped"/,
    "Pickup event transitions orderStatus to shipped"
  );
  assert.match(
    syncSource,
    /orderUpdate\.orderStatus = "delivered"/,
    "Delivery event transitions orderStatus to delivered"
  );
});

// ── 5. BULK COURIER BOOKING PREVIEW TESTS ───────────────────────────────────
test("Bulk Booking: Pre-flight audit partitions orders into 6 distinct validation buckets", () => {
  const bulkModalSource = read("src/app/admin/orders/_components/bulk-shipment-modal.tsx");

  assert.match(bulkModalSource, /total/, "Displays total selected orders");
  assert.match(bulkModalSource, /eligible/, "Identifies eligible orders");
  assert.match(bulkModalSource, /unpaid_online/, "Identifies and blocks unpaid online orders");
  assert.match(bulkModalSource, /already_booked/, "Identifies and skips already booked orders");
  assert.match(bulkModalSource, /invalid_phone/, "Validates 11-digit BD mobile phone numbers");
  assert.match(bulkModalSource, /invalid_address/, "Validates address length requirement");
  assert.match(bulkModalSource, /cancelled/, "Permanently blocks cancelled orders");

  // Phone normalization
  assert.equal(normalizeBdPhone("01712345678"), "01712345678");
  assert.equal(normalizeBdPhone("+8801712345678"), "01712345678");
  assert.equal(normalizeBdPhone("8801712345678"), "01712345678");
  assert.equal(normalizeBdPhone("12345"), null);

  // Address construction
  const validAddr = buildRecipientAddress(["Flat 4B, Road 12", "Dhanmondi", "Dhaka"]);
  assert.ok(validAddr.length >= 10, "Valid address must meet minimum length");

  const invalidAddr = buildRecipientAddress(["Short", ""]);
  assert.ok(invalidAddr.length < 10, "Short address fails length requirement");
});

// ── 6. COURIER SETTLEMENT RECONCILIATION ────────────────────────────────────
test("Settlement: Delivery marks COD collected, but settlement remains independent", () => {
  const orderAfterDelivery = {
    total: 2500,
    paidAmount: 2500,
    expectedCodAmount: 2500,
    collectedCodAmount: 2500,
    settledCodAmount: 0,
    codSettlementStatus: "collected",
    orderStatus: "delivered",
    paymentStatus: "paid",
  };

  const fin = computeOrderFinancials(orderAfterDelivery);
  assert.equal(fin.codSettlementStatus, "collected");
  assert.equal(fin.settledCodAmount, 0);

  // Only after courier payout settlement
  const orderAfterPayout = {
    ...orderAfterDelivery,
    settledCodAmount: 2380, // after 120 Tk delivery charge
    courierCharge: 120,
    codSettlementStatus: "settled",
  };

  const finSettled = computeOrderFinancials(orderAfterPayout);
  assert.equal(finSettled.codSettlementStatus, "settled");
  assert.equal(finSettled.courierCharge, 120);
});
