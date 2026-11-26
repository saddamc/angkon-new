"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  MapPin,
  MoreVertical,
  Package,
  PackageCheck,
  Phone,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Truck,
  User,
  X,
  XCircle,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import {
  formatBDT,
  type OrderDetailsPayload,
  type WCOrder,
} from "../_types/orders.types";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  SHIPMENT_STATUS_LABELS,
  COURIER_SETTLEMENT_LABELS,
} from "@/server/orders/workflow";
import { getCourierLabel, getCourierTrackingUrl } from "@/server/courier/core/tracking";
import { CourierLogo } from "@/components/admin/courier-logo";
import { CourierPrintAction } from "./courier-print-action";
import { WhatsAppIcon } from "./whatsapp-icon";
import {
  buildWhatsAppUrl,
  generateWhatsAppMessage,
} from "@/server/integrations/whatsapp/whatsapp-templates";
import { ProductThumbnail } from "./product-thumbnail";
import { OrderActivityView } from "./order-activity-view";
import { OrderCancellationModal, type CancelConfirmOptions } from "./order-cancellation-modal";
import type { ShipmentRecord } from "../_types/orders.types";

const PROVIDERS_WITHOUT_API_CANCEL = new Set(["steadfast"]);

const IN_TRANSIT_STATUSES = new Set(["in_transit", "out_for_delivery", "picked_up"]);
const TERMINAL_STATUSES = new Set([
  "cancelled",
  "returned",
  "failed",
  "delivered",
  "partial_delivered",
]);

interface ShipmentActionButtonsProps {
  shipment: ShipmentRecord;
  orderStub: WCOrder;
  busy?: boolean;
  onRefreshShipment?: (shipmentId: string) => Promise<boolean>;
  onCancelShipment: (
    orderStub: WCOrder,
    reason?: string,
    options?: { confirmExternalCancellation?: boolean; shipmentId?: string }
  ) => Promise<boolean>;
}

function ShipmentActionButtons({
  shipment,
  orderStub,
  busy,
  onRefreshShipment,
  onCancelShipment,
}: ShipmentActionButtonsProps) {
  const [mode, setMode] = useState<null | "api" | "portal">(null);
  const status = shipment.status;
  const isTerminal = TERMINAL_STATUSES.has(status);
  const isInTransit = IN_TRANSIT_STATUSES.has(status);
  const isMock = Boolean(
    shipment.isMock || shipment.mode === "mock" || shipment.consignmentId?.startsWith("MOCK-")
  );
  const needsPortalCancel = !isMock && PROVIDERS_WITHOUT_API_CANCEL.has(shipment.provider);

  if (isTerminal) return null;

  if (isInTransit) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
        <AlertTriangle className="h-3 w-3 text-amber-600" />
        Parcel is in transit. Cancel / recall via courier hub.
      </div>
    );
  }

  if (mode === "api") {
    return (
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-2 py-1">
        <span className="text-[10.5px] font-semibold text-rose-800">
          {isMock ? "Cancel this simulated consignment?" : "Cancel the real parcel at the courier?"}
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setMode(null);
            await onCancelShipment(orderStub, "Admin cancelled shipment", {
              shipmentId: shipment.id,
            });
          }}
          className="rounded-md bg-rose-600 px-2 py-0.5 text-[10.5px] font-bold text-white hover:bg-rose-700 disabled:opacity-50"
        >
          Yes, cancel
        </button>
        <button
          type="button"
          onClick={() => setMode(null)}
          className="rounded-md border border-rose-200 bg-white px-2 py-0.5 text-[10.5px] font-semibold text-rose-700 hover:bg-rose-100"
        >
          Keep
        </button>
      </div>
    );
  }

  if (mode === "portal") {
    return (
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1">
        <span className="text-[10.5px] font-semibold text-amber-900">
          Cancelled #{shipment.consignmentId || shipment.trackingCode} in the Steadfast portal?
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setMode(null);
            await onCancelShipment(
              orderStub,
              "Marked cancelled after Steadfast portal cancellation",
              { confirmExternalCancellation: true, shipmentId: shipment.id }
            );
          }}
          className="rounded-md bg-amber-600 px-2 py-0.5 text-[10.5px] font-bold text-white hover:bg-amber-700 disabled:opacity-50"
        >
          Yes, mark cancelled
        </button>
        <button
          type="button"
          onClick={() => setMode(null)}
          className="rounded-md border border-amber-200 bg-white px-2 py-0.5 text-[10.5px] font-semibold text-amber-800 hover:bg-amber-100"
        >
          Keep
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {onRefreshShipment && (
        <button
          type="button"
          disabled={busy || !(shipment.consignmentId || shipment.trackingCode)}
          onClick={() => void onRefreshShipment(shipment.id)}
          title={
            shipment.consignmentId || shipment.trackingCode
              ? "Pull the latest courier status"
              : "No consignment yet — retry the booking first."
          }
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <RefreshCw className={`h-3 w-3 ${busy ? "animate-spin" : ""}`} />
          Sync Status
        </button>
      )}
      <CourierPrintAction
        order={orderStub}
        shipment={shipment}
        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
        iconClassName="h-3 w-3"
      >
        Print Label
      </CourierPrintAction>
      {needsPortalCancel ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setMode("portal")}
          title="Use this only after cancelling the parcel in the Steadfast portal"
          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-40 cursor-pointer"
        >
          Mark cancelled (portal)
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          title="Cancel consignment with courier before pickup"
          onClick={() => setMode("api")}
          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Cancel Consignment
        </button>
      )}
    </div>
  );
}

export interface OrderDetailsContentProps {
  data: OrderDetailsPayload;
  isDrawer?: boolean;
  busy?: boolean;
  onStatusTransition: (
    status: string,
    reason?: string,
    extra?: CancelConfirmOptions
  ) => Promise<boolean>;
  onReopenOrder?: (reason: string) => Promise<boolean>;
  onOpenShipment: (orderStub: WCOrder) => void;
  onRefreshShipment: (shipmentId: string) => Promise<boolean>;
  onCancelShipment: (
    orderStub: WCOrder,
    reason?: string,
    options?: { confirmExternalCancellation?: boolean; shipmentId?: string }
  ) => Promise<boolean>;
  onReconcileSslcommerz: (orderNumber: string) => Promise<boolean>;
  onAddNote: (text: string) => Promise<boolean>;
  onSaveSettlement: (payload: {
    collectedCodAmount: number;
    settledCodAmount: number;
    courierCharge: number;
    settlementNote: string;
    markSettled: boolean;
  }) => Promise<boolean>;
  onRecordPayment: (payload: {
    action: "advance" | "refund";
    amount: number;
    method?: string;
    reference?: string;
    note?: string;
    refundMethod?: string;
    externalReference?: string;
    refundDate?: string;
    reason?: string;
    adminNote?: string;
  }) => Promise<boolean>;
  onInitiateGatewayRefund?: (
    attemptId: string,
    amount: number,
    reason: string
  ) => Promise<boolean>;
  onSyncRefund?: (refundId: string) => Promise<boolean>;
  onRequestCourierReturn?: (reason: string) => Promise<boolean>;
  onConfirmPhysicalReturn?: (
    inspectionOutcome: "restockable" | "damaged",
    inspectionNote?: string
  ) => Promise<boolean>;
  onCodFallback?: () => void;
  onCopy: (value: string, label: string) => void;
  fullPageHref?: string;
  onClose?: () => void;
  notificationBanner?: string | null;
}

function formatDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function buildOrderStub(order: OrderDetailsPayload["order"]): WCOrder {
  return {
    id: order.orderNumber,
    number: order.orderNumber,
    status: order.orderStatus,
    paymentStatus: order.paymentStatus,
    payment_status: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    courier: order.courier || "",
    shipmentStatus: order.shipmentStatus || "none",
    shipmentBookingState: order.shipmentBookingState || "not_booked",
    trackingCode: order.trackingCode || "",
    consignmentId: order.consignmentId || "",
    date_created: order.createdAt,
    total: String(order.total),
    paidAmount: order.financials.advancePaidAmount,
    outstandingAmount: order.financials.outstandingAmount,
    expectedCodAmount: order.financials.expectedCodAmount,
    collectedCodAmount: order.financials.collectedCodAmount,
    settledCodAmount: order.financials.settledCodAmount,
    courierCharge: order.financials.courierCharge,
    discrepancyAmount: order.financials.discrepancyAmount,
    codSettlementStatus: order.financials.codSettlementStatus,
    shipping_total: String(order.shippingFee || 0),
    billing: {
      first_name: order.customer.fullName,
      email: order.customer.email || "",
      phone: order.customer.phone,
      address_1: order.customer.address,
      city: order.customer.district || order.customer.city,
      postcode: order.customer.postalCode || "",
    },
    line_items: order.items.map((it) => ({
      id: it.productId,
      name: it.name,
      price: it.price,
      quantity: it.quantity,
      size: it.size,
      color: it.color,
      image: it.image ? { src: it.image } : undefined,
    })),
  };
}

