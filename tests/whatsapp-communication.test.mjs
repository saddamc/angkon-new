import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  normalizeWhatsAppPhone,
  formatPhoneForDisplay,
  buildWhatsAppUrl,
  extractOrderWhatsAppContext,
  generateWhatsAppMessage,
  mapStatusToTemplateKey,
  WHATSAPP_TEMPLATE_OPTIONS,
} from "../src/server/integrations/whatsapp/whatsapp-templates.ts";

test("1. Bangladeshi Phone Normalization for WhatsApp", () => {
  // Standard 11-digit local format: 01XXXXXXXXX -> 8801XXXXXXXXX
  assert.equal(normalizeWhatsAppPhone("01712345678"), "8801712345678");
  assert.equal(normalizeWhatsAppPhone("01829376969"), "8801829376969");
  assert.equal(normalizeWhatsAppPhone("01338668899"), "8801338668899");

  // With +880 international prefix
  assert.equal(normalizeWhatsAppPhone("+8801712345678"), "8801712345678");
  assert.equal(normalizeWhatsAppPhone("+880 1712-345678"), "8801712345678");

  // With 880 prefix (no +)
  assert.equal(normalizeWhatsAppPhone("8801712345678"), "8801712345678");

  // 10-digit without leading 0: 1712345678 -> 8801712345678
  assert.equal(normalizeWhatsAppPhone("1712345678"), "8801712345678");

  // Phone with punctuation, dashes and spaces
  assert.equal(normalizeWhatsAppPhone("+880 (171) 234-5678"), "8801712345678");

  // Invalid numbers return null
  assert.equal(normalizeWhatsAppPhone("0171234567"), null); // 10 digits
  assert.equal(normalizeWhatsAppPhone("017123456789"), null); // 12 digits
  assert.equal(normalizeWhatsAppPhone("01234567890"), null); // invalid operator 012
  assert.equal(normalizeWhatsAppPhone("abcdefghijk"), null);
  assert.equal(normalizeWhatsAppPhone(""), null);
  assert.equal(normalizeWhatsAppPhone(null), null);
  assert.equal(normalizeWhatsAppPhone(undefined), null);

  // Phone display formatting
  assert.equal(formatPhoneForDisplay("01712345678"), "+880 1712-345678");
  assert.equal(formatPhoneForDisplay("+8801829376969"), "+880 1829-376969");
  assert.equal(formatPhoneForDisplay(null), "No phone provided");
});

test("2. WhatsApp Deep Link URL Building & Encoding", () => {
  const url = buildWhatsAppUrl("01712345678", "Hello World! ৳1,330 ❤️");
  assert.ok(url);
  assert.ok(url.startsWith("https://wa.me/8801712345678?text="));
  assert.ok(url.includes(encodeURIComponent("Hello World! ৳1,330 ❤️")));
  assert.ok(!url.includes(" ")); // spaces must be encoded (%20)
  assert.ok(url.includes("%E2%9D%A4%EF%B8%8F")); // emoji properly encoded

  // Invalid phone returns null
  assert.equal(buildWhatsAppUrl("invalid", "msg"), null);
});

test("3. Missing Customer Name Fallback", () => {
  // Completely missing name
  const orderMissingName = {
    id: 101,
    number: "ANG-101",
    billing: { phone: "01712345678" },
  };
  const ctx1 = extractOrderWhatsAppContext(orderMissingName);
  assert.equal(ctx1.customerName, "Customer");

  const msg1 = generateWhatsAppMessage(orderMissingName, "confirmed");
  assert.ok(msg1.includes("Hello Customer! 👋"));

  // First name only
  const orderFirstName = {
    id: 102,
    number: "ANG-102",
    billing: { first_name: "Sadia", phone: "01712345678" },
  };
  const ctx2 = extractOrderWhatsAppContext(orderFirstName);
  assert.equal(ctx2.customerName, "Sadia");

  const msg2 = generateWhatsAppMessage(orderFirstName, "confirmed");
  assert.ok(msg2.includes("Hello Sadia! 👋"));

  // Full name
  const orderFullName = {
    id: 103,
    number: "ANG-103",
    billing: { first_name: "Tanvir", last_name: "Hossain", phone: "01712345678" },
  };
  const ctx3 = extractOrderWhatsAppContext(orderFullName);
  assert.equal(ctx3.customerName, "Tanvir Hossain");
});

