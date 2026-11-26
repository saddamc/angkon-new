import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type RefundStatus =
  | "initiated"
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled";

export type RefundChannel = "sslcommerz" | "manual_offline";

export interface IPaymentRefund extends Document {
  refundId: string;
  /** Null for manual offline refunds (no payment attempt to link). */
  paymentId: Types.ObjectId | null;
  orderId: Types.ObjectId;
  orderNumber: string;
  /** Gateway transaction ID — null for offline refunds. */
  tranId: string | null;
  /** Gateway validation ID — null for offline refunds. */
  valId: string | null;
  /** Bank transaction ID — null for offline refunds. */
  bankTranId: string | null;
  amount: number;
  currency: string;
  status: RefundStatus;
  refundRefId?: string | null;
  reason: string;
  requestedBy: string;
  initiatedAt: Date;
  processedAt?: Date | null;
  failedAt?: Date | null;
  failureReason?: string | null;
  rawResponse?: Record<string, unknown> | null;
  rawQueryResponse?: Record<string, unknown> | null;
  // Extended fields for unified gateway + offline ledger
  refundChannel?: RefundChannel;
  refundMethod?: string | null;
  externalReference?: string | null;
  refundDate?: Date | null;
  evidenceNote?: string | null;
  adminNote?: string | null;
  idempotencyKey?: string | null;
  reconciliationRequired?: boolean;
  reconcileError?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentRefundSchema = new Schema<IPaymentRefund>(
  {
    refundId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentAttempt",
      required: false,
      default: null,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    tranId: {
      type: String,
      required: false,
      default: null,
      trim: true,
      index: true,
      sparse: true,
    },
    valId: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },
    bankTranId: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    currency: {
      type: String,
      required: true,
      default: "BDT",
    },
    status: {
      type: String,
      enum: ["initiated", "pending", "processing", "succeeded", "failed", "cancelled"],
      default: "initiated",
      index: true,
    },
    refundRefId: {
      type: String,
      default: null,
      trim: true,
      sparse: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    requestedBy: {
      type: String,
      required: true,
      default: "admin",
      trim: true,
    },
    initiatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
    rawResponse: {
      type: Schema.Types.Mixed,
      default: null,
    },
    rawQueryResponse: {
      type: Schema.Types.Mixed,
      default: null,
    },
    // Unified ledger extensions
    refundChannel: {
      type: String,
      enum: ["sslcommerz", "manual_offline"],
      default: "sslcommerz",
      index: true,
    },
    refundMethod: { type: String, default: null },
    externalReference: { type: String, default: null },
    refundDate: { type: Date, default: null },
    evidenceNote: { type: String, default: null },
    adminNote: { type: String, default: null },
    idempotencyKey: { type: String, default: null, sparse: true },
    reconciliationRequired: { type: Boolean, default: false },
    reconcileError: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: "paymentrefunds",
  }
);

PaymentRefundSchema.index({ orderNumber: 1, createdAt: -1 });
PaymentRefundSchema.index({ status: 1, createdAt: -1 });
PaymentRefundSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

export const PaymentRefund: Model<IPaymentRefund> =
  mongoose.models.PaymentRefund ||
  mongoose.model<IPaymentRefund>("PaymentRefund", PaymentRefundSchema, "paymentrefunds");

export default PaymentRefund;
