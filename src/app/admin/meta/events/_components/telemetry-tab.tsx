import { Fragment } from "react";
import {
  Activity,
  Share2,
  Sparkles,
  TrendingUp,
  Search,
  Filter,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  CheckCheck,
  FileJson,
  Copy,
  Check,
} from "lucide-react";
import { InfoPopover } from "@/components/admin/meta/info-popover";
import { PerformanceChart, type PerformanceDataPoint } from "@/components/admin/meta/performance-chart";
import { EmqBreakdown } from "@/components/admin/meta/emq-breakdown";
import { scoreLabel } from "@/components/admin/meta/meta-ui";
import type { PixelEventRecord } from "@/server/pixel-settings";
import type {
  MetaEventRow,
  DeliveryStats,
  DeduplicationStats,
  ChannelStats,
} from "../_types/events.types";

interface TelemetryTabProps {
  totalEventsCount: number;
  channelStats: ChannelStats | null;
  deliveryStats: DeliveryStats | null;
  deduplicationStats: DeduplicationStats | null;
  emqState: {
    status: string;
    report?: {
      compositeScore: number | null;
      events: any[];
      fetchedAt?: string;
    };
    message?: string;
  };
  emqScore: number | null;
  emqEvents: any[];
  bestEmqEvent: any;
  hasCapiToken: boolean;
  metaEventsRows: MetaEventRow[];
  eventStats: Record<string, number>;
  overviewView: "activities" | "integrations";
  setOverviewView: (v: "activities" | "integrations") => void;
  activeChartMetric: "events" | "revenue" | "orders";
  setActiveChartMetric: (m: "events" | "revenue" | "orders") => void;
  chartPeriod: "today" | "7d" | "28d" | "month" | "year";
  setChartPeriod: (p: "today" | "7d" | "28d" | "month" | "year") => void;
  timeseries: PerformanceDataPoint[];
  loadingTimeseries: boolean;
  eventsTableSearch: string;
  setEventsTableSearch: (s: string) => void;
  eventsTableFilter: "ALL" | "BROWSER" | "SERVER";
  setEventsTableFilter: (f: "ALL" | "BROWSER" | "SERVER") => void;
  expandedMetaEvent: string | null;
  setExpandedMetaEvent: (id: string | null) => void;
  onOpenEventDrawer: (row: MetaEventRow) => void;
  events: PixelEventRecord[];
  copiedPayloadId: string | null;
  onCopyPayload: (id: string, text: string) => void;
  formatMetaReported: (eventName: string, value: number | null) => string;
}

