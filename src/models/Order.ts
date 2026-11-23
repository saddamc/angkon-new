import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOrderItem {
  productId: number;
  slug?: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  image?: string;
}

export interface IOrderCustomer {
  fullName: string;
  email?: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postalCode?: string;
}

export interface IOrderVisitorContext {
  clientIp?: string;
  clientUserAgent?: string;
  fbp?: string;
  fbc?: string;
  recordedAt?: Date;
}

export type CodSettlementStatus = "none" | "expected" | "collected" | "settled" | "discrepancy";

export type ShipmentBookingState =
  | "not_booked"
  | "booking_in_progress"
  | "booked"
  | "booking_failed"
  | "cancellation_pending"
  | "cancelled";

export interface IOrderStatusHistoryEntry {
  status: string;
  previousStatus?: string;
  actor: string;
  note?: string;
  source?: string;
  at: Date;
}

export interface IOrderAdminNote {
  id: string;
  text: string;
  actor: string;
  at: Date;
}

export interface IOrderManualDeliveryDetails {
  courierName?: string;
  trackingNumber?: string;
  pickupDate?: Date | null;
  shipmentDate?: Date | null;
  deliveryDate?: Date | null;
  notes?: string;
  updatedBy?: string;
  updatedAt?: Date | null;
}

export interface IOrder extends Document {
  orderNumber: string;
  /** Customer account that owns this order (set at checkout) */
  userId?: mongoose.Types.ObjectId | null;
  customer: IOrderCustomer;
  visitorContext?: IOrderVisitorContext;
  items: IOrderItem[];
  subtotal: number;
  discount?: number;
  promoCode?: string;
  shippingFee: number;
  total: number;
  channel?: "website" | "admin" | "manual" | "phone" | string;
  paymentMethod: "cod" | "sslcommerz" | "bkash" | "nagad" | "online" | string;
  paymentStatus:
    | "pending"
    | "unpaid"
    | "advance_pending"
    | "partially_paid"
    | "paid"
    | "failed"
    | "cancelled"
    | "refund_pending"
    | "refunded"
    | "partially_refunded"
    | string;
  /** Accepted business policy version and timestamp. */
  policyVersion?: string | null;
  policyAcceptedAt?: Date | null;
  /** Advance / verified online / recorded paid amount in BDT. */
  paidAmount?: number;
  /** Expected COD amount calculated from outstanding balance. */
  expectedCodAmount?: number;
  /** Collected COD amount reported by courier upon delivery. */
  collectedCodAmount?: number;
  /** Actual cash settled by courier to merchant bank/account. */
  settledCodAmount?: number;
  /** Delivery charge deducted or billed by courier. */
  courierCharge?: number;
  /** Independent courier COD settlement lifecycle. */
  codSettlementStatus?: CodSettlementStatus | string;
  settledAt?: Date | null;
  settlementNote?: string;
  /** Active payment attempt (Payment collection). */
  paymentId?: mongoose.Types.ObjectId | null;
  paidAt?: Date | null;
  failedAt?: Date | null;
  /** Client-supplied checkout idempotency key (unique sparse). */
  idempotencyKey?: string | null;
  /** Atomic guard so the Meta Purchase event fires at most once. */
  capiPurchaseSentAt?: Date | null;
  /** Atomic guard so the payment invoice email is sent at most once. */
  invoiceSentAt?: Date | null;
  /** Stock lifecycle markers (reserve/commit/release). */
  stockReservedAt?: Date | null;
  stockCommittedAt?: Date | null;
  stockReleasedAt?: Date | null;
  orderStatus:
    | "pending"
    | "confirmed"
    | "processing"
    | "ready_to_ship"
    | "shipped"
    | "delivered"
    | "completed"
    | "cancelled"
    | "returned"
    | "on-hold"
    | "refunded"
    | "failed"
    | string;
  /** Canonical courier lifecycle status. */
  shipmentStatus?:
    | "not_booked"
    | "booking_pending"
    | "booking_failed"
    | "booked"
    | "pickup_pending"
    | "picked_up"
    | "in_transit"
    | "out_for_delivery"
    | "delivered"
    | "delivery_failed"
    | "return_initiated"
    | "returned"
    | "cancelled"
    | "unknown"
    | "none"
    | "created"
    | "hold"
    | "in_review"
    | string;
  shipmentBookingState?: ShipmentBookingState | string;
  /** Raw unmapped courier status as returned by Steadfast API. */
  providerStatus?: string;
  /** Shipment mode: automated API vs manual courier / own rider. */
  courierMode?: "steadfast" | "manual" | string;
  /** Integration operating mode: mock / development vs live production. */
  courierOperatingMode?: "mock" | "live";
  courierIsMock?: boolean;
  courierConfirmedByAdminId?: string | null;
  courierConfirmedAt?: Date | null;
  isTestOrder?: boolean;
  isArchived?: boolean;
  courier?: string;
  courierName?: string;
  courierBookingError?: string | null;
  trackingCode?: string;
  consignmentId?: string;
  trackingUrl?: string | null;
  manualDeliveryDetails?: IOrderManualDeliveryDetails | null;
  notes?: string;
  statusHistory?: IOrderStatusHistoryEntry[];
  adminNotes?: IOrderAdminNote[];
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Number, required: true },
    slug: { type: String, default: "" },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    size: { type: String, default: "" },
    color: { type: String, default: "" },
    image: { type: String, default: "" },
  },
  { _id: false }
);

