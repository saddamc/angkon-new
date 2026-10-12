import { Product } from "@/models/Product";
import { Category } from "@/models/Category";

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
