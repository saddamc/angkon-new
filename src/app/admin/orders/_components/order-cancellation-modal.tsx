"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Package,
  ShieldAlert,
  Truck,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { formatBDT, type OrderRefundSummaryUI } from "../_types/orders.types";

export interface CancelConfirmOptions {
  cancelDecision: "cancel_only" | "cancel_and_refund";
  adminNote?: string;
  refund?: {
    amount: number;
    reason: string;
    channel?: "sslcommerz" | "manual_offline";
    method?: string;
    reference?: string;
    refundDate?: string;
  };
}

export interface OrderCancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  orderStatus?: string;
  customerName?: string;
  orderTotal: number;
  items?: Array<{
    productId: number;
    name: string;
    quantity: number;
    price: number;
    size?: string;
    color?: string;
  }>;
  paymentMethod: string;
  paymentStatus: string;
  advancePaidAmount: number;
  isPrepaidVerified: boolean;
  refundSummary?: OrderRefundSummaryUI;
  courierProvider?: string;
  courierStatus?: string;
  consignmentId?: string;
  hasActiveShipment: boolean;
  isShipmentInTransit: boolean;
  onConfirmCancel: (reason: string, options?: CancelConfirmOptions) => Promise<boolean>;
}

export function OrderCancellationModal({
  isOpen,
  onClose,
  orderNumber,
  orderStatus,
  customerName,
  orderTotal,
  items = [],
  paymentMethod,
  paymentStatus,
  advancePaidAmount,
  isPrepaidVerified,
  refundSummary,
  courierProvider,
  courierStatus,
  consignmentId,
  hasActiveShipment,
  isShipmentInTransit,
  onConfirmCancel,
}: OrderCancellationModalProps) {
  const captured = refundSummary?.capturedAmount ?? advancePaidAmount;
  const completedRefunds = refundSummary?.completedRefundAmount ?? 0;
  const pendingRefunds = refundSummary?.pendingRefundAmount ?? 0;
  const availableRefundable =
    refundSummary?.availableRefundableAmount ?? Math.max(0, captured - completedRefunds - pendingRefunds);

  const hasGatewayAttempt = Boolean(
    refundSummary?.eligibleGatewayAttempts?.some((a) => a.available > 0 && a.bankTranId && a.valId)
  );

  const [reason, setReason] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [decision, setDecision] = useState<"cancel_only" | "cancel_and_refund">("cancel_only");
  const [refundAmount, setRefundAmount] = useState<string>(
    availableRefundable > 0 ? String(availableRefundable) : ""
  );
  const [offlineMethod, setOfflineMethod] = useState("bkash");
  const [offlineReference, setOfflineReference] = useState("");
  const [offlineDate, setOfflineDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const trimmedReason = reason.trim();
  const isReasonValid = trimmedReason.length >= 3;
  const isBlockedByCourier = hasActiveShipment || isShipmentInTransit;

  const parsedRefundAmount = Number(refundAmount);
  const isRefundValid =
    decision === "cancel_only" ||
    (Number.isFinite(parsedRefundAmount) &&
      parsedRefundAmount > 0 &&
      parsedRefundAmount <= availableRefundable + 0.01 &&
      (hasGatewayAttempt || offlineReference.trim().length >= 2));

  const canSubmit = !submitting && isReasonValid && !isBlockedByCourier && isRefundValid;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const options: CancelConfirmOptions = {
        cancelDecision: decision,
        adminNote: adminNote.trim() || undefined,
      };
      if (decision === "cancel_and_refund" && availableRefundable > 0) {
        options.refund = {
          amount: Math.round(parsedRefundAmount * 100) / 100,
          reason: trimmedReason,
          channel: hasGatewayAttempt ? "sslcommerz" : "manual_offline",
          ...(hasGatewayAttempt
            ? {}
            : {
                method: offlineMethod,
                reference: offlineReference.trim(),
                refundDate: offlineDate,
              }),
        };
      }
      const success = await onConfirmCancel(trimmedReason, options);
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
      <div className="relative w-full max-w-2xl rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
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
                {customerName ? `${customerName} · ` : ""}
                Total: {formatBDT(orderTotal)}
                {orderStatus ? ` · Status: ${orderStatus.replace(/_/g, " ")}` : ""}
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

        {/* Order Items Summary */}
        {items.length > 0 && (
          <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <span className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-purple-600" /> Order Items ({items.length})
              </span>
              <span className="font-mono text-gray-800">{formatBDT(orderTotal)}</span>
            </div>
            <div className="max-h-28 overflow-y-auto divide-y divide-stone-200/70">
              {items.map((it, idx) => (
                <div key={`${it.productId}-${idx}`} className="flex items-center justify-between py-1.5 text-[11.5px]">
                  <span className="text-gray-800 font-medium truncate pr-2">
                    {it.name}
                    {(it.size || it.color) && (
                      <span className="text-gray-400 ml-1">
                        ({[it.size, it.color].filter(Boolean).join(" / ")})
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-gray-600">
                    {it.quantity} × {formatBDT(it.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Courier Shipment Status */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-500">
            <span className="flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-purple-600" /> Shipment Information
            </span>
            <span className="font-mono text-gray-700 font-semibold">
              {courierProvider || "Not Booked"} {courierStatus ? `· ${courierStatus}` : ""}
            </span>
          </div>

          {isShipmentInTransit ? (
            <div className="rounded-xl border border-rose-300 bg-rose-50/90 p-3 text-[12px] text-rose-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                Parcel is in transit with courier
              </p>
              <p className="text-[11px] text-rose-800">
                Consignment <strong className="font-mono">{consignmentId}</strong> is already picked up or in transit. Request a return / recall from the Shipment tab before cancelling.
              </p>
            </div>
          ) : hasActiveShipment ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3 text-[12px] text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                Active courier consignment exists ({consignmentId || "Active"})
              </p>
              <p className="text-[11px] text-amber-800">
                Courier consignment must be cancelled in the Shipment tab (or courier portal) before cancelling this order.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 text-[11.5px] text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>No active courier consignment. Safe to cancel without courier conflict.</span>
            </div>
          )}
        </div>

        {/* Payment & Refund Eligibility Breakdown */}
        <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-500">
            <span className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-purple-600" /> Payment & Refund Requirement
            </span>
            <span className="uppercase text-gray-700 font-semibold">
              {paymentMethod} · {paymentStatus}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-xl bg-white border border-stone-200 p-2">
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Captured</p>
              <p className="text-[12.5px] font-bold text-gray-900">{formatBDT(captured)}</p>
            </div>
            <div className="rounded-xl bg-white border border-stone-200 p-2">
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Refunded</p>
              <p className="text-[12.5px] font-bold text-gray-900">{formatBDT(completedRefunds)}</p>
            </div>
            <div className="rounded-xl bg-white border border-stone-200 p-2">
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Pending</p>
              <p className="text-[12.5px] font-bold text-amber-700">{formatBDT(pendingRefunds)}</p>
            </div>
            <div className="rounded-xl bg-white border border-purple-200 p-2">
              <p className="text-[10px] text-purple-600 font-semibold uppercase">Available</p>
              <p className="text-[12.5px] font-bold text-purple-700">{formatBDT(availableRefundable)}</p>
            </div>
          </div>

          {availableRefundable > 0 ? (
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-bold text-gray-700">Cancellation & Refund Decision</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDecision("cancel_only")}
                  className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
                    decision === "cancel_only"
                      ? "border-purple-600 bg-purple-50 text-purple-900"
                      : "border-stone-200 bg-white text-gray-700 hover:bg-stone-50"
                  }`}
                >
                  <p className="text-[12px] font-bold">1. Cancel Order Only</p>
                  <p className="text-[10.5px] text-gray-500">
                    Do not initiate a refund right now. Please process a refund through the Payments tab later if needed.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDecision("cancel_and_refund");
                    if (!refundAmount) setRefundAmount(String(availableRefundable));
                  }}
                  className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
                    decision === "cancel_and_refund"
                      ? "border-purple-600 bg-purple-50 text-purple-900"
                      : "border-stone-200 bg-white text-gray-700 hover:bg-stone-50"
                  }`}
                >
                  <p className="text-[12px] font-bold">2. Cancel Order & Request Refund</p>
                  <p className="text-[10.5px] text-gray-500">
                    {hasGatewayAttempt ? "Via SSLCOMMERZ refund API" : "Record manual offline refund"}
                  </p>
                </button>
              </div>

              {decision === "cancel_and_refund" && (
                <div className="rounded-xl border border-purple-200 bg-white p-3 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-gray-700">
                        Refund Amount (max {formatBDT(availableRefundable)})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min={0.01}
                        max={availableRefundable}
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-1.5 text-[12px] font-mono outline-none focus:border-purple-500"
                      />
                    </div>
                    {!hasGatewayAttempt && (
                      <div>
                        <label className="text-[11px] font-bold text-gray-700">Refund Method</label>
                        <select
                          value={offlineMethod}
                          onChange={(e) => setOfflineMethod(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-1.5 text-[12px] outline-none focus:border-purple-500"
                        >
                          <option value="bkash">bKash</option>
                          <option value="nagad">Nagad</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="cash">Cash</option>
                        </select>
                      </div>
                    )}
                  </div>
                  {!hasGatewayAttempt && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] font-bold text-gray-700">
                          Transaction / Reference ID <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={offlineReference}
                          onChange={(e) => setOfflineReference(e.target.value)}
                          placeholder="e.g. TRX9A82B..."
                          className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-1.5 text-[12px] outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-700">Refund Date</label>
                        <input
                          type="date"
                          value={offlineDate}
                          onChange={(e) => setOfflineDate(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-1.5 text-[12px] outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-2.5 text-[11.5px] text-stone-700">
              {isPrepaidVerified ? (
                <>
                  <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Full captured amount has already been refunded or reserved.</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>No captured customer payment to refund (৳0 refundable balance).</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Stock Return Guarantee */}
        <div className="flex items-center gap-2 text-[11px] text-gray-500 bg-purple-50/50 border border-purple-100 rounded-xl p-2.5">
          <span className="text-[14px]">📦</span>
          <span>Inventory items will be released back to product stock idempotently if the parcel has not been handed over to the courier.</span>
        </div>

        {/* Cancellation Reason & Optional Admin Note */}
        <div className="space-y-2.5">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="cancel-order-reason" className="text-[12px] font-bold text-gray-800">
                Cancellation Reason <span className="text-rose-500">*</span>
              </label>
              <span
                className={`text-[10.5px] font-mono ${
                  trimmedReason.length < 3 ? "text-gray-400" : "text-emerald-600 font-bold"
                }`}
              >
                {trimmedReason.length} / min 3 chars
              </span>
            </div>
            <textarea
              id="cancel-order-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              placeholder="Reason for cancellation (e.g. Customer requested via phone, Duplicate order, Out of stock)..."
              className="w-full rounded-2xl border border-stone-200 bg-white px-3.5 py-2 text-[12.5px] text-gray-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition resize-none disabled:bg-stone-50"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="cancel-admin-note" className="text-[11.5px] font-semibold text-gray-700">
              Administrative Note (optional)
            </label>
            <input
              id="cancel-admin-note"
              type="text"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              disabled={submitting}
              placeholder="Internal note for accounting or support team..."
              className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-[12px] text-gray-800 outline-none focus:border-purple-500"
            />
          </div>
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
                Processing…
              </>
            ) : decision === "cancel_and_refund" ? (
              <>
                <XCircle className="h-3.5 w-3.5" />
                Cancel Order & Request Refund
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
