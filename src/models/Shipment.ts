import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { SHIPMENT_STATUSES, type ShipmentStatus } from "@/server/courier/providers/steadfast/utils";

/**
 * One consignment per courier provider per order.
 *
 * The order keeps a compact summary (`shipmentStatus`, `courier`,
 * `consignmentId`, `trackingCode`); this collection keeps the provider evidence
 * and the status timeline so a webhook retry or an admin refresh is idempotent.
 */

export type CourierProvider = "steadfast" | "pathao" | "redx" | "ecourier";

export interface IShipmentEvent {
  status: string;
  at: Date;
  note?: string;
  raw?: Record<string, unknown>;
}

export interface IShipment extends Document {
  orderId: Types.ObjectId;
  orderNumber: string;
  provider: CourierProvider;
  mode?: "mock" | "live";
  isMock?: boolean;
  confirmedByAdmin?: boolean;
  confirmedByAdminId?: string | null;
  confirmedAt?: Date | null;
  status: ShipmentStatus;
  consignmentId?: string | null;
  trackingCode?: string | null;
  providerShipmentId?: string | null;
  packageWeight?: number | null;
  parcelCategory?: string | null;
  packagingType?: string | null;
  codAmount: number;
  deliveryCharge?: number | null;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  note?: string;
  /** Unique per order+provider so a double-click cannot create two pickups. */
  idempotencyKey: string;
  providerMeta?: Record<string, unknown> | null;
  events: IShipmentEvent[];
  rawResponse?: Record<string, unknown> | null;
  lastSyncedAt?: Date | null;
  error?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ShipmentEventSchema = new Schema<IShipmentEvent>(
  {
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
    note: { type: String, default: "" },
    raw: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const ShipmentSchema = new Schema<IShipment>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    orderNumber: { type: String, required: true, trim: true, index: true },
    provider: { type: String, enum: ["steadfast", "pathao", "redx", "ecourier"], required: true },
    mode: { type: String, enum: ["mock", "live"], default: "mock", index: true },
    isMock: { type: Boolean, default: true, index: true },
    confirmedByAdmin: { type: Boolean, default: false },
    confirmedByAdminId: { type: String, default: null },
    confirmedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: SHIPMENT_STATUSES,
      default: "pending",
      index: true,
    },
    consignmentId: { type: String },
    trackingCode: { type: String },
    providerShipmentId: { type: String, trim: true },
    packageWeight: { type: Number, default: null },
    parcelCategory: { type: String, trim: true, default: null },
    packagingType: { type: String, trim: true, default: null },
    codAmount: { type: Number, default: 0, min: 0 },
    deliveryCharge: { type: Number, default: null },
    recipientName: { type: String, required: true, trim: true },
    recipientPhone: { type: String, required: true, trim: true },
    recipientAddress: { type: String, required: true, trim: true },
    note: { type: String, default: "" },
    idempotencyKey: { type: String, required: true, unique: true },
    providerMeta: { type: Schema.Types.Mixed, default: null },
    events: { type: [ShipmentEventSchema], default: [] },
    rawResponse: { type: Schema.Types.Mixed, default: null },
    lastSyncedAt: { type: Date, default: null },
    error: { type: String, default: null },
  },
  { timestamps: true }
);

ShipmentSchema.index({ orderId: 1, createdAt: -1 });
ShipmentSchema.index({ orderNumber: 1, provider: 1, status: 1 });
ShipmentSchema.index({ consignmentId: 1 }, { unique: true, sparse: true });
ShipmentSchema.index({ trackingCode: 1 }, { unique: true, sparse: true });
ShipmentSchema.index({ providerShipmentId: 1 }, { unique: true, sparse: true });
ShipmentSchema.index({ status: 1, updatedAt: -1 });
ShipmentSchema.index({ mode: 1, createdAt: -1 });

export const Shipment: Model<IShipment> =
  mongoose.models.Shipment || mongoose.model<IShipment>("Shipment", ShipmentSchema);

export default Shipment;
