import { normalizeMetaProductId } from "@/lib/meta-product-id";
import type {
  MetaAgeGroup,
  MetaAvailability,
  MetaCatalogFeedOptions,
  MetaCatalogItem,
  MetaGender,
  MetaProductValidationResult,
} from "./types";
import { validateProduct } from "./validator";

export const DEFAULT_CURRENCY = "BDT";
export const DEFAULT_BRAND = "ANGKON";
export const DEFAULT_BASE_URL = "https://www.angkon.net";

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_ADDITIONAL_IMAGES = 10;

function cleanPlainText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
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
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, Math.max(0, maxLength - 1)).trimEnd() + "…";
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatPrice(amount: number, currency = DEFAULT_CURRENCY): string {
  const rounded = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${rounded} ${currency}`;
}

export function resolveAvailability(product: Record<string, unknown>): MetaAvailability {
  const status = String(product.stock_status || "").trim().toLowerCase();
  const quantity = parseNumber(product.stock_quantity);
  const managed = Boolean(product.manage_stock);

  if (status === "preorder") return "preorder";
  if (status === "discontinued") return "discontinued";
  if (status === "outofstock" || status === "out_of_stock") return "out of stock";
  if (managed && quantity !== null && quantity <= 0) return "out of stock";
  if (status === "onbackorder" || status === "backorder") return "available for order";

  return "in stock";
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
      /(ethnic|traditional|panjabi|panjab|kurta|kameez|salwar|shalwar|lehenga|sherwani|abaya|dupatta|three.?piece|3.?piece|suit|garara)/i,
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

export function resolveGoogleProductCategory(product: Record<string, unknown>): string | undefined {
  const categories = Array.isArray(product.categories) ? product.categories : [];
  const tokens = categories
    .map((c) => (c && typeof c === "object" ? `${(c as Record<string, unknown>).name || ""} ${(c as Record<string, unknown>).slug || ""}` : ""))
    .join(" ");

  const searchText = `${tokens} ${String(product.name || "")}`.trim();
  if (!searchText) return undefined;

  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(searchText)) {
      return rule.category;
    }
  }

  return undefined;
}

export function resolveProductType(product: Record<string, unknown>): string | undefined {
  const categories = Array.isArray(product.categories) ? product.categories : [];
  const names = categories
    .map((c) => (c && typeof c === "object" ? cleanPlainText((c as Record<string, unknown>).name) : ""))
    .filter(Boolean);

  if (names.length === 0) return undefined;
  return Array.from(new Set(names)).join(" > ").slice(0, 500);
}

export function resolveGender(product: Record<string, unknown>): MetaGender | undefined {
  const categories = Array.isArray(product.categories) ? product.categories : [];
  const text = `${categories
    .map((c) => (c && typeof c === "object" ? `${(c as Record<string, unknown>).name || ""} ${(c as Record<string, unknown>).slug || ""}` : ""))
    .join(" ")} ${String(product.name || "")}`.toLowerCase();

  const hasWomen = /\b(women|woman|female|ladies)\b/.test(text);
  const hasMen = /\b(men|man|male|gents)\b/.test(text);

  if ((hasWomen && hasMen) || /\bunisex\b/.test(text)) return "unisex";
  if (hasWomen) return "female";
  if (hasMen) return "male";
  return undefined;
}

function findAttributeValue(product: Record<string, unknown>, attributeName: string): string | undefined {
  const attributes = Array.isArray(product.attributes)
    ? (product.attributes as Array<Record<string, unknown>>)
    : [];
  const target = attributes.find(
    (a) => String(a?.name || "").trim().toLowerCase() === attributeName.toLowerCase()
  );
  if (!target || !Array.isArray(target.options) || target.options.length === 0) {
    return undefined;
  }
  const first = target.options.find((opt) => String(opt || "").trim());
  return first ? cleanPlainText(first) : undefined;
}

export function resolveBrand(product: Record<string, unknown>, fallback = DEFAULT_BRAND): string {
  const attrBrand = findAttributeValue(product, "brand");
  if (attrBrand) return attrBrand;
  if (typeof product.brand === "string" && product.brand.trim()) {
    return cleanPlainText(product.brand);
  }
  return fallback;
}

export function resolveColor(product: Record<string, unknown>): string | undefined {
  const attrColor = findAttributeValue(product, "color");
  if (attrColor) return attrColor;
  if (typeof product.color === "string" && product.color.trim()) {
    return cleanPlainText(product.color);
  }
  return undefined;
}

export function resolveSize(product: Record<string, unknown>): string | undefined {
  const sizes = Array.isArray(product.sizes)
    ? product.sizes.map(cleanPlainText).filter(Boolean)
    : [];
  if (sizes.length > 0) {
    return Array.from(new Set(sizes)).join(", ").slice(0, 200);
  }
  const attrSize = findAttributeValue(product, "size") || findAttributeValue(product, "sizes");
  if (attrSize) return attrSize;
  if (typeof product.size === "string" && product.size.trim()) {
    return cleanPlainText(product.size);
  }
  return undefined;
}

export function resolvePricing(
  product: Record<string, unknown>,
  currency = DEFAULT_CURRENCY
): { price: string; salePrice?: string } | null {
  const regular = parseNumber(product.regular_price);
  const sale = parseNumber(product.sale_price);
  const standard = parseNumber(product.price);

  const baseline = regular !== null && regular > 0 ? regular : standard;
  if (baseline === null || baseline <= 0) return null;

  if (sale !== null && sale > 0 && sale < baseline) {
    return {
      price: formatPrice(baseline, currency),
      salePrice: formatPrice(sale, currency),
    };
  }

  const effective = standard !== null && standard > 0 ? standard : baseline;
  return {
    price: formatPrice(effective, currency),
  };
}

/**
 * Maps a single validated product into a Meta Commerce Manager Catalog Item.
 */
export function mapProductToMetaCatalogItem(
  rawProduct: unknown,
  options: MetaCatalogFeedOptions
): MetaCatalogItem | null {
  const product = (rawProduct && typeof rawProduct === "object" ? rawProduct : {}) as Record<
    string,
    unknown
  >;

  const id = normalizeMetaProductId(product.id);
  if (!id) return null;

  const titleRaw = cleanPlainText(product.name);
  if (!titleRaw) return null;

  const descriptionRaw =
    cleanPlainText(product.short_description) || cleanPlainText(product.description);
  if (!descriptionRaw) return null;

  const slug = String(product.slug || "").trim();
  if (!slug) return null;

  const baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const link = `${baseUrl}/products/${encodeURIComponent(slug)}`;

  const images = Array.isArray(product.images) ? product.images : [];
  const imageUrls = images
    .map((img) => (img && typeof img === "object" ? String((img as Record<string, unknown>).src || "").trim() : ""))
    .filter(Boolean);

  if (imageUrls.length === 0) return null;
  const imageLink = imageUrls[0];
  const additionalImageLinks = imageUrls.slice(1, MAX_ADDITIONAL_IMAGES + 1);

  const pricing = resolvePricing(product, options.currency || DEFAULT_CURRENCY);
  if (!pricing) return null;

  const brand = resolveBrand(product, options.brandFallback || DEFAULT_BRAND);
  const mpn = product.sku ? String(product.sku).trim() : undefined;
  const availability = resolveAvailability(product);
  const googleProductCategory = resolveGoogleProductCategory(product);
  const productType = resolveProductType(product);
  const color = resolveColor(product);
  const size = resolveSize(product);
  const gender = resolveGender(product);
  const ageGroup: MetaAgeGroup = "adult";

  const stockQuantity = parseNumber(product.stock_quantity);
  const quantityToSell =
    product.manage_stock && stockQuantity !== null && stockQuantity >= 0
      ? Math.floor(stockQuantity)
      : undefined;

  const itemGroupId =
    normalizeMetaProductId(product.item_group_id ?? product.parent_id) || undefined;

  return {
    id,
    title: truncate(titleRaw, MAX_TITLE_LENGTH),
    description: truncate(descriptionRaw, MAX_DESCRIPTION_LENGTH),
    availability,
    condition: "new",
    price: pricing.price,
    sale_price: pricing.salePrice,
    link,
    image_link: imageLink,
    additional_image_link: additionalImageLinks.length > 0 ? additionalImageLinks : undefined,
    brand,
    identifier_exists: Boolean(brand && mpn) ? "yes" : "no",
    mpn,
    google_product_category: googleProductCategory,
    product_type: productType,
    item_group_id: itemGroupId,
    color,
    size,
    gender,
    age_group: ageGroup,
    quantity_to_sell_on_facebook: quantityToSell,
  };
}

/**
 * Maps and validates a batch of products, handling deduplication and validation auditing.
 */
export function mapProductsToMetaCatalog(
  products: unknown[],
  options: MetaCatalogFeedOptions
): {
  items: MetaCatalogItem[];
  validationResults: MetaProductValidationResult[];
  duplicates: string[];
} {
  const items: MetaCatalogItem[] = [];
  const validationResults: MetaProductValidationResult[] = [];
  const duplicates: string[] = [];
  const seenIds = new Set<string>();

  for (const raw of products) {
    const validation = validateProduct(raw, {
      baseUrl: options.baseUrl,
      allowLocalHttp: options.allowLocalHttp,
    });
    validationResults.push(validation);

    if (!validation.isValid) {
      continue;
    }

    const item = mapProductToMetaCatalogItem(raw, options);
    if (!item) {
      continue;
    }

    if (seenIds.has(item.id)) {
      duplicates.push(item.id);
      continue;
    }

    seenIds.add(item.id);
    items.push(item);
  }

  return {
    items,
    validationResults,
    duplicates,
  };
}
