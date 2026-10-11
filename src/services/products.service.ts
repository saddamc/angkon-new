import type { WooCategory, WooProduct, WooReview } from "@/types/product";
import REAL_PRODUCTS from "@/data/real-products.json";
import REAL_CATEGORIES from "@/data/real-categories.json";

interface ProductQuery {
  page?: number;
  perPage?: number;
  search?: string;
  category?: string;
  onSale?: boolean;
}

const CATALOG: WooProduct[] = REAL_PRODUCTS as unknown as WooProduct[];

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
    sizes: sizeAttr?.options ?? raw.sizes ?? [],
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

export const getProducts = async (query: ProductQuery = {}): Promise<WooProduct[]> => {
  const { page = 1, perPage = 12, search, category, onSale } = query;

  try {
    if (typeof window === "undefined") {
      // Server-side: Delegate to full-server products layer
      const { getProducts: getProductsFromServer } = await import("@/server/products");
      return await getProductsFromServer(query);
    } else {
      // Client-side: Query via Next.js API route
      const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (onSale) params.set("onSale", "true");

      const response = await fetch(`/api/products?${params}`, { cache: "no-store" });
      if (!response.ok) return CATALOG.slice(0, perPage);
      const json = await response.json();
      return Array.isArray(json) && json.length > 0 ? json : CATALOG.slice(0, perPage);
    }
  } catch {
    // Fail-safe static catalog fallback
    let list = [...CATALOG];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    if (category) {
      const catLower = category.toLowerCase();
      list = list.filter((p) =>
        p.categories.some((c) => c.slug.toLowerCase() === catLower || c.name.toLowerCase() === catLower)
      );
    }
    if (onSale) {
      list = list.filter((p) => p.on_sale);
    }
    return list.slice((page - 1) * perPage, page * perPage);
  }
};

export const getProductBySlug = async (slug: string): Promise<WooProduct | null> => {
  try {
    if (typeof window === "undefined") {
      // Server-side: Delegate to full-server products layer
      const { getProductBySlug: getProductFromServer } = await import("@/server/products");
      return await getProductFromServer(slug);
    } else {
      // Client-side: Query via Next.js API route
      const response = await fetch(`/api/products/${slug}`, { cache: "no-store" });
      if (!response.ok) return CATALOG.find((p) => p.slug === slug) ?? null;
      return await response.json();
    }
  } catch {
    return CATALOG.find((p) => p.slug === slug) ?? null;
  }
};

export const getProductReviews = async (_productId: number): Promise<WooReview[]> => {
  return [];
};

export const getRelatedProducts = async (product: WooProduct): Promise<WooProduct[]> => {
  if (typeof window === "undefined") {
    const { getRelatedProducts: getRelatedFromServer } = await import("@/server/products");
    return await getRelatedFromServer(product, 4);
  }
  const products = await getProducts({ perPage: 8, category: product.categories?.[0]?.slug });
  const filtered = products.filter((p) => p.id !== product.id);
  if (filtered.length >= 4) return filtered.slice(0, 4);

  const general = await getProducts({ perPage: 6 });
  return general.filter((p) => p.id !== product.id).slice(0, 4);
};

export const getCategoryProducts = async (categorySlug: string): Promise<WooProduct[]> => {
  return getProducts({ perPage: 24, ...(categorySlug ? { category: categorySlug } : {}) });
};

export const getCategories = async (): Promise<WooCategory[]> => {
  try {
    if (typeof window === "undefined") {
      const { getCategories: getCategoriesFromServer } = await import("@/server/categories");
      return await getCategoriesFromServer();
    } else {
      const response = await fetch("/api/categories", { cache: "no-store" });
      if (!response.ok) return REAL_CATEGORIES as unknown as WooCategory[];
      const data = await response.json();
      return Array.isArray(data) && data.length > 0 ? data : (REAL_CATEGORIES as unknown as WooCategory[]);
    }
  } catch {
    return REAL_CATEGORIES as unknown as WooCategory[];
  }
};
