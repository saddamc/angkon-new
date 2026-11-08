"use client";

import * as React from "react";
import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";

export interface PerformanceDataPoint {
  date: string;
  timeLabel?: string;
  formattedDateTime?: string;
  revenue: number;
  orders: number;
  spend: number;
  clicks: number;
  impressions: number;
  events?: number;
  websiteEvents?: number;
  serverEvents?: number;
}

interface PerformanceChartProps {
  data: PerformanceDataPoint[];
  activeMetrics?: Record<string, boolean>; // e.g. { events: true, revenue: false, ... }
  spendCurrency?: string;
  spendCurrencySymbol?: string;
  primaryMetricKey?: string; // defaults to 'events' or first active metric
  height?: number;
  period?: string;
  onPeriodChange?: (p: any) => void;
  loading?: boolean;
  activeMetric?: string;
}

/**
 * Meta Events Manager Custom Tooltip
 * Reverse-engineered directly from Meta Business Suite / Events Manager popover
 */
function MetaEventsTooltip({
  active,
  payload,
  spendCurrency,
  activeMetrics,
}: {
  active?: boolean;
  payload?: any[];
  spendCurrency: string;
  activeMetrics: Record<string, boolean>;
}) {
  if (!active || !payload || !payload.length) return null;

  const pointData = payload[0]?.payload as PerformanceDataPoint & { displayLabel?: string };
  if (!pointData) return null;

  const totalEvents =
    pointData.events ??
    (pointData.websiteEvents || 0) + (pointData.serverEvents || 0);
  const websiteEvents =
    pointData.websiteEvents !== undefined
      ? pointData.websiteEvents
      : totalEvents;
  const serverEvents = pointData.serverEvents || 0;

  return (
    <div
      className="bg-white border border-[#CED0D4] rounded-md p-3.5 text-left text-slate-900 min-w-[210px] sm:min-w-[235px] font-sans"
      style={{
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08)",
      }}
    >
      {/* Header: Date & Time in Meta gray */}
      <div className="text-[11px] text-[#65676B] font-normal mb-2">
        {pointData.formattedDateTime || pointData.displayLabel || pointData.date}
      </div>

      {/* Title: Events received from: */}
      <div className="text-[12px] font-bold text-[#050505] mb-1.5">
        Events received from:
      </div>

      {/* Channels Breakdown */}
      <div className="space-y-1 text-[12px] mb-2">
        <div className="flex items-center justify-between text-[#050505]">
          <span className="font-normal text-slate-700">Website</span>
          <span className="font-semibold">
            {websiteEvents.toLocaleString()}
          </span>
        </div>

        {serverEvents > 0 && (
          <div className="flex items-center justify-between text-[#050505]">
            <span className="font-normal text-slate-700">Conversions API</span>
            <span className="font-semibold">
              {serverEvents.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Total Events Row with Meta Light Blue Rounded Square */}
      <div className="pt-2 border-t border-[#E4E6EB] flex items-center justify-between text-[12px]">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-xs bg-[#70C5F7] shrink-0" />
          <span className="font-bold text-[#050505]">Total events</span>
        </div>
        <span className="font-bold text-[#050505]">
          {totalEvents.toLocaleString()}
        </span>
      </div>

      {/* Additional Active Business Intelligence Metrics if enabled */}
      {activeMetrics.revenue && (
        <div className="pt-1.5 mt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
            <span className="text-slate-600">Store Revenue</span>
          </div>
          <span className="font-semibold text-slate-900">
            ৳{Math.round(pointData.revenue || 0).toLocaleString("en-BD")}
          </span>
        </div>
      )}

      {activeMetrics.orders && (
        <div className="pt-1.5 mt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-purple-600 shrink-0" />
            <span className="text-slate-600">Orders Completed</span>
          </div>
          <span className="font-semibold text-slate-900">
            {pointData.orders || 0} orders
          </span>
        </div>
      )}

      {activeMetrics.spend && (
        <div className="pt-1.5 mt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
            <span className="text-slate-600">Meta Ad Spend</span>
          </div>
          <span className="font-semibold text-slate-900">
            {spendCurrency === "USD"
              ? `$${(pointData.spend || 0).toFixed(2)} USD`
              : `৳${Math.round(pointData.spend || 0).toLocaleString("en-BD")}`}
          </span>
        </div>
      )}

      {activeMetrics.clicks && (
        <div className="pt-1.5 mt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-indigo-600 shrink-0" />
            <span className="text-slate-600">Ad Clicks</span>
          </div>
          <span className="font-semibold text-slate-900">
            {(pointData.clicks || 0).toLocaleString()} clicks
          </span>
        </div>
      )}

      {activeMetrics.impressions && (
        <div className="pt-1.5 mt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0" />
            <span className="text-slate-600">Ad Impressions</span>
          </div>
          <span className="font-semibold text-slate-900">
            {(pointData.impressions || 0).toLocaleString()} impr.
          </span>
        </div>
      )}

      {/* Timezone Footer (Reverse-Engineered from Meta Image 2) */}
      <div className="text-[10px] text-[#8A8D91] pt-2 border-t border-slate-100 mt-2">
        Asia/Dhaka (GMT+6)
      </div>
    </div>
  );
}

export function PerformanceChart({
  data,
  activeMetrics = { events: true },
  spendCurrency = "USD",
  primaryMetricKey = "events",
  height = 250,
}: PerformanceChartProps) {
  const chartConfig = useMemo(
    () =>
      ({
        events: {
          label: "Total Events",
          color: "#70C5F7",
        },
        revenue: {
          label: "Store Revenue",
          color: "#2563EB",
        },
        orders: {
          label: "Orders Completed",
          color: "#9333EA",
        },
        spend: {
          label: `Meta Ad Spend (${spendCurrency})`,
          color: "#F59E0B",
        },
        clicks: {
          label: "Ad Clicks",
          color: "#6366F1",
        },
        impressions: {
          label: "Ad Impressions",
          color: "#10B981",
        },
      } satisfies ChartConfig),
    [spendCurrency]
  );

  const chartData = useMemo(() => {
    return (data || []).map((d) => {
      const rawEvents = typeof d.events === "number" ? d.events : 0;
      const computedEvents =
        rawEvents > 0 ? rawEvents : (d.websiteEvents || 0) + (d.serverEvents || 0);

      return {
        ...d,
        displayLabel: d.timeLabel || d.date,
        events: computedEvents,
        revenue: d.revenue || 0,
        orders: d.orders || 0,
        spend: d.spend || 0,
        clicks: d.clicks || 0,
        impressions: d.impressions || 0,
      };
    });
  }, [data]);

  // Clean Meta Y-Axis tick generation (0, 50, 100, 150, 200, 250, 300)
  const yTicks = useMemo(() => {
    const activeKeys = Object.keys(activeMetrics).filter((k) => activeMetrics[k]);
    const primaryKey = activeKeys[0] || primaryMetricKey || "events";
    const maxVal = Math.max(
      ...chartData.map((d) => Number((d as Record<string, unknown>)[primaryKey]) || 0),
      10
    );

    let step = 50;
    if (maxVal <= 10) step = 2;
    else if (maxVal <= 25) step = 5;
    else if (maxVal <= 50) step = 10;
    else if (maxVal <= 100) step = 20;
    else if (maxVal <= 250) step = 50;
    else if (maxVal <= 500) step = 100;
    else if (maxVal <= 1000) step = 200;
    else if (maxVal <= 2500) step = 500;
    else step = Math.ceil(maxVal / 5 / 100) * 100;

    const roundedMax = Math.ceil(maxVal / step) * step;
    const ticks: number[] = [];
    for (let t = 0; t <= roundedMax; t += step) {
      ticks.push(t);
    }
    return { ticks, max: roundedMax > 0 ? roundedMax : 50 };
  }, [chartData, activeMetrics, primaryMetricKey]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[#65676B] font-sans">
        No telemetry data available for this range.
      </div>
    );
  }

  // Determine if any active metrics are enabled, default to events
  const hasActiveMetric = Object.values(activeMetrics).some(Boolean);
  const effectiveActiveMetrics = hasActiveMetric ? activeMetrics : { events: true };

  return (
    <div className="w-full font-sans select-none overflow-hidden bg-white">
      <ChartContainer
        config={chartConfig}
        className="w-full"
        style={{ height: `${height}px`, minHeight: `${height}px`, aspectRatio: "auto" }}
      >
        <AreaChart
          data={chartData}
          margin={{ top: 12, right: 18, left: -14, bottom: 4 }}
        >
          <defs>
            <linearGradient id="metaEventsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#70C5F7" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#70C5F7" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563EB" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9333EA" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#9333EA" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#6366F1" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="impressionsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {/* Hairline subtle horizontal grid line (Meta REA) */}
          <CartesianGrid
            strokeDasharray="none"
            vertical={false}
            stroke="#E4E6EB"
            strokeWidth={1}
          />

          {/* Bottom X-Axis Time / Date labels (Meta REA) */}
          <XAxis
            dataKey="displayLabel"
            tickLine={false}
            axisLine={{ stroke: "#E4E6EB", strokeWidth: 1 }}
            tickMargin={10}
            tick={{
              fill: "#65676B",
              fontSize: 11,
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
            interval="preserveStartEnd"
          />

          {/* Left Y-Axis Rounded Labels (Meta REA) */}
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tick={{
              fill: "#65676B",
              fontSize: 12,
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
            domain={[0, yTicks.max]}
            ticks={yTicks.ticks}
            tickFormatter={(v) =>
              v >= 1000
                ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K`
                : String(v)
            }
          />

          {/* Dotted Vertical Crosshair & Meta Popover Tooltip (Meta REA) */}
          <ChartTooltip
            cursor={{ stroke: "#65676B", strokeWidth: 1, strokeDasharray: "2 3" }}
            content={
              <MetaEventsTooltip
                spendCurrency={spendCurrency}
                activeMetrics={effectiveActiveMetrics}
              />
            }
          />

          {/* Primary Meta Telemetry Curve */}
          {effectiveActiveMetrics.events && (
            <Area
              type="monotone"
              dataKey="events"
              stroke="#70C5F7"
              strokeWidth={2}
              fill="url(#metaEventsGrad)"
              dot={false}
              activeDot={{
                r: 4.5,
                fill: "#FFFFFF",
                stroke: "#70C5F7",
                strokeWidth: 2,
              }}
              isAnimationActive={true}
              animationDuration={500}
            />
          )}

          {/* Store Revenue */}
          {effectiveActiveMetrics.revenue && (
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#2563EB"
              strokeWidth={2}
              fill="url(#revenueGrad)"
              dot={false}
              activeDot={{
                r: 4.5,
                fill: "#FFFFFF",
                stroke: "#2563EB",
                strokeWidth: 2,
              }}
              isAnimationActive={true}
              animationDuration={500}
            />
          )}

          {/* Orders Completed */}
          {effectiveActiveMetrics.orders && (
            <Area
              type="monotone"
              dataKey="orders"
              stroke="#9333EA"
              strokeWidth={2}
              fill="url(#ordersGrad)"
              dot={false}
              activeDot={{
                r: 4.5,
                fill: "#FFFFFF",
                stroke: "#9333EA",
                strokeWidth: 2,
              }}
              isAnimationActive={true}
              animationDuration={500}
            />
          )}

          {/* Meta Ad Spend */}
          {effectiveActiveMetrics.spend && (
            <Area
              type="monotone"
              dataKey="spend"
              stroke="#F59E0B"
              strokeWidth={2}
              fill="url(#spendGrad)"
              dot={false}
              activeDot={{
                r: 4.5,
                fill: "#FFFFFF",
                stroke: "#F59E0B",
                strokeWidth: 2,
              }}
              isAnimationActive={true}
              animationDuration={500}
            />
          )}

          {/* Ad Clicks */}
          {effectiveActiveMetrics.clicks && (
            <Area
              type="monotone"
              dataKey="clicks"
              stroke="#6366F1"
              strokeWidth={2}
              fill="url(#clicksGrad)"
              dot={false}
              activeDot={{
                r: 4.5,
                fill: "#FFFFFF",
                stroke: "#6366F1",
                strokeWidth: 2,
              }}
              isAnimationActive={true}
              animationDuration={500}
            />
          )}

          {/* Ad Impressions */}
          {effectiveActiveMetrics.impressions && (
            <Area
              type="monotone"
              dataKey="impressions"
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#impressionsGrad)"
              dot={false}
              activeDot={{
                r: 4.5,
                fill: "#FFFFFF",
                stroke: "#10B981",
                strokeWidth: 2,
              }}
              isAnimationActive={true}
              animationDuration={500}
            />
          )}
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
