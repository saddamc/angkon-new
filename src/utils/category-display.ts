// Generic fallback for categories with no WooCommerce image set — never assume
// specific category names/slugs, the catalog is store-defined.
export const DEFAULT_CATEGORY_EMOJI = "🛍️";

export function categoryEmoji(): string {
  return DEFAULT_CATEGORY_EMOJI;
}

const NAMED_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#039;": "'",
  "&nbsp;": " ",
};

// WordPress/WooCommerce REST responses HTML-entity-encode category names and
// descriptions (e.g. "Camera & Photography" -> "Camera &amp; Photography",
// or an emoji stored as a numeric ref like &#x1F4F1;). Decode both named and
// numeric entities so real category text renders correctly on the storefront.
export function decodeHtmlCharCodes(str?: string): string {
  if (!str) return "";
  return str
    .replace(/&#x([0-9A-Fa-f]+);/g, (_match, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&(amp|lt|gt|quot|apos|#039|nbsp);/g, (match) => NAMED_ENTITIES[match] ?? match);
}

export function categoryDisplayName(name: string): string {
  const decoded = decodeHtmlCharCodes(name);
  return decoded.replace(/^[^\w\s]+/, "").trim() || decoded;
}
