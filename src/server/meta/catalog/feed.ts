import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { getAppEnvironment } from "@/server/env/app-environment";
import {
  buildCatalogFeed,
  buildFeedUrl,
  generateCatalogXml,
  resolveLocalBaseUrl,
  resolveProductionBaseUrl,
  resolvePublicBaseUrl,
  CATALOG_FEED_PATH,
  DEFAULT_FEED_PAGE_SIZE,
  MAX_FEED_ITEMS,
  type FeedSourceProduct,
} from "@/lib/meta-catalog";
import type {
  CatalogProductPage,
  GeneratedCatalogFeed,
  CatalogFeedDiagnostics,
} from "./types";

export { CATALOG_FEED_PATH };

/**
 * Database-level visibility guard. These fields are not present on every
 * historical document, so each check also accepts "field missing".
 */
export function buildCatalogVisibilityFilter(): Record<string, unknown> {
  return {
    $and: [
      {
        $or: [
          { status: { $exists: false } },
          { status: null },
          { status: { $in: ["publish", "published", "active", "live", "enabled"] } },
        ],
      },
      {
        $or: [
          { published: { $exists: false } },
          { published: null },
          { published: true },
        ],
      },
      {
        $or: [
          { isPublished: { $exists: false } },
          { isPublished: null },
          { isPublished: true },
        ],
      },
      {
        $or: [
          { is_active: { $exists: false } },
          { is_active: null },
          { is_active: true },
        ],
      },
      {
        $or: [
          { visibility: { $exists: false } },
          { visibility: null },
          {
            visibility: { $in: ["public", "visible", "catalog", "shop", "visible_in_catalog"] },
          },
        ],
      },
      {
        $or: [
          { catalog_visibility: { $exists: false } },
          { catalog_visibility: null },
          {
            catalog_visibility: {
              $in: ["public", "visible", "catalog", "shop", "visible_in_catalog"],
            },
          },
        ],
      },
      {
        $or: [
          { deleted: { $exists: false } },
          { deleted: null },
          { deleted: false },
        ],
      },
      {
        $or: [
          { deletedAt: { $exists: false } },
          { deletedAt: null },
        ],
      },
    ],
  };
}

