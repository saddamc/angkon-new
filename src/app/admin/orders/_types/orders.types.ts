import {
  ShoppingCart,
  Clock,
  CheckCircle2,
  PackageCheck,
  Package,
  XCircle,
  Truck,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CourierSettings } from "@/server/courier/core/tracking";

export interface WCLineItem {
  id?: number | string;
  name: string;
  quantity: number;
  price?: string | number;
  total?: string | number;
  size?: string;
  color?: string;
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
  channel?: "website" | "admin" | "manual" | "phone" | string;
  courier?: string;
  courierMode?: "steadfast" | "manual" | string;
  courierOperatingMode?: "mock" | "live";
  courierIsMock?: boolean;
  courierConfirmedByAdminId?: string | null;
  courierConfirmedAt?: string | Date | null;
  isTestOrder?: boolean;
  courierName?: string;
  courierBookingError?: string | null;
  trackingUrl?: string | null;
  providerStatus?: string;
  manualDeliveryDetails?: {
    courierName?: string;
    trackingNumber?: string;
    pickupDate?: string | Date | null;
    shipmentDate?: string | Date | null;
    deliveryDate?: string | Date | null;
    notes?: string;
    updatedBy?: string;
    updatedAt?: string | Date | null;
  } | null;
  shipmentStatus?: string;
  shipmentBookingState?: string;
  /** COD amount currently stored on the latest active courier consignment. */
  shipmentCodAmount?: number | null;
  /** True when the active courier consignment would collect more than the order's current balance. */
  shipmentCodMismatch?: boolean;
  trackingCode?: string;
  consignmentId?: string;
  date_created: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  total: string;
  subtotal?: number;
  discount?: number;
  discount_total?: string;
  shipping_total?: string;
  paidAmount?: number;
  outstandingAmount?: number;
  expectedCodAmount?: number;
  collectedCodAmount?: number;
  settledCodAmount?: number;
  courierCharge?: number;
  discrepancyAmount?: number;
  codSettlementStatus?: "none" | "expected" | "collected" | "settled" | "discrepancy" | string;
  payment_method_title?: string;
  customer?: {
    fullName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    district?: string;
    postalCode?: string;
  };
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
  cancellationRequest?: {
    status: "requested" | "approved" | "rejected" | "withdrawn";
    requestedAt?: string | Date | null;
    reason?: string | null;
    reviewedAt?: string | Date | null;
    reviewNote?: string | null;
  } | null;
  line_items: WCLineItem[];
}

export interface OrdersSummaryStats {
  totalOrders: number;
  pendingCount: number;
  readyToShipCount: number;
  shippedCount: number;
  deliveredCount: number;
  cancelledReturnedCount: number;
  activeShipments: number;
  totalRevenue: number;
  paidRevenue: number;
  outstandingBalance: number;
  codCollectedAwaitingSettlement: number;
  codCollectedCount: number;
  discrepancyCount: number;
  paymentIssuesCount?: number;
  needsActionCount?: number;
  readyToBookCount?: number;
  inTransitCount?: number;
  trends?: {
    total7d: number;
    totalPrev7d: number;
    delivered7d: number;
    deliveredPrev7d: number;
  };
}

/** Manual order payload sent from the admin "Create Order" modal. */
export interface CreateOrderPayload {
  customer: {
    fullName: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    district?: string;
    postalCode?: string;
  };
  items: {
    productId: number;
    slug?: string;
    quantity: number;
    size?: string;
    color?: string;
  }[];
  paymentMethod: "cod" | "manual_paid";
  shippingFee?: number;
  discount?: number;
  notes?: string;
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
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "processing", label: "Processing", icon: Package },
  { key: "ready_to_ship", label: "Ready to Ship", icon: PackageCheck },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
  { key: "cancelled", label: "Cancelled", icon: XCircle },
  { key: "returned", label: "Returned", icon: RotateCcw },
  { key: "failed", label: "Failed", icon: AlertTriangle },
];

