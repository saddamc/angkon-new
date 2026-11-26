"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, X, XCircle } from "lucide-react";

type Props = {
  orderNumber: string;
  orderStatus: string;
  paymentMethod?: string;
  paymentStatus?: string;
  shipmentStatus?: string;
  total?: number;
  paidAmount?: number;
  mode?: "instant" | "request";
  onClose: () => void;
  onSubmitted: (message: string) => void;
};

const REASONS = [
  ["changed_mind", "I changed my mind"],
  ["ordered_by_mistake", "I ordered by mistake"],
  ["delivery_delay", "Delivery is taking too long"],
  ["duplicate_order", "Duplicate order"],
  ["other", "Other"],
] as const;

export function CustomerCancellationModal({
  orderNumber,
  orderStatus,
  paymentMethod = "cod",
  paymentStatus,
  shipmentStatus,
  total,
  paidAmount = 0,
  mode = "request",
  onClose,
  onSubmitted,
}: Props) {
  const [reasonCode, setReasonCode] = useState<string>(REASONS[0][0]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isInstant = mode === "instant";

  const submit = async () => {
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError("Please tell us why you want to cancel (at least 3 characters).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}/cancellation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reasonCode, reason: trimmed }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "We could not process the cancellation.");
        return;
      }
      onSubmitted(
        data.message ||
          (isInstant
            ? "Your order has been cancelled."
            : "Your cancellation request was sent for review."),
      );
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-3xl border border-[#E1B76F]/35 bg-[#220407] p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#E1B76F]/15 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-rose-400/30 bg-rose-950/70 p-2.5 text-rose-300">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black">
                {isInstant ? "Cancel order" : "Request cancellation"}
              </h2>
              <p className="mt-1 text-xs text-stone-300">
                Order #{orderNumber}
                {typeof total === "number" ? ` · ৳${Number(total).toLocaleString("en-BD")}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="rounded-lg p-1.5 text-stone-400 hover:bg-white/10 hover:text-white disabled:opacity-50 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className={`mt-4 rounded-2xl border p-3.5 text-xs ${
            isInstant
              ? "border-emerald-400/25 bg-emerald-950/30 text-emerald-100"
              : "border-amber-400/25 bg-amber-950/30 text-amber-100"
          }`}
        >
          <div className="flex gap-2">
            {isInstant ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            )}
            <p>
              {isInstant
                ? "Because processing and courier booking have not started yet and no online payment was captured, your order will be cancelled immediately."
                : `You have a verified payment of ৳${Number(paidAmount || total || 0).toLocaleString("en-BD")}. Your cancellation request will be reviewed by our team to initiate your refund cleanly.`}
            </p>
          </div>
          <p className="mt-2 text-[11px] opacity-80 capitalize">
            Order: {orderStatus.replace(/_/g, " ")} · Method: {paymentMethod.toUpperCase()} · Payment:{" "}
            {(paymentStatus || "pending").replace(/_/g, " ")} · Shipment:{" "}
            {(shipmentStatus || "not booked").replace(/_/g, " ")}
          </p>
        </div>

        <label className="mt-5 block text-xs font-bold uppercase tracking-wider text-stone-200">
          Reason
        </label>
        <select
          value={reasonCode}
          onChange={(event) => setReasonCode(event.target.value)}
          disabled={busy}
          className="mt-1.5 w-full rounded-xl border border-[#E1B76F]/25 bg-[#160205] px-3 py-2.5 text-sm text-white outline-none focus:border-[#E1B76F]"
        >
          {REASONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={busy}
          rows={4}
          placeholder="Please add a short explanation (min 3 characters)"
          className="mt-3 w-full resize-none rounded-xl border border-[#E1B76F]/25 bg-[#160205] px-3 py-2.5 text-sm text-white outline-none placeholder:text-stone-500 focus:border-[#E1B76F]"
        />
        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-rose-400/30 bg-rose-950/50 p-3 text-xs font-semibold text-rose-200"
          >
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2.5 border-t border-[#E1B76F]/15 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-stone-600 px-4 py-2.5 text-xs font-bold text-stone-200 hover:bg-white/10 disabled:opacity-50 cursor-pointer"
          >
            Keep order
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-black text-white hover:bg-rose-500 disabled:opacity-50 cursor-pointer"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            {isInstant ? "Confirm cancellation" : "Send request"}
          </button>
        </div>
      </div>
    </div>
  );
}