export async function queryCatalogProducts(
  options: { page?: number; perPage?: number } = {}
): Promise<CatalogProductPage> {
  await connectToDatabase();

  const filter = buildCatalogVisibilityFilter();
  const hasExplicitPage = Number.isFinite(options.page) && (options.page || 0) > 0;
  const page = hasExplicitPage ? Math.max(1, Math.floor(options.page as number)) : 1;
  const requestedPerPage =
    Number.isFinite(options.perPage) && (options.perPage || 0) > 0
      ? Math.floor(options.perPage as number)
      : hasExplicitPage
        ? DEFAULT_FEED_PAGE_SIZE
        : MAX_FEED_ITEMS;
  const perPage = Math.min(MAX_FEED_ITEMS, Math.max(1, requestedPerPage));

  const [totalVisible, totalAll, products] = await Promise.all([
    Product.collection.countDocuments(filter),
    Product.collection.countDocuments({}),
    Product.collection
      .find(filter)
      .project({
        _id: 0,
        id: 1,
        name: 1,
        slug: 1,
        permalink: 1,
        description: 1,
        short_description: 1,
        price: 1,
        regular_price: 1,
        sale_price: 1,
        on_sale: 1,
        sku: 1,
        stock_status: 1,
        stock_quantity: 1,
        manage_stock: 1,
        sizes: 1,
        images: 1,
        categories: 1,
        attributes: 1,
        updatedAt: 1,
        createdAt: 1,
        status: 1,
        published: 1,
        isPublished: 1,
        is_active: 1,
        visibility: 1,
        catalog_visibility: 1,
        deleted: 1,
        deletedAt: 1,
      })
      .sort({ id: 1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .toArray(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalVisible / perPage));

  return {
    products: products as unknown as FeedSourceProduct[],
    totalVisible,
    totalAll,
    excludedFromCatalog: Math.max(0, totalAll - totalVisible),
    page,
    perPage,
    totalPages,
    truncated: totalVisible > perPage,
  };
}

export async function generateCatalogFeed(options: {
  requestOrigin?: string;
  page?: number;
  perPage?: number;
  env?: Record<string, string | undefined>;
  nodeEnv?: string;
} = {}): Promise<GeneratedCatalogFeed> {
  const env = options.env || process.env;
  // Resolve the environment with the same engine used by the database
  // isolation guard and the Meta CAPI dispatcher. Reading raw NODE_ENV here
  // caused "development" labels on a production database whenever `next dev`
  // ran with APP_ENVIRONMENT=production.
  const appEnvironment = getAppEnvironment();
  const nodeEnv = options.nodeEnv || appEnvironment;
  const baseResolution = resolvePublicBaseUrl({
    env,
    requestOrigin: options.requestOrigin,
    nodeEnv,
  });
  const productionResolution = resolveProductionBaseUrl(env);
  const localResolution = resolveLocalBaseUrl(options.requestOrigin);

  const productPage = await queryCatalogProducts({
    page: options.page,
    perPage: options.perPage,
  });

  const allowLocalHttp = !baseResolution.isPublicHttps && baseResolution.isLocal;
  const build = buildCatalogFeed(productPage.products, {
    baseUrl: baseResolution.baseUrl,
    allowLocalHttp,
    maxItems: productPage.perPage,
  });

  const generatedAt = new Date().toISOString();
  const feedUrl = buildFeedUrl(baseResolution.baseUrl);
  const productionFeedUrl = buildFeedUrl(productionResolution.baseUrl);
  const localFeedUrl = buildFeedUrl(localResolution.baseUrl);

  const xml = generateCatalogXml(build.items, {
    baseUrl: baseResolution.baseUrl,
    feedUrl,
    generatedAt,
  });

  return {
    xml,
    build,
    baseUrl: baseResolution.baseUrl,
    baseUrlSource: baseResolution.source,
    feedUrl,
    feedIsPublicHttps: baseResolution.isPublicHttps,
    productionFeedUrl,
    productionFeedUrlSource: productionResolution.source,
    localFeedUrl,
    environment: nodeEnv,
    generatedAt,
    page: productPage,
    warnings: Array.from(
      new Set([...baseResolution.warnings, ...productionResolution.warnings])
    ),
  };
}

export async function getCatalogFeedDiagnostics(options: {
  requestOrigin?: string;
  env?: Record<string, string | undefined>;
  nodeEnv?: string;
  page?: number;
  perPage?: number;
} = {}): Promise<CatalogFeedDiagnostics> {
  const feed = await generateCatalogFeed(options);

  return {
    generatedAt: feed.generatedAt,
    environment: feed.environment,
    baseUrl: feed.baseUrl,
    baseUrlSource: feed.baseUrlSource,
    feedUrl: feed.feedUrl,
    feedIsPublicHttps: feed.feedIsPublicHttps,
    productionFeedUrl: feed.productionFeedUrl,
    productionFeedUrlSource: feed.productionFeedUrlSource,
    localFeedUrl: feed.localFeedUrl,
    publicHttpsConfigured: feed.feedIsPublicHttps,
    page: {
      page: feed.page.page,
      perPage: feed.page.perPage,
      totalPages: feed.page.totalPages,
      totalVisible: feed.page.totalVisible,
      totalAll: feed.page.totalAll,
      excludedFromCatalog: feed.page.excludedFromCatalog,
      truncated: feed.page.truncated,
    },
    counts: feed.build.counts,
    categoryCoverage: feed.build.categoryCoverage,
    latestProductUpdatedAt: feed.build.latestProductUpdatedAt,
    allLinksPublicHttps: feed.build.allLinksPublicHttps,
    invalidSamples: feed.build.invalid.slice(0, 25),
    excludedSamples: feed.build.excluded.slice(0, 10),
    duplicateIds: feed.build.duplicateIds,
    xmlBytes: Buffer.byteLength(feed.xml, "utf8"),
    warnings: feed.warnings,
  };
}
