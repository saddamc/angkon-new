import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type EmailNotificationType =
  | "cod_order_confirmation_customer"
  | "cod_order_confirmation_admin"
  | "online_order_received_customer"
  | "online_order_received_admin"
  | "paid_invoice_customer"
  | "paid_invoice_admin";

export type EmailDeliveryStatus =
  | "queued"
  | "processing"
  | "retrying"
  | "provider_accepted"
  | "delivered"
  | "delivery_delayed"
  | "bounced"
  | "complained"
  | "failed_permanent";

export type EmailFailureCategory =
  | "transient"
  | "permanent"
  | "pdf_error"
  | "provider_bounce"
  | null;

export interface IEmailWebhookEventEntry {
  svixId: string;
  eventType: string;
  at: Date;
  reason?: string | null;
}

export interface IEmailDelivery extends Document {
  deduplicationKey: string;
  notificationType: EmailNotificationType;
  orderId?: Types.ObjectId | null;
  orderNumber: string;
  userId?: Types.ObjectId | null;
  paymentAttemptId?: Types.ObjectId | null;
  recipient: string;
  subject: string;
  hasPdfAttachment: boolean;
  attachmentFilename?: string | null;
  status: EmailDeliveryStatus;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt?: Date | null;
  claimToken?: string | null;
  claimedAt?: Date | null;
  idempotencyKey: string;
  providerMessageId?: string | null;
  providerAcceptedAt?: Date | null;
  deliveredAt?: Date | null;
  failedAt?: Date | null;
  lastEventType?: string | null;
  lastError?: string | null;
  failureCategory?: EmailFailureCategory;
  payloadSnapshot: Record<string, unknown>;
  webhookEvents?: IEmailWebhookEventEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const EmailWebhookEventSchema = new Schema<IEmailWebhookEventEntry>(
  {
    svixId: { type: String, required: true, trim: true },
    eventType: { type: String, required: true, trim: true },
    at: { type: Date, default: Date.now },
    reason: { type: String, default: null },
  },
  { _id: false }
);

const EmailDeliverySchema = new Schema<IEmailDelivery>(
  {
    deduplicationKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    notificationType: {
      type: String,
      enum: [
        "cod_order_confirmation_customer",
        "cod_order_confirmation_admin",
        "online_order_received_customer",
        "online_order_received_admin",
        "paid_invoice_customer",
        "paid_invoice_admin",
      ],
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    paymentAttemptId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentAttempt",
      default: null,
      index: true,
    },
    recipient: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    hasPdfAttachment: {
      type: Boolean,
      default: false,
    },
    attachmentFilename: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: [
        "queued",
        "processing",
        "retrying",
        "provider_accepted",
        "delivered",
        "delivery_delayed",
        "bounced",
        "complained",
        "failed_permanent",
      ],
      default: "queued",
      index: true,
    },
    attemptCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      default: 6,
      min: 1,
    },
    nextAttemptAt: {
      type: Date,
      default: null,
      index: true,
    },
    claimToken: {
      type: String,
      default: null,
      index: true,
    },
    claimedAt: {
      type: Date,
      default: null,
      index: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
    },
    providerMessageId: {
      type: String,
      default: null,
      trim: true,
      sparse: true,
      index: true,
    },
    providerAcceptedAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
    lastEventType: {
      type: String,
      default: null,
    },
    lastError: {
      type: String,
      default: null,
    },
    failureCategory: {
      type: String,
      enum: ["transient", "permanent", "pdf_error", "provider_bounce", null],
      default: null,
    },
    payloadSnapshot: {
      type: Schema.Types.Mixed,
      required: true,
    },
    webhookEvents: {
      type: [EmailWebhookEventSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "emaildeliveries",
  }
);

EmailDeliverySchema.index({ status: 1, nextAttemptAt: 1 });
EmailDeliverySchema.index({ status: 1, claimedAt: 1 });
EmailDeliverySchema.index({ orderNumber: 1, notificationType: 1, createdAt: -1 });

export const EmailDelivery: Model<IEmailDelivery> =
  mongoose.models.EmailDelivery ||
  mongoose.model<IEmailDelivery>("EmailDelivery", EmailDeliverySchema);

export default EmailDelivery;
