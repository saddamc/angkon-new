import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import type { WooCategory } from "@/types/product";
import REAL_CATEGORIES from "@/data/real-categories.json";

declare global {
  // eslint-disable-next-line no-var
  var __globalCategoriesCache: { data: WooCategory[] | null; lastFetch: number } | undefined;
}

if (!globalThis.__globalCategoriesCache) {
  globalThis.__globalCategoriesCache = { data: null, lastFetch: 0 };
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache for sub-millisecond response

export function invalidateCategoriesCache() {
  if (globalThis.__globalCategoriesCache) {
    globalThis.__globalCategoriesCache.data = null;
    globalThis.__globalCategoriesCache.lastFetch = 0;
  }
}

export async function getDbCategories(): Promise<WooCategory[]> {
  const now = Date.now();
  const cacheObj = globalThis.__globalCategoriesCache!;
  if (cacheObj.data && now - cacheObj.lastFetch < CACHE_TTL_MS) {
    return cacheObj.data;
  }

  try {
    await connectToDatabase();
    const categories = await Category.find({})
      .sort({ parent: 1, menu_order: 1, name: 1 })
      .lean();

    if (categories && categories.length > 0) {
      cacheObj.data = categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        parent: c.parent ?? 0,
        menu_order: c.menu_order ?? 0,
        description: c.description ?? "",
        count: c.count ?? 0,
        image: c.image ? { id: c.image.id, src: c.image.src, alt: c.image.alt } : null,
      })) as WooCategory[];
      cacheObj.lastFetch = now;
      return cacheObj.data;
    }
  } catch (error) {
    console.warn("MongoDB categories query failed, falling back to cached catalog:", error);
  }

  cacheObj.data = REAL_CATEGORIES as unknown as WooCategory[];
  cacheObj.lastFetch = now;
  return cacheObj.data;
}

export async function getDbCategoryBySlug(slug: string): Promise<WooCategory | null> {
  const all = await getDbCategories();
  const match = all.find((c) => c.slug.toLowerCase() === slug.toLowerCase());
  return match ?? null;
}
