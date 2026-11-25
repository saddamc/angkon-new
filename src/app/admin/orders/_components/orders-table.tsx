"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { OrderRow } from "./order-row";
import { ORDER_TABLE_GRID, ORDER_TABLE_MIN_WIDTH } from "./order-table-grid";
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
    perPage,
    handlePerPageChange,
    totalPages,
    totalCount,
    goToPage,
  } = state;

  const allSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((o) => selectedOrderIds.includes(String(o.id)));

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-xs">
      {/* Horizontally scrollable area keeps every column readable on smaller
          desktops instead of letting dense cells overlap each other. */}
      <div className="overflow-x-auto">
        <div className={ORDER_TABLE_MIN_WIDTH}>
          {/* Desktop Table Header */}
          <div
            className={`hidden lg:grid ${ORDER_TABLE_GRID} items-center gap-3 border-b border-stone-200/80 bg-stone-50/80 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500`}
          >
            <input
              type="checkbox"
              aria-label="Select all visible orders"
              checked={allSelected}
              onChange={toggleSelectAllVisible}
              className="h-3.5 w-3.5 cursor-pointer rounded border-purple-300 accent-purple-600"
            />
            <span>Order</span>
            <span>Customer</span>
            <span>Items</span>
            <span>Payment</span>
            <span>Courier</span>
            <span>Total</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          {loading ? (
            <div className="space-y-1.5 p-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-purple-50/40" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 px-4 text-center">
              <p className="text-sm font-semibold text-gray-700">
                No orders match your current filters.
              </p>
              <p className="text-xs text-gray-400">
                Try clearing your search or adjusting the date and status filters.
              </p>
              <button
                type="button"
                onClick={() => state.clearAllFilters()}
                className="rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-stone-200/70">
              {filteredOrders.map((order, idx) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  idx={(page - 1) * perPage + idx}
                  state={state}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col gap-2 border-t border-stone-200/80 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-gray-500">
          <p>
            Showing{" "}
            <strong className="font-bold text-gray-900">
              {totalCount === 0 ? 0 : (page - 1) * perPage + 1} -{" "}
              {Math.min(page * perPage, totalCount)}
            </strong>{" "}
            of{" "}
            <strong className="font-bold text-gray-900">
              {totalCount.toLocaleString("en-BD")}
            </strong>{" "}
            orders
          </p>
          <span className="hidden h-3 w-px bg-stone-200 sm:block" aria-hidden />
          <label className="flex items-center gap-1.5">
            Rows per page
            <select
              value={perPage}
              onChange={(e) => handlePerPageChange(Number(e.target.value))}
              disabled={loading}
              className="rounded-lg border border-gray-200 bg-white px-1.5 py-1 text-[11px] font-semibold text-gray-700 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 disabled:opacity-50"
              aria-label="Rows per page"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

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
