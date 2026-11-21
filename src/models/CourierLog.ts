import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type CourierLogAction =
  | "book"
  | "status_sync"
  | "cancel"
  | "webhook"
  | "test_connection"
  | "bulk_sync";

export interface ICourierLog extends Document {
  provider: string;
  action: CourierLogAction | string;
  orderId?: Types.ObjectId | null;
  orderNumber?: string;
  consignmentId?: string;
  ok: boolean;
  httpStatus?: number | null;
  durationMs?: number | null;
  message: string;
  errorCode?: string | null;
  actor?: string;
  createdAt: Date;
}

const CourierLogSchema = new Schema<ICourierLog>(
  {
    provider: { type: String, required: true, index: true },
    action: { type: String, required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true },
    orderNumber: { type: String, default: "", index: true },
    consignmentId: { type: String, default: "" },
    ok: { type: Boolean, required: true, index: true },
    httpStatus: { type: Number, default: null },
    durationMs: { type: Number, default: null },
    /** Strictly sanitized message — must never include API keys, secrets or raw auth headers. */
    message: { type: String, required: true },
    errorCode: { type: String, default: null },
    actor: { type: String, default: "system" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CourierLogSchema.index({ createdAt: -1 });
CourierLogSchema.index({ provider: 1, createdAt: -1 });
// Automatically expire routine logs after 90 days.
CourierLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const CourierLog: Model<ICourierLog> =
  mongoose.models.CourierLog || mongoose.model<ICourierLog>("CourierLog", CourierLogSchema);

export default CourierLog;