test("4. Multiple Products Formatting", () => {
  const orderMulti = {
    id: 104,
    number: "ANG-104",
    line_items: [
      { name: "Tawakkal Wada – Black Suit", quantity: 1 },
      { name: "Velvet Shawl – Maroon", quantity: 2 },
    ],
    billing: { first_name: "Farhana", phone: "01712345678" },
  };

  const ctx = extractOrderWhatsAppContext(orderMulti);
  assert.equal(
    ctx.productNames,
    "Tawakkal Wada – Black Suit, 2x Velvet Shawl – Maroon"
  );

  const msg = generateWhatsAppMessage(orderMulti, "confirmed");
  assert.ok(msg.includes("Product: Tawakkal Wada – Black Suit, 2x Velvet Shawl – Maroon"));
});

test("5. Financial Safety: Cash on Delivery (COD) Orders", () => {
  const orderCod = {
    id: 105,
    number: "ANG-105",
    total: "1850",
    paymentMethod: "cod",
    payment_status: "pending",
    billing: { first_name: "Rahim", phone: "01712345678" },
  };

  const ctx = extractOrderWhatsAppContext(orderCod);
  assert.equal(ctx.isPrepaid, false);
  assert.equal(ctx.isPartiallyPaid, false);
  assert.equal(ctx.outstandingCod, 1850);
  assert.equal(ctx.paymentMethodDisplay, "Cash on Delivery");
  assert.ok(ctx.financialPaymentLine.includes("keep ৳1,850 ready for payment upon delivery"));

  const msg = generateWhatsAppMessage(orderCod, "confirmed");
  assert.ok(msg.includes("Total Amount: ৳1,850"));
  assert.ok(msg.includes("Payment Method: Cash on Delivery"));
  assert.ok(msg.includes("💰 Please keep ৳1,850 ready for payment upon delivery."));
  assert.ok(!msg.includes("Fully Paid"));
});

test("6. Financial Safety: Prepaid SSLCOMMERZ Orders (Never ask to pay again)", () => {
  const orderPrepaid = {
    id: 106,
    number: "ANG-106",
    total: "2450",
    paidAmount: 2450,
    paymentMethod: "sslcommerz",
    payment_status: "paid",
    billing: { first_name: "Tasnim", phone: "01712345678" },
  };

  const ctx = extractOrderWhatsAppContext(orderPrepaid);
  assert.equal(ctx.isPrepaid, true);
  assert.equal(ctx.outstandingCod, 0);
  assert.equal(ctx.paymentMethodDisplay, "Paid Online (SSLCOMMERZ)");
  assert.ok(ctx.financialPaymentLine.includes("Fully Paid Online (৳0 to pay upon delivery)"));

  const msg = generateWhatsAppMessage(orderPrepaid, "confirmed");
  assert.ok(msg.includes("Total Amount: ৳2,450"));
  assert.ok(msg.includes("Payment Method: Paid Online (SSLCOMMERZ)"));
  assert.ok(msg.includes("✅ Payment Status: Fully Paid Online (৳0 to pay upon delivery)."));
  // Strict safety invariant: never ask to keep cash ready!
  assert.ok(!msg.includes("keep ৳"));
  assert.ok(!msg.includes("ready for payment upon delivery"));
});

test("7. Financial Safety: Partially Paid Orders", () => {
  const orderPartial = {
    id: 107,
    number: "ANG-107",
    total: "3000",
    paidAmount: 1000,
    paymentMethod: "cod",
    payment_status: "partially_paid",
    billing: { first_name: "Imran", phone: "01712345678" },
  };

  const ctx = extractOrderWhatsAppContext(orderPartial);
  assert.equal(ctx.isPrepaid, false);
  assert.equal(ctx.isPartiallyPaid, true);
  assert.equal(ctx.paidAmount, 1000);
  assert.equal(ctx.outstandingCod, 2000);
  assert.equal(ctx.paymentMethodDisplay, "Partially Paid (Advance: ৳1,000)");
  assert.ok(ctx.financialPaymentLine.includes("Advance Paid: ৳1,000"));
  assert.ok(ctx.financialPaymentLine.includes("keep ৳2,000 ready for payment upon delivery"));

  const msg = generateWhatsAppMessage(orderPartial, "confirmed");
  assert.ok(msg.includes("Advance Paid: ৳1,000"));
  assert.ok(msg.includes("keep ৳2,000 ready for payment upon delivery"));
});

