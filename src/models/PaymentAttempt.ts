import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type PaymentProvider = "sslcommerz" | "manual" | "cod";

export type PaymentAttemptStatus =
  | "created"
  | "initiating"
  | "pending"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "expired"
  | "unknown"
  | "review_required"
  | "refunded"
  | "partially_refunded";

export type CustomerActivityStatus =
  | "not_redirected"
  | "redirected"
  | "returned_success"
  | "returned_failed"
  | "returned_cancelled"
  | "no_return_detected";

export type ReconciliationStatus =
  | "not_required"
  | "scheduled"
  | "processing"
  | "resolved"
  | "manual_review";

export interface IPaymentAttempt extends Document {
  orderId: Types.ObjectId;
  orderNumber: string;
  userId?: Types.ObjectId | null;
  provider: PaymentProvider;
  environment: "sandbox" | "live";
  attemptNumber: number;
  tranId: string;
  sessionKey?: string | null;
  gatewaySessionCreatedAt?: Date | null;
  expectedAmount: number;
  amount: number; // legacy alias for expectedAmount
  currency: string;
  status: PaymentAttemptStatus;
  customerActivity: CustomerActivityStatus;
  reconciliationStatus: ReconciliationStatus;
  gatewayStatus?: string | null;
  validationId?: string | null;
  valId?: string | null; // legacy alias
  bankTransactionId?: string | null;
  bankTranId?: string | null; // legacy alias
  paymentMethod?: string | null;
  paymentChannel?: string | null;
  cardType?: string | null;
  cardBrand?: string | null;
  riskLevel?: string | null;
  riskTitle?: string | null;
  initiatedAt: Date;
  lastCheckedAt?: Date | null;
  nextCheckAt?: Date | null;
  customerReturnedAt?: Date | null;
  paidAt?: Date | null;
  validatedAt?: Date | null;
  failedAt?: Date | null;
  cancelledAt?: Date | null;
  expiredAt?: Date | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  failureReason?: string | null; // legacy alias
  errorDetails?: string | null;
  idempotencyKey?: string | null;
  gatewayPageUrl?: string | null;
  sessionKeyHash?: string | null;
  rawInit?: Record<string, unknown> | null;
  rawValidation?: Record<string, unknown> | null;
  lastReconciledAt?: Date | null;
  reconcileAttempts: number;
  reconcileNote?: string | null;
  note?: string | null;
  recordedBy?: string | null;
  refundedAmount?: number;
  refundRefId?: string | null;
  refundReason?: string | null;
  refundedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentAttemptSchema = new Schema<IPaymentAttempt>(
  {
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
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    provider: {
      type: String,
      enum: ["sslcommerz", "manual", "cod"],
      required: true,
      default: "sslcommerz",
      index: true,
    },
    environment: {
      type: String,
      enum: ["sandbox", "live"],
      default: "sandbox",
    },
    attemptNumber: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    tranId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    sessionKey: {
      type: String,
      default: null,
      trim: true,
    },
    gatewaySessionCreatedAt: {
      type: Date,
      default: null,
    },
    expectedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    amount: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: "BDT",
      trim: true,
    },
    status: {
      type: String,
      enum: [
        "created",
        "initiating",
        "pending",
        "succeeded",
        "failed",
        "cancelled",
        "expired",
        "unknown",
        "review_required",
        "refunded",
        "partially_refunded",
        // legacy compatibility:
        "paid",
        "initiated",
      ],
      default: "created",
      index: true,
    },
    customerActivity: {
      type: String,
      enum: [
        "not_redirected",
        "redirected",
        "returned_success",
        "returned_failed",
        "returned_cancelled",
        "no_return_detected",
      ],
      default: "not_redirected",
      index: true,
    },
    reconciliationStatus: {
      type: String,
      enum: [
        "not_required",
        "scheduled",
        "processing",
        "resolved",
        "manual_review",
      ],
      default: "not_required",
      index: true,
    },
    gatewayStatus: {
      type: String,
      default: null,
    },
    validationId: {
      type: String,
      trim: true,
    },
    valId: {
      type: String,
      trim: true,
    },
    bankTransactionId: {
      type: String,
      default: null,
      trim: true,
    },
    bankTranId: {
      type: String,
      default: null,
      trim: true,
    },
    paymentMethod: {
      type: String,
      default: null,
    },
    paymentChannel: {
      type: String,
      default: null,
    },
    cardType: {
      type: String,
      default: null,
    },
    cardBrand: {
      type: String,
      default: null,
    },
    riskLevel: {
      type: String,
      default: null,
    },
    riskTitle: {
      type: String,
      default: null,
    },
    initiatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastCheckedAt: {
      type: Date,
      default: null,
    },
    nextCheckAt: {
      type: Date,
      default: null,
      index: true,
    },
    customerReturnedAt: {
      type: Date,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    validatedAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    expiredAt: {
      type: Date,
      default: null,
    },
    lastErrorCode: {
      type: String,
      default: null,
    },
    lastErrorMessage: {
      type: String,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
    errorDetails: {
      type: String,
      default: null,
    },
    idempotencyKey: {
      type: String,
      trim: true,
    },
    gatewayPageUrl: {
      type: String,
      default: null,
    },
    sessionKeyHash: {
      type: String,
      default: null,
    },
    rawInit: {
      type: Schema.Types.Mixed,
      default: null,
    },
    rawValidation: {
      type: Schema.Types.Mixed,
      default: null,
    },
    lastReconciledAt: {
      type: Date,
      default: null,
    },
    reconcileAttempts: {
      type: Number,
      default: 0,
    },
    reconcileNote: {
      type: String,
      default: null,
    },
    note: {
      type: String,
      default: null,
    },
    recordedBy: {
      type: String,
      default: null,
    },
    refundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    refundRefId: {
      type: String,
      default: null,
    },
    refundReason: {
      type: String,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "payments", // Maps directly to payments collection for complete backward compatibility
  }
);

// Indexes
PaymentAttemptSchema.index({ validationId: 1 }, { unique: true, sparse: true });
PaymentAttemptSchema.index({ valId: 1 }, { unique: true, sparse: true });
PaymentAttemptSchema.index({ orderId: 1, attemptNumber: -1 });
PaymentAttemptSchema.index({ orderNumber: 1, createdAt: -1 });
PaymentAttemptSchema.index({ status: 1, nextCheckAt: 1 });
PaymentAttemptSchema.index({ reconciliationStatus: 1, nextCheckAt: 1 });
PaymentAttemptSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

// Pre-save sync for legacy aliases
PaymentAttemptSchema.pre("save", function () {
  if (this.expectedAmount !== undefined && this.amount === undefined) {
    this.amount = this.expectedAmount;
  } else if (this.amount !== undefined && this.expectedAmount === undefined) {
    this.expectedAmount = this.amount;
  }
  if (this.validationId && !this.valId) {
    this.valId = this.validationId;
  } else if (this.valId && !this.validationId) {
    this.validationId = this.valId;
  }
  if (this.bankTransactionId && !this.bankTranId) {
    this.bankTranId = this.bankTransactionId;
  } else if (this.bankTranId && !this.bankTransactionId) {
    this.bankTransactionId = this.bankTranId;
  }
});

export const PaymentAttempt: Model<IPaymentAttempt> =
  mongoose.models.PaymentAttempt ||
  mongoose.model<IPaymentAttempt>("PaymentAttempt", PaymentAttemptSchema, "payments");

export default PaymentAttempt;
