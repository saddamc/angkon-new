import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMetaAdReport extends Document {
  tenantId: string;
  adAccountId: string;
  campaignId: string;
  campaignName: string;
  date: string; // YYYY-MM-DD
  spend: number;
  currency: string;
  impressions: number;
  clicks: number;
  cpc: number;
  ctr: number;
  roas: number;
  metaPurchases: number;
  metaPurchaseValue: number;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

const MetaAdReportSchema = new Schema<IMetaAdReport>(
  {
    tenantId: { type: String, required: true, default: "angkon-main", index: true },
    adAccountId: { type: String, required: true, index: true },
    campaignId: { type: String, required: true, index: true },
    campaignName: { type: String, required: true, default: "Unnamed Campaign" },
    date: { type: String, required: true, index: true },
    spend: { type: Number, required: true, default: 0 },
    currency: { type: String, required: true, default: "BDT" },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    cpc: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    roas: { type: Number, default: 0 },
    metaPurchases: { type: Number, default: 0 },
    metaPurchaseValue: { type: Number, default: 0 },
    source: { type: String, default: "meta_marketing_api" },
  },
  { timestamps: true }
);

// Enforce tenant/store isolation and prevent duplicate daily campaign records
MetaAdReportSchema.index(
  { tenantId: 1, adAccountId: 1, campaignId: 1, date: 1 },
  { unique: true }
);

export const MetaAdReport: Model<IMetaAdReport> =
  mongoose.models.MetaAdReport ||
  mongoose.model<IMetaAdReport>("MetaAdReport", MetaAdReportSchema);

export interface IMetaAdImportLog extends Document {
  tenantId: string;
  adAccountId: string;
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
