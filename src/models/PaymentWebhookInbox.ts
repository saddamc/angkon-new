import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type WebhookProcessingStatus =
  | "pending"
  | "processing"
  | "processed"
  | "failed"
  | "ignored";

export interface IPaymentWebhookInbox extends Document {
  provider: string;
  attemptId?: Types.ObjectId | null;
  tranId: string;
  valId?: string | null;
  eventFingerprint: string;
  rawPayload: Record<string, unknown>;
  receivedAt: Date;
  processingStatus: WebhookProcessingStatus;
  processingAttempts: number;
  nextRetryAt?: Date | null;
  processedAt?: Date | null;
  lastError?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentWebhookInboxSchema = new Schema<IPaymentWebhookInbox>(
  {
    provider: {
      type: String,
      required: true,
      default: "sslcommerz",
      index: true,
    },
    attemptId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentAttempt",
      default: null,
      index: true,
    },
    tranId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    valId: {
      type: String,
      default: null,
      trim: true,
    },
    eventFingerprint: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    rawPayload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    processingStatus: {
      type: String,
      enum: ["pending", "processing", "processed", "failed", "ignored"],
      default: "pending",
      index: true,
    },
    processingAttempts: {
      type: Number,
      default: 0,
    },
    nextRetryAt: {
      type: Date,
      default: null,
      index: true,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "paymentwebhookinboxes",
  }
);

PaymentWebhookInboxSchema.index({ processingStatus: 1, nextRetryAt: 1 });
PaymentWebhookInboxSchema.index({ tranId: 1, receivedAt: -1 });

export const PaymentWebhookInbox: Model<IPaymentWebhookInbox> =
  mongoose.models.PaymentWebhookInbox ||
  mongoose.model<IPaymentWebhookInbox>("PaymentWebhookInbox", PaymentWebhookInboxSchema);

export default PaymentWebhookInbox;
