"use client";

import {
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ClipboardList,
  Banknote,
  Copy,
} from "lucide-react";
import {
  STATUS_OPTIONS,
  FINAL_STATUSES,
  formatBDT,
} from "../_types/orders.types";
import type { AdminOrdersHookReturn } from "../_hooks/use-admin-orders";

interface OrdersModalsProps {
  state: AdminOrdersHookReturn;
}

export function OrdersModals({ state }: OrdersModalsProps) {
  const {
    statusModal,
    setStatusModal,
    selectedStatus,
    setSelectedStatus,
    paymentModal,
    setPaymentModal,
    warningModal,
    setWarningModal,
    infoModal,
    setInfoModal,
    toast,
    setToast,
    updating,
    handleStatusChange,
    copyValue,
  } = state;

  const warningIsRevert = warningModal?.kind === "revert-payment";

  return (
    <>
      {/* ── Status Change Modal ──────────────────────── */}
      {statusModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setStatusModal(null);
              setSelectedStatus(null);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="status-modal-title"
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <ClipboardList className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3
                    id="status-modal-title"
                    className="text-[15px] font-semibold leading-snug text-slate-900"
                  >
                    Update order status
                  </h3>
                  <p className="mt-0.5 truncate text-[12px] text-slate-500">
                    #{statusModal.number || statusModal.id}
                    <span className="mx-1.5 text-slate-300">·</span>
                    {statusModal.billing?.first_name || "Guest"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => {
                  setStatusModal(null);
                  setSelectedStatus(null);
                }}
                className="-mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Status options */}
            <div
              role="radiogroup"
              aria-label="Order status"
              className="max-h-[60vh] space-y-1.5 overflow-y-auto px-6 py-5"
            >
              {STATUS_OPTIONS.map((s) => {
                const isCurrent = statusModal.status === s.key;
                const isSelected = selectedStatus === s.key;

                return (
                  <button
                    key={s.key}
                    type="button"
                    role="radio"
                    aria-checked={isCurrent || isSelected}
                    disabled={isCurrent}
                    onClick={() => setSelectedStatus(s.key)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 disabled:cursor-default cursor-pointer ${
                      isCurrent
                        ? "border-slate-200 bg-slate-50"
                        : isSelected
                          ? "border-purple-400 bg-purple-50/60 ring-1 ring-purple-200"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isSelected && !isCurrent
                          ? "bg-purple-100 text-purple-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <s.icon className="h-4 w-4" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-slate-900">
                        {s.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-slate-500">
                        {s.desc}
                      </span>
                    </span>

                    {isCurrent ? (
                      <span className="shrink-0 rounded-full bg-slate-200/70 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-slate-500">
                        Current
                      </span>
                    ) : (
                      <span
                        aria-hidden="true"
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          isSelected ? "border-purple-600 bg-purple-600" : "border-slate-300"
                        }`}
                      >
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Modal footer with Confirm */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-6 py-3.5">
              <button
                onClick={() => {
                  setStatusModal(null);
                  setSelectedStatus(null);
                }}
                className="rounded-xl px-4 py-2.5 text-[13px] font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!selectedStatus || selectedStatus === statusModal.status || updating === statusModal.id}
                onClick={async () => {
                  if (!selectedStatus) return;

                  const paidNow =
                    (statusModal.paymentStatus || statusModal.payment_status || "").toLowerCase() ===
                    "paid";

                  // Delivering an unpaid order: confirm payment collection first.
                  if (selectedStatus === "completed" && !paidNow) {
                    setPaymentModal({
                      orderId: statusModal.id,
                      orderNumber: String(statusModal.number || statusModal.id),
                      total: statusModal.total,
                    });
                    return;
                  }

                  // Cancelled / refunded are permanent.
                  if (FINAL_STATUSES.includes(selectedStatus)) {
                    setWarningModal({
                      kind: "permanent",
                      orderId: statusModal.id,
                      status: selectedStatus,
                      orderNumber: String(statusModal.number || statusModal.id),
                    });
                    return;
                  }

                  // A paid order cannot silently return to pending
                  if (paidNow && selectedStatus === "pending") {
                    setWarningModal({
                      kind: "revert-payment",
                      orderId: statusModal.id,
                      status: selectedStatus,
                      orderNumber: String(statusModal.number || statusModal.id),
                      total: statusModal.total,
                    });
                    return;
                  }

                  const ok = await handleStatusChange(statusModal.id, selectedStatus);
                  if (ok) {
                    setStatusModal(null);
                    setSelectedStatus(null);
                  }
                }}
                className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-[13px] font-bold text-white shadow-md shadow-purple-200 transition hover:bg-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                {updating === statusModal.id && <Loader2 className="h-4 w-4 animate-spin" />}
                Update status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Required Before Delivery ────────── */}
      {paymentModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setPaymentModal(null)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-2xl"
          >
            <button
              type="button"
              aria-label="Close dialog"
              onClick={() => setPaymentModal(null)}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-6 pt-9">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                <Banknote className="h-7 w-7 text-amber-600" />
              </div>
              <h3
                id="payment-modal-title"
                className="text-center text-[16px] font-semibold text-slate-900"
              >
                Payment required before delivery
              </h3>
              <p className="mx-auto mt-1.5 max-w-sm text-center text-[12.5px] leading-relaxed text-slate-500">
                Order <strong className="text-slate-700">#{paymentModal.orderNumber}</strong> is not
                marked as paid. Deliveries must be paid first — confirming records the payment and
                marks the order delivered.
              </p>

              <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Amount due
                </span>
                <span className="text-[15px] font-bold tabular-nums text-slate-900">
                  {formatBDT(paymentModal.total)}
                </span>
              </div>

              <p className="mt-3 text-center text-[11px] text-slate-400">
                The payment is recorded as collected for this order only.
              </p>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentModal(null)}
                  className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-[13px] font-medium text-slate-600 transition hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 cursor-pointer"
                >
                  Go back
                </button>
                <button
                  type="button"
                  disabled={updating === paymentModal.orderId}
                  onClick={async () => {
                    await handleStatusChange(paymentModal.orderId, "completed");
                    setPaymentModal(null);
                    setStatusModal(null);
                    setSelectedStatus(null);
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-[13px] font-bold text-white shadow-md transition hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 disabled:opacity-50 cursor-pointer"
                >
                  {updating === paymentModal.orderId && <Loader2 className="h-4 w-4 animate-spin" />}
                  Mark paid &amp; deliver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation dialog: permanent status / payment reversal ── */}
      {warningModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setWarningModal(null)}
          />

          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="warning-modal-title"
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <button
              type="button"
              aria-label="Close dialog"
              onClick={() => setWarningModal(null)}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="px-6 pb-5 pt-9">
              <div
                className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
                  warningIsRevert ? "bg-amber-100" : "bg-rose-100"
                }`}
              >
                {warningIsRevert ? (
                  <Banknote className="h-7 w-7 text-amber-600" />
                ) : (
                  <AlertTriangle className="h-7 w-7 text-rose-600" />
                )}
              </div>

              <h3
                id="warning-modal-title"
                className="text-center text-[16px] font-semibold text-slate-900"
              >
                {warningIsRevert ? "Undo payment and reopen order?" : "Permanent status change"}
              </h3>

              <p className="mx-auto mt-1.5 max-w-sm text-center text-[12.5px] leading-relaxed text-slate-500">
                {warningIsRevert ? (
                  <>
                    Order{" "}
                    <strong className="text-slate-700">#{warningModal.orderNumber}</strong> is already
                    paid. Moving it back to{" "}
                    <strong className="capitalize text-slate-700">
                      {warningModal.status.replace("-", " ")}
                    </strong>{" "}
                    will mark the payment as pending again.
                  </>
                ) : (
                  <>
                    Order{" "}
                    <strong className="text-slate-700">#{warningModal.orderNumber}</strong> will be
                    marked{" "}
                    <strong className="capitalize text-slate-700">
                      {warningModal.status.replace("-", " ")}
                    </strong>
                    .
                  </>
                )}
              </p>

              {warningIsRevert && (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Paid amount
                  </span>
                  <span className="text-[15px] font-bold tabular-nums text-slate-900">
                    {formatBDT(warningModal.total || 0)}
                  </span>
                </div>
              )}

              <div
                className={`mt-4 rounded-xl border px-3.5 py-2.5 text-[11.5px] leading-relaxed ${
                  warningIsRevert
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {warningIsRevert
                  ? "The order will show as Unpaid and the full amount will count as due until it is marked paid again."
                  : "Cancelled and refunded orders are locked and cannot be changed afterwards."}
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setWarningModal(null)}
                  className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-[13px] font-medium text-slate-600 transition hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 cursor-pointer"
                >
                  Go back
                </button>
                <button
                  type="button"
                  disabled={updating === warningModal.orderId}
                  onClick={async () => {
                    const ok =
                      warningModal.kind === "revert-payment"
                        ? await handleStatusChange(warningModal.orderId, warningModal.status, {
                            revertPayment: true,
                          })
                        : await handleStatusChange(warningModal.orderId, warningModal.status);
                    setWarningModal(null);
                    if (ok) {
                      setStatusModal(null);
                      setSelectedStatus(null);
                    }
                  }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-bold text-white shadow-md transition focus:outline-none focus-visible:ring-2 disabled:opacity-50 cursor-pointer ${
                    warningIsRevert
                      ? "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500/50"
                      : "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500/50"
                  }`}
                >
                  {updating === warningModal.orderId && <Loader2 className="h-4 w-4 animate-spin" />}
                  {warningIsRevert ? "Undo payment & reopen" : "Yes, confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail sheet (customer / product) ────────── */}
      {infoModal && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setInfoModal(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="info-modal-title"
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <h3 id="info-modal-title" className="text-[15px] font-semibold text-slate-900">
                  {infoModal.title}
                </h3>
                {infoModal.subtitle && (
                  <p className="mt-0.5 truncate font-mono text-[11.5px] text-slate-500">
                    {infoModal.subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setInfoModal(null)}
                className="-mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[60vh] space-y-2.5 overflow-y-auto px-5 py-4">
              {infoModal.fields.map((field) => (
                <div
                  key={field.label}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    {field.label}
                  </p>
                  <div className="mt-1 flex items-start justify-between gap-3">
                    <p
                      className={`min-w-0 break-all text-[12.5px] leading-relaxed text-slate-800 ${
                        field.mono ? "font-mono" : ""
                      }`}
                    >
                      {field.value}
                    </p>
                    <button
                      type="button"
                      onClick={() => void copyValue(field.value, field.label)}
                      aria-label={`Copy ${field.label}`}
                      title={`Copy ${field.label.toLowerCase()}`}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-purple-300 hover:text-purple-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40 cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
              <button
                type="button"
                onClick={() =>
                  void copyValue(
                    infoModal.fields.map((f) => `${f.label}: ${f.value}`).join("\n"),
                    "Details"
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40 cursor-pointer"
              >
                <Copy className="h-3 w-3" />
                Copy all
              </button>
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-[11.5px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[400]">
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
            )}
            <p className="text-[13px] font-medium">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="ml-2 p-1 rounded-lg hover:bg-black/5 transition cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