test("8. All 8 Status Lifecycle Templates Validation", () => {
  const baseOrder = {
    id: 108,
    number: "ANG-668852-280",
    total: "1330",
    paymentMethod: "cod",
    payment_status: "pending",
    billing: {
      first_name: "Saddam",
      phone: "01829376969",
      address_1: "Road 2, Block A, Niketan",
      city: "Dhaka",
    },
    line_items: [{ name: "Midnight Black Suit", quantity: 1 }],
  };

  // 1. Pending: Request customer confirmation
  const msgPending = generateWhatsAppMessage(baseOrder, "pending");
  assert.ok(msgPending.includes("Hello Saddam! 👋"));
  assert.ok(msgPending.includes("confirm your details before dispatch"));
  assert.ok(msgPending.includes('"CONFIRM"'));
  assert.ok(msgPending.includes("ANGKON – Style That Speaks."));

  // 2. Confirmed: Order confirmation
  const msgConfirmed = generateWhatsAppMessage(baseOrder, "confirmed");
  assert.ok(msgConfirmed.includes("order has been confirmed and is now being prepared for dispatch"));
  assert.ok(msgConfirmed.includes("Order ID: #ANG-668852-280"));
  assert.ok(msgConfirmed.includes("Product: Midnight Black Suit"));
  assert.ok(msgConfirmed.includes("Total Amount: ৳1,330"));
  assert.ok(msgConfirmed.includes("Delivery Address"));
  assert.ok(msgConfirmed.includes("Road 2, Block A, Niketan, Dhaka"));

  // 3. Processing: Preparation update
  const msgProcessing = generateWhatsAppMessage(baseOrder, "processing");
  assert.ok(msgProcessing.includes("carefully packaged and quality checked"));

  // 4. Ready to Ship: Dispatch handover
  const msgReadyToShip = generateWhatsAppMessage(baseOrder, "ready_to_ship");
  assert.ok(msgReadyToShip.includes("packaged and is ready for courier handover"));

  // 5. Shipped: Courier dispatch & tracking
  const shippedOrder = {
    ...baseOrder,
    courier: "steadfast",
    trackingCode: "SF-987654",
  };
  const msgShipped = generateWhatsAppMessage(shippedOrder, "shipped");
  assert.ok(msgShipped.includes("order #ANG-668852-280 is on its way! 🚚"));
  assert.ok(msgShipped.includes("Courier Partner: Steadfast Courier"));
  assert.ok(msgShipped.includes("Tracking Number: SF-987654"));
  assert.ok(msgShipped.includes("Live Tracking: https://steadfast.com.bd/t/SF-987654"));
  assert.ok(msgShipped.includes("24–48 hours inside Dhaka"));

  // 6. Delivered: Thank-you & feedback
  const msgDelivered = generateWhatsAppMessage(baseOrder, "delivered");
  assert.ok(msgDelivered.includes("successfully delivered! 🎉"));
  assert.ok(msgDelivered.includes("We hope you love your new purchase! ❤️"));
  assert.ok(msgDelivered.includes("exchange or sizing assistance within 3 days"));

  // 7. Cancelled: Polite cancellation
  const msgCancelled = generateWhatsAppMessage(baseOrder, "cancelled");
  assert.ok(msgCancelled.includes("has been cancelled as requested"));
  assert.ok(msgCancelled.includes("explore our latest collection at angkon.com.bd"));

  // 8. Returned: Return notification
  const msgReturned = generateWhatsAppMessage(baseOrder, "returned");
  assert.ok(msgReturned.includes("received the returned parcel for ANGKON order"));
  assert.ok(msgReturned.includes("process your replacement or refund promptly"));

  // Status mapping
  assert.equal(mapStatusToTemplateKey("pending"), "pending");
  assert.equal(mapStatusToTemplateKey("confirmed"), "confirmed");
  assert.equal(mapStatusToTemplateKey("processing"), "processing");
  assert.equal(mapStatusToTemplateKey("ready_to_ship"), "ready_to_ship");
  assert.equal(mapStatusToTemplateKey("shipped"), "shipped");
  assert.equal(mapStatusToTemplateKey("delivered"), "delivered");
  assert.equal(mapStatusToTemplateKey("cancelled"), "cancelled");
  assert.equal(mapStatusToTemplateKey("returned"), "returned");
  assert.equal(mapStatusToTemplateKey("unknown"), "confirmed");
});

test("9. Missing Tracking Information Graceful Handling", () => {
  const orderNoTracking = {
    id: 109,
    number: "ANG-109",
    status: "shipped",
    courier: "steadfast",
    billing: { first_name: "Mahmud", phone: "01712345678" },
  };

  const msg = generateWhatsAppMessage(orderNoTracking, "shipped");
  assert.ok(msg.includes("Courier Partner: Steadfast Courier"));
  // Must NOT include broken tracking lines or undefined
  assert.ok(!msg.includes("Tracking Number: undefined"));
  assert.ok(!msg.includes("Tracking Number: null"));
  assert.ok(!msg.includes("Live Tracking: undefined"));
  assert.ok(!msg.includes("Live Tracking: null"));
});

