/**
 * Payment-channel integrity contract.
 *
 * Regression: checkout's "cards" channel (Visa/Mastercard/Amex via
 * SSLCOMMERZ) was recognized by the online-method check but rejected by the
 * Order schema enum — every card order failed at Order.create with
 * "paymentMethod: `cards` is not a valid enum value" (503 to the customer).
 * All channel decisions must now derive from src/lib/payment-methods.ts.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");
const orderModel = read("src/models/Order.ts");
const ordersRoute = read("src/app/api/orders/route.ts");
const initiate = read("src/server/payments/initiate.ts");
const adminOrderRoute = read("src/app/api/admin/orders/[id]/route.ts");
const adminOrdersList = read("src/app/api/admin/orders/route.ts");
const orderRow = read("src/app/admin/orders/_components/order-row.tsx");
const myAccount = [
  read("src/components/account/account-invoice-modal.tsx"),
  read("src/components/account/account-order-card.tsx"),
].join("\n");
const trackPage = read("src/app/track/page.tsx");
const emailTemplates = read("src/lib/email/templates.ts");
const sharedHelper = read("src/lib/payment-methods.ts");

test("Order schema accepts the storefront card channel", () => {
  assert.ok(
    orderModel.includes('enum: ["cod", "sslcommerz", "bkash", "nagad", "online", "cards"]'),
    "the paymentMethod enum must include cards — the checkout sends it for card payments"
  );
});

test("checkout order creation decides via the shared helper, not an inline list", () => {
  assert.ok(
    ordersRoute.includes("isOnlinePaymentMethod(paymentMethod)"),
    "orders route must use isOnlinePaymentMethod"
  );
  assert.ok(
    ordersRoute.includes("COD_PAYMENT_METHOD"),
    "COD is the explicit fallback channel"
  );
  assert.ok(
    !ordersRoute.includes('rawMethod === "sslcommerz"'),
    "no ad-hoc inline channel list may remain"
  );
});

test("gateway initiation recognizes every online channel", () => {
  assert.ok(
    initiate.includes("isOnlinePaymentMethod(method)"),
    "initiate.ts must route via the shared helper so card sessions reach the card gateway page"
  );
});

test("admin payment-safety gate covers every gateway channel", () => {
  assert.ok(
    adminOrderRoute.includes("isOnlinePaymentMethod(beforeOrder.paymentMethod)"),
    "ONLINE_PAYMENT_VALIDATION_REQUIRED must protect card/bKash/Nagad orders too — not only generic sslcommerz"
  );
});

test("admin needs-attention filter includes every gateway channel", () => {
  assert.ok(
    adminOrdersList.includes("paymentMethod: { $in: [...ONLINE_PAYMENT_METHODS] }"),
    "unpaid card/bKash/Nagad orders must surface in needs_action, not just sslcommerz ones"
  );
});

test("shared helper is the single source of truth", () => {
  assert.ok(sharedHelper.includes('["sslcommerz", "bkash", "nagad", "cards", "online"]'));
  assert.ok(
    sharedHelper.includes("Card Payment (SSLCOMMERZ)") && sharedHelper.includes('return "CARD"'),
    "helper maps the cards channel to a proper label and badge"
  );
});

test("customer-facing surfaces label channels through the helper", () => {
  assert.ok(
    myAccount.includes("getPaymentMethodLabel(order.paymentMethod)"),
    "the printable invoice must label card payments correctly (raw .toUpperCase() printed 'CARDS')"
  );
  assert.ok(
    myAccount.includes("isOnlinePaymentMethod(order.paymentMethod)"),
    "the order-history pill must mark card/bKash/Nagad orders as online payments"
  );
  assert.ok(
    trackPage.includes("getPaymentMethodLabel(data.paymentMethod)"),
    "the tracking page must not call card orders 'Cash On Delivery'"
  );
  assert.ok(
    emailTemplates.includes("isOnlinePaymentMethod(order.paymentMethod)"),
    "confirmation emails must classify card orders as Online Payment"
  );
});
