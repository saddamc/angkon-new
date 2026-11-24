import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { syncProductImagesToCategoryFolder } from "@/lib/cloudinary";

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

/**
 * Reconciles Cloudinary product folders after a category hierarchy change.
 * Product documents intentionally keep category snapshots, so a category move
 * must refresh those snapshots and then relocate each referenced image. The
 * operation is best-effort per product: a Cloudinary outage never rolls back a
 * successful category change or destroy an existing image URL.
 */
export async function syncProductImageFoldersForCategories(categoryIds: number[]): Promise<void> {
  const ids = [...new Set(categoryIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (ids.length === 0) return;

  const allCategories = await Category.find({}).lean();
  const categoryById = new Map(allCategories.map((category) => [category.id, category]));
  const descendants = new Set(ids);
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of allCategories) {
      if (category.parent && descendants.has(category.parent) && !descendants.has(category.id)) {
        descendants.add(category.id);
        changed = true;
      }
    }
  }

  const products = await Product.find({ "categories.id": { $in: [...descendants] } })
    .select("images categories slug")
    .lean();

  for (const product of products) {
    if (!Array.isArray(product.images) || product.images.length === 0) continue;
    const categories = (product.categories || [])
      .map((ref) => categoryById.get(ref.id))
      .filter(Boolean)
      .map((category) => {
        const ancestors: string[] = [];
        const seen = new Set<number>();
        let current = category;
        while (current && !seen.has(current.id)) {
          seen.add(current.id);
          ancestors.unshift(current.slug || current.name);
          current = current.parent ? categoryById.get(current.parent) : undefined;
        }
        return {
          id: category!.id,
          name: category!.name,
          slug: category!.slug,
          parent: category!.parent || 0,
          ancestors,
        };
      });
    if (categories.length === 0) continue;

    try {
      const images = await syncProductImagesToCategoryFolder({
        images: product.images,
        categories,
        productSlug: product.slug,
      });
      await Product.updateOne(
        { _id: product._id },
        { $set: { categories, images } },
      );
    } catch (error) {
      console.warn(`Could not reconcile Cloudinary folders for product ${product.slug}:`, error);
    }
  }
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
