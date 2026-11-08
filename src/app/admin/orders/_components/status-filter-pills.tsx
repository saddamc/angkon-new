"use client";

import { STATUS_FILTERS } from "../_types/orders.types";
import type { AdminOrdersHookReturn } from "../_hooks/use-admin-orders";

interface StatusFilterPillsProps {
  state: AdminOrdersHookReturn;
}

export function StatusFilterPills({ state }: StatusFilterPillsProps) {
  const { filterStatus, handleFilterChange, statusCounts } = state;

  return (
    <div className="bg-white rounded-2xl border border-purple-100/60 p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
        Filter by Status
      </p>
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const count = statusCounts[f.key] ?? 0;
          const active = filterStatus === f.key;
          return (
            <button
              key={f.key}
              onClick={() => handleFilterChange(f.key)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-200 border ${
                active
                  ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200"
                  : "bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600"
              }`}
            >
              {f.label}
              <span
                className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full text-[10px] font-bold px-1 ${
                  active ? "bg-white/20 text-white" : "bg-purple-100 text-purple-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
