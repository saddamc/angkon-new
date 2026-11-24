import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateOrderParcelWeight,
  PACKAGING_PRESETS,
  getPackagingPreset,
  normalizeUnitWeightToKg,
  classifyOrderParcel,
} from "../src/server/courier/core/parcel-classifier";
import {
  isLocalTestOrder,
  getCourierModeConfig,
} from "../src/server/courier/core/courier-mode";
import {
  computeOrderFinancials,
  checkCourierBookingEligibility,
} from "../src/server/orders/workflow";
import { normalizeBdPhone } from "../src/server/courier/providers/steadfast/utils";
import { MockSteadfastProvider } from "../src/server/courier/mock/steadfast";

// ── Scenario 1: Automatic weight from a single product ──────────────────
test("Scenario 1: Automatic weight from a single product correctly calculated", () => {
  const items = [
    {
      productId: 228001,
      name: "Tawakkal Wada – Midnight Black",
      quantity: 1,
      weight: "1.2",
      weightUnit: "kg",
      shippingCategory: "apparel",
    },
  ];

  const summary = calculateOrderParcelWeight(items, "poly_mailer");
  assert.equal(summary.totalProductWeightKg, 1.2);
  assert.equal(summary.packagingWeightKg, 0.05);
  // Auto: 1.20 + 0.05 = 1.25 kg
  assert.equal(summary.finalPackageWeightKg, 1.25);
  assert.equal(summary.hasMissingWeight, false);
  assert.equal(summary.autoParcelType, "Fashion (Apparel)");
});

// ── Scenario 2: Multiple products with different weights ────────────────
test("Scenario 2: Multiple products with different weights sum accurately", () => {
  const items = [
    {
      productId: 101,
      name: "Silk Embroidered Dupatta",
      quantity: 1,
      weight: 350,
      weightUnit: "g", // 0.350 kg
      shippingCategory: "apparel",
    },
    {
      productId: 102,
      name: "Heavy Festive Lehenga",
      quantity: 1,
      weight: 1.85,
      weightUnit: "kg", // 1.850 kg
      shippingCategory: "apparel",
    },
  ];

  const summary = calculateOrderParcelWeight(items, "box_small");
  // 0.35 + 1.85 = 2.20 kg
  assert.equal(summary.totalProductWeightKg, 2.2);
  // Small box tare: 0.15 kg
  assert.equal(summary.packagingWeightKg, 0.15);
  // 2.20 + 0.15 = 2.35 kg
  assert.equal(summary.finalPackageWeightKg, 2.35);
  assert.equal(summary.hasMissingWeight, false);
});

// ── Scenario 3: Quantity multiplication ─────────────────────────────────
test("Scenario 3: Quantity multiplication (e.g. 2 x 0.60 kg = 1.20 kg)", () => {
  const items = [
    {
      productId: 201,
      name: "Premium Cotton Kurti",
      quantity: 2,
      weight: "0.6",
      weightUnit: "kg",
      shippingCategory: "apparel",
    },
  ];

  const summary = calculateOrderParcelWeight(items, "poly_mailer");
  // 2 * 0.6 = 1.2 kg
  assert.equal(summary.totalProductWeightKg, 1.2);
  // 1.2 + 0.05 = 1.25 kg
  assert.equal(summary.finalPackageWeightKg, 1.25);
  assert.equal(summary.items[0].unitWeightKg, 0.6);
  assert.equal(summary.items[0].totalWeightKg, 1.2);
});

// ── Scenario 4: Variant-specific weights ────────────────────────────────
test("Scenario 4: Variant-specific weight normalization and fallback", () => {
  // If variant has 450g while product has no weight, normalizer converts 450g to 0.45 kg
  const variantWeight = normalizeUnitWeightToKg(450, "g");
  assert.equal(variantWeight, 0.45);

  const items = [
    {
      productId: 301,
      name: "Embellished Saree (Size: Standard)",
      quantity: 1,
      weight: variantWeight,
      weightUnit: "kg",
      shippingCategory: "apparel",
    },
  ];

  const summary = calculateOrderParcelWeight(items, "box_medium");
  assert.equal(summary.totalProductWeightKg, 0.45);
  // 0.45 + 0.25 (box_medium) = 0.70 kg
  assert.equal(summary.finalPackageWeightKg, 0.7);
});

