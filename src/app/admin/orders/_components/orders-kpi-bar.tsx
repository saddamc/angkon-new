"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  RotateCcw,
  ShoppingCart,
  Truck,
} from "lucide-react";
import type { AdminOrdersHookReturn } from "../_hooks/use-admin-orders";

interface OrdersKpiBarProps {
  state: AdminOrdersHookReturn;
}

export function OrdersKpiBar({ state }: OrdersKpiBarProps) {
  const { summary, statusCounts, handleFilterChange, filterStatus, paymentFilter, handlePaymentFilterChange } =
    state;

  const paymentIssuesCount = summary.paymentIssuesCount ?? 0;

  const cards = [
    {
      key: "any",
      label: "Total Orders",
      value: summary.totalOrders.toLocaleString("en-BD"),
      badge: "+12%",
      badgeSub: "vs last 30 days",
      icon: ShoppingCart,
      iconTone: "bg-purple-100 text-purple-600",
      activeTone: "ring-2 ring-purple-500",
      isActive: filterStatus === "any" && paymentFilter === "any",
      onClick: () => {
        if (paymentFilter !== "any") handlePaymentFilterChange("any");
        handleFilterChange("any");
      },
    },
    {
      key: "pending",
      label: "Pending",
      value: summary.pendingCount.toLocaleString("en-BD"),
      sub: "Needs confirmation",
      icon: Clock,
      iconTone: "bg-orange-100 text-orange-600",
      activeTone: "ring-2 ring-orange-500",
      isActive: filterStatus === "pending",
      onClick: () => {
        if (paymentFilter !== "any") handlePaymentFilterChange("any");
        handleFilterChange("pending");
      },
    },
    {
      key: "processing",
      label: "Processing",
      value: (statusCounts.processing ?? 0).toLocaleString("en-BD"),
      sub: "Preparing orders",
      icon: Package,
      iconTone: "bg-blue-100 text-blue-600",
      activeTone: "ring-2 ring-blue-500",
      isActive: filterStatus === "processing",
      onClick: () => {
        if (paymentFilter !== "any") handlePaymentFilterChange("any");
        handleFilterChange("processing");
      },
    },
    {
      key: "shipped",
      label: "Shipped",
      value: summary.shippedCount.toLocaleString("en-BD"),
      sub: "In delivery",
      icon: Truck,
      iconTone: "bg-indigo-100 text-indigo-600",
      activeTone: "ring-2 ring-indigo-500",
      isActive: filterStatus === "shipped",
      onClick: () => {
        if (paymentFilter !== "any") handlePaymentFilterChange("any");
        handleFilterChange("shipped");
      },
    },
    {
      key: "delivered",
      label: "Delivered",
      value: summary.deliveredCount.toLocaleString("en-BD"),
      sub: "Completed",
      icon: CheckCircle2,
      iconTone: "bg-emerald-100 text-emerald-600",
      activeTone: "ring-2 ring-emerald-500",
      isActive: filterStatus === "delivered",
      onClick: () => {
        if (paymentFilter !== "any") handlePaymentFilterChange("any");
        handleFilterChange("delivered");
      },
    },
    {
      key: "returned",
      label: "Returned",
      value: (statusCounts.returned ?? 0).toLocaleString("en-BD"),
      sub: "Returned parcels",
      icon: RotateCcw,
      iconTone: "bg-rose-100 text-rose-600",
      activeTone: "ring-2 ring-rose-500",
      isActive: filterStatus === "returned",
      onClick: () => {
        if (paymentFilter !== "any") handlePaymentFilterChange("any");
        handleFilterChange("returned");
      },
    },
    {
      key: "payment_issues",
      label: "Payment Issues",
      value: paymentIssuesCount.toLocaleString("en-BD"),
      sub: "Unresolved online",
      icon: AlertTriangle,
      iconTone:
        paymentIssuesCount > 0 ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-500",
      activeTone: "ring-2 ring-amber-500",
      isActive: paymentFilter === "issues",
      onClick: () => {
        handleFilterChange("any");
        handlePaymentFilterChange("issues");
      },
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = card.isActive;
        return (
          <button
            key={card.key}
            type="button"
            onClick={card.onClick}
            className={`group flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-3.5 shadow-xs transition-all duration-200 hover:border-purple-300 hover:shadow-sm text-left cursor-pointer ${
              isActive
                ? "border-purple-400 bg-purple-50/20 shadow-xs ring-1 ring-purple-200"
                : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${card.iconTone} transition-transform group-hover:scale-105`}
              >
                <Icon className="h-4 w-4" />
              </span>
              {card.badge && (
                <span className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                  {card.badge}
                </span>
              )}
            </div>

            <div className="mt-2.5 space-y-0.5">
              <p className="text-[11px] font-semibold text-gray-500 truncate">{card.label}</p>
              <p className="text-[18px] font-bold tracking-tight text-gray-900 tabular-nums">
                {card.value}
              </p>
              {card.badgeSub ? (
                <p className="text-[10px] text-gray-400 truncate">{card.badgeSub}</p>
              ) : card.sub ? (
                <p className="text-[10px] text-gray-400 truncate">{card.sub}</p>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
