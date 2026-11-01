import { normalizeMetaProductId } from "@/lib/meta-product-id";
import type { MetaProductValidationResult, MetaProductValidationStatus } from "./types";

export interface ValidatorOptions {
  baseUrl?: string;
  allowLocalHttp?: boolean;
}

const DEFAULT_BASE_URL = "https://www.angkon.net";

function stripHtml(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
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
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidHttpUrl(urlString: string, allowLocalHttp = false): boolean {
  try {
    const url = new URL(urlString);
    if (url.protocol === "https:") return true;
    if (url.protocol === "http:" && allowLocalHttp) {
      return (
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname.endsWith(".localhost")
      );
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Checks whether a product has been explicitly unpublished, drafted, or deleted.
 */
export function getProductExclusionReason(product: Record<string, unknown>): string | null {
  if (product.deleted === true || product.deletedAt) {
    return "product_deleted";
  }
  if (product.published === false || product.isPublished === false || product.is_active === false) {
    return "product_unpublished";
  }

  const status = String(product.status || "").trim().toLowerCase();
  if (status) {
    const allowed = ["publish", "published", "active", "live", "enabled"];
    if (!allowed.includes(status)) {
      return `status_${status}`;
    }
  }

  const visibility = String(product.visibility || "").trim().toLowerCase();
  if (visibility) {
    const allowed = ["public", "visible", "catalog", "shop", "visible_in_catalog"];
    if (!allowed.includes(visibility)) {
      return `visibility_${visibility}`;
    }
  }

  const catalogVisibility = String(product.catalog_visibility || "").trim().toLowerCase();
  if (catalogVisibility) {
    const allowed = ["public", "visible", "catalog", "shop", "visible_in_catalog"];
    if (!allowed.includes(catalogVisibility)) {
      return `catalog_visibility_${catalogVisibility}`;
    }
  }

  return null;
}

/**
 * Validates a single product record for Meta Commerce Manager Catalog Feed compliance.
 */
export function validateProduct(
  rawProduct: unknown,
  options: ValidatorOptions = {}
): MetaProductValidationResult {
  const product = (rawProduct && typeof rawProduct === "object" ? rawProduct : {}) as Record<
    string,
    unknown
  >;

  const productId = normalizeMetaProductId(product.id);
  const sku = product.sku ? String(product.sku).trim() : null;
  const name = stripHtml(product.name);
  const slug = String(product.slug || "").trim();

  const errors: string[] = [];
  const warnings: string[] = [];
  const missingAttributes: string[] = [];

  // Check exclusion criteria
  const exclusionReason = getProductExclusionReason(product);
  if (exclusionReason) {
    return {
      isValid: false,
      productId,
      sku,
      name,
      slug,
      status: "excluded",
      errors: [exclusionReason],
      warnings: [],
      missingAttributes: [],
    };
  }

  // 1. Identification
  if (!productId) {
    errors.push("missing_or_invalid_id");
  }

  if (!slug) {
    errors.push("missing_slug");
  }

  // 2. Title & Description
  if (!name) {
    errors.push("missing_title");
  }

  const descriptionSource =
    stripHtml(product.short_description) || stripHtml(product.description);
  if (!descriptionSource) {
    errors.push("missing_description");
  }

  // 3. Link resolution
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  if (slug) {
    const productUrl = `${baseUrl.replace(/\/+$/, "")}/products/${encodeURIComponent(slug)}`;
    if (!isValidHttpUrl(productUrl, options.allowLocalHttp)) {
      errors.push("invalid_product_link");
    }
  }

  // 4. Image requirements
  const images = Array.isArray(product.images) ? product.images : [];
  const rawSources = images
    .map((img) => (img && typeof img === "object" ? String((img as Record<string, unknown>).src || "") : ""))
    .filter(Boolean);

  if (rawSources.length === 0) {
    errors.push("missing_image");
  } else {
    const validImages = rawSources.filter((src) =>
      isValidHttpUrl(src, options.allowLocalHttp)
    );
    if (validImages.length === 0) {
      errors.push("invalid_image_url");
    }
  }

  // 5. Pricing
  const regularPriceStr = product.regular_price !== undefined ? String(product.regular_price) : "";
  const salePriceStr = product.sale_price !== undefined ? String(product.sale_price) : "";
  const priceStr = product.price !== undefined ? String(product.price) : "";

  const priceCandidate = priceStr || salePriceStr || regularPriceStr;
  const numPrice = Number(priceCandidate);

  if (!priceCandidate || isNaN(numPrice) || numPrice <= 0) {
    errors.push("missing_or_invalid_price");
  }

  if (salePriceStr) {
    const numSale = Number(salePriceStr);
    const numRegular = Number(regularPriceStr || priceCandidate);
    if (!isNaN(numSale) && numSale > 0 && numRegular > 0 && numSale >= numRegular) {
      warnings.push("sale_price_not_lower_than_regular_price");
    }
  }

  // 6. Non-blocking / Recommended Attributes
  if (!sku) {
    warnings.push("missing_sku");
    missingAttributes.push("sku");
  }

  // Brand attribute check
  const attributes = Array.isArray(product.attributes)
    ? (product.attributes as Array<Record<string, unknown>>)
    : [];
  const brandAttr = attributes.find(
    (a) => String(a?.name || "").toLowerCase() === "brand"
  );
  const brandVal = Array.isArray(brandAttr?.options) ? brandAttr.options[0] : undefined;
  if (!brandVal && !product.brand) {
    warnings.push("missing_brand_attribute");
    missingAttributes.push("brand");
  }

  // Color attribute check
  const colorAttr = attributes.find(
    (a) => String(a?.name || "").toLowerCase() === "color"
  );
  const colorVal = Array.isArray(colorAttr?.options) ? colorAttr.options[0] : undefined;
  if (!colorVal && !product.color) {
    warnings.push("missing_color");
    missingAttributes.push("color");
  }

  // Size attribute check
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  const sizeAttr = attributes.find(
    (a) =>
      String(a?.name || "").toLowerCase() === "size" ||
      String(a?.name || "").toLowerCase() === "sizes"
  );
  const sizeVal = Array.isArray(sizeAttr?.options) && sizeAttr.options.length > 0;
  if (sizes.length === 0 && !sizeVal && !product.size) {
    warnings.push("missing_size");
    missingAttributes.push("size");
  }

  const status: MetaProductValidationStatus = errors.length > 0 ? "invalid" : "valid";

  return {
    isValid: status === "valid",
    productId,
    sku,
    name,
    slug,
    status,
    errors,
    warnings,
    missingAttributes,
  };
}

/**
 * Validates a list of products and reports aggregate statuses.
 */
export function validateProducts(
  products: unknown[],
  options: ValidatorOptions = {}
): MetaProductValidationResult[] {
  if (!Array.isArray(products)) return [];
  return products.map((product) => validateProduct(product, options));
}

/**
 * Quick eligibility helper returning true only if the product is publishable.
 */
export function isProductEligibleForFeed(product: unknown): boolean {
  if (!product || typeof product !== "object") return false;
  return getProductExclusionReason(product as Record<string, unknown>) === null;
}
