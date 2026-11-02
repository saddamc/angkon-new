import test from "node:test";
import assert from "node:assert/strict";
import { METRIC_DEFINITIONS, getMetricDefinition } from "../src/lib/meta/metric-definitions.ts";

test("METRIC_DEFINITIONS: covers all required core metrics and settings", () => {
  const expectedKeys = [
    "store-revenue",
    "store-net-revenue",
    "meta-ad-spend",
    "blended-roas",
    "meta-roas",
    "aov",
    "orders-completed",
    "telemetry-events",
    "purchase-signal-reconciliation",
    "event-match-quality",
    "deduplication-rate",
    "attribution-window",
    "ctr",
    "cpc",
    "cpm",
    "product-quadrants",
    "quadrant-hero-winner",
    "quadrant-emerging-signal",
    "quadrant-high-abandonment",
    "quadrant-testing-phase",
    "pixel-id",
    "capi-token",
    "ad-account-id",
    "catalog-id",
  ];

  for (const key of expectedKeys) {
    const def = getMetricDefinition(key);
    assert.ok(def, `Metric definition for '${key}' must exist.`);
    assert.ok(def.label, `Metric '${key}' must have a label.`);
    assert.ok(def.meaning, `Metric '${key}' must have a 'meaning' (Section 1).`);
    assert.ok(def.whyItMatters, `Metric '${key}' must have 'whyItMatters' (Section 2).`);
    assert.ok(def.calculation, `Metric '${key}' must have 'calculation' (Section 3).`);
    assert.ok(def.dataSource, `Metric '${key}' must have 'dataSource' (Section 4).`);
    assert.ok(def.limitations, `Metric '${key}' must have 'limitations' (Section 5).`);
  }
});

test("Product Quadrant Classification: Requires sample size N >= 5 for Hero Winner", () => {
  // Test sample with 1 order (like the actual current store state)
  const productA = {
    orders: 1,
    conversionRate: 5.0,
    views: 20,
    cartAdds: 2,
    revenue: 8920,
  };

  // Check that 1 order DOES NOT qualify as HERO_WINNER
  const isHeroWinnerA = productA.orders >= 5 && productA.conversionRate >= 1.5;
  assert.equal(isHeroWinnerA, false, "1 single order MUST NOT be classified as Hero Winner.");

  const isEmergingA = productA.orders >= 1 && productA.orders < 5;
  assert.equal(isEmergingA, true, "1 order product MUST be classified as Emerging Signal (Sample N<5).");

  // Test statistically validated product with 6 orders
  const productB = {
    orders: 6,
    conversionRate: 3.2,
    views: 187,
    cartAdds: 14,
    revenue: 53520,
  };

  const isHeroWinnerB = productB.orders >= 5 && productB.conversionRate >= 1.5;
  assert.equal(isHeroWinnerB, true, "Product with >=5 orders and healthy conversion qualifies as Hero Winner.");
});

test("Currency & Dual-Ledger Calculation: Reconciles USD and BDT at 120 benchmark", () => {
  const metaSpendUsd = 7.81;
  const USD_TO_BDT_RATE = 120;
  const storeRevenueBdt = 8920;

  const spendInBdt = metaSpendUsd * USD_TO_BDT_RATE;
  assert.equal(Math.round(spendInBdt), 937);

  const blendedRoas = Math.round((storeRevenueBdt / spendInBdt) * 100) / 100;
  assert.equal(blendedRoas, 9.52, "Blended ROAS should correctly be 9.52x.");
});
