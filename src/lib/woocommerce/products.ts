import { getDbProductsByCategorySlug } from "@/lib/db/products";
import type { WooCategory, WooProduct } from "@/types/product";

interface ProductsByCategoryQuery {
  page?: number;
  perPage?: number;
  orderby?: "date" | "price" | "popularity" | "title";
  order?: "asc" | "desc";
}

interface ProductsByCategoryResult {
  products: WooProduct[];
  total: number;
  totalPages: number;
  category: WooCategory | null;
}

export async function getProductsByCategorySlug(
  slug: string,
  query: ProductsByCategoryQuery = {},
): Promise<ProductsByCategoryResult> {
  return await getDbProductsByCategorySlug(slug, query);
}
