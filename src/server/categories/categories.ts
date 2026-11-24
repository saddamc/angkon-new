import { getDbCategories, getDbCategoryBySlug } from "@/lib/db/categories";
import type { WooCategory } from "@/types/product";
import type { CategoryNode } from "@/types/woocommerce";

export async function getCategories(): Promise<WooCategory[]> {
  return await getDbCategories();
}

export async function getCategoryBySlug(slug: string): Promise<WooCategory | null> {
  return await getDbCategoryBySlug(slug);
}

import { buildCategoryTree } from "@/lib/woocommerce/categories";

export async function getCategoryTree(): Promise<CategoryNode[]> {
  const flat = await getDbCategories();
  return buildCategoryTree(flat);
}
