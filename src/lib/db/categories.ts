import { connectToDatabase } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { getCatalogVersion } from "@/lib/catalog-version";
import type { WooCategory } from "@/types/product";
import REAL_CATEGORIES from "@/data/real-categories.json";

declare global {
  // eslint-disable-next-line no-var
  var __globalCategoriesCache: { data: WooCategory[] | null; lastFetch: number; version?: string } | undefined;
}

if (!globalThis.__globalCategoriesCache) {
  globalThis.__globalCategoriesCache = { data: null, lastFetch: 0 };
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache for sub-millisecond response

export function invalidateCategoriesCache() {
  if (globalThis.__globalCategoriesCache) {
    globalThis.__globalCategoriesCache.data = null;
    globalThis.__globalCategoriesCache.lastFetch = 0;
    globalThis.__globalCategoriesCache.version = undefined;
  }
}

/** Every category, including hidden ones (admin use only). Cached per catalog version. */
export async function getAllDbCategoriesIncludingInactive(): Promise<WooCategory[]> {
  const now = Date.now();
  const cacheObj = globalThis.__globalCategoriesCache!;
  const version = await getCatalogVersion();
  if (cacheObj.data && cacheObj.version === version && now - cacheObj.lastFetch < CACHE_TTL_MS) {
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
        is_active: c.is_active !== false,
        meta_data: Array.isArray(c.meta_data) ? c.meta_data.map((m) => ({ key: m.key, value: m.value })) : [],
        image: c.image ? { id: c.image.id, src: c.image.src, alt: c.image.alt } : null,
      })) as unknown as WooCategory[];
      cacheObj.lastFetch = now;
      cacheObj.version = version;
      return cacheObj.data;
    }
  } catch (error) {
    console.warn("MongoDB categories query failed, falling back to cached catalog:", error);
  }

  cacheObj.data = REAL_CATEGORIES as unknown as WooCategory[];
  cacheObj.lastFetch = now;
  return cacheObj.data;
}

/**
 * Categories visible on the storefront: a category switched off in the admin is hidden
 * together with everything beneath it.
 */
export async function getDbCategories(): Promise<WooCategory[]> {
  const all = await getAllDbCategoriesIncludingInactive();
  const flags = all as unknown as { id: number; parent?: number; is_active?: boolean }[];
  const hidden = new Set<number>(flags.filter((c) => c.is_active === false).map((c) => c.id));
  if (hidden.size === 0) return all;

  let grew = true;
  while (grew) {
    grew = false;
    for (const c of flags) {
      if (c.parent && hidden.has(c.parent) && !hidden.has(c.id)) {
        hidden.add(c.id);
        grew = true;
      }
    }
  }
  return all.filter((c) => !hidden.has(c.id));
}

export async function getDbCategoryBySlug(slug: string): Promise<WooCategory | null> {
  const all = await getDbCategories();
  const match = all.find((c) => c.slug.toLowerCase() === slug.toLowerCase());
  return match ?? null;
}
