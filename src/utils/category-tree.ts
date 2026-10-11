import type { WooCategory } from "@/types/product";
import type { CategoryNode } from "@/types/woocommerce";
import { getCategoryImage, getCategoryIcon } from "@/data/categories";
import { CATEGORY_IMAGE_META } from "@/utils/category-image-meta";

/** WC/MongoDB sometimes sends image.src as false/null/number — never assume string. */
function asImageUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const src = value.trim();
  if (!src) return "";
  if (src.startsWith("http") || src.startsWith("/") || src.startsWith("data:")) return src;
  return "";
}

export function categoryImageSrc(
  category: {
    slug?: string;
    image?: { src?: unknown } | null;
    meta_data?: Array<{ key: string; value?: unknown }> | null;
  },
  fallback?: { image?: { src?: unknown } | null } | null,
): string {
  const wc = asImageUrl(category.image?.src);
  if (wc) return wc;

  const metaSrc = asImageUrl(
    category.meta_data?.find(
      (m) => m.key === CATEGORY_IMAGE_META || m.key === "ps_category_image",
    )?.value,
  );
  if (metaSrc) return metaSrc;

  const catalog = getCategoryImage(category.slug ?? "", "");
  return catalog || asImageUrl(fallback?.image?.src);
}

/** Icon/logo URL or emoji from meta, then catalog fallback. */
export function categoryIconSrc(category: {
  slug?: string;
  meta_data?: Array<{ key: string; value?: unknown }> | null;
}): string {
  const raw = category.meta_data?.find((m) => m.key === "_angkon_icon" || m.key === "_plainstitch_icon")?.value;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return getCategoryIcon(category.slug ?? "");
}

/**
 * Real category logo only (image, meta image, or uploaded icon URL).
 */
export function categoryLogoSrc(category: {
  slug?: string;
  image?: { src?: unknown } | null;
  meta_data?: Array<{ key: string; value?: unknown }> | null;
}): string {
  const wc = asImageUrl(category.image?.src);
  if (wc) return wc;

  const metaSrc = asImageUrl(
    category.meta_data?.find(
      (m) => m.key === CATEGORY_IMAGE_META || m.key === "ps_category_image",
    )?.value,
  );
  if (metaSrc) return metaSrc;

  return asImageUrl(
    category.meta_data?.find((m) => m.key === "_angkon_icon" || m.key === "_plainstitch_icon")?.value,
  );
}

function sortNodes(a: CategoryNode, b: CategoryNode): number {
  const order = (a.menu_order ?? 0) - (b.menu_order ?? 0);
  if (order !== 0) return order;
  return a.name.localeCompare(b.name);
}

/** Hide default Uncategorized term on the storefront. */
export function withoutUncategorized(tree: CategoryNode[]): CategoryNode[] {
  return tree
    .filter((node) => node.slug !== "uncategorized")
    .map((node) => ({
      ...node,
      children: withoutUncategorized(node.children),
    }));
}

export function toStorefrontTree(tree: CategoryNode[]): CategoryNode[] {
  return withoutUncategorized(tree)
    .map((node) => ({
      ...node,
      children: [...node.children].sort(sortNodes),
    }))
    .sort(sortNodes);
}

/** Parent category id plus every nested child id (for product filters). */
export function collectCategoryIds(node: CategoryNode): number[] {
  return [node.id, ...node.children.flatMap(collectCategoryIds)];
}

export function flattenStorefrontSubs(tree: CategoryNode[]): Array<
  CategoryNode & { parentSlug: string; parentName: string; parentImage?: { src?: string } | null }
> {
  return tree.flatMap((parent) =>
    parent.children.map((child) => ({
      ...child,
      parentSlug: parent.slug,
      parentName: parent.name,
      parentImage: parent.image,
    })),
  );
}

export function buildCategoryTreeFromFlat(flat: WooCategory[]): CategoryNode[] {
  const byId = new Map<number, CategoryNode>();
  flat.forEach((category) => byId.set(category.id, { ...category, children: [] }));

  const roots: CategoryNode[] = [];
  byId.forEach((node) => {
    const parentId = node.parent ?? 0;
    const parent = parentId ? byId.get(parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });

  return toStorefrontTree(roots);
}
