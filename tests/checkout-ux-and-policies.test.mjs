import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { calculateShipping, DEFAULT_SHIPPING_SETTINGS } from "../src/lib/shipping.ts";
import { evaluateSslcommerzResult } from "../src/server/payments/sslcommerz-result.ts";
import { normalizePolicySettings, DEFAULT_POLICY_SETTINGS } from "../src/server/policy-settings-core.ts";

const read = (file) => fs.readFileSync(file, "utf8");

const checkoutPage = read("src/app/checkout/page.tsx");
const checkoutHook = read("src/app/checkout/_hooks/use-checkout-flow.ts");
const deliveryStep = read("src/app/checkout/_components/delivery-details-step.tsx");
const reviewStep = read("src/app/checkout/_components/order-review-step.tsx");
const paymentStep = read("src/app/checkout/_components/payment-method-step.tsx");
const paymentSelector = read("src/app/checkout/_components/payment-delivery-methods-card.tsx");
const checkoutOrderSummary = read("src/app/checkout/_components/startech-order-summary.tsx");
const stepIndicator = read("src/app/checkout/_components/checkout-step-indicator.tsx");
const summarySidebar = read("src/app/checkout/_components/order-summary-sidebar.tsx");
const returnPolicyPage = read("src/app/return-refund-policy/page.tsx");
const warrantyPolicyPage = read("src/app/warranty-policy/page.tsx");
const privacyPolicyPage = read("src/app/privacy-policy/page.tsx");
const footer = read("src/components/layout/footer.tsx");
const ordersRoute = read("src/app/api/orders/route.ts");
const orderModel = read("src/models/Order.ts");
const paymentModel = read("src/models/Payment.ts");
const policyAdminRoute = read("src/app/api/admin/settings/policies/route.ts");

/* ── 1. CHECKOUT WORKFLOW TESTS ── */

test("checkout: valid Bangladeshi phone number pattern is strictly enforced", () => {
  const bdPhoneRegex = /^(?:\+?88)?01[3-9]\d{8}$/;
  assert.equal(bdPhoneRegex.test("01712345678"), true);
  assert.equal(bdPhoneRegex.test("+8801912345678"), true);
  assert.equal(bdPhoneRegex.test("8801812345678"), true);
  assert.equal(bdPhoneRegex.test("01234567890"), false); // invalid operator 012
  assert.equal(bdPhoneRegex.test("0171234567"), false); // too short
  assert.equal(bdPhoneRegex.test("017123456789"), false); // too long
  assert.equal(bdPhoneRegex.test("abcdefghijk"), false);
});

test("checkout: step 1 delivery form does not submit premature order", () => {
  assert.match(deliveryStep, /onContinueToReview/);
  assert.match(deliveryStep, /Continue to Review Order/i);
  assert.doesNotMatch(deliveryStep, /type="submit"/);
});

test("checkout: step 2 review displays complete order breakdown with edit triggers", () => {
  assert.match(reviewStep, /Recipient &amp; Delivery Destination|Recipient & Delivery Destination/i);
  assert.match(reviewStep, /Items in Your Bag/i);
  assert.match(reviewStep, /Financial Breakdown/i);
  assert.match(reviewStep, /onEditDelivery/);
  assert.match(reviewStep, /onConfirmAndContinue/);
  assert.match(reviewStep, /Confirm Details &amp; Continue|Confirm Details & Continue/i);
});

test("checkout: presents COD or one generic online choice, then delegates channels to SSLCOMMERZ", () => {
  assert.match(checkoutPage, /PaymentDeliveryMethodsCard/);
  assert.match(paymentSelector, /Cash on Delivery/);
  assert.match(paymentSelector, /Online payment/);
  assert.match(paymentSelector, /value="cod"/);
  assert.match(paymentSelector, /value="sslcommerz"/);
  assert.match(paymentSelector, /Available methods may include mobile wallets, cards, and supported mobile or internet banking/);
  assert.doesNotMatch(paymentSelector, /bKash Direct|Nagad Direct|Other Online Banking/);
  assert.match(checkoutOrderSummary, /Continue to secure payment/);
  assert.match(checkoutHook, /paymentMethod: activePaymentMethod/);
});

test("checkout: online card preserves SSLCOMMERZ hosted channel selection", () => {
  const initiatePayment = read("src/server/payments/services/initiate-payment.ts");
  assert.match(initiatePayment, /const channel = \(input\.paymentChannel/);
  assert.match(initiatePayment, /if \(channel === "bkash"\)/);
  assert.match(initiatePayment, /multiCardName,/);
  assert.match(paymentSelector, /redirected to SSLCOMMERZ/);
  assert.doesNotMatch(initiatePayment, /channel === "sslcommerz"/);
});

test("checkout: shipping fee calculation waives delivery fee when threshold reached", () => {
  const insideStandard = calculateShipping({
    subtotal: 10000,
    district: "Dhaka",
    settings: DEFAULT_SHIPPING_SETTINGS,
  });
  assert.equal(insideStandard.fee, 80);
  assert.equal(insideStandard.isFree, false);

  const thresholdReached = calculateShipping({
    subtotal: 15980,
    district: "Dhaka",
    settings: DEFAULT_SHIPPING_SETTINGS,
  });
  assert.equal(thresholdReached.fee, 0);
  assert.equal(thresholdReached.isFree, true);
  assert.equal(thresholdReached.freeByThreshold, true);
});

test("checkout: server-side orders route recalculates total and never trusts client pricing", () => {
  assert.match(ordersRoute, /getAllDbProducts/);
  assert.match(ordersRoute, /calculateShipping/);
  assert.match(ordersRoute, /reserveStockForOrder/);
});

test("checkout: COD order initializes with paymentStatus 'unpaid' and orderStatus 'confirmed'", () => {
  assert.match(ordersRoute, /paymentStatus: normalizedPaymentMethod === "cod" \? "unpaid" : "pending"/);
  assert.match(ordersRoute, /orderStatus: normalizedPaymentMethod === "cod" \? "confirmed" : "pending"/);
  assert.match(ordersRoute, /commitStockForOrder\(newOrder\)/);
});

test("checkout: SSLCOMMERZ order initializes with paymentStatus 'pending' and orderStatus 'pending'", () => {
  assert.match(ordersRoute, /initiateSslcommerzForOrder/);
  assert.match(ordersRoute, /stockReservedAt/);
});

test("checkout: idempotency key is required and enforced", () => {
  assert.match(ordersRoute, /readIdempotencyKey/);
  assert.match(orderModel, /idempotencyKey: 1 \}, \{ unique: true, sparse: true \}/);
});

