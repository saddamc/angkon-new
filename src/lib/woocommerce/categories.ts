import { cache } from "react";
import type { WooCategory } from "@/types/product";
import type { CategoryNode } from "@/types/woocommerce";
import { getDbCategories } from "@/lib/db/categories";
import REAL_CATEGORIES from "@/data/real-categories.json";

export const getAllCategories = cache(async (): Promise<WooCategory[]> => {
  try {
    const categories = await getDbCategories();
    if (Array.isArray(categories) && categories.length > 0) {
      return categories;
    }
  } catch (error) {
    console.warn("getAllCategories falling back to static catalog:", error);
  }

  return REAL_CATEGORIES as unknown as WooCategory[];
});

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

  // Cross-link categories to their linked_parents
  flat.forEach((category) => {
    if (Array.isArray(category.linked_parents) && category.linked_parents.length > 0) {
      category.linked_parents.forEach((linkedParentId) => {
        const targetParent = byId.get(linkedParentId);
        if (targetParent && targetParent.id !== category.id) {
          const alreadyExists = targetParent.children.some((child) => child.id === category.id);
          if (!alreadyExists) {
            const originalNode = byId.get(category.id);
            if (originalNode) {
              targetParent.children.push({
                ...originalNode,
                is_linked: true,
              });
            }
          }
        }
      });
    }
  });

  return roots;
}

export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => {
  return buildCategoryTree(await getAllCategories());
});

// DFS for the node matching `slug`, returning the full ancestor chain (root-first) down to it.
export function findCategoryPath(tree: CategoryNode[], slug: string): CategoryNode[] | null {
  for (const node of tree) {
    if (node.slug === slug) return [node];
    const childPath = findCategoryPath(node.children, slug);
    if (childPath) return [node, ...childPath];
  }
  return null;
}

// Match an exact multi-segment path down the tree
export function findCategoryPathBySlugs(tree: CategoryNode[], slugs: string[]): CategoryNode[] | null {
  if (slugs.length === 0) return null;
  const [first, ...rest] = slugs;
  const root = tree.find((node) => node.slug.toLowerCase() === first.toLowerCase());
  if (!root) return null;
  if (rest.length === 0) return [root];

  let current = root;
  const path: CategoryNode[] = [root];
  for (const s of rest) {
    const child = current.children.find((c) => c.slug.toLowerCase() === s.toLowerCase());
    if (!child) return null;
    path.push(child);
    current = child;
  }
  return path;
}

export async function getCategoryBySlug(slug: string): Promise<WooCategory | null> {
  const flat = await getAllCategories();
  return flat.find((category) => category.slug.toLowerCase() === slug.toLowerCase()) ?? null;
}
