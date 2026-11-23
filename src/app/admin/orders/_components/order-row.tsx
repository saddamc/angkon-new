"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Users,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Truck,
  ExternalLink,
  Eye,
  AlertTriangle,
  AlertCircle,
  MoreVertical,
  RotateCcw,
  RefreshCw,
  Loader2,
  Check,
  XCircle,
} from "lucide-react";
import { getCourierTrackingUrl } from "@/server/courier/tracking";
import { getPaymentMethodBadge, isOnlinePaymentMethod } from "@/lib/payment-methods";
import { CourierLogo } from "@/components/admin/courier-logo";
import { CourierPrintAction } from "./courier-print-action";
import { WhatsAppIcon } from "./whatsapp-icon";
import { ProductThumbnail } from "./product-thumbnail";
import { getOrderActionCategory } from "./needs-action-helper";
import { ORDER_TABLE_GRID } from "./order-table-grid";
import {
  STATUS_BADGE,
  STATUS_LABEL_MAP,
  FINAL_STATUSES,
  formatBDT,
  type WCOrder,
} from "../_types/orders.types";
import type { AdminOrdersHookReturn } from "../_hooks/use-admin-orders";

interface OrderRowProps {
  order: WCOrder;
  idx: number;
  state: AdminOrdersHookReturn;
}

function getPaymentBadge(status: string, isCancelled: boolean) {
  if (isCancelled) {
    return {
      label: "Void",
      cls: "bg-gray-100 text-gray-500 border-gray-200",
      icon: null,
    };
  }
  switch (status) {
    case "paid":
      return {
        label: "Paid",
        cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: CheckCircle2,
      };
    case "partially_paid":
      return {
        label: "Partial Paid",
        cls: "bg-blue-50 text-blue-700 border-blue-200",
        icon: Clock,
      };
    case "refunded":
    case "partially_refunded":
      return {
        label: status === "refunded" ? "Refunded" : "Part Refund",
        cls: "bg-slate-100 text-slate-700 border-slate-200",
        icon: AlertTriangle,
      };
    case "failed":
      return {
        label: "Failed",
        cls: "bg-rose-50 text-rose-700 border-rose-200",
        icon: AlertTriangle,
      };
    default:
      return {
        label: "Pending",
        cls: "bg-amber-50 text-amber-700 border-amber-200",
        icon: Clock,
      };
  }
}

