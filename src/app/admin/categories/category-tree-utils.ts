import { decodeHtmlCharCodes } from "@/utils/html";
import type { WCCategory, CategoryTree } from "./types";

export function catName(cat: { name: string }) {
  return decodeHtmlCharCodes(cat.name);
}

export function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");
}

export function buildTree(flat: WCCategory[]): CategoryTree[] {
  const byId = new Map<number, CategoryTree>();
  flat.forEach((c) => byId.set(c.id, { ...c, children: [] }));
  const roots: CategoryTree[] = [];
  byId.forEach((node) => {
    if (node.parent && byId.has(node.parent)) {
      byId.get(node.parent)!.children.push(node);
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

  const sortRecursive = (nodes: CategoryTree[]) => {
    nodes.sort(
      (a, b) => (a.menu_order ?? 0) - (b.menu_order ?? 0) || catName(a).localeCompare(catName(b))
    );
    nodes.forEach((n) => sortRecursive(n.children as CategoryTree[]));
  };
  sortRecursive(roots);
  return roots;
}

/** Direct and cross-listed children of a category in display order (same order the tree shows). */
export function sortedChildrenOf(flat: WCCategory[], parentId: number): WCCategory[] {
  const direct = flat.filter((c) => c.parent === parentId);
  const linked = flat
    .filter(
      (c) =>
        c.parent !== parentId &&
        Array.isArray(c.linked_parents) &&
        c.linked_parents.includes(parentId)
    )
    .map((c) => ({ ...c, is_linked: true }));
  return [...direct, ...linked].sort(
    (a, b) => (a.menu_order ?? 0) - (b.menu_order ?? 0) || catName(a).localeCompare(catName(b))
  );
}

/** Every category id that currently has at least one child (direct or cross-listed) */
export function parentsWithChildrenIds(flat: WCCategory[]): number[] {
  const parents = new Set<number>();
  flat.forEach((c) => {
    if (c.parent) parents.add(c.parent);
    if (Array.isArray(c.linked_parents)) {
      c.linked_parents.forEach((p) => parents.add(p));
    }
  });
  return [...parents];
}

export function ancestorIdsOf(flat: WCCategory[], id: number): number[] {
  const ids: number[] = [];
  let current = flat.find((c) => c.id === id);
  const seen = new Set<number>();
  while (current?.parent && !seen.has(current.parent)) {
    seen.add(current.parent);
    ids.push(current.parent);
    current = flat.find((c) => c.id === current!.parent);
  }
  return ids;
}

/** Direct children sorted by menu_order */
export function directChildren(flat: WCCategory[], parentId: number): WCCategory[] {
  return flat
    .filter((c) => c.parent === parentId)
    .sort((a, b) => a.menu_order - b.menu_order);
}

export function categoryPath(flat: WCCategory[], id: number): string {
  const parts: string[] = [];
  let current = flat.find((c) => c.id === id);
  const seen = new Set<number>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    parts.unshift(catName(current));
    current = current.parent ? flat.find((c) => c.id === current!.parent) : undefined;
  }
  return parts.join(" / ");
}

export function subtreeList(flat: WCCategory[], rootId: number): WCCategory[] {
  const result: WCCategory[] = [];
  const walk = (id: number) => {
    const node = flat.find((c) => c.id === id);
    if (node) result.push(node);
    flat.filter((c) => c.parent === id).forEach((child) => walk(child.id));
  };
  walk(rootId);
  return result;
}

export function descendantIdSet(flat: WCCategory[], id: number): Set<number> {
  const ids = new Set<number>();
  const walk = (parentId: number) => {
    flat.filter((c) => c.parent === parentId).forEach((c) => {
      ids.add(c.id);
      walk(c.id);
    });
  };
  walk(id);
  return ids;
}

export function siblingsOf(flat: WCCategory[], parent: number, excludeId?: number): WCCategory[] {
  return flat
    .filter((c) => c.parent === parent && c.id !== excludeId)
    .sort((a, b) => a.menu_order - b.menu_order);
}

export function getStatus(cat: WCCategory) {
  const meta = cat.meta_data?.find((m) => m.key === "_is_active");
  if (meta) return meta.value === "true";
  return true; // default active
}
