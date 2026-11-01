/**
 * Type definitions for ANGKON Meta Commerce Manager Catalog Feed integration.
 */

export type MetaAvailability =
  | "in stock"
  | "out of stock"
  | "available for order"
  | "preorder"
  | "discontinued";

export type MetaCondition = "new" | "refurbished" | "used";

export type MetaGender = "female" | "male" | "unisex";

export type MetaAgeGroup = "adult" | "all ages" | "teen" | "kids" | "toddler" | "infant";

export type MetaProductValidationStatus = "valid" | "invalid" | "excluded";

export interface MetaProductValidationResult {
  isValid: boolean;
  productId: string | null;
  sku: string | null;
  name: string;
  slug: string;
  status: MetaProductValidationStatus;
  errors: string[];
  warnings: string[];
  missingAttributes: string[];
}

export interface MetaCatalogItem {
  id: string;
  title: string;
  description: string;
  availability: MetaAvailability;
  condition: MetaCondition;
  price: string;
  sale_price?: string;
  link: string;
  image_link: string;
  additional_image_link?: string[];
  brand: string;
  identifier_exists: "yes" | "no";
  mpn?: string;
  google_product_category?: string;
  product_type?: string;
  item_group_id?: string;
  color?: string;
  size?: string;
  gender?: MetaGender;
  age_group?: MetaAgeGroup;
  quantity_to_sell_on_facebook?: number;
}

export interface MetaCatalogFeedOptions {
  baseUrl: string;
  feedUrl?: string;
  title?: string;
  description?: string;
  currency?: string;
  brandFallback?: string;
  allowLocalHttp?: boolean;
  page?: number;
  perPage?: number;
}

export interface MetaPaginationInfo {
  page: number;
  perPage: number;
  totalPages: number;
  totalVisible: number;
  truncated: boolean;
}

export interface MetaCatalogFeedResult {
  xml: string;
  totalInput: number;
  validCount: number;
  invalidCount: number;
  excludedCount: number;
  items: MetaCatalogItem[];
  validationResults: MetaProductValidationResult[];
  pagination: MetaPaginationInfo;
}
