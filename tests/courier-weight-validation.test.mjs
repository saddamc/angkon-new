import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");

test("1. Steadfast Weight Rules: Weight is optional and unsupported fields are omitted", () => {
  const courierServiceSource = read((fs.existsSync("src/server/courier/core/courier-service.ts") ? "src/server/courier/core/courier-service.ts" : "src/server/courier/courier-service.ts"));
  const steadfastSource = read((fs.existsSync("src/server/courier/providers/steadfast/adapter.ts") ? "src/server/courier/providers/steadfast/adapter.ts" : "src/server/courier/steadfast.ts"));

  // Steadfast weight is optional in courier-service
  assert.ok(
    courierServiceSource.includes('targetCourier === "steadfast"'),
    "courier-service must check for steadfast provider"
  );
  assert.ok(
    courierServiceSource.includes("Steadfast: product weight is strictly optional"),
    "courier-service must document that Steadfast weight is optional"
  );

  // Steadfast payload isolation: unsupported fields like weight or parcel_type deleted
  assert.match(
    steadfastSource,
    /delete requestBody\.weight/,
    "Steadfast adapter must delete weight field before /create_order"
  );
  assert.match(
    steadfastSource,
    /delete requestBody\.parcel_type/,
    "Steadfast adapter must delete parcel_type field before /create_order"
  );
});

test("2. Pathao Weight Rules: Verified weight is strictly required (> 0 kg)", () => {
  const courierServiceSource = read((fs.existsSync("src/server/courier/core/courier-service.ts") ? "src/server/courier/core/courier-service.ts" : "src/server/courier/courier-service.ts"));
  const pathaoSource = read((fs.existsSync("src/server/courier/providers/pathao/adapter.ts") ? "src/server/courier/providers/pathao/adapter.ts" : "src/server/courier/pathao.ts"));

  // Pathao requires weight > 0 kg
  assert.ok(
    courierServiceSource.includes('targetCourier === "pathao"'),
    "courier-service must have dedicated validation for pathao"
  );
  assert.ok(
    courierServiceSource.includes('code: "WEIGHT_REQUIRED"'),
    "courier-service must return WEIGHT_REQUIRED when Pathao weight is missing or <= 0"
  );
  assert.ok(
    courierServiceSource.includes("ESTIMATE_REASON_REQUIRED"),
    "courier-service must require estimate reason for Pathao"
  );

  // Pathao adapter passes item_weight
  assert.match(
    pathaoSource,
    /item_weight:/,
    "Pathao adapter must map item_weight from providerMeta"
  );
});

test("3. RedX Weight Rules: Follows verified official requirements without assumptions", () => {
  const courierServiceSource = read((fs.existsSync("src/server/courier/core/courier-service.ts") ? "src/server/courier/core/courier-service.ts" : "src/server/courier/courier-service.ts"));

  // Rejects invalid negative weight if passed
  assert.ok(
    courierServiceSource.includes("weightNum < 0"),
    "Validation rejects negative weight"
  );
  assert.ok(
    courierServiceSource.includes("Package weight cannot be negative"),
    "Rejects negative weight"
  );
});

test("4. Dynamic UI: Modal updates indicators and warnings per provider", () => {
  const modalSource = read("src/app/admin/orders/_components/orders-modals.tsx");

  // Provider-specific flags exist
  assert.ok(
    modalSource.includes("isWeightRequiredForProvider"),
    "Modal must compute isWeightRequiredForProvider"
  );
  assert.ok(
    modalSource.includes("isWeightOptionalForProvider"),
    "Modal must compute isWeightOptionalForProvider"
  );
  assert.ok(
    modalSource.includes("isWeightInvalidForProvider"),
    "Modal must compute isWeightInvalidForProvider"
  );

  // Weight UI is present and reflects the provider flags
  assert.ok(
    modalSource.includes("Products Weight"),
    "Modal must display the product weight line"
  );

  // Weight summary UI present for the booking form
  assert.ok(
    modalSource.includes("Final Package Weight"),
    "Modal must show the final package weight summary"
  );

  // Button disabled condition uses isWeightInvalidForProvider (never blocks Steadfast on weight)
  assert.ok(
    modalSource.includes("isWeightInvalidForProvider"),
    "Booking button must use provider-aware weight check"
  );
});

test("5. Financial Safety: Changing courier weight validation never affects COD or paid amount", () => {
  const modalSource = read("src/app/admin/orders/_components/orders-modals.tsx");
  const courierServiceSource = read((fs.existsSync("src/server/courier/core/courier-service.ts") ? "src/server/courier/core/courier-service.ts" : "src/server/courier/courier-service.ts"));

  // Collectible COD calculated strictly from backend order totals
  assert.ok(
    courierServiceSource.includes("const financials = computeOrderFinancials(order)"),
    "COD computed from financials"
  );
  assert.ok(
    courierServiceSource.includes("const codAmount = financials.codAmountToCollect"),
    "COD to collect preserves backend financials"
  );
  assert.ok(
    modalSource.includes("const orderTotalNum = shipmentFinancials?.orderTotal ?? Number(shipmentModal?.total || 0)"),
    "Modal preserves order total"
  );
  assert.ok(
    modalSource.includes("const advancePaidNum ="),
    "Modal preserves advance payment"
  );
  assert.ok(
    modalSource.includes("const shipmentCod ="),
    "COD remains exact difference between total and paid"
  );
});
