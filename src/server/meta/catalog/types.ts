import type {
  CatalogCategoryCoverage,
  CatalogFeedBuildResult,
  CatalogFeedCounts,
  FeedSourceProduct,
} from "@/lib/meta-catalog";

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

export type ProductionFeedProbeState =
  | "reachable"
  | "invalid-response"
  | "http-error"
  | "network-error"
  | "not-public"
  | "not-configured";

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
