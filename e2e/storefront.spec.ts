import { test, expect, type Page } from "@playwright/test";

// The home-page promo popup covers the screen; real visitors close it, tests skip it.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("angkon_promo_seen", "true");
    } catch {
      /* storage unavailable */
    }
  });
});

/** Open the first product from the shop page and add it to the cart. */
async function addFirstProductToCart(page: Page) {
  await page.goto("/products");
  const firstCard = page.locator("article").first();
  await expect(firstCard).toBeVisible();

  // Cards aren't one big link — open the product through its title.
  await firstCard.locator('a[href^="/products/"]:has(h3)').first().click();
  await expect(page).toHaveURL(/\/products\/.+/);

  // Pick the first size if the product has sizes.
  const sizeButtons = page.locator("button").filter({ hasText: /^(XS|S|M|L|XL|XXL)$/i });
  if (await sizeButtons.count()) {
    await sizeButtons.first().click();
  }

  await page.getByRole("button", { name: /add to (cart|bag)/i }).first().click();
  await expect(page.getByLabel("Shopping Cart Drawer")).toBeVisible();
}

test.describe("ANGKON storefront", () => {
  test("home page shows the brand, navigation and cash-on-delivery band", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "ANGKON", exact: true }).first()).toBeVisible();
    await expect(page.getByText("Cash on Delivery in all 64 Districts")).toBeVisible();
    await expect(page.getByRole("button", { name: "Open search" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "View shopping cart" })).toBeVisible();
  });

  test("a product card opens the product page and adds the item to the cart", async ({ page }) => {
    await addFirstProductToCart(page);
  });

  test("an empty cart shows the empty state and a way back to the shop", async ({ page }) => {
    await page.goto("/cart");

    await expect(page.getByRole("heading", { name: "Your Bag is Empty" })).toBeVisible();
    await expect(page.getByRole("link", { name: /browse collections/i })).toHaveAttribute("href", "/products");
  });

  test("checkout offers cash on delivery and the customer details form", async ({ page }) => {
    // The form only appears when the cart has something in it.
    await addFirstProductToCart(page);
    await page.goto("/checkout");

    await expect(page.getByText(/cash on delivery/i).first()).toBeVisible();
    for (const field of ["name", "phone", "email", "district"]) {
      await expect(page.locator(`[name="${field}"]`)).toHaveCount(1);
    }
  });

  test("mobile menu opens at 390px and shows the showroom address", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const menuButton = page.getByRole("button", { name: "Open navigation menu" });
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    await expect(page.getByText("Niketan, Gulshan").first()).toBeVisible();
  });
});

test.describe("ANGKON account", () => {
  test("signed-out visitors see sign-in and registration forms", async ({ page }) => {
    await page.goto("/my-account");

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Forgot password?" })).toBeVisible();
  });

  test("forgot-password form opens from the sign-in form", async ({ page }) => {
    await page.goto("/my-account");
    await page.getByRole("button", { name: "Forgot password?" }).click();

    await expect(page.getByRole("heading", { name: "Reset password" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send reset link" })).toBeVisible();
  });

  test("an invalid or used reset link is rejected", async ({ page }) => {
    await page.goto("/my-account/reset-password?token=not-a-real-token-0000000000000000");

    await expect(page.getByText(/expired or was already used/i)).toBeVisible();
  });

  test("an invalid verification link lands on the account page with an error", async ({ page }) => {
    await page.goto("/api/auth/verify?token=not-a-real-token-0000000000000000");

    await expect(page).toHaveURL(/\/my-account/);
    await expect(page.getByText(/verification link has expired or was already used/i)).toBeVisible();
  });
});
