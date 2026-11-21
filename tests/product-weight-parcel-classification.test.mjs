import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  normalizeUnitWeightToKg,
  classifyProductCategory,
  classifyOrderParcel,
  calculateOrderParcelWeight,
  PACKAGING_PRESETS,
  getPackagingPreset,
} from "../src/server/courier/parcel-classifier.ts";

test("1. Weight Normalization & Unit Conversions", () => {
  // Explicit kg
  assert.equal(normalizeUnitWeightToKg(1.2, "kg"), 1.2);
  assert.equal(normalizeUnitWeightToKg("0.85", "kg"), 0.85);

  // Explicit grams
  assert.equal(normalizeUnitWeightToKg(350, "g"), 0.35);
  assert.equal(normalizeUnitWeightToKg("500", "g"), 0.5);
  assert.equal(normalizeUnitWeightToKg("1250", "g"), 1.25);

  // Unspecified unit: values >= 25 inferred as grams, < 25 as kg
  assert.equal(normalizeUnitWeightToKg(250), 0.25);
  assert.equal(normalizeUnitWeightToKg("450"), 0.45);
  assert.equal(normalizeUnitWeightToKg(1.5), 1.5);
  assert.equal(normalizeUnitWeightToKg("0.4"), 0.4);

  // Missing / invalid weights return null (no silent assumptions)
  assert.equal(normalizeUnitWeightToKg(null), null);
  assert.equal(normalizeUnitWeightToKg(undefined), null);
  assert.equal(normalizeUnitWeightToKg(""), null);
  assert.equal(normalizeUnitWeightToKg("   "), null);
  assert.equal(normalizeUnitWeightToKg(0), null);
  assert.equal(normalizeUnitWeightToKg(-1.5), null);
  assert.equal(normalizeUnitWeightToKg("abc"), null);
});

test("2. Packaging Presets & Configuration", () => {
  assert.ok(PACKAGING_PRESETS.length >= 4, "Must offer multiple packaging presets");

  const poly = getPackagingPreset("poly_mailer");
  assert.equal(poly.weightKg, 0.05, "Standard poly mailer should be 50g");

  const boxSmall = getPackagingPreset("box_small");
  assert.equal(boxSmall.weightKg, 0.15, "Small box should be 150g");

  const boxMedium = getPackagingPreset("box_medium");
  assert.equal(boxMedium.weightKg, 0.25, "Medium box should be 250g");

  const luxury = getPackagingPreset("box_large");
  assert.equal(luxury.weightKg, 0.40, "Luxury rigid box should be 400g");

  const none = getPackagingPreset("none");
  assert.equal(none.weightKg, 0.00, "Direct shipment has 0g packaging weight");

  // Fallback for unknown packaging id
  const fallback = getPackagingPreset("unknown_box");
  assert.equal(fallback.id, "poly_mailer");
});

test("3. Intelligent Product Classification", () => {
  // Apparel
  assert.equal(classifyProductCategory({ name: "Tawakkal Wada – Midnight Black Suit" }), "apparel");
  assert.equal(classifyProductCategory({ name: "Heavyweight French Terry Streetwear Hoodie" }), "apparel");
  assert.equal(classifyProductCategory({ name: "Alita Garara – Lavender Embroidered Saree" }), "apparel");
  assert.equal(classifyProductCategory({ categoryNames: ["Aiman Aisha", "Luxury Lawn"] }), "apparel");

  // Bags and jewelry -> Accessories
  assert.equal(classifyProductCategory({ name: "Handmade Leather Shoulder Bag" }), "accessories");
  assert.equal(classifyProductCategory({ name: "Golden Kundan Bridal Jewelry Necklace" }), "accessories");
  assert.equal(classifyProductCategory({ name: "Diamond Stud Earrings & Bracelet" }), "accessories");
  assert.equal(classifyProductCategory({ categoryNames: ["Accessories"] }), "accessories");

  // Skincare and cosmetics -> Cosmetics
  assert.equal(classifyProductCategory({ name: "Hydrating Rose Facial Serum & Moisturizer" }), "cosmetics");
  assert.equal(classifyProductCategory({ name: "Organic Attar Perfume Oil 12ml" }), "cosmetics");
  assert.equal(classifyProductCategory({ categoryNames: ["Cosmetics", "Skincare"] }), "cosmetics");

  // Explicit override takes precedence
  assert.equal(
    classifyProductCategory({
      name: "Floral Saree with Gift Clutch",
      explicitCategory: "accessories",
    }),
    "accessories"
  );
  assert.equal(
    classifyProductCategory({
      name: "Generic Item 123",
      explicitCategory: "cosmetics",
    }),
    "cosmetics"
  );

  // Unknown defaults to general
  assert.equal(classifyProductCategory({ name: "Stainless Steel Cutlery Set" }), "general");
});

