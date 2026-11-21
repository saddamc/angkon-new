"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { OrderRow } from "./order-row";
import type { AdminOrdersHookReturn } from "../_hooks/use-admin-orders";

interface OrdersTableProps {
  state: AdminOrdersHookReturn;
}

export function OrdersTable({ state }: OrdersTableProps) {
  const {
    loading,
    filteredOrders,
    selectedOrderIds,
    toggleSelectAllVisible,
    page,
    totalPages,
    totalCount,
    goToPage,
  } = state;

  const allSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((o) => selectedOrderIds.includes(String(o.id)));

  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-xs">
      {/* Desktop Table Header */}
      <div className="hidden lg:grid grid-cols-[28px_minmax(130px,1.15fr)_minmax(150px,1.2fr)_minmax(170px,1.3fr)_100px_130px_90px_110px_90px] gap-2.5 px-5 py-3.5 bg-stone-50/80 text-[10.5px] font-bold uppercase tracking-wider text-gray-500 border-b border-stone-200/80 items-center">
        <input
          type="checkbox"
          aria-label="Select all visible orders"
          checked={allSelected}
          onChange={toggleSelectAllVisible}
          className="h-3.5 w-3.5 rounded border-purple-300 accent-purple-600 cursor-pointer"
        />
        <span>Order # & Date</span>
        <span>Customer</span>
        <span>Products</span>
        <span>Payment</span>
        <span>Shipment</span>
        <span>Total</span>
        <span>Status</span>
        <span className="text-right">Actions</span>
      </div>

      {loading ? (
        <div className="space-y-1.5 p-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-purple-50/40 animate-pulse" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <p className="text-center py-24 text-gray-400 text-sm">
          No orders match your current filters.
        </p>
      ) : (
        <div className="divide-y divide-stone-100">
          {filteredOrders.map((order, idx) => (
            <OrderRow key={order.id} order={order} idx={(page - 1) * 25 + idx} state={state} />
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200/80 bg-white px-5 py-3">
        <p className="text-[12px] text-gray-500">
          Showing{" "}
          <strong className="text-gray-900 font-bold">
            {totalCount === 0 ? 0 : (page - 1) * 25 + 1} - {Math.min(page * 25, totalCount)}
          </strong>{" "}
          of <strong className="text-gray-900 font-bold">{totalCount.toLocaleString("en-BD")}</strong> orders
        </p>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => goToPage(page - 1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-purple-300 hover:text-purple-700 disabled:opacity-30 cursor-pointer transition"
            title="Previous page"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Dynamic Page Pill List */}
          {(() => {
            const pages: (number | string)[] = [];
            if (totalPages <= 7) {
              for (let i = 1; i <= totalPages; i++) pages.push(i);
            } else {
              pages.push(1);
              if (page > 3) pages.push("...");
              const start = Math.max(2, page - 1);
              const end = Math.min(totalPages - 1, page + 1);
              for (let i = start; i <= end; i++) pages.push(i);
              if (page < totalPages - 2) pages.push("...");
              pages.push(totalPages);
            }

            return pages.map((p, idx) =>
              typeof p === "string" ? (
                <span key={`dots-${idx}`} className="px-1 text-xs text-gray-400">
                  ...
                </span>
              ) : (
                <button
                  key={`page-${p}`}
                  type="button"
                  onClick={() => goToPage(p)}
                  className={`h-8 w-8 rounded-lg text-[12px] font-bold transition cursor-pointer flex items-center justify-center ${
                    page === p
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-gray-700 hover:bg-purple-50 hover:text-purple-700 border border-transparent"
                  }`}
                >
                  {p}
                </button>
              )
            );
          })()}

          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => goToPage(page + 1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-purple-300 hover:text-purple-700 disabled:opacity-30 cursor-pointer transition"
            title="Next page"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
