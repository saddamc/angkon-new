export interface RecentlyViewedProduct {
  id: number | string;
  name: string;
  slug: string;
  permalink: string;
  price: string;
  image: string;
  timestamp: number;
}

/** Nothing is pre-filled: the list only shows products this visitor has actually viewed. */
export const DEFAULT_RECENTLY_VIEWED: RecentlyViewedProduct[] = [];

const FALLBACK_IMAGE = "/angkon-logo-fb.jpg";
const STORAGE_KEY = "recently_viewed_products";

export function formatRecentlyViewedPrice(price: string | number): string {
  const numeric = typeof price === "number" ? price : parseFloat(String(price).replace(/[^0-9.]/g, ""));
  if (isNaN(numeric)) return "Tk0.00";
  return `Tk${numeric.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function saveRecentlyViewed(product: {
  id: number | string;
  name: string;
  slug: string;
  price: string;
  image?: string;
}): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let list: RecentlyViewedProduct[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];

    const item: RecentlyViewedProduct = {
      id: product.id,
      name: product.name.replace(/&#8211;/g, "–").replace(/&amp;/g, "&"),
      slug: product.slug,
      permalink: `/products/${product.slug}`,
      price: product.price,
      image: product.image || FALLBACK_IMAGE,
      timestamp: Date.now(),
    };

    list = [item, ...list.filter((p) => p.id !== product.id && p.slug !== product.slug)].slice(0, 8);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage quota / restricted context errors
  }
}

export function getRecentlyViewed(): RecentlyViewedProduct[] {
  if (typeof window === "undefined") return DEFAULT_RECENTLY_VIEWED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RECENTLY_VIEWED;
    const list = JSON.parse(raw);
    if (!Array.isArray(list) || list.length === 0) return DEFAULT_RECENTLY_VIEWED;
    return list;
  } catch {
    return DEFAULT_RECENTLY_VIEWED;
  }
}
