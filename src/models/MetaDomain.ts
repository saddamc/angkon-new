import mongoose, { Schema, Document, Model } from "mongoose";

export type MetaDomainLifecycleState =
  | "NEEDS_VERIFICATION"
  | "DNS_DETECTED"
  | "PENDING_META"
  | "VERIFIED"
  | "DNS_MISMATCH"
  | "FAILED";

export type DnsStatusType = "DETECTED" | "NOT_FOUND" | "ERROR";
export type HtmlStatusType = "DETECTED" | "NOT_FOUND" | "NOT_CHECKED" | "ERROR";
export type MetaOwnershipStatusType = "VERIFIED" | "NEEDS_VERIFICATION" | "FAILED";

export interface IMetaDomain extends Document {
  tenantId: string;
  domain: string; // Normalized root domain e.g. "angkon.net"
  isPrimary: boolean;
  verificationToken: string;
  verificationMethod: "dns_txt" | "html_meta_tag";
  lifecycleState: MetaDomainLifecycleState;

  // Independent Channel Statuses
  dnsStatus: DnsStatusType;
  htmlStatus: HtmlStatusType;
  metaOwnershipStatus: MetaOwnershipStatusType;

  // Meta Ownership Details
  metaOwnershipVerified: boolean;
  metaOwnershipVerifiedAt?: Date | null;
  metaOwnershipSource?: string | null;
  metaOwnershipConfirmedBy?: string | null;

  // Monitoring & Telemetry
  lastCheckedAt?: Date | null;
  lastSuccessfulCheckAt?: Date | null;
  lastFailedCheckAt?: Date | null;
  lastExaminedRecords?: string[];
  lastMatchedRecord?: string | null;
  lastError?: string | null;
  lastDetails?: string | null;

  scheduledCheckEnabled: boolean;
  scheduledCheckIntervalMinutes: number;

  createdAt: Date;
  updatedAt: Date;
}

const MetaDomainSchema = new Schema<IMetaDomain>(
  {
    tenantId: {
      type: String,
      required: true,
      default: "angkon-main",
      index: true,
    },
    domain: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      required: true,
      trim: true,
    },
    verificationMethod: {
      type: String,
      enum: ["dns_txt", "html_meta_tag"],
      default: "dns_txt",
    },
    lifecycleState: {
      type: String,
      enum: [
        "NEEDS_VERIFICATION",
        "DNS_DETECTED",
        "PENDING_META",
        "VERIFIED",
        "DNS_MISMATCH",
        "FAILED",
      ],
      default: "NEEDS_VERIFICATION",
      index: true,
    },
    dnsStatus: {
      type: String,
      enum: ["DETECTED", "NOT_FOUND", "ERROR"],
      default: "NOT_FOUND",
    },
    htmlStatus: {
      type: String,
      enum: ["DETECTED", "NOT_FOUND", "NOT_CHECKED", "ERROR"],
      default: "NOT_CHECKED",
    },
    metaOwnershipStatus: {
      type: String,
      enum: ["VERIFIED", "NEEDS_VERIFICATION", "FAILED"],
      default: "NEEDS_VERIFICATION",
    },
    metaOwnershipVerified: {
      type: Boolean,
      default: false,
    },
    metaOwnershipVerifiedAt: {
      type: Date,
      default: null,
    },
    metaOwnershipSource: {
      type: String,
      default: null,
    },
    metaOwnershipConfirmedBy: {
      type: String,
      default: null,
    },
    lastCheckedAt: {
      type: Date,
      default: null,
    },
    lastSuccessfulCheckAt: {
      type: Date,
      default: null,
    },
    lastFailedCheckAt: {
      type: Date,
      default: null,
    },
    lastExaminedRecords: {
      type: [String],
      default: [],
    },
    lastMatchedRecord: {
      type: String,
      default: null,
    },
    lastError: {
      type: String,
      default: null,
    },
    lastDetails: {
      type: String,
      default: null,
    },
    scheduledCheckEnabled: {
      type: Boolean,
      default: true,
    },
    scheduledCheckIntervalMinutes: {
      type: Number,
      default: 60,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Unique Index: prevents duplicate domain ownership within the same tenant
MetaDomainSchema.index({ tenantId: 1, domain: 1 }, { unique: true });

// Secondary index for query performance
MetaDomainSchema.index({ tenantId: 1, isPrimary: 1 });
MetaDomainSchema.index({ tenantId: 1, lifecycleState: 1 });

export const MetaDomain: Model<IMetaDomain> =
  mongoose.models.MetaDomain || mongoose.model<IMetaDomain>("MetaDomain", MetaDomainSchema);
