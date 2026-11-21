import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type RefundStatus =
  | "initiated"
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface IPaymentRefund extends Document {
  refundId: string;
  paymentId: Types.ObjectId;
  orderId: Types.ObjectId;
  orderNumber: string;
  tranId: string;
  valId: string;
  bankTranId: string;
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
      required: true,
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
      required: true,
      trim: true,
      index: true,
    },
    valId: {
      type: String,
      required: true,
      trim: true,
    },
    bankTranId: {
      type: String,
      required: true,
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
  },
  {
    timestamps: true,
    collection: "paymentrefunds",
  }
);

PaymentRefundSchema.index({ orderNumber: 1, createdAt: -1 });
PaymentRefundSchema.index({ status: 1, createdAt: -1 });

export const PaymentRefund: Model<IPaymentRefund> =
  mongoose.models.PaymentRefund ||
  mongoose.model<IPaymentRefund>("PaymentRefund", PaymentRefundSchema, "paymentrefunds");

export default PaymentRefund;
