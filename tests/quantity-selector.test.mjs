import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

test("QuantitySelector component exists and exposes industry-standard minus, input, plus controls", () => {
  const compPath = path.join(rootDir, "src/components/product/quantity-selector.tsx");
  assert.ok(fs.existsSync(compPath), "quantity-selector.tsx must exist");
  const content = fs.readFileSync(compPath, "utf8");

  // Verify Minus and Plus icons
  assert.ok(content.includes("<Minus"), "Must contain Minus button icon");
  assert.ok(content.includes("<Plus"), "Must contain Plus button icon");

  // Verify accessible labels
  assert.ok(content.includes('aria-label="Decrease quantity"'), "Must have accessible label for decrement");
  assert.ok(content.includes('aria-label="Increase quantity"'), "Must have accessible label for increment");

  // Verify input element with spinbutton role
  assert.ok(content.includes('type="number"'), "Must provide direct numeric input");
  assert.ok(content.includes('role="spinbutton"'), "Must carry spinbutton ARIA role");
  assert.ok(content.includes("aria-valuenow"), "Must announce current value");
  assert.ok(content.includes("aria-valuemin"), "Must announce min value");
  assert.ok(content.includes("aria-valuemax"), "Must announce max value");

  // Verify clamping logic
  assert.ok(content.includes("Math.max(min,"), "Must enforce lower bound min");
  assert.ok(content.includes("Math.min(max,"), "Must enforce upper bound max");

  // Verify keyboard navigation
  assert.ok(content.includes("ArrowUp"), "Must handle ArrowUp key for increment");
  assert.ok(content.includes("ArrowDown"), "Must handle ArrowDown key for decrement");
});

test("ProductDetailsView integrates QuantitySelector seamlessly next to Add to Cart", () => {
  const detailsPath = path.join(rootDir, "src/components/product/product-details-view.tsx");
  assert.ok(fs.existsSync(detailsPath), "product-details-view.tsx must exist");
  const content = fs.readFileSync(detailsPath, "utf8");

  // Must import and use QuantitySelector
  assert.ok(
    content.includes('import { QuantitySelector } from "@/components/product/quantity-selector"'),
    "Must import QuantitySelector in ProductDetailsView"
  );
  assert.ok(
    content.includes("<QuantitySelector"),
    "Must render QuantitySelector in ProductDetailsView"
  );

  // Must no longer have the cramped bare input
  assert.ok(
    !content.includes('className="h-10 w-12 rounded border border-[#E1B76F]/40 bg-[#2d0302] text-center text-sm font-medium text-white outline-none focus:border-[#E1B76F] [appearance:textfield]'),
    "Old cramped numeric input must be removed"
  );

  // Both QuantitySelector and Add to Cart button must have matching height and luxury styling
  assert.ok(
    content.includes('size="default"'),
    "QuantitySelector must use default height (h-11) aligned with Add to Cart"
  );
  assert.ok(
    content.includes("ShoppingBag"),
    "Must have ShoppingBag icon integration"
  );
});

test("QuickViewModal integrates QuantitySelector", () => {
  const qvPath = path.join(rootDir, "src/components/product/quick-view-modal.tsx");
  assert.ok(fs.existsSync(qvPath), "quick-view-modal.tsx must exist");
  const content = fs.readFileSync(qvPath, "utf8");

  assert.ok(
    content.includes('import { QuantitySelector } from "@/components/product/quantity-selector"'),
    "Must import QuantitySelector in QuickViewModal"
  );
  assert.ok(
    content.includes("<QuantitySelector"),
    "Must render QuantitySelector in QuickViewModal"
  );
});