test("4. Order Parcel Classification & Mixed-Category Detection", () => {
  // Pure Apparel
  const apparelResult = classifyOrderParcel(["apparel", "apparel"]);
  assert.equal(apparelResult.parcelType, "Fashion (Apparel)");
  assert.equal(apparelResult.isMixed, false);

  // Pure Accessories
  const accResult = classifyOrderParcel(["accessories"]);
  assert.equal(accResult.parcelType, "Accessories");
  assert.equal(accResult.isMixed, false);

  // Pure Cosmetics
  const cosmResult = classifyOrderParcel(["cosmetics", "cosmetics"]);
  assert.equal(cosmResult.parcelType, "Cosmetics");
  assert.equal(cosmResult.isMixed, false);

  // Mixed: Apparel + Cosmetics -> General Parcel
  const mixedResult1 = classifyOrderParcel(["apparel", "cosmetics"]);
  assert.equal(mixedResult1.parcelType, "General Parcel");
  assert.equal(mixedResult1.isMixed, true);

  // Mixed: Apparel + Accessories -> General Parcel
  const mixedResult2 = classifyOrderParcel(["apparel", "accessories"]);
  assert.equal(mixedResult2.parcelType, "General Parcel");
  assert.equal(mixedResult2.isMixed, true);

  // Unknown / General
  const generalResult = classifyOrderParcel(["general"]);
  assert.equal(generalResult.parcelType, "General Parcel");
  assert.equal(generalResult.isMixed, false);
});

test("5. Multi-Product & Multi-Quantity Weight Calculations", () => {
  const items = [
    {
      productId: 101,
      name: "Tawakkal Wada Suit",
      quantity: 2,
      weight: "1.2",
      weightUnit: "kg",
      shippingCategory: "apparel",
    },
    {
      productId: 102,
      name: "Cotton Lawn Kurti",
      quantity: 3,
      weight: 350,
      weightUnit: "g",
      shippingCategory: "apparel",
    },
  ];

  // Product 101: 1.2 kg * 2 = 2.40 kg
  // Product 102: 0.35 kg * 3 = 1.05 kg
  // Total product weight = 3.45 kg
  const summaryPoly = calculateOrderParcelWeight(items, "poly_mailer");
  assert.equal(summaryPoly.totalProductWeightKg, 3.45);
  assert.equal(summaryPoly.packagingWeightKg, 0.05);
  assert.equal(summaryPoly.finalPackageWeightKg, 3.50);
  assert.equal(summaryPoly.hasMissingWeight, false);
  assert.equal(summaryPoly.missingProductCount, 0);
  assert.equal(summaryPoly.autoParcelType, "Fashion (Apparel)");
  assert.equal(summaryPoly.totalQuantity, 5);

  // With medium box (+0.25 kg)
  const summaryBox = calculateOrderParcelWeight(items, "box_medium");
  assert.equal(summaryBox.finalPackageWeightKg, 3.70);

  // With direct shipment / no packaging (+0.00 kg)
  const summaryNone = calculateOrderParcelWeight(items, "none");
  assert.equal(summaryNone.finalPackageWeightKg, 3.45);
});

