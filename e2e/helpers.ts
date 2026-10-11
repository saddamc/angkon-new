import { expect, type Page } from "@playwright/test";

/** Open the first product from the shop page and add it to the cart. */
export async function addFirstProductToCart(page: Page) {
  await page.goto("/products");
  const firstCard = page.locator("article").first();
  await expect(firstCard).toBeVisible();

  // Cards aren't one big link — open the product through its title.
  await firstCard.locator('a[href^="/products/"]:has(h3)').first().click();
  // The first visit to a product page can take a while to compile on the dev server.
  await expect(page).toHaveURL(/\/products\/.+/, { timeout: 60_000 });

  // Pick the first size if the product has sizes.
  const sizeButtons = page.locator("button").filter({ hasText: /^(XS|S|M|L|XL|XXL)$/i });
  if (await sizeButtons.count()) {
    await sizeButtons.first().click();
  }

  await page.getByRole("button", { name: /add to (cart|bag)/i }).first().click();
  await expect(page.getByLabel("Shopping Cart Drawer")).toBeVisible();
}

/** The home-page promo popup covers the screen; real visitors close it, tests skip it. */
export async function suppressPromoPopup(page: Page) {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("angkon_promo_seen", "true");
    } catch {
      /* storage unavailable */
    }
  });
}
