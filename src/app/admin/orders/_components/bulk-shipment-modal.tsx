"use client";

import { useState, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import { formatBDT, type WCOrder } from "../_types/orders.types";
import { normalizeBdPhone } from "@/server/courier/providers/steadfast/utils";
import type { AdminOrdersHookReturn } from "../_hooks/use-admin-orders";

interface BulkShipmentModalProps {
  state: AdminOrdersHookReturn;
  isOpen: boolean;
  onClose: () => void;
}

export type BulkEligibilityStatus =
  | "eligible"
  | "already_booked"
  | "unpaid_online"
  | "cancelled"
  | "pending_confirmation"
  | "invalid_phone"
  | "invalid_address";

export interface EvaluatedOrder {
  order: WCOrder;
  status: BulkEligibilityStatus;
  reason: string;
  isEligible: boolean;
  codToCollect: number;
}

function evaluateBulkOrder(order: WCOrder): EvaluatedOrder {
  const isFinal = ["cancelled", "refunded", "failed"].includes(order.status);
  const isBooked =
    Boolean(order.consignmentId || order.trackingCode) ||
    order.shipmentBookingState === "booked";
  const isUnpaidOnline =
    order.paymentMethod === "sslcommerz" &&
    order.paymentStatus !== "paid";
  const phone = normalizeBdPhone(order.billing?.phone || "");
  const fullAddress = [order.billing?.address_1, order.billing?.city]
    .filter(Boolean)
    .join(", ");
  const isAddressTooShort = fullAddress.trim().length < 10;
  const isPending = order.status === "pending";

  const codToCollect =
    order.expectedCodAmount !== undefined
      ? order.expectedCodAmount
      : order.paymentStatus === "paid"
        ? 0
        : Number(order.total || 0);

  if (isFinal) {
    return {
      order,
      status: "cancelled",
      reason: "Cancelled/locked orders cannot be booked.",
      isEligible: false,
      codToCollect: 0,
    };
  }

  if (isBooked) {
    return {
      order,
      status: "already_booked",
      reason: `Already has active consignment (${order.consignmentId || order.trackingCode || "booked"}).`,
      isEligible: false,
      codToCollect,
    };
  }

  if (isUnpaidOnline) {
    return {
      order,
      status: "unpaid_online",
      reason: "Unpaid SSLCOMMERZ order. Requires customer COD agreement before dispatch.",
      isEligible: false,
      codToCollect,
    };
  }

  if (!phone) {
    return {
      order,
      status: "invalid_phone",
      reason: "Invalid phone number. Must be an 11-digit Bangladeshi mobile number.",
      isEligible: false,
      codToCollect,
    };
  }

  if (isAddressTooShort) {
    return {
      order,
      status: "invalid_address",
      reason: "Delivery address is too short (min 10 characters required).",
      isEligible: false,
      codToCollect,
    };
  }

  if (isPending) {
    return {
      order,
      status: "pending_confirmation",
      reason: "Pending verification. Must be confirmed with customer prior to courier dispatch.",
      isEligible: false,
      codToCollect,
    };
  }

  return {
    order,
    status: "eligible",
    reason: "Ready for Steadfast courier dispatch.",
    isEligible: true,
    codToCollect,
  };
}

interface DispatchResult {
  orderNumber: string;
  ok: boolean;
  trackingCode?: string;
  consignmentId?: string;
  error?: string;
}

export function BulkShipmentModal({ state, isOpen, onClose }: BulkShipmentModalProps) {
  const {
    selectedOrderIds,
    orders,
    clearSelection,
    load,
    filterStatus,
    loadCourierOverview,
    courierOperatingMode,
    showToast,
  } = state;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmLiveBooking, setConfirmLiveBooking] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<{ current: number; total: number } | null>(
    null
  );
  const [results, setResults] = useState<DispatchResult[] | null>(null);

  // Evaluate all selected orders
  const evaluatedList: EvaluatedOrder[] = useMemo(() => {
    return selectedOrderIds
      .map((id) => {
        const found = orders.find((o) => String(o.id) === id);
        return found ? evaluateBulkOrder(found) : null;
      })
      .filter((item): item is EvaluatedOrder => item !== null);
  }, [selectedOrderIds, orders]);

  const summary = useMemo(() => {
    let eligible = 0;
    let unpaidOnline = 0;
    let cancelled = 0;
    let alreadyBooked = 0;
    let invalidAddressPhone = 0;
    let pending = 0;

    for (const item of evaluatedList) {
      if (item.isEligible) eligible++;
      else if (item.status === "unpaid_online") unpaidOnline++;
      else if (item.status === "cancelled") cancelled++;
      else if (item.status === "already_booked") alreadyBooked++;
      else if (item.status === "invalid_address" || item.status === "invalid_phone")
        invalidAddressPhone++;
      else if (item.status === "pending_confirmation") pending++;
    }

    return {
      total: evaluatedList.length,
      eligible,
      unpaidOnline,
      cancelled,
      alreadyBooked,
      invalidAddressPhone,
      pending,
    };
  }, [evaluatedList]);

  if (!isOpen) return null;

  const handleStartDispatch = async () => {
    const eligibleOrders = evaluatedList.filter((i) => i.isEligible);
    if (eligibleOrders.length === 0) return;

    setIsSubmitting(true);
    setResults([]);
    setCurrentProgress({ current: 0, total: eligibleOrders.length });

    const localResults: DispatchResult[] = [];
    const successfulOrderIds: string[] = [];

    for (let i = 0; i < eligibleOrders.length; i++) {
      const { order } = eligibleOrders[i];
      setCurrentProgress({ current: i + 1, total: eligibleOrders.length });

      try {
        const res = await fetch(`/api/admin/orders/${order.id}/shipment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "steadfast",
            note: "",
            confirmLiveBooking: courierOperatingMode === "live" ? confirmLiveBooking : undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok && data.ok !== false) {
          localResults.push({
            orderNumber: String(order.number || order.id),
            ok: true,
            trackingCode: data.shipment?.trackingCode,
            consignmentId: data.shipment?.consignmentId,
          });
          successfulOrderIds.push(String(order.id));
        } else {
          localResults.push({
            orderNumber: String(order.number || order.id),
            ok: false,
            error: data.error || "Booking failed",
          });
        }
      } catch {
        localResults.push({
          orderNumber: String(order.number || order.id),
          ok: false,
          error: "Network error during booking request",
        });
      }
    }

    setResults(localResults);
    setIsSubmitting(false);

    const successCount = localResults.filter((r) => r.ok).length;
    if (successCount > 0) {
      showToast(
        `Successfully booked ${successCount} parcel${successCount > 1 ? "s" : ""} with Steadfast`,
        "success"
      );
      await load(filterStatus, false);
      void loadCourierOverview(true);
    } else {
      showToast("No parcels could be booked. See results table for details.", "error");
    }
  };

  const handleFinish = () => {
    if (results && results.some((r) => r.ok)) {
      clearSelection();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-gray-900">
                Bulk Steadfast Courier Booking Preview
              </h2>
              <p className="text-[12px] text-gray-500">
                Pre-flight validation audit for {summary.total} selected order
                {summary.total !== 1 ? "s" : ""}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3">
              <p className="text-[10px] font-bold uppercase text-stone-500">Total Selected</p>
              <p className="text-xl font-black text-stone-900 mt-0.5">{summary.total}</p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3">
              <p className="text-[10px] font-bold uppercase text-emerald-700">Eligible to Book</p>
              <p className="text-xl font-black text-emerald-800 mt-0.5">{summary.eligible}</p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3">
              <p className="text-[10px] font-bold uppercase text-amber-800">Unpaid Online</p>
              <p className="text-xl font-black text-amber-900 mt-0.5">{summary.unpaidOnline}</p>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-3">
              <p className="text-[10px] font-bold uppercase text-blue-800">Already Booked</p>
              <p className="text-xl font-black text-blue-900 mt-0.5">{summary.alreadyBooked}</p>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-orange-50/80 p-3">
              <p className="text-[10px] font-bold uppercase text-orange-800">Unconfirmed</p>
              <p className="text-xl font-black text-orange-900 mt-0.5">{summary.pending}</p>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-3">
              <p className="text-[10px] font-bold uppercase text-rose-800">Invalid Addr/Phone</p>
              <p className="text-xl font-black text-rose-900 mt-0.5">
                {summary.invalidAddressPhone + summary.cancelled}
              </p>
            </div>
          </div>

          {/* Guidelines Box */}
          <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-3.5 text-[11.5px] text-purple-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-purple-600 shrink-0" />
              Automated Dispatch Eligibility Rules:
            </p>
            <ul className="list-disc pl-5 space-y-0.5 text-purple-800">
              <li>Only Confirmed/Processing orders with verified recipient phones and addresses are booked.</li>
              <li>Unpaid SSLCOMMERZ online orders are blocked to prevent accidental COD dispatch without customer agreement.</li>
              <li>Cancelled or previously booked orders are skipped automatically to protect against duplicate consignments.</li>
            </ul>
          </div>

          {/* Mode 1 (Mock) vs Mode 2 (Live) Mode Indicator and Safety Confirmation */}
          {courierOperatingMode === "live" ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-[12px] text-amber-950 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold uppercase tracking-wider text-[11px]">⚠️ LIVE COURIER MODE ACTIVE</p>
                  <p className="mt-0.5">
                    Bulk dispatch will create <strong>REAL parcels</strong> at Steadfast for all eligible orders and schedule physical pickups.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 font-bold text-amber-950 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={confirmLiveBooking}
                  onChange={(e) => setConfirmLiveBooking(e.target.checked)}
                  className="h-4 w-4 rounded accent-amber-600 cursor-pointer"
                />
                I confirm these are real customer orders ready for physical Steadfast pickup.
              </label>
            </div>
          ) : (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3 text-[11.5px] text-blue-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
                <span>
                  <strong>🧪 Mock / Development Mode:</strong> Bulk booking is simulated. No real consignments or external API calls will be made.
                </span>
              </div>
              <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                Simulated
              </span>
            </div>
          )}

          {/* Live Progress Bar during submission */}
          {isSubmitting && currentProgress && (
            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 space-y-2">
              <div className="flex justify-between items-center text-[12.5px] font-bold text-purple-900">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                  Booking with Steadfast API...
                </span>
                <span>
                  {currentProgress.current} of {currentProgress.total} orders
                </span>
              </div>
              <div className="h-2 w-full bg-purple-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 transition-all duration-300 rounded-full"
                  style={{
                    width: `${Math.round((currentProgress.current / currentProgress.total) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Results Summary if dispatch ran */}
          {results && (
            <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
              <h3 className="text-[13px] font-bold text-gray-900">Booking Execution Results</h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {results.map((res) => (
                  <div
                    key={res.orderNumber}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-[12px] ${
                      res.ok
                        ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                        : "border-rose-200 bg-rose-50/70 text-rose-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-mono font-bold">
                      {res.ok ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      )}
                      <span>#{res.orderNumber}</span>
                    </div>
                    <div>
                      {res.ok ? (
                        <span className="font-medium text-emerald-700 font-mono">
                          TRK: {res.trackingCode || res.consignmentId || "Success"}
                        </span>
                      ) : (
                        <span className="font-medium text-rose-700">{res.error}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pre-flight Audit Table */}
          {!results && (
            <div className="rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold text-[11px] uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Order #</th>
                    <th className="py-2.5 px-3">Customer & Phone</th>
                    <th className="py-2.5 px-3">COD Amount</th>
                    <th className="py-2.5 px-3">Audit Pre-Flight Assessment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {evaluatedList.map(({ order, status, reason, isEligible, codToCollect }) => {
                    return (
                      <tr
                        key={String(order.id)}
                        className={isEligible ? "bg-white hover:bg-emerald-50/20" : "bg-gray-50/40"}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-gray-900">
                          #{order.number || order.id}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-gray-800">
                            {order.billing?.first_name || "Guest"}
                          </p>
                          <p className="font-mono text-[11px] text-gray-500">
                            {order.billing?.phone || "No phone"}
                          </p>
                        </td>
                        <td className="py-2.5 px-3 font-bold tabular-nums text-gray-900">
                          {formatBDT(codToCollect)}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${
                                isEligible
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : status === "unpaid_online"
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : "bg-rose-50 text-rose-800 border-rose-200"
                              }`}
                            >
                              {isEligible ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <AlertTriangle className="h-3 w-3" />
                              )}
                              {status.replace(/_/g, " ")}
                            </span>
                            <span className="text-[11px] text-gray-500 truncate max-w-[280px]">
                              {reason}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/60 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-[12.5px] font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer disabled:opacity-50"
          >
            {results ? "Close" : "Cancel"}
          </button>

          {results ? (
            <button
              type="button"
              onClick={handleFinish}
              className="rounded-xl bg-purple-600 px-6 py-2.5 text-[12.5px] font-bold text-white shadow-md shadow-purple-200 hover:bg-purple-700 cursor-pointer"
            >
              Done & Refresh
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartDispatch}
              disabled={
                isSubmitting ||
                summary.eligible === 0 ||
                (courierOperatingMode === "live" && !confirmLiveBooking)
              }
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-[12.5px] font-bold text-white shadow-md shadow-purple-200 hover:bg-purple-700 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Truck className="h-4 w-4" />
              )}
              Send {summary.eligible} Eligible Parcel{summary.eligible !== 1 ? "s" : ""} to Steadfast
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
