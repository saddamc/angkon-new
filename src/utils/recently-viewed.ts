export interface RecentlyViewedProduct {
  id: number | string;
  name: string;
  slug: string;
  permalink: string;
  price: string;
  image: string;
  timestamp: number;
}

export const DEFAULT_RECENTLY_VIEWED: RecentlyViewedProduct[] = [
  {
    id: 216931,
    name: "AFC001 Dept. of Football Studies (Football Skull) T-Shirt Black – Plaantik",
    slug: "afc001-dept-of-football-studies-football-skull-t-shirt-black-plaantik",
    permalink: "/products/afc001-dept-of-football-studies-football-skull-t-shirt-black-plaantik",
    price: "1250",
    image: "https://gorurghash.com/wp-content/uploads/2026/08/Font.jpg",
    timestamp: 1,
  },
  {
    id: 227719,
    name: "Sculpt Yoga Pants in Black",
    slug: "sculpt-yoga-pants-in-black",
    permalink: "/products/sculpt-yoga-pants-in-black",
    price: "1500",
    image: "https://gorurghash.com/wp-content/uploads/2026/09/hf_20260829_112819_319a04c9-244f-407b-b1fd-5e8a9eabc0cf.jpg",
    timestamp: 2,
  },
  {
    id: 227720,
    name: "Baggy Fit Cargo Pants in Off White",
    slug: "baggy-fit-cargo-pants-in-off-white",
    permalink: "/products/baggy-fit-cargo-pants-in-off-white",
    price: "1850",
    image: "https://gorurghash.com/wp-content/uploads/2026/08/hf_20260827_073132_b17d6815-31ec-4d0c-a63b-2f11b0ad6c9d-copy.jpg",
    timestamp: 3,
  },
];

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
      image: product.image || "https://gorurghash.com/wp-content/uploads/2026/08/Font.jpg",
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
