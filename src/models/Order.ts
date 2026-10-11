import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOrderItem {
  productId: number;
  slug?: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
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

export interface IOrder extends Document {
  orderNumber: string;
  /** Customer account that owns this order (set at checkout) */
  userId?: mongoose.Types.ObjectId | null;
  customer: IOrderCustomer;
  items: IOrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: "cod" | "sslcommerz" | "bkash" | "nagad" | "online";
  paymentStatus: "pending" | "paid" | "failed";
  orderStatus: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  notes?: string;
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

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    customer: { type: OrderCustomerSchema, required: true },
    items: { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true, default: 0 },
    shippingFee: { type: Number, required: true, default: 60 },
    total: { type: Number, required: true, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["cod", "sslcommerz", "bkash", "nagad", "online"],
      default: "cod",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
      index: true,
    },
    orderStatus: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },
    notes: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

export const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);

export default Order;
