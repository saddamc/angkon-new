"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, ArrowLeft, Banknote, Loader2, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { OrderDetailsContent } from "../_components/order-details-content";
import { formatBDT, type OrderDetailsPayload, type WCOrder } from "../_types/orders.types";

export default function AdminOrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { authFetch } = useAuth();
  const [data, setData] = useState<OrderDetailsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [codModalOpen, setCodModalOpen] = useState(false);
  const [codAgreed, setCodAgreed] = useState(false);
  const [codReason, setCodReason] = useState("");

  const loadDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/admin/orders/${encodeURIComponent(id)}/details`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Could not load order details.");
        return;
      }
      setData(body);
    } catch {
      setError("Network error while loading order details.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, id]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const notify = (msg: string) => {
    setBannerMsg(msg);
    setTimeout(() => setBannerMsg(null), 3500);
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-stone-200/90 bg-white py-32 text-[13px] text-gray-500 shadow-xs">
        <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
        <p className="font-semibold text-gray-700">Loading order #{decodeURIComponent(id)}...</p>
        <p className="text-[11.5px] text-gray-400">Fetching customer, products, payments & tracking history</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-stone-50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Orders</span>
        </Link>
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-[13px] text-rose-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">Error loading order</p>
            <p className="text-[12px] text-rose-600">{error || "Order not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <OrderDetailsContent
        data={data}
        isDrawer={false}
        busy={busy}
        notificationBanner={bannerMsg}
        onStatusTransition={async (status, reason) => {
          setBusy(true);
          try {
            const res = await authFetch(`/api/admin/orders/${encodeURIComponent(id)}`, {
              method: "PATCH",
              body: JSON.stringify({ status, reason }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
              notify(body.error || "Status change rejected");
              return false;
            }
            notify(`Status updated to ${status}`);
            await loadDetails();
            return true;
          } finally {
            setBusy(false);
          }
        }}
        onReopenOrder={async (reason) => {
          setBusy(true);
          try {
            const res = await authFetch(`/api/admin/orders/${encodeURIComponent(id)}/reopen`, {
              method: "POST",
              body: JSON.stringify({ reason }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
              notify(body.error || "Failed to reopen order");
              return false;
            }
            notify(body.message || "Order successfully reopened");
            await loadDetails();
            return true;
          } catch {
            notify("Network error while reopening order");
            return false;
          } finally {
            setBusy(false);
          }
        }}
        onOpenShipment={async (stub: WCOrder) => {
          setBusy(true);
          try {
            const res = await authFetch(`/api/admin/orders/${stub.id}/shipment`, {
              method: "POST",
              body: JSON.stringify({ provider: "steadfast" }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok || body.ok === false) {
              if (body.code === "LIVE_CONFIRMATION_REQUIRED") {
                const confirmed = window.confirm(
                  "⚠️ LIVE COURIER MODE ACTIVE!\n\nThis will create a REAL parcel at Steadfast Courier with physical pickup scheduled.\n\nDo you want to proceed with live booking?"
                );
                if (confirmed) {
                  const retryRes = await authFetch(`/api/admin/orders/${stub.id}/shipment`, {
                    method: "POST",
                    body: JSON.stringify({ provider: "steadfast", confirmLiveBooking: true }),
                  });
                  const retryBody = await retryRes.json().catch(() => ({}));
                  if (!retryRes.ok || retryBody.ok === false) {
                    notify(retryBody.error || "Courier booking rejected");
                    return;
                  }
                  notify(`Booked via Steadfast (${retryBody.shipment?.consignmentId || "created"})`);
                  await loadDetails();
                  return;
                }
                return;
              }
              notify(body.error || "Courier booking rejected");
              return;
            }
            notify(`Booked via Steadfast (${body.shipment?.consignmentId || "created"})`);
            await loadDetails();
          } finally {
            setBusy(false);
          }
        }}
        onRefreshShipment={async (shipmentId) => {
          setBusy(true);
          try {
            const res = await authFetch(`/api/admin/shipments/${shipmentId}/refresh`, {
              method: "POST",
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
              notify(body.error || "Could not sync shipment status");
              return false;
            }
            notify("Courier status refreshed");
            await loadDetails();
            return true;
          } finally {
            setBusy(false);
          }
        }}
        onCancelShipment={async (stub, reason) => {
          setBusy(true);
          try {
            const res = await authFetch(`/api/admin/orders/${stub.id}/shipment`, {
              method: "DELETE",
              body: JSON.stringify({ reason }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
              notify(body.error || "Could not cancel consignment");
              return false;
            }
            notify("Shipment consignment cancelled");
            await loadDetails();
            return true;
          } finally {
            setBusy(false);
          }
        }}
        onReconcileSslcommerz={async (orderNumber) => {
          setBusy(true);
          try {
            const res = await authFetch("/api/payments/reconcile", {
              method: "POST",
              body: JSON.stringify({ orderNumber }),
            });
            const body = await res.json().catch(() => ({}));
            notify(body.ok ? "SSLCOMMERZ verification complete" : body.error || "Verification failed");
            await loadDetails();
            return Boolean(body.ok);
          } finally {
            setBusy(false);
          }
        }}
        onAddNote={async (text) => {
          const res = await authFetch(`/api/admin/orders/${encodeURIComponent(id)}/notes`, {
            method: "POST",
            body: JSON.stringify({ text }),
          });
          if (res.ok) {
            notify("Admin note added");
            await loadDetails();
            return true;
          }
          return false;
        }}
        onSaveSettlement={async (payload) => {
          setBusy(true);
          try {
            const res = await authFetch(
              `/api/admin/orders/${encodeURIComponent(id)}/settlement`,
              {
                method: "POST",
                body: JSON.stringify(payload),
              }
            );
            const body = await res.json().catch(() => ({}));
            notify(body.ok ? "COD settlement reconciled" : body.error || "Settlement failed");
            await loadDetails();
            return Boolean(body.ok);
          } finally {
            setBusy(false);
          }
        }}
        onRecordPayment={async (payload) => {
          setBusy(true);
          try {
            const res = await authFetch(
              `/api/admin/orders/${encodeURIComponent(id)}/payments/manual`,
              {
                method: "POST",
                body: JSON.stringify(payload),
              }
            );
            const body = await res.json().catch(() => ({}));
            notify(body.ok ? "Payment recorded" : body.error || "Payment update failed");
            await loadDetails();
            return Boolean(body.ok);
          } finally {
            setBusy(false);
          }
        }}
        onCodFallback={() => setCodModalOpen(true)}
        onCopy={(v, l) => {
          void navigator.clipboard?.writeText(v);
          notify(`${l} copied`);
        }}
      />

      {/* COD Fallback Modal Dialog */}
      {codModalOpen && data && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setCodModalOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-gray-900">Switch to Cash on Delivery</h3>
                  <p className="font-mono text-[12px] text-gray-500">Order #{data.order.orderNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCodModalOpen(false)}
                className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-[12px] text-amber-900 space-y-1.5 leading-relaxed">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                Customer Agreement Required:
              </p>
              <p>
                This online SSLCOMMERZ order was not paid. By converting to COD, the order becomes
                payable upon delivery, and the collectible COD will be set to:
              </p>
              <div className="flex items-center justify-between rounded-xl bg-white border border-amber-200 px-3 py-2 font-bold text-emerald-800 text-[13px]">
                <span>Expected COD Collection:</span>
                <span>
                  {formatBDT(Math.max(0, data.order.total - (data.order.financials.advancePaidAmount || 0)))}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-2.5 text-[12px] text-gray-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={codAgreed}
                  onChange={(e) => setCodAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-purple-600"
                />
                <span>
                  I have spoken with the customer and they agreed to receive this order via Cash on Delivery.
                </span>
              </label>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Audit Reason (Required)
                </label>
                <textarea
                  value={codReason}
                  onChange={(e) => setCodReason(e.target.value)}
                  placeholder="e.g. Customer called; online transaction failed and customer confirmed COD delivery."
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-[12px] text-gray-800 outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCodModalOpen(false)}
                disabled={busy}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !codAgreed || codReason.trim().length < 5}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const res = await authFetch(`/api/admin/orders/${encodeURIComponent(id)}/payment/cod-fallback`, {
                      method: "POST",
                      body: JSON.stringify({ reason: codReason.trim(), customerAgreed: codAgreed }),
                    });
                    const body = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      notify(body.error || "Failed to switch to COD");
                      return;
                    }
                    notify(body.message || "Order switched to Cash on Delivery");
                    setCodModalOpen(false);
                    await loadDetails();
                  } finally {
                    setBusy(false);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-[12px] font-bold text-white shadow-md shadow-purple-200 hover:bg-purple-700 transition disabled:opacity-50 cursor-pointer"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Switch to COD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
