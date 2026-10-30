import { normalizeMetaProductId } from "./meta-product-id";

/** Meta Commerce catalog transport and validation helpers. */
export const META_CATALOG_CURRENCY = "BDT";
export const META_CATALOG_BRAND = "ANGKON";
export const DEFAULT_PRODUCTION_BASE_URL = "https://angkon.com.bd";
export const CATALOG_FEED_PATH = "/api/meta/catalog";
export const MAX_FEED_ITEMS = 10_000;
export const DEFAULT_FEED_PAGE_SIZE = 2_000;

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5_000;
const MAX_ADDITIONAL_IMAGES = 10;

export interface FeedSourceImage {
  src?: string;
  name?: string;
  alt?: string;
  [key: string]: unknown;
}

export interface FeedSourceCategory {
  id?: number;
  name?: string;
  slug?: string;
  parent?: number;
  [key: string]: unknown;
}

export interface FeedSourceAttribute {
  name?: string;
  options?: string[];
  visible?: boolean;
  [key: string]: unknown;
}

export interface FeedSourceProduct {
  id?: number | string;
  name?: string;
  slug?: string;
  permalink?: string;
  description?: string;
  short_description?: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  on_sale?: boolean;
  sku?: string;
  stock_status?: string;
  stock_quantity?: number | null;
  manage_stock?: boolean;
  sizes?: string[];
  images?: FeedSourceImage[];
  categories?: FeedSourceCategory[];
  attributes?: FeedSourceAttribute[];
  status?: string;
  published?: boolean;
  isPublished?: boolean;
  is_active?: boolean;
  visibility?: string;
  catalog_visibility?: string;
  deleted?: boolean;
  deletedAt?: string | Date | null;
  updatedAt?: string | Date;
  createdAt?: string | Date;
  [key: string]: unknown;
}

export interface CatalogFeedItem {
  id: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  additionalImageLinks: string[];
  price: string;
  salePrice?: string;
  availability: string;
  condition: string;
  brand: string;
  identifierExists: boolean;
  googleProductCategory?: string;
  productType?: string;
  itemGroupId?: string;
  size?: string;
  gender?: string;
  ageGroup?: string;
  color?: string;
  mpn?: string;
  quantityToSell?: number;
}

export interface FeedValidationIssue {
  productId: string | null;
  name: string;
  slug: string;
  reasons: string[];
}

export interface FeedExcludedProduct {
  productId: string | null;
  name: string;
  slug: string;
  reason: string;
}

export interface CatalogCategoryCoverage {
  mapped: number;
  generic: number;
  unmapped: number;
  byCategory: Record<string, number>;
}

export interface CatalogFeedCounts {
  totalInput: number;
  validItems: number;
  invalidItems: number;
  excludedItems: number;
  duplicateItems: number;
  issueCounts: Record<string, number>;
}

export interface CatalogFeedBuildResult {
  items: CatalogFeedItem[];
  invalid: FeedValidationIssue[];
  excluded: FeedExcludedProduct[];
  duplicateIds: string[];
  counts: CatalogFeedCounts;
  categoryCoverage: CatalogCategoryCoverage;
  latestProductUpdatedAt: string | null;
  allLinksPublicHttps: boolean;
}

export interface CatalogFeedBuildOptions {
  baseUrl: string;
  brand?: string;
  currency?: string;
  /** Local development previews may use http://localhost links. Never enabled in production. */
  allowLocalHttp?: boolean;
  /** Limit is applied by the database layer; this is a final safety guard. */
  maxItems?: number;
}

export interface CatalogFeedUrlResolution {
  baseUrl: string;
  source: string;
  isPublicHttps: boolean;
  isLocal: boolean;
  warnings: string[];
}

