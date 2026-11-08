import {
  ShoppingCart,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  RotateCcw,
  Pause,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface WCLineItem {
  id?: number | string;
  name: string;
  quantity: number;
  price?: string | number;
  total?: string | number;
  size?: string;
  image?: { src: string };
  meta_data?: { key: string; value: string }[];
}

export interface WCOrder {
  id: string | number;
  number: string;
  status: string;
  payment_status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  date_created: string;
  total: string;
  discount_total?: string;
  shipping_total?: string;
  payment_method_title?: string;
  billing: {
    first_name: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address_1?: string;
    city?: string;
    postcode?: string;
  };
  customer_note?: string;
  line_items: WCLineItem[];
}

export interface StatusFilterItem {
  key: string;
  label: string;
  icon: LucideIcon;
}

export interface StatusOptionItem {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
  desc: string;
}

export const STATUS_FILTERS: StatusFilterItem[] = [
  { key: "any", label: "All", icon: ShoppingCart },
  { key: "pending", label: "Pending", icon: Clock },
  { key: "processing", label: "Confirmed", icon: CheckCircle2 },
  { key: "on-hold", label: "On Hold", icon: Pause },
  { key: "completed", label: "Delivered", icon: Truck },
  { key: "cancelled", label: "Cancelled", icon: XCircle },
  { key: "refunded", label: "Returned", icon: RotateCcw },
  { key: "failed", label: "Failed", icon: XCircle },
];

export const STATUS_OPTIONS: StatusOptionItem[] = [
  { key: "pending", label: "Pending", icon: Clock, color: "amber", desc: "Awaiting verification or confirmation" },
  { key: "processing", label: "Confirmed", icon: CheckCircle2, color: "blue", desc: "Confirmed, preparing order" },
  { key: "on-hold", label: "On Hold", icon: Pause, color: "yellow", desc: "Waiting for customer/admin action" },
  { key: "completed", label: "Delivered", icon: Truck, color: "emerald", desc: "Order fulfilled and delivered" },
  { key: "cancelled", label: "Cancelled", icon: XCircle, color: "red", desc: "Order was cancelled" },
  { key: "refunded", label: "Refunded", icon: RotateCcw, color: "gray", desc: "Payment returned to customer" },
];

export const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  processing: "bg-blue-50 text-blue-800 border-blue-200",
  "on-hold": "bg-yellow-50 text-yellow-800 border-yellow-200",
  completed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-800 border-rose-200",
  refunded: "bg-stone-100 text-stone-700 border-stone-200",
  failed: "bg-rose-50 text-rose-800 border-rose-200",
  "checkout-draft": "bg-stone-50 text-stone-500 border-stone-200",
};

export const FINAL_STATUSES = ["cancelled", "refunded"];

export function formatBDT(amount: string | number) {
  return `৳ ${Number(amount || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 0,
  })}`;
}

export interface InfoModalData {
  title: string;
  subtitle?: string;
  fields: { label: string; value: string; mono?: boolean }[];
}

export interface WarningModalData {
  kind: "permanent" | "revert-payment";
  orderId: string | number;
  status: string;
  orderNumber: string;
  total?: string | number;
}

export interface PaymentModalData {
  orderId: string | number;
  orderNumber: string;
  total: string | number;
}

export interface ToastData {
  message: string;
  type: "success" | "error";
}