export function TelemetryTab({
  totalEventsCount,
  channelStats,
  deliveryStats,
  deduplicationStats,
  emqState,
  emqScore,
  emqEvents,
  bestEmqEvent,
  hasCapiToken,
  metaEventsRows,
  eventStats,
  overviewView,
  setOverviewView,
  activeChartMetric,
  setActiveChartMetric,
  chartPeriod,
  setChartPeriod,
  timeseries,
  loadingTimeseries,
  eventsTableSearch,
  setEventsTableSearch,
  eventsTableFilter,
  setEventsTableFilter,
  expandedMetaEvent,
  setExpandedMetaEvent,
  onOpenEventDrawer,
  events,
  copiedPayloadId,
  onCopyPayload,
  formatMetaReported,
}: TelemetryTabProps) {
  return (
    <div className="space-y-6">
      {/* 4 EXECUTIVE TELEMETRY KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Events */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total Events Processed</span>
            <InfoPopover
              title="Total Storefront Events"
              description="Aggregated count of all shopper activities received and processed by ANGKON's tracking engine across the selected timeframe."
              whyNeeded="Shows total telemetry volume used by Meta algorithms to identify prospective saree buyers."
              businessImpact="High event volume allows Meta Advantage+ algorithms to exit the learning phase faster."
            />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {totalEventsCount.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-600 font-medium">
              <span>{channelStats?.browserCount ?? 0} Web · {channelStats?.serverCount ?? 0} Server</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Delivery Reliability</span>
            <span className="font-semibold text-emerald-600">
              {deliveryStats?.deliverySuccessRate !== null && deliveryStats?.deliverySuccessRate !== undefined
                ? `${deliveryStats.deliverySuccessRate}% Dispatched`
                : "—"}
            </span>
          </div>
        </div>

        {/* Card 2: Event Match Quality (EMQ) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Average Match Quality (EMQ)</span>
            <InfoPopover
              title="Event Match Quality (EMQ)"
              description="A Meta score from 0 to 10 that grades how effectively customer data (email, phone, city, postal code) matches Meta user profiles."
              whyNeeded="Meta matches customer details to profiles to give your ads credit for conversions."
              businessImpact="Every +1.0 in Match Quality reduces customer acquisition cost (CAC) and optimizes ad budget efficiency."
              actionableTip="Ensure both phone and email are collected during checkout for maximum match quality."
            />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {emqState.status === "loading"
                  ? "…"
                  : emqScore !== null
                    ? emqScore.toFixed(1)
                    : "—"}
              </span>
              <span className="text-xs font-semibold text-slate-400">/ 10</span>
              {emqScore !== null ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {scoreLabel(emqScore, 10)}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200">
                  {emqState.status === "error" ? "Unavailable" : "Awaiting data"}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">
              {emqState.status === "ready"
                ? (() => {
                    const scored = emqEvents.filter((e) => e.score !== null).length;
                    return `${scored} event${scored === 1 ? "" : "s"} scored live from Meta`;
                  })()
                : emqState.status === "error"
                  ? emqState.message
                  : "Reading match quality from Meta…"}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between gap-2">
            <span>Best event</span>
            <span className="font-bold text-blue-600 truncate">
              {bestEmqEvent
                ? `${bestEmqEvent.eventName} · ${(bestEmqEvent.score ?? 0).toFixed(1)} / 10`
                : "—"}
            </span>
          </div>
        </div>

        {/* Card 3: CAPI Deduplication */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">CAPI Deduplication</span>
            <InfoPopover
              title="Browser & Server Deduplication"
              description="Whenever a customer buys or views an item, both the browser Pixel and server CAPI fire with the exact same event_id."
              whyNeeded="Prevents Meta from counting the same order twice in your ad reports."
              businessImpact="Ensures your ROAS and purchase metrics reflect real store bank revenue."
              actionableTip="ANGKON assigns cryptographic event_ids before order dispatch to ensure 100% pairing."
            />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-600 tracking-tight">
                {deduplicationStats?.dedupRate !== null && deduplicationStats?.dedupRate !== undefined
                  ? `${deduplicationStats.dedupRate}%`
                  : "—"}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Paired & Deduplicated
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {deduplicationStats?.pairedCount ?? 0} paired · {deduplicationStats?.browserOnlyCount ?? 0} web · {deduplicationStats?.serverOnlyCount ?? 0} CAPI
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Shared Key</span>
            <span className="font-mono text-[10px] text-slate-700 font-semibold">event_id paired</span>
          </div>
        </div>

        {/* Card 4: Channel Delivery Mix */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Channel Delivery Ratio</span>
            <InfoPopover
              title="Hybrid Redundancy Architecture"
              description="Shows the proportion of events delivered via client JavaScript SDK versus server-side Conversions API."
              whyNeeded="Ad-blockers and iOS 14.5+ restrictions drop 20-40% of browser events. CAPI recovers them directly from the server."
              businessImpact="Recovers otherwise lost sales signals so your campaigns target real buyers."
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-slate-900">
                {channelStats?.browserRatio !== null && channelStats?.browserRatio !== undefined
                  ? `${channelStats.browserRatio}% Web`
                  : "— Web"}
              </span>
              <span className="text-xs text-slate-400 font-medium">│</span>
              <span className="text-sm font-bold text-purple-700">
                {channelStats?.serverRatio !== null && channelStats?.serverRatio !== undefined
                  ? `${channelStats.serverRatio}% CAPI Server`
                  : "— CAPI Server"}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex mt-2">
              <div
                className="bg-[#70C5F7] h-full transition-all duration-300"
                style={{ width: `${channelStats?.browserRatio ?? 0}%` }}
                title="Browser Pixel"
              />
              <div
                className="bg-purple-600 h-full transition-all duration-300"
                style={{ width: `${channelStats?.serverRatio ?? 0}%` }}
                title="Conversions API"
              />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Server CAPI Status</span>
            <span className="font-semibold text-purple-700">
              {hasCapiToken ? "Encrypted & Live" : "Token Required"}
            </span>
          </div>
        </div>
      </div>

      {/* COMPACT EVENT MATCH QUALITY INTELLIGENCE STRIP */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  Meta Event Match Quality (EMQ)
                </h3>
                <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  Rolling window · Graph API v22.0
                </span>
                {emqState.status === "ready" && emqState.report?.fetchedAt && (
                  <span className="text-[10px] text-slate-400">
                    Updated {new Date(emqState.report.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Authentic per-event quality ratings queried directly from Meta Dataset Quality API. Click any event below for full parameter match coverage.
              </p>
            </div>
          </div>

          {/* Individual Event Score Indicators */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {metaEventsRows
              .filter((r) => r.name !== "TestEvent")
              .map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => onOpenEventDrawer(row)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 hover:border-slate-300 transition cursor-pointer"
                  title={`View ${row.displayName} match-key coverage in detail drawer`}
                >
                  <span className="font-semibold text-slate-700">{row.displayName}:</span>
                  {row.emqScore !== null ? (
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded text-[10.5px] border ${
                        row.emqScore >= 8
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : row.emqScore >= 6
                          ? "bg-blue-50 text-blue-700 border-blue-300"
                          : "bg-amber-50 text-amber-700 border-amber-300"
                      }`}
                    >
                      {row.emq}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[10.5px] italic">Not available</span>
                  )}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* E-COMMERCE CONVERSION PROGRESSION RATIOS */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span>Conversion Progression & Funnel Velocity</span>
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">
            Standard E-Commerce Step Ratios
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[11px] text-slate-500">1. Store Traffic</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">{eventStats.PageView || 0}</div>
            <div className="text-[10px] text-slate-400 mt-1 font-semibold">100% Baseline</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[11px] text-slate-500">2. Product Views</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">{eventStats.ViewContent || 0}</div>
            <div className="text-[10px] text-blue-600 mt-1 font-semibold">
              {eventStats.PageView ? `${(((eventStats.ViewContent || 0) / eventStats.PageView) * 100).toFixed(1)}%` : "0.0%"} of visits
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[11px] text-slate-500">3. View-to-Cart</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">{eventStats.AddToCart || 0}</div>
            <div className="text-[10px] text-purple-600 mt-1 font-semibold">
              {eventStats.ViewContent ? `${(((eventStats.AddToCart || 0) / eventStats.ViewContent) * 100).toFixed(1)}%` : "0.0%"} intent
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[11px] text-slate-500">4. Cart-to-Checkout</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">{eventStats.InitiateCheckout || 0}</div>
            <div className="text-[10px] text-amber-600 mt-1 font-semibold">
              {eventStats.AddToCart ? `${(((eventStats.InitiateCheckout || 0) / eventStats.AddToCart) * 100).toFixed(1)}%` : "0.0%"} checkout
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[11px] text-slate-500">5. Checkout-to-Buy</div>
            <div className="text-base font-bold text-emerald-600 mt-0.5">{eventStats.Purchase || 0}</div>
            <div className="text-[10px] text-emerald-700 mt-1 font-semibold">
              {eventStats.InitiateCheckout ? `${(((eventStats.Purchase || 0) / eventStats.InitiateCheckout) * 100).toFixed(1)}%` : "0.0%"} sales
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Full-Width Shadcn Performance Chart & Metadata Sidebar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
        {/* Meta-style Sub-Pills Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOverviewView("activities")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                overviewView === "activities"
                  ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
              }`}
            >
              <Activity className="h-3.5 w-3.5 text-blue-600" />
              <span>Event activities</span>
            </button>

            <button
              type="button"
              onClick={() => setOverviewView("integrations")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                overviewView === "integrations"
                  ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
              }`}
            >
              <Share2 className="h-3.5 w-3.5 text-purple-600" />
              <span>Integrations</span>
            </button>
          </div>

          {/* Chart Metric Selectors when activities is selected */}
          {overviewView === "activities" && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setActiveChartMetric("events")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeChartMetric === "events"
                    ? "bg-[#EBF5FB] text-blue-700 border border-blue-200"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-[#70C5F7]" />
                <span>Total Events</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveChartMetric("revenue")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeChartMetric === "revenue"
                    ? "bg-[#EBF5FB] text-blue-700 border border-blue-200"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                <span>Attributed Revenue</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveChartMetric("orders")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeChartMetric === "orders"
                    ? "bg-[#EBF5FB] text-blue-700 border border-blue-200"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Purchases</span>
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Shadcn/Recharts Interactive Chart */}
        <div className="pt-2">
          <PerformanceChart
            period={chartPeriod}
            onPeriodChange={setChartPeriod}
            data={timeseries}
            loading={loadingTimeseries}
            activeMetric={activeChartMetric}
          />
        </div>
      </div>

      {/* Section 2: Authentic Events Table with Search & Channel Filter */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Table Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Configured Meta Conversion Events
            </h3>
            <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
              {metaEventsRows.length} active signals
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Filter: ALL | BROWSER | SERVER */}
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
              {(["ALL", "BROWSER", "SERVER"] as const).map((filterVal) => (
                <button
                  key={filterVal}
                  type="button"
                  onClick={() => setEventsTableFilter(filterVal)}
                  className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    eventsTableFilter === filterVal
                      ? "bg-white text-blue-700 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {filterVal === "ALL" ? "All Channels" : filterVal === "BROWSER" ? "Browser Pixel" : "Conversions API"}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[180px]">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={eventsTableSearch}
                onChange={(e) => setEventsTableSearch(e.target.value)}
                placeholder="Search event name..."
                className="w-full h-8 pl-8 pr-3 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Table Rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Event Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Funnel Step</th>
                <th className="py-3 px-4">Delivery Channel</th>
                <th className="py-3 px-4">Event Match Quality</th>
                <th className="py-3 px-4">Total Count</th>
                <th className="py-3 px-4">Last Received</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {metaEventsRows.map((row) => {
                const IconComp = row.icon;
                const isExpanded = expandedMetaEvent === row.id;
                const formattedTotal = typeof row.total === "number" ? row.total.toLocaleString() : "0";

                return (
                  <Fragment key={row.id}>
                    <tr
                      onClick={() => setExpandedMetaEvent(isExpanded ? null : row.id)}
                      className={`hover:bg-slate-50/80 transition cursor-pointer ${
                        isExpanded ? "bg-blue-50/40" : ""
                      }`}
                    >
                      {/* 1. Event Name */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                            <IconComp className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-slate-900 font-bold text-xs">{row.displayName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{row.name}</div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Status */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          <span>{row.status}</span>
                        </span>
                      </td>

                      {/* 3. Funnel Step */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-700 text-xs font-medium">
                          {row.funnelName}
                        </div>
                      </td>

                      {/* 4. Delivery Channel */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden flex">
                            <div
                              className="bg-[#70C5F7] h-full"
                              style={{ width: `${row.browserPct}%` }}
                              title="Browser Pixel"
                            />
                            <div
                              className="bg-purple-600 h-full"
                              style={{ width: `${row.serverPct}%` }}
                              title="Conversions API"
                            />
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#70C5F7]" />
                            <span>{row.browserPct}% Web</span>
                            <span className="text-slate-300">·</span>
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-600" />
                            <span>{row.serverPct}% CAPI</span>
                          </div>
                        </div>
                      </td>

                      {/* 5. Event Match Quality */}
                      <td className="py-3.5 px-4">
                        {row.emqScore !== null ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span
                              className={`font-bold text-xs px-2.5 py-0.5 rounded border ${
                                row.emqScore >= 7.0
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}
                            >
                              {row.emq}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                              {row.emqQuality}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            <span>Not available</span>
                          </span>
                        )}
                      </td>

                      {/* 6. Total Events */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 text-xs font-mono flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-sans font-medium">Local:</span>
                            <span>{formattedTotal}</span>
                          </div>
                          <div className="text-[10.5px] text-blue-700 font-mono font-medium flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-sans font-medium">Meta:</span>
                            <span
                              title={
                                row.metaReported === null && row.name !== "TestEvent"
                                  ? row.metaNote
                                  : undefined
                              }
                            >
                              {formatMetaReported(row.name, row.metaReported)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 7. Last Received */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-700 text-xs font-medium">
                          {row.lastReceived}
                        </div>
                      </td>

                      {/* 8. Details Button */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenEventDrawer(row);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-xs font-semibold text-slate-700 hover:text-blue-700 transition cursor-pointer"
                          title="Open complete Event Details Drawer"
                        >
                          <span>Details</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>

                    {/* IN-PLACE EXPANDABLE VIEW */}
                    {isExpanded && (() => {
                      const recentEvent = events.find(
                        (e) =>
                          e.name.toLowerCase() === row.name.toLowerCase() ||
                          e.name.toLowerCase() === row.id.toLowerCase()
                      );
                      return (
                        <tr className="bg-slate-50/80 border-y-2 border-blue-200/90 animate-in fade-in-0 duration-150">
                          <td colSpan={8} className="p-0">
                            <div className="p-5 sm:p-6 space-y-4 bg-gradient-to-b from-blue-50/50 via-white to-slate-50/60 shadow-inner">
                              {/* Drawer Top Bar */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                                      {row.displayName} Activity Breakdown & Verification
                                    </h3>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                      Step {row.funnelStep}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                                    {row.description}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => onOpenEventDrawer(row)}
                                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer shadow-2xs flex items-center gap-1.5"
                                  >
                                    <span>Deep Parameter Audit</span>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* 3 Verification Cards */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {/* Card 1: EMQ Coverage */}
                                <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    MATCH PARAMETERS
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {row.parametersList.map((p) => (
                                      <span
                                        key={p}
                                        className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] border border-slate-200"
                                      >
                                        {p}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                {/* Card 2: Deduplication Status */}
                                <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-1">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    DEDUPLICATION SAFETY
                                  </div>
                                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                                    <CheckCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                                    <span>Active Shared event_id</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 leading-relaxed">
                                    Client Pixel and Server CAPI share cryptographic keys so purchases are never counted twice.
                                  </div>
                                </div>

                                {/* Card 3: Meta Delivery Route */}
                                <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    META DELIVERY ROUTE
                                  </div>
                                  <div className="text-xs font-bold text-slate-900">
                                    {row.serverPct === 100
                                      ? "Conversions API Gateway"
                                      : row.browserPct === 100
                                      ? "Meta Browser Pixel SDK"
                                      : "Browser SDK + CAPI Gateway"}
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                                    <span>{row.browserPct}% Web / {row.serverPct}% CAPI</span>
                                    <span>{row.lastReceived}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Raw Payload Inspector */}
                              <div className="p-3.5 bg-slate-900 rounded-xl text-slate-100 space-y-2">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                  <div className="flex items-center gap-2">
                                    <FileJson className="h-3.5 w-3.5 text-blue-400" />
                                    <span className="text-[11px] font-mono text-slate-300 font-semibold">
                                      {recentEvent
                                        ? `Latest Live Payload (${recentEvent.source} • ${new Date(recentEvent.timestamp).toLocaleTimeString()})`
                                        : `Canonical Meta Graph API Payload Schema (${row.name})`}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const payloadText = JSON.stringify(
                                        recentEvent
                                          ? recentEvent
                                          : {
                                              event_name: row.name,
                                              event_time: 1730553600,
                                              event_id: `evt_${row.id}_sha256`,
                                              event_source_url: "https://www.angkon.net",
                                              action_source: "website",
                                              user_data: {
                                                client_ip_address: "103.x.x.x",
                                                client_user_agent: "Mozilla/5.0 ...",
                                                fbp: "fb.1.1730553600...",
                                                em: ["4f...sha256"],
                                                ph: ["e2...sha256"],
                                              },
                                              custom_data: {
                                                currency: "BDT",
                                                value: row.name === "Purchase" ? 18500 : undefined,
                                                content_ids: ["angkon_saree_104"],
                                                content_type: "product",
                                              },
                                            },
                                        null,
                                        2
                                      );
                                      onCopyPayload(row.id, payloadText);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono transition cursor-pointer"
                                  >
                                    {copiedPayloadId === row.id ? (
                                      <>
                                        <Check className="h-3 w-3 text-emerald-400" />
                                        <span className="text-emerald-400">Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-3 w-3" />
                                        <span>Copy JSON</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto p-2 bg-slate-950/80 rounded-lg max-h-52 leading-relaxed">
                                  {JSON.stringify(
                                    recentEvent
                                      ? recentEvent
                                      : {
                                          event_name: row.name,
                                          event_time: 1730553600,
                                          event_id: `evt_${row.id}_sha256`,
                                          event_source_url: "https://www.angkon.net",
                                          action_source: "website",
                                          user_data: {
                                            client_ip_address: "103.x.x.x",
                                            client_user_agent: "Mozilla/5.0 ...",
                                            fbp: "fb.1.1730553600...",
                                            em: ["4f52...sha256"],
                                            ph: ["e213...sha256"],
                                          },
                                          custom_data: {
                                            currency: "BDT",
                                            value: row.name === "Purchase" ? 18500 : undefined,
                                            content_ids: ["angkon_saree_104"],
                                            content_type: "product",
                                          },
                                        },
                                    null,
                                    2
                                  )}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })()}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
