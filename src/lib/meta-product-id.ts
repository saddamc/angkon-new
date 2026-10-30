/**
 * Canonical Meta product identifier helpers.
 *
 * ANGKON historically stored WooCommerce-style identifiers in some imports
 * (`wc_post_228001`) while the storefront Pixel/CAPI pipeline has always sent
 * the numeric product id (`228001`). Catalog feed item ids, browser Pixel
 * `content_ids`, and server CAPI `content_ids` must be byte-for-byte identical
 * or Meta cannot match catalog items to retargeting events.
 *
 * The canonical identifier is the numeric product id as a string. The legacy
 * `wc_post_` prefix is accepted on input and stripped, never emitted.
 */

export const META_PRODUCT_ID_PREFIX = "wc_post_";

/** Strictly normalizes a catalog product id. Returns null for unusable values. */
export function normalizeMetaProductId(value: unknown): string | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) return null;
    return String(value);
  }

  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;

  const withoutPrefix = raw.replace(/^wc_post_/i, "").trim();
  if (!/^\d+$/.test(withoutPrefix)) return null;

  const numeric = Number(withoutPrefix);
  if (!Number.isSafeInteger(numeric) || numeric <= 0) return null;
  return String(numeric);
}

/** Lenient normalization for event payloads: unknown identifiers are preserved. */
export function normalizeMetaContentId(value: unknown): string | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : null;
  }

  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;

  if (/^wc_post_\d+$/i.test(raw)) {
    return normalizeMetaProductId(raw);
  }

  return raw;
}

/** Normalizes an array of Pixel/CAPI content ids in place-safe fashion. */
export function normalizeMetaContentIds(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeMetaContentId(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

export function isCanonicalMetaProductId(value: unknown): boolean {
  return normalizeMetaProductId(value) === (typeof value === "string" ? value.trim() : String(value));
}
