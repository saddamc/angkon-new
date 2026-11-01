import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IMetaDomainAuditLog extends Document {
  tenantId: string;
  domainId?: Types.ObjectId | null;
  domain: string;
  action:
    | "dns_check"
    | "html_check"
    | "meta_ownership_confirmed"
    | "meta_ownership_revoked"
    | "domain_created"
    | "domain_deleted"
    | "token_updated"
    | "scheduled_health_check";
  previousState?: string | null;
  newState: string;
  verificationMethod: "dns_txt" | "html_meta_tag";
  dnsResult?: {
    status: string;
    recordsExamined: number;
    matchedRecord?: string | null;
    error?: string | null;
  } | null;
  htmlResult?: {
    status: string;
    detectedToken?: string | null;
    error?: string | null;
  } | null;
  actor: string; // Administrator email or "system_scheduler"
  ownershipSource?: string | null;
  failureReason?: string | null;
  details?: string | null;
  createdAt: Date;
}

const MetaDomainAuditLogSchema = new Schema<IMetaDomainAuditLog>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    domainId: {
      type: Schema.Types.ObjectId,
      ref: "MetaDomain",
      default: null,
    },
    domain: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "dns_check",
        "html_check",
        "meta_ownership_confirmed",
        "meta_ownership_revoked",
        "domain_created",
        "domain_deleted",
        "token_updated",
        "scheduled_health_check",
      ],
      index: true,
    },
    previousState: {
      type: String,
      default: null,
    },
    newState: {
      type: String,
      required: true,
    },
    verificationMethod: {
      type: String,
      enum: ["dns_txt", "html_meta_tag"],
      default: "dns_txt",
    },
    dnsResult: {
      type: Schema.Types.Mixed,
      default: null,
    },
    htmlResult: {
      type: Schema.Types.Mixed,
      default: null,
    },
    actor: {
      type: String,
      required: true,
      default: "super_admin",
    },
    ownershipSource: {
      type: String,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
    details: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Strictly append-only
  }
);

// Append-only history index
MetaDomainAuditLogSchema.index({ tenantId: 1, createdAt: -1 });
MetaDomainAuditLogSchema.index({ tenantId: 1, domain: 1, createdAt: -1 });

export const MetaDomainAuditLog: Model<IMetaDomainAuditLog> =
  mongoose.models.MetaDomainAuditLog ||
  mongoose.model<IMetaDomainAuditLog>("MetaDomainAuditLog", MetaDomainAuditLogSchema);
