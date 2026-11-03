import mongoose, { Schema, Document, Model } from "mongoose";

export type MetaSyncType =
  | "events_reporting"
  | "integrations"
  | "assets"
  | "emq_quality"
  | "all";

export type MetaSyncStatus =
  | "synchronizing"
  | "up_to_date"
  | "stale"
  | "failed"
  | "permission_required"
  | "unavailable";

export interface IMetaSyncError {
  message: string;
  code?: string;
  reason?: string;
  at: Date;
}

export interface IMetaSyncSnapshotData {
  emqReport?: {
    datasetId: string;
    compositeScore: number | null;
    events: Array<{
      eventName: string;
      score: number | null;
      coverage: number | null;
      freshness: string | null;
      matchKeys: Array<{ identifier: string; label: string; coverage: number | null }>;
      diagnostics: Array<{
        name: string;
        description: string;
        solution: string;
        percentage: number | null;
        affectedEventCount: number | null;
        totalEventCount: number | null;
      }>;
    }>;
    suggestions: string[];
    fetchedAt: string;
  };
  datasetMeta?: {
    datasetId: string;
    name: string;
    isUnavailable?: boolean;
    lastVerifiedAt?: Date;
  };
  assets?: {
    adSetsCount: number | null;
    audiencesCount: number | null;
    catalogItemsCount: number | null;
    adAccountStatus: string | null;
    accountName: string | null;
    currency: string | null;
  };
  integrations?: {
    pixelActive: boolean;
    capiActive: boolean;
    domainVerified: boolean;
    lastEventAt: Date | null;
  };
  metaEventStats?: Record<string, { count: number; lastSeenAt?: string }>;
  rateLimits?: {
    appUsage?: number;
    adAccountUsage?: number;
    checkedAt: Date;
  };
}

export interface IMetaSyncSnapshot extends Document {
  tenantId: string;
  syncType: MetaSyncType;
  status: MetaSyncStatus;
  lastSyncedAt?: Date;
  nextSyncAt?: Date;
  durationMs?: number;
  lockUntil?: Date;
  retryCount: number;
  error?: IMetaSyncError;
  data: IMetaSyncSnapshotData;
  createdAt: Date;
  updatedAt: Date;
}

const MetaSyncSnapshotSchema = new Schema<IMetaSyncSnapshot>(
  {
    tenantId: { type: String, required: true, default: "primary_store", index: true },
    syncType: {
      type: String,
      enum: ["events_reporting", "integrations", "assets", "emq_quality", "all"],
      required: true,
      default: "all",
      index: true,
    },
    status: {
      type: String,
      enum: ["synchronizing", "up_to_date", "stale", "failed", "permission_required", "unavailable"],
      required: true,
      default: "up_to_date",
      index: true,
    },
    lastSyncedAt: { type: Date },
    nextSyncAt: { type: Date },
    durationMs: { type: Number, default: 0 },
    lockUntil: { type: Date, index: true },
    retryCount: { type: Number, default: 0 },
    error: {
      message: { type: String },
      code: { type: String },
      reason: { type: String },
      at: { type: Date },
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Unique snapshot per tenant + syncType
MetaSyncSnapshotSchema.index({ tenantId: 1, syncType: 1 }, { unique: true });

export const MetaSyncSnapshot: Model<IMetaSyncSnapshot> =
  mongoose.models.MetaSyncSnapshot ||
  mongoose.model<IMetaSyncSnapshot>("MetaSyncSnapshot", MetaSyncSnapshotSchema);
