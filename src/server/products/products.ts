import {
  getDbProducts,
  getDbProductBySlug,
  getDbProductsByCategorySlug,
  DbProductQuery,
} from "@/lib/db/products";
import type { WooProduct, WooCategory } from "@/types/product";

export type { DbProductQuery };

/**
 * Server-only Products Data Access Layer
 * Queries MongoDB Atlas with full-text search, multi-level category resolution, and fallbacks.
 */
export async function getProducts(query: DbProductQuery = {}): Promise<WooProduct[]> {
  return await getDbProducts(query);
}

export async function getProductBySlug(slug: string): Promise<WooProduct | null> {
  return await getDbProductBySlug(slug);
}

export async function getRelatedProducts(product: WooProduct, limit = 4): Promise<WooProduct[]> {
  const primaryCategory = product.categories?.[0]?.slug;
  const list = await getDbProducts({ perPage: limit + 4, category: primaryCategory });
  const filtered = list.filter((p) => p.id !== product.id);
  if (filtered.length >= limit) return filtered.slice(0, limit);

  const fallback = await getDbProducts({ perPage: limit + 2 });
  return fallback.filter((p) => p.id !== product.id).slice(0, limit);
}

export async function getCategoryProducts(
  categorySlug: string,
  query: DbProductQuery = {}
): Promise<{ products: WooProduct[]; total: number; totalPages: number; category: WooCategory | null }> {
  return await getDbProductsByCategorySlug(categorySlug, query);
}

export async function getSaleProducts(perPage = 20): Promise<WooProduct[]> {
  return await getDbProducts({ onSale: true, perPage });
}

export async function searchProducts(searchTerm: string, perPage = 12): Promise<WooProduct[]> {
  return await getDbProducts({ search: searchTerm, perPage });
}
