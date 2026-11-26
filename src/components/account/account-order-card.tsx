"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  MapPin,
  MessageCircle,
  Package,
  RefreshCw,
  Truck,
  XCircle,
} from "lucide-react";
import { getCourierLabel, getCourierTrackingUrl } from "@/server/courier/core/tracking";
import { getPaymentMethodLabel, isOnlinePaymentMethod } from "@/lib/payment-methods";
import {
  evaluateCustomerCancellationEligibility,
  type CustomerCancellationDecision,
} from "@/server/orders/workflow";
import {
  buildCustomerOrderPresentation,
  ORDER_TIMELINE_STEPS,
} from "@/lib/account-order-view";
import { useCartStore } from "@/store/cart-store";
import type { AccountNotice, AccountOrderSummary } from "@/types/account";
import { formatAccountDate, formatBDT } from "./account-ui";

interface AccountOrderCardProps {
  order: AccountOrderSummary;
  initialExpanded?: boolean;
  withdrawingOrder: string | null;
  onOpenInvoice: (order: AccountOrderSummary) => void;
  onRequestCancellation: (order: AccountOrderSummary) => void;
  onWithdrawCancellation: (orderNumber: string) => Promise<void>;
  onNotice: (notice: AccountNotice) => void;
}

const STATUS_PILL_STYLES: Record<string, string> = {
  gold: "border-[#E1B76F]/45 bg-[#2b0408] text-[#F5D08A]",
  emerald: "border-emerald-400/45 bg-emerald-950/70 text-emerald-200",
  amber: "border-amber-400/45 bg-amber-950/70 text-amber-200",
  rose: "border-rose-400/45 bg-[#4f0812] text-rose-200",
  sky: "border-sky-400/45 bg-sky-950/70 text-sky-200",
  neutral: "border-white/25 bg-[#2b0408] text-white/90",
};

export function getOrderCancellationDecision(order: AccountOrderSummary): CustomerCancellationDecision {
  const decision = order.cancellationEligibility || evaluateCustomerCancellationEligibility(order);
  const lockedByShipment = [
    "booked",
    "created",
    "pickup_pending",
    "in_review",
    "hold",
    "booking_pending",
    "picked_up",
    "in_transit",
    "out_for_delivery",
    "delivered",
    "partial_delivered",
    "return_initiated",
    "returned",
  ].includes(String(order.shipmentStatus || "").toLowerCase());
  if (lockedByShipment && decision.canCancel) {
    return {
      ...decision,
      canCancel: false,
      mode: "none",
      customerNotice: "Parcel already handed to courier — online cancellation unavailable.",
    };
  }
  return decision;
}

