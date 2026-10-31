import mongoose, { Schema, Document, Model } from "mongoose";

export type MetaAdReportingLevel = "account" | "campaign" | "adset" | "ad";

export interface IMetaActionItem {
  action_type: string;
  value: string;
}

export interface IMetaAdReport extends Document {
  tenantId: string;
  adAccountId: string;
  level: MetaAdReportingLevel;
  entityId: string;
  entityName: string;
  parentId?: string; // campaignId for adset/ad, adsetId for ad
  date: string; // YYYY-MM-DD
  breakdownKey: string; // "none" or breakdown identifier
  attributionConfigKey: string; // hash/id of attribution window + action_report_time
  spend: number;
  currency: string;
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
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

const MetaActionItemSchema = new Schema<IMetaActionItem>(
  {
    action_type: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

const MetaAdReportSchema = new Schema<IMetaAdReport>(
  {
    tenantId: { type: String, required: true, default: "angkon-main", index: true },
    adAccountId: { type: String, required: true, index: true },
    level: {
      type: String,
      enum: ["account", "campaign", "adset", "ad"],
      required: true,
      default: "campaign",
      index: true,
    },
    entityId: { type: String, required: true, index: true },
    entityName: { type: String, required: true, default: "Unnamed Entity" },
    parentId: { type: String, index: true },
    date: { type: String, required: true, index: true },
    breakdownKey: { type: String, required: true, default: "none" },
    attributionConfigKey: { type: String, required: true, default: "default" },
    spend: { type: Number, required: true, default: 0 },
    currency: { type: String, required: true, default: "BDT" },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    frequency: { type: Number, default: 0 },
    cpc: { type: Number, default: 0 },
    cpm: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    cpa: { type: Number, default: 0 },
    metaPurchases: { type: Number, default: 0 },
    metaPurchaseValue: { type: Number, default: 0 },
    metaRoas: { type: Number, default: 0 },
    rawActions: { type: [MetaActionItemSchema], default: [] },
    rawActionValues: { type: [MetaActionItemSchema], default: [] },
    source: { type: String, default: "meta_marketing_api" },
  },
  { timestamps: true }
);

/**
 * Composite unique index: Strictly isolates records by tenant, ad account, level,
 * entityId, reporting date, breakdown, and attribution configuration.
 * Prevents additive double-counting and duplicate daily ingestion.
 */
MetaAdReportSchema.index(
  {
    tenantId: 1,
    adAccountId: 1,
    level: 1,
    entityId: 1,
    date: 1,
    breakdownKey: 1,
    attributionConfigKey: 1,
  },
  { unique: true, name: "meta_ad_report_composite_unique_idx" }
);

// Secondary lookup index for fast queries by level and date range
MetaAdReportSchema.index(
  { tenantId: 1, adAccountId: 1, level: 1, date: 1 },
  { name: "meta_ad_report_query_idx" }
);

export const MetaAdReport: Model<IMetaAdReport> =
  mongoose.models.MetaAdReport ||
  mongoose.model<IMetaAdReport>("MetaAdReport", MetaAdReportSchema);

export interface IMetaAdImportLog extends Document {
  tenantId: string;
  adAccountId: string;
  level?: MetaAdReportingLevel;
  dateRange: { since: string; until: string };
  recordsImported: number;
  recordsUpdated: number;
  totalSpend: number;
  status: "success" | "partial" | "failed";
  errorMessage?: string;
  createdAt: Date;
}

const MetaAdImportLogSchema = new Schema<IMetaAdImportLog>(
  {
    tenantId: { type: String, required: true, default: "angkon-main", index: true },
    adAccountId: { type: String, required: true, index: true },
    level: {
      type: String,
      enum: ["account", "campaign", "adset", "ad"],
      default: "campaign",
    },
    dateRange: {
      since: { type: String, required: true },
      until: { type: String, required: true },
    },
    recordsImported: { type: Number, default: 0 },
    recordsUpdated: { type: Number, default: 0 },
    totalSpend: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["success", "partial", "failed"],
      default: "success",
    },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

export const MetaAdImportLog: Model<IMetaAdImportLog> =
  mongoose.models.MetaAdImportLog ||
  mongoose.model<IMetaAdImportLog>("MetaAdImportLog", MetaAdImportLogSchema);
