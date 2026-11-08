"use client";

import { OrderRow } from "./order-row";
import type { AdminOrdersHookReturn } from "../_hooks/use-admin-orders";

interface OrdersTableProps {
  state: AdminOrdersHookReturn;
}

export function OrdersTable({ state }: OrdersTableProps) {
  const { loading, filteredOrders } = state;

  return (
    <div className="bg-white rounded-2xl border border-purple-100/60 overflow-hidden shadow-sm">
      {/* Table header */}
      <div className="hidden lg:grid grid-cols-[45px_150px_minmax(190px,1.4fr)_minmax(180px,1.2fr)_120px_100px_90px_105px] gap-3 px-5 py-3.5 bg-purple-50/70 text-[10px] font-bold uppercase tracking-widest text-purple-600 border-b border-purple-100/50 items-center">
        <span>SL</span>
        <span>Order No & Date</span>
        <span>Customer Info</span>
        <span>Product Info</span>
        <span>Payment</span>
        <span>Total</span>
        <span>Due</span>
        <span>Status</span>
      </div>

      {loading ? (
        <div className="space-y-1 p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-purple-50/60 animate-pulse"
            />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <p className="text-center py-24 text-gray-400 text-sm">
          No orders found.
        </p>
      ) : (
        <div className="divide-y divide-purple-50">
          {filteredOrders.map((order, idx) => (
            <OrderRow
              key={order.id}
              order={order}
              idx={idx}
              state={state}
            />
          ))}
        </div>
      )}
    </div>
  );
}
