import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { Settings } from "@/models/Settings";
import { maskSecret } from "./pixel-settings";
import { DEFAULT_TENANT_ID } from "./tenant";
import {
  buildCatalogFeed,
  buildFeedUrl,
  generateCatalogXml,
  resolveLocalBaseUrl,
  resolveProductionBaseUrl,
  resolvePublicBaseUrl,
  validateAbsoluteUrl,
  CATALOG_FEED_PATH,
  DEFAULT_FEED_PAGE_SIZE,
  MAX_FEED_ITEMS,
  type CatalogCategoryCoverage,
  type CatalogFeedBuildResult,
  type CatalogFeedCounts,
  type FeedSourceProduct,
} from "@/lib/meta-catalog";

export const META_CATALOG_SETTINGS_KEY = "meta_catalog";

export type MetaCatalogConnectionState =
  | "not-configured"
  | "catalog-id-only"
  | "credential-only"
  | "configured-untested"
  | "verified"
  | "error";

export interface MetaCatalogSettings {
  tenantId?: string;
  catalogId: string;
  catalogApiToken: string;
  businessId: string;
  catalogName?: string;
  metaProductCount?: number;
  lastVerifiedAt?: string;
  lastVerificationError?: string;
  updatedAt?: string;
}

export interface PublicMetaCatalogSettings {
  tenantId: string;
  catalogId: string;
  businessId: string;
  hasCatalogApiToken: boolean;
  maskedCatalogApiToken: string;
  apiConfigured: boolean;
  connectionState: MetaCatalogConnectionState;
  connectionLabel: string;
  connectionDetail: string;
  catalogName?: string;
  metaProductCount?: number;
  lastVerifiedAt?: string;
  lastVerificationError?: string;
  updatedAt?: string;
}

export const DEFAULT_META_CATALOG_SETTINGS: MetaCatalogSettings = {
  tenantId: DEFAULT_TENANT_ID,
  catalogId: "",
  catalogApiToken: "",
  businessId: "",
};

const catalogSettingsCache = new Map<string, { data: MetaCatalogSettings; expiresAt: number }>();
const CACHE_TTL_MS = 5_000;

export function invalidateMetaCatalogSettingsCache(tenantId?: string): void {
  if (tenantId) {
    catalogSettingsCache.delete(tenantId);
  } else {
    catalogSettingsCache.clear();
  }
}

export function normalizeMetaCatalogId(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw.replace(/^catalog_/i, "").trim();
}

export function normalizeMetaCatalogSettings(
  raw: unknown,
  tenantId = DEFAULT_TENANT_ID
): MetaCatalogSettings {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const resolvedTenant =
    typeof source.tenantId === "string" && source.tenantId.trim()
      ? source.tenantId.trim()
      : tenantId || DEFAULT_TENANT_ID;

  return {
    tenantId: resolvedTenant,
    catalogId: normalizeMetaCatalogId(source.catalogId),
    catalogApiToken:
      typeof source.catalogApiToken === "string" ? source.catalogApiToken.trim() : "",
    businessId: typeof source.businessId === "string" ? source.businessId.trim() : "",
    catalogName: typeof source.catalogName === "string" ? source.catalogName : undefined,
    metaProductCount:
      typeof source.metaProductCount === "number" && Number.isFinite(source.metaProductCount)
        ? source.metaProductCount
        : undefined,
    lastVerifiedAt:
      typeof source.lastVerifiedAt === "string" ? source.lastVerifiedAt : undefined,
    lastVerificationError:
      typeof source.lastVerificationError === "string"
        ? source.lastVerificationError
        : undefined,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : undefined,
  };
}

export async function getMetaCatalogSettings(
  tenantId = DEFAULT_TENANT_ID,
  bypassCache = false
): Promise<MetaCatalogSettings> {
  const safeTenant = tenantId?.trim() || DEFAULT_TENANT_ID;
  const now = Date.now();

  if (!bypassCache) {
    const cached = catalogSettingsCache.get(safeTenant);
    if (cached && now < cached.expiresAt) return cached.data;
  }

  try {
    await connectToDatabase();

    let doc = (await Settings.findOne(
      { tenantId: safeTenant, key: META_CATALOG_SETTINGS_KEY },
      null,
      { strict: false }
    )
      .lean()
      .catch(() => null)) as Record<string, unknown> | null;

    if (!doc) {
      doc = await Settings.collection
        .findOne({ tenantId: safeTenant, key: META_CATALOG_SETTINGS_KEY })
        .catch(() => null);
    }

    if (doc?.value) {
      const normalized = normalizeMetaCatalogSettings(doc.value, safeTenant);
      catalogSettingsCache.set(safeTenant, { data: normalized, expiresAt: now + CACHE_TTL_MS });
      return normalized;
    }
  } catch (error) {
    console.warn("Meta catalog settings unavailable in DB, using defaults:", error);
  }

  const fallback = { ...DEFAULT_META_CATALOG_SETTINGS, tenantId: safeTenant };
  catalogSettingsCache.set(safeTenant, { data: fallback, expiresAt: now + CACHE_TTL_MS });
  return fallback;
}

