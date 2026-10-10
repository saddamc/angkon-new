import type { WooProduct, WooReview } from "@/types/product";

interface ProductQuery {
  page?: number;
  perPage?: number;
  search?: string;
  category?: string;
}

const WC_BASE = (process.env.NEXT_PUBLIC_WC_API_URL ?? "https://netbazarbd.net").replace(/\/$/, "");
const WC_CK = process.env.NEXT_PUBLIC_WC_CONSUMER_KEY ?? "";
const WC_CS = process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET ?? "";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapWooProduct(raw: any): WooProduct {
  const sizeAttr = (raw.attributes ?? []).find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any) => a.name?.toLowerCase() === "size",
  );
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    permalink: raw.permalink ?? "",
    description: raw.description ?? "",
    short_description: raw.short_description ?? "",
    price: raw.price ?? "",
    regular_price: raw.regular_price ?? "",
    sale_price: raw.sale_price ?? "",
    on_sale: raw.on_sale ?? false,
    stock_status: raw.stock_status ?? "instock",
    sizes: sizeAttr?.options ?? [],
    images: raw.images ?? [],
    categories: raw.categories ?? [],
    tags: raw.tags ?? [],
    attributes: (raw.attributes ?? []).map((a: { id: number; name: string; options: string[]; visible: boolean }) => ({
      id: a.id,
      name: a.name,
      options: a.options ?? [],
      visible: a.visible ?? true,
    })),
    sku: raw.sku ?? undefined,
    shipping_class_id: raw.shipping_class_id ?? 0,
    stock_quantity: raw.stock_quantity ?? null,
    meta_data: raw.meta_data ?? [],
  };
}


function wcAuth(): string {
  return Buffer.from(`${WC_CK}:${WC_CS}`).toString("base64");
}

// WooCommerce filters products by numeric category ID, not slug — resolve first.
async function resolveCategoryId(categorySlug: string): Promise<number | null> {
  const params = new URLSearchParams({ slug: categorySlug });
  const response = await fetch(`${WC_BASE}/wp-json/wc/v3/products/categories?${params}`, {
    headers: { Authorization: `Basic ${wcAuth()}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const data = await response.json();
  return Array.isArray(data) && data.length > 0 ? data[0].id : null;
}

import REAL_PRODUCTS from "@/data/real-products.json";

const CATALOG: WooProduct[] = REAL_PRODUCTS as unknown as WooProduct[];

function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_WC_API_URL &&
    !process.env.NEXT_PUBLIC_WC_API_URL.includes("netbazarbd.net") &&
    WC_CK &&
    WC_CS
  );
}

export const getProducts = async (query: ProductQuery = {}): Promise<WooProduct[]> => {
  try {
    const { page = 1, perPage = 12, search, category } = query;

    if (!isConfigured()) {
      let list = [...CATALOG];
      if (search) {
        const q = search.toLowerCase();
        list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
      }
      if (category) {
        const catLower = category.toLowerCase();
        list = list.filter((p) =>
          p.categories.some((c) => c.slug.toLowerCase().includes(catLower) || c.name.toLowerCase().includes(catLower))
        );
      }
      return list.slice((page - 1) * perPage, page * perPage);
    }

    if (typeof window === "undefined") {
      // Server-side: call WooCommerce REST API directly
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        status: "publish",
      });
      if (search) params.set("search", search);
      if (category) {
        const categoryId = await resolveCategoryId(category);
        if (categoryId) params.set("category", String(categoryId));
      }

      const response = await fetch(`${WC_BASE}/wp-json/wc/v3/products?${params}`, {
        headers: { Authorization: `Basic ${wcAuth()}` },
        cache: "no-store",
      });
      if (!response.ok) return CATALOG.slice(0, perPage);
      const data = await response.json();
      const mapped = Array.isArray(data) ? data.map(mapWooProduct) : [];
      return mapped.length > 0 ? mapped : CATALOG.slice(0, perPage);
    } else {
      // Browser-side: call the Next.js proxy route
      const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      const response = await fetch(`/api/products?${params}`, { cache: "no-store" });
      if (!response.ok) return CATALOG.slice(0, perPage);
      const json = await response.json();
      return Array.isArray(json) && json.length > 0 ? json : CATALOG.slice(0, perPage);
    }
  } catch {
    return CATALOG.slice(0, query.perPage || 12);
  }
};

export const getProductBySlug = async (slug: string): Promise<WooProduct | null> => {
  try {
    if (!isConfigured()) {
      return CATALOG.find((p) => p.slug === slug) ?? null;
    }

    if (typeof window === "undefined") {
      // Server-side: call WooCommerce REST API directly
      const params = new URLSearchParams({ slug, status: "publish" });
      const response = await fetch(`${WC_BASE}/wp-json/wc/v3/products?${params}`, {
        headers: { Authorization: `Basic ${wcAuth()}` },
        cache: "no-store",
      });
      if (!response.ok) return CATALOG.find((p) => p.slug === slug) ?? null;
      const data = await response.json();
      const arr = Array.isArray(data) ? data : [];
      if (arr.length > 0) return mapWooProduct(arr[0]);
      return CATALOG.find((p) => p.slug === slug) ?? null;
    } else {
      // Browser-side: call the Next.js proxy route
      const response = await fetch(`/api/products/${slug}`, { cache: "no-store" });
      if (!response.ok) return CATALOG.find((p) => p.slug === slug) ?? null;
      return response.json();
    }
  } catch {
    return CATALOG.find((p) => p.slug === slug) ?? null;
  }
};

export const getProductReviews = async (productId: number): Promise<WooReview[]> => {
  try {
    if (!isConfigured()) return [];
    const res = await fetch(
      `${WC_BASE}/wp-json/wc/v3/products/reviews?product=${productId}&per_page=50&status=approved`,
      { headers: { Authorization: `Basic ${wcAuth()}` }, cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

export const getRelatedProducts = async (product: WooProduct): Promise<WooProduct[]> => {
  const products = await getProducts({ perPage: 6 });
  return products.filter((p) => p.id !== product.id).slice(0, 4);
};

export const getCategoryProducts = async (categorySlug: string): Promise<WooProduct[]> => {
  return getProducts({ perPage: 20, ...(categorySlug ? { category: categorySlug } : {}) });
};

import REAL_CATEGORIES from "@/data/real-categories.json";

export const getCategories = async (): Promise<{ id: number; name: string; slug: string; count: number; description?: string; image?: { src: string } | null }[]> => {
  try {
    if (!isConfigured()) {
      return REAL_CATEGORIES as any[];
    }
    if (typeof window === "undefined") {
      const response = await fetch(`${WC_BASE}/wp-json/wc/v3/products/categories?per_page=100`, {
        headers: { Authorization: `Basic ${wcAuth()}` },
        cache: "no-store",
      });
      if (!response.ok) return REAL_CATEGORIES as any[];
      const data = await response.json();
      return Array.isArray(data) && data.length > 0 ? data : (REAL_CATEGORIES as any[]);
    }
    return REAL_CATEGORIES as any[];
  } catch {
    return REAL_CATEGORIES as any[];
  }
};