export interface CatalogUrlValidationOptions {
  allowLocalHttp?: boolean;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Text and XML safety
 * ────────────────────────────────────────────────────────────────────────── */

const XML_ENTITY_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

export function escapeXml(value: unknown): string {
  return String(value ?? "")
    // XML 1.0 forbids most C0 control characters; strip them before escaping so
    // malformed product copy cannot produce a feed Meta refuses to parse.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
    .replace(/[&<>"']/g, (char) => XML_ENTITY_MAP[char]);
}

/** Converts admin-authored HTML/Markdown-ish product copy into safe plain text. */
export function htmlToPlainText(value: unknown): string {
  return String(value ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&hellip;/gi, "...")
    .replace(/&mdash;/gi, "--")
    .replace(/&ndash;/gi, "-")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, Math.max(0, maxLength - 1)).trimEnd() + "…";
}

/* ──────────────────────────────────────────────────────────────────────────
 * URL resolution and validation
 * ────────────────────────────────────────────────────────────────────────── */

export function isLocalOrPrivateHostname(hostname: string): boolean {
  const host = String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.+$/, "");

  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "0.0.0.0" || host === "::1" || host === "::") return true;
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".lan")) return true;
  if (/^127\./.test(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host)) return true;
  if (/^f[cd][0-9a-f]{2}:/i.test(host)) return true;
  if (/^fe[89ab][0-9a-f]:/i.test(host)) return true;
  // IPv4-mapped IPv6 forms such as ::ffff:127.0.0.1 or ::ffff:7f00:1.
  if (/^::ffff:(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
    return true;
  }
  if (/^::ffff:7f[0-9a-f]{2}:/i.test(host)) return true;

  return false;
}

function normalizeBaseUrl(
  raw: string,
  source: string
): CatalogFeedUrlResolution | null {
  const value = String(raw || "").trim();
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (parsed.username || parsed.password) return null;

    const isLocal = isLocalOrPrivateHostname(parsed.hostname);
    const isHttps = parsed.protocol === "https:";
    const pathname = parsed.pathname.replace(/\/+$/, "");
    const baseUrl = `${parsed.origin}${pathname}`;

    return {
      baseUrl,
      source,
      isPublicHttps: isHttps && !isLocal,
      isLocal,
      warnings: [],
    };
  } catch {
    return null;
  }
}

function withProtocolForHost(value: string): string {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Development servers bound to 0.0.0.0 report that host in the request origin.
 * It is a bind address, not a browsable host, so preview links should use
 * localhost instead. This helper is never applied in production.
 */
function sanitizeDevRequestOrigin(origin?: string): string | undefined {
  if (!origin) return undefined;

  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
    if (hostname === "0.0.0.0" || hostname === "::") {
      parsed.hostname = "localhost";
      return parsed.origin;
    }
  } catch {
    return undefined;
  }

  return origin;
}

/**
 * Resolves the URL used to build absolute feed links.
 *
 * Production never trusts the request Host header and never accepts a
 * localhost/private origin. A canonical public HTTPS environment URL is
 * required; if it is absent we fall back to the configured production domain.
 */
export function resolvePublicBaseUrl(options: {
  env?: Record<string, string | undefined>;
  requestOrigin?: string;
  nodeEnv?: string;
} = {}): CatalogFeedUrlResolution {
  const env = options.env || process.env;
  const nodeEnv = options.nodeEnv || env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";
  const warnings: string[] = [];

  const candidates: Array<[string, string]> = [
    ["META_CATALOG_BASE_URL", env.META_CATALOG_BASE_URL || ""],
    ["NEXT_PUBLIC_SITE_URL", env.NEXT_PUBLIC_SITE_URL || ""],
    ["SITE_URL", env.SITE_URL || ""],
    ["NEXT_PUBLIC_APP_URL", env.NEXT_PUBLIC_APP_URL || ""],
    ["APP_URL", env.APP_URL || ""],
    [
      "VERCEL_PROJECT_PRODUCTION_URL",
      withProtocolForHost(env.VERCEL_PROJECT_PRODUCTION_URL || ""),
    ],
    ["VERCEL_URL", withProtocolForHost(env.VERCEL_URL || "")],
  ];

  for (const [source, raw] of candidates) {
    if (!raw) continue;
    const normalized = normalizeBaseUrl(raw, source);
    if (!normalized) {
      warnings.push(`${source} is not a valid http(s) URL.`);
      continue;
    }
    if (isProduction && !normalized.isPublicHttps) {
      warnings.push(`${source} is not a public HTTPS origin and was ignored in production.`);
      continue;
    }
    return { ...normalized, warnings };
  }

  const devOrigin = sanitizeDevRequestOrigin(options.requestOrigin);
  if (!isProduction && devOrigin) {
    const requestOrigin = normalizeBaseUrl(devOrigin, "request-origin");
    if (requestOrigin) return { ...requestOrigin, warnings };
  }

  if (isProduction) {
    const fallback = normalizeBaseUrl(DEFAULT_PRODUCTION_BASE_URL, "default-production-domain");
    if (fallback) {
      return {
        ...fallback,
        warnings: [
          ...warnings,
          "No canonical public HTTPS URL is configured; using the built-in production domain. Set NEXT_PUBLIC_SITE_URL or META_CATALOG_BASE_URL to override.",
        ],
      };
    }
  }

  return {
    baseUrl: "http://localhost:3001",
    source: "development-fallback",
    isPublicHttps: false,
    isLocal: true,
    warnings,
  };
}

