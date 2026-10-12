import { revalidatePath } from "next/cache";
import { bumpCatalogVersion } from "@/lib/catalog-version";
import { invalidateProductsCache } from "@/lib/db/products";
import { invalidateCategoriesCache } from "@/lib/db/categories";

/**
 * Call from admin API routes only (uses `next/cache`).
 *
 * Why this exists: on serverless hosting every instance has its own memory, so clearing an
 * in-memory cache on the instance that handled the admin save does nothing for the others,
 * and statically cached pages (ISR) keep serving old HTML until their timer runs out.
 *
 *  1. `bumpCatalogVersion()` (see catalog-version.ts) makes every instance reload the catalog.
 *  2. `revalidateStorefront()` marks every cached page stale so the next visit re-renders.
 */

/** Mark every cached storefront page stale (homepage, menus, category and product pages). */
export function revalidateStorefront(): void {
  try {
    revalidatePath("/", "layout");
  } catch (error) {
    console.warn("revalidateStorefront failed:", error);
  }
}

/**
 * Call after ANY admin change to products or categories (create, edit, delete, reorder, move...).
 * Never throws — the admin's save already succeeded and must not be reported as failed.
 */
export async function publishCatalogChange(): Promise<void> {
  try {
    invalidateProductsCache();
    invalidateCategoriesCache();
    await bumpCatalogVersion();
  } catch (error) {
    console.warn("publishCatalogChange: could not bump catalog version:", error);
  }
  revalidateStorefront();
}
