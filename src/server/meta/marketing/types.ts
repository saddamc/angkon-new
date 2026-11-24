import type {
  MetaAdReportingLevel,
  IMetaActionItem,
} from "@/models/MetaAdReport";
import type { MetaAttributionConfig } from "@/server/meta/marketing/meta-marketing-settings";

export interface MetaApiRateLimitInfo {
  callCountPct?: number;
  totalTimePct?: number;
  totalCpuTimePct?: number;
  estimatedTimeToRegainAccess?: number; // in minutes
}

export interface MetaApiErrorDetails {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

export interface FetchInsightsOptions {
  since: string;
  until: string;
  level?: MetaAdReportingLevel;
  breakdown?: string;
  attributionConfig?: MetaAttributionConfig;
  tenantId?: string;
  adAccountId?: string;
  token?: string;
  fields?: string | string[];
}

export interface ParsedMetaInsightRecord {
  level: MetaAdReportingLevel;
  entityId: string;
  entityName: string;
  parentId?: string;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  frequency: number;
  cpc: number;
  cpm: number;
  ctr: number;
  cpa: number;
  metaPurchases: number;
  metaPurchaseValue: number;
  metaRoas: number;
  rawActions: IMetaActionItem[];
  rawActionValues: IMetaActionItem[];
}
