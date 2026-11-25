"use client";

export interface StoredImageItem {
  id?: number | string;
  productId?: number | string;
  slug?: string;
  image?: string;
}

export const STORED_IMAGE_FALLBACK = "/placeholder.webp";

let cachedMapPromise: Promise<Map<string, string>> | null = null;

/**
 * Fetches live product primary images once per browser session so stale
 * localStorage entries (Recently Viewed, Cart, Wishlist) self-heal.
 */
export async function fetchLiveProductImageMap(): Promise<Map<string, string>> {
  if (typeof window === "undefined") return new Map();
  if (cachedMapPromise) return cachedMapPromise;

  cachedMapPromise = (async () => {
    const map = new Map<string, string>();
    try {
      const res = await fetch("/api/products?perPage=100");
      if (!res.ok) return map;
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      for (const p of list) {
        const src = String(p?.images?.[0]?.src || "").trim();
        if (!src) continue;
        if (p?.id !== undefined && p?.id !== null) {
          map.set(String(p.id), src);
        }
        if (p?.slug) {
          map.set(String(p.slug).toLowerCase().trim(), src);
        }
      }
    } catch {
      // Keep existing images if offline or request fails
    }
    return map;
  })();

  return cachedMapPromise;
}

/**
 * Replaces stale `image` URLs on stored items using the live product image map.
 */
export function resolveStoredItemImages<T extends StoredImageItem>(
  items: T[],
  imageMap: Map<string, string>
): { items: T[]; changed: boolean } {
  if (items.length === 0 || imageMap.size === 0) {
    return { items, changed: false };
  }

  let changed = false;
  const next = items.map((item) => {
    const idKey = item.productId ?? item.id;
    const slugKey = item.slug ? String(item.slug).toLowerCase().trim() : "";
    const liveSrc =
      (idKey !== undefined && idKey !== null ? imageMap.get(String(idKey)) : undefined) ||
      (slugKey ? imageMap.get(slugKey) : undefined);

    if (liveSrc && liveSrc !== item.image) {
      changed = true;
      return { ...item, image: liveSrc };
    }
    return item;
  });

  return { items: next, changed };
}
