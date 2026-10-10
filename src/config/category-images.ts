/**
 * CATEGORY IMAGE CONFIGURATION & OVERRIDES
 *
 * How to change category images in ANGKON:
 *
 * 1. VIA WORDPRESS / WOOCOMMERCE ADMIN (Production):
 *    - Go to WordPress Admin -> Products -> Categories
 *    - Edit any category (e.g. "Women", "Co-ord Set", "Polos")
 *    - Upload or select an image in the "Thumbnail" / "Image" field and save.
 *    - The Next.js storefront automatically displays this image via the WooCommerce REST API.
 *
 * 2. VIA CODE OVERRIDE (Instant local or custom branding):
 *    - Add an entry below in `CATEGORY_IMAGE_OVERRIDES` with the category slug.
 *    - You can use:
 *      a) A local static file placed in the `public/` directory (e.g. "/banners/custom-women.jpg")
 *      b) Any remote HTTPS image URL (e.g. "https://gorurghash.com/wp-content/uploads/...")
 *
 * 3. VIA STATIC JSON DATA (Offline/Fallback):
 *    - Edit `src/data/real-categories.json` and change the `"image": { "src": "..." }` URL for that category.
 */

export const CATEGORY_IMAGE_OVERRIDES: Record<string, string> = {
  // Example overrides (uncomment and replace with your desired URL or /public path):
  // "women": "/banners/women-hero.jpg",
  // "co-rd-set": "https://gorurghash.com/wp-content/uploads/2024/05/605A1368-copy-scaled-e1716446723781.jpg",
};

/**
 * Resolves the display image for any category.
 * Priority: Override Map -> Category API / JSON image -> undefined.
 */
export function getCategoryImage(category: {
  slug?: string;
  image?: { src?: string | null } | null;
}): string | undefined {
  if (category.slug && CATEGORY_IMAGE_OVERRIDES[category.slug]) {
    return CATEGORY_IMAGE_OVERRIDES[category.slug];
  }
  return category.image?.src || undefined;
}
