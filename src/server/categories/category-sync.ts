import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import {
  buildCategoryFolderPath,
  buildCloudinaryFolderPath,
  createCloudinaryFolder,
  deleteCloudinaryFolderIfEmpty,
  extractPublicIdFromUrl,
  moveAssetToFolder,
} from "@/lib/cloudinary";
import { isCloudinaryUrl } from "@/lib/cloudinary-delivery";
import { getAppEnvironment } from "@/server/env/app-environment";

/**
 * Products store a copy of each category's name / slug / parent. When a category is renamed,
 * re-slugged or moved, refresh those copies so product pages, breadcrumbs and filters agree.
 * Call after connectToDatabase().
 */
export async function syncProductCategoryRefs(categoryIds: number[]): Promise<void> {
  const ids = [...new Set(categoryIds.filter((n) => Number.isFinite(n)))];
  if (ids.length === 0) return;
  const cats = await Category.find({ id: { $in: ids } }).lean();
  await Promise.all(
    cats.map((c) =>
      Product.updateMany(
        { "categories.id": c.id },
        { $set: { "categories.$[el].name": c.name, "categories.$[el].slug": c.slug, "categories.$[el].parent": c.parent || 0 } },
        { arrayFilters: [{ "el.id": c.id }] },
      ),
    ),
  );
}

/** Remove deleted categories from every product that still lists them. */
export async function removeCategoryRefs(categoryIds: number[]): Promise<void> {
  if (categoryIds.length === 0) return;
  await Product.updateMany(
    { "categories.id": { $in: categoryIds } },
    { $pull: { categories: { id: { $in: categoryIds } } } },
  );
}

export interface CategoryRefInput {
  id?: unknown;
  name?: unknown;
  slug?: unknown;
  parent?: unknown;
}

/**
 * Turn whatever the browser sent into clean, de-duplicated category references taken from the
 * categories collection (the source of truth). Unknown ids are dropped. Call after connectToDatabase().
 */
export async function resolveProductCategories(
  input: unknown,
  fallbackLookup?: (id: number) => { id: number; name: string; slug: string; parent?: number } | undefined,
): Promise<{ id: number; name: string; slug: string; parent: number }[]> {
  if (!Array.isArray(input)) return [];
  const ids = [...new Set((input as CategoryRefInput[]).map((c) => Number(c?.id)).filter((n) => Number.isInteger(n) && n > 0))];
  if (ids.length === 0) return [];
  const found = await Category.find({ id: { $in: ids } }).lean();
  const byId = new Map(found.map((c) => [c.id, c]));
  const out: { id: number; name: string; slug: string; parent: number }[] = [];
  for (const id of ids) {
    const c = byId.get(id) ?? fallbackLookup?.(id);
    if (c) out.push({ id: c.id, name: c.name, slug: c.slug, parent: c.parent || 0 });
  }
  return out;
}

export interface AssetFolderSyncReport {
  moved: number;
  skipped: number;
  failed: number;
  cleanedFolders: string[];
  errors: Array<{ publicIdOrUrl: string; error: string }>;
}

interface LeanCategoryNode {
  id: number;
  name: string;
  slug: string;
  parent?: number;
  image?: { src?: string | null } | null;
}

interface LeanProductNode {
  id: number;
  slug: string;
  categories?: Array<{ id: number; name?: string; slug?: string; parent?: number }>;
  images?: Array<{ src?: string | null }>;
}

function getCategoryAncestors(
  categoryId: number,
  byId: Map<number, LeanCategoryNode>,
  overrideParentMap?: Map<number, number>
): string[] {
  const chain: string[] = [];
  const visited = new Set<number>();
  let currId: number | undefined = categoryId;

  while (currId && currId > 0 && !visited.has(currId)) {
    visited.add(currId);
    const node = byId.get(currId);
    if (!node) break;
    chain.unshift(node.slug || node.name);
    const parentId: number = overrideParentMap?.has(currId)
      ? overrideParentMap.get(currId) ?? 0
      : node.parent || 0;
    currId = parentId > 0 ? parentId : undefined;
  }

  return chain;
}

