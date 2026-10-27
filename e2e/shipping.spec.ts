import { test, expect } from "@playwright/test";
import {
  calculateShipping,
  DEFAULT_SHIPPING_SETTINGS,
  isInsideDhaka,
  normalizeShippingSettings,
  parseProductFee,
  type ShippingSettings,
} from "../src/lib/shipping";
import { addFirstProductToCart, suppressPromoPopup } from "./helpers";

const store: ShippingSettings = { insideDhaka: 60, outsideDhaka: 120, freeDeliveryThreshold: 0 };

test.describe("shipping rule (pure)", () => {
  test("Dhaka pays the inside rate, every other district the outside rate", () => {
    expect(calculateShipping({ subtotal: 1000, district: "Dhaka", settings: store })).toMatchObject({ fee: 60, zone: "inside", zoneKnown: true });
    expect(calculateShipping({ subtotal: 1000, district: " dhaka city ", settings: store }).fee).toBe(60);
    expect(calculateShipping({ subtotal: 1000, district: "Sylhet", settings: store })).toMatchObject({ fee: 120, zone: "outside" });
  });

  test("before a district is chosen it estimates with the inside-Dhaka rate", () => {
    expect(calculateShipping({ subtotal: 1000, settings: store })).toMatchObject({ fee: 60, zone: "inside", zoneKnown: false });
  });

  test("a large order is NOT free when the free-delivery threshold is off (0)", () => {
    // Regression: a hard-coded 3,000 rule made a ৳7,990 order show "Free".
    const quote = calculateShipping({ subtotal: 7990, district: "Dhaka", settings: store });
    expect(quote.fee).toBe(60);
    expect(quote.isFree).toBe(false);
    expect(quote.freeByThreshold).toBe(false);
    expect(quote.amountToFreeDelivery).toBeNull();
  });

  test("the threshold unlocks free delivery exactly at the amount", () => {
    const settings = { ...store, freeDeliveryThreshold: 15000 };
    const below = calculateShipping({ subtotal: 14999, district: "Sylhet", settings });
    expect(below).toMatchObject({ fee: 120, freeByThreshold: false, amountToFreeDelivery: 1 });
    const at = calculateShipping({ subtotal: 15000, district: "Sylhet", settings });
    expect(at).toMatchObject({ fee: 0, isFree: true, freeByThreshold: true, amountToFreeDelivery: null });
  });

  test("an order pays one charge: the highest fee among its products", () => {
    const rates = [{ inside: 40 }, { inside: 100 }, {}];
    expect(calculateShipping({ subtotal: 500, district: "Dhaka", settings: store, itemRates: rates }).fee).toBe(100);
  });

  test("a product fee of 0 ships free, but only if no other product charges", () => {
    expect(calculateShipping({ subtotal: 500, district: "Dhaka", settings: store, itemRates: [{ inside: 0 }] })).toMatchObject({ fee: 0, isFree: true, freeByThreshold: false });
    expect(calculateShipping({ subtotal: 500, district: "Dhaka", settings: store, itemRates: [{ inside: 0 }, {}] }).fee).toBe(60);
  });

  test("a product fee replaces the store rate for its zone only", () => {
    const rates = [{ inside: 90, outside: null }];
    expect(calculateShipping({ subtotal: 500, district: "Dhaka", settings: store, itemRates: rates }).fee).toBe(90);
    expect(calculateShipping({ subtotal: 500, district: "Khulna", settings: store, itemRates: rates }).fee).toBe(120);
  });

  test("settings from the database or a request body are cleaned up", () => {
    expect(normalizeShippingSettings(undefined)).toEqual(DEFAULT_SHIPPING_SETTINGS);
    expect(normalizeShippingSettings({ insideDhaka: "75", outsideDhaka: -5, freeDeliveryThreshold: "abc" })).toEqual({
      insideDhaka: 75,
      nearDhaka: DEFAULT_SHIPPING_SETTINGS.nearDhaka,
      outsideDhaka: DEFAULT_SHIPPING_SETTINGS.outsideDhaka,
      freeDeliveryThreshold: DEFAULT_SHIPPING_SETTINGS.freeDeliveryThreshold,
    });
  });

  test("stored product fees parse safely", () => {
    expect(parseProductFee("60")).toBe(60);
    expect(parseProductFee(0)).toBe(0);
    expect(parseProductFee("")).toBeNull();
    expect(parseProductFee(null)).toBeNull();
    expect(parseProductFee("free")).toBeNull();
    expect(parseProductFee("-3")).toBeNull();
    expect(isInsideDhaka("Dhaka")).toBe(true);
    expect(isInsideDhaka("Gazipur")).toBe(false);
  });
});

