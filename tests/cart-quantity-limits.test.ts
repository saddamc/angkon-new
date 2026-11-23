import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

class LocalStorageMock {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

describe("cart store quantity guardrails", () => {
  before(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: new LocalStorageMock(),
      configurable: true,
      writable: true,
    });
  });

  it("never lets a line quantity drop below 1", async () => {
    const { useCartStore } = await import("../src/store/cart-store");
    const store = useCartStore.getState();
    store.clearCart();

    store.addItem({
      productId: 101,
      slug: "test-product",
      name: "Test Product",
      price: 1000,
      quantity: 2,
      size: "M",
      color: "black",
      image: "/test.webp",
    });

    store.updateQuantity(101, "M", 0, "black");
    assert.equal(useCartStore.getState().items[0].quantity, 1);
  });

  it("caps quantity at 99 when adding or updating", async () => {
    const { useCartStore } = await import("../src/store/cart-store");
    const store = useCartStore.getState();
    store.clearCart();

    store.addItem({
      productId: 102,
      slug: "test-product-2",
      name: "Test Product 2",
      price: 500,
      quantity: 120,
      size: "L",
      color: "red",
      image: "/test2.webp",
    });
    assert.equal(useCartStore.getState().items[0].quantity, 99);

    store.updateQuantity(102, "L", 200, "red");
    assert.equal(useCartStore.getState().items[0].quantity, 99);
  });

  it("caps cumulative quantity at 99 when the same item is added again", async () => {
    const { useCartStore } = await import("../src/store/cart-store");
    const store = useCartStore.getState();
    store.clearCart();

    store.addItem({
      productId: 103,
      slug: "test-product-3",
      name: "Test Product 3",
      price: 800,
      quantity: 80,
      size: "XL",
      color: "blue",
      image: "/test3.webp",
    });

    store.addItem({
      productId: 103,
      slug: "test-product-3",
      name: "Test Product 3",
      price: 800,
      quantity: 50,
      size: "XL",
      color: "blue",
      image: "/test3.webp",
    });

    assert.equal(useCartStore.getState().items[0].quantity, 99);
  });
});
