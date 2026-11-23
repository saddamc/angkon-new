"use client";

import { AlertCircle, Clock } from "lucide-react";
import type { AdminOrdersHookReturn } from "../_hooks/use-admin-orders";

interface StatusFilterPillsProps {
  state: AdminOrdersHookReturn;
}

const PRIMARY_TABS = [
  { key: "any", label: "All Orders" },
  { key: "pending", label: "Pending", isPending: true },
  { key: "needs_action", label: "Needs Action", isAlert: true },
  { key: "ready_to_book", label: "Ready to Book" },
  { key: "in_transit", label: "In Transit" },
  { key: "delivered", label: "Delivered" },
  { key: "issues", label: "Issues", isIssues: true },
];

export function StatusFilterPills({ state }: StatusFilterPillsProps) {
  const { filterStatus, handleFilterChange, statusCounts, summary } = state;

  const getCount = (key: string) => {
    if (key === "any") return summary.totalOrders;
    if (key === "pending") return summary.pendingCount ?? statusCounts.pending ?? 0;
    if (key === "needs_action") return summary.needsActionCount ?? statusCounts.needs_action ?? 0;
    if (key === "ready_to_book") return summary.readyToBookCount ?? statusCounts.ready_to_book ?? 0;
    if (key === "in_transit") return summary.inTransitCount ?? statusCounts.in_transit ?? 0;
    if (key === "delivered") return (statusCounts.delivered || 0) + (statusCounts.completed || 0);
    if (key === "issues") return statusCounts.issues ?? 0;
    return statusCounts[key] ?? 0;
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto px-0.5 py-1 scrollbar-none">
      {PRIMARY_TABS.map((tab) => {
        const count = getCount(tab.key);
        const active = filterStatus === tab.key;
        const isPendingTab = tab.key === "pending";
        const isNeedsActionTab = tab.key === "needs_action";
        const isIssuesTab = tab.key === "issues";

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleFilterChange(tab.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold transition-all duration-200 cursor-pointer ${
              active
                ? isPendingTab || isNeedsActionTab
                  ? "bg-amber-600 text-white shadow-md shadow-amber-200"
                  : isIssuesTab
                    ? "bg-rose-600 text-white shadow-md shadow-rose-200"
                    : "bg-purple-600 text-white shadow-md shadow-purple-200"
                : isPendingTab && count > 0
                  ? "border border-amber-300 bg-amber-50/80 text-amber-900 hover:bg-amber-100"
                  : isNeedsActionTab && count > 0
                    ? "border border-amber-300 bg-amber-50/80 text-amber-900 hover:bg-amber-100"
                    : isIssuesTab && count > 0
                      ? "border border-rose-300 bg-rose-50/80 text-rose-900 hover:bg-rose-100"
                      : "border border-stone-200/90 bg-white text-gray-700 hover:border-purple-300 hover:text-purple-700"
            }`}
          >
            {isPendingTab && (
              <Clock
                className={`h-3.5 w-3.5 ${active ? "text-white" : "text-amber-600"}`}
              />
            )}
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
                  : isPendingTab && count > 0
                    ? "bg-amber-200/90 text-amber-900"
                    : isNeedsActionTab && count > 0
                      ? "bg-amber-200/90 text-amber-900"
                      : isIssuesTab && count > 0
                        ? "bg-rose-200/90 text-rose-900"
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