export async function saveMetaCatalogSettings(
  settings: Partial<MetaCatalogSettings>,
  tenantId = DEFAULT_TENANT_ID
): Promise<MetaCatalogSettings> {
  const safeTenant = tenantId?.trim() || DEFAULT_TENANT_ID;
  await connectToDatabase();

  const current = await getMetaCatalogSettings(safeTenant, true);

  let nextToken = current.catalogApiToken || "";
  if (typeof settings.catalogApiToken === "string") {
    const raw = settings.catalogApiToken.trim();
    if (!raw.includes("••••") && !raw.includes("***")) {
      nextToken = raw;
    }
  }

  const nextCatalogId =
    settings.catalogId !== undefined
      ? normalizeMetaCatalogId(settings.catalogId)
      : current.catalogId || "";

  const credentialsChanged =
    nextCatalogId !== (current.catalogId || "") || nextToken !== (current.catalogApiToken || "");

  const verificationTouched =
    Object.prototype.hasOwnProperty.call(settings, "lastVerifiedAt") ||
    Object.prototype.hasOwnProperty.call(settings, "lastVerificationError") ||
    Object.prototype.hasOwnProperty.call(settings, "catalogName") ||
    Object.prototype.hasOwnProperty.call(settings, "metaProductCount");

  const normalized = normalizeMetaCatalogSettings(
    {
      ...current,
      ...settings,
      tenantId: safeTenant,
      catalogId: nextCatalogId,
      catalogApiToken: nextToken,
      lastVerifiedAt: credentialsChanged
        ? undefined
        : verificationTouched
          ? settings.lastVerifiedAt
          : current.lastVerifiedAt,
      lastVerificationError: credentialsChanged
        ? undefined
        : verificationTouched
          ? settings.lastVerificationError
          : current.lastVerificationError,
      catalogName: credentialsChanged
        ? undefined
        : verificationTouched
          ? settings.catalogName
          : current.catalogName,
      metaProductCount: credentialsChanged
        ? undefined
        : verificationTouched
          ? settings.metaProductCount
          : current.metaProductCount,
      updatedAt: new Date().toISOString(),
    },
    safeTenant
  );

  try {
    await Settings.findOneAndUpdate(
      { tenantId: safeTenant, key: META_CATALOG_SETTINGS_KEY },
      {
        $set: {
          tenantId: safeTenant,
          key: META_CATALOG_SETTINGS_KEY,
          value: normalized,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, strict: false }
    );
  } catch (dbErr) {
    console.warn(
      "[Meta Catalog] Mongoose settings update failed, falling back to direct collection update:",
      dbErr
    );
    await Settings.collection.updateOne(
      { tenantId: safeTenant, key: META_CATALOG_SETTINGS_KEY },
      {
        $set: {
          tenantId: safeTenant,
          key: META_CATALOG_SETTINGS_KEY,
          value: normalized,
        },
      },
      { upsert: true }
    );
  }

  invalidateMetaCatalogSettingsCache(safeTenant);
  return normalized;
}

export async function recordCatalogVerification(
  tenantId: string,
  result: {
    ok: boolean;
    catalogName?: string;
    productCount?: number;
    error?: string;
  }
): Promise<MetaCatalogSettings> {
  return saveMetaCatalogSettings(
    {
      lastVerifiedAt: result.ok ? new Date().toISOString() : undefined,
      lastVerificationError: result.ok ? undefined : result.error || "Verification failed",
      catalogName: result.ok ? result.catalogName : undefined,
      metaProductCount: result.ok ? result.productCount : undefined,
    },
    tenantId
  );
}

export function getPublicMetaCatalogSettings(
  settings: MetaCatalogSettings
): PublicMetaCatalogSettings {
  const hasCatalogId = Boolean(settings.catalogId);
  const hasToken = Boolean(settings.catalogApiToken);
  const apiConfigured = hasCatalogId && hasToken;

  let connectionState: MetaCatalogConnectionState = "not-configured";
  let connectionLabel = "Not Configured";
  let connectionDetail =
    "Catalog API management is optional. Scheduled-feed setup does not require a Meta token.";

  if (!hasCatalogId && hasToken) {
    connectionState = "credential-only";
    connectionLabel = "Catalog ID Required";
    connectionDetail = "A catalog API token is saved, but no Meta Catalog ID is configured.";
  } else if (hasCatalogId && !hasToken) {
    connectionState = "catalog-id-only";
    connectionLabel = "Credential Required";
    connectionDetail =
      "Catalog ID saved. Catalog API verification requires a separate catalog_management token.";
  } else if (apiConfigured) {
    if (settings.lastVerifiedAt && !settings.lastVerificationError) {
      connectionState = "verified";
      connectionLabel = "API Access Verified";
      connectionDetail = "Meta Graph API confirmed access to this catalog. Import status is still Meta-owned.";
    } else if (settings.lastVerificationError) {
      connectionState = "error";
      connectionLabel = "Verification Failed";
      connectionDetail = settings.lastVerificationError;
    } else {
      connectionState = "configured-untested";
      connectionLabel = "Configured (Not Verified)";
      connectionDetail =
        "Credentials saved. Run Verify API Access to confirm catalog_management permission.";
    }
  }

  return {
    tenantId: settings.tenantId || DEFAULT_TENANT_ID,
    catalogId: settings.catalogId,
    businessId: settings.businessId,
    hasCatalogApiToken: hasToken,
    maskedCatalogApiToken: maskSecret(settings.catalogApiToken),
    apiConfigured,
    connectionState,
    connectionLabel,
    connectionDetail,
    catalogName: settings.catalogName,
    metaProductCount: settings.metaProductCount,
    lastVerifiedAt: settings.lastVerifiedAt,
    lastVerificationError: settings.lastVerificationError,
    updatedAt: settings.updatedAt,
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Database query
 * ────────────────────────────────────────────────────────────────────────── */

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

export interface CatalogProductPage {
  products: FeedSourceProduct[];
  totalVisible: number;
  totalAll: number;
  excludedFromCatalog: number;
  page: number;
  perPage: number;
  totalPages: number;
  truncated: boolean;
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

/* ──────────────────────────────────────────────────────────────────────────
 * Feed generation
 * ────────────────────────────────────────────────────────────────────────── */

export interface GeneratedCatalogFeed {
  xml: string;
  build: CatalogFeedBuildResult;
  baseUrl: string;
  baseUrlSource: string;
  feedUrl: string;
  feedIsPublicHttps: boolean;
  productionFeedUrl: string;
  productionFeedUrlSource: string;
  localFeedUrl: string;
  environment: string;
  generatedAt: string;
  page: CatalogProductPage;
  warnings: string[];
}

export async function generateCatalogFeed(options: {
  requestOrigin?: string;
  page?: number;
  perPage?: number;
  env?: Record<string, string | undefined>;
  nodeEnv?: string;
} = {}): Promise<GeneratedCatalogFeed> {
  const env = options.env || process.env;
  const nodeEnv = options.nodeEnv || env.NODE_ENV || "development";
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

/* ──────────────────────────────────────────────────────────────────────────
 * Diagnostics and optional Catalog API verification
 * ────────────────────────────────────────────────────────────────────────── */

export interface CatalogFeedDiagnostics {
  generatedAt: string;
  environment: string;
  baseUrl: string;
  baseUrlSource: string;
  feedUrl: string;
  feedIsPublicHttps: boolean;
  productionFeedUrl: string;
  productionFeedUrlSource: string;
  localFeedUrl: string;
  publicHttpsConfigured: boolean;
  page: {
    page: number;
    perPage: number;
    totalPages: number;
    totalVisible: number;
    totalAll: number;
    excludedFromCatalog: number;
    truncated: boolean;
  };
  counts: CatalogFeedCounts;
  categoryCoverage: CatalogCategoryCoverage;
  latestProductUpdatedAt: string | null;
  allLinksPublicHttps: boolean;
  invalidSamples: CatalogFeedBuildResult["invalid"];
  excludedSamples: CatalogFeedBuildResult["excluded"];
  duplicateIds: string[];
  xmlBytes: number;
  warnings: string[];
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

export type ProductionFeedProbeState =
  | "reachable"
  | "invalid-response"
  | "http-error"
  | "network-error"
  | "not-public"
  | "not-configured";

function describeNetworkError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;

  const cause = (error as { cause?: { code?: string; message?: string } }).cause;
  if (cause?.code) return `${error.message} (${cause.code})`;
  if (cause?.message) return `${error.message} (${cause.message})`;
  return error.message || fallback;
}

export interface ProductionFeedProbe {
  state: ProductionFeedProbeState;
  checkedAt: string;
  url: string;
  httpStatus?: number;
  contentType?: string;
  itemCount?: number;
  bytes?: number;
  validXml?: boolean;
  error?: string;
  durationMs?: number;
}

export async function probeProductionFeed(
  url: string,
  timeoutMs = 12_000
): Promise<ProductionFeedProbe> {
  const checkedAt = new Date().toISOString();
  const safeUrl = validateAbsoluteUrl(url);

  if (!safeUrl) {
    return {
      state: "not-public",
      checkedAt,
      url,
      error:
        "A public HTTPS feed URL is required. Configure NEXT_PUBLIC_SITE_URL or META_CATALOG_BASE_URL with the production domain.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(safeUrl, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "application/xml, text/xml, application/rss+xml;q=0.9, */*;q=0.1",
        "User-Agent": "ANGKON-Catalog-Diagnostics/1.0 (+https://angkon.com.bd)",
      },
    });

    const body = await response.text();
    const contentType = response.headers.get("content-type") || "";
    const finalUrl = response.url || safeUrl;
    const finalUrlIsPublic = Boolean(validateAbsoluteUrl(finalUrl));
    const contentTypeIsXml = /(application|text)\/(xml|rss\+xml)/i.test(contentType);
    const validXml =
      /^\s*<\?xml/i.test(body) && /<rss[\s>]/i.test(body) && /<\/rss>/i.test(body);
    const itemCount = (body.match(/<item(?:\s|>)/gi) || []).length;
    const reachable =
      response.ok && validXml && contentTypeIsXml && finalUrlIsPublic;

    return {
      state: reachable ? "reachable" : "invalid-response",
      checkedAt,
      url: finalUrl,
      httpStatus: response.status,
      contentType,
      itemCount,
      bytes: Buffer.byteLength(body, "utf8"),
      validXml,
      error: reachable
        ? undefined
        : !response.ok
          ? `The public feed returned HTTP ${response.status}.`
          : !finalUrlIsPublic
            ? "The public feed redirected to a non-public or non-HTTPS URL."
            : !contentTypeIsXml
              ? `The feed responded with Content-Type "${contentType || "none"}" instead of an XML media type.`
              : "The URL responded, but the body is not a valid RSS 2.0 XML feed.",
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "AbortError" || error.message.toLowerCase().includes("abort"));
    return {
      state: "network-error",
      checkedAt,
      url: safeUrl,
      error: isTimeout
        ? `Public feed request timed out after ${timeoutMs}ms.`
        : describeNetworkError(error, "Network error reaching the public feed URL."),
      durationMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export interface CatalogApiVerificationResult {
  ok: boolean;
  catalogId: string;
  catalogName?: string;
  productCount?: number;
  fbtraceId?: string;
  error?: string;
  httpStatus?: number;
  checkedAt: string;
}

export async function verifyCatalogApiAccess(
  catalogId: string,
  accessToken: string,
  timeoutMs = 10_000
): Promise<CatalogApiVerificationResult> {
  const checkedAt = new Date().toISOString();
  const cleanId = normalizeMetaCatalogId(catalogId);
  const token = String(accessToken || "").trim();

  if (!cleanId || !token) {
    return {
      ok: false,
      catalogId: cleanId,
      error: "Both a Meta Catalog ID and a catalog API access token are required.",
      checkedAt,
    };
  }

  // Keep the credential out of the URL so it cannot leak into proxy or
  // platform request logs. Graph API accepts bearer authorization.
  const endpoint =
    `https://graph.facebook.com/v22.0/${encodeURIComponent(cleanId)}` +
    `?fields=${encodeURIComponent("id,name,product_count")}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const errorObject = payload.error as
      | { message?: string; fbtrace_id?: string }
      | undefined;

    if (!response.ok) {
      return {
        ok: false,
        catalogId: cleanId,
        httpStatus: response.status,
        fbtraceId: errorObject?.fbtrace_id,
        error: errorObject?.message || `Meta Graph API returned HTTP ${response.status}.`,
        checkedAt,
      };
    }

    return {
      ok: true,
      catalogId: cleanId,
      catalogName: typeof payload.name === "string" ? payload.name : undefined,
      productCount:
        typeof payload.product_count === "number" ? payload.product_count : undefined,
      httpStatus: response.status,
      checkedAt,
    };
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "AbortError" || error.message.toLowerCase().includes("abort"));
    return {
      ok: false,
      catalogId: cleanId,
      error: isTimeout
        ? `Meta Graph API request timed out after ${timeoutMs}ms.`
        : describeNetworkError(error, "Network error reaching Meta Graph API."),
      checkedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export { CATALOG_FEED_PATH };
