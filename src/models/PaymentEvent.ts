import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type PaymentEventType =
  | "payment_attempt_created"
  | "payment_initiation_started"
  | "gateway_session_created"
  | "gateway_session_failed"
  | "customer_redirected"
  | "customer_returned"
  | "customer_cancelled"
  | "ipn_received"
  | "callback_received"
  | "validation_started"
  | "validation_succeeded"
  | "validation_failed"
  | "gateway_query_started"
  | "gateway_query_completed"
  | "payment_confirmed"
  | "payment_failed"
  | "payment_expired"
  | "payment_review_required"
  | "payment_retry_created"
  | "reconciliation_scheduled"
  | "reconciliation_completed"
  | "reconciliation_failed"
  | "manual_review_started"
  | "manual_status_override"
  | "manual_note"
  | "refund_initiated"
  | "refund_completed"
  | "refund_failed"
  | "manual_refund_recorded"
  | "refund_timeout_reconcile_needed"
  | "courier_return_requested"
  | "physical_return_confirmed"
  | "stock_released";

export type PaymentEventSource =
  | "customer_browser"
  | "sslcommerz_callback"
  | "sslcommerz_ipn"
  | "reconciliation_worker"
  | "admin_dashboard"
  | "system";

export interface IPaymentEventDocument extends Document {
  /** Null for manual offline refund events that have no payment attempt. */
  attemptId: Types.ObjectId | null;
  orderId: Types.ObjectId;
  orderNumber: string;
  tranId: string;
  eventType: PaymentEventType | string;
  source: PaymentEventSource | string;
  timestamp: Date;
  gatewayStatus?: string | null;
  metadata?: Record<string, unknown> | null;
  correlationId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentEventSchema = new Schema<IPaymentEventDocument>(
  {
    attemptId: {
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
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    source: {
      type: String,
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    gatewayStatus: {
      type: String,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
    correlationId: {
      type: String,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "paymentevents",
  }
);

PaymentEventSchema.index({ attemptId: 1, timestamp: -1 });
PaymentEventSchema.index({ orderId: 1, timestamp: -1 });
PaymentEventSchema.index({ tranId: 1, timestamp: -1 });

export const PaymentEvent: Model<IPaymentEventDocument> =
  mongoose.models.PaymentEvent ||
  mongoose.model<IPaymentEventDocument>("PaymentEvent", PaymentEventSchema);

export default PaymentEvent;
