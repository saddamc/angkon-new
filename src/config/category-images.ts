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
 *      b) Any remote HTTPS image URL (e.g. "https://your-cdn.example.com/banners/women.jpg")
 *
 * 3. VIA STATIC JSON DATA (Offline/Fallback):
 *    - Edit `src/data/real-categories.json` and change the `"image": { "src": "..." }` URL for that category.
 */

export const CATEGORY_IMAGE_OVERRIDES: Record<string, string> = {
  // Example overrides:
  // "women": "/banners/women-banner.webp",
  // "men": "/banners/men-banner.webp",
};

/**
 * Fallback brand banner resolver based on category slug
 */
function resolveBrandBannerBySlug(slug?: string): string {
  if (!slug) return "/banners/tees.webp";
  const s = slug.toLowerCase();

  if (s === "tawakkal" || s === "3-piece-suit" || s === "wada-collection") {
    return "https://res.cloudinary.com/drtzgyetn/image/upload/v1791652408/ANGKON/WOMEN/ETHNIC/tawakkal-wada-midnight-black/1.jpg";
  }
  if (s === "ethnic" || s.includes("ethnic")) return "/banners/ethnic-wear.webp";
  if (s === "men") return "/banners/men-banner.webp";
  if (s === "women") return "/banners/women-banner.webp";
  if (s === "mighto") return "/banners/mighto-home-banner.webp";
  if (s === "mighto-men") return "/banners/mighto-men-card.webp";
  if (s === "mighto-women") return "/banners/mighto-women-card.webp";
  if (s.includes("polo")) return "/banners/polos.webp";

  if (s.includes("tee") || s.includes("tshirt") || s.includes("t-shirt") || s.includes("henley") || s.includes("basic") || s.includes("drop")) {
    return "/banners/tees.webp";
  }
  if (s.includes("shirt") || s.includes("collar") || s.includes("cuban") || s.includes("button-down") || s.includes("flannel") || s.includes("half-sleeve") || s.includes("safari") || s.includes("crochet")) {
    return "/banners/half-sleeves.webp";
  }
  if (s.includes("hoodie") || s.includes("jacket") || s.includes("coat") || s.includes("turtleneck") || s.includes("bomber") || s.includes("shacket") || s.includes("puffer") || s.includes("leather") || s.includes("full-sleeve")) {
    return "/banners/full-sleeves.webp";
  }
  if (s.includes("pant") || s.includes("cargo") || s.includes("denim") || s.includes("short") || s.includes("skirt") || s.includes("cord-pant") || s.includes("relaxed") || s.includes("cord")) {
    return "/banners/pants.webp";
  }
  if (s.includes("top") || s.includes("co-ord") || s.includes("co-rd") || s.includes("kimono") || s.includes("silk") || s.includes("blouse") || s.includes("ruffle")) {
    return "/banners/tops.webp";
  }
  if (s.includes("access") || s.includes("cap") || s.includes("hat") || s.includes("jewelry") || s.includes("jewel") || s.includes("wallet") || s.includes("bag") || s.includes("sock") || s.includes("ring") || s.includes("bracelet") || s.includes("earring") || s.includes("necklace")) {
    return "/banners/accessories.webp";
  }

  return "/banners/tees.webp";
}

/**
 * Resolves the display image for any category.
 * Priority: Override Map -> Clean API / JSON image -> Brand banner fallback.
 */
export function getCategoryImage(category: {
  slug?: string;
  image?: { src?: string | null } | null;
}): string {
  if (category.slug && CATEGORY_IMAGE_OVERRIDES[category.slug]) {
    return CATEGORY_IMAGE_OVERRIDES[category.slug];
  }

  // Filter out any unwanted external domain references
  if (category.image?.src && !category.image.src.includes("gorurghash")) {
    return category.image.src;
  }

  return resolveBrandBannerBySlug(category.slug);
}