/** The URL customers must give to Meta Commerce Manager. */
export function resolveProductionBaseUrl(
  env: Record<string, string | undefined> = process.env
): CatalogFeedUrlResolution {
  const candidates: Array<[string, string]> = [
    ["META_CATALOG_BASE_URL", env.META_CATALOG_BASE_URL || ""],
    ["NEXT_PUBLIC_SITE_URL", env.NEXT_PUBLIC_SITE_URL || ""],
    ["SITE_URL", env.SITE_URL || ""],
    ["NEXT_PUBLIC_APP_URL", env.NEXT_PUBLIC_APP_URL || ""],
    ["APP_URL", env.APP_URL || ""],
    [
      "VERCEL_PROJECT_PRODUCTION_URL",
      withProtocolForHost(env.VERCEL_PROJECT_PRODUCTION_URL || ""),
    ],
  ];

  for (const [source, raw] of candidates) {
    if (!raw) continue;
    const normalized = normalizeBaseUrl(raw, source);
    if (normalized?.isPublicHttps) return normalized;
  }

  const fallback = normalizeBaseUrl(DEFAULT_PRODUCTION_BASE_URL, "default-production-domain");
  const warning =
    "No canonical public HTTPS URL is configured; using the built-in production domain. Set NEXT_PUBLIC_SITE_URL or META_CATALOG_BASE_URL to override.";

  return (
    (fallback && { ...fallback, warnings: [warning] }) || {
      baseUrl: DEFAULT_PRODUCTION_BASE_URL,
      source: "default-production-domain",
      isPublicHttps: true,
      isLocal: false,
      warnings: [warning],
    }
  );
}

export function resolveLocalBaseUrl(requestOrigin?: string): CatalogFeedUrlResolution {
  const devOrigin = sanitizeDevRequestOrigin(requestOrigin);
  if (devOrigin) {
    const normalized = normalizeBaseUrl(devOrigin, "request-origin");
    if (normalized?.isLocal) return normalized;
  }

  return {
    baseUrl: "http://localhost:3001",
    source: "development-fallback",
    isPublicHttps: false,
    isLocal: true,
    warnings: [],
  };
}

export function buildFeedUrl(baseUrl: string): string {
  const base = new URL(baseUrl);
  const path = `${base.pathname.replace(/\/+$/, "")}${CATALOG_FEED_PATH}`;
  return new URL(path, base.origin).toString();
}