export function OrderRow({ order, idx: _idx, state }: OrderRowProps) {
  const {
    copyValue,
    setSelectedStatus,
    setStatusModal,
    openPaymentDetails,
    openShipment,
    openOrderDetails,
    selectedOrderIds,
    toggleSelectOrder,
    refreshShipment,
  } = state;

  const custName =
    `${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim() ||
    "Guest";
  const statusColor =
    STATUS_BADGE[order.status] ?? "bg-gray-50 text-gray-600 border-gray-200";
  const statusLabel =
    STATUS_LABEL_MAP[order.status] ?? order.status.replace(/[_-]/g, " ");
  const firstItem = order.line_items?.[0];
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [checkingCourier, setCheckingCourier] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const mobileButtonRef = useRef<HTMLButtonElement | null>(null);
  const activeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const menuNodeRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placeAbove: boolean;
  }>({
    top: 0,
    left: 0,
    placeAbove: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = useCallback(() => {
    const trigger = activeTriggerRef.current || buttonRef.current || mobileButtonRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const vWidth = window.innerWidth;
    const vHeight = window.innerHeight;

    // If trigger button is scrolled completely out of viewport, dismiss menu
    if (rect.bottom < 0 || rect.top > vHeight) {
      setMenuOpen(false);
      return;
    }

    const menuWidth = 186;
    const menuHeight = menuNodeRef.current?.offsetHeight || 250;

    const spaceBelow = vHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Open upwards (dropup) if space below is too tight and space above has more room
    const placeAbove = spaceBelow < menuHeight + 12 && spaceAbove > spaceBelow;

    let top: number;
    if (placeAbove) {
      top = rect.top - menuHeight - 6;
    } else {
      top = rect.bottom + 6;
    }

    // Clamp top so menu never bleeds off viewport edges
    if (top < 8) top = 8;
    if (top + menuHeight > vHeight - 8) {
      top = Math.max(8, vHeight - menuHeight - 8);
    }

    // Right-align with trigger button and clamp horizontally
    let left = rect.right - menuWidth;
    if (left + menuWidth > vWidth - 12) {
      left = vWidth - menuWidth - 12;
    }
    if (left < 12) {
      left = 12;
    }

    setCoords({
      top: Math.round(top),
      left: Math.round(left),
      placeAbove,
    });
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    updateCoords();

    // Re-check once menuNodeRef mounts to apply exact rendered offsetHeight
    const frameId = requestAnimationFrame(() => {
      updateCoords();
    });

    const onScrollOrResize = () => {
      updateCoords();
    };

    window.addEventListener("scroll", onScrollOrResize, { passive: true, capture: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", onScrollOrResize, { capture: true });
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [menuOpen, updateCoords]);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        (buttonRef.current && buttonRef.current.contains(target)) ||
        (mobileButtonRef.current && mobileButtonRef.current.contains(target)) ||
        (menuNodeRef.current && menuNodeRef.current.contains(target))
      ) {
        return;
      }
      setMenuOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const rawPhone = order.billing?.phone || "";
  const digitsOnly = rawPhone.replace(/\D/g, "");
  const waDigits = digitsOnly.startsWith("880")
    ? digitsOnly
    : digitsOnly.startsWith("01")
      ? `88${digitsOnly}`
      : digitsOnly.length === 10 && digitsOnly.startsWith("1")
        ? `880${digitsOnly}`
        : digitsOnly;
  const waUrl =
    waDigits.length >= 11
      ? `https://wa.me/${waDigits}?text=${encodeURIComponent(
          `Hello ${custName}, this is Angkon regarding your order #${order.number || order.id}.`
        )}`
      : null;
  const productName = firstItem?.name ?? "â€”";
  const productQty = (order.line_items || []).reduce(
    (sum, li) => sum + (li.quantity || 1),
    0
  );
  const itemCount = order.line_items?.length || 1;
  const thumb = firstItem?.image?.src;

  const rawAddress = order.billing?.address_1 || "";
  const city = order.billing?.city || "";
  const fullAddress =
    city && !rawAddress.toLowerCase().includes(city.toLowerCase())
      ? `${rawAddress}, ${city}`.replace(/^,\s*/, "")
      : rawAddress;

  const paymentStatus = (
    order.payment_status ||
    order.paymentStatus ||
    "pending"
  ).toLowerCase();
  const isCancelled = order.status === "cancelled" || order.status === "failed";
  const isFinal = FINAL_STATUSES.includes(order.status) || order.status === "failed";
  const isSelected = selectedOrderIds.includes(String(order.id));
  const hasCourier = Boolean(order.courier || order.trackingCode || order.consignmentId);
  const hasConsignment = Boolean(order.consignmentId || order.trackingCode);
  const rawShipmentStatus = (order.shipmentStatus || "not_booked").toLowerCase();
  const isDelivered = rawShipmentStatus === "delivered" || order.status === "delivered";
  const isInTransit = ["in_transit", "out_for_delivery", "picked_up"].includes(rawShipmentStatus);
  const isConsignmentCancelled = rawShipmentStatus === "cancelled";
  // Steadfast reports "unknown" for consignments cancelled in the merchant
  // portal — that must never be displayed as a successful active booking.
  const isUnknownCourierStatus = rawShipmentStatus === "unknown";
  const isReturnOrException = ["returned", "return_initiated", "hold", "delivery_failed", "partial_delivered"].includes(rawShipmentStatus);
  const isBooked =
    (hasConsignment || ["in_review", "booked", "pickup_pending", "created", "pending"].includes(rawShipmentStatus)) &&
    !isDelivered &&
    !isInTransit &&
    !isReturnOrException &&
    !isConsignmentCancelled &&
    !isUnknownCourierStatus;
  const isMockConsignment = Boolean(
    order.courierIsMock ||
    order.courierOperatingMode === "mock" ||
    (order.trackingCode && order.trackingCode.startsWith("MOCK-")) ||
    (order.consignmentId && order.consignmentId.startsWith("MOCK-"))
  );
  const bookingFailed =
    order.shipmentBookingState === "booking_failed" ||
    order.shipmentStatus === "booking_failed" ||
    Boolean(order.courierBookingError);
  const bookingInProgress =
    order.shipmentBookingState === "booking_in_progress" ||
    order.shipmentBookingState === "booking_pending";
  const courierStatusLabel = (order.shipmentStatus || "not synced").replace(/_/g, " ");
  const shipmentStatusLabel = (order.shipmentStatus || "none").replace(/_/g, " ");
  const isCourierCodMismatch = Boolean(order.shipmentCodMismatch);

  // Any SSLCOMMERZ gateway channel (sslcommerz/cards/bkash/nagad/online) —
  // not just the generic one — drives the online-payment action strip.
  const isGatewayOrder = isOnlinePaymentMethod(order.paymentMethod);
  const isOnlinePaymentPending = isGatewayOrder && (paymentStatus === "pending" || paymentStatus === "unpaid");
  const isOnlinePaymentFailed = isGatewayOrder && (paymentStatus === "failed" || paymentStatus === "cancelled");
  const isUnpaidSsl = isGatewayOrder && paymentStatus !== "paid" && !isFinal;
  const actionCategory = getOrderActionCategory(order);
  const showActionStrip = state.filterStatus === "needs_action" || actionCategory !== null;

  const outstanding =
    order.outstandingAmount !== undefined
      ? order.outstandingAmount
      : paymentStatus === "paid" || isCancelled
        ? 0
        : Number(order.total || 0);

  const paymentBadge = getPaymentBadge(paymentStatus, isCancelled);

  const shipmentBadgeTone = (() => {
    const s = (order.shipmentStatus || "").toLowerCase();
    if (s === "delivered") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "partial_delivered") return "bg-amber-50 text-amber-700 border-amber-200";
    if (s === "cancelled" || s === "returned" || s === "failed")
      return "bg-rose-50 text-rose-700 border-rose-200";
    if (s === "in_transit" || s === "out_for_delivery" || s === "created" || s === "pending")
      return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-slate-50 text-slate-600 border-slate-200";
  })();

  const trackUrl = getCourierTrackingUrl(
    order.courier,
    order.trackingCode,
    order.consignmentId
  );

  return (
    <div className="group">
      {/* Desktop Table Row */}
      <div
        className={`hidden lg:grid ${ORDER_TABLE_GRID} items-center gap-3 px-4 py-3 text-left transition ${
          isSelected ? "bg-purple-50/70" : "hover:bg-purple-50/30"
        }`}
      >
        <input
          type="checkbox"
          aria-label={`Select order #${order.number || order.id}`}
          checked={isSelected}
          onChange={() => toggleSelectOrder(order.id)}
          className="h-3.5 w-3.5 rounded border-purple-300 accent-purple-600 cursor-pointer"
        />

        {/* Order # & Date & Channel */}
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => openOrderDetails(order.id)}
              className="truncate font-mono text-[12.5px] font-bold text-purple-700 hover:underline cursor-pointer"
              title="Open order details"
            >
              #{order.number || order.id}
            </button>
            <button
              type="button"
              onClick={() => void copyValue(`#${order.number || order.id}`, "Order number")}
              className="text-gray-400 hover:text-purple-600 cursor-pointer"
              title="Copy order number"
            >
              <Copy className="h-2.5 w-2.5" />
            </button>
          </div>
          <p
            className="text-[11px] text-gray-500"
            title={order.channel === "admin" ? "Admin Order" : "Website Order"}
          >
            {order.date_created
              ? new Date(order.date_created).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "â€”"}
          </p>
        </div>

        {/* Customer Info */}
        <div className="min-w-0 space-y-0.5">
          <button
            type="button"
            onClick={() => openOrderDetails(order.id)}
            className="flex w-full min-w-0 items-center gap-1.5 text-left hover:text-purple-700 cursor-pointer"
          >
            <Users className="h-3 w-3 shrink-0 text-gray-400" />
            <span className="truncate text-[12px] font-bold text-gray-800">{custName}</span>
          </button>
          {order.billing?.phone && (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <Phone className="h-3 w-3 shrink-0 text-gray-400" />
              <span className="truncate font-mono">{order.billing.phone}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  state.openWhatsApp(order);
                }}
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white hover:scale-110 transition shadow-2xs cursor-pointer"
                title="Chat on WhatsApp"
                aria-label="Chat on WhatsApp"
              >
                <WhatsAppIcon className="h-2.5 w-2.5 fill-current" />
              </button>
            </div>
          )}
          {fullAddress && (
            <div className="flex items-center gap-1.5 text-[10.5px] text-gray-400">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate" title={fullAddress}>
                {city || fullAddress}
              </span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex items-center gap-2 min-w-0">
          <ProductThumbnail
            src={thumb}
            alt={productName}
            size={36}
            className="h-9 w-9"
          />
          <div className="min-w-0">
            <p className="truncate text-[12px] font-bold text-gray-800" title={productName}>
              {productName}
            </p>
            <p className="text-[10.5px] text-gray-500">
              {itemCount > 1 ? `${itemCount} items Â· ` : ""}Qty: {productQty}
              {firstItem?.size ? ` Â· Size: ${firstItem.size}` : ""}
            </p>
          </div>
        </div>

        {/* Payment Method & Independent Status */}
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          <div className="flex max-w-full flex-wrap items-center gap-1">
            <span
              className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight ${
                isGatewayOrder
                  ? "border-purple-200 bg-purple-50 text-purple-700"
                  : "border-stone-200 bg-stone-50 text-stone-700"
              }`}
            >
              {getPaymentMethodBadge(order.paymentMethod)}
            </span>
            <button
              type="button"
              onClick={() => openPaymentDetails(order)}
              title="View payment validation & history"
              className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-bold transition hover:shadow-xs cursor-pointer ${paymentBadge.cls}`}
            >
              {paymentBadge.label}
            </button>
          </div>

          {/* Compact Inline Payment Warning & Actions */}
          {isUnpaidSsl && (
            <div className="flex min-w-0 flex-col items-start gap-1">
              <span
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9.5px] font-bold text-amber-800"
                title="Online payment unverified. Verify gateway or switch to COD before shipping."
              >
                <AlertTriangle className="h-2.5 w-2.5 shrink-0 text-amber-600" />
                Unpaid Online
              </span>
              <div className="flex items-center gap-1 whitespace-nowrap text-[9px] font-semibold text-gray-600">
                <button
                  type="button"
                  onClick={() => openPaymentDetails(order)}
                  className="text-purple-700 hover:underline cursor-pointer"
                  title="Verify payment with SSLCOMMERZ"
                >
                  Verify
                </button>
                <span className="text-gray-300">·</span>
                <button
                  type="button"
                  onClick={() => state.setCodFallbackModal(order)}
                  className="text-amber-800 hover:underline cursor-pointer"
                  title="Switch order to Cash on Delivery"
                >
                  To COD
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Courier, consignment & delivery status */}
        <div className="flex w-full min-w-0 flex-col items-start gap-1">
          {isCourierCodMismatch && (
            <span
              role="alert"
              className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-[9px] font-bold text-rose-800"
              title={`Paid order, but active courier consignment is set to collect ৳${Number(order.shipmentCodAmount || 0).toLocaleString("en-BD")}. Do not dispatch; cancel and rebook in the courier portal.`}
            >
              <AlertTriangle className="h-3 w-3 shrink-0" />
              COD mismatch · ৳{Number(order.shipmentCodAmount || 0).toLocaleString("en-BD")}
            </span>
          )}
          {bookingInProgress ? (
            /* 1. Booking in progress (server downgrades stale locks to retryable) */
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800 opacity-90 cursor-not-allowed"
              title="A courier booking is in progress. This unlocks automatically if the attempt stalls."
            >
              <Loader2 className="h-3 w-3 animate-spin text-amber-600" />
              <span>Booking…</span>
            </button>
          ) : bookingFailed ? (
            /* 2. Booking failed -> Retry booking + error */
            <div className="flex flex-col items-start gap-1">
              <button
                type="button"
                disabled={isFinal}
                onClick={() => openShipment(order)}
                className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-100 cursor-pointer shadow-2xs transition"
                title={order.courierBookingError || "Previous booking failed. Click to review and retry safely."}
              >
                <RotateCcw className="h-3 w-3" />
                <span>Retry booking</span>
              </button>
              {order.courierBookingError && (
                <span
                  className="max-w-[150px] truncate text-[9.5px] font-medium text-rose-600"
                  title={order.courierBookingError}
                >
                  {order.courierBookingError}
                </span>
              )}
            </div>
          ) : isDelivered ? (
            /* 3. Delivered -> Delivered + View details */
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-1">
                <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[9.5px] font-bold text-emerald-800">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Delivered
                </span>
                {isMockConsignment && (
                  <span className="rounded bg-stone-200 px-1 text-[8px] font-bold text-stone-600" title="Simulated consignment in development">
                    TEST
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openOrderDetails(order.id)}
                  className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-gray-600 hover:text-purple-700 cursor-pointer"
                >
                  <Eye className="h-2.5 w-2.5" />
                  View details
                </button>
                <CourierPrintAction
                  order={order}
                  className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-gray-500 hover:text-purple-700 cursor-pointer"
                  iconClassName="h-2.5 w-2.5"
                  iconOnly
                  ariaLabel="Open courier portal to print the official label"
                />
              </div>
            </div>
          ) : isInTransit ? (
            /* 4. In transit -> In transit + View tracking */
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-1">
                <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9.5px] font-bold text-blue-700">
                  <Truck className="h-2.5 w-2.5 animate-pulse" />
                  In transit
                </span>
                {isMockConsignment && (
                  <span className="rounded bg-stone-200 px-1 text-[8px] font-bold text-stone-600" title="Simulated consignment in development">
                    TEST
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {trackUrl ? (
                  <a
                    href={trackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-blue-700 hover:underline"
                    title="View courier tracking"
                  >
                    <span>View tracking</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      void copyValue(
                        String(order.consignmentId || order.trackingCode),
                        "Tracking Code"
                      )
                    }
                    className="truncate font-mono text-[9.5px] font-semibold text-gray-700 hover:text-purple-700 cursor-pointer max-w-[110px]"
                    title="Copy tracking code"
                  >
                    {order.trackingCode || order.consignmentId}
                  </button>
                )}
                <button
                  type="button"
                  disabled={checkingCourier}
                  onClick={async () => {
                    setCheckingCourier(true);
                    try {
                      await refreshShipment(
                        String(order.consignmentId || order.trackingCode),
                        false
                      );
                    } finally {
                      setCheckingCourier(false);
                    }
                  }}
                  className="text-gray-400 hover:text-blue-700 disabled:opacity-50 cursor-pointer"
                  title="Refresh tracking status"
                >
                  <RefreshCw className={`h-2.5 w-2.5 ${checkingCourier ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>
          ) : isConsignmentCancelled ? (
            /* 5a. Consignment cancelled at the courier — rebook or sync */
            <div className="flex flex-col items-start gap-1">
              <span
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[9.5px] font-bold text-rose-700"
                title="This parcel was cancelled at the courier. Re-book Steadfast or check status."
              >
                <XCircle className="h-2.5 w-2.5" />
                Cancelled
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {!isFinal && (
                  <button
                    type="button"
                    onClick={() => openShipment(order)}
                    className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-2 py-0.5 text-[9.5px] font-bold text-purple-700 hover:bg-purple-100 cursor-pointer shadow-2xs transition"
                    title="Re-book courier consignment for this order"
                  >
                    <Truck className="h-2.5 w-2.5" />
                    Re-book
                  </button>
                )}
                {hasConsignment && (
                  <button
                    type="button"
                    disabled={checkingCourier}
                    onClick={async () => {
                      setCheckingCourier(true);
                      try {
                        await refreshShipment(
                          String(order.consignmentId || order.trackingCode),
                          false
                        );
                      } finally {
                        setCheckingCourier(false);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[9.5px] font-bold text-gray-600 hover:border-purple-300 hover:text-purple-700 disabled:opacity-50 cursor-pointer"
                    title="Check latest status from Steadfast"
                  >
                    <RefreshCw className={`h-2.5 w-2.5 ${checkingCourier ? "animate-spin" : ""}`} />
                    {checkingCourier ? "Checking" : "Check"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openOrderDetails(order.id)}
                  className="text-[9.5px] font-semibold text-gray-500 hover:text-purple-700 cursor-pointer"
                >
                  Details
                </button>
              </div>
            </div>
          ) : isUnknownCourierStatus ? (
            /* 5b. Courier reported no recognizable status — commonly a portal
                   cancellation. Never display this as a successful booking. */
            <div className="flex flex-col items-start gap-1">
              <span
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[9.5px] font-bold text-amber-800"
                title="Steadfast did not return a recognizable status for this consignment. This commonly happens after the parcel is cancelled in the Steadfast portal — open the order and use 'Mark cancelled (portal)' if you cancelled it there."
              >
                <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
                Check Courier
              </span>
              <div className="flex items-center gap-1">
                <span className="truncate max-w-[95px] text-[9px] font-bold capitalize text-amber-700">
                  {courierStatusLabel}
                </span>
                <button
                  type="button"
                  onClick={() => openOrderDetails(order.id)}
                  className="text-[9.5px] font-semibold text-purple-700 hover:underline cursor-pointer"
                  title="Verify at the courier, then mark cancelled locally if needed"
                >
                  Verify / Mark cancelled
                </button>
              </div>
            </div>
          ) : isReturnOrException ? (
            /* 5. Return / Exception -> Attention required */
            <div className="flex flex-col items-start gap-1">
              <span
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[9.5px] font-bold text-amber-800"
                title={`Shipment status: ${courierStatusLabel}`}
              >
                <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
                Attention required
              </span>
              <div className="flex items-center gap-1.5">
                <span className="truncate max-w-[95px] text-[9px] font-bold capitalize text-amber-700">
                  {courierStatusLabel}
                </span>
                {hasConsignment && (
                  <button
                    type="button"
                    disabled={checkingCourier}
                    onClick={async () => {
                      setCheckingCourier(true);
                      try {
                        await refreshShipment(
                          String(order.consignmentId || order.trackingCode),
                          false
                        );
                      } finally {
                        setCheckingCourier(false);
                      }
                    }}
                    className="text-gray-400 hover:text-purple-700 disabled:opacity-50 cursor-pointer"
                    title="Refresh status from Steadfast"
                  >
                    <RefreshCw className={`h-2.5 w-2.5 ${checkingCourier ? "animate-spin" : ""}`} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openOrderDetails(order.id)}
                  className="text-[9.5px] font-semibold text-purple-700 hover:underline cursor-pointer"
                >
                  Details
                </button>
              </div>
            </div>
          ) : isBooked ? (
            /* 6. Booking successful -> Booked + tracking code */
            <>
              <div className="flex max-w-full flex-wrap items-center gap-1">
                {rawShipmentStatus === "in_review" ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[9.5px] font-bold text-sky-700"
                    title="Consignment booked with Steadfast, in hub review"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                    In Review
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9.5px] font-bold text-emerald-700" title="Manage courier shipment" aria-label="Manage courier shipment">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Booked
                  </span>
                )}
                {isMockConsignment && (
                  <span className="rounded bg-stone-200 px-1 text-[8px] font-bold text-stone-600" title="Simulated consignment in development">
                    TEST
                  </span>
                )}
              </div>

              <div className="flex max-w-full min-w-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    void copyValue(
                      String(order.consignmentId || order.trackingCode),
                      "Tracking Code"
                    )
                  }
                  className="truncate font-mono text-[10.5px] font-semibold text-gray-700 hover:text-purple-700 cursor-pointer"
                  title="Click to copy tracking code"
                >
                  {order.trackingCode || order.consignmentId}
                </button>
                {trackUrl && (
                  <a
                    href={trackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-gray-400 hover:text-purple-700"
                    title="Open courier tracking"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>

              <div className="flex items-center gap-1">
                <CourierPrintAction
                  order={order}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[9.5px] font-bold text-gray-600 hover:border-purple-300 hover:text-purple-700 cursor-pointer"
                  iconClassName="h-2.5 w-2.5"
                >
                  Open Steadfast
                </CourierPrintAction>
                <button
                  type="button"
                  disabled={checkingCourier}
                  onClick={async () => {
                    setCheckingCourier(true);
                    try {
                      await refreshShipment(
                        String(order.consignmentId || order.trackingCode),
                        false
                      );
                    } finally {
                      setCheckingCourier(false);
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9.5px] font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50 cursor-pointer"
                  title="Pull the latest delivery status from Steadfast"
                >
                  <RefreshCw className={`h-2.5 w-2.5 ${checkingCourier ? "animate-spin" : ""}`} />
                  {checkingCourier ? "Checking" : "Check"}
                </button>
              </div>
            </>
          ) : (
            /* 7. Not booked -> Send to Steadfast (with payment eligibility gating) */
            isOnlinePaymentPending ? (
              <div className="flex w-full min-w-0 flex-col items-start gap-1">
                <span
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800"
                  title="Online payment pending. Cannot book courier until payment is verified."
                >
                  <Clock className="h-3 w-3 shrink-0" />
                  Payment Pending
                </span>
                <div className="flex items-center gap-1 whitespace-nowrap text-[9.5px] font-semibold text-gray-500">
                  <button
                    type="button"
                    onClick={() => openPaymentDetails(order)}
                    className="text-purple-700 hover:underline cursor-pointer"
                  >
                    Verify payment
                  </button>
                  <span className="text-gray-300">·</span>
                  <span>to book courier</span>
                </div>
              </div>
            ) : isOnlinePaymentFailed ? (
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-800 opacity-60 cursor-not-allowed"
                title="Online payment failed. Cannot book courier."
              >
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>Payment Failed</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isFinal}
                onClick={() => openShipment(order)}
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-emerald-300 bg-emerald-600 px-2.5 py-1 text-[10.5px] font-bold text-white shadow-2xs transition hover:bg-emerald-700 disabled:opacity-40 cursor-pointer"
                title="Review parcel details and send to Steadfast"
              >
                <Truck className="h-3 w-3 shrink-0" />
                <span>Send to Steadfast</span>
              </button>
            )
          )}
        </div>

        {/* Total & Remaining / Advance Breakdown */}
        <div className="min-w-0 whitespace-nowrap">
          <p className="text-[13px] font-bold tabular-nums text-gray-900">
            {formatBDT(order.total)}
          </p>
          {(paymentStatus === "partially_paid" ||
            (order.paidAmount && order.paidAmount > 0 && order.paidAmount < Number(order.total))) ? (
            <div className="mt-0.5 space-y-0.5 text-[10px] leading-tight">
              <span className="block font-medium text-emerald-700">
                Adv: {formatBDT(order.paidAmount || 0)}
              </span>
              <span className="block font-bold text-amber-800">
                COD: {formatBDT(Math.max(0, Number(order.total || 0) - (order.paidAmount || 0)))}
              </span>
            </div>
          ) : (
            <p className="text-[10.5px] font-semibold text-purple-700">
              Due: {formatBDT(outstanding)}
            </p>
          )}
        </div>

        {/* Order Status */}
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => {
              setSelectedStatus(null);
              setStatusModal(order);
            }}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold capitalize transition cursor-pointer hover:shadow-xs hover:ring-1 hover:ring-purple-300 ${statusColor}`}
            title="Click to change order status"
          >
            {statusLabel}
          </button>
        </div>

        {/* Actions */}
        <div className="relative flex items-center justify-end gap-1.5">
          {order.status === "pending" && (
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                await state.handleStatusChange(order.id, "confirmed");
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer transition shadow-2xs"
              title="Confirm Order (Customer verified)"
            >
              <Check className="h-3 w-3 text-emerald-600" />
              <span>Confirm</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => openOrderDetails(order.id)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-purple-200 bg-purple-50/70 text-purple-700 hover:bg-purple-100 cursor-pointer transition shadow-2xs"
            title="View Order Details"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>

          <button
            ref={buttonRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={(e) => {
              e.stopPropagation();
              activeTriggerRef.current = e.currentTarget;
              setMenuOpen((prev) => !prev);
            }}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 transition shadow-2xs cursor-pointer ${
              menuOpen
                ? "bg-purple-100 text-purple-700 border-purple-300"
                : "bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            }`}
            title="More actions"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Responsive Mobile / Tablet Card (< lg) â€” zero horizontal overflow */}
      <div
        className={`lg:hidden p-4 space-y-3 transition ${
          isSelected ? "bg-purple-50/70" : "hover:bg-purple-50/20"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <input
              type="checkbox"
              aria-label={`Select order #${order.number || order.id}`}
              checked={isSelected}
              onChange={() => toggleSelectOrder(order.id)}
              className="h-4 w-4 rounded border-purple-300 accent-purple-600"
            />
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => openOrderDetails(order.id)}
                className="font-mono text-[13px] font-bold text-purple-700 hover:underline"
              >
                #{order.number || order.id}
              </button>
              <p
                className="text-[11px] text-gray-500"
                title={order.channel === "admin" ? "Admin Order" : "Website Order"}
              >
                {order.date_created
                  ? new Date(order.date_created).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "â€”"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedStatus(null);
              setStatusModal(order);
            }}
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold cursor-pointer transition hover:ring-1 hover:ring-purple-300 ${statusColor}`}
            title="Click to change order status"
          >
            {statusLabel}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl border border-purple-100/70 bg-purple-50/25 p-3 text-[12px]">
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 truncate">{custName}</p>
            <p className="font-mono text-[11px] text-gray-500 truncate">
              {order.billing?.phone || "No phone"}
            </p>
            <p className="text-[10.5px] text-gray-500 truncate">
              {productName} (x{productQty})
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold tabular-nums text-gray-900">{formatBDT(order.total)}</p>
            {(paymentStatus === "partially_paid" ||
              (order.paidAmount && order.paidAmount > 0 && order.paidAmount < Number(order.total))) ? (
              <div className="text-[10px] leading-tight mt-0.5 space-y-0.5">
                <span className="block font-medium text-emerald-700">
                  Adv: {formatBDT(order.paidAmount || 0)}
                </span>
                <span className="block font-bold text-amber-800">
                  COD: {formatBDT(Math.max(0, Number(order.total || 0) - (order.paidAmount || 0)))}
                </span>
              </div>
            ) : (
              <p className="text-[10.5px] font-semibold text-purple-700">
                Due: {formatBDT(outstanding)}
              </p>
            )}
            <div className="mt-1 flex items-center justify-end gap-1">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-bold ${paymentBadge.cls}`}
              >
                {paymentBadge.label}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {!isFinal && (
              <button
                type="button"
                disabled={bookingInProgress}
                onClick={() => openShipment(order)}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${
                  bookingInProgress
                    ? "border-amber-200 bg-amber-50 text-amber-800 opacity-70 cursor-not-allowed"
                    : "border-blue-200 bg-blue-50 text-blue-700"
                }`}
              >
                {bookingInProgress ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Truck className="h-3 w-3" />
                )}
                {bookingInProgress
                  ? "Booking…"
                  : hasCourier
                    ? `${order.courier || "Courier"} · ${shipmentStatusLabel}`
                    : "Send to Steadfast"}
              </button>
            )}
            {isUnpaidSsl && (
              <button
                type="button"
                onClick={() => state.setCodFallbackModal(order)}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-900"
              >
                Switch to COD
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {order.status === "pending" && (
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  await state.handleStatusChange(order.id, "confirmed");
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer transition shadow-2xs"
                title="Confirm Order (Customer verified)"
              >
                <Check className="h-3 w-3 text-emerald-600" />
                <span>Confirm</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => openOrderDetails(order.id)}
              className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs cursor-pointer hover:bg-purple-700 transition"
            >
              <Eye className="h-3 w-3" />
              View Order
            </button>
            <button
              ref={mobileButtonRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={(e) => {
                e.stopPropagation();
                activeTriggerRef.current = e.currentTarget;
                setMenuOpen((prev) => !prev);
              }}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 transition shadow-2xs cursor-pointer ${
                menuOpen
                  ? "bg-purple-100 text-purple-700 border-purple-300"
                  : "bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
              title="More actions"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Render Portal Dropdown / Dropup directly in document.body to avoid clipping */}
      {mounted && typeof document !== "undefined" && menuOpen && (
        createPortal(
          <div
            ref={menuNodeRef}
            role="menu"
            aria-orientation="vertical"
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: "186px",
              maxHeight: "calc(100vh - 16px)",
              overflowY: "auto",
              zIndex: 9999,
            }}
            className={`rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl space-y-0.5 text-[12px] font-medium animate-in fade-in-0 duration-150 ${
              coords.placeAbove ? "slide-in-from-bottom-2" : "slide-in-from-top-2"
            }`}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                openOrderDetails(order.id);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-700 cursor-pointer transition-colors"
            >
              <Eye className="h-3.5 w-3.5 text-gray-400" />
              View Details
            </button>
            <CourierPrintAction
              order={order}
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-700 cursor-pointer transition-colors"
              iconClassName="h-3.5 w-3.5 text-gray-400"
            >
              Open Steadfast Portal
            </CourierPrintAction>
            {!FINAL_STATUSES.includes(order.status) && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setSelectedStatus(null);
                  setStatusModal(order);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-700 cursor-pointer transition-colors"
              >
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                Change Status
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                openShipment(order);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-700 cursor-pointer transition-colors"
            >
              <Truck className="h-3.5 w-3.5 text-gray-400" />
              {hasCourier ? "Shipment Details" : "Send to Steadfast"}
            </button>

            {isUnpaidSsl && (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    openPaymentDetails(order);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-purple-700 hover:bg-purple-50 font-semibold cursor-pointer transition-colors"
                >
                  <CreditCard className="h-3.5 w-3.5 text-purple-600" />
                  Verify Payment
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    state.setCodFallbackModal(order);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-amber-800 hover:bg-amber-50 font-semibold cursor-pointer transition-colors"
                >
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  Switch to COD
                </button>
              </>
            )}

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                openPaymentDetails(order);
              }}
              title="View payment validation & history"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-700 cursor-pointer transition-colors"
            >
              <CreditCard className="h-3.5 w-3.5 text-gray-400" />
              Payment History
            </button>
            {order.status === "cancelled" && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  openOrderDetails(order.id);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-emerald-700 hover:bg-emerald-50 font-bold cursor-pointer transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5 text-emerald-600" />
                Reopen Order
              </button>
            )}
            <Link
              href={`/admin/orders/${encodeURIComponent(String(order.number || order.id))}`}
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
              Full Page
            </Link>
          </div>,
          document.body
        )
      )}
    </div>
  );
}

