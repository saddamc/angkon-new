"use client";

import { Search, RefreshCw } from "lucide-react";
import type { AdminOrdersHookReturn } from "../_hooks/use-admin-orders";

interface OrdersSearchBarProps {
  state: AdminOrdersHookReturn;
}

export function OrdersSearchBar({ state }: OrdersSearchBarProps) {
  const { searchQuery, setSearchQuery, load, filterStatus, loading } = state;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div />
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order #, phone, customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition w-64"
          />
        </div>
        <button
          onClick={() => void load(filterStatus)}
          className="inline-flex items-center gap-2 rounded-xl border border-purple-100 bg-white px-3 py-2.5 text-[13px] text-gray-600 hover:text-purple-600 hover:border-purple-300 transition shadow-sm cursor-pointer"
          title="Refresh Orders"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
    </div>
  );
}