test("6. Missing Weight Handling (Never Silently Assumes 0.5 kg)", () => {
  const itemsWithMissing = [
    {
      productId: 201,
      name: "Verified Weight Dress",
      quantity: 1,
      weight: "0.6",
      weightUnit: "kg",
    },
    {
      productId: 202,
      name: "Unweighed Embroidered Suit",
      quantity: 2,
      weight: "", // Missing!
      weightUnit: "kg",
    },
  ];

  const summary = calculateOrderParcelWeight(itemsWithMissing, "poly_mailer");
  assert.equal(summary.hasMissingWeight, true, "Must flag missing weight");
  assert.equal(summary.missingProductCount, 1);
  assert.equal(summary.missingProducts[0].productId, 202);
  assert.equal(summary.missingProducts[0].name, "Unweighed Embroidered Suit");
  assert.equal(summary.missingProducts[0].quantity, 2);

  // Verified item = 0.6 kg; missing item NOT assumed to be 0.5 kg
  assert.equal(summary.totalProductWeightKg, 0.6);
  assert.equal(summary.items.find((i) => i.productId === 202)?.isMissingWeight, true);
  assert.equal(summary.items.find((i) => i.productId === 202)?.unitWeightKg, null);
});

test("7. Courier Payload Isolation (Steadfast vs Pathao)", () => {
  const steadfastSource = fs.readFileSync("src/server/courier/steadfast.ts", "utf8");

  // Steadfast MUST NOT send weight or parcel_type to /create_order
  assert.match(
    steadfastSource,
    /delete requestBody\.weight/,
    "Steadfast adapter must delete/omit weight field before sending to /create_order"
  );
  assert.match(
    steadfastSource,
    /delete requestBody\.parcel_type/,
    "Steadfast adapter must delete/omit parcel_type field before sending to /create_order"
  );

  // Steadfast uses item_description and total_lot where appropriate
  assert.match(
    steadfastSource,
    /requestBody\.item_description\s*=/,
    "Steadfast adapter must support item_description"
  );
  assert.match(
    steadfastSource,
    /requestBody\.total_lot\s*=/,
    "Steadfast adapter must support total_lot"
  );

  // Pathao adapter accepts item_weight
  const pathaoSource = fs.readFileSync("src/server/courier/pathao.ts", "utf8");
  assert.match(
    pathaoSource,
    /item_weight:/,
    "Pathao adapter must map item_weight from providerMeta"
  );
});