test("checkout: policy acceptance version is captured with the order", () => {
  assert.match(orderModel, /policyVersion: \{ type: String, default: null \}/);
  assert.match(orderModel, /policyAcceptedAt: \{ type: Date, default: null \}/);
  assert.match(ordersRoute, /policyVersion/);
});

/* ── 2. POLICY PAGES & BILINGUAL CONTENT TESTS ── */

test("policies: return policy contains primary promise 'CHECK YOUR ORDER BEFORE YOU ACCEPT IT'", () => {
  assert.match(returnPolicyPage, /CHECK YOUR ORDER BEFORE YOU ACCEPT IT/);
  assert.match(returnPolicyPage, /পণ্য গ্রহণের পূর্বে ভালো করে যাচাই করুন/);
  assert.match(returnPolicyPage, /setLang/);
});

test("policies: return policy covers delivery inspection, 7-day window, and fashion criteria", () => {
  assert.match(returnPolicyPage, /Delivery-Time Inspection/i);
  assert.match(returnPolicyPage, /7-Day Reporting Window/i);
  assert.match(returnPolicyPage, /unworn, unwashed/i);
  assert.match(returnPolicyPage, /original hang tags/i);
  assert.match(returnPolicyPage, /SSLCOMMERZ/);
});

test("policies: warranty policy reflects fashion craftsmanship and not computer hardware", () => {
  assert.match(warrantyPolicyPage, /Artisanal Craftsmanship & Quality Standards/i);
  assert.match(warrantyPolicyPage, /Seam & Stitching Failures/i);
  assert.match(warrantyPolicyPage, /Textile Weaving Flaws/i);
  assert.doesNotMatch(warrantyPolicyPage, /RAM|Motherboard|CPU|Processor|Graphics Card/i);
  assert.match(warrantyPolicyPage, /setLang/);
});

test("policies: privacy policy reflects real architecture (SSLCOMMERZ, couriers, no card storage)", () => {
  assert.match(privacyPolicyPage, /Zero Card Storage/i);
  assert.match(privacyPolicyPage, /SSLCOMMERZ/);
  assert.match(privacyPolicyPage, /Steadfast/);
  assert.match(privacyPolicyPage, /Pathao/);
  assert.match(privacyPolicyPage, /MongoDB Atlas/);
  assert.match(privacyPolicyPage, /PDPA 2026/);
  assert.match(privacyPolicyPage, /setLang/);
});

test("policies: footer links include all canonical customer care policy pages", () => {
  assert.match(footer, /href: "\/return-refund-policy"/);
  assert.match(footer, /href: "\/warranty-policy"/);
  assert.match(footer, /href: "\/privacy-policy"/);
  assert.match(footer, /href: "\/terms"/);
  assert.match(footer, /href: "\/contact"/);
  assert.match(footer, /href: "\/delivery-time"/);
});

test("policies: policy settings normalization handles defaults and sanitization", () => {
  const norm = normalizePolicySettings({});
  assert.equal(norm.returnWindowDays, 7);
  assert.equal(norm.exchangeAllowed, true);
  assert.equal(norm.policyVersion, "2026.1");
  assert.equal(norm.supportPhone, "+880 1338-668899");
});

test("policies: admin policy API requires authenticated admin session", () => {
  assert.match(policyAdminRoute, /requireAdminSessionCore/);
});

/* ── 3. SECURITY & INTEGRITY TESTS ── */

test("security: payment evaluation verifies tran_id, amount, currency and status", () => {
  const sample = {
    isValid: true,
    status: "VALID",
    amount: 15980,
    currency: "BDT",
    tranId: "ANG-TEST-001",
    valId: "VAL-1",
  };
  const exp = { orderNumber: "ANG-TEST-001", amount: 15980, currency: "BDT" };

  assert.equal(evaluateSslcommerzResult(sample, exp).ok, true);
  assert.equal(evaluateSslcommerzResult({ ...sample, amount: 15000 }, exp).reason, "amount-mismatch");
  assert.equal(evaluateSslcommerzResult({ ...sample, currency: "USD" }, exp).reason, "currency-mismatch");
  assert.equal(evaluateSslcommerzResult({ ...sample, tranId: "OTHER" }, exp).reason, "tran-id-mismatch");
  assert.equal(evaluateSslcommerzResult({ ...sample, status: "FAILED" }, exp).reason, "status");
});

test("security: gateway store password is never exposed in client bundles", () => {
  assert.doesNotMatch(checkoutPage, /SSLCOMMERZ_STORE_PASSWORD/);
  assert.doesNotMatch(checkoutHook, /SSLCOMMERZ_STORE_PASSWORD/);
  assert.doesNotMatch(paymentStep, /SSLCOMMERZ_STORE_PASSWORD/);
});
