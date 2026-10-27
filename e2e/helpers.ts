import { expect, type Page } from "@playwright/test";

/** Open the first product from the shop page and add it to the cart. */
export async function addFirstProductToCart(page: Page) {
  await page.goto("/products");
  const firstCard = page.locator("article").first();
  await expect(firstCard).toBeVisible();

  // Direct navigation via product href is much more reliable across client-side hydration
  const productLink = firstCard.locator('a[href^="/products/"]').first();
  const href = await productLink.getAttribute("href");
  if (href) {
    await page.goto(href);
  } else {
    await productLink.click();
  }

  // Ensure product page is fully loaded
  await expect(page).toHaveURL(/\/products\/.+/, { timeout: 60_000 });

  // Pick a size if the product requires sizes
  const sizeOption = page.locator("button").filter({ hasText: /^(XS|S|M|L|XL|XXL|Standard|Free Size)$/i }).first();
  if (await sizeOption.count()) {
    await sizeOption.click();
  }

  const addToCartBtn = page.getByRole("button", { name: /add to cart/i }).first();
  await expect(addToCartBtn).toBeVisible();
  await addToCartBtn.click();

  // The cart drawer opens automatically upon adding to cart
  await expect(page.getByLabel("Shopping Cart Drawer")).toBeVisible({ timeout: 15_000 });
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
