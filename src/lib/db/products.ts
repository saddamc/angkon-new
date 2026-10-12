import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import type { WooProduct, WooCategory } from "@/types/product";
import REAL_PRODUCTS from "@/data/real-products.json";
import REAL_CATEGORIES from "@/data/real-categories.json";

export interface DbProductQuery {
  page?: number;
  perPage?: number;
  search?: string;
  category?: string;
  onSale?: boolean;
  orderby?: "date" | "price" | "popularity" | "title";
  order?: "asc" | "desc";
}

// Convert Mongoose Product doc or lean object into typed WooProduct
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toWooProduct(doc: any): WooProduct {
  return {
    id: doc.id,
    name: doc.name,
    slug: doc.slug,
    permalink: doc.permalink || "",
    description: doc.description || "",
    short_description: doc.short_description || "",
    price: doc.price || "0",
    regular_price: doc.regular_price || "",
    sale_price: doc.sale_price || "",
    on_sale: Boolean(doc.on_sale),
    stock_status: doc.stock_status || "instock",
    sizes: Array.isArray(doc.sizes) ? doc.sizes : [],
    images: Array.isArray(doc.images)
      ? doc.images.map((img: { id?: number; src: string; name?: string; alt?: string }) => ({
          id: img.id || 0,
          src: img.src,
          name: img.name || "",
          alt: img.alt || doc.name || "",
        }))
      : [],
    categories: Array.isArray(doc.categories)
      ? doc.categories.map((c: { id: number; name: string; slug: string; parent?: number }) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          parent: c.parent || 0,
        }))
      : [],
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    attributes: Array.isArray(doc.attributes) ? doc.attributes : [],
    sku: doc.sku || undefined,
    weight: doc.weight || undefined,
    shipping_class_id: doc.shipping_class_id || 0,
    stock_quantity: doc.stock_quantity ?? null,
    meta_data: Array.isArray(doc.meta_data) ? doc.meta_data : [],
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : undefined,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : undefined,
  };
}

// High-speed Global In-Memory Products Cache (10 min TTL, invalidated on admin edit)
declare global {
  // eslint-disable-next-line no-var
  var __globalProductsCache: { data: WooProduct[] | null; lastFetch: number } | undefined;
}

if (!globalThis.__globalProductsCache) {
  globalThis.__globalProductsCache = { data: null, lastFetch: 0 };
}

const PRODUCTS_CACHE_TTL_MS = 10 * 60 * 1000;

export function invalidateProductsCache() {
  if (globalThis.__globalProductsCache) {
    globalThis.__globalProductsCache.data = null;
    globalThis.__globalProductsCache.lastFetch = 0;
  }
}

export async function getAllDbProducts(): Promise<WooProduct[]> {
  const now = Date.now();
  const cacheObj = globalThis.__globalProductsCache!;
  if (cacheObj.data && now - cacheObj.lastFetch < PRODUCTS_CACHE_TTL_MS) {
    return cacheObj.data;
  }

  try {
    await connectToDatabase();
    const docs = await Product.find({})
      .sort({ updatedAt: -1, id: -1 })
      .lean();

    if (docs && docs.length > 0) {
      cacheObj.data = docs.map(toWooProduct);
      cacheObj.lastFetch = now;
      return cacheObj.data;
    }
  } catch (error) {
    console.warn("MongoDB getAllDbProducts failed, using static catalog fallback:", error);
  }

  cacheObj.data = (REAL_PRODUCTS as unknown as WooProduct[]);
  cacheObj.lastFetch = now;
  return cacheObj.data;
}

export async function getDbProducts(query: DbProductQuery = {}): Promise<WooProduct[]> {
  const { page = 1, perPage = 12, search, category, onSale, orderby = "date", order = "desc" } = query;

  const all = await getAllDbProducts();
  let list = all;

  if (onSale) {
    list = list.filter(
      (p) =>
        p.on_sale ||
        (p.sale_price && parseFloat(p.sale_price) > 0 && parseFloat(p.sale_price) < parseFloat(p.regular_price || p.price)) ||
        (p.regular_price && parseFloat(p.regular_price) > parseFloat(p.price))
    );
  }

  if (search) {
    const q = search.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }

  if (category) {
    const { getDbCategories, getDbCategoryBySlug } = await import("@/lib/db/categories");
    const matchedCat = await getDbCategoryBySlug(category);

    if (matchedCat) {
      const allCats = await getDbCategories();
      const descendantIds = new Set<number>([matchedCat.id]);

      let added = true;
      while (added) {
        added = false;
        for (const c of allCats) {
          if (c.parent && descendantIds.has(c.parent) && !descendantIds.has(c.id)) {
            descendantIds.add(c.id);
            added = true;
          }
        }
      }

      const catLower = category.toLowerCase().trim();
      list = list.filter((p) =>
        p.categories.some(
          (c) => descendantIds.has(c.id) || c.slug.toLowerCase() === catLower || c.name.toLowerCase() === catLower
        )
      );
    }
  }

  // Sorting
  list = [...list].sort((a, b) => {
    if (orderby === "price") {
      const priceA = parseFloat(a.price || "0");
      const priceB = parseFloat(b.price || "0");
      return order === "asc" ? priceA - priceB : priceB - priceA;
    }
    if (orderby === "title") {
      return order === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    }
    // Default ("date"): Sort by last updated date descending
    const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : a.id);
    const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : b.id);
    return order === "asc" ? timeA - timeB : timeB - timeA;
  });

  const skip = (page - 1) * perPage;
  return list.slice(skip, skip + perPage);
}

export async function getDbProductBySlug(slug: string): Promise<WooProduct | null> {
  const all = await getAllDbProducts();
  const slugLower = slug.toLowerCase().trim();
  const match = all.find((p) => p.slug.toLowerCase().trim() === slugLower);
  return match ?? null;
}

export async function getDbProductsByCategorySlug(
  slug: string,
  query: DbProductQuery = {}
): Promise<{ products: WooProduct[]; total: number; totalPages: number; category: WooCategory | null }> {
  const { page = 1, perPage = 24, orderby = "date", order = "desc" } = query;

  const { getDbCategories, getDbCategoryBySlug } = await import("@/lib/db/categories");
  const category = await getDbCategoryBySlug(slug);

  if (!category) {
    return { products: [], total: 0, totalPages: 0, category: null };
  }

  const all = await getAllDbProducts();

  // Collect all descendant category IDs from in-memory cache
  const allCats = await getDbCategories();
  const descendantIds = new Set<number>([category.id]);
  let added = true;
  while (added) {
    added = false;
    for (const c of allCats) {
      if (c.parent && descendantIds.has(c.parent) && !descendantIds.has(c.id)) {
        descendantIds.add(c.id);
        added = true;
      }
    }
  }

  const slugLower = slug.toLowerCase().trim();
  const filtered = all.filter((p) =>
    p.categories.some(
      (c) => descendantIds.has(c.id) || c.slug.toLowerCase() === slugLower || c.name.toLowerCase() === slugLower
    )
  );

  // Sorting
  filtered.sort((a, b) => {
    if (orderby === "price") {
      const priceA = parseFloat(a.price || "0");
      const priceB = parseFloat(b.price || "0");
      return order === "asc" ? priceA - priceB : priceB - priceA;
    }
    if (orderby === "title") {
      return order === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    }
    return order === "asc" ? a.id - b.id : b.id - a.id;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / perPage);
  const skip = (page - 1) * perPage;
  const paginated = filtered.slice(skip, skip + perPage);

  return {
    products: paginated,
    total,
    totalPages,
    category,
  };
}
