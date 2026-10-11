import { getDbCategories, getDbCategoryBySlug } from "@/lib/db/categories";
import type { WooCategory } from "@/types/product";
import type { CategoryNode } from "@/types/woocommerce";

export async function getCategories(): Promise<WooCategory[]> {
  return await getDbCategories();
}

export async function getCategoryBySlug(slug: string): Promise<WooCategory | null> {
  return await getDbCategoryBySlug(slug);
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
  const flat = await getDbCategories();
  const byId = new Map<number, CategoryNode>();
  flat.forEach((category) => byId.set(category.id, { ...category, children: [] }));

  const roots: CategoryNode[] = [];
  byId.forEach((node) => {
    const parentId = node.parent ?? 0;
    const parent = parentId ? byId.get(parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}
