import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { generateCatalogFeed } from "./feed";
import { getMetaCatalogSettings } from "./settings";

export interface CatalogSyncSummary {
  totalProducts: number;
  catalogEligible: number;
  feedGenerated: boolean;
  feedUrl: string;
  catalogId?: string;
  syncedAt: string;
}

/**
 * Executes catalog feed synchronization snapshot and updates metrics.
 */
export async function syncCatalogData(tenantId = "angkon-main"): Promise<CatalogSyncSummary> {
  await connectToDatabase();

  const settings = await getMetaCatalogSettings(tenantId);
  const feed = await generateCatalogFeed();

  const totalProducts = await Product.collection.countDocuments({});
  const catalogEligible = feed.page.totalVisible;

  return {
    totalProducts,
    catalogEligible,
    feedGenerated: Boolean(feed.xml),
    feedUrl: feed.feedUrl,
    catalogId: settings.catalogId || undefined,
    syncedAt: new Date().toISOString(),
  };
}
