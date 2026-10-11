import type { WooCategory } from "@/types/product";
import type { CategoryNode } from "@/types/woocommerce";
import { getDbCategories } from "@/lib/db/categories";
import REAL_CATEGORIES from "@/data/real-categories.json";

export async function getAllCategories(): Promise<WooCategory[]> {
  try {
    const categories = await getDbCategories();
    if (Array.isArray(categories) && categories.length > 0) {
      return categories;
    }
  } catch (error) {
    console.warn("getAllCategories falling back to static catalog:", error);
  }

  return REAL_CATEGORIES as unknown as WooCategory[];
}

// Flat WooCommerce categories -> nested tree, keyed off `parent`. O(n), arbitrary depth.
export function buildCategoryTree(flat: WooCategory[]): CategoryNode[] {
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

export async function getCategoryTree(): Promise<CategoryNode[]> {
  return buildCategoryTree(await getAllCategories());
}

// DFS for the node matching `slug`, returning the full ancestor chain (root-first) down to it.
export function findCategoryPath(tree: CategoryNode[], slug: string): CategoryNode[] | null {
  for (const node of tree) {
    if (node.slug === slug) return [node];
    const childPath = findCategoryPath(node.children, slug);
    if (childPath) return [node, ...childPath];
  }
  return null;
}

export async function getCategoryBySlug(slug: string): Promise<WooCategory | null> {
  const flat = await getAllCategories();
  return flat.find((category) => category.slug.toLowerCase() === slug.toLowerCase()) ?? null;
}