test("10. Template Registry Count & Brand Invariants", () => {
  assert.equal(WHATSAPP_TEMPLATE_OPTIONS.length, 9); // 8 status templates + custom
  const optionsKeys = WHATSAPP_TEMPLATE_OPTIONS.map((o) => o.key);
  assert.ok(optionsKeys.includes("pending"));
  assert.ok(optionsKeys.includes("confirmed"));
  assert.ok(optionsKeys.includes("processing"));
  assert.ok(optionsKeys.includes("ready_to_ship"));
  assert.ok(optionsKeys.includes("shipped"));
  assert.ok(optionsKeys.includes("delivered"));
  assert.ok(optionsKeys.includes("cancelled"));
  assert.ok(optionsKeys.includes("returned"));
  assert.ok(optionsKeys.includes("custom"));

  const waPath = fs.existsSync("src/server/integrations/whatsapp/whatsapp-templates.ts")
    ? "src/server/integrations/whatsapp/whatsapp-templates.ts"
    : "src/server/whatsapp/whatsapp-templates.ts";
  const source = fs.readFileSync(waPath, "utf8");
  assert.ok(source.includes("ANGKON – Style That Speaks."));
  assert.ok(source.includes("https://wa.me/"));
});

test("11. UI Integration, Modal Wiring & Review Guarantee", () => {
  const modalSource = fs.readFileSync("src/app/admin/orders/_components/whatsapp-modal.tsx", "utf8");
  const rowSource = fs.readFileSync("src/app/admin/orders/_components/order-row.tsx", "utf8");
  const modalsSource = fs.readFileSync("src/app/admin/orders/_components/orders-modals.tsx", "utf8");
  const hookSource = fs.readFileSync("src/app/admin/orders/_hooks/use-admin-orders.ts", "utf8");

  // WhatsAppModal component exists and provides message editing, template switching, and copy
  assert.ok(modalSource.includes("WhatsApp Communication"));
  assert.ok(modalSource.includes("Select Message Template"));
  assert.ok(modalSource.includes("Message Preview & Editor"));
  assert.ok(modalSource.includes("Open in WhatsApp"));
  assert.ok(modalSource.includes("Review & Manual Send Guarantee"));
  assert.ok(modalSource.includes("textarea"));

  // Manual review guarantee: modal explicitly guarantees messages are never sent automatically
  assert.ok(
    modalSource.includes("Messages are never sent automatically — you can review, edit, and press Send inside WhatsApp.")
  );

  // Row wires WhatsApp button to openWhatsApp
  assert.ok(rowSource.includes("state.openWhatsApp(order)"));
  assert.ok(rowSource.includes('title="Chat on WhatsApp"'));
  assert.ok(rowSource.includes("WhatsAppIcon"));

  // OrdersModals renders WhatsAppModal
  assert.ok(modalsSource.includes("WhatsAppModal"));
  assert.ok(modalsSource.includes("order={state.whatsappModal}"));
  assert.ok(modalsSource.includes("onClose={state.closeWhatsApp}"));

  // Hook exports openWhatsApp and closeWhatsApp
  assert.ok(hookSource.includes("whatsappModal"));
  assert.ok(hookSource.includes("openWhatsApp"));
  assert.ok(hookSource.includes("closeWhatsApp"));
});

test("12. Financial Safety Exhaustive Test Across Scenarios", () => {
  // Scenario A: 100% Paid SSLCOMMERZ order
  const prepaidOrder = {
    id: "SSL-1",
    total: "5000",
    paidAmount: 5000,
    paymentMethod: "sslcommerz",
    payment_status: "paid",
    status: "confirmed",
  };
  const prepaidMsg = generateWhatsAppMessage(prepaidOrder, "confirmed");
  assert.ok(prepaidMsg.includes("Fully Paid Online"));
  assert.ok(!prepaidMsg.includes("keep ৳"));
  assert.ok(!prepaidMsg.includes("Cash on Delivery"));

  // Scenario B: Standard COD order
  const codOrder = {
    id: "COD-1",
    total: "1200",
    paidAmount: 0,
    paymentMethod: "cod",
    payment_status: "pending",
    status: "confirmed",
  };
  const codMsg = generateWhatsAppMessage(codOrder, "confirmed");
  assert.ok(codMsg.includes("Total Amount: ৳1,200"));
  assert.ok(codMsg.includes("Payment Method: Cash on Delivery"));
  assert.ok(codMsg.includes("Please keep ৳1,200 ready for payment upon delivery"));

  // Scenario C: Partial advance payment
  const partialOrder = {
    id: "PART-1",
    total: "4000",
    paidAmount: 1500,
    paymentMethod: "cod",
    payment_status: "partially_paid",
    status: "confirmed",
  };
  const partialMsg = generateWhatsAppMessage(partialOrder, "confirmed");
  assert.ok(partialMsg.includes("Advance Paid: ৳1,500"));
  assert.ok(partialMsg.includes("Please keep ৳2,500 ready for payment upon delivery"));
  assert.ok(!partialMsg.includes("Fully Paid"));
});