export const STATUS_OPTIONS: StatusOptionItem[] = [
  { key: "pending", label: "Pending", icon: Clock, color: "amber", desc: "Awaiting admin confirmation" },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2, color: "sky", desc: "Order verified with customer" },
  { key: "processing", label: "Processing", icon: Package, color: "blue", desc: "Picking & packing items" },
  { key: "ready_to_ship", label: "Ready to Ship", icon: PackageCheck, color: "violet", desc: "Packed and eligible for courier pickup" },
  { key: "shipped", label: "Shipped", icon: Truck, color: "indigo", desc: "Dispatched to courier partner" },
  { key: "delivered", label: "Delivered", icon: CheckCircle2, color: "emerald", desc: "Delivered to customer" },
  { key: "cancelled", label: "Cancelled", icon: XCircle, color: "red", desc: "Order cancelled (locked)" },
  { key: "returned", label: "Returned", icon: RotateCcw, color: "gray", desc: "Returned by courier / customer" },
  { key: "failed", label: "Failed", icon: AlertTriangle, color: "red", desc: "Checkout or payment failed" },
];

export const MANUAL_ORDER_STATUS_OPTIONS: StatusOptionItem[] = [
  { key: "pending", label: "Pending", icon: Clock, color: "amber", desc: "Awaiting admin confirmation" },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2, color: "sky", desc: "Order verified with customer" },
  { key: "processing", label: "Processing", icon: Package, color: "blue", desc: "Picking & packing items" },
  { key: "ready_to_ship", label: "Ready to Ship", icon: PackageCheck, color: "violet", desc: "Packed and ready for courier pickup" },
];

export const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  confirmed: "bg-sky-50 text-sky-800 border-sky-200",
  processing: "bg-blue-50 text-blue-800 border-blue-200",
  ready_to_ship: "bg-purple-50 text-purple-800 border-purple-200",
  shipped: "bg-indigo-50 text-indigo-800 border-indigo-200",
  delivered: "bg-emerald-50 text-emerald-800 border-emerald-200",
  completed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  "on-hold": "bg-yellow-50 text-yellow-800 border-yellow-200",
  cancelled: "bg-rose-50 text-rose-800 border-rose-200",
  returned: "bg-stone-100 text-stone-700 border-stone-200",
  refunded: "bg-stone-100 text-stone-700 border-stone-200",
  failed: "bg-rose-50 text-rose-800 border-rose-200",
  "checkout-draft": "bg-stone-50 text-stone-500 border-stone-200",
};

export const STATUS_LABEL_MAP: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  ready_to_ship: "Ready to Ship",
  shipped: "Shipped",
  delivered: "Delivered",
  completed: "Delivered",
  "on-hold": "On Hold",
  cancelled: "Cancelled",
  returned: "Returned",
  refunded: "Refunded",
  failed: "Failed",
};

export const FINAL_STATUSES = ["cancelled", "refunded"];