const OrderCustomerSchema = new Schema<IOrderCustomer>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    postalCode: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const OrderVisitorContextSchema = new Schema<IOrderVisitorContext>(
  {
    clientIp: { type: String, default: "" },
    clientUserAgent: { type: String, default: "" },
    fbp: { type: String, default: "" },
    fbc: { type: String, default: "" },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OrderStatusHistorySchema = new Schema<IOrderStatusHistoryEntry>(
  {
    status: { type: String, required: true },
    previousStatus: { type: String, default: "" },
    actor: { type: String, required: true },
    note: { type: String, default: "" },
    source: { type: String, default: "admin" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OrderAdminNoteSchema = new Schema<IOrderAdminNote>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    actor: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OrderManualDeliveryDetailsSchema = new Schema<IOrderManualDeliveryDetails>(
  {
    courierName: { type: String, default: "" },
    trackingNumber: { type: String, default: "" },
    pickupDate: { type: Date, default: null },
    shipmentDate: { type: Date, default: null },
    deliveryDate: { type: Date, default: null },
    notes: { type: String, default: "" },
    updatedBy: { type: String, default: "" },
    updatedAt: { type: Date, default: null },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    customer: { type: OrderCustomerSchema, required: true },
    visitorContext: { type: OrderVisitorContextSchema, required: false },
    items: { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0 },
    promoCode: { type: String, default: "" },
    shippingFee: { type: Number, required: true, default: 60 },
    total: { type: Number, required: true, default: 0 },
    channel: {
      type: String,
      enum: ["website", "admin", "manual", "phone"],
      default: "website",
      index: true,
    },
    paymentMethod: {
      type: String,
      // "cards" is the storefront's card channel (Visa/Mastercard/Amex/DBBL
      // via SSLCOMMERZ). It must be persistable — rejecting it made every
      // card checkout fail at Order.create with a ValidationError.
      enum: ["cod", "sslcommerz", "bkash", "nagad", "online", "cards"],
      default: "cod",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "unpaid",
        "advance_pending",
        "partially_paid",
        "paid",
        "failed",
        "cancelled",
        "refund_pending",
        "refunded",
        "partially_refunded",
      ],
      default: "pending",
      index: true,
    },
    policyVersion: { type: String, default: null },
    policyAcceptedAt: { type: Date, default: null },
    paidAmount: { type: Number, default: 0, min: 0 },
    expectedCodAmount: { type: Number, default: 0, min: 0 },
    collectedCodAmount: { type: Number, default: 0, min: 0 },
    settledCodAmount: { type: Number, default: 0, min: 0 },
    courierCharge: { type: Number, default: 0, min: 0 },
    codSettlementStatus: {
      type: String,
      enum: ["none", "expected", "collected", "settled", "discrepancy"],
      default: "none",
      index: true,
    },
    settledAt: { type: Date, default: null },
    settlementNote: { type: String, default: "" },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", default: null },
    paidAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    idempotencyKey: { type: String },
    capiPurchaseSentAt: { type: Date, default: null },
    invoiceSentAt: { type: Date, default: null },
    stockReservedAt: { type: Date, default: null },
    stockCommittedAt: { type: Date, default: null },
    stockReleasedAt: { type: Date, default: null },
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "ready_to_ship",
        "shipped",
        "delivered",
        "completed",
        "cancelled",
        "returned",
        "on-hold",
        "refunded",
        "failed",
      ],
      default: "pending",
      index: true,
    },
    notes: { type: String, default: "" },
    statusHistory: { type: [OrderStatusHistorySchema], default: [] },
    adminNotes: { type: [OrderAdminNoteSchema], default: [] },
    shipmentStatus: { type: String, default: "not_booked", index: true },
    shipmentBookingState: {
      type: String,
      enum: [
        "not_booked",
        "booking_in_progress",
        "booked",
        "booking_failed",
        "cancellation_pending",
        "cancelled",
      ],
      default: "not_booked",
    },
    providerStatus: { type: String, default: "" },
    courierMode: { type: String, enum: ["steadfast", "manual"], default: "steadfast" },
    courierOperatingMode: { type: String, enum: ["mock", "live"], default: "mock" },
    courierIsMock: { type: Boolean, default: true },
    courierConfirmedByAdminId: { type: String, default: null },
    courierConfirmedAt: { type: Date, default: null },
    isTestOrder: { type: Boolean, default: false, index: true },
    isArchived: { type: Boolean, default: false, index: true },
    courier: { type: String, default: "" },
    courierName: { type: String, default: "" },
    courierBookingError: { type: String, default: null },
    trackingCode: { type: String, default: "" },
    consignmentId: { type: String, default: "" },
    trackingUrl: { type: String, default: null },
    manualDeliveryDetails: { type: OrderManualDeliveryDetailsSchema, default: null },
  },
  {
    timestamps: true,
  }
);

// Checkout replay protection: one order per idempotency key.
OrderSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
// Admin list + customer history access paths.
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ orderStatus: 1, createdAt: -1 });
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ "customer.email": 1 });
OrderSchema.index({ "customer.phone": 1 });

export const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);

export default Order;
