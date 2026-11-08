"use client";

import { BarChart2, TrendingUp } from "lucide-react";
import { MetricToggleCard } from "@/components/admin/meta/metric-toggle-card";
import { PerformanceChart } from "@/components/admin/meta/performance-chart";
import type { AnalyticsPeriod, MetaOverviewState } from "../_types/meta-overview.types";

interface MetaKpiSectionProps {
  overview: MetaOverviewState;
}

export function MetaKpiSection({ overview }: MetaKpiSectionProps) {
  const {
    analyticsPeriod,
    setAnalyticsPeriod,
    activeMetrics,
    handleToggleMetric,
    totalCapturedEvents,
    analyticsData,
    timeseries,
  } = overview;

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-emerald-600" />
            <span>Business Intelligence</span>
            <span className="text-xs font-normal text-slate-500">(Orders &amp; Revenue from Store)</span>
          </h2>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
          {(["today", "7d", "30d", "month", "year"] as const).map((p: AnalyticsPeriod) => (
            <button
              key={p}
              type="button"
              onClick={() => setAnalyticsPeriod(p)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                analyticsPeriod === p
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p === "today"
                ? "Today"
                : p === "7d"
                ? "7 Days"
                : p === "30d"
                ? "30 Days"
                : p === "month"
                ? "This Month"
                : "This Year"}
            </button>
          ))}
        </div>
      </div>

      {/* Google Search Console & Meta-Style Togglable Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {/* Card 1: Meta Events Telemetry (Sky Blue - Exact Meta Events Manager #70C5F7) */}
        <MetricToggleCard
          id="events"
          label="Total Events"
          value={totalCapturedEvents.toLocaleString()}
          subValue="Website + CAPI Signals"
          checked={activeMetrics.events}
          onToggle={handleToggleMetric}
          color="sky"
          metricKey="telemetry-events"
        />

        {/* Card 2: Revenue (Blue) */}
        <MetricToggleCard
          id="revenue"
          label="Store Revenue"
          value={analyticsData ? `৳${analyticsData.revenue.total.toLocaleString("en-BD")}` : "Loading…"}
          subValue={analyticsData ? `Paid: ৳${analyticsData.revenue.paid.toLocaleString("en-BD")}` : undefined}
          checked={activeMetrics.revenue}
          onToggle={handleToggleMetric}
          color="blue"
          metricKey="store-revenue"
        />

        {/* Card 3: Orders (Purple) */}
        <MetricToggleCard
          id="orders"
          label="Orders Completed"
          value={analyticsData ? analyticsData.orders.total : "—"}
          subValue={
            analyticsData
              ? `${analyticsData.orders.completed} completed · AOV ৳${analyticsData.revenue.aov}`
              : undefined
          }
          checked={activeMetrics.orders}
          onToggle={handleToggleMetric}
          color="purple"
          metricKey="orders-completed"
        />

        {/* Card 4: Ad Spend (Amber) */}
        <MetricToggleCard
          id="spend"
          label={`Meta Ad Spend (${analyticsData?.adSpend?.currency || "USD"})`}
          value={
            analyticsData?.adSpend && analyticsData.adSpend.total > 0
              ? analyticsData.adSpend.currency === "USD"
                ? `$${analyticsData.adSpend.total.toFixed(2)} USD`
                : `৳${analyticsData.adSpend.total.toLocaleString("en-BD")}`
              : "0.00"
          }
          subValue={
            analyticsData?.adSpend?.currency === "USD" && (analyticsData.adSpend.totalInBdt ?? 0) > 0
              ? `≈ ৳${analyticsData.adSpend.totalInBdt?.toLocaleString()} BDT · ${analyticsData.adSpend.clicks.toLocaleString()} clicks`
              : analyticsData?.adSpend
              ? `${analyticsData.adSpend.clicks.toLocaleString()} clicks · ${analyticsData.adSpend.impressions.toLocaleString()} impr.`
              : "No active spend"
          }
          checked={activeMetrics.spend}
          onToggle={handleToggleMetric}
          color="amber"
          metricKey="meta-ad-spend"
        />

        {/* Card 5: Ad Clicks & Blended ROAS (Indigo) */}
        <MetricToggleCard
          id="clicks"
          label="Ad Clicks & Blended ROAS"
          value={analyticsData?.adSpend ? analyticsData.adSpend.clicks.toLocaleString() : "0"}
          subValue={
            analyticsData?.adSpend && analyticsData.adSpend.blendedRoas > 0
              ? `Blended ROAS: ${analyticsData.adSpend.blendedRoas}x`
              : "Blended ROAS: —"
          }
          checked={activeMetrics.clicks}
          onToggle={handleToggleMetric}
          color="indigo"
          metricKey="blended-roas"
        />
      </div>

      {/* Synchronized Performance Chart */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
          <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
            <span>
              Performance Trend —{" "}
              {analyticsPeriod === "today"
                ? "Today (Last 24 Hours)"
                : analyticsPeriod === "7d"
                ? "Last 7 Days"
                : analyticsPeriod === "30d"
                ? "Last 30 Days"
                : analyticsPeriod === "month"
                ? "This Month (Month-to-Date)"
                : "This Year (Year-to-Date)"}
            </span>
            {analyticsPeriod === "month" && (
              <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Month-to-date
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Hover over points to inspect metrics
          </div>
        </div>
        <PerformanceChart
          data={timeseries}
          activeMetrics={activeMetrics}
          spendCurrency={analyticsData?.adSpend?.currency || "USD"}
          spendCurrencySymbol={analyticsData?.adSpend?.currencySymbol || "$"}
        />
      </div>
    </div>
  );
}