export function formatBDT(amount: string | number | null | undefined) {
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

export interface PaymentAttempt {
  id: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  tranId: string;
  valId?: string | null;
  bankTranId?: string | null;
  cardType?: string | null;
  cardBrand?: string | null;
  riskLevel?: string | null;
  initiatedAt?: string | null;
  paidAt?: string | null;
  validatedAt?: string | null;
  failedAt?: string | null;
  lastReconciledAt?: string | null;
  reconcileAttempts?: number;
  reconcileNote?: string | null;
  refundedAmount?: number;
  refundRefId?: string | null;
  refundReason?: string | null;
  refundedAt?: string | null;
  recordedBy?: string | null;
  note?: string | null;
  createdAt?: string | null;
}

export interface PaymentDetailsData {
  order: {
    orderNumber: string;
    paymentMethod?: string;
    paymentStatus?: string;
    orderStatus?: string;
    total: number;
    paidAt?: string | null;
    failedAt?: string | null;
  };
  payments: PaymentAttempt[];
}

export interface ShipmentEvent {
  status: string;
  at?: string | null;
  note?: string | null;
}

export interface ShipmentRecord {
  id: string;
  provider: string;
  status: string;
  mode?: "mock" | "live";
  isMock?: boolean;
  consignmentId?: string | null;
  trackingCode?: string | null;
  codAmount: number;
  deliveryCharge?: number | null;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  note?: string;
  providerMeta?: Record<string, unknown> | null;
  events?: ShipmentEvent[];
  lastSyncedAt?: string | null;
  error?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type ApiCourierKey = "steadfast" | "pathao" | "redx";

export interface CourierProviderStatus {
  id?: ApiCourierKey;
  configured: boolean;
  enabled?: boolean;
  supported?: boolean;
  disabledReason?: string | null;
  label?: string;
  isMock?: boolean;
  mode?: "mock" | "live";
  simulated?: boolean;
}

export interface CourierProvidersState {
  steadfast: CourierProviderStatus;
  pathao: CourierProviderStatus;
  redx?: CourierProviderStatus;
}

export interface CourierOverviewData {
  providers: CourierProvidersState;
  settings: CourierSettings;
  webhooks: Record<ApiCourierKey, boolean>;
  balances: {
    steadfast: {
      balance: number | null;
      currency: string;
      lastSyncedAt?: string | null;
      error?: string | null;
      configured?: boolean;
      mode?: "mock" | "live";
      isMock?: boolean;
      simulated?: boolean;
      modeReason?: string | null;
    } | null;
  };
  diagnostics?: {
    lastSyncAt: string | null;
    health: "healthy" | "degraded" | "unhealthy" | string;
    stats24h: { totalCalls: number; errorCount: number; successCount: number };
  };
}

export interface CreateShipmentOptions {
  recipient?: {
    fullName?: string;
    phone?: string;
    address?: string;
    city?: string;
    district?: string;
  };
  providerMeta?: {
    cityId?: number;
    zoneId?: number;
    areaId?: number;
    areaName?: string;
    deliveryType?: number;
    itemWeight?: number;
    parcelType?: string;
    packageWeight?: number;
    packagingType?: string;
    weightEstimated?: boolean;
    manualEstimateReason?: string;
    itemDescription?: string;
    totalLot?: number;
  };
  allowCodFallback?: boolean;
  confirmLiveBooking?: boolean;
}

export interface OrderParcelWeightSummaryUI {
  items: Array<{
    productId: number;
    name: string;
    quantity: number;
    unitWeightKg: number | null;
    totalWeightKg: number | null;
    isMissingWeight: boolean;
    shippingCategory: string;
  }>;
  totalProductWeightKg: number;
  packagingId: string;
  packagingName: string;
  packagingWeightKg: number;
  finalPackageWeightKg: number;
  hasMissingWeight: boolean;
  missingProductCount: number;
  missingProducts: Array<{ productId: number; name: string; quantity: number }>;
  autoParcelType: string;
  isMixedCategory: boolean;
  categoryBreakdown: Record<string, number>;
  totalQuantity: number;
  itemDescription: string;
}

export interface PackagingPresetUI {
  id: string;
  name: string;
  weightKg: number;
  description: string;
}

export interface ComputedOrderFinancialsUI {
  orderTotal: number;
  advancePaidAmount: number;
  outstandingAmount: number;
  codAmountToCollect: number;
  isPrepaidVerified: boolean;
  isPartiallyPaid: boolean;
  expectedCodAmount: number;
  collectedCodAmount: number;
  settledCodAmount: number;
  courierCharge: number;
  discrepancyAmount: number;
  codSettlementStatus: "none" | "expected" | "collected" | "settled" | "discrepancy";
}

export interface OrderRefundSummaryUI {
  capturedAmount: number;
  completedRefundAmount: number;
  pendingRefundAmount: number;
  availableRefundableAmount: number;
  eligibleGatewayAttempts: Array<{
    attemptId: string;
    tranId: string;
    bankTranId: string | null;
    valId: string | null;
    captured: number;
    completedRefunds: number;
    pendingRefunds: number;
    available: number;
  }>;
  manualRefundableAmount: number;
  totalRefundedAmount?: number;
  hasReconciliationPending?: boolean;
}

export interface OrderRefundRecord {
  id: string;
  refundId: string;
  refundChannel: "sslcommerz" | "manual_offline";
  status: string;
  amount: number;
  currency: string;
  reason: string;
  refundMethod?: string | null;
  externalReference?: string | null;
  refundRefId?: string | null;
  refundDate?: string | null;
  adminNote?: string | null;
  requestedBy: string;
  initiatedAt: string;
  processedAt?: string | null;
  failedAt?: string | null;
  failureReason?: string | null;
  reconciliationRequired?: boolean;
}

export interface OrderCancellationDetailsUI {
  cancelledAt: string;
  cancelledBy: string;
  reasonCode?: string | null;
  reason: string;
  adminNote?: string | null;
  decision: "cancel_only" | "cancel_and_refund";
  refundId?: string | null;
  refundOutcome?: string | null;
  courierDisposition?: string | null;
}

export interface OrderCancellationRequestUI {
  status: "requested" | "approved" | "rejected" | "withdrawn";
  requestedAt?: string | null;
  requestedBy?: string | null;
  reasonCode?: string | null;
  reason?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewNote?: string | null;
}

export interface OrderReturnInspectionUI {
  returnRequestedAt?: string | null;
  returnRequestedBy?: string | null;
  returnReason?: string | null;
  physicalReceiptConfirmedAt?: string | null;
  physicalReceiptConfirmedBy?: string | null;
  inspectionOutcome?: "pending" | "restockable" | "damaged" | null;
  inspectionNote?: string | null;
}

export interface OrderDetailsPayload {
  order: {
    orderNumber: string;
    orderStatus: string;
    paymentMethod: string;
    paymentStatus: string;
    paidAt?: string | null;
    failedAt?: string | null;
    subtotal: number;
    discount: number;
    promoCode?: string;
    shippingFee: number;
    total: number;
    paidAmount?: number;
    notes?: string;
    courier?: string;
    courierIsMock?: boolean;
    consignmentId?: string;
    trackingCode?: string;
    shipmentStatus?: string;
    shipmentBookingState?: string;
    settlementNote?: string;
    settledAt?: string | null;
    createdAt: string;
    updatedAt: string;
    customer: {
      fullName: string;
      email?: string;
      phone: string;
      address: string;
      city: string;
      district: string;
      postalCode?: string;
    };
    items: Array<{
      productId: number;
      slug?: string;
      name: string;
      price: number;
      quantity: number;
      size?: string;
      color?: string;
      image?: string;
    }>;
    adminNotes: Array<{ id: string; text: string; actor: string; at: string }>;
    financials: ComputedOrderFinancialsUI;
    allowedNextStatuses: string[];
    bookingEligibility: { ok: boolean; code?: string; status?: number; reason?: string };
    reopenEligibility?: {
      eligible: boolean;
      targetOrderStatus?: string;
      targetPaymentStatus?: string;
      shouldRestoreCodBalance?: boolean;
      requiresVerifiedGatewayCheck?: boolean;
      summary?: string;
      code?: string;
      reason?: string;
    };
    cancellationDetails?: OrderCancellationDetailsUI | null;
    cancellationRequest?: OrderCancellationRequestUI | null;
    returnInspection?: OrderReturnInspectionUI | null;
  };
  refundSummary?: OrderRefundSummaryUI;
  refunds?: OrderRefundRecord[];
  providers: CourierProviderStatus[];
  payments: PaymentAttempt[];
  shipments: ShipmentRecord[];
  courierLogs: Array<{
    id: string;
    provider: string;
    action: string;
    ok: boolean;
    httpStatus?: number | null;
    errorCode?: string | null;
    message: string;
    actor: string;
    createdAt: string;
  }>;
  auditLogs: Array<{
    id: string;
    actor: string;
    action: string;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    ip: string;
    createdAt: string;
  }>;
  timeline: Array<{
    id: string;
    at: string;
    category: "order" | "payment" | "shipment" | "note" | "audit";
    title: string;
    description: string;
    actor: string;
    action?: string;
    metadata?: Record<string, unknown> | null;
    fromStatus?: string | null;
    toStatus?: string | null;
    note?: string | null;
  }>;
}

export interface ToastData {
  message: string;
  type: "success" | "error";
}