export function AccountOrderCard({
  order,
  initialExpanded = false,
  withdrawingOrder,
  onOpenInvoice,
  onRequestCancellation,
  onWithdrawCancellation,
  onNotice,
}: AccountOrderCardProps) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [copiedField, setCopiedField] = useState<"order" | "track" | null>(null);

  const isOnline = isOnlinePaymentMethod(order.paymentMethod);
  const view = buildCustomerOrderPresentation({
    ...order,
    isOnlinePayment: isOnline,
  });

  const cancelInfo = getOrderCancellationDecision(order);
  const canRequestCancellation = cancelInfo.canCancel;

  const subtotal = order.subtotal ?? order.total - (order.shippingFee || 0) + (order.discount || 0);
  const pStatus = String(order.paymentStatus || "pending").trim().toLowerCase();
  const paidAmount = order.paidAmount ?? (pStatus === "paid" ? order.total : 0);
  const balanceDue = Math.max(0, order.total - paidAmount);
  const totalRefunded = order.refundSummary?.totalRefunded || 0;

  const trackUrl = getCourierTrackingUrl(order.courier, order.trackingCode, order.consignmentId);
  const trackingRef = order.trackingCode || order.consignmentId;
  const internalTrackHref = `/track?orderNumber=${encodeURIComponent(order.orderNumber)}${
    order.customer?.phone ? `&phone=${encodeURIComponent(order.customer.phone)}` : ""
  }`;

  const previewItems = order.items.slice(0, 2);
  const extraItemsCount = Math.max(0, order.items.length - 2);

  const handleCopy = async (text: string, field: "order" | "track") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField((prev) => (prev === field ? null : prev)), 1800);
    } catch {
      /* ignore clipboard refusal */
    }
  };

  const handleReorder = () => {
    const store = useCartStore.getState();
    let count = 0;
    for (const item of order.items) {
      if (!item.productId) continue;
      store.addItem({
        productId: item.productId,
        slug: item.slug || String(item.productId),
        name: item.name,
        image: item.image || "/placeholder.png",
        price: Number(item.price) || 0,
        size: item.size || "",
        color: item.color,
        quantity: Math.max(1, Number(item.quantity) || 1),
        shippingClassId: 0,
        deliveryInside: 0,
        deliveryOutside: 0,
      });
      count += 1;
    }
    if (count > 0) {
      onNotice({ text: `Added items from #${order.orderNumber} to your shopping bag.`, type: "success" });
    }
  };

  const whatsappUrl = `https://wa.me/8801338668899?text=${encodeURIComponent(
    `Hello ANGKON Concierge, I need help with Order #${order.orderNumber}.`
  )}`;

  return (
    <article
      id={`order-${order.orderNumber}`}
      className={`rounded-2xl border bg-[#3b050b] transition shadow-xl overflow-hidden ${
        initialExpanded
          ? "border-[#E1B76F] ring-1 ring-[#E1B76F]/35"
          : "border-[#E1B76F]/25 hover:border-[#E1B76F]/55"
      }`}
    >
      <div className="p-5 sm:p-6 space-y-4">
        {/* 1. Clean 2-Sided Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleCopy(order.orderNumber, "order")}
                title="Copy order number"
                className="inline-flex items-center gap-1.5 font-mono text-base font-bold text-white hover:text-[#E1B76F] transition cursor-pointer"
              >
                #{order.orderNumber}
                {copiedField === "order" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-white/55" />
                )}
              </button>
              <span className="text-white/40">•</span>
              <span className="text-xs sm:text-[13px] text-[#EADBC8]">
                {formatAccountDate(order.createdAt)}
              </span>
            </div>
            <p className="mt-1 text-xs text-white/75">
              {getPaymentMethodLabel(order.paymentMethod)} • Deliver to{" "}
              <span className="text-white/95 font-medium">
                {order.customer.city ? `${order.customer.city}, ` : ""}
                {order.customer.district}
              </span>
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1.5">
            <div className="flex items-center gap-2.5">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                  STATUS_PILL_STYLES[view.statusPill.tone]
                }`}
              >
                {view.statusPill.label}
              </span>
              <span className="text-lg font-black text-[#E1B76F] tabular-nums">
                {formatBDT(order.total)}
              </span>
            </div>
            <span className="text-xs text-[#F5EAE0] font-medium">{view.paymentCaption}</span>
          </div>
        </div>

        {/* 2. Plain-English Status Summary & 4-Step Timeline */}
        <div className="rounded-xl border border-[#E1B76F]/20 bg-[#2b0408] p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-xs sm:text-[13px] text-white font-medium leading-relaxed">
              {view.summaryLine}
            </p>

            {trackingRef && (
              <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
                <span className="inline-flex items-center gap-1 font-mono text-[#E1B76F]">
                  <Truck className="h-3.5 w-3.5" />
                  {trackingRef}
                </span>
                <Link
                  href={internalTrackHref}
                  className="rounded-lg border border-[#E1B76F]/35 bg-[#3b050b] px-2.5 py-1 text-[11px] font-bold text-white hover:border-[#E1B76F] transition"
                >
                  Track
                </Link>
              </div>
            )}
          </div>

          {view.stageIndex >= 0 && (
            <div className="grid grid-cols-4 gap-2 pt-0.5">
              {ORDER_TIMELINE_STEPS.map((step, idx) => {
                const completed = idx < view.stageIndex;
                const active = idx === view.stageIndex;
                return (
                  <div key={step.key} className="space-y-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        completed
                          ? "bg-emerald-400"
                          : active
                          ? "bg-[#E1B76F]"
                          : "bg-white/15"
                      }`}
                    />
                    <p
                      className={`text-[11px] sm:text-xs font-semibold truncate ${
                        completed
                          ? "text-emerald-200"
                          : active
                          ? "text-[#E1B76F] font-bold"
                          : "text-white/50"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Simple Scannable Product Preview (max 2 items when collapsed) */}
        <div className="space-y-2">
          {previewItems.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 rounded-xl border border-[#E1B76F]/15 bg-[#2b0408]/80 px-3 py-2.5"
            >
              <div className="flex items-center gap-3 min-w-0">
                {item.image && (
                  <div className="relative h-11 w-11 rounded-lg overflow-hidden shrink-0 border border-[#E1B76F]/25 bg-[#210306]">
                    <Image src={item.image} alt={item.name} fill sizes="44px" className="object-cover" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-white truncate">{item.name}</p>
                  <p className="text-xs text-[#EADBC8] mt-0.5">
                    {item.size ? `Size ${item.size} • ` : ""}
                    Qty {item.quantity}
                  </p>
                </div>
              </div>
              <span className="text-xs sm:text-sm font-bold text-[#F5EAE0] tabular-nums shrink-0">
                {formatBDT(item.price * item.quantity)}
              </span>
            </div>
          ))}
          {extraItemsCount > 0 && !expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-xs font-semibold text-[#E1B76F] hover:underline pl-1 cursor-pointer"
            >
              + {extraItemsCount} more item{extraItemsCount > 1 ? "s" : ""} — View all details
            </button>
          )}
        </div>

        {/* 4. Clean Action Footer */}
        <div className="pt-3 border-t border-[#E1B76F]/15 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#EADBC8]">
            {order.cancellationRequest?.status === "requested" ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-amber-400/45 bg-amber-950/60 px-2.5 py-1 text-[11px] font-bold text-amber-200">
                  Cancellation request pending review
                </span>
                {cancelInfo.canWithdraw && (
                  <button
                    type="button"
                    disabled={withdrawingOrder === order.orderNumber}
                    onClick={() => void onWithdrawCancellation(order.orderNumber)}
                    className="rounded-lg border border-white/25 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/10 disabled:opacity-50 cursor-pointer"
                  >
                    {withdrawingOrder === order.orderNumber ? "Withdrawing…" : "Withdraw"}
                  </button>
                )}
              </div>
            ) : order.cancellationRequest?.status === "rejected" ? (
              <span className="text-rose-200 font-medium">
                Cancellation declined{order.cancellationRequest.reviewNote ? `: ${order.cancellationRequest.reviewNote}` : ""}
              </span>
            ) : cancelInfo.customerNotice ? (
              <span>{cancelInfo.customerNotice}</span>
            ) : (
              <span>Need receipt or help?</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {view.canPayNow && (
              <Link
                href={`/account/orders/${encodeURIComponent(order.orderNumber)}/payment`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#E1B76F] to-[#edd19b] px-4 py-2 text-xs font-black uppercase text-[#2a0408] hover:brightness-105 transition shadow-md"
              >
                <CreditCard className="h-3.5 w-3.5" /> Complete Payment
              </Link>
            )}

            {canRequestCancellation && (
              <button
                type="button"
                onClick={() => onRequestCancellation(order)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300/40 bg-[#4f0812] px-3.5 py-2 text-xs font-bold uppercase text-rose-100 hover:border-rose-300 hover:bg-[#5e0b16] transition cursor-pointer"
              >
                <XCircle className="h-3.5 w-3.5" />
                {cancelInfo.mode === "request" ? "Request Cancel" : "Cancel Order"}
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenInvoice(order)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E1B76F]/35 bg-[#2b0408] px-3.5 py-2 text-xs font-bold uppercase text-[#E1B76F] hover:border-[#E1B76F] transition cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" /> Invoice
            </button>

            <a
              href={`/api/orders/${encodeURIComponent(order.orderNumber)}/invoice`}
              download={`ANGKON-Invoice-${order.orderNumber}.pdf`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E1B76F]/35 bg-[#2b0408] px-3 py-2 text-xs font-bold uppercase text-[#E1B76F] hover:border-[#E1B76F] transition"
              title="Download PDF Invoice"
            >
              <Download className="h-3.5 w-3.5" /> PDF
            </a>

            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-xl border border-white/25 bg-[#2b0408] px-3.5 py-2 text-xs font-bold uppercase text-white hover:border-[#E1B76F]/60 transition cursor-pointer"
              aria-expanded={expanded}
            >
              {expanded ? (
                <>
                  Hide Details <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  View Details <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Full Receipt, Delivery Address, Refund Ledger & Concierge */}
      {expanded && (
        <div className="border-t border-[#E1B76F]/20 bg-[#2b0408] p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Full Items + Delivery Address */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-2xl border border-[#E1B76F]/20 bg-[#3b050b] p-4 space-y-1.5 text-xs">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#E1B76F] flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Delivery Destination
                </p>
                <p className="font-bold text-white text-sm">{order.customer.fullName}</p>
                <p className="text-[#F5EAE0]">{order.customer.phone}</p>
                <p className="text-white/85 leading-relaxed">
                  {order.customer.address}, {order.customer.city ? `${order.customer.city}, ` : ""}
                  {order.customer.district}
                  {order.customer.postalCode ? ` — ${order.customer.postalCode}` : ""}
                </p>
                {(order.courier || trackUrl) && (
                  <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
                    {order.courier && (
                      <span className="text-[#EADBC8]">
                        Courier: <strong className="text-white">{getCourierLabel(order.courier)}</strong>
                      </span>
                    )}
                    {trackUrl && (
                      <a
                        href={trackUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-[#E1B76F] hover:underline"
                      >
                        Open Courier Tracking <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {order.items.length > 2 && (
                <div className="rounded-2xl border border-[#E1B76F]/20 bg-[#3b050b] p-4 space-y-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#E1B76F] flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" /> All Items ({order.items.length})
                  </p>
                  <div className="divide-y divide-[#E1B76F]/15">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 py-2 text-xs">
                        <div className="min-w-0">
                          {item.slug ? (
                            <Link
                              href={`/products/${encodeURIComponent(item.slug)}`}
                              className="font-semibold text-white hover:text-[#E1B76F] transition"
                            >
                              {item.name}
                            </Link>
                          ) : (
                            <span className="font-semibold text-white">{item.name}</span>
                          )}
                          <p className="text-[#EADBC8] mt-0.5">
                            {item.size ? `Size ${item.size} • ` : ""}
                            {item.color ? `${item.color} • ` : ""}
                            {item.quantity} × {formatBDT(item.price)}
                          </p>
                        </div>
                        <span className="font-bold text-white tabular-nums shrink-0">
                          {formatBDT(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Totals, Refunds & Quick Support */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-[#E1B76F]/20 bg-[#3b050b] p-4 space-y-2 text-xs tabular-nums">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#E1B76F] mb-2">
                  Price Summary
                </p>
                <div className="flex justify-between text-[#F5EAE0]">
                  <span>Items Subtotal</span>
                  <span>{formatBDT(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#F5EAE0]">
                  <span>Delivery Fee</span>
                  <span>{formatBDT(order.shippingFee || 0)}</span>
                </div>
                {Boolean(order.discount && order.discount > 0) && (
                  <div className="flex justify-between text-[#E1B76F]">
                    <span>Discount {order.promoCode ? `(${order.promoCode})` : ""}</span>
                    <span>-{formatBDT(order.discount)}</span>
                  </div>
                )}
                <div className="border-t border-[#E1B76F]/15 pt-2 mt-2 flex justify-between font-black text-white text-sm">
                  <span>Total</span>
                  <span className="text-[#E1B76F]">{formatBDT(order.total)}</span>
                </div>
                <div className="flex justify-between text-[#F5EAE0]">
                  <span>Paid</span>
                  <span className="font-bold text-emerald-300">{formatBDT(paidAmount)}</span>
                </div>
                {totalRefunded > 0 && (
                  <div className="flex justify-between text-sky-200">
                    <span>Refunded</span>
                    <span className="font-bold">-{formatBDT(totalRefunded)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#F5EAE0]">
                  <span>Balance Due</span>
                  <span className={balanceDue > 0 ? "font-bold text-amber-200" : "text-white/70"}>
                    {formatBDT(balanceDue)}
                  </span>
                </div>
              </div>

              {(order.refunds?.length || order.cancellationDetails?.reason) && (
                <div className="rounded-2xl border border-[#E1B76F]/20 bg-[#3b050b] p-4 space-y-2 text-xs">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#E1B76F]">
                    Refund &amp; Cancellation Status
                  </p>
                  {order.cancellationDetails?.reason && (
                    <p className="text-[#F5EAE0] leading-relaxed">
                      Reason: {order.cancellationDetails.reason}
                    </p>
                  )}
                  {order.refunds?.map((ref) => (
                    <div
                      key={ref.refundId}
                      className="rounded-xl border border-[#E1B76F]/15 bg-[#2b0408] p-2.5 flex items-center justify-between gap-2"
                    >
                      <div>
                        <p className="font-mono text-[11px] font-bold text-white">{ref.refundId}</p>
                        <p className="text-[11px] text-[#EADBC8] mt-0.5">
                          {ref.refundChannel === "manual_offline"
                            ? ref.refundMethod || "Manual Refund"
                            : "Online Refund"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="block font-bold text-[#E1B76F] tabular-nums">
                          {formatBDT(ref.amount)}
                        </span>
                        <span className="inline-block text-[10px] font-bold uppercase text-sky-200">
                          {ref.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleReorder}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E1B76F]/40 bg-[#3b050b] px-3.5 py-2.5 text-xs font-bold uppercase text-[#E1B76F] hover:bg-[#4c0810] transition cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Buy Again
                </button>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-950/50 px-3.5 py-2.5 text-xs font-bold uppercase text-emerald-200 hover:bg-emerald-900/60 transition"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Help
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
