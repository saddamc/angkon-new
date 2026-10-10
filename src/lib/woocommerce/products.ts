import "server-only";
import { wcFetchRaw } from "./client";
import { getCategoryBySlug, getAllCategories } from "./categories";
import { mapWooProduct } from "@/services/products.service";
import type { WooCategory, WooProduct } from "@/types/product";
import REAL_PRODUCTS from "@/data/real-products.json";

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
  const category = await getCategoryBySlug(slug);
  if (!category) return { products: [], total: 0, totalPages: 0, category: null };

  const { page = 1, perPage = 24, orderby = "date", order = "desc" } = query;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, totalItems, totalPages } = await wcFetchRaw<any[]>(
      "/wp-json/wc/v3/products",
      {
        category: String(category.id),
        page: String(page),
        per_page: String(perPage),
        status: "publish",
        orderby,
        order,
      },
      { revalidate: 60, tags: [`products-category-${category.id}`] },
    );

    return { products: data.map(mapWooProduct), total: totalItems, totalPages, category };
  } catch {
    // Collect all descendant category IDs or slugs for this category
    const allCategories = await getAllCategories();
    const targetCategoryIds = new Set<number>([category.id]);

    let added = true;
    while (added) {
      added = false;
      for (const c of allCategories) {
        if (c.parent && targetCategoryIds.has(c.parent) && !targetCategoryIds.has(c.id)) {
          targetCategoryIds.add(c.id);
          added = true;
        }
      }
    }

    const filtered = (REAL_PRODUCTS as unknown as WooProduct[]).filter((p) => {
      if (!p.categories || p.categories.length === 0) return false;
      return p.categories.some((c) => targetCategoryIds.has(c.id) || c.slug === slug);
    });

    const sorted = [...filtered].sort((a, b) => {
      if (orderby === "price") {
        const pA = parseFloat(a.price || "0");
        const pB = parseFloat(b.price || "0");
        return order === "asc" ? pA - pB : pB - pA;
      }
      if (orderby === "title") {
        return order === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      return order === "asc" ? a.id - b.id : b.id - a.id;
    });

    const total = sorted.length;
    const totalPages = Math.ceil(total / perPage);
    const startIndex = (page - 1) * perPage;
    const paginated = sorted.slice(startIndex, startIndex + perPage);

    return { products: paginated, total, totalPages, category };
  }
}
