import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Immutable audit trail for manual administrator overrides.
 * Used for order status/payment changes so a manual "mark paid" or
 * cancellation can be traced to an actor, a time and a before/after snapshot.
 */

export interface IAdminAuditLog extends Document {
  tenantId: string;
  actor: string;
  action: string;
  targetType: string;
  targetId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const AdminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    tenantId: { type: String, required: true, default: "angkon-main", index: true },
    actor: { type: String, required: true, trim: true },
    action: { type: String, required: true, trim: true },
    targetType: { type: String, required: true, trim: true },
    targetId: { type: String, required: true, trim: true, index: true },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AdminAuditLogSchema.index({ createdAt: -1 });
AdminAuditLogSchema.index({ targetId: 1, createdAt: -1 });
AdminAuditLogSchema.index({ actor: 1, createdAt: -1 });

export const AdminAuditLog: Model<IAdminAuditLog> =
  mongoose.models.AdminAuditLog ||
  mongoose.model<IAdminAuditLog>("AdminAuditLog", AdminAuditLogSchema);

export default AdminAuditLog;
