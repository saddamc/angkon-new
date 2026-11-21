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
  Printer,
  RotateCcw,
} from "lucide-react";
import { getCourierTrackingUrl, getCourierLabel } from "@/server/courier/tracking";
import { CourierLogo } from "@/components/admin/courier-logo";
import { printCourierLabel } from "./print-label";
import { WhatsAppIcon } from "./whatsapp-icon";
import { ProductThumbnail } from "./product-thumbnail";
import { getOrderActionCategory } from "./needs-action-helper";
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
  const productName = firstItem?.name ?? "—";
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
  const shipmentStatusLabel = (order.shipmentStatus || "none").replace(/_/g, " ");

  const isSslcommerz = (order.paymentMethod || "").toLowerCase() === "sslcommerz";
  const isUnpaidSsl = isSslcommerz && paymentStatus !== "paid" && !isFinal;
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
    <div className="group border-b border-gray-100 last:border-b-0">
      {/* Desktop Table Row */}
      <div
        className={`hidden lg:grid grid-cols-[28px_minmax(130px,1.15fr)_minmax(150px,1.2fr)_minmax(170px,1.3fr)_100px_130px_90px_110px_90px] items-center gap-2.5 px-5 py-3.5 text-left transition ${
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
          <p className="text-[11px] text-gray-500">
            {order.date_created
              ? new Date(order.date_created).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "—"}
          </p>
          <span className="inline-block mt-0.5 rounded-md bg-stone-100 px-1.5 py-0.5 text-[9.5px] font-medium text-stone-700">
            {order.channel === "admin" ? "Admin Order" : "Website Order"}
          </span>
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
              {itemCount > 1 ? `${itemCount} items · ` : ""}Qty: {productQty}
              {firstItem?.size ? ` · Size: ${firstItem.size}` : ""}
            </p>
          </div>
        </div>

        {/* Payment Method & Independent Status */}
        <div className="flex flex-col items-start gap-1 min-w-0">
          <span
            className={`rounded-md border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-tight ${
              isSslcommerz
                ? "border-purple-200 bg-purple-50 text-purple-700"
                : "border-stone-200 bg-stone-50 text-stone-700"
            }`}
          >
            {isSslcommerz ? "SSLCOMMERZ" : "COD"}
          </span>
          <button
            type="button"
            onClick={() => openPaymentDetails(order)}
            title="View payment validation & history"
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.2 text-[9.5px] font-bold cursor-pointer hover:shadow-xs transition ${paymentBadge.cls}`}
          >
            {paymentBadge.label}
          </button>
        </div>

        {/* Courier & Shipment Status */}
        <div className="flex flex-col items-start gap-1 min-w-0">
          {hasCourier ? (
            <>
              <button
                type="button"
                onClick={() => openShipment(order)}
                className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-bold capitalize transition hover:shadow-xs cursor-pointer ${shipmentBadgeTone}`}
                title="Manage courier shipment"
                aria-label="Manage courier shipment"
              >
                <CourierLogo provider={order.courier || "steadfast"} size="xs" className="shrink-0" />
                <span className="truncate">
                  {getCourierLabel(order.courier).replace(" Courier", "")}
                </span>
              </button>
              {(order.trackingCode || order.consignmentId) && (
                <div className="flex max-w-full items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      void copyValue(
                        String(order.trackingCode || order.consignmentId),
                        "Tracking code"
                      )
                    }
                    className="truncate font-mono text-[10.5px] text-gray-500 hover:text-purple-600 cursor-pointer"
                    title="Click to copy tracking code"
                  >
                    {order.trackingCode || order.consignmentId}
                  </button>
                  {trackUrl && (
                    <a
                      href={trackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-purple-600 shrink-0"
                      title="Track on courier portal"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      printCourierLabel(order);
                    }}
                    className="text-gray-400 hover:text-purple-600 shrink-0"
                    title="Print 4x6 Shipping Label"
                  >
                    <Printer className="h-2.5 w-2.5" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              type="button"
              disabled={isFinal}
              onClick={() => openShipment(order)}
              className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 px-2 py-0.5 text-[10px] font-bold shadow-2xs cursor-pointer transition"
              title="Ship with Steadfast Courier"
            >
              <Truck className="h-3 w-3 text-purple-600 shrink-0" />
              <span>Ship Steadfast</span>
            </button>
          )}
        </div>

        {/* Total & Remaining / Advance Breakdown */}
        <div className="min-w-0">
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
        <div>
          <button
            type="button"
            disabled={FINAL_STATUSES.includes(order.status)}
            onClick={() => {
              if (!FINAL_STATUSES.includes(order.status)) {
                setSelectedStatus(null);
                setStatusModal(order);
              }
            }}
            className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold capitalize transition ${
              FINAL_STATUSES.includes(order.status)
                ? "opacity-75 cursor-not-allowed"
                : "cursor-pointer hover:shadow-xs"
            } ${statusColor}`}
          >
            {statusLabel}
          </button>
        </div>

        {/* Actions */}
        <div className="relative flex items-center justify-end gap-1.5">
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

      {/* Prioritized Needs Action Strip */}
      {showActionStrip && actionCategory && (
        <div className="hidden lg:flex items-center justify-between gap-3 border-t border-purple-100/70 bg-purple-50/30 px-5 py-2 text-[11.5px]">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${actionCategory.badgeTone}`}
            >
              <AlertCircle className="h-3 w-3 shrink-0" />
              {actionCategory.label}
            </span>
            <span className="truncate text-gray-700 max-w-[500px]">
              {actionCategory.reason}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {actionCategory.actionKind === "verify_payment" && (
              <>
                <button
                  type="button"
                  onClick={() => openPaymentDetails(order)}
                  className="rounded-lg border border-purple-300 bg-white px-2.5 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-50 transition cursor-pointer"
                >
                  Verify Gateway
                </button>
                <button
                  type="button"
                  onClick={() => state.setCodFallbackModal(order)}
                  className="rounded-lg bg-purple-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-purple-700 transition cursor-pointer"
                >
                  Switch to COD
                </button>
              </>
            )}

            {actionCategory.actionKind === "confirm_order" && (
              <button
                type="button"
                onClick={() => {
                  setSelectedStatus("confirmed");
                  setStatusModal(order);
                }}
                className="rounded-lg bg-orange-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-orange-700 transition cursor-pointer"
              >
                Confirm Order
              </button>
            )}

            {actionCategory.actionKind === "book_shipment" && (
              <button
                type="button"
                onClick={() => openShipment(order)}
                className="rounded-lg bg-purple-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-purple-700 transition cursor-pointer"
              >
                Send to Steadfast
              </button>
            )}

            {actionCategory.actionKind === "retry_booking" && (
              <button
                type="button"
                onClick={() => openShipment(order)}
                className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-700 transition cursor-pointer"
              >
                Retry Booking
              </button>
            )}

            {actionCategory.actionKind === "view_delivery" && (
              <button
                type="button"
                onClick={() => openShipment(order)}
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                Inspect Tracking
              </button>
            )}

            {actionCategory.actionKind === "settle_cod" && (
              <Link
                href={`/admin/orders/${encodeURIComponent(String(order.number || order.id))}`}
                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition"
              >
                Settle Courier COD
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Responsive Mobile / Tablet Card (< lg) — zero horizontal overflow */}
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
              <p className="text-[11px] text-gray-500">
                {order.date_created
                  ? new Date(order.date_created).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </p>
              <span className="inline-block mt-0.5 rounded-md bg-stone-100 px-1.5 py-0.5 text-[9.5px] font-medium text-stone-700">
                {order.channel === "admin" ? "Admin Order" : "Website Order"}
              </span>
            </div>
          </div>

          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${statusColor}`}
          >
            {statusLabel}
          </span>
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
                onClick={() => openShipment(order)}
                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700"
              >
                <Truck className="h-3 w-3" />
                {hasCourier ? `${order.courier || "Courier"} · ${shipmentStatusLabel}` : "Send to Courier"}
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
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                printCourierLabel(order);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-gray-700 hover:bg-purple-50 hover:text-purple-700 cursor-pointer transition-colors"
            >
              <Printer className="h-3.5 w-3.5 text-gray-400" />
              Print Slip
            </button>
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
              {hasCourier ? "Shipment Details" : "Send to Courier"}
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
