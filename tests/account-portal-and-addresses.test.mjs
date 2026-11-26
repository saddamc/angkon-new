/**
 * Account portal UX, profile/address CRUD validation, order timeline presentation,
 * CSRF protection, and link continuity tests.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  ensureSingleDefaultAddress,
  normalizeAccountPhone,
  validateAccountAddressInput,
  validateAccountProfileInput,
} from "../src/lib/account-validation.ts";
import {
  buildCustomerOrderPresentation,
  ORDER_TIMELINE_STEPS,
} from "../src/lib/account-order-view.ts";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

// ── 1. Runtime Validation Tests (Profile & Addresses) ────────────────────────

test("phone normalizer accepts and normalizes Bangladesh prefixes and rejects invalid phones", () => {
  assert.deepEqual(normalizeAccountPhone("+8801712-345678"), { ok: true, value: "01712345678" });
  assert.deepEqual(normalizeAccountPhone("8801812345678"), { ok: true, value: "01812345678" });
  assert.deepEqual(normalizeAccountPhone("", { required: false }), { ok: true, value: "" });
  assert.equal(normalizeAccountPhone("", { required: true }).ok, false);
  assert.equal(normalizeAccountPhone("123", { required: true }).ok, false);
  assert.equal(normalizeAccountPhone("not-a-phone", { required: true }).ok, false);
});

test("profile validator enforces name length and normalizes phone", () => {
  const valid = validateAccountProfileInput({ name: "  Ayesha   Rahman ", phone: "+8801711000111" });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.name, "Ayesha Rahman");
    assert.equal(valid.phone, "01711000111");
  }

  const shortName = validateAccountProfileInput({ name: "A" });
  assert.equal(shortName.ok, false);
  if (!shortName.ok) assert.equal(shortName.code, "INVALID_NAME");

  const badPhone = validateAccountProfileInput({ name: "Ayesha", phone: "abc" });
  assert.equal(badPhone.ok, false);
  if (!badPhone.ok) assert.equal(badPhone.code, "INVALID_PHONE");
});

test("address validator cleans fields and ensureSingleDefaultAddress maintains exactly one default", () => {
  const parsed = validateAccountAddressInput({
    fullName: "Nusrat Jahan",
    phone: "8801911223344",
    address: "House 12, Road 4, Banani",
    city: "Banani",
    district: "Dhaka",
    postalCode: "1213",
    isDefault: true,
  });
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.address.phone, "01911223344");
    assert.equal(parsed.address.isDefault, true);
  }

  const invalid = validateAccountAddressInput({
    fullName: "Nusrat",
    phone: "01911223344",
    address: "123",
    city: "Banani",
    district: "Dhaka",
  });
  assert.equal(invalid.ok, false);

  const list = [
    { fullName: "A", isDefault: true },
    { fullName: "B", isDefault: true },
    { fullName: "C", isDefault: false },
  ];
  ensureSingleDefaultAddress(list, 1);
  assert.deepEqual(
    list.map((a) => Boolean(a.isDefault)),
    [false, true, false]
  );

  // Removing default promotes index 0 when no preferred index is given
  list[1].isDefault = false;
  ensureSingleDefaultAddress(list);
  assert.deepEqual(
    list.map((a) => Boolean(a.isDefault)),
    [true, false, false]
  );
});

// ── 2. Runtime Order List Presentation Tests ─────────────────────────────────

test("order presenter produces 4 clear stages and plain-English summaries", () => {
  assert.equal(ORDER_TIMELINE_STEPS.length, 4);

  const awaitingOnline = buildCustomerOrderPresentation({
    orderStatus: "pending",
    paymentStatus: "pending",
    total: 8880,
    isOnlinePayment: true,
  });
  assert.equal(awaitingOnline.statusPill.label, "Awaiting Payment");
  assert.equal(awaitingOnline.canPayNow, true);
  assert.equal(awaitingOnline.stageIndex, -1);

  const codConfirmed = buildCustomerOrderPresentation({
    orderStatus: "confirmed",
    paymentStatus: "unpaid",
    total: 3500,
    isOnlinePayment: false,
  });
  assert.equal(codConfirmed.statusPill.label, "Confirmed");
  assert.equal(codConfirmed.paymentCaption, "Cash on Delivery • ৳3,500 due");
  assert.equal(codConfirmed.stageIndex, 0);
  assert.equal(codConfirmed.canPayNow, false);

  const packedBooked = buildCustomerOrderPresentation({
    orderStatus: "ready_to_ship",
    paymentStatus: "paid",
    paidAmount: 8880,
    total: 8880,
    shipmentStatus: "booked",
    trackingCode: "SFR123",
    isOnlinePayment: true,
  });
  assert.equal(packedBooked.statusPill.label, "Ready for Courier");
  assert.equal(packedBooked.paymentCaption, "Paid Online");
  assert.equal(packedBooked.stageIndex, 1);

  const inTransit = buildCustomerOrderPresentation({
    orderStatus: "shipped",
    paymentStatus: "paid",
    total: 8880,
    shipmentStatus: "out_for_delivery",
    isOnlinePayment: true,
  });
  assert.equal(inTransit.statusPill.label, "Out for Delivery");
  assert.equal(inTransit.stageIndex, 2);

  const delivered = buildCustomerOrderPresentation({
    orderStatus: "delivered",
    paymentStatus: "paid",
    total: 8880,
    isOnlinePayment: true,
  });
  assert.equal(delivered.statusPill.label, "Delivered");
  assert.equal(delivered.stageIndex, 3);

  const cancelledRefunded = buildCustomerOrderPresentation({
    orderStatus: "cancelled",
    paymentStatus: "refunded",
    total: 8880,
    paidAmount: 8880,
    refundSummary: { totalRefunded: 8880, pendingRefundAmount: 0 },
    isOnlinePayment: true,
  });
  assert.equal(cancelledRefunded.statusPill.label, "Cancelled");
  assert.equal(cancelledRefunded.stageIndex, -1);
  assert.match(cancelledRefunded.summaryLine, /৳8,880/);
});

// ── 3. Security, Enrichment & Route Continuity Contracts ─────────────────────

test("CSRF middleware protects mutating /api/account/* routes", () => {
  const csrf = read("src/server/security/csrf.ts");
  assert.ok(
    csrf.includes("/^\\/api\\/account\\//"),
    "CSRF_PROTECTED_PATTERNS must cover /api/account/ endpoints"
  );
});

test("profile and address APIs share the pure validators and enforce customer auth", () => {
  const profileRoute = read("src/app/api/account/profile/route.ts");
  const addressesRoute = read("src/app/api/account/addresses/route.ts");

  assert.match(profileRoute, /withCustomerRoute/);
  assert.match(profileRoute, /requireAuth:\s*true/);
  assert.match(profileRoute, /validateAccountProfileInput/);

  assert.match(addressesRoute, /withCustomerRoute/);
  assert.match(addressesRoute, /requireAuth:\s*true/);
  assert.match(addressesRoute, /validateAccountAddressInput/);
  assert.match(addressesRoute, /ensureSingleDefaultAddress/);
  assert.match(addressesRoute, /ADDRESS_LIMIT_REACHED/);
});

test("getAccountOrders enriches order status labels and customer-safe refund summaries", () => {
  const accountServer = read("src/server/auth/account.ts");
  assert.match(accountServer, /PaymentRefund/);
  assert.match(accountServer, /ORDER_STATUS_LABELS/);
  assert.match(accountServer, /PAYMENT_STATUS_LABELS/);
  assert.match(accountServer, /SHIPMENT_STATUS_LABELS/);
  assert.match(accountServer, /refundSummary/);
  assert.match(accountServer, /orderStatusLabel/);
});

test("post-payment and retry screens do not link to dead 404 routes", () => {
  const paymentSuccess = read("src/components/checkout/payment-success.tsx");
  const paymentRetryPage = read("src/app/account/orders/[orderId]/payment/page.tsx");
  const orderRedirectPage = read("src/app/account/orders/[orderId]/page.tsx");

  assert.ok(!paymentSuccess.includes("/track-order"), "broken /track-order link must be gone");
  assert.ok(!paymentSuccess.includes('href="/shop"'), "broken /shop link must be gone");
  assert.ok(paymentSuccess.includes("/track?orderNumber="), "Track Order points to /track");
  assert.ok(paymentSuccess.includes('href="/products"'), "Continue Shopping points to /products");
  assert.ok(paymentRetryPage.includes("/my-account?tab=orders&order="), "Back to Order opens /my-account deep link");
  assert.match(orderRedirectPage, /redirect\(`\/my-account\?tab=orders&order=/);
});

test("portal uses royal maroon #530911 canvas, Suspense, and simplified order cards", () => {
  const page = read("src/app/my-account/page.tsx");
  const authPortal = read("src/components/account/account-auth-portal.tsx");
  const orderCard = read("src/components/account/account-order-card.tsx");
  const addressesPanel = read("src/components/account/account-addresses-panel.tsx");
  const heroHeader = read("src/components/account/account-hero-header.tsx");

  assert.match(page, /<Suspense/);
  assert.match(page, /useSearchParams/);
  assert.match(page, /bg-\[#530911\]/);
  assert.match(authPortal, /bg-\[#530911\]/);
  assert.match(heroHeader, /\/api\/account\/profile/);
  assert.match(addressesPanel, /\/api\/account\/addresses/);
  assert.match(addressesPanel, /bangladesh-districts/);
  assert.match(orderCard, /buildCustomerOrderPresentation/);
  assert.match(orderCard, /ORDER_TIMELINE_STEPS/);
  assert.match(orderCard, /useCartStore\.getState\(\)/);
  assert.match(orderCard, /\.addItem\(/);
});
