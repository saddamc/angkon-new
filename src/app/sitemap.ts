import type { MetadataRoute } from "next";
import { getAllDbProducts } from "@/lib/db/products";
import { getCategoryTree } from "@/lib/woocommerce/categories";
import type { CategoryNode } from "@/types/woocommerce";
import type { WooProduct } from "@/types/product";

export const revalidate = 3600; // Cache and revalidate at edge once per hour

const CANONICAL_BASE_URL = "https://www.angkon.net";

/**
 * Computes all category IDs that have at least one active product,
 * including parent and linked-parent categories that inherit child products.
 */
function getPopulatedCategoryIds(nodes: CategoryNode[], products: WooProduct[]): Set<number> {
  const populated = new Set<number>();
  for (const product of products) {
    if (Array.isArray(product.categories)) {
      for (const cat of product.categories) {
        if (cat.id) populated.add(cat.id);
      }
    }
  }

  const flatNodes: CategoryNode[] = [];
  function flatten(list: CategoryNode[]) {
    for (const item of list) {
      flatNodes.push(item);
      if (Array.isArray(item.children) && item.children.length > 0) {
        flatten(item.children);
      }
    }
  }
  flatten(nodes);

  let changed = true;
  while (changed) {
    changed = false;
    for (const node of flatNodes) {
      if (populated.has(node.id)) {
        if (node.parent && !populated.has(node.parent)) {
          populated.add(node.parent);
          changed = true;
        }
        const linkedParents = (node as { linked_parents?: number[] }).linked_parents;
        if (Array.isArray(linkedParents)) {
          for (const lp of linkedParents) {
            if (!populated.has(lp)) {
              populated.add(lp);
              changed = true;
            }
          }
        }
      }
    }
  }

  return populated;
}

/**
 * Traverses category tree recursively to collect all active public category paths.
 * Excludes categories that currently have 0 products to protect crawl budget and prevent soft-404s.
 */
function collectCategoryPaths(
  nodes: CategoryNode[],
  parentSlugs: string[] = [],
  populatedCategoryIds?: Set<number>
): string[] {
  const paths: string[] = [];
  for (const node of nodes) {
    if (!node.slug || (node as { is_active?: boolean }).is_active === false) {
      continue;
    }
    // Only include categories that actually contain published products
    if (populatedCategoryIds && !populatedCategoryIds.has(node.id)) {
      continue;
    }
    const current = [...parentSlugs, node.slug];
    paths.push(current.join("/"));
    if (Array.isArray(node.children) && node.children.length > 0) {
      paths.push(...collectCategoryPaths(node.children, current, populatedCategoryIds));
    }
  }
  return paths;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitemapEntries: MetadataRoute.Sitemap = [];
  const seenUrls = new Set<string>();

  const addEntry = (
    path: string,
    options: {
      changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
      priority: number;
      lastModified?: Date;
    }
  ) => {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${CANONICAL_BASE_URL}${cleanPath}`;
    if (seenUrls.has(url)) return;
    seenUrls.add(url);

    sitemapEntries.push({
      url,
      lastModified: options.lastModified || new Date(),
      changeFrequency: options.changeFrequency,
      priority: options.priority,
    });
  };

  // 1. Static Core Storefront Pages
  addEntry("/", { changeFrequency: "daily", priority: 1.0 });
  addEntry("/products", { changeFrequency: "daily", priority: 0.9 });
  addEntry("/sale", { changeFrequency: "daily", priority: 0.85 });

  // Populated Core Brand Category (High Priority)
  addEntry("/product-category/women", { changeFrequency: "weekly", priority: 0.8 });

  // Institutional, Showroom, and Policy Pages
  addEntry("/about", { changeFrequency: "monthly", priority: 0.6 });
  addEntry("/policies", { changeFrequency: "monthly", priority: 0.5 });
  addEntry("/contact", { changeFrequency: "monthly", priority: 0.5 });
  addEntry("/delivery-timing", { changeFrequency: "monthly", priority: 0.5 });
  addEntry("/refund-and-exchange-policies", { changeFrequency: "monthly", priority: 0.5 });
  addEntry("/privacy", { changeFrequency: "monthly", priority: 0.5 });
  addEntry("/terms", { changeFrequency: "monthly", priority: 0.5 });

  // 2. Fetch products & categories in parallel
  let products: WooProduct[] = [];
  let categoryTree: CategoryNode[] = [];
  try {
    [products, categoryTree] = await Promise.all([
      getAllDbProducts().catch(() => []),
      getCategoryTree().catch(() => [] as CategoryNode[]),
    ]);
  } catch (err) {
    console.error("[Sitemap] Failed to load products or categories:", err);
  }

  // 3. Dynamic Populated Categories from Tree (excludes empty categories)
  try {
    const populatedIds = getPopulatedCategoryIds(categoryTree, products);
    const paths = collectCategoryPaths(categoryTree, [], populatedIds);
    for (const catPath of paths) {
      addEntry(`/product-category/${catPath}`, {
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch (catErr) {
    console.error("[Sitemap] Failed to load dynamic categories:", catErr);
  }

  // 4. Dynamic Products from Database
  try {
    for (const product of products) {
      if (!product.slug || typeof product.slug !== "string") continue;
      const cleanSlug = product.slug.trim().toLowerCase();
      if (!cleanSlug) continue;

      let lastModified: Date | undefined;
      if (product.updatedAt) {
        const parsed = new Date(product.updatedAt);
        if (!isNaN(parsed.getTime())) lastModified = parsed;
      } else if (product.createdAt) {
        const parsed = new Date(product.createdAt);
        if (!isNaN(parsed.getTime())) lastModified = parsed;
      }

      addEntry(`/products/${cleanSlug}`, {
        changeFrequency: "weekly",
        priority: 0.8,
        lastModified,
      });
    }
  } catch (prodErr) {
    console.error("[Sitemap] Failed to load dynamic products:", prodErr);
  }

  // Next.js specification safety: Guard against 50,000 URL limit
  if (sitemapEntries.length > 50000) {
    console.warn(`[Sitemap] Warning: Total URLs (${sitemapEntries.length}) exceeds 50,000. Truncating to 50,000.`);
    return sitemapEntries.slice(0, 50000);
  }

  return sitemapEntries;
}
