import type {
  MetaCatalogFeedOptions,
  MetaCatalogFeedResult,
  MetaCatalogItem,
  MetaPaginationInfo,
} from "./types";
import { mapProductsToMetaCatalog, DEFAULT_BASE_URL } from "./mapper";

const XML_ENTITY_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

export const DEFAULT_PAGE_SIZE = 1000;
export const MAX_PAGE_SIZE = 2000;

/**
 * Escapes XML entity characters and strips forbidden XML 1.0 control characters.
 */
export function escapeXml(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
    .replace(/[&<>"']/g, (char) => XML_ENTITY_MAP[char] || char);
}

function optionalTag(name: string, value: string | number | undefined): string {
  if (value === undefined || value === null || value === "") return "";
  return `      <g:${name}>${escapeXml(value)}</g:${name}>\n`;
}

/**
 * Serializes an array of Meta catalog items into RSS 2.0 XML.
 */
export function serializeItemsToXml(
  items: MetaCatalogItem[],
  options: {
    baseUrl: string;
    feedUrl: string;
    title?: string;
    description?: string;
    lastBuildDate?: string;
  }
): string {
  const channelTitle = options.title || "ANGKON Product Catalog Feed";
  const channelDesc =
    options.description || "ANGKON live product catalog for Meta Commerce Manager";
  const lastBuildDate = options.lastBuildDate || new Date().toUTCString();

  const itemsXml = items
    .map((item) => {
      const additionalImages = (item.additional_image_link || [])
        .map((img) => `      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>\n`)
        .join("");

      return `    <item>
      <g:id>${escapeXml(item.id)}</g:id>
      <g:title>${escapeXml(item.title)}</g:title>
      <g:description>${escapeXml(item.description)}</g:description>
      <g:link>${escapeXml(item.link)}</g:link>
      <g:image_link>${escapeXml(item.image_link)}</g:image_link>
${additionalImages}      <g:price>${escapeXml(item.price)}</g:price>
${optionalTag("sale_price", item.sale_price)}      <g:availability>${escapeXml(item.availability)}</g:availability>
      <g:condition>${escapeXml(item.condition)}</g:condition>
      <g:brand>${escapeXml(item.brand)}</g:brand>
      <g:identifier_exists>${item.identifier_exists}</g:identifier_exists>
${optionalTag("mpn", item.mpn)}${optionalTag("google_product_category", item.google_product_category)}${optionalTag("product_type", item.product_type)}${optionalTag("item_group_id", item.item_group_id)}${optionalTag("color", item.color)}${optionalTag("size", item.size)}${optionalTag("gender", item.gender)}${optionalTag("age_group", item.age_group)}${optionalTag("quantity_to_sell_on_facebook", item.quantity_to_sell_on_facebook)}    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(options.baseUrl)}</link>
    <description>${escapeXml(channelDesc)}</description>
    <language>en</language>
    <lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>
    <atom:link href="${escapeXml(options.feedUrl)}" rel="self" type="application/xml" />
${itemsXml}
  </channel>
</rss>
`;
}

/**
 * End-to-end feed generation from raw/lean products with validation, deduplication, and pagination.
 */
export function generateMetaCatalogFeed(
  products: unknown[],
  options: MetaCatalogFeedOptions
): MetaCatalogFeedResult {
  const { items, validationResults } = mapProductsToMetaCatalog(products, options);

  const totalInput = Array.isArray(products) ? products.length : 0;
  const validCount = validationResults.filter((r) => r.status === "valid").length;
  const invalidCount = validationResults.filter((r) => r.status === "invalid").length;
  const excludedCount = validationResults.filter((r) => r.status === "excluded").length;

  const perPage = Math.min(
    Math.max(1, options.perPage || DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE
  );
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const page = Math.min(Math.max(1, options.page || 1), totalPages);

  const start = (page - 1) * perPage;
  const paginatedItems = items.slice(start, start + perPage);

  const pagination: MetaPaginationInfo = {
    page,
    perPage,
    totalPages,
    totalVisible: paginatedItems.length,
    truncated: items.length > paginatedItems.length,
  };

  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const feedUrl = options.feedUrl || `${baseUrl}/api/meta/catalog-feed`;

  const xml = serializeItemsToXml(paginatedItems, {
    baseUrl,
    feedUrl,
    title: options.title,
    description: options.description,
  });

  return {
    xml,
    totalInput,
    validCount,
    invalidCount,
    excludedCount,
    items: paginatedItems,
    validationResults,
    pagination,
  };
}