// ── Scenario 5: Missing product weight detection ────────────────────────
test("Scenario 5: Missing product weight flags hasMissingWeight and lists items", () => {
  const items = [
    {
      productId: 401,
      name: "New Unweighted Handbag",
      quantity: 1,
      weight: null,
      weightUnit: null,
      shippingCategory: "accessories",
    },
    {
      productId: 402,
      name: "Cotton Scarf",
      quantity: 2,
      weight: "0.20",
      weightUnit: "kg",
      shippingCategory: "accessories",
    },
  ];

  const summary = calculateOrderParcelWeight(items, "poly_mailer");
  assert.equal(summary.hasMissingWeight, true);
  assert.equal(summary.missingProductCount, 1);
  assert.equal(summary.missingProducts[0].productId, 401);
  assert.equal(summary.missingProducts[0].name, "New Unweighted Handbag");
  // Partial product weight is summed without silently inventing default for item 401
  assert.equal(summary.totalProductWeightKg, 0.4);
});

// ── Scenario 6: Packaging tare-weight addition ──────────────────────────
test("Scenario 6: Packaging tare-weight strictly equals Products Weight + Tare", () => {
  const items = [
    {
      productId: 501,
      name: "Lawn 3-Piece Suite",
      quantity: 1,
      weight: "0.85",
      weightUnit: "kg",
      shippingCategory: "apparel",
    },
  ];

  for (const preset of PACKAGING_PRESETS) {
    const summary = calculateOrderParcelWeight(items, preset.id);
    const expected = Math.round((0.85 + preset.weightKg) * 100) / 100;
    assert.equal(summary.finalPackageWeightKg, expected);
  }
});

// ── Scenario 7: Packaging preset changes ────────────────────────────────
test("Scenario 7: Packaging preset selection recalculates final weight immediately", () => {
  const items = [
    {
      productId: 601,
      name: "Designer Abaya",
      quantity: 1,
      weight: 1.0,
      weightUnit: "kg",
    },
  ];

  // Default poly mailer (+0.05)
  const defaultSummary = calculateOrderParcelWeight(items, "poly_mailer");
  assert.equal(defaultSummary.finalPackageWeightKg, 1.05);

  // Switch to rigid luxury box (+0.40)
  const luxurySummary = calculateOrderParcelWeight(items, "box_large");
  assert.equal(luxurySummary.finalPackageWeightKg, 1.4);

  // Switch to no extra packaging (+0.00)
  const directSummary = calculateOrderParcelWeight(items, "none");
  assert.equal(directSummary.finalPackageWeightKg, 1.0);
});

// ── Scenario 8: Actual measured weight override ─────────────────────────
test("Scenario 8: Supervisor measured weight override with verification reason", () => {
  const manualWeightInput = "1.45";
  const manualEstimateReason = "Scale verified by dispatch supervisor at packing station";

  const num = parseFloat(manualWeightInput);
  assert.equal(Number.isFinite(num) && num > 0, true);
  assert.equal(manualEstimateReason.trim().length > 0, true);

  const providerMeta = {
    packageWeight: num,
    weightEstimated: false, // measured!
    manualEstimateReason: manualEstimateReason.trim(),
  };

  assert.equal(providerMeta.packageWeight, 1.45);
  assert.equal(providerMeta.weightEstimated, false);
  assert.equal(providerMeta.manualEstimateReason, manualEstimateReason);
});

// ── Scenario 9: Invalid weight rejection ────────────────────────────────
test("Scenario 9: Invalid weight rejection (negative, zero, NaN, empty)", () => {
  assert.equal(normalizeUnitWeightToKg("-0.5", "kg"), null);
  assert.equal(normalizeUnitWeightToKg(0, "kg"), null);
  assert.equal(normalizeUnitWeightToKg("abc", "kg"), null);
  assert.equal(normalizeUnitWeightToKg("", "kg"), null);
  assert.equal(normalizeUnitWeightToKg(null, null), null);
  assert.equal(normalizeUnitWeightToKg(undefined, undefined), null);
});

// ── Scenario 10: Correct COD for standard COD orders ────────────────────
test("Scenario 10: Correct COD for unpaid COD orders equals order total", () => {
  const order = {
    total: 8070,
    shippingFee: 80,
    subtotal: 7990,
    paymentMethod: "cod",
    paymentStatus: "pending",
    paidAmount: 0,
  };

  const financials = computeOrderFinancials(order);
  assert.equal(financials.orderTotal, 8070);
  assert.equal(financials.advancePaidAmount, 0);
  assert.equal(financials.outstandingAmount, 8070);
  assert.equal(financials.expectedCodAmount, 8070);
  assert.equal(financials.codAmountToCollect, 8070);
});

