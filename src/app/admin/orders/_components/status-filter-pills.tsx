"use client";

import { AlertCircle } from "lucide-react";
import type { AdminOrdersHookReturn } from "../_hooks/use-admin-orders";

interface StatusFilterPillsProps {
  state: AdminOrdersHookReturn;
}

const PRIMARY_TABS = [
  { key: "any", label: "All Orders" },
  { key: "needs_action", label: "Needs Action", isAlert: true },
  { key: "pending", label: "Pending" },
  { key: "processing", label: "Processing" },
  { key: "ready_to_ship", label: "Ready to Ship" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
  { key: "returned", label: "Returned" },
];

export function StatusFilterPills({ state }: StatusFilterPillsProps) {
  const { filterStatus, handleFilterChange, statusCounts, summary } = state;

  const getCount = (key: string) => {
    if (key === "any") return summary.totalOrders;
    if (key === "needs_action") return summary.needsActionCount ?? statusCounts.needs_action ?? 0;
    if (key === "delivered") return (statusCounts.delivered || 0) + (statusCounts.completed || 0);
    if (key === "returned") return (statusCounts.returned || 0) + (statusCounts.refunded || 0);
    return statusCounts[key] ?? 0;
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      {PRIMARY_TABS.map((tab) => {
        const count = getCount(tab.key);
        const active = filterStatus === tab.key;
        const isNeedsActionTab = tab.key === "needs_action";

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleFilterChange(tab.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold transition-all duration-200 cursor-pointer ${
              active
                ? isNeedsActionTab
                  ? "bg-amber-600 text-white shadow-md shadow-amber-200"
                  : "bg-purple-600 text-white shadow-md shadow-purple-200"
                : isNeedsActionTab && count > 0
                  ? "border border-amber-300 bg-amber-50/80 text-amber-900 hover:bg-amber-100"
                  : "border border-stone-200/90 bg-white text-gray-700 hover:border-purple-300 hover:text-purple-700"
            }`}
          >
            {isNeedsActionTab && (
              <AlertCircle
                className={`h-3.5 w-3.5 ${active ? "text-white" : "text-amber-600"}`}
              />
            )}
            <span>{tab.label}</span>
            <span
              className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                active
                  ? "bg-white/25 text-white"
                  : isNeedsActionTab && count > 0
                    ? "bg-amber-200/90 text-amber-900"
                    : "bg-purple-50 text-purple-700"
              }`}
            >
              {count.toLocaleString("en-BD")}
            </span>
          </button>
        );
      })}
    </div>
  );
}