function resolvePrimaryCategoryAncestors(
  categories: Array<{ id: number; name?: string; slug?: string; parent?: number }> | undefined,
  byId: Map<number, LeanCategoryNode>,
  preferredIds?: Set<number>
): string[] {
  if (!categories || categories.length === 0) return [];

  let bestChain: string[] = [];
  let bestScore = -1;

  for (const ref of categories) {
    const chain = getCategoryAncestors(Number(ref.id), byId);
    if (chain.length === 0) continue;
    const isPreferred = preferredIds?.has(Number(ref.id)) ? 1 : 0;
    const score = chain.length * 10 + isPreferred;
    if (score >= bestScore) {
      bestScore = score;
      bestChain = chain;
    }
  }

  if (bestChain.length > 0) return bestChain;
  const fallback = categories[0];
  return fallback?.slug || fallback?.name ? [String(fallback.slug || fallback.name)] : [];
}

function isManagedCloudinaryImage(src: string | null | undefined): src is string {
  if (!src || !src.trim()) return false;
  return isCloudinaryUrl(src, process.env.NEXT_PUBLIC_CLOUDINARY_DELIVERY_DOMAIN);
}

/**
 * Reconciles Cloudinary Media Library folders (`asset_folder`) for one or more moved/renamed
 * categories and all descendant subcategories + products, WITHOUT modifying `public_id` or
 * delivery URLs (`images[].src`). Source folders are deleted ONLY when verified completely empty.
 * Call after connectToDatabase() and after the Category DB updates are saved.
 */
export async function syncCloudinaryAssetFoldersForCategories(
  categoryIds: number[],
  options: {
    previousParentById?: Map<number, number>;
    previousSlugById?: Map<number, string>;
  } = {}
): Promise<AssetFolderSyncReport> {
  const report: AssetFolderSyncReport = {
    moved: 0,
    skipped: 0,
    failed: 0,
    cleanedFolders: [],
    errors: [],
  };

  if (getAppEnvironment() === "test") {
    return report;
  }

  const rootIds = [...new Set(categoryIds.map((id) => Number(id)).filter((n) => Number.isFinite(n) && n > 0))];
  if (rootIds.length === 0) return report;

  const allCategories = (await Category.find(
    {},
    { id: 1, name: 1, slug: 1, parent: 1, image: 1 }
  ).lean()) as LeanCategoryNode[];

  const byId = new Map<number, LeanCategoryNode>(allCategories.map((c) => [c.id, c]));
  const childrenByParent = new Map<number, number[]>();
  for (const c of allCategories) {
    const p = c.parent || 0;
    if (p > 0) {
      const list = childrenByParent.get(p) || [];
      list.push(c.id);
      childrenByParent.set(p, list);
    }
  }

  // Expand to include all descendant subcategories
  const affectedIds = new Set<number>();
  const queue = [...rootIds];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (affectedIds.has(curr) || !byId.has(curr)) continue;
    affectedIds.add(curr);
    for (const childId of childrenByParent.get(curr) || []) {
      if (!affectedIds.has(childId)) queue.push(childId);
    }
  }

  if (affectedIds.size === 0) return report;

  const oldById = new Map<number, LeanCategoryNode>(
    allCategories.map((c) => [
      c.id,
      {
        ...c,
        slug: options.previousSlugById?.get(c.id) ?? c.slug,
        parent: options.previousParentById?.get(c.id) ?? c.parent,
      },
    ])
  );

  const sourceFoldersToClean = new Set<string>();

  // 1. Pre-create target product category folder(s) & relocate category cover images under ANGKON/CATEGORIES
  for (const catId of affectedIds) {
    const cat = byId.get(catId);
    if (!cat) continue;
    const newAncestors = getCategoryAncestors(catId, byId);
    if (newAncestors.length > 0) {
      const targetProdCatFolder = buildCloudinaryFolderPath({ ancestors: newAncestors });
      await createCloudinaryFolder(targetProdCatFolder);

      if (
        isManagedCloudinaryImage(cat.image?.src) &&
        /^ANGKON\/CATEGORIES\//i.test(extractPublicIdFromUrl(cat.image.src))
      ) {
        const targetCatCoverFolder = buildCategoryFolderPath({ ancestors: newAncestors });
        const res = await moveAssetToFolder(cat.image.src, targetCatCoverFolder);
        if (res.moved) {
          report.moved++;
          if (res.previousFolder) sourceFoldersToClean.add(res.previousFolder);
        } else if (res.error) {
          report.failed++;
          report.errors.push({ publicIdOrUrl: cat.image.src, error: res.error });
        } else {
          report.skipped++;
        }
      }
    }

    if (options.previousParentById?.has(catId) || options.previousSlugById?.has(catId)) {
      const oldAncestors = getCategoryAncestors(catId, oldById);
      if (oldAncestors.length > 0) {
        const oldProdCatFolder = buildCloudinaryFolderPath({ ancestors: oldAncestors });
        const oldCatCoverFolder = buildCategoryFolderPath({ ancestors: oldAncestors });
        if (oldProdCatFolder) sourceFoldersToClean.add(oldProdCatFolder);
        if (oldCatCoverFolder) sourceFoldersToClean.add(oldCatCoverFolder);
      }
    }
  }

  // 2. Relocate product images' asset_folder cleanly (never modifying public_id or DB URLs)
  const products = (await Product.find(
    { "categories.id": { $in: Array.from(affectedIds) } },
    { id: 1, slug: 1, categories: 1, images: 1 }
  ).lean()) as LeanProductNode[];

  for (const prod of products) {
    if (!prod.images || prod.images.length === 0) continue;
    const ancestors = resolvePrimaryCategoryAncestors(prod.categories, byId, affectedIds);
    const targetFolder = buildCloudinaryFolderPath({
      ancestors,
      product: prod.slug || String(prod.id),
    });

    const seenUrls = new Set<string>();
    for (const img of prod.images) {
      if (!isManagedCloudinaryImage(img?.src) || seenUrls.has(img.src)) continue;
      seenUrls.add(img.src);

      const res = await moveAssetToFolder(img.src, targetFolder);
      if (res.moved) {
        report.moved++;
        if (res.previousFolder) sourceFoldersToClean.add(res.previousFolder);
      } else if (res.error) {
        report.failed++;
        report.errors.push({ publicIdOrUrl: img.src, error: res.error });
      } else {
        report.skipped++;
      }
    }
  }

  // 3. Clean up deepest-first empty source folders (only when verified empty)
  const sortedFolders = Array.from(sourceFoldersToClean).sort(
    (a, b) => b.split("/").length - a.split("/").length
  );
  const cleanedSet = new Set<string>();
  for (const folder of sortedFolders) {
    const cleanRes = await deleteCloudinaryFolderIfEmpty(folder, { walkUp: true, minDepth: 3 });
    for (const deleted of cleanRes.deletedFolders) {
      if (!cleanedSet.has(deleted)) {
        cleanedSet.add(deleted);
        report.cleanedFolders.push(deleted);
      }
    }
  }

  return report;
}