test("8. Product Database Model Shipping Fields", () => {
  const productModelSource = fs.readFileSync("src/models/Product.ts", "utf8");

  assert.match(productModelSource, /weight\?:/, "Product interface must include weight");
  assert.match(productModelSource, /weightUnit\?:/, "Product interface must include weightUnit");
  assert.match(productModelSource, /shippingCategory\?:/, "Product interface must include shippingCategory");
  assert.match(productModelSource, /weightUpdatedAt\?:/, "Product interface must include weightUpdatedAt");

  assert.match(productModelSource, /weightUnit:\s*{\s*type:\s*String/, "ProductSchema must define weightUnit");
  assert.match(productModelSource, /shippingCategory:\s*{\s*type:\s*String/, "ProductSchema must define shippingCategory");
  assert.match(productModelSource, /weightUpdatedAt:\s*{\s*type:\s*Date/, "ProductSchema must define weightUpdatedAt");
});

test("9. Product Verified Weight Save Endpoint", () => {
  const routeSource = fs.readFileSync("src/app/api/admin/products/[id]/shipping-weight/route.ts", "utf8");

  assert.match(routeSource, /export async function PATCH/, "Endpoint must provide PATCH handler");
  assert.match(routeSource, /requireAdminSessionCore/, "Endpoint must require admin session");
  assert.match(routeSource, /normalizeUnitWeightToKg/, "Endpoint must validate and normalize weight");
  assert.match(routeSource, /weightUpdatedAt\s*=\s*new Date\(\)/, "Endpoint must record weightUpdatedAt timestamp");
  assert.match(routeSource, /action:\s*"product\.weight\.update"/, "Endpoint must record audit log");
});

test("10. UI Create Shipment Modal Integration", () => {
  const modalsSource = fs.readFileSync("src/app/admin/orders/_components/orders-modals.tsx", "utf8");

  // Two-column layout intact
  assert.match(modalsSource, /grid-cols-1 gap-4 sm:grid-cols-2/, "Must preserve 2-column layout");

  // Parcel classification
  assert.match(modalsSource, /Parcel Classification/, "Must show Parcel Classification selector");
  assert.match(modalsSource, /Auto-Classified/, "Must show auto-classification indicator");

  // Weight breakdown
  assert.match(modalsSource, /Parcel Weight Breakdown/, "Must show weight breakdown card");
  assert.match(modalsSource, /Products Weight/, "Must display product weight line");
  assert.match(modalsSource, /Packaging Allowance/, "Must display packaging allowance dropdown");
  assert.match(modalsSource, /Final Package Weight/, "Must display final package weight");

  // Missing weight warnings & quick-save
  assert.match(modalsSource, /Missing product weight/, "Must show missing weight warning");
  assert.match(modalsSource, /save to Product database/i, "Must allow saving verified weight to product database");
  assert.match(modalsSource, /handleSaveProductWeight/, "Must wire handleSaveProductWeight handler");

  // Footer summary
  assert.match(modalsSource, /Create Steadfast shipment|Book with Steadfast/i, "Must have Steadfast booking button");
});

test("11. Strict Mathematical Equality & Zero Weight Discrepancy Fix", () => {
  // Case A: 0.00 kg product weight + 0.05 kg poly_mailer -> EXACTLY 0.05 kg (never 0.10 kg)
  const itemsUnweighed = [
    {
      productId: 301,
      name: "Unweighed Item",
      quantity: 1,
      weight: null,
    },
  ];
  const summaryZeroProduct = calculateOrderParcelWeight(itemsUnweighed, "poly_mailer");
  assert.equal(summaryZeroProduct.totalProductWeightKg, 0);
  assert.equal(summaryZeroProduct.packagingWeightKg, 0.05);
  assert.equal(
    summaryZeroProduct.finalPackageWeightKg,
    0.05,
    "Strict equality: 0.00 + 0.05 must equal 0.05 kg (resolves 0.10 kg discrepancy)"
  );
  assert.equal(summaryZeroProduct.isZeroWeight, false);

  // Case B: 0.00 kg product weight + 0.00 kg none packaging -> EXACTLY 0.00 kg and isZeroWeight=true
  const summaryZeroAll = calculateOrderParcelWeight(itemsUnweighed, "none");
  assert.equal(summaryZeroAll.totalProductWeightKg, 0);
  assert.equal(summaryZeroAll.packagingWeightKg, 0);
  assert.equal(summaryZeroAll.finalPackageWeightKg, 0);
  assert.equal(summaryZeroAll.isZeroWeight, true, "Must flag zero weight when final package weight is 0");

  // Case C: 1.23 kg product weight + 0.15 kg box_small -> EXACTLY 1.38 kg
  const itemsWeighed = [
    {
      productId: 302,
      name: "Weighed Item",
      quantity: 1,
      weight: 1.23,
      weightUnit: "kg",
    },
  ];
  const summaryWeighed = calculateOrderParcelWeight(itemsWeighed, "box_small");
  assert.equal(summaryWeighed.totalProductWeightKg, 1.23);
  assert.equal(summaryWeighed.packagingWeightKg, 0.15);
  assert.equal(
    summaryWeighed.finalPackageWeightKg,
    1.38,
    "Strict equality: 1.23 + 0.15 must equal 1.38 kg"
  );
  assert.equal(summaryWeighed.isZeroWeight, false);
});
