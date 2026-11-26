"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Clock, FileText, Printer, RotateCcw, X } from "lucide-react";
import { getCourierLabel } from "@/server/courier/core/tracking";
import { getPaymentMethodLabel } from "@/lib/payment-methods";
import type { AccountOrderSummary } from "@/types/account";
import { formatAccountDate, formatBDT } from "./account-ui";

export function AccountInvoiceModal({
  order,
  onClose,
}: {
  order: AccountOrderSummary;
  onClose: () => void;
}) {
  const paymentStatus = String(order.paymentStatus || "pending").trim().toLowerCase();
  const isRefunded = paymentStatus === "refunded";
  const isPartiallyRefunded = paymentStatus === "partially_refunded";
  const isPaid =
    paymentStatus === "paid" ||
    isRefunded ||
    isPartiallyRefunded ||
    Boolean(order.paidAmount && order.paidAmount >= order.total);

  const paidAmount = order.paidAmount ?? (isPaid ? order.total : 0);
  const refundedAmount = order.refundSummary?.totalRefunded || 0;
  const balanceDue = Math.max(0, order.total - paidAmount);
  const subtotal = order.subtotal ?? order.total - (order.shippingFee || 0) + (order.discount || 0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Portal the modal to <body>: the print stylesheet can then print exactly
  // this sheet and nothing else — the page behind it takes no print space,
  // so the printout is never padded with blank pages.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      id="angkon-invoice-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
    >
      {/* Modal Card */}
      <div
        id="angkon-invoice-card"
        className="relative w-full max-w-3xl rounded-2xl bg-[#220407] border border-[#E1B76F]/40 shadow-2xl overflow-hidden my-auto"
      >
        {/* Modal Top Control Bar (Hidden on print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#2f060c] border-b border-[#E1B76F]/30 no-print">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#E1B76F]" />
            <span className="text-xs font-black uppercase tracking-wider text-white">
              Official Tax Invoice &amp; Receipt
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#E1B76F] px-3.5 py-1.5 text-xs font-black uppercase text-[#240407] hover:bg-[#edd19b] transition shadow-md cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" /> Print Invoice
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-stone-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              aria-label="Close invoice"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet Container */}
        <div
          id="angkon-printable-invoice"
          className="p-6 sm:p-8 bg-[#1f0306] text-stone-200 overflow-y-auto max-h-[82vh]"
        >
          {/* Brand Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-[#530911] gap-4">
            <div>
              <span className="font-heading text-2xl sm:text-3xl font-black uppercase tracking-tight text-white block">
                ANGKON
              </span>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#E1B76F] mt-0.5">
                Authentic Ethnic Luxury Apparel
              </p>
              <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                House 12, Road 4, Banani, Dhaka-1213, Bangladesh
                <br />
                Hotline: +880 1338-668899 • contact@angkon.com.bd
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#3b050b] text-[#E1B76F] border border-[#E1B76F]/30">
                Tax Invoice / Receipt
              </span>
              <p className="font-mono text-sm font-bold text-white mt-2">INV-{order.orderNumber}</p>
              <p className="text-xs text-stone-400 mt-0.5">
                Date: {formatAccountDate(order.createdAt)}
              </p>
            </div>
          </div>

          {/* Customer & Order Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-[#530911]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#E1B76F] mb-1.5">
                Billed &amp; Shipped To:
              </p>
              <p className="text-sm font-bold text-white">{order.customer.fullName}</p>
              <p className="text-xs text-stone-300 mt-0.5">{order.customer.phone}</p>
              {order.customer.email && <p className="text-xs text-stone-400">{order.customer.email}</p>}
              <p className="text-xs text-stone-300 mt-1.5 leading-relaxed">
                {order.customer.address}, {order.customer.city ? `${order.customer.city}, ` : ""}
                {order.customer.district}
                {order.customer.postalCode ? ` (${order.customer.postalCode})` : ""}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#E1B76F] mb-1.5">
                Order &amp; Payment Info:
              </p>
              <p className="text-xs text-stone-300">
                <span className="text-stone-400">Order ID:</span>{" "}
                <strong className="text-white font-mono">#{order.orderNumber}</strong>
              </p>
              <p className="text-xs text-stone-300 mt-1">
                <span className="text-stone-400">Payment Method:</span>{" "}
                <span className="font-semibold text-white">
                  {getPaymentMethodLabel(order.paymentMethod)}
                </span>
              </p>
              <p className="text-xs text-stone-300 mt-1">
                <span className="text-stone-400">Payment Status:</span>{" "}
                {isRefunded || isPartiallyRefunded ? (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-400">
                    <RotateCcw className="h-3 w-3" />{" "}
                    {isRefunded ? "REFUNDED" : "PARTIALLY REFUNDED"}
                  </span>
                ) : isPaid ? (
                  <span className="inline-flex items-center gap-1 font-bold text-green-400">
                    <CheckCircle2 className="h-3 w-3" /> PAID IN FULL
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-400">
                    <Clock className="h-3 w-3" /> CASH ON DELIVERY
                  </span>
                )}
              </p>
              {order.courier && (
                <p className="text-xs text-stone-300 mt-1">
                  <span className="text-stone-400">Assigned Courier:</span> {getCourierLabel(order.courier)}
                </p>
              )}
              {(order.trackingCode || order.consignmentId) && (
                <p className="text-xs text-stone-300 mt-1">
                  <span className="text-stone-400">Tracking Ref:</span>{" "}
                  <span className="font-mono text-white">{order.trackingCode || order.consignmentId}</span>
                </p>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#530911] text-stone-400 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 font-bold">Item Description</th>
                    <th className="py-2.5 font-bold text-center">Variant</th>
                    <th className="py-2.5 font-bold text-center">Qty</th>
                    <th className="py-2.5 font-bold text-right">Price</th>
                    <th className="py-2.5 font-bold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#530911]/60">
                  {order.items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02]">
                      <td className="py-3 pr-2">
                        <span className="font-semibold text-white block">{it.name}</span>
                        {it.color && <span className="text-[10px] text-stone-400">Color: {it.color}</span>}
                      </td>
                      <td className="py-3 text-center text-stone-300">
                        {it.size ? (
                          <span className="rounded bg-[#33070d] px-2 py-0.5 border border-[#530911] font-mono">
                            {it.size}
                          </span>
                        ) : (
                          "Standard"
                        )}
                      </td>
                      <td className="py-3 text-center font-bold text-white tabular-nums">{it.quantity}</td>
                      <td className="py-3 text-right text-stone-300 tabular-nums">{formatBDT(it.price)}</td>
                      <td className="py-3 text-right font-bold text-white tabular-nums">
                        {formatBDT(it.price * it.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Totals */}
          <div className="border-t border-[#530911] pt-4 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="text-xs text-stone-400 max-w-sm">
              <p className="font-semibold text-stone-300">Notice &amp; Terms:</p>
              <p className="mt-1 leading-relaxed text-[11px]">
                Goods once sold can be exchanged within 7 days in their original unused condition with tags
                intact. Please keep this official invoice for all returns and customer care.
              </p>
            </div>
            <div className="w-full sm:w-64 space-y-1.5 text-xs tabular-nums">
              <div className="flex justify-between text-stone-300">
                <span>Subtotal:</span>
                <span>{formatBDT(subtotal)}</span>
              </div>
              <div className="flex justify-between text-stone-300">
                <span>Home Delivery:</span>
                <span>{formatBDT(order.shippingFee || 0)}</span>
              </div>
              {Boolean(order.discount && order.discount > 0) && (
                <div className="flex justify-between text-[#E1B76F]">
                  <span>Discount {order.promoCode ? `(${order.promoCode})` : ""}:</span>
                  <span>-{formatBDT(order.discount)}</span>
                </div>
              )}
              <div className="border-t border-[#530911] pt-2 mt-2 flex justify-between text-sm font-black text-white">
                <span>Grand Total:</span>
                <span className="text-[#E1B76F]">{formatBDT(order.total)}</span>
              </div>
              <div className="flex justify-between text-xs text-stone-300 pt-1">
                <span>Amount Paid:</span>
                <span className="font-bold text-green-400">{formatBDT(paidAmount)}</span>
              </div>
              {refundedAmount > 0 && (
                <div className="flex justify-between text-xs text-stone-300">
                  <span>Refunded Amount:</span>
                  <span className="font-bold text-amber-400">-{formatBDT(refundedAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-stone-300">
                <span>Balance Due:</span>
                <span className={`font-bold ${balanceDue > 0 ? "text-amber-400" : "text-stone-400"}`}>
                  {formatBDT(balanceDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Invoice Footer Seal */}
          <div className="mt-8 pt-4 border-t border-[#530911] flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-400 gap-2">
            <span>Official Computer-Generated Tax Invoice • ANGKON Luxury Fashion</span>
            <span className="font-mono text-stone-400">Auth Token: ANG-{order.orderNumber.slice(-8)}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