/**
 * Reconciles Cloudinary `asset_folder` for a single product after its categories or slug changed,
 * keeping `public_id` and `images[].src` untouched. Only cleans empty old source folders.
 */
export async function syncSingleProductAssetFolders(
  productOrId: LeanProductNode | number
): Promise<AssetFolderSyncReport> {
  const report: AssetFolderSyncReport = {
    moved: 0,
    skipped: 0,
    failed: 0,
    cleanedFolders: [],
    errors: [],
  };

  if (getAppEnvironment() === "test") {
    return report;
  }

  const product: LeanProductNode | null =
    typeof productOrId === "number"
      ? ((await Product.findOne(
          { id: productOrId },
          { id: 1, slug: 1, categories: 1, images: 1 }
        ).lean()) as LeanProductNode | null)
      : productOrId;

  if (!product || !product.images || product.images.length === 0) {
    return report;
  }

  const allCategories = (await Category.find(
    {},
    { id: 1, name: 1, slug: 1, parent: 1 }
  ).lean()) as LeanCategoryNode[];
  const byId = new Map<number, LeanCategoryNode>(allCategories.map((c) => [c.id, c]));

  const ancestors = resolvePrimaryCategoryAncestors(product.categories, byId);
  const targetFolder = buildCloudinaryFolderPath({
    ancestors,
    product: product.slug || String(product.id),
  });

  const sourceFoldersToClean = new Set<string>();
  const seenUrls = new Set<string>();

  for (const img of product.images) {
    if (!isManagedCloudinaryImage(img?.src) || seenUrls.has(img.src)) continue;
    seenUrls.add(img.src);

    const res = await moveAssetToFolder(img.src, targetFolder);
    if (res.moved) {
      report.moved++;
      if (res.previousFolder) sourceFoldersToClean.add(res.previousFolder);
    } else if (res.error) {
      report.failed++;
      report.errors.push({ publicIdOrUrl: img.src, error: res.error });
    } else {
      report.skipped++;
    }
  }

  const cleanedSet = new Set<string>();
  for (const folder of sourceFoldersToClean) {
    const cleanRes = await deleteCloudinaryFolderIfEmpty(folder, { walkUp: true, minDepth: 3 });
    for (const deleted of cleanRes.deletedFolders) {
      if (!cleanedSet.has(deleted)) {
        cleanedSet.add(deleted);
        report.cleanedFolders.push(deleted);
      }
    }
  }

  return report;
}