function settlementBadgeClass(status: string) {
  switch (status) {
    case "settled":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "collected":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "discrepancy":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "expected":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

function getOrderStatusBadge(status: string) {
  const norm = (status || "pending").toLowerCase();
  switch (norm) {
    case "confirmed":
      return "bg-sky-50 text-sky-800 border-sky-200";
    case "processing":
      return "bg-blue-50 text-blue-800 border-blue-200";
    case "ready_to_ship":
      return "bg-purple-50 text-purple-800 border-purple-200";
    case "shipped":
      return "bg-indigo-50 text-indigo-800 border-indigo-200";
    case "delivered":
    case "completed":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "cancelled":
      return "bg-rose-50 text-rose-800 border-rose-200";
    case "returned":
    case "refunded":
      return "bg-stone-100 text-stone-700 border-stone-200";
    default:
      return "bg-amber-50 text-amber-800 border-amber-200";
  }
}

function getPaymentStatusBadge(status: string) {
  const norm = (status || "pending").toLowerCase();
  switch (norm) {
    case "paid":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "partially_paid":
      return "bg-blue-50 text-blue-800 border-blue-200";
    case "failed":
      return "bg-rose-50 text-rose-800 border-rose-200";
    case "refund_pending":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "refunded":
    case "partially_refunded":
      return "bg-stone-100 text-stone-700 border-stone-200";
    default:
      return "bg-amber-50 text-amber-800 border-amber-200";
  }
}

function getShipmentStatusBadge(status: string, bookingState?: string) {
  const norm = (status || "none").toLowerCase();
  if (norm === "delivered") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (norm === "in_transit" || norm === "out_for_delivery" || norm === "picked_up")
    return "bg-indigo-50 text-indigo-800 border-indigo-200";
  if (norm === "created" || bookingState === "booked")
    return "bg-purple-50 text-purple-800 border-purple-200";
  if (norm === "cancelled" || bookingState === "cancelled")
    return "bg-rose-50 text-rose-800 border-rose-200";
  if (norm === "returned") return "bg-stone-100 text-stone-700 border-stone-200";
  if (bookingState === "booking_in_progress")
    return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-stone-100 text-stone-600 border-stone-200";
}

export function OrderDetailsContent({
  data,
  isDrawer = false,
  busy = false,
  onStatusTransition,
  onReopenOrder,
  onOpenShipment,
  onRefreshShipment,
  onCancelShipment,
  onReconcileSslcommerz,
  onAddNote,
  onSaveSettlement,
  onRecordPayment,
  onInitiateGatewayRefund,
  onSyncRefund,
  onRequestCourierReturn,
  onConfirmPhysicalReturn,
  onCodFallback,
  onCopy,
  fullPageHref,
  onClose,
  notificationBanner,
}: OrderDetailsContentProps) {
  const { order, payments, shipments, timeline, auditLogs: _auditLogs, refundSummary, refunds = [] } = data;
  const fin = order.financials;
  const allowed = order.allowedNextStatuses || [];
  const orderStub = buildOrderStub(order);

  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "payment" | "shipment">("overview");
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);

  const [updateStatusModalOpen, setUpdateStatusModalOpen] = useState(false);
  const [targetStatusToUpdate, setTargetStatusToUpdate] = useState(allowed[0] || "");
  const [updateStatusReason, setUpdateStatusReason] = useState("");

  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenBusy, setReopenBusy] = useState(false);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setActionsMenuOpen(false);
      }
    };
    if (moreMenuOpen || actionsMenuOpen) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [moreMenuOpen, actionsMenuOpen]);

  const [actionBusy, setActionBusy] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellationDetailsOpen, setCancellationDetailsOpen] = useState(false);
  const [cancellationReviewBusy, setCancellationReviewBusy] = useState(false);
  const [cancellationReviewNote, setCancellationReviewNote] = useState("");

  const requestOrderCancellation = useCallback(() => {
    setCancelModalOpen(true);
  }, []);

  const handleConfirmOrderCancellation = useCallback(
    async (reason: string, options?: CancelConfirmOptions) => {
      setActionBusy(true);
      try {
        const success = await onStatusTransition("cancelled", reason, options);
        return Boolean(success);
      } finally {
        setActionBusy(false);
      }
    },
    [onStatusTransition]
  );

  const reviewCustomerCancellation = async (action: "approve" | "reject") => {
    if (cancellationReviewBusy) return;
    if (action === "reject" && cancellationReviewNote.trim().length < 3) {
      window.alert("Add a short reason before rejecting the customer request.");
      return;
    }
    setCancellationReviewBusy(true);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(order.orderNumber)}/cancellation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "approve"
            ? { action, reason: order.cancellationRequest?.reason || "Customer cancellation approved." }
            : { action, reviewNote: cancellationReviewNote.trim() },
        ),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not update the cancellation request.");
      window.location.reload();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not update the cancellation request.");
    } finally {
      setCancellationReviewBusy(false);
    }
  };
  const activeShipment = shipments.find(
    (s) => !["cancelled", "returned", "failed"].includes(s.status)
  );

  const isMockConsignment = Boolean(
    order.courierIsMock ||
    order.consignmentId?.startsWith("MOCK-") ||
    activeShipment?.isMock ||
    activeShipment?.consignmentId?.startsWith("MOCK-")
  );
  const hasConsignment = Boolean(order.consignmentId || activeShipment?.consignmentId);
  const effectiveShipmentStatus = order.shipmentStatus || (activeShipment ? activeShipment.status : "none");

  // Refund modal states & financial safeguard
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundAmountInput, setRefundAmountInput] = useState("");
  const [refundRefInput, setRefundRefInput] = useState("");
  const [refundMethodInput, setRefundMethodInput] = useState("bkash");
  const [refundDateInput, setRefundDateInput] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [refundNoteInput, setRefundNoteInput] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [syncingRefundId, setSyncingRefundId] = useState<string | null>(null);

  // Return / physical inspection UI states
  const [returnFormOpen, setReturnFormOpen] = useState(false);
  const [returnReasonInput, setReturnReasonInput] = useState("");
  const [inspectionFormOpen, setInspectionFormOpen] = useState(false);
  const [inspectionOutcomeInput, setInspectionOutcomeInput] = useState<"restockable" | "damaged">(
    "restockable"
  );
  const [inspectionNoteInput, setInspectionNoteInput] = useState("");

  // Financial calculations: authoritative server refundSummary with safe fallback
  const capturedAmount =
    refundSummary?.capturedAmount ??
    (fin.advancePaidAmount || (order.paymentStatus === "paid" ? order.total : 0));
  const refundedAmount =
    refundSummary?.completedRefundAmount ??
    payments.reduce((acc, p) => acc + (Number(p.refundedAmount) || 0), 0);
  const pendingRefundAmount = refundSummary?.pendingRefundAmount ?? 0;
  const maxRefundable =
    refundSummary?.availableRefundableAmount ??
    Math.max(0, capturedAmount - refundedAmount - pendingRefundAmount);
  const gatewayPayment = payments.find(
    (p) =>
      String(p.provider).toLowerCase() === "sslcommerz" &&
      ["paid", "succeeded", "valid", "validated", "partially_refunded"].includes(
        String(p.status).toLowerCase()
      )
  );
  const eligibleGatewayAttempt = refundSummary?.eligibleGatewayAttempts?.find(
    (a) => a.available > 0 && a.bankTranId && a.valId
  );

  // Settlement form — courier charge defaults to verified fee, never hardcoded 100
  const [collectedInput, setCollectedInput] = useState(
    String(fin.collectedCodAmount || fin.expectedCodAmount || 0)
  );
  const [settledInput, setSettledInput] = useState(String(fin.settledCodAmount || 0));
  const [chargeInput, setChargeInput] = useState(
    String(fin.courierCharge || order.shippingFee || 0)
  );
  const [settlementNote, setSettlementNote] = useState(order.settlementNote || "");

  const collectedNum = Number(collectedInput) || 0;
  const settledNum = Number(settledInput) || 0;
  const chargeNum = Number(chargeInput) || 0;
  const expectedRemittance = Math.max(0, collectedNum - chargeNum);
  const settlementDifference = Math.round((settledNum - expectedRemittance) * 100) / 100;
  const settlementInvalid =
    collectedNum < 0 ||
    settledNum < 0 ||
    chargeNum < 0 ||
    settledNum > collectedNum + 0.01;
  const settlementNeedsNote =
    Math.abs(settlementDifference) > 0.01 && settlementNote.trim().length < 3;

  // Manual offline payment form (only allowed when outstanding > 0)
  const [payFormOpen, setPayFormOpen] = useState<"advance" | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("bkash");
  const [payRef, setPayRef] = useState("");
  const [payNote, setPayNote] = useState("");

  const runTransition = async (status: string, reason?: string) => {
    setActionBusy(true);
    try {
      await onStatusTransition(status, reason);
    } finally {
      setActionBusy(false);
    }
  };

  // WhatsApp chat link with dynamic status template and financial accuracy
  const custPhone = order.customer.phone || "";
  const wcLikeOrder: Partial<WCOrder> = {
    id: order.orderNumber,
    number: order.orderNumber,
    status: order.orderStatus,
    payment_status: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    total: String(order.total || 0),
    paidAmount: order.paymentStatus === "paid" ? order.total : 0,
    courier: order.courier,
    trackingCode: order.trackingCode,
    consignmentId: order.consignmentId,
    billing: {
      first_name: order.customer.fullName,
      phone: order.customer.phone,
      address_1: order.customer.address,
      city: order.customer.city,
    },
    line_items: (order.items || []).map((li: { name: string; quantity: number }) => ({
      name: li.name,
      quantity: li.quantity,
    })),
  };
  const waMessage = generateWhatsAppMessage(wcLikeOrder);
  const waUrl = buildWhatsAppUrl(custPhone, waMessage);

  // Stepper calculations — 6-step business lifecycle
  const steps = [
    { key: "placed", label: "Placed", sub: formatDateTime(order.createdAt) },
    { key: "confirmed", label: "Confirmed", sub: order.orderStatus !== "pending" ? "Verified" : "—" },
    {
      key: "processing",
      label: "Processing",
      sub: ["processing", "ready_to_ship", "shipped", "delivered", "completed"].includes(order.orderStatus)
        ? "Preparing order"
        : "—",
    },
    {
      key: "ready_to_ship",
      label: "Ready to Ship",
      sub: ["ready_to_ship", "shipped", "delivered", "completed"].includes(order.orderStatus)
        ? "Packed & ready"
        : "—",
    },
    {
      key: "shipped",
      label: "Shipped",
      sub: ["shipped", "delivered", "completed"].includes(order.orderStatus) ? "In transit" : "—",
    },
    {
      key: "delivered",
      label: "Delivered",
      sub: ["delivered", "completed"].includes(order.orderStatus) ? "Delivered" : "—",
    },
  ];

  const getStepStatus = (key: string) => {
    const status = order.orderStatus;
    const statusRanks: Record<string, number> = {
      pending: 1,
      on_hold: 1,
      failed: 1,
      confirmed: 2,
      processing: 3,
      ready_to_ship: 4,
      shipped: 5,
      delivered: 6,
      completed: 6,
      cancelled: 0,
      returned: 0,
    };
    const stepRanks: Record<string, number> = {
      placed: 1,
      confirmed: 2,
      processing: 3,
      ready_to_ship: 4,
      shipped: 5,
      delivered: 6,
    };
    const currentRank = statusRanks[status] || 1;
    const thisStepRank = stepRanks[key] || 1;
    if (thisStepRank < currentRank) return "completed";
    if (thisStepRank === currentRank) return "active";
    return "pending";
  };

  const getProgressPercent = () => {
    const status = order.orderStatus;
    if (status === "pending") return 10;
    if (status === "confirmed") return 28;
    if (status === "processing") return 46;
    if (status === "ready_to_ship") return 65;
    if (status === "shipped") return 84;
    if (status === "delivered" || status === "completed") return 100;
    return 10;
  };

  const renderCancellationModal = () => (
    <>
      {order.cancellationRequest?.status === "requested" && (
        <div className="fixed bottom-4 left-4 right-4 z-[240] mx-auto max-w-2xl rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-2xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 text-[12px] text-amber-950">
              <p className="font-bold">Customer cancellation request</p>
              <p className="mt-1">{order.cancellationRequest.reason || "No reason supplied."}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" disabled={cancellationReviewBusy} onClick={() => void reviewCustomerCancellation("approve")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50">Approve & refund</button>
              <button type="button" disabled={cancellationReviewBusy} onClick={() => void reviewCustomerCancellation("reject")} className="rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50">Reject</button>
            </div>
          </div>
          <input value={cancellationReviewNote} onChange={(event) => setCancellationReviewNote(event.target.value)} placeholder="Rejection note (required for Reject)" className="mt-3 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-[11px] text-gray-800 outline-none" />
        </div>
      )}
      <OrderCancellationModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        orderNumber={order.orderNumber}
        orderStatus={order.orderStatus}
        customerName={order.customer?.fullName}
        orderTotal={Number(order.total || 0)}
        items={order.items}
        paymentMethod={order.paymentMethod || "cod"}
        paymentStatus={order.paymentStatus || "pending"}
        advancePaidAmount={Number(fin.advancePaidAmount || 0)}
        isPrepaidVerified={Boolean(fin.isPrepaidVerified)}
        refundSummary={refundSummary}
        courierProvider={order.courier || activeShipment?.provider}
        courierStatus={activeShipment?.status || order.shipmentStatus}
        consignmentId={activeShipment?.consignmentId || order.consignmentId}
        hasActiveShipment={Boolean(
          activeShipment &&
            !["cancelled", "failed", "returned"].includes(String(activeShipment.status)) &&
            (activeShipment.consignmentId || order.consignmentId)
        )}
        isShipmentInTransit={Boolean(
          activeShipment &&
            ["in_transit", "out_for_delivery", "picked_up"].includes(String(activeShipment.status))
        )}
        onConfirmCancel={handleConfirmOrderCancellation}
      />

      {cancellationDetailsOpen && order.cancellationDetails && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <h3 className="text-[14px] font-bold text-gray-900">
                Cancellation Details · #{order.orderNumber}
              </h3>
              <button
                type="button"
                onClick={() => setCancellationDetailsOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-stone-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-gray-500">Cancelled By</span>
                <span className="font-semibold text-gray-900">{order.cancellationDetails.cancelledBy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cancelled At</span>
                <span className="font-semibold text-gray-900">
                  {formatDateTime(order.cancellationDetails.cancelledAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Decision</span>
                <span className="font-semibold text-gray-900">
                  {order.cancellationDetails.decision === "cancel_and_refund"
                    ? "Cancel & Request Refund"
                    : "Cancel Order Only"}
                </span>
              </div>
              {order.cancellationDetails.refundId && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Linked Refund</span>
                  <span className="font-mono text-gray-900">
                    {order.cancellationDetails.refundId} ({order.cancellationDetails.refundOutcome || "pending"})
                  </span>
                </div>
              )}
              {order.cancellationDetails.courierDisposition && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Courier Disposition</span>
                  <span className="font-semibold text-gray-900">
                    {order.cancellationDetails.courierDisposition.replace(/_/g, " ")}
                  </span>
                </div>
              )}
              <div className="rounded-xl bg-stone-50 border border-stone-200 p-2.5">
                <p className="text-[10.5px] font-bold uppercase text-gray-400">Reason</p>
                <p className="text-gray-800 mt-0.5">{order.cancellationDetails.reason}</p>
                {order.cancellationDetails.adminNote && (
                  <>
                    <p className="text-[10.5px] font-bold uppercase text-gray-400 mt-2">Admin Note</p>
                    <p className="text-gray-700 mt-0.5">{order.cancellationDetails.adminNote}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const renderLifecycleBadgesStrip = () => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-2xl border border-stone-200/90 bg-white p-3 shadow-xs">
      {/* 1. Order Status */}
      <div className="flex flex-col gap-1 p-2 rounded-xl bg-stone-50/70 border border-stone-100">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
          Order Status
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize w-fit ${getOrderStatusBadge(
            order.orderStatus
          )}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {ORDER_STATUS_LABELS[order.orderStatus] || order.orderStatus}
        </span>
      </div>

      {/* 2. Payment Status */}
      <div className="flex flex-col gap-1 p-2 rounded-xl bg-stone-50/70 border border-stone-100">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
          Payment ({order.paymentMethod === "cod" ? "COD" : "Online"})
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize w-fit ${getPaymentStatusBadge(
            order.paymentStatus
          )}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
        </span>
      </div>

      {/* 3. Shipment Status */}
      <div className="flex flex-col gap-1 p-2 rounded-xl bg-stone-50/70 border border-stone-100">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
          Shipment {order.courier ? `(${getCourierLabel(order.courier)})` : ""}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize w-fit ${
            isMockConsignment
              ? "bg-amber-50 text-amber-800 border-amber-200"
              : getShipmentStatusBadge(
                  effectiveShipmentStatus,
                  order.shipmentBookingState
                )
          }`}
        >
          <Truck className="h-3 w-3" />
          {isMockConsignment
            ? "Booked [TEST]"
            : hasConsignment
            ? SHIPMENT_STATUS_LABELS[effectiveShipmentStatus] || "Booked"
            : order.shipmentBookingState === "booking_in_progress"
            ? "Booking in Progress"
            : "Not Booked"}
        </span>
      </div>

      {/* 4. Courier Settlement Status */}
      <div className="flex flex-col gap-1 p-2 rounded-xl bg-stone-50/70 border border-stone-100">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
          COD Settlement
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold capitalize w-fit ${settlementBadgeClass(
            fin.expectedCodAmount === 0 ? "none" : fin.codSettlementStatus
          )}`}
        >
          <Banknote className="h-3 w-3" />
          {fin.expectedCodAmount === 0
            ? "Not Applicable"
            : COURIER_SETTLEMENT_LABELS[fin.codSettlementStatus] || fin.codSettlementStatus}
        </span>
      </div>
    </div>
  );

  const renderUpdateStatusModal = () => {
    if (!updateStatusModalOpen) return null;

    const forwardStatuses = allowed.filter((s) => s !== "cancelled");

    const isExceptional =
      targetStatusToUpdate === "returned" ||
      targetStatusToUpdate === "refunded";

    const reasonRequired = isExceptional;
    const canSubmit = !actionBusy && (!reasonRequired || updateStatusReason.trim().length >= 3);

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
              <h3 className="text-[14px] font-bold text-gray-900">Update Order Status</h3>
            </div>
            <button
              type="button"
              onClick={() => setUpdateStatusModalOpen(false)}
              className="rounded-lg p-1 text-gray-400 hover:bg-stone-100 hover:text-gray-600 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1 text-[12px]">
            <p className="text-gray-500">
              Order: <strong className="font-mono text-gray-900">#{order.orderNumber}</strong> · Current:{" "}
              <strong className="capitalize text-gray-900">
                {ORDER_STATUS_LABELS[order.orderStatus] || order.orderStatus}
              </strong>
            </p>
            <p className="text-[11px] text-gray-400">
              Only valid state machine transitions are permitted. Exceptional changes require a mandatory admin reason for audit logging.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11.5px] font-bold text-gray-700">Select Target Status</label>
            {forwardStatuses.length === 0 ? (
              <p className="text-[12px] text-gray-500 rounded-lg bg-stone-50 p-3 border border-stone-200">
                No further forward status transitions available from &ldquo;{order.orderStatus}&rdquo;.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {forwardStatuses.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setTargetStatusToUpdate(st)}
                    className={`flex items-center justify-between rounded-xl border p-2.5 text-left text-[12px] font-semibold transition cursor-pointer ${
                      targetStatusToUpdate === st
                        ? "border-purple-600 bg-purple-50/70 text-purple-900 ring-2 ring-purple-100"
                        : "border-stone-200 bg-white text-gray-700 hover:bg-stone-50"
                    }`}
                  >
                    <span className="capitalize">{ORDER_STATUS_LABELS[st] || st.replace(/_/g, " ")}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${getOrderStatusBadge(
                        st
                      )}`}
                    >
                      {st}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[11.5px] font-bold text-gray-700">
              Admin Reason {reasonRequired ? <span className="text-rose-500">* (Mandatory)</span> : <span className="text-gray-400 font-normal">(Optional note)</span>}
            </label>
            <textarea
              rows={2}
              value={updateStatusReason}
              onChange={(e) => setUpdateStatusReason(e.target.value)}
              placeholder={
                reasonRequired
                  ? "Explain why this exceptional status change is being applied..."
                  : "Internal audit note..."
              }
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-purple-500 resize-none"
            />
            {reasonRequired && updateStatusReason.trim().length < 3 && (
              <p className="text-[10.5px] text-rose-600">
                Minimum 3 characters required for audit trail.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-3">
            <button
              type="button"
              onClick={() => setUpdateStatusModalOpen(false)}
              className="rounded-xl border border-stone-200 px-3.5 py-2 text-[12px] font-semibold text-gray-600 hover:bg-stone-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSubmit || allowed.length === 0}
              onClick={async () => {
                setUpdateStatusModalOpen(false);
                await runTransition(targetStatusToUpdate, updateStatusReason.trim() || undefined);
              }}
              className="rounded-xl bg-purple-600 px-4 py-2 text-[12px] font-bold text-white shadow-xs hover:bg-purple-700 disabled:opacity-40 cursor-pointer transition"
            >
              Confirm Status Transition
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderReopenModal = () => {
    if (!reopenModalOpen) return null;

    const isEligible = order.reopenEligibility?.eligible !== false;
    const canSubmit = !reopenBusy && !actionBusy && isEligible && reopenReason.trim().length >= 3;

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-emerald-600" />
              <h3 className="text-[14px] font-bold text-gray-900">Reopen Cancelled Order</h3>
            </div>
            <button
              type="button"
              onClick={() => setReopenModalOpen(false)}
              className="rounded-lg p-1 text-gray-400 hover:bg-stone-100 hover:text-gray-600 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1 text-[12px]">
            <p className="text-gray-600">
              Recovering order <strong className="font-mono text-gray-900">#{order.orderNumber}</strong> from cancelled state.
            </p>
            <p className="text-[11px] text-gray-500">
              Previous cancellation records and status history will be fully preserved in the audit log.
            </p>
          </div>

          {/* Pre-conditions Verification Checklist */}
          <div className="space-y-2 rounded-xl bg-stone-50 border border-stone-200/80 p-3 text-[11.5px]">
            <p className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">
              Pre-Flight Safety Verifications
            </p>

            {/* Check 1: Courier consignment */}
            <div className="flex items-start gap-2">
              {!activeShipment ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold text-gray-900">Courier Consignment Check</p>
                <p className="text-gray-600 text-[11px]">
                  {!activeShipment
                    ? "Verified: No active courier consignment exists."
                    : `Active shipment detected (${activeShipment.status}). Courier cancellation must be verified first.`}
                </p>
              </div>
            </div>

            {/* Check 2: Stock re-reservation */}
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Inventory Re-reservation</p>
                <p className="text-gray-600 text-[11px]">
                  Stock for all ordered items will be atomically verified & re-reserved upon reopening.
                </p>
              </div>
            </div>

            {/* Check 3: Payment integrity */}
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Payment & Restoration Target</p>
                <p className="text-gray-600 text-[11px]">
                  {order.reopenEligibility?.summary ||
                    (order.paymentMethod === "cod"
                      ? "COD order will be restored to Pending with collectible balance."
                      : "Online order will be restored to Pending and payment kept as Pending.")}
                </p>
              </div>
            </div>

            {/* Check 4: Non-automatic courier/payment check */}
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Financial Safety Guarantee</p>
                <p className="text-gray-600 text-[11px]">
                  Reopening will never automatically book a courier or execute a charge.
                </p>
              </div>
            </div>
          </div>

          {order.reopenEligibility?.eligible === false && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{order.reopenEligibility.reason}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11.5px] font-bold text-gray-700">
              Admin Reason <span className="text-rose-500">* (Mandatory for audit trail)</span>
            </label>
            <textarea
              rows={3}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="State customer authorization or operational reason for reopening this order..."
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-emerald-500 resize-none"
            />
            {reopenReason.trim().length < 3 && (
              <p className="text-[10.5px] text-rose-600">
                Minimum 3 characters required.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-3">
            <button
              type="button"
              disabled={reopenBusy}
              onClick={() => setReopenModalOpen(false)}
              className="rounded-xl border border-stone-200 px-3.5 py-2 text-[12px] font-semibold text-gray-600 hover:bg-stone-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSubmit || !onReopenOrder}
              onClick={async () => {
                if (!onReopenOrder) return;
                setReopenBusy(true);
                try {
                  const ok = await onReopenOrder(reopenReason.trim());
                  if (ok) {
                    setReopenModalOpen(false);
                  }
                } finally {
                  setReopenBusy(false);
                }
              }}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-[12.5px] font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-40 cursor-pointer transition flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Confirm Reopen Order</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderRefundModal = () => {
    if (!refundModalOpen) return null;

    const isGatewayMode = Boolean(eligibleGatewayAttempt && onInitiateGatewayRefund);
    const amt = Number(refundAmountInput);
    const validAmount = !isNaN(amt) && amt > 0 && amt <= maxRefundable + 0.01;
    const validReason = refundNoteInput.trim().length >= 3;
    const validRef = isGatewayMode || refundRefInput.trim().length >= 2;
    const canSubmit = validAmount && validReason && validRef && !refundSubmitting;

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-rose-600" />
              <div>
                <h3 className="text-[14px] font-bold text-gray-900">
                  {isGatewayMode ? "Request SSLCOMMERZ Refund" : "Record Manual Offline Refund"}
                </h3>
                <p className="text-[11px] text-gray-500">Order #{order.orderNumber}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRefundModalOpen(false)}
              className="rounded-lg p-1 text-gray-400 hover:bg-stone-100 hover:text-gray-600 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Refund Financial Guardrails */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl bg-slate-50 p-3 text-[11.5px]">
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Captured</p>
              <p className="font-bold text-gray-900">{formatBDT(capturedAmount)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Refunded</p>
              <p className="font-bold text-rose-700">{formatBDT(refundedAmount)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Pending</p>
              <p className="font-bold text-amber-700">{formatBDT(pendingRefundAmount)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Available</p>
              <p className="font-bold text-emerald-700">{formatBDT(maxRefundable)}</p>
            </div>
          </div>

          <div className="space-y-3 text-[12px]">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Refund Amount (BDT) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400 font-bold">৳</span>
                <input
                  type="number"
                  min={1}
                  max={maxRefundable}
                  value={refundAmountInput}
                  onChange={(e) => setRefundAmountInput(e.target.value)}
                  placeholder={`Max: ${maxRefundable}`}
                  className="w-full rounded-xl border border-stone-200 bg-white py-1.5 pl-8 pr-3 text-[12px] outline-none focus:border-rose-500"
                />
              </div>
              {amt > maxRefundable + 0.01 && (
                <p className="text-[10.5px] text-rose-600 mt-1 font-medium">
                  Amount exceeds maximum refundable balance ({formatBDT(maxRefundable)}).
                </p>
              )}
            </div>

            {!isGatewayMode && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Refund Method <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={refundMethodInput}
                    onChange={(e) => setRefundMethodInput(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-rose-500"
                  >
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Reference / TXN ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={refundRefInput}
                    onChange={(e) => setRefundRefInput(e.target.value)}
                    placeholder="e.g. TRX9A82B..."
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-[12px] outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Refund Date
                  </label>
                  <input
                    type="date"
                    value={refundDateInput}
                    onChange={(e) => setRefundDateInput(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Refund Reason / Audit Note <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={refundNoteInput}
                onChange={(e) => setRefundNoteInput(e.target.value)}
                placeholder="Document the customer request or verification reason..."
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-[12px] outline-none focus:border-rose-500 resize-none"
              />
              {refundNoteInput.trim().length > 0 && refundNoteInput.trim().length < 3 && (
                <p className="text-[10.5px] text-rose-600 mt-0.5">Minimum 3 characters required.</p>
              )}
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-[11px] text-amber-800">
              {isGatewayMode
                ? "ℹ️ Submits a real refund request to SSLCOMMERZ. Order remains active unless separately cancelled."
                : "ℹ️ Records an authorized manual offline refund in PaymentRefund without altering captured payment history."}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-3">
            <button
              type="button"
              disabled={refundSubmitting}
              onClick={() => setRefundModalOpen(false)}
              className="rounded-xl border border-stone-200 px-3.5 py-2 text-[12px] font-semibold text-gray-600 hover:bg-stone-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={async () => {
                setRefundSubmitting(true);
                try {
                  let ok = false;
                  if (isGatewayMode && eligibleGatewayAttempt && onInitiateGatewayRefund) {
                    ok = await onInitiateGatewayRefund(
                      eligibleGatewayAttempt.attemptId,
                      amt,
                      refundNoteInput.trim()
                    );
                  } else {
                    ok = await onRecordPayment({
                      action: "refund",
                      amount: amt,
                      refundMethod: refundMethodInput,
                      externalReference: refundRefInput.trim(),
                      refundDate: refundDateInput,
                      reason: refundNoteInput.trim(),
                    });
                  }
                  if (ok) {
                    setRefundModalOpen(false);
                    setRefundAmountInput("");
                    setRefundRefInput("");
                    setRefundNoteInput("");
                  }
                } finally {
                  setRefundSubmitting(false);
                }
              }}
              className="rounded-xl bg-rose-600 px-4 py-2 text-[12.5px] font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-40 cursor-pointer transition flex items-center gap-1.5"
            >
              {refundSubmitting ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              <span>{isGatewayMode ? "Submit SSLCOMMERZ Refund" : "Submit Refund"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderOrderProgressStepper = () => (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-purple-600" />
        <h3 className="text-[13px] font-bold text-gray-900">Order Progress</h3>
      </div>

      <div className="overflow-x-auto pb-2 -mx-2 px-2">
        <div className="min-w-[440px] relative flex items-center justify-between px-3">
          <div className="absolute left-6 right-6 top-3 h-0.5 bg-gray-200 -z-0" />
          <div
            className="absolute left-6 top-3 h-0.5 bg-purple-600 transition-all duration-300 -z-0"
            style={{ width: `${getProgressPercent()}%` }}
          />

          {steps.map((st) => {
            const state = getStepStatus(st.key);
            return (
              <div key={st.key} className="relative z-10 flex flex-col items-center text-center">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    state === "completed"
                      ? "bg-purple-600 text-white"
                      : state === "active"
                        ? "bg-purple-600 text-white ring-4 ring-purple-100"
                        : "border-2 border-gray-300 bg-white text-gray-400"
                  }`}
                >
                  {state === "completed" ? (
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  ) : state === "active" ? (
                    <span className="h-2 w-2 rounded-full bg-white" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                  )}
                </div>
                <p
                  className={`mt-2 text-[11.5px] font-bold whitespace-nowrap ${
                    state !== "pending" ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {st.label}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5 max-w-[84px] truncate">{st.sub}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderCustomerInfoCard = () => (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-4 space-y-3 shadow-xs">
      <h3 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-gray-500">
        <User className="h-3.5 w-3.5 text-purple-600" />
        Customer Information
      </h3>
      <div className="space-y-2 text-[12.5px]">
        <p className="font-bold text-gray-900">{order.customer.fullName}</p>
        <div className="flex items-center gap-2 text-gray-600">
          <Phone className="h-3.5 w-3.5 text-gray-400" />
          <span className="font-mono">{order.customer.phone}</span>
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#25D366] text-white hover:scale-110 transition shadow-2xs"
              title="Chat on WhatsApp"
              aria-label="Chat on WhatsApp"
            >
              <WhatsAppIcon className="h-2.5 w-2.5 fill-current" />
            </a>
          )}
        </div>
        <div className="flex items-start gap-2 pt-0.5 text-gray-700">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-500" />
          <span>
            {order.customer.address}, {order.customer.city}
            {order.customer.district &&
            order.customer.district.toLowerCase() !== order.customer.city.toLowerCase()
              ? `, ${order.customer.district}`
              : ""}
          </span>
        </div>
      </div>
    </div>
  );

  const renderPricingBreakdownCard = () => (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-4 space-y-3 shadow-xs">
      <h3 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-gray-500">
        <ShoppingCart className="h-3.5 w-3.5 text-purple-600" />
        Pricing Breakdown
      </h3>
      <div className="space-y-2 text-[12.5px]">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span className="tabular-nums font-semibold">{formatBDT(order.subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Delivery Charge</span>
          <span className="tabular-nums font-semibold">{formatBDT(order.shippingFee)}</span>
        </div>
        <div className="flex justify-between border-t border-stone-100 pt-2 text-[14px] font-bold text-gray-900">
          <span>Total Amount</span>
          <span className="tabular-nums">{formatBDT(fin.orderTotal)}</span>
        </div>
      </div>
    </div>
  );

  const renderProductsListCard = () => (
    <div className="rounded-2xl border border-stone-200/90 bg-white overflow-hidden shadow-xs">
      <div className="border-b border-stone-200/80 bg-stone-50/70 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
        Products ({order.items.length})
      </div>
      <div className="divide-y divide-stone-200/60">
        {order.items.map((item, i) => (
          <div key={`${item.productId}-${i}`} className="flex items-center justify-between gap-3 px-4 py-3 text-[12.5px]">
            <div className="flex items-center gap-3 min-w-0">
              <ProductThumbnail
                src={item.image}
                alt={item.name}
                size={40}
                className="h-10 w-10"
                iconClassName="h-4 w-4"
              />
              <div className="min-w-0">
                <p className="font-bold text-gray-900 truncate">{item.name}</p>
                <p className="text-[11px] text-gray-500">
                  Qty: {item.quantity}
                  {item.size ? ` · Size: ${item.size}` : ""}
                  {item.color ? ` · Color: ${item.color}` : ""}
                </p>
              </div>
            </div>
            <span className="font-bold tabular-nums text-gray-900">
              {formatBDT(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPaymentManagementCard = () => (
    <div className="space-y-4">
      {/* Financial Health Summary Banner */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
          <h3 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-gray-500">
            <CreditCard className="h-3.5 w-3.5 text-purple-600" />
            Payment Summary
          </h3>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold uppercase ${getPaymentStatusBadge(
              order.paymentStatus
            )}`}
          >
            {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-[12px]">
          <div className="rounded-xl bg-stone-50 p-2.5 border border-stone-100">
            <p className="text-[10px] uppercase font-bold text-gray-400">Order Total</p>
            <p className="font-bold text-gray-900 mt-0.5">{formatBDT(order.total)}</p>
          </div>
          <div className="rounded-xl bg-emerald-50/70 p-2.5 border border-emerald-100">
            <p className="text-[10px] uppercase font-bold text-emerald-700">Captured / Paid</p>
            <p className="font-bold text-emerald-800 mt-0.5">{formatBDT(capturedAmount)}</p>
          </div>
          <div className="rounded-xl bg-purple-50/70 p-2.5 border border-purple-100">
            <p className="text-[10px] uppercase font-bold text-purple-700">Outstanding (COD)</p>
            <p className="font-bold text-purple-800 mt-0.5">{formatBDT(fin.outstandingAmount)}</p>
          </div>
          <div className="rounded-xl bg-amber-50/70 p-2.5 border border-amber-100">
            <p className="text-[10px] uppercase font-bold text-amber-700">Pending Refunds</p>
            <p className="font-bold text-amber-800 mt-0.5">{formatBDT(pendingRefundAmount)}</p>
          </div>
          <div className="rounded-xl bg-rose-50/70 p-2.5 border border-rose-100">
            <p className="text-[10px] uppercase font-bold text-rose-700">Total Refunded</p>
            <p className="font-bold text-rose-800 mt-0.5">{formatBDT(refundedAmount)}</p>
          </div>
        </div>
      </div>

      {/* Payment Actions & Transactions Card */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-gray-500">
            <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
            Payment Gateways & Ledger
          </h3>
          <div className="flex flex-wrap items-center gap-1.5">
            {order.paymentMethod === "sslcommerz" && order.paymentStatus !== "paid" && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onReconcileSslcommerz(order.orderNumber)}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 cursor-pointer"
                >
                  <ShieldCheck className="h-3 w-3" />
                  Verify SSLCOMMERZ
                </button>
                {onCodFallback && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={onCodFallback}
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100 cursor-pointer"
                    title="Allow COD fallback with customer agreement"
                  >
                    <Banknote className="h-3 w-3 text-amber-700" />
                    Switch to COD
                  </button>
                )}
              </>
            )}

            {/* Offline manual payment only visible when balance is outstanding */}
            {fin.outstandingAmount > 0 && (
              <button
                type="button"
                onClick={() => setPayFormOpen((v) => (v === "advance" ? null : "advance"))}
                className="rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-100 cursor-pointer"
              >
                + Record Offline Payment
              </button>
            )}

            {/* Unified Request Refund button (gateway or offline) when balance > 0 */}
            {capturedAmount > 0 && (
              <>
                <button
                  type="button"
                  disabled={maxRefundable <= 0}
                  onClick={() => {
                    setRefundAmountInput(String(maxRefundable));
                    setRefundRefInput("");
                    setRefundNoteInput("");
                    setRefundModalOpen(true);
                  }}
                  title={
                    maxRefundable > 0
                      ? `Available refundable balance: ${formatBDT(maxRefundable)}`
                      : "No refundable balance remains on this order."
                  }
                  className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Request Refund
                </button>
                {gatewayPayment && (
                  <Link
                    href={`/admin/payments/${gatewayPayment.id}`}
                    className="rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-100"
                    title="View gateway transaction details"
                  >
                    Gateway Txn →
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        {payFormOpen === "advance" && fin.outstandingAmount > 0 && (
          <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-3 space-y-2">
            <p className="text-[11.5px] font-bold text-purple-900">
              Record Offline / Advance Payment (Outstanding: {formatBDT(fin.outstandingAmount)})
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={1}
                max={fin.outstandingAmount}
                placeholder="Amount (BDT)"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[12px]"
              />
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[12px]"
              >
                <option value="bkash">bKash Manual / Agent</option>
                <option value="nagad">Nagad Manual</option>
                <option value="bank">Bank Transfer</option>
                <option value="cash">Cash Handover</option>
              </select>
              <input
                type="text"
                placeholder="Reference / TXN ID"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[12px]"
              />
              <input
                type="text"
                placeholder="Note / Verification details"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[12px]"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!Number(payAmount) || Number(payAmount) <= 0}
                onClick={async () => {
                  const ok = await onRecordPayment({
                    action: "advance",
                    amount: Number(payAmount),
                    method: payMethod,
                    reference: payRef,
                    note: payNote,
                  });
                  if (ok) {
                    setPayFormOpen(null);
                    setPayAmount("");
                    setPayRef("");
                    setPayNote("");
                  }
                }}
                className="rounded-lg bg-purple-600 px-3 py-1.5 text-[11.5px] font-bold text-white disabled:opacity-50 cursor-pointer"
              >
                Save Payment Receipt
              </button>
              <button
                type="button"
                onClick={() => setPayFormOpen(null)}
                className="rounded-lg bg-white px-3 py-1.5 text-[11.5px] font-medium text-gray-600 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {payments.length === 0 ? (
          <p className="text-[12px] text-gray-400 py-2">
            No payment gateway attempts recorded yet.
          </p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {payments.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-[11.5px] space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold uppercase text-slate-800">
                    {p.provider} {p.cardType ? `· ${p.cardType}` : ""}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                    {p.status} · {formatBDT(p.amount)}
                  </span>
                </div>
                <p className="font-mono text-[10.5px] text-slate-500">
                  TXN: {p.tranId}
                  {p.valId ? ` · VAL: ${p.valId}` : ""}
                  {p.bankTranId ? ` · GW: ${p.bankTranId}` : ""}
                </p>
                <p className="text-[10.5px] text-slate-500">
                  Validated: {formatDateTime(p.validatedAt || p.paidAt)}
                  {p.refundedAmount ? ` · Refunded: ${formatBDT(p.refundedAmount)} (${p.refundRefId || "no ref"})` : ""}
                </p>
                {p.note && <p className="text-slate-600">{p.note}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Refund History Card */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-gray-500">
            <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
            Refund History ({refunds.length})
          </h3>
          {refundSummary?.hasReconciliationPending && (
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              Reconciliation Pending
            </span>
          )}
        </div>

        {refunds.length === 0 ? (
          <p className="text-[12px] text-gray-400 py-1">No refunds requested or recorded for this order.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {refunds.map((r) => {
              const isPendingSync =
                r.refundChannel !== "manual_offline" &&
                (r.status === "initiated" || r.status === "processing") &&
                Boolean(r.refundRefId);
              const badgeCls =
                r.status === "succeeded"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : r.status === "failed"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-amber-200 bg-amber-50 text-amber-800";
              return (
                <div
                  key={r.id}
                  className="rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-[11.5px] space-y-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gray-900">{r.refundId}</span>
                      <span className="rounded-md border border-stone-200 bg-white px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-gray-600">
                        {r.refundChannel === "manual_offline"
                          ? `Offline (${r.refundMethod || "manual"})`
                          : "SSLCOMMERZ"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{formatBDT(r.amount)}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${badgeCls}`}>
                        {r.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-700">{r.reason}</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-gray-500">
                    <span>
                      Requested by {r.requestedBy} · {formatDateTime(r.initiatedAt)}
                      {r.refundRefId ? ` · Ref: ${r.refundRefId}` : ""}
                      {r.externalReference ? ` · Ext: ${r.externalReference}` : ""}
                    </span>
                    {isPendingSync && onSyncRefund && (
                      <button
                        type="button"
                        disabled={syncingRefundId === r.refundId || busy}
                        onClick={async () => {
                          setSyncingRefundId(r.refundId);
                          try {
                            await onSyncRefund(r.refundId);
                          } finally {
                            setSyncingRefundId(null);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10.5px] font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-40 cursor-pointer"
                      >
                        <RefreshCw
                          className={`h-3 w-3 ${syncingRefundId === r.refundId ? "animate-spin" : ""}`}
                        />
                        Sync Status
                      </button>
                    )}
                  </div>

                  {r.reconciliationRequired && (
                    <p className="text-[10.5px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                      ⚠️ Timeout during gateway submission — reconciliation required before retrying.
                    </p>
                  )}
                  {r.failureReason && (
                    <p className="text-[10.5px] text-rose-700">Failure: {r.failureReason}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderShipmentCard = () => (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-4 space-y-3 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Truck className="h-3.5 w-3.5 text-purple-600" />
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-gray-500">
            Consignment & Dispatch History
          </h3>
          {isMockConsignment && (
            <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[9.5px] font-extrabold uppercase text-amber-800">
              TEST / SIMULATED
            </span>
          )}
        </div>
      </div>

      {shipments.length === 0 ? (
        <p className="text-[12px] text-gray-400 py-2">
          No courier consignments created yet for this order.
        </p>
      ) : (
        <div className="space-y-2.5">
          {shipments.map((s) => {
            const trackUrl = getCourierTrackingUrl(s.provider, s.trackingCode, s.consignmentId);
            const isMockShipment = Boolean(
              s.isMock ||
              s.mode === "mock" ||
              s.consignmentId?.startsWith("MOCK-")
            );
            return (
              <div
                key={s.id}
                className="rounded-xl border border-stone-200 bg-stone-50/50 p-3 space-y-2 text-[12px]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CourierLogo provider={s.provider} size="sm" className="shadow-2xs" />
                    <span className="font-bold text-gray-900">{getCourierLabel(s.provider)}</span>
                    {isMockShipment && (
                      <span className="rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-amber-800">
                        SIMULATED
                      </span>
                    )}
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                      {s.status.replace(/_/g, " ")}
                    </span>
                    {s.consignmentId && (
                      <span className="font-mono text-[11px] text-gray-600">
                        CID: {s.consignmentId}
                      </span>
                    )}
                    {s.trackingCode && (
                      <span className="font-mono text-[11px] text-gray-600">
                        Tracking: {s.trackingCode}
                      </span>
                    )}
                  </div>
                  {String(s.status).toLowerCase() === "cancelled" && !isMockShipment && (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-800">
                      Steadfast has no API cancellation — confirm this parcel is cancelled in the
                      Steadfast portal.
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{formatBDT(s.codAmount)} COD</span>
                    {trackUrl && (
                      <a
                        href={trackUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Track
                      </a>
                    )}
                  </div>
                </div>
                <ShipmentActionButtons
                  shipment={s}
                  orderStub={orderStub}
                  busy={busy}
                  onRefreshShipment={onRefreshShipment}
                  onCancelShipment={onCancelShipment}
                />
                {(s.events?.length ?? 0) > 0 && (
                  <ul className="space-y-1 border-t border-stone-200/70 pt-2 text-[11px] text-slate-600">
                    {(s.events || []).slice(-5).map((ev, idx) => {
                      let displayNote = ev.note || "";
                      if (isMockShipment && displayNote.toLowerCase().includes("accepted by steadfast")) {
                        displayNote = "[SIMULATED] Mock development consignment created.";
                      }
                      return (
                        <li key={idx} className="flex justify-between gap-2">
                          <span className="capitalize">
                            {ev.status.replace(/_/g, " ")}
                            {displayNote ? ` — ${displayNote}` : ""}
                          </span>
                          <span className="text-slate-400 shrink-0">{formatDateTime(ev.at)}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* State-aware Return / Recall & Physical Receipt Inspection */}
      {["picked_up", "in_transit", "out_for_delivery"].includes(effectiveShipmentStatus) &&
        onRequestCourierReturn && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-2 text-[12px]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-amber-900">Parcel in transit — Return / Recall</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => setReturnFormOpen((v) => !v)}
                className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100 cursor-pointer"
              >
                Request Return / Recall
              </button>
            </div>
            {returnFormOpen && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  type="text"
                  value={returnReasonInput}
                  onChange={(e) => setReturnReasonInput(e.target.value)}
                  placeholder="Return / recall reason..."
                  className="flex-1 min-w-[180px] rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11.5px]"
                />
                <button
                  type="button"
                  disabled={busy || returnReasonInput.trim().length < 3}
                  onClick={async () => {
                    const ok = await onRequestCourierReturn(returnReasonInput.trim());
                    if (ok) {
                      setReturnFormOpen(false);
                      setReturnReasonInput("");
                    }
                  }}
                  className="rounded-lg bg-amber-700 px-3 py-1 text-[11px] font-bold text-white disabled:opacity-40 cursor-pointer"
                >
                  Confirm Return Request
                </button>
              </div>
            )}
          </div>
        )}

      {["return_initiated", "returned"].includes(effectiveShipmentStatus) &&
        !order.returnInspection?.physicalReceiptConfirmedAt &&
        onConfirmPhysicalReturn && (
          <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3 space-y-2 text-[12px]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-purple-900">
                Return in progress — Physical receipt & inspection required before restocking
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => setInspectionFormOpen((v) => !v)}
                className="rounded-lg border border-purple-300 bg-white px-2.5 py-1 text-[11px] font-bold text-purple-800 hover:bg-purple-100 cursor-pointer"
              >
                Confirm Physical Return
              </button>
            </div>
            {inspectionFormOpen && (
              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap gap-2">
                  <select
                    value={inspectionOutcomeInput}
                    onChange={(e) =>
                      setInspectionOutcomeInput(
                        e.target.value === "damaged" ? "damaged" : "restockable"
                      )
                    }
                    className="rounded-lg border border-purple-200 bg-white px-2.5 py-1 text-[11.5px]"
                  >
                    <option value="restockable">Restockable (restore inventory)</option>
                    <option value="damaged">Damaged / Unsellable (do not restock)</option>
                  </select>
                  <input
                    type="text"
                    value={inspectionNoteInput}
                    onChange={(e) => setInspectionNoteInput(e.target.value)}
                    placeholder="Inspection note (optional)..."
                    className="flex-1 min-w-[160px] rounded-lg border border-purple-200 bg-white px-2.5 py-1 text-[11.5px]"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      const ok = await onConfirmPhysicalReturn(
                        inspectionOutcomeInput,
                        inspectionNoteInput.trim() || undefined
                      );
                      if (ok) {
                        setInspectionFormOpen(false);
                        setInspectionNoteInput("");
                      }
                    }}
                    className="rounded-lg bg-purple-600 px-3 py-1 text-[11px] font-bold text-white disabled:opacity-40 cursor-pointer"
                  >
                    Save Inspection
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      {order.returnInspection?.physicalReceiptConfirmedAt && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 text-[11.5px] text-emerald-900">
          Physical return confirmed ({order.returnInspection.inspectionOutcome}) by{" "}
          {order.returnInspection.physicalReceiptConfirmedBy} ·{" "}
          {formatDateTime(order.returnInspection.physicalReceiptConfirmedAt)}
          {order.returnInspection.inspectionNote
            ? ` · Note: ${order.returnInspection.inspectionNote}`
            : ""}
        </div>
      )}
    </div>
  );

  const renderCodSettlementCard = () => (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-4 space-y-3 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-gray-500">
          <Banknote className="h-3.5 w-3.5 text-purple-600" />
          Courier COD Settlement
        </h3>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${settlementBadgeClass(
            fin.expectedCodAmount === 0 ? "none" : fin.codSettlementStatus
          )}`}
        >
          {fin.expectedCodAmount === 0 ? "Not Applicable" : fin.codSettlementStatus}
        </span>
      </div>

      {fin.expectedCodAmount === 0 ? (
        /* Clean Notice for 100% Online Paid Orders */
        <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-stone-800 font-bold text-[12.5px]">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Not applicable — customer paid online</span>
          </div>
          <p className="text-[12px] text-stone-600">
            This order was paid online in full ({formatBDT(order.paidAmount || order.total)}). No cash collection or remittance is expected from the courier partner.
          </p>
        </div>
      ) : (
        /* Actual COD Settlement Panel */
        <>
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-[11.5px]">
            <div>
              <p className="text-[10px] uppercase text-slate-400">Expected COD</p>
              <p className="font-bold text-slate-900">{formatBDT(fin.expectedCodAmount)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400">Collected</p>
              <p className="font-bold text-blue-700">{formatBDT(fin.collectedCodAmount)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400">Settled to Bank</p>
              <p className="font-bold text-emerald-700">{formatBDT(fin.settledCodAmount)}</p>
            </div>
          </div>

          <div className="space-y-2.5 rounded-xl border border-stone-200 p-3 text-[12px]">
            <p className="text-[11.5px] font-bold text-gray-700">Update Settlement Details</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10.5px] text-gray-500">Courier Collected (৳)</label>
                <input
                  type="number"
                  min={0}
                  value={collectedInput}
                  onChange={(e) => setCollectedInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1 text-[12px]"
                />
              </div>
              <div>
                <label className="text-[10.5px] text-gray-500">Bank Settled (৳)</label>
                <input
                  type="number"
                  min={0}
                  value={settledInput}
                  onChange={(e) => setSettledInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1 text-[12px]"
                />
              </div>
              <div>
                <label className="text-[10.5px] text-gray-500">Courier Fee (৳)</label>
                <input
                  type="number"
                  min={0}
                  value={chargeInput}
                  onChange={(e) => setChargeInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1 text-[12px]"
                />
              </div>
            </div>

            <div className="space-y-1 rounded-lg bg-stone-50 p-2 text-[11px] text-gray-600">
              <div className="flex items-center justify-between">
                <span>Expected net remittance</span>
                <strong className="font-mono text-gray-900">{formatBDT(expectedRemittance)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Bank settled</span>
                <strong className="font-mono text-gray-900">{formatBDT(settledNum)}</strong>
              </div>
              <div
                className={`flex items-center justify-between border-t border-stone-200 pt-1 font-bold ${
                  Math.abs(settlementDifference) <= 0.01 ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                <span>{settlementDifference >= 0 ? "Surplus" : "Shortfall"}</span>
                <span className="font-mono">{formatBDT(Math.abs(settlementDifference))}</span>
              </div>
            </div>

            {settlementInvalid && (
              <p className="text-[10.5px] font-semibold text-rose-600">
                Settled amount cannot exceed the collected COD amount.
              </p>
            )}
            {!settlementInvalid && settlementNeedsNote && (
              <p className="text-[10.5px] font-semibold text-amber-700">
                A note is required when the settlement differs from the expected remittance.
              </p>
            )}

            <input
              type="text"
              value={settlementNote}
              onChange={(e) => setSettlementNote(e.target.value)}
              placeholder="Bank payout ref / settlement note..."
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-[12px]"
            />
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-[11px] text-gray-400">
                {order.settledAt ? `Settled: ${formatDateTime(order.settledAt)}` : "Not yet settled"}
              </span>
              <button
                type="button"
                disabled={busy || settlementInvalid || settlementNeedsNote}
                title={
                  settlementInvalid
                    ? "Settled amount cannot exceed the collected COD amount."
                    : settlementNeedsNote
                    ? "Add a note explaining the difference."
                    : "Save the courier settlement reconciliation"
                }
                onClick={() =>
                  void onSaveSettlement({
                    collectedCodAmount: collectedNum,
                    courierCharge: chargeNum,
                    settledCodAmount: settledNum,
                    settlementNote,
                    markSettled: true,
                  })
                }
                className="rounded-lg bg-purple-600 px-3.5 py-1.5 text-[11.5px] font-bold text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                Reconcile Settlement
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // Right sidebar renderers for Full Page View — Single Context-Sensitive Primary Action
  const renderAvailableNextActionsCard = () => {
    const status = order.orderStatus;

    // Cancellation guardrails
    const isParcelWithCourier = Boolean(
      activeShipment &&
      ["in_transit", "out_for_delivery", "picked_up"].includes(activeShipment.status)
    );
    const isDelivered = status === "delivered" || status === "completed" || activeShipment?.status === "delivered";
    const isBookingInProgress = order.shipmentBookingState === "booking_in_progress";

    const hasActiveConsignment = Boolean(
      activeShipment &&
        !["cancelled", "returned", "failed"].includes(String(activeShipment.status)) &&
        (activeShipment.consignmentId || order.consignmentId)
    );

    const cancelBlockedReason = isParcelWithCourier
      ? "Parcel is in transit with courier. Use courier recall/return request."
      : isDelivered
      ? "Delivered order must use customer return/refund workflow."
      : hasActiveConsignment
      ? "An active consignment exists. Cancel it from the Shipment tab first, then cancel the order."
      : isBookingInProgress
      ? "Reconcile pending courier booking before cancelling."
      : null;

    const trackUrl = getCourierTrackingUrl(
      order.courier || activeShipment?.provider || "steadfast",
      order.trackingCode || activeShipment?.trackingCode,
      order.consignmentId || activeShipment?.consignmentId
    );

    return (
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
          <h3 className="text-[13px] font-bold text-gray-900 tracking-tight">Available Next Actions</h3>
          <span className="text-[11px] font-medium text-gray-500">
            Status: <strong className="capitalize text-gray-800">{order.orderStatus.replace(/_/g, " ")}</strong>
          </span>
        </div>

        <div className="space-y-2">
          {/* 1. NEW PENDING ORDER */}
          {status === "pending" && (
            <>
              {order.paymentMethod === "sslcommerz" && order.paymentStatus !== "paid" ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={busy || actionBusy}
                    onClick={() => void onReconcileSslcommerz(order.orderNumber)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-[12.5px] font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Verify Payment
                  </button>
                  {onCodFallback && (
                    <button
                      type="button"
                      disabled={busy || actionBusy}
                      onClick={onCodFallback}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 py-2 text-[12px] font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50 transition cursor-pointer"
                    >
                      <Banknote className="h-4 w-4 text-amber-700" />
                      Switch to COD
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy || actionBusy}
                  onClick={() => void runTransition("confirmed", "Order confirmed by admin")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-[12.5px] font-bold text-white shadow-md shadow-purple-200 hover:bg-purple-700 disabled:opacity-50 transition cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  Confirm Order
                </button>
              )}
            </>
          )}

          {/* 2. CONFIRMED ORDER */}
          {status === "confirmed" && (
            <button
              type="button"
              disabled={busy || actionBusy}
              onClick={() => void runTransition("processing", "Processing & packing started")}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-[12.5px] font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
            >
              <Package className="h-4 w-4" />
              Start Processing
            </button>
          )}

          {/* 3. PROCESSING ORDER */}
          {status === "processing" && (
            <button
              type="button"
              disabled={busy || actionBusy}
              onClick={() => void runTransition("ready_to_ship", "Order packed and marked Ready to Ship")}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-[12.5px] font-bold text-white shadow-md shadow-purple-200 hover:bg-purple-700 disabled:opacity-50 transition cursor-pointer"
            >
              <PackageCheck className="h-4 w-4" />
              Mark Ready to Ship
            </button>
          )}

          {/* 4. READY TO SHIP ORDER */}
          {status === "ready_to_ship" && (
            <>
              {isBookingInProgress ? (
                <button
                  type="button"
                  disabled={busy || actionBusy}
                  onClick={() => {
                    if (activeShipment?.id) {
                      void onRefreshShipment(activeShipment.id);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 text-[12.5px] font-bold text-white shadow-md shadow-amber-200 hover:bg-amber-700 disabled:opacity-50 transition cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
                  Check Booking Status
                </button>
              ) : hasConsignment ? (
                <div className="space-y-2">
                  {trackUrl ? (
                    <a
                      href={trackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-[12.5px] font-bold text-white shadow-md shadow-purple-200 hover:bg-purple-700 transition"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Tracking {isMockConsignment ? "(TEST)" : ""}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab("shipment")}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-[12.5px] font-bold text-white shadow-md shadow-purple-200 hover:bg-purple-700 transition cursor-pointer"
                    >
                      <Truck className="h-4 w-4" />
                      View Shipment Details
                    </button>
                  )}
                  <CourierPrintAction
                    order={orderStub}
                    shipment={activeShipment}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-2 text-[12px] font-semibold text-gray-700 hover:bg-stone-50 transition cursor-pointer shadow-2xs"
                  >
                    Print Shipping Label
                  </CourierPrintAction>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={busy || actionBusy || !order.bookingEligibility.ok}
                    onClick={() => onOpenShipment(orderStub)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-[12.5px] font-bold text-white shadow-md shadow-purple-200 hover:bg-purple-700 disabled:opacity-50 transition cursor-pointer"
                  >
                    <Truck className="h-4 w-4" />
                    Book Steadfast
                  </button>
                  {!order.bookingEligibility.ok && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                      {order.bookingEligibility.reason || "Order not eligible for courier booking"}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* 5. SHIPPED ORDER */}
          {status === "shipped" && (
            <div className="space-y-2">
              {trackUrl ? (
                <a
                  href={trackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-[12.5px] font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 transition"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Tracking
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab("shipment")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-[12.5px] font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 transition cursor-pointer"
                >
                  <Truck className="h-4 w-4" />
                  View Tracking
                </button>
              )}
              <CourierPrintAction
                order={orderStub}
                shipment={activeShipment}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-2 text-[12px] font-semibold text-gray-700 hover:bg-stone-50 transition cursor-pointer shadow-2xs"
              >
                Print Shipping Label
              </CourierPrintAction>
            </div>
          )}

          {/* 6. DELIVERED ORDER */}
          {(status === "delivered" || status === "completed") && (
            <button
              type="button"
              onClick={() => setActiveTab("shipment")}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-[12.5px] font-bold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 transition cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              View Delivery Details
            </button>
          )}

          {/* 7. CANCELLED ORDER RECOVERY */}
          {status === "cancelled" && onReopenOrder && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-[12.5px]">
                <RotateCcw className="h-4 w-4 text-emerald-600" />
                <span>Cancelled Order Recovery</span>
              </div>
              <p className="text-[11.5px] text-gray-600">
                {order.reopenEligibility?.summary ||
                  "This order was cancelled. Restoring it requires a documented reason and does not create automated courier bookings."}
              </p>
              {order.reopenEligibility?.eligible === false && (
                <p className="text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
                  ⚠️ Reopen locked: {order.reopenEligibility.reason}
                </p>
              )}
              <button
                type="button"
                disabled={busy || actionBusy || order.reopenEligibility?.eligible === false}
                onClick={() => {
                  setReopenReason("");
                  setReopenModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-[12.5px] font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-40 transition cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                Reopen Cancelled Order
              </button>
            </div>
          )}

          {/* Governed Order Cancellation with Strict Rules */}
          {allowed.includes("cancelled") && status !== "cancelled" && (
            <div className="pt-2 border-t border-stone-100">
              {cancelBlockedReason ? (
                <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-3 text-[11.5px] text-amber-900">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Cancellation Blocked</p>
                      <p className="text-[11px] text-amber-800 mt-0.5">{cancelBlockedReason}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy || actionBusy}
                  onClick={requestOrderCancellation}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/60 py-2.5 text-[12px] font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-300 disabled:opacity-40 transition cursor-pointer shadow-2xs"
                >
                  <XCircle className="h-4 w-4 text-rose-600" />
                  Cancel Order
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderOrderFinancialsSidebarCard = () => (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs space-y-3.5">
      <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
        <h3 className="text-[13px] font-bold text-gray-900 tracking-tight">Order Financials</h3>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${settlementBadgeClass(
            fin.codSettlementStatus
          )}`}
        >
          {fin.codSettlementStatus}
        </span>
      </div>

      <div className="space-y-2 text-[12.5px]">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span className="tabular-nums font-semibold">{formatBDT(order.subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Delivery Charge</span>
          <span className="tabular-nums font-semibold">{formatBDT(order.shippingFee)}</span>
        </div>
        <div className="flex justify-between border-t border-stone-100 pt-2 font-bold text-gray-900 text-[13.5px]">
          <span>Order Total</span>
          <span className="tabular-nums">{formatBDT(fin.orderTotal)}</span>
        </div>
      </div>

      <div className="rounded-xl bg-stone-50 border border-stone-200/80 p-3 space-y-2 text-[12px]">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Advance Paid:</span>
          <span className="font-bold text-emerald-700 tabular-nums">{formatBDT(fin.advancePaidAmount)}</span>
        </div>
        {order.paymentMethod !== "cod" && fin.outstandingAmount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-rose-600 font-medium">Outstanding Online:</span>
            <span className="font-bold text-rose-700 tabular-nums">{formatBDT(fin.outstandingAmount)}</span>
          </div>
        )}
        <div className="flex justify-between items-center border-t border-stone-200 pt-1.5">
          <span className="text-purple-900 font-bold">COD Collectible:</span>
          <span className="font-bold text-purple-700 text-[13px] tabular-nums">
            {formatBDT(fin.codAmountToCollect)}
          </span>
        </div>
      </div>
    </div>
  );

  const renderPaymentSummarySidebarCard = () => (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-purple-600" />
          Payment Summary
        </h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase border ${
            order.paymentStatus === "paid"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          {order.paymentStatus === "paid" ? "Paid" : "Unpaid"}
        </span>
      </div>

      <div className="space-y-1.5 text-[12px]">
        <div className="flex justify-between text-gray-600">
          <span>Method</span>
          <span className="font-bold text-gray-800 capitalize">
            {order.paymentMethod === "cod" ? "Cash on Delivery (COD)" : order.paymentMethod}
          </span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Advance Paid</span>
          <span className="font-semibold text-emerald-700 tabular-nums">
            {formatBDT(fin.advancePaidAmount)}
          </span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Balance Outstanding</span>
          <span className="font-semibold text-purple-700 tabular-nums">
            {formatBDT(fin.codAmountToCollect)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setActiveTab("payment")}
        className="w-full text-center text-[11.5px] font-bold text-purple-700 hover:text-purple-900 hover:underline pt-1 cursor-pointer"
      >
        View Transactions & Payment History →
      </button>
    </div>
  );

  const renderShipmentSummarySidebarCard = () => (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <Truck className="h-4 w-4 text-purple-600" />
          Shipment Summary
        </h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold capitalize border ${
            activeShipment
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-stone-100 text-stone-600 border-stone-200"
          }`}
        >
          {activeShipment ? activeShipment.status.replace(/_/g, " ") : "Not Booked"}
        </span>
      </div>

      {activeShipment ? (
        <div className="space-y-2 text-[12px]">
          <div className="flex justify-between items-center text-gray-600">
            <span>Courier</span>
            <span className="inline-flex items-center gap-1.5 font-bold text-gray-800">
              <CourierLogo provider={activeShipment.provider} size="xs" />
              {getCourierLabel(activeShipment.provider)}
            </span>
          </div>
          {activeShipment.consignmentId && (
            <div className="flex justify-between text-gray-600">
              <span>Consignment ID</span>
              <span className="font-mono font-semibold text-gray-900">
                {activeShipment.consignmentId}
              </span>
            </div>
          )}
          {activeShipment.trackingCode && (
            <div className="flex justify-between text-gray-600">
              <span>Tracking Code</span>
              <span className="font-mono font-semibold text-gray-900">
                {activeShipment.trackingCode}
              </span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[12px] text-gray-500">No consignment booked yet.</p>
      )}

      <button
        type="button"
        onClick={() => setActiveTab("shipment")}
        className="w-full text-center text-[11.5px] font-bold text-purple-700 hover:text-purple-900 hover:underline pt-1 cursor-pointer"
      >
        View Shipment Tracking & Settlement →
      </button>
    </div>
  );

  const renderCustomerContactSidebarCard = () => (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs space-y-3">
      <h3 className="text-[13px] font-bold text-gray-900 tracking-tight flex items-center gap-2">
        <User className="h-4 w-4 text-purple-600" />
        Customer Contact
      </h3>
      <div className="space-y-2 text-[12.5px]">
        <p className="font-bold text-gray-900">{order.customer.fullName}</p>
        <div className="flex items-center gap-2 text-gray-600">
          <Phone className="h-3.5 w-3.5 text-gray-400" />
          <a href={`tel:${order.customer.phone}`} className="font-mono hover:text-purple-700">
            {order.customer.phone}
          </a>
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#25D366] text-white hover:scale-110 transition shadow-2xs"
              title="Chat on WhatsApp"
              aria-label="Chat on WhatsApp"
            >
              <WhatsAppIcon className="h-2.5 w-2.5 fill-current" />
            </a>
          )}
        </div>
        <div className="flex items-start gap-2 pt-0.5 text-gray-600">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-500" />
          <span>
            {order.customer.address}, {order.customer.city}
            {order.customer.district &&
            order.customer.district.toLowerCase() !== order.customer.city.toLowerCase()
              ? `, ${order.customer.district}`
              : ""}
          </span>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. DRAWER PREVIEW VIEW (When isDrawer === true)
  // ─────────────────────────────────────────────────────────────────────────────
  if (isDrawer) {
    return (
      <div className="flex h-full flex-col bg-[#f8f9fc]">
        {renderUpdateStatusModal()}
        {renderCancellationModal()}
        {renderReopenModal()}
        {renderRefundModal()}

        {/* Top Slide-Over Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-200/90 bg-white px-6 py-3.5 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900 tracking-tight font-mono">
                Order #{order.orderNumber}
              </h2>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold capitalize ${getOrderStatusBadge(
                  order.orderStatus
                )}`}
              >
                {ORDER_STATUS_LABELS[order.orderStatus] || order.orderStatus}
              </span>
            </div>
            <p className="mt-0.5 text-[11.5px] text-gray-500">
              {formatDateTime(order.createdAt)} · {order.paymentMethod === "cod" ? "COD Order" : "Online Order"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Dedicated Order Actions Menu */}
            <div className="relative" ref={actionsMenuRef}>
              <button
                type="button"
                onClick={() => setActionsMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-1.5 text-[12px] font-bold text-white hover:bg-purple-700 cursor-pointer shadow-2xs transition"
              >
                <span>Order Actions</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {actionsMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-40 w-56 rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl space-y-0.5 text-[12px] font-medium animate-in fade-in-0 duration-100">
                  {allowed.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setActionsMenuOpen(false);
                        setTargetStatusToUpdate(allowed[0] || "");
                        setUpdateStatusReason("");
                        setUpdateStatusModalOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-gray-800 hover:bg-purple-50 hover:text-purple-700 cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-purple-600" />
                      Update Order Status
                    </button>
                  )}

                  {order.orderStatus === "cancelled" && onReopenOrder && (
                    <button
                      type="button"
                      onClick={() => {
                        setActionsMenuOpen(false);
                        setReopenReason("");
                        setReopenModalOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-emerald-700 hover:bg-emerald-50 cursor-pointer font-bold"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-emerald-600" />
                      Reopen Cancelled Order
                    </button>
                  )}

                  {allowed.includes("cancelled") && order.orderStatus !== "cancelled" && (
                    <button
                      type="button"
                      onClick={() => {
                        setActionsMenuOpen(false);
                        requestOrderCancellation();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-rose-700 hover:bg-rose-50 cursor-pointer font-semibold"
                    >
                      <XCircle className="h-3.5 w-3.5 text-rose-600" />
                      Cancel Order
                    </button>
                  )}

                  {order.orderStatus === "cancelled" && order.cancellationDetails && (
                    <button
                      type="button"
                      onClick={() => {
                        setActionsMenuOpen(false);
                        setCancellationDetailsOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-gray-700 hover:bg-stone-50 cursor-pointer"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      View Cancellation Details
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={!order.bookingEligibility.ok && !activeShipment}
                    onClick={() => {
                      setActionsMenuOpen(false);
                      onOpenShipment(orderStub);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-40 cursor-pointer"
                  >
                    <Truck className="h-3.5 w-3.5 text-purple-600" />
                    {activeShipment ? "View Shipment / Consignment" : "Create Steadfast Shipment"}
                  </button>

                  {order.paymentMethod === "sslcommerz" && order.paymentStatus !== "paid" && (
                    <button
                      type="button"
                      onClick={() => {
                        setActionsMenuOpen(false);
                        void onReconcileSslcommerz(order.orderNumber);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-blue-700 hover:bg-blue-50 cursor-pointer"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                      Verify SSLCOMMERZ
                    </button>
                  )}

                  <CourierPrintAction
                    order={orderStub}
                    shipment={activeShipment}
                    onClick={() => setActionsMenuOpen(false)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-gray-700 hover:bg-stone-50 cursor-pointer"
                  >
                    Print Packing Slip
                  </CourierPrintAction>

                  <button
                    type="button"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      onCopy(order.orderNumber, "Order number");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-gray-700 hover:bg-stone-50 cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5 text-gray-400" />
                    Copy Order #
                  </button>
                </div>
              )}
            </div>

            <CourierPrintAction
              order={orderStub}
              shipment={activeShipment}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-700 hover:bg-stone-50 cursor-pointer shadow-2xs"
            >
              <span>Print</span>
            </CourierPrintAction>

            {/* More Dropdown */}
            <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setMoreMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-700 hover:bg-stone-50 cursor-pointer shadow-2xs"
              >
                <span>More</span>
                <MoreVertical className="h-3.5 w-3.5 text-gray-400" />
              </button>

              {moreMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-30 w-44 rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg space-y-0.5 text-[12px] font-medium animate-in fade-in-0 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      onCopy(order.orderNumber, "Order number");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-700 cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5 text-gray-400" />
                    Copy Order #
                  </button>
                  {fullPageHref && (
                    <Link
                      href={fullPageHref}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-700"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                      Open Dedicated Page
                    </Link>
                  )}
                </div>
              )}
            </div>

            {onClose && (
              <button
                type="button"
                aria-label="Close drawer"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-gray-500 hover:bg-stone-50 cursor-pointer shadow-2xs ml-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation Capsules */}
        <div className="border-b border-stone-200/80 bg-white px-6 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {(["overview", "activity", "payment", "shipment"] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-1.5 text-[12px] font-bold capitalize transition cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-transparent text-gray-600 hover:bg-purple-50 hover:text-purple-700"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === "overview" && (
            <div className="space-y-4">
              {renderLifecycleBadgesStrip()}
              {renderOrderProgressStepper()}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {renderCustomerInfoCard()}
                {renderPricingBreakdownCard()}
              </div>
              {renderProductsListCard()}
            </div>
          )}

          {activeTab === "activity" && (
            <OrderActivityView
              order={order}
              timeline={timeline}
              refunds={refunds}
              busy={busy}
              onAddNote={onAddNote}
              isDrawer={true}
            />
          )}

          {activeTab === "payment" && renderPaymentManagementCard()}

          {activeTab === "shipment" && (
            <div className="space-y-4">
              {renderShipmentCard()}
              {renderCodSettlementCard()}
            </div>
          )}
        </div>

        {/* Sticky Bottom Actions Bar */}
        <div className="sticky bottom-0 z-20 flex items-center justify-between border-t border-stone-200/90 bg-white px-6 py-3.5 shadow-sm">
          {order.orderStatus === "cancelled" && onReopenOrder ? (
            <button
              type="button"
              disabled={busy || actionBusy || order.reopenEligibility?.eligible === false}
              onClick={() => {
                setReopenReason("");
                setReopenModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-40 cursor-pointer transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reopen Order
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {order.orderStatus === "pending" && (
              <>
                {order.paymentMethod === "sslcommerz" && order.paymentStatus !== "paid" ? (
                  <button
                    type="button"
                    disabled={busy || actionBusy}
                    onClick={() => void onReconcileSslcommerz(order.orderNumber)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-[12px] font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Verify Payment
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy || actionBusy}
                    onClick={() => void runTransition("confirmed", "Order confirmed by admin")}
                    className="rounded-xl bg-purple-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-purple-700 cursor-pointer shadow-xs"
                  >
                    Confirm Order
                  </button>
                )}
              </>
            )}

            {order.orderStatus === "confirmed" && (
              <button
                type="button"
                disabled={busy || actionBusy}
                onClick={() => void runTransition("processing", "Processing & packing started")}
                className="rounded-xl bg-blue-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-blue-700 cursor-pointer shadow-xs"
              >
                Start Processing
              </button>
            )}

            {order.orderStatus === "processing" && (
              <button
                type="button"
                disabled={busy || actionBusy}
                onClick={() => void runTransition("ready_to_ship", "Marked Ready to Ship")}
                className="rounded-xl bg-purple-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-purple-700 cursor-pointer shadow-xs"
              >
                Mark Ready to Ship
              </button>
            )}

            {order.orderStatus === "ready_to_ship" && (
              <>
                {hasConsignment ? (
                  <button
                    type="button"
                    onClick={() => onOpenShipment(orderStub)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2 text-[12.5px] font-bold text-white shadow-md shadow-purple-200 hover:bg-purple-700 cursor-pointer transition"
                  >
                    <Truck className="h-4 w-4" />
                    View Shipment
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy || actionBusy || !order.bookingEligibility.ok}
                    onClick={() => onOpenShipment(orderStub)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2 text-[12.5px] font-bold text-white shadow-md shadow-purple-200 hover:bg-purple-700 disabled:opacity-50 cursor-pointer transition"
                  >
                    <Truck className="h-4 w-4" />
                    Book Steadfast
                  </button>
                )}
              </>
            )}

            {(order.orderStatus === "shipped" || order.orderStatus === "delivered" || order.orderStatus === "completed") && (
              <button
                type="button"
                onClick={() => onOpenShipment(orderStub)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-[12.5px] font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 cursor-pointer transition"
              >
                <Truck className="h-4 w-4" />
                View Tracking
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. FULL-PAGE ORDER DETAILS VIEW (/admin/orders/[id])
  // Responsive two-column desktop layout (lg:grid-cols-3) & single-column mobile
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {renderUpdateStatusModal()}
      {renderCancellationModal()}
      {renderReopenModal()}
      {renderRefundModal()}

      {/* Full-Page Top Header matching Section 3 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/90 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3.5">
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-stone-50 hover:text-purple-700 transition shadow-2xs self-start"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Orders</span>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight font-mono">
                Order #{order.orderNumber}
              </h1>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold capitalize ${getOrderStatusBadge(
                  order.orderStatus
                )}`}
              >
                {ORDER_STATUS_LABELS[order.orderStatus] || order.orderStatus}
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-gray-500">
              Placed on {formatDateTime(order.createdAt)} · {order.paymentMethod === "cod" ? "COD Order" : "Online Order"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {notificationBanner && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-[12px] font-semibold text-emerald-800 animate-in fade-in">
              {notificationBanner}
            </div>
          )}

          {/* Dedicated Order Actions Menu */}
          <div className="relative" ref={actionsMenuRef}>
            <button
              type="button"
              onClick={() => setActionsMenuOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-[12.5px] font-bold text-white hover:bg-purple-700 cursor-pointer shadow-2xs transition"
            >
              <span>Order Actions</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {actionsMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-40 w-56 rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl space-y-0.5 text-[12px] font-medium animate-in fade-in-0 duration-100">
                {allowed.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      setTargetStatusToUpdate(allowed[0] || "");
                      setUpdateStatusReason("");
                      setUpdateStatusModalOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-gray-800 hover:bg-purple-50 hover:text-purple-700 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-purple-600" />
                    Update Order Status
                  </button>
                )}

                {order.orderStatus === "cancelled" && onReopenOrder && (
                  <button
                    type="button"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      setReopenReason("");
                      setReopenModalOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-emerald-700 hover:bg-emerald-50 cursor-pointer font-bold"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-emerald-600" />
                    Reopen Cancelled Order
                  </button>
                )}

                {allowed.includes("cancelled") && order.orderStatus !== "cancelled" && (
                  <button
                    type="button"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      requestOrderCancellation();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-rose-700 hover:bg-rose-50 cursor-pointer font-semibold"
                  >
                    <XCircle className="h-3.5 w-3.5 text-rose-600" />
                    Cancel Order
                  </button>
                )}

                {order.orderStatus === "cancelled" && order.cancellationDetails && (
                  <button
                    type="button"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      setCancellationDetailsOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-gray-700 hover:bg-stone-50 cursor-pointer"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    View Cancellation Details
                  </button>
                )}

                <button
                  type="button"
                  disabled={!order.bookingEligibility.ok && !activeShipment}
                  onClick={() => {
                    setActionsMenuOpen(false);
                    onOpenShipment(orderStub);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-40 cursor-pointer"
                >
                  <Truck className="h-3.5 w-3.5 text-purple-600" />
                  {activeShipment ? "View Shipment / Consignment" : "Create Steadfast Shipment"}
                </button>

                {order.paymentMethod === "sslcommerz" && order.paymentStatus !== "paid" && (
                  <button
                    type="button"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      void onReconcileSslcommerz(order.orderNumber);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-blue-700 hover:bg-blue-50 cursor-pointer"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                    Verify SSLCOMMERZ
                  </button>
                )}

                <CourierPrintAction
                  order={orderStub}
                  shipment={activeShipment}
                  onClick={() => setActionsMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-gray-700 hover:bg-stone-50 cursor-pointer"
                >
                  Print Packing Slip
                </CourierPrintAction>

                <button
                  type="button"
                  onClick={() => {
                    setActionsMenuOpen(false);
                    onCopy(order.orderNumber, "Order number");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-gray-700 hover:bg-stone-50 cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5 text-gray-400" />
                  Copy Order #
                </button>
              </div>
            )}
          </div>

          <CourierPrintAction
            order={orderStub}
            shipment={activeShipment}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-stone-50 hover:text-purple-700 transition shadow-2xs cursor-pointer"
          >
            <span>Print Slip</span>
          </CourierPrintAction>

          {/* More Actions Dropdown */}
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setMoreMenuOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-stone-50 hover:text-purple-700 transition shadow-2xs cursor-pointer"
            >
              <span>More</span>
              <MoreVertical className="h-4 w-4 text-gray-400" />
            </button>

            {moreMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-30 w-44 rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg space-y-0.5 text-[12px] font-medium animate-in fade-in-0 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    onCopy(order.orderNumber, "Order number");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-700 cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5 text-gray-400" />
                  Copy Order #
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4 Independent Lifecycles Strip */}
      {renderLifecycleBadgesStrip()}

      {/* Responsive Two-Column Grid: Left Main (2 cols) & Right Sidebar (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (Main Content) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab Navigation Capsules */}
          <div className="flex items-center gap-2 border-b border-stone-200/90 pb-3 overflow-x-auto no-scrollbar">
            {(["overview", "activity", "payment", "shipment"] as const).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-4 py-1.5 text-[12.5px] font-bold capitalize transition cursor-pointer shrink-0 ${
                    isActive
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-white text-gray-600 hover:bg-purple-50 hover:text-purple-700 border border-stone-200/80"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {renderOrderProgressStepper()}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {renderCustomerInfoCard()}
                {renderPricingBreakdownCard()}
              </div>
              {renderProductsListCard()}
            </div>
          )}

          {/* TAB 2: ACTIVITY — Internal notes & Immutable Audit Trail */}
          {activeTab === "activity" && (
            <OrderActivityView
              order={order}
              timeline={timeline}
              refunds={refunds}
              busy={busy}
              onAddNote={onAddNote}
              isDrawer={false}
            />
          )}

          {/* TAB 3: PAYMENT */}
          {activeTab === "payment" && renderPaymentManagementCard()}

          {/* TAB 4: SHIPMENT */}
          {activeTab === "shipment" && (
            <div className="space-y-6">
              {renderShipmentCard()}
              {renderCodSettlementCard()}
            </div>
          )}
        </div>

        {/* Right Sidebar (1 column) */}
        <div className="lg:col-span-1 space-y-5">
          {renderAvailableNextActionsCard()}
          {renderOrderFinancialsSidebarCard()}
          {renderPaymentSummarySidebarCard()}
          {renderShipmentSummarySidebarCard()}
          {renderCustomerContactSidebarCard()}
        </div>
      </div>
    </div>
  );
}
