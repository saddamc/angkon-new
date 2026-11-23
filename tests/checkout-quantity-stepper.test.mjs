import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");
const summary = read("src/app/checkout/_components/startech-order-summary.tsx");
const cartStore = read("src/store/cart-store.ts");

test("checkout order-summary minus never removes the last item", () => {
  // The minus button must be disabled at quantity 1 and must not call onRemoveItem.
  assert.ok(
    summary.includes("disabled={item.quantity <= 1}"),
    "minus button should be disabled at quantity 1"
  );
  assert.ok(
    !summary.includes("onRemoveItem?.(item.productId, item.size, item.color)") ||
      summary.indexOf("onRemoveItem?.(item.productId, item.size, item.color)") !==
        summary.indexOf("item.quantity - 1"),
    "minus button should not trigger remove"
  );
});

test("cart store clamps quantity between 1 and 99", () => {
  assert.ok(
    cartStore.includes("Math.min(99, Math.max(1, quantity))"),
    "updateQuantity must clamp to [1, 99]"
  );
  assert.ok(
    cartStore.includes("Math.min(MAX_QTY, cartItem.quantity + item.quantity)"),
    "addItem must cap cumulative quantity at 99"
  );
});
