"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert, Truck, Wallet, X, XCircle } from "lucide-react";
import { formatBDT } from "../_types/orders.types";

export interface OrderCancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  customerName?: string;
  orderTotal: number;
  paymentMethod: string;
  paymentStatus: string;
  advancePaidAmount: number;
  isPrepaidVerified: boolean;
  courierProvider?: string;
  courierStatus?: string;
  consignmentId?: string;
  hasActiveShipment: boolean;
  isShipmentInTransit: boolean;
  onConfirmCancel: (reason: string) => Promise<boolean>;
}

export function OrderCancellationModal({
  isOpen,
  onClose,
  orderNumber,
  customerName,
  orderTotal,
  paymentMethod,
  paymentStatus,
  advancePaidAmount,
  isPrepaidVerified,
  courierProvider,
  courierStatus,
  consignmentId,
  hasActiveShipment,
  isShipmentInTransit,
  onConfirmCancel,
}: OrderCancellationModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const trimmedReason = reason.trim();
  const isReasonValid = trimmedReason.length >= 3;
  const isBlockedByCourier = hasActiveShipment || isShipmentInTransit;
  const canSubmit = !submitting && isReasonValid && !isBlockedByCourier;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const success = await onConfirmCancel(trimmedReason);
      if (success) {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 shadow-2xs">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 id="cancel-modal-title" className="text-[16px] font-bold text-gray-900">
                Cancel Order #{orderNumber}
              </h3>
              <p className="text-[12px] text-gray-500">
                {customerName ? `${customerName} · ` : ""}Total: {formatBDT(orderTotal)}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl p-1.5 text-gray-400 hover:bg-stone-100 hover:text-gray-700 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12px] font-medium text-rose-800">
            {error}
          </div>
        )}

        {/* Courier Shipment Status */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-500">
            <span className="flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-purple-600" /> Courier Shipment Status
            </span>
            <span className="font-mono text-gray-700 font-semibold">{courierProvider || "None"}</span>
          </div>

          {isShipmentInTransit ? (
            <div className="rounded-xl border border-rose-300 bg-rose-50/90 p-3 text-[12px] text-rose-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                Parcel is in transit with courier
              </p>
              <p className="text-[11px] text-rose-800">
                Consignment <strong className="font-mono">{consignmentId}</strong> has already been picked up or is out for delivery. You must request a return or recall from the courier before cancelling this order.
              </p>
            </div>
          ) : hasActiveShipment ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3 text-[12px] text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                Active courier consignment exists ({consignmentId || "Active"})
              </p>
              <p className="text-[11px] text-amber-800">
                Steadfast consignment must be cancelled in the Shipment tab (or courier portal) before the order can be cancelled.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 text-[11.5px] text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>No active courier consignment. Safe to cancel without courier conflict.</span>
            </div>
          )}
        </div>

        {/* Payment Status & Refund Requirement */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-500">
            <span className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-purple-600" /> Payment & Refund Requirement
            </span>
            <span className="uppercase text-gray-700 font-semibold">{paymentMethod}</span>
          </div>

          {isPrepaidVerified || advancePaidAmount > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-[12px] text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                Refund Required ({formatBDT(advancePaidAmount)} captured)
              </p>
              <p className="text-[11px] text-amber-800">
                Customer has made a payment of <strong>{formatBDT(advancePaidAmount)}</strong>. Cancelling this order releases reserved inventory, but does <em>not</em> automatically return funds. Please process a refund through the <strong>Payments</strong> panel.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-2.5 text-[11.5px] text-stone-700">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Cash on Delivery: No customer payment collected (৳0 refund required).</span>
            </div>
          )}
        </div>

        {/* Stock Return Guarantee */}
        <div className="flex items-center gap-2 text-[11px] text-gray-500 bg-purple-50/50 border border-purple-100 rounded-xl p-2.5">
          <span className="text-[14px]">📦</span>
          <span>Inventory items will be released back to product stock automatically upon cancellation.</span>
        </div>

        {/* Cancellation Reason Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="cancel-order-reason" className="text-[12px] font-bold text-gray-800">
              Cancellation Reason <span className="text-rose-500">*</span>
            </label>
            <span className={`text-[10.5px] font-mono ${trimmedReason.length < 3 ? "text-gray-400" : "text-emerald-600 font-bold"}`}>
              {trimmedReason.length} / min 3 chars
            </span>
          </div>
          <textarea
            id="cancel-order-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={submitting}
            placeholder="Reason for cancellation (e.g. Customer requested via phone, Duplicate order, Out of stock)..."
            className="w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-[12.5px] text-gray-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition resize-none disabled:bg-stone-50"
          />
          {trimmedReason.length > 0 && trimmedReason.length < 3 && (
            <p className="text-[11px] text-rose-600">Please provide at least 3 characters for the audit record.</p>
          )}
          <p className="text-[10px] text-gray-400">
            This reason is recorded in the immutable administrative audit trail with your user identifier.
          </p>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-stone-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-gray-700 hover:bg-stone-50 transition cursor-pointer"
          >
            Keep Order
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2.5 text-[12px] font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Cancelling…
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5" />
                Confirm & Cancel Order
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