test.describe("shipping API", () => {
  test("public settings endpoint returns valid numbers", async ({ request }) => {
    const res = await request.get("/api/shipping/settings");
    expect(res.ok()).toBeTruthy();
    const settings = await res.json();
    for (const key of ["insideDhaka", "outsideDhaka", "freeDeliveryThreshold"]) {
      expect(Number.isFinite(settings[key])).toBe(true);
      expect(settings[key]).toBeGreaterThanOrEqual(0);
    }
  });

  test("quote follows the saved settings for Dhaka and outside Dhaka", async ({ request }) => {
    const settings = await (await request.get("/api/shipping/settings")).json();
    const items = [{ productId: 0, price: 7990, quantity: 1 }];
    const free = settings.freeDeliveryThreshold > 0 && 7990 >= settings.freeDeliveryThreshold;

    const inside = await (await request.post("/api/shipping/quote", { data: { district: "Dhaka", items } })).json();
    expect(inside.quote.fee).toBe(free ? 0 : settings.insideDhaka);
    expect(inside.quote.zone).toBe("inside");

    const outside = await (await request.post("/api/shipping/quote", { data: { district: "Sylhet", items } })).json();
    expect(outside.quote.fee).toBe(free ? 0 : settings.outsideDhaka);
    expect(outside.quote.zone).toBe("outside");
  });

  test("the quote endpoint rejects garbage instead of crashing", async ({ request }) => {
    const res = await request.post("/api/shipping/quote", {
      data: Buffer.from("{ this is not valid json"),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
  });

  test("the admin save endpoint is not open to the public", async ({ request }) => {
    const res = await request.post("/api/admin/settings/shipping", { data: { insideDhaka: 1, outsideDhaka: 1, freeDeliveryThreshold: 0 } });
    expect([401, 403]).toContain(res.status());
  });
});

test.describe("checkout shows the saved delivery rate", () => {
  test("Shipment row matches the server quote and is never 'Free' by accident", async ({ page, request }) => {
    await suppressPromoPopup(page);
    await addFirstProductToCart(page);
    await page.goto("/checkout");

    const cart = await page.evaluate(() => JSON.parse(localStorage.getItem("netbazer-cart") || "{}"));
    const items = (cart.state?.items ?? []).map((i: { productId: number; price: number; quantity: number }) => ({
      productId: i.productId,
      price: i.price,
      quantity: i.quantity,
    }));
    expect(items.length).toBeGreaterThan(0);

    const deliveryRow = page.getByText("Delivery", { exact: true }).locator("xpath=..");
    const district = page.locator('select[name="district"]');
    const dhaka = page.locator('select[name="district"] option[value="Dhaka"]');
    await expect(dhaka).toHaveCount(1);

    for (const name of ["Dhaka", "Sylhet"]) {
      await district.selectOption(name);
      const { quote } = await (await request.post("/api/shipping/quote", { data: { district: name, items } })).json();
      const expectedFee = quote.isFree ? "Free" : String(quote.fee);
      await expect(deliveryRow).toContainText(expectedFee);
    }
  });
});
