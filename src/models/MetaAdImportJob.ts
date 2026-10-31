import mongoose, { Schema, Document, Model } from "mongoose";
import { MetaAdReportingLevel } from "./MetaAdReport";

export interface IImportSlice {
  sliceIndex: number;
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
  status: "pending" | "running" | "completed" | "rate_limited" | "failed";
  recordsImported: number;
  spendInSlice: number;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  rateLimitCode?: number;
  regainAccessAt?: Date;
}

export interface IMetaAdImportJob extends Document {
  jobId: string;
  tenantId: string;
  adAccountId: string;
  level: MetaAdReportingLevel;
  breakdown: string;
  attributionConfigKey: string;
  requestedRange: {
    since: string;
    until: string;
  };
  totalSlices: number;
  completedSlices: number;
  slices: IImportSlice[];
  totalRecords: number;
  totalSpend: number;
  currency: string;
  status: "pending" | "running" | "paused_rate_limit" | "completed" | "failed";
  errorMessage?: string;
  currentSliceIndex: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ImportSliceSchema = new Schema<IImportSlice>(
  {
    sliceIndex: { type: Number, required: true },
    since: { type: String, required: true },
    until: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "running", "completed", "rate_limited", "failed"],
      default: "pending",
    },
    recordsImported: { type: Number, default: 0 },
    spendInSlice: { type: Number, default: 0 },
    startedAt: { type: Date },
    completedAt: { type: Date },
    errorMessage: { type: String },
    rateLimitCode: { type: Number },
    regainAccessAt: { type: Date },
  },
  { _id: false }
);

const MetaAdImportJobSchema = new Schema<IMetaAdImportJob>(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, required: true, default: "angkon-main", index: true },
    adAccountId: { type: String, required: true, index: true },
    level: {
      type: String,
      enum: ["account", "campaign", "adset", "ad"],
      required: true,
      default: "campaign",
    },
    breakdown: { type: String, default: "none" },
    attributionConfigKey: { type: String, default: "default" },
    requestedRange: {
      since: { type: String, required: true },
      until: { type: String, required: true },
    },
    totalSlices: { type: Number, required: true, default: 1 },
    completedSlices: { type: Number, default: 0 },
    slices: { type: [ImportSliceSchema], default: [] },
    totalRecords: { type: Number, default: 0 },
    totalSpend: { type: Number, default: 0 },
    currency: { type: String, default: "BDT" },
    status: {
      type: String,
      enum: ["pending", "running", "paused_rate_limit", "completed", "failed"],
      default: "pending",
      index: true,
    },
    errorMessage: { type: String },
    currentSliceIndex: { type: Number, default: 0 },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

MetaAdImportJobSchema.index(
  { tenantId: 1, adAccountId: 1, createdAt: -1 },
  { name: "meta_ad_import_job_lookup_idx" }
);

export const MetaAdImportJob: Model<IMetaAdImportJob> =
  mongoose.models.MetaAdImportJob ||
  mongoose.model<IMetaAdImportJob>("MetaAdImportJob", MetaAdImportJobSchema);