export function validateAbsoluteUrl(
  value: unknown,
  options: CatalogUrlValidationOptions = {}
): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    if (parsed.username || parsed.password) return null;

    const local = isLocalOrPrivateHostname(parsed.hostname);
    if (parsed.protocol === "https:" && !local) return parsed.toString();
    if (options.allowLocalHttp && parsed.protocol === "http:" && local) {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Product validation and mapping
 * ────────────────────────────────────────────────────────────────────────── */

export function toNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const cleaned = String(value ?? "")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatMetaPrice(amount: number, currency = META_CATALOG_CURRENCY): string {
  return `${amount.toFixed(2)} ${currency}`;
}

export function resolveProductPricing(product: FeedSourceProduct): {
  price: string;
  salePrice?: string;
  amount: number;
} | null {
  const regular = toNumber(product.regular_price);
  const sale = toNumber(product.sale_price);
  const current = toNumber(product.price);

  const effective =
    current !== null && current > 0
      ? current
      : product.on_sale && sale !== null && sale > 0
        ? sale
        : regular !== null && regular > 0
          ? regular
          : sale !== null && sale > 0
            ? sale
            : null;

  if (effective === null) return null;

  if (
    regular !== null &&
    regular > 0 &&
    effective < regular &&
    (product.on_sale || (sale !== null && sale > 0))
  ) {
    return {
      price: formatMetaPrice(regular),
      salePrice: formatMetaPrice(effective),
      amount: effective,
    };
  }

  return { price: formatMetaPrice(effective), amount: effective };
}

export function mapAvailability(product: FeedSourceProduct): string {
  const status = String(product.stock_status || "").trim().toLowerCase();
  const quantity = toNumber(product.stock_quantity);
  const managed = Boolean(product.manage_stock);

  if (status === "preorder") return "preorder";
  if (status === "discontinued") return "discontinued";
  if (status === "outofstock" || status === "out_of_stock") return "out of stock";
  if (managed && quantity !== null && quantity <= 0) return "out of stock";
  if (status === "onbackorder" || status === "backorder") return "available for order";

  return "in stock";
}

export function mapCondition(): string {
  return "new";
}

export interface CategoryMapping {
  category: string | null;
  matchedTerm: string | null;
}

const CATEGORY_RULES: Array<{ pattern: RegExp; category: string }> = [
  {
    pattern: /(cap|hat|bracelet|choker|bag|belt|scarf|accessor)/i,
    category: "Apparel & Accessories > Clothing Accessories",
  },
  {
    pattern: /(sharee|saree|sari|dress|gown)/i,
    category: "Apparel & Accessories > Clothing > Dresses",
  },
  {
    pattern:
      /(ethnic|traditional|panjabi|panjab|kurta|kameez|salwar|shalwar|lehenga|sherwani|abaya|dupatta|three.?piece|3.?piece|suit)/i,
    category: "Apparel & Accessories > Clothing > Traditional & Ceremonial Clothing",
  },
  {
    pattern: /(t.?shirt|tee|shirt|blouse|top)/i,
    category: "Apparel & Accessories > Clothing > Shirts & Tops",
  },
  {
    pattern: /(pant|trouser|cargo|jeans|denim)/i,
    category: "Apparel & Accessories > Clothing > Pants",
  },
  {
    pattern: /(jacket|coat|blazer|outerwear|bomber)/i,
    category: "Apparel & Accessories > Clothing > Outerwear",
  },
  {
    pattern: /(skirt)/i,
    category: "Apparel & Accessories > Clothing > Skirts",
  },
  {
    pattern: /(shoe|footwear|sandal|sneaker|heel)/i,
    category: "Apparel & Accessories > Shoes",
  },
  {
    pattern: /(watch)/i,
    category: "Apparel & Accessories > Watches",
  },
  {
    pattern: /(jewel|necklace|earring|ring)/i,
    category: "Apparel & Accessories > Jewelry",
  },
];

/**
 * Maps the store's real category taxonomy to a Meta/Google taxonomy category.
 * Returns null when the store category is not specific enough, so the UI can
 * report coverage honestly instead of claiming every item is classified.
 */
export function resolveGoogleProductCategory(product: FeedSourceProduct): CategoryMapping {
  const categories = Array.isArray(product.categories) ? product.categories : [];
  const tokens = categories
    .map((category) => `${category?.name || ""} ${category?.slug || ""}`)
    .join(" ");

  const searchText = `${tokens} ${String(product.name || "")}`.trim();
  if (!searchText) return { category: null, matchedTerm: null };

  for (const rule of CATEGORY_RULES) {
    const match = searchText.match(rule.pattern);
    if (match) {
      return { category: rule.category, matchedTerm: match[0] };
    }
  }

  return { category: null, matchedTerm: null };
}

export function deriveProductType(product: FeedSourceProduct): string | undefined {
  const categories = Array.isArray(product.categories) ? product.categories : [];
  const names = categories
    .map((category) => htmlToPlainText(category?.name))
    .filter(Boolean);

  if (names.length === 0) return undefined;
  return Array.from(new Set(names)).join(" > ").slice(0, 500);
}

export function resolveGender(product: FeedSourceProduct): string | undefined {
  const categories = Array.isArray(product.categories) ? product.categories : [];
  const text = `${categories.map((c) => `${c?.name || ""} ${c?.slug || ""}`).join(" ")} ${
    product.name || ""
  }`.toLowerCase();

  const hasWomen = /\b(women|woman|female|ladies)\b/.test(text);
  const hasMen = /\b(men|man|male|gents)\b/.test(text);
  if ((hasWomen && hasMen) || /\bunisex\b/.test(text)) return "unisex";
  if (hasWomen) return "female";
  if (hasMen) return "male";
  return undefined;
}

function findAttribute(product: FeedSourceProduct, name: string): string | undefined {
  const attributes = Array.isArray(product.attributes) ? product.attributes : [];
  const match = attributes.find(
    (attribute) => String(attribute?.name || "").trim().toLowerCase() === name
  );
  const value = match?.options?.find((option) => String(option || "").trim());
  return value ? htmlToPlainText(value) : undefined;
}

function resolveBrand(product: FeedSourceProduct, fallback: string): string {
  return findAttribute(product, "brand") || fallback;
}

function resolveSizes(product: FeedSourceProduct): string | undefined {
  const sizes = Array.isArray(product.sizes)
    ? product.sizes.map((size) => htmlToPlainText(size)).filter(Boolean)
    : [];
  const attrSizes = findAttribute(product, "size") || findAttribute(product, "sizes");
  const resolved = sizes.length > 0 ? sizes : attrSizes ? [attrSizes] : [];
  if (resolved.length === 0) return undefined;
  return Array.from(new Set(resolved)).join(", ").slice(0, 200);
}

function resolveItemGroupId(product: FeedSourceProduct): string | undefined {
  const raw = product.item_group_id ?? product.group_id ?? product.parent_id;
  return normalizeMetaProductId(raw) || undefined;
}

export function getProductExclusionReason(product: FeedSourceProduct): string | null {
  if (product.deleted === true || product.deletedAt) return "deleted";
  if (product.published === false || product.isPublished === false) return "unpublished";
  if (product.is_active === false) return "inactive";

  const status = String(product.status || "").trim().toLowerCase();
  if (status) {
    const allowed = ["publish", "published", "active", "live", "enabled"];
    if (!allowed.includes(status)) return `status_${status}`;
  }

  const visibility = String(product.visibility || "").trim().toLowerCase();
  if (visibility) {
    const allowed = ["public", "visible", "catalog", "shop", "visible_in_catalog"];
    if (!allowed.includes(visibility)) return `visibility_${visibility}`;
  }

  const catalogVisibility = String(product.catalog_visibility || "").trim().toLowerCase();
  if (catalogVisibility) {
    const allowed = ["public", "visible", "catalog", "shop", "visible_in_catalog"];
    if (!allowed.includes(catalogVisibility)) return `catalog_visibility_${catalogVisibility}`;
  }

  return null;
}

function buildProductLink(baseUrl: string, slug: string, allowLocalHttp: boolean): string | null {
  const cleanSlug = String(slug || "").trim().replace(/^\/+|\/+$/g, "");
  if (!cleanSlug) return null;

  try {
    const base = new URL(baseUrl);
    const basePath = base.pathname.replace(/\/+$/, "");
    const encodedSlug = cleanSlug
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    const url = new URL(`${basePath}/products/${encodedSlug}`, base.origin).toString();
    return validateAbsoluteUrl(url, { allowLocalHttp });
  } catch {
    return null;
  }
}

export function buildFeedProduct(
  product: FeedSourceProduct,
  options: CatalogFeedBuildOptions
): { item: CatalogFeedItem | null; issues: string[] } {
  const allowLocalHttp = Boolean(options.allowLocalHttp);
  const issues: string[] = [];

  const id = normalizeMetaProductId(product.id);
  if (!id) issues.push("missing_or_invalid_product_id");

  const title = htmlToPlainText(product.name);
  if (!title) issues.push("missing_title");

  const descriptionSource =
    htmlToPlainText(product.short_description) || htmlToPlainText(product.description);
  if (!descriptionSource) issues.push("missing_description");

  const link = buildProductLink(options.baseUrl, String(product.slug || ""), allowLocalHttp);
  if (!link) issues.push("missing_or_invalid_product_link");

  const imageSources = Array.isArray(product.images)
    ? product.images.map((image) => image?.src).filter(Boolean)
    : [];
  const validImages: string[] = [];
  for (const source of imageSources) {
    const safe = validateAbsoluteUrl(source, { allowLocalHttp });
    if (safe && !validImages.includes(safe)) validImages.push(safe);
  }

  if (imageSources.length === 0) {
    issues.push("missing_image");
  } else if (validImages.length === 0) {
    issues.push("missing_or_invalid_image_url");
  }

  const pricing = resolveProductPricing(product);
  if (!pricing) issues.push("missing_or_invalid_price");

  if (issues.length > 0 || !id || !link || !pricing || validImages.length === 0) {
    return { item: null, issues };
  }

  const categoryMapping = resolveGoogleProductCategory(product);
  const quantity = toNumber(product.stock_quantity);
  const brand = resolveBrand(product, options.brand || META_CATALOG_BRAND);
  const mpn = String(product.sku || "").trim() || undefined;

  return {
    item: {
      id,
      title: truncateText(title, MAX_TITLE_LENGTH),
      description: truncateText(descriptionSource, MAX_DESCRIPTION_LENGTH),
      link,
      imageLink: validImages[0],
      additionalImageLinks: validImages.slice(1, MAX_ADDITIONAL_IMAGES + 1),
      price: pricing.price,
      salePrice: pricing.salePrice,
      availability: mapAvailability(product),
      condition: mapCondition(),
      brand,
      identifierExists: Boolean(brand && mpn),
      googleProductCategory: categoryMapping.category || undefined,
      productType: deriveProductType(product),
      itemGroupId: resolveItemGroupId(product),
      size: resolveSizes(product),
      gender: resolveGender(product),
      ageGroup: "adult",
      color: findAttribute(product, "color"),
      mpn,
      quantityToSell:
        product.manage_stock && quantity !== null && quantity >= 0
          ? Math.floor(quantity)
          : undefined,
    },
    issues,
  };
}

export function buildCatalogFeed(
  products: FeedSourceProduct[],
  options: CatalogFeedBuildOptions
): CatalogFeedBuildResult {
  const maxItems = Math.max(1, options.maxItems || MAX_FEED_ITEMS);
  const items: CatalogFeedItem[] = [];
  const invalid: FeedValidationIssue[] = [];
  const excluded: FeedExcludedProduct[] = [];
  const duplicateIds: string[] = [];
  // `allIds` records every candidate seen (valid or malformed) so duplicates are
  // reported honestly, while `emittedIds` guarantees the XML never repeats an id.
  // A malformed row must not shadow a later valid row that shares its id.
  const allIds = new Set<string>();
  const emittedIds = new Set<string>();
  const issueCounts: Record<string, number> = {};
  const categoryCoverage: CatalogCategoryCoverage = {
    mapped: 0,
    generic: 0,
    unmapped: 0,
    byCategory: {},
  };

  let latestProductUpdatedAt: number | null = null;
  let allLinksPublicHttps = true;

  for (const product of products) {
    const exclusion = getProductExclusionReason(product);
    if (exclusion) {
      excluded.push({
        productId: normalizeMetaProductId(product.id),
        name: htmlToPlainText(product.name),
        slug: String(product.slug || ""),
        reason: exclusion,
      });
      continue;
    }

    const updatedAt = product.updatedAt ? new Date(product.updatedAt).getTime() : NaN;
    if (Number.isFinite(updatedAt) && (latestProductUpdatedAt === null || updatedAt > latestProductUpdatedAt)) {
      latestProductUpdatedAt = updatedAt;
    }

    const { item, issues } = buildFeedProduct(product, options);

    if (item) {
      if (emittedIds.has(item.id)) {
        duplicateIds.push(item.id);
        invalid.push({
          productId: item.id,
          name: item.title,
          slug: String(product.slug || ""),
          reasons: ["duplicate_product_id"],
        });
        issueCounts.duplicate_product_id = (issueCounts.duplicate_product_id || 0) + 1;
        continue;
      }

      if (allIds.has(item.id)) {
        // Same id as an earlier malformed row: surface the collision, but keep
        // this valid row because it is the only one that can safely be emitted.
        duplicateIds.push(item.id);
      }

      allIds.add(item.id);
      emittedIds.add(item.id);
      items.push(item);

      if (items.length >= maxItems) break;

      if (item.googleProductCategory) {
        categoryCoverage.mapped++;
        categoryCoverage.byCategory[item.googleProductCategory] =
          (categoryCoverage.byCategory[item.googleProductCategory] || 0) + 1;
      } else if (item.productType) {
        categoryCoverage.generic++;
      } else {
        categoryCoverage.unmapped++;
      }

      if (!item.link.startsWith("https://") || !item.imageLink.startsWith("https://")) {
        allLinksPublicHttps = false;
      }
      continue;
    }

    // Duplicate detection still needs the canonical id even for malformed rows.
    const candidateId = normalizeMetaProductId(product.id);
    if (candidateId) {
      if (allIds.has(candidateId)) {
        duplicateIds.push(candidateId);
        issues.push("duplicate_product_id");
      } else {
        allIds.add(candidateId);
      }
    }

    for (const reason of issues) {
      issueCounts[reason] = (issueCounts[reason] || 0) + 1;
    }

    invalid.push({
      productId: candidateId,
      name: htmlToPlainText(product.name),
      slug: String(product.slug || ""),
      reasons: issues,
    });
  }

  return {
    items,
    invalid,
    excluded,
    duplicateIds: Array.from(new Set(duplicateIds)),
    counts: {
      totalInput: products.length,
      validItems: items.length,
      invalidItems: invalid.length,
      excludedItems: excluded.length,
      duplicateItems: duplicateIds.length,
      issueCounts,
    },
    categoryCoverage,
    latestProductUpdatedAt:
      latestProductUpdatedAt === null ? null : new Date(latestProductUpdatedAt).toISOString(),
    allLinksPublicHttps: items.length > 0 && allLinksPublicHttps,
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * RSS 2.0 / Google Merchant XML serialization
 * ────────────────────────────────────────────────────────────────────────── */

export interface CatalogXmlOptions {
  baseUrl: string;
  feedUrl: string;
  generatedAt?: string;
  title?: string;
  description?: string;
}

function optionalTag(name: string, value: string | number | undefined): string {
  if (value === undefined || value === null || value === "") return "";
  return `      <g:${name}>${escapeXml(value)}</g:${name}>\n`;
}

export function generateCatalogXml(
  items: CatalogFeedItem[],
  options: CatalogXmlOptions
): string {
  const generatedAt = options.generatedAt || new Date().toISOString();
  const feedUrl = escapeXml(options.feedUrl);
  const baseUrl = escapeXml(options.baseUrl);

  const itemXml = items
    .map((item) => {
      const additionalImages = item.additionalImageLinks
        .map((image) => `      <g:additional_image_link>${escapeXml(image)}</g:additional_image_link>\n`)
        .join("");

      return `    <item>
      <g:id>${escapeXml(item.id)}</g:id>
      <g:title>${escapeXml(item.title)}</g:title>
      <g:description>${escapeXml(item.description)}</g:description>
      <g:link>${escapeXml(item.link)}</g:link>
      <g:image_link>${escapeXml(item.imageLink)}</g:image_link>
${additionalImages}      <g:price>${escapeXml(item.price)}</g:price>
${optionalTag("sale_price", item.salePrice)}      <g:availability>${escapeXml(item.availability)}</g:availability>
      <g:condition>${escapeXml(item.condition)}</g:condition>
      <g:brand>${escapeXml(item.brand)}</g:brand>
      <g:identifier_exists>${item.identifierExists ? "yes" : "no"}</g:identifier_exists>
${optionalTag("mpn", item.mpn)}${optionalTag("google_product_category", item.googleProductCategory)}${optionalTag("product_type", item.productType)}${optionalTag("item_group_id", item.itemGroupId)}${optionalTag("size", item.size)}${optionalTag("gender", item.gender)}${optionalTag("age_group", item.ageGroup)}${optionalTag("color", item.color)}${optionalTag("quantity_to_sell_on_facebook", item.quantityToSell)}    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(options.title || "Maison ANGKON Product Catalog")}</title>
    <link>${baseUrl}</link>
    <description>${escapeXml(
      options.description ||
        "ANGKON product catalog for Meta Commerce Manager and Dynamic Product Ads"
    )}</description>
    <language>en</language>
    <lastBuildDate>${escapeXml(new Date(generatedAt).toUTCString())}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/xml" />
${itemXml}
  </channel>
</rss>
`;
}
