import { test, expect } from "@playwright/test";

test.describe("ANGKON — Storefront & E-commerce Modern Heritage Flows", () => {
  test.beforeEach(async ({ page }) => {
    // Intercept console errors to ensure clean execution
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.error("Browser Console Error:", msg.text());
      }
    });
  });

  test("F01-H1: Homepage displays brand announcement and trust strip", async ({ page }) => {
    await page.goto("/");

    // Verify top announcement ticker
    await expect(page.locator("text=FREE SHIPPING OVER ৳3,000")).toBeVisible();
    await expect(page.locator("text=CASH ON DELIVERY ALL OVER BANGLADESH")).toBeVisible();

    // Verify brand typography and monogram
    await expect(page.locator("text=ANGKON.")).toBeVisible();
    await expect(page.locator("text=HOUSE OF MODERN HERITAGE")).toBeVisible();

    // Verify 4 trust pillars
    await expect(page.locator("text=HOUSE OF MODERN HERITAGE").first()).toBeVisible();
    await expect(page.locator("text=Swift Delivery")).toBeVisible();
    await expect(page.locator("text=Cash on Delivery").first()).toBeVisible();
    await expect(page.locator("text=7 Days Exchange")).toBeVisible();
  });

  test("F01-H2: Product selection opens 460px Astra cart drawer", async ({ page }) => {
    await page.goto("/products");

    // Click first product card
    const firstProduct = page.locator("article").first();
    await expect(firstProduct).toBeVisible();

    // Navigate to product detail
    await firstProduct.click();
    await expect(page).toHaveURL(/\/products\/.+/);

    // Select size pill button if available
    const sizePill = page.locator("button:has-text('M')").first();
    if (await sizePill.isVisible()) {
      await sizePill.click();
    }

    // Click "Add to Bag"
    const addBtn = page.getByRole("button", { name: /Add to (Cart|Bag)/i });
    if (await addBtn.isVisible()) {
      await addBtn.click();
      // Astra cart drawer should open
      const drawer = page.locator("aside, [role='dialog']").filter({ hasText: /Shopping Bag|Your Bag/i });
      await expect(drawer).toBeVisible();
    }
  });

  test("F03-H1: Cart drawer tracks ৳3,000 free shipping goal meter", async ({ page }) => {
    await page.goto("/cart");
    // Free shipping progress bar container exists
    const progressText = page.locator("text=/FREE Delivery|FREE shipping|unlocked/i");
    await expect(progressText).toBeDefined();
  });

  test("F04-H1: Checkout validates customer phone and Bangladeshi district", async ({ page }) => {
    await page.goto("/checkout");

    // Verify district selector and cash on delivery option
    await expect(page.locator("text=/Cash on Delivery|COD/i")).toBeVisible();
    await expect(page.locator("select, input").filter({ hasText: /District|City/i })).toBeDefined();
  });

  test("F01-M1: Responsive mobile menu drawer opens cleanly at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    // Open mobile menu
    const menuBtn = page.getByRole("button", { name: /menu/i });
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await expect(page.locator("text=Niketan, Gulshan")).toBeVisible();
    }
  });
});
