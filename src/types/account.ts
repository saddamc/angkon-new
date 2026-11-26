import type { CustomerCancellationDecision } from "@/server/orders/workflow";

export interface AccountAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface AccountUserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  emailVerified: boolean;
  hasPassword: boolean;
  addresses: AccountAddress[];
}

export interface AccountOrderItem {
  productId: number;
  slug?: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  image?: string;
}

export interface AccountRefundEntry {
  refundId: string;
  amount: number;
  currency: string;
  status: string;
  refundChannel?: string;
  refundMethod?: string | null;
  initiatedAt?: string | null;
  processedAt?: string | null;
  failedAt?: string | null;
}

export interface AccountOrderSummary {
  _id?: string;
  orderNumber: string;
  subtotal?: number;
  total: number;
  shippingFee: number;
  discount?: number;
  promoCode?: string;
  orderStatus: string;
  orderStatusLabel?: string;
  paymentMethod: string;
  paymentStatus?: string;
  paymentStatusLabel?: string;
  paidAmount?: number;
  expectedCodAmount?: number;
  paidAt?: string;
  courier?: string;
  shipmentStatus?: string;
  shipmentStatusLabel?: string;
  shipmentBookingState?: string;
  trackingCode?: string;
  consignmentId?: string;
  createdAt: string;
  items: AccountOrderItem[];
  customer: {
    fullName: string;
    email?: string;
    phone: string;
    address: string;
    city?: string;
    district: string;
    postalCode?: string;
  };
  cancellationRequest?: {
    status: "requested" | "approved" | "rejected" | "withdrawn";
    requestedAt?: string;
    reason?: string;
    reviewedAt?: string;
    reviewNote?: string;
  } | null;
  cancellationDetails?: {
    cancelledAt?: string;
    reason?: string;
    refundOutcome?: string | null;
  } | null;
  cancellationEligibility?: CustomerCancellationDecision;
  refunds?: AccountRefundEntry[];
  refundSummary?: {
    totalRefunded: number;
    pendingRefundAmount: number;
  };
}

export type AccountNotice = {
  text: string;
  type: "error" | "success" | "info";
} | null;
