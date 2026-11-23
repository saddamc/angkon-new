"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  RotateCcw,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Truck,
} from "lucide-react";
import type { AdminOrdersHookReturn } from "../_hooks/use-admin-orders";

interface OrdersKpiBarProps {
  state: AdminOrdersHookReturn;
}

interface Trend {
  direction: "up" | "down" | "flat";
  label: string;
}

function pctChange(current: number, previous: number): Trend | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous <= 0) {
    if (current <= 0) return { direction: "flat", label: "0% vs last 7 days" };
    return { direction: "up", label: `+${current} new vs last 7 days` };
  }
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) return { direction: "flat", label: "0% vs last 7 days" };
  return {
    direction: change > 0 ? "up" : "down",
    label: `${change > 0 ? "+" : ""}${change}% vs last 7 days`,
  };
}

export function OrdersKpiBar({ state }: OrdersKpiBarProps) {
  const { summary, statusCounts, handleFilterChange, filterStatus, paymentFilter, handlePaymentFilterChange } =
    state;

  const total = summary.totalOrders || 0;
  const trends = summary.trends;
  const totalTrend = trends ? pctChange(trends.total7d, trends.totalPrev7d) : null;
  const deliveredTrend = trends ? pctChange(trends.delivered7d, trends.deliveredPrev7d) : null;
  const returnsIssues = summary.cancelledReturnedCount || 0;
  const paymentIssues = summary.paymentIssuesCount ?? 0;
  const returnsShare = total > 0 ? ((returnsIssues / total) * 100).toFixed(1) : "0.0";

  const select = (key: string) => {
    if (paymentFilter !== "any") handlePaymentFilterChange("any");
    handleFilterChange(key);
  };

  const cards: {
    key: string;
    label: string;
    value: number;
    sub?: string;
    trend?: Trend | null;
    icon: typeof ShoppingCart;
    iconTone: string;
    activeTone: string;
    isActive: boolean;
  }[] = [
    {
      key: "any",
      label: "Total Orders",
      value: total,
      trend: totalTrend,
      icon: ShoppingCart,
      iconTone: "bg-purple-100 text-purple-600",
      activeTone: "ring-2 ring-purple-500",
      isActive: filterStatus === "any" && paymentFilter === "any",
    },
    {
      key: "pending",
      label: "Pending",
      value: summary.pendingCount ?? statusCounts.pending ?? 0,
      sub: "Awaiting review",
      icon: Clock,
      iconTone: "bg-amber-100 text-amber-700",
      activeTone: "ring-2 ring-amber-500",
      isActive: filterStatus === "pending",
    },
    {
      key: "needs_action",
      label: "Needs Action",
      value: summary.needsActionCount ?? statusCounts.needs_action ?? 0,
      sub: "Payment or booking required",
      icon: AlertTriangle,
      iconTone: "bg-amber-100 text-amber-600",
      activeTone: "ring-2 ring-amber-500",
      isActive: filterStatus === "needs_action",
    },
    {
      key: "ready_to_book",
      label: "Ready to Book",
      value: summary.readyToBookCount ?? statusCounts.ready_to_book ?? 0,
      sub: "Paid & waiting for courier",
      icon: Package,
      iconTone: "bg-blue-100 text-blue-600",
      activeTone: "ring-2 ring-blue-500",
      isActive: filterStatus === "ready_to_book",
    },
    {
      key: "in_transit",
      label: "In Transit",
      value: summary.inTransitCount ?? statusCounts.in_transit ?? 0,
      sub: "Active courier deliveries",
      icon: Truck,
      iconTone: "bg-indigo-100 text-indigo-600",
      activeTone: "ring-2 ring-indigo-500",
      isActive: filterStatus === "in_transit",
    },
    {
      key: "delivered",
      label: "Delivered",
      value: summary.deliveredCount || 0,
      trend: deliveredTrend,
      icon: CheckCircle2,
      iconTone: "bg-emerald-100 text-emerald-600",
      activeTone: "ring-2 ring-emerald-500",
      isActive: filterStatus === "delivered",
    },
    {
      key: "issues",
      label: "Returns / Issues",
      value: returnsIssues,
      sub:
        paymentIssues > 0
          ? `${returnsShare}% total · ${paymentIssues} Payment Issues`
          : `${returnsShare}% of total orders`,
      icon: RotateCcw,
      iconTone: "bg-rose-100 text-rose-600",
      activeTone: "ring-2 ring-rose-500",
      isActive: filterStatus === "issues",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = card.isActive;
        const TrendIcon =
          card.trend?.direction === "down" ? TrendingDown : TrendingUp;
        return (
          <button
            key={card.key}
            type="button"
            onClick={() => select(card.key)}
            title={card.sub ? `${card.label} — ${card.sub}` : `${card.label} — click to filter`}
            className={`group flex items-center gap-2.5 rounded-xl border border-stone-200/90 bg-white px-3 py-2.5 text-left shadow-xs transition-all duration-200 hover:border-purple-300 hover:shadow-sm cursor-pointer ${
              isActive ? "border-purple-400 bg-purple-50/20 ring-1 ring-purple-200" : ""
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${card.iconTone} transition-transform group-hover:scale-105`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-semibold text-gray-500">
                {card.label}
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-[17px] font-bold leading-tight tracking-tight text-gray-900 tabular-nums">
                  {card.value.toLocaleString("en-BD")}
                </span>
                {card.trend && (
                  <span
                    className={`flex items-center gap-0.5 truncate text-[9.5px] font-semibold ${
                      card.trend.direction === "down"
                        ? "text-rose-600"
                        : card.trend.direction === "flat"
                          ? "text-gray-400"
                          : "text-emerald-600"
                    }`}
                  >
                    {card.trend.direction !== "flat" && <TrendIcon className="h-2.5 w-2.5" />}
                    {card.trend.label}
                  </span>
                )}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
