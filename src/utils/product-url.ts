/** Public storefront origin (not WordPress / admin host). */
export function getStorefrontOrigin(): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")
      : undefined;
  if (fromEnv) return fromEnv;
  return "https://angkon.net";
}

/** URL-friendly slug from product name for /products/{slug} URLs. */
export function slugifyProductName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
  return slug || "product";
}

/** Production product page URL using the name-based slug. */
export function getProductPageUrl(slugOrName: string, opts?: { fromName?: boolean }): string {
  const slug = opts?.fromName
    ? slugifyProductName(slugOrName)
    : slugOrName.trim() || "product";
  return `${getStorefrontOrigin()}/products/${slug}`;
}
