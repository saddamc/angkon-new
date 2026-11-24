export * as capi from "./capi/index";
export * as pixel from "./pixel/index";
export * as catalog from "./catalog/index";
export * as domain from "./domain/index";
export * as marketing from "./marketing/index";

// Direct convenience re-exports for the most commonly imported routines
export * from "./capi/index";
export * from "./pixel/index";
export * from "./catalog/index";
export * from "./domain/index";
export {
  META_MARKETING_API_VERSION,
  MetaMarketingApiError,
  callMetaMarketingGraphApi,
  verifyAdAccountCredentials,
  validateHistoricalBoundary,
  generate30DaySlices,
  deduplicateFieldsList,
  deduplicateFields,
  META_INSIGHT_COMMON_METRICS,
  buildInsightsFieldsForLevel,
  extractWebsitePurchases,
  fetchMetaDailyInsightsSlice,
  createAndRunAdImportJob,
  resumeAdImportJob,
} from "./marketing/index";
export type {
  MetaApiRateLimitInfo,
  MetaApiErrorDetails,
  FetchInsightsOptions,
  ParsedMetaInsightRecord,
} from "./marketing/index";
