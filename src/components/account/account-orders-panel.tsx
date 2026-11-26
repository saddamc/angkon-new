"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Package, Search, ShoppingBag } from "lucide-react";
import { CustomerCancellationModal } from "@/components/account/customer-cancellation-modal";
import type { AccountNotice, AccountOrderSummary } from "@/types/account";
import { AccountOrderCard, getOrderCancellationDecision } from "./account-order-card";
import { accountInputClass } from "./account-ui";

type OrderFilter = "all" | "active" | "delivered" | "cancelled";

interface AccountOrdersPanelProps {
  orders: AccountOrderSummary[];
  emailVerified: boolean;
  highlightedOrderNumber?: string | null;
  onOpenInvoice: (order: AccountOrderSummary) => void;
  onReloadSession: () => Promise<void>;
  onNotice: (notice: AccountNotice) => void;
}

export function AccountOrdersPanel({
  orders,
  emailVerified,
  highlightedOrderNumber,
  onOpenInvoice,
  onReloadSession,
  onNotice,
}: AccountOrdersPanelProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [cancellationOrder, setCancellationOrder] = useState<AccountOrderSummary | null>(null);
  const [withdrawingOrder, setWithdrawingOrder] = useState<string | null>(null);

  const counts = useMemo(() => {
    const active = orders.filter((o) =>
      !["delivered", "completed", "cancelled", "returned", "refunded", "failed"].includes(
        String(o.orderStatus || "").toLowerCase()
      )
    ).length;
    const delivered = orders.filter((o) =>
      ["delivered", "completed"].includes(String(o.orderStatus || "").toLowerCase())
    ).length;
    const cancelled = orders.filter((o) =>
      ["cancelled", "returned", "refunded", "failed"].includes(
        String(o.orderStatus || "").toLowerCase()
      )
    ).length;
    return { all: orders.length, active, delivered, cancelled };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((ord) => {
      const status = String(ord.orderStatus || "").toLowerCase();
      if (
        filter === "active" &&
        ["delivered", "completed", "cancelled", "returned", "refunded", "failed"].includes(status)
      ) {
        return false;
      }
      if (filter === "delivered" && !["delivered", "completed"].includes(status)) {
        return false;
      }
      if (
        filter === "cancelled" &&
        !["cancelled", "returned", "refunded", "failed"].includes(status)
      ) {
        return false;
      }
      if (!q) return true;
      const hitOrder = ord.orderNumber.toLowerCase().includes(q);
      const hitTracking = (ord.trackingCode || ord.consignmentId || "").toLowerCase().includes(q);
      const hitItems = ord.items.some((it) => it.name.toLowerCase().includes(q));
      return hitOrder || hitTracking || hitItems;
    });
  }, [orders, filter, search]);

  const handleWithdrawCancellation = async (orderNumber: string) => {
    if (withdrawingOrder) return;
    setWithdrawingOrder(orderNumber);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}/cancellation`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onNotice({ text: data.error || "Could not withdraw cancellation request.", type: "error" });
        return;
      }
      onNotice({ text: data.message || "Cancellation request withdrawn.", type: "success" });
      await onReloadSession();
    } catch {
      onNotice({ text: "Network error while withdrawing request.", type: "error" });
    } finally {
      setWithdrawingOrder(null);
    }
  };

  if (orders.length === 0) {
    return (
      <div className="rounded-3xl border border-[#E1B76F]/25 bg-[#3b050b] p-10 text-center space-y-4 shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#E1B76F]/35 bg-[#2b0408] text-[#E1B76F]">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h2 className="font-heading text-xl font-black uppercase text-white">No Orders Yet</h2>
        <p className="mx-auto max-w-md text-sm text-[#F5EAE0] leading-relaxed">
          {emailVerified
            ? "Once you place an order with ANGKON, parcel tracking, official invoices, and order details will appear here."
            : "No orders linked yet. Verify your email address above if you ordered as a guest earlier."}
        </p>
        <div className="pt-2">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E1B76F] to-[#edd19b] px-6 py-3 text-xs font-black uppercase tracking-wider text-[#2a0408] hover:brightness-105 transition shadow-lg"
          >
            Explore Collection <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const filterButtons: Array<{ key: OrderFilter; label: string; count: number }> = [
    { key: "all", label: "All", count: counts.all },
    { key: "active", label: "Active", count: counts.active },
    { key: "delivered", label: "Delivered", count: counts.delivered },
    { key: "cancelled", label: "Cancelled", count: counts.cancelled },
  ];

  return (
    <div className="space-y-4">
      {/* Search & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-3.5 sm:p-4 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          {filterButtons.map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={() => setFilter(btn.key)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                filter === btn.key
                  ? "bg-gradient-to-r from-[#E1B76F] to-[#edd19b] text-[#2a0408] shadow-md"
                  : "border border-[#E1B76F]/25 bg-[#2b0408] text-white/85 hover:border-[#E1B76F]/55 hover:text-white"
              }`}
            >
              <span>{btn.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                  filter === btn.key ? "bg-[#2a0408]/15 text-[#2a0408]" : "bg-[#3b050b] text-[#E1B76F]"
                }`}
              >
                {btn.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative md:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-white/60" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, item, tracking…"
            aria-label="Search orders"
            className={`${accountInputClass} pl-10 py-2.5 text-xs`}
          />
        </div>
      </div>

      {/* Filtered Order List */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-8 text-center space-y-2 shadow-lg">
          <Package className="mx-auto h-8 w-8 text-[#E1B76F]/75" />
          <p className="text-sm font-bold text-white">No matching orders found</p>
          <p className="text-xs text-[#EADBC8]">Try clearing your search or switching status filters.</p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setFilter("all");
            }}
            className="mt-2 inline-flex rounded-lg border border-[#E1B76F]/45 bg-[#2b0408] px-3.5 py-1.5 text-xs font-bold text-[#E1B76F] hover:bg-[#490810] cursor-pointer"
          >
            Show All Orders
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((ord) => (
            <AccountOrderCard
              key={ord.orderNumber}
              order={ord}
              initialExpanded={Boolean(
                highlightedOrderNumber &&
                  ord.orderNumber.toLowerCase() === highlightedOrderNumber.toLowerCase()
              )}
              withdrawingOrder={withdrawingOrder}
              onOpenInvoice={onOpenInvoice}
              onRequestCancellation={setCancellationOrder}
              onWithdrawCancellation={handleWithdrawCancellation}
              onNotice={onNotice}
            />
          ))}
        </div>
      )}

      {cancellationOrder && (
        <CustomerCancellationModal
          orderNumber={cancellationOrder.orderNumber}
          orderStatus={cancellationOrder.orderStatus}
          paymentMethod={cancellationOrder.paymentMethod}
          paymentStatus={cancellationOrder.paymentStatus}
          shipmentStatus={cancellationOrder.shipmentStatus}
          total={cancellationOrder.total}
          paidAmount={cancellationOrder.paidAmount}
          mode={
            getOrderCancellationDecision(cancellationOrder).mode === "instant"
              ? "instant"
              : "request"
          }
          onClose={() => setCancellationOrder(null)}
          onSubmitted={(message: string) => {
            setCancellationOrder(null);
            onNotice({ text: message, type: "success" });
            void onReloadSession();
          }}
        />
      )}
    </div>
  );
}
