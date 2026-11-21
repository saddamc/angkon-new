import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * One row per payment attempt against an order.
 *
 * The order keeps the customer-facing summary; this collection keeps the
 * provider evidence (transaction ids, validation payloads, timestamps) so a
 * payment can be verified, replayed idempotently, refunded and audited without
 * overloading `Order.notes`.
 */

export type PaymentProvider = "sslcommerz" | "manual" | "cod";

export type PaymentStatus =
  | "created"
  | "initiating"
  | "initiated"
  | "pending"
  | "succeeded"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired"
  | "unknown"
  | "review_required"
  | "refunded"
  | "partially_refunded";

/**
 * Append-only history for one payment attempt. Status columns show the latest
 * state; `events` keeps the ordered trail so a dispute can be reconstructed.
 */
export interface IPaymentEvent {
  at: Date;
  type:
    | "initiated"
    | "failed"
    | "cancelled"
    | "validated"
    | "duplicate"
    | "expired"
    | "reconciled"
    | "refunded"
    | "note";
  source?: string | null;
  message?: string | null;
  data?: Record<string, unknown> | null;
}

const PaymentEventSchema = new Schema<IPaymentEvent>(
  {
    at: { type: Date, default: Date.now },
    type: { type: String, required: true },
    source: { type: String, default: null },
    message: { type: String, default: null },
    data: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

export interface IPayment extends Document {
  orderId: Types.ObjectId;
  orderNumber: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;
  currency: string;
  /** SSLCommerz `tran_id` — equal to the order number, unique per payment. */
  tranId: string;
  /** SSLCommerz `val_id`, stored once a callback/IPN is verified. */
  valId?: string | null;
  gatewayPageUrl?: string | null;
  /** SHA-256 of the SSLCommerz session key (the raw key is never persisted). */
  sessionKeyHash?: string | null;
  bankTranId?: string | null;
  cardType?: string | null;
  cardBrand?: string | null;
  riskLevel?: string | null;
  riskTitle?: string | null;
  failureReason?: string | null;
  errorDetails?: string | null;
  gatewaySessionKey?: string | null;
  /** Client-supplied idempotency key for the checkout submission. */
  idempotencyKey?: string | null;
  initiatedAt: Date;
  paidAt?: Date | null;
  failedAt?: Date | null;
  /** Sanitised provider response — never contains credentials. */
  rawInit?: Record<string, unknown> | null;
  /** Sanitised validator response — never contains credentials. */
  rawValidation?: Record<string, unknown> | null;
  lastReconciledAt?: Date | null;
  reconcileAttempts?: number;
  reconcileNote?: string | null;
  /** Validation & refund tracking (Stage 5). */
  validatedAt?: Date | null;
  refundedAmount?: number;
  refundRefId?: string | null;
  refundReason?: string | null;
  refundedAt?: Date | null;
  recordedBy?: string | null;
  note?: string | null;
  /** Ordered, append-only history of this payment attempt. */
  events?: IPaymentEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    orderNumber: { type: String, required: true, trim: true, index: true },
    provider: { type: String, enum: ["sslcommerz", "manual", "cod"], required: true },
    status: {
      type: String,
      enum: [
        "created",
        "initiating",
        "initiated",
        "pending",
        "succeeded",
        "paid",
        "failed",
        "cancelled",
        "expired",
        "unknown",
        "review_required",
        "refunded",
        "partially_refunded",
      ],
      default: "initiated",
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "BDT" },
    tranId: { type: String, required: true, unique: true },
    valId: { type: String },
    gatewayPageUrl: { type: String, default: null },
    sessionKeyHash: { type: String, default: null },
    bankTranId: { type: String, default: null },
    cardType: { type: String, default: null },
    cardBrand: { type: String, default: null },
    riskLevel: { type: String, default: null },
    riskTitle: { type: String, default: null },
    failureReason: { type: String, default: null },
    errorDetails: { type: String, default: null },
    gatewaySessionKey: { type: String, default: null },
    idempotencyKey: { type: String },
    initiatedAt: { type: Date, default: Date.now },
    paidAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    rawInit: { type: Schema.Types.Mixed, default: null },
    rawValidation: { type: Schema.Types.Mixed, default: null },
    lastReconciledAt: { type: Date, default: null },
    reconcileAttempts: { type: Number, default: 0 },
    reconcileNote: { type: String, default: null },
    validatedAt: { type: Date, default: null },
    refundedAmount: { type: Number, default: 0, min: 0 },
    refundRefId: { type: String, default: null },
    refundReason: { type: String, default: null },
    refundedAt: { type: Date, default: null },
    recordedBy: { type: String, default: null },
    note: { type: String, default: null },
    events: { type: [PaymentEventSchema], default: [] },
  },
  { timestamps: true }
);

// A `val_id` belongs to exactly one transaction; reject replays across orders.
PaymentSchema.index({ valId: 1 }, { unique: true, sparse: true });
PaymentSchema.index({ orderId: 1, createdAt: -1 });
PaymentSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);

export type IPaymentAttempt = IPayment;
export const PaymentAttempt: Model<IPayment> = Payment;

export default Payment;
