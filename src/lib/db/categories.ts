import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import type { WooCategory } from "@/types/product";
import REAL_CATEGORIES from "@/data/real-categories.json";

let cachedCategories: WooCategory[] | null = null;
let lastCategoriesFetch = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds cache for instant response

export function invalidateCategoriesCache() {
  cachedCategories = null;
  lastCategoriesFetch = 0;
}

export async function getDbCategories(): Promise<WooCategory[]> {
  const now = Date.now();
  if (cachedCategories && now - lastCategoriesFetch < CACHE_TTL_MS) {
    return cachedCategories;
  }

  try {
    await connectToDatabase();
    const categories = await Category.find({})
      .sort({ parent: 1, name: 1 })
      .lean();

    if (categories && categories.length > 0) {
      cachedCategories = categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        parent: c.parent ?? 0,
        description: c.description ?? "",
        count: c.count ?? 0,
        image: c.image ? { id: c.image.id, src: c.image.src, alt: c.image.alt } : null,
      })) as WooCategory[];
      lastCategoriesFetch = now;
      return cachedCategories;
    }
  } catch (error) {
    console.warn("MongoDB categories query failed, falling back to cached catalog:", error);
  }

  cachedCategories = REAL_CATEGORIES as unknown as WooCategory[];
  lastCategoriesFetch = now;
  return cachedCategories;
}

export async function getDbCategoryBySlug(slug: string): Promise<WooCategory | null> {
  const all = await getDbCategories();
  const match = all.find((c) => c.slug.toLowerCase() === slug.toLowerCase());
  return match ?? null;
}