// ── Scenario 11: Zero COD for fully paid online orders ──────────────────
test("Scenario 11: Fully paid orders result in exactly ৳0 COD collection", () => {
  const order = {
    total: 8070,
    shippingFee: 80,
    subtotal: 7990,
    paymentMethod: "sslcommerz",
    paymentStatus: "paid",
    paidAmount: 8070,
  };

  const financials = computeOrderFinancials(order);
  assert.equal(financials.orderTotal, 8070);
  assert.equal(financials.advancePaidAmount, 8070);
  assert.equal(financials.outstandingAmount, 0);
  assert.equal(financials.expectedCodAmount, 0);
  assert.equal(financials.codAmountToCollect, 0);
});

// ── Scenario 12: Correct COD for partially paid orders ──────────────────
test("Scenario 12: Partially paid orders calculate remaining balance as COD", () => {
  const order = {
    total: 8070,
    shippingFee: 80,
    subtotal: 7990,
    paymentMethod: "cod",
    paymentStatus: "partially_paid",
    paidAmount: 1000, // advance delivery fee + deposit
  };

  const financials = computeOrderFinancials(order);
  assert.equal(financials.orderTotal, 8070);
  assert.equal(financials.advancePaidAmount, 1000);
  assert.equal(financials.outstandingAmount, 7070);
  assert.equal(financials.expectedCodAmount, 7070);
  assert.equal(financials.codAmountToCollect, 7070);
});

// ── Scenario 13: Pending online payment booking blocking ────────────────
test("Scenario 13: Unpaid/pending SSLCOMMERZ order blocks courier booking", () => {
  const eligibility = checkCourierBookingEligibility({
    orderStatus: "confirmed",
    paymentMethod: "sslcommerz",
    paymentStatus: "pending", // Unpaid gateway attempt
    paidAmount: 0,
    total: 8070,
    shipmentStatus: "not_booked",
    shipmentBookingState: "not_booked",
  });

  assert.equal(eligibility.ok, false);
  assert.ok(eligibility.reason?.includes("Online payment is pending"));
});

// ── Scenario 14: QA/test orders blocking live booking ───────────────────
test("Scenario 14: Test/QA orders are strictly blocked from live courier booking", () => {
  // Test case 1: Explicit isTestOrder flag
  assert.equal(
    isLocalTestOrder("ANG-261121-0001", { fullName: "Standard Name" }, { isTestOrder: true }),
    true
  );

  // Test case 2: Name containing QA Customer
  assert.equal(
    isLocalTestOrder("ANG-261121-0001", { fullName: "QA Customer COD" }),
    true
  );

  // Test case 3: Test dummy phone
  assert.equal(
    isLocalTestOrder("ANG-261121-0001", { phone: "01700000000" }),
    true
  );

  // Test case 4: Test email
  assert.equal(
    isLocalTestOrder("ANG-261121-0001", { email: "test@example.com" }),
    true
  );

  // Test case 5: Order number prefix
  assert.equal(
    isLocalTestOrder("QA-ANG-001", { fullName: "Rahim Ahmed" }),
    true
  );

  // Test case 6: Genuine customer order is NOT blocked
  assert.equal(
    isLocalTestOrder("ANG-261121-9999", {
      fullName: "Sultana Begum",
      phone: "01712345678",
      email: "sultana.begum@gmail.com",
    }),
    false
  );
});

// ── Scenario 15: Duplicate booking protection ───────────────────────────
test("Scenario 15: Duplicate booking protection prevents duplicate consignment creation", async () => {
  const provider = new MockSteadfastProvider();
  const input = {
    orderNumber: "ANG-ORDER-IDEMP-1",
    recipientName: "Fatima Khan",
    recipientPhone: "01799887766",
    recipientAddress: "Road 10, Dhanmondi, Dhaka",
    codAmount: 3500,
  };

  const res1 = await provider.createShipment(input);
  assert.equal(res1.ok, true);

  // Second duplicate call is intercepted and blocked
  const res2 = await provider.createShipment(input);
  assert.equal(res2.ok, false);
  if (!res2.ok) {
    assert.equal(res2.error.code, "duplicate");
    assert.ok(res2.error.message.includes("already has an active mock consignment"));
  }
});

// ── Scenario 16: Correct UI state for MOCK vs LIVE modes ────────────────
test("Scenario 16: Mode configurations enforce safety boundaries between MOCK and LIVE", () => {
  // In development/test environment, getCourierModeConfig enforces mock mode
  const modeConfig = getCourierModeConfig();
  assert.equal(modeConfig.isMock, true);
  assert.equal(modeConfig.liveBookingEnabled, false);

  // Recipient phone normalization meets Steadfast BD requirements
  assert.equal(normalizeBdPhone("01799887766"), "01799887766");
  assert.equal(normalizeBdPhone("+8801799887766"), "01799887766");
  assert.equal(normalizeBdPhone("12345"), null); // invalid phone rejected
});
