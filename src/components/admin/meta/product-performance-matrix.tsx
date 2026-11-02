"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  RefreshCw,
  Search,
  ExternalLink,
  AlertTriangle,
  Flame,
  Gem,
  PauseCircle,
  CheckCircle2,
  Copy,
  Check,
  ArrowUpDown,
} from "lucide-react";
import { InfoPopover } from "@/components/admin/meta/info-popover";
import type {
  ProductPerformanceItem,
  ProductQuadrant,
  AnalyticsPeriod,
} from "@/app/api/admin/meta/analytics/products/route";

interface ApiResponse {
  ok: boolean;
  period: AnalyticsPeriod;
  summary: {
    totalCatalogProducts: number;
    heroWinnersCount: number;
    hiddenGemsCount: number;
    highAbandonmentCount: number;
    slowMoversCount: number;
    totalCatalogRevenue: number;
    averageConversionRate: number;
  };
  products: ProductPerformanceItem[];
  error?: string;
}

export function ProductPerformanceMatrix() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");
  const [activeQuadrantFilter, setActiveQuadrantFilter] = useState<"ALL" | ProductQuadrant>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"revenue" | "orders" | "views" | "conversion" | "abandonment">("revenue");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const fetchMatrix = useCallback(async (selectedPeriod: AnalyticsPeriod) => {
    try {
      setRefreshing(true);
      const res = await fetch(`/api/admin/meta/analytics/products?period=${selectedPeriod}`);
      if (res.ok) {
        const json: ApiResponse = await res.json();
        if (json.ok) {
          setData(json);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchMatrix(period);
  }, [fetchMatrix, period]);

  const handleCopyLink = (item: ProductPerformanceItem) => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/products/${item.slug}`;
      void navigator.clipboard.writeText(url);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!data?.products) return [];

    let list = [...data.products];

    // Quadrant filter
    if (activeQuadrantFilter !== "ALL") {
      if (activeQuadrantFilter === "HIDDEN_GEM" || activeQuadrantFilter === "EMERGING_SIGNAL") {
        list = list.filter(
          (p) => p.quadrant === "HIDDEN_GEM" || p.quadrant === "EMERGING_SIGNAL"
        );
      } else {
        list = list.filter((p) => p.quadrant === activeQuadrantFilter);
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    // Sorting — copied rather than mutated in place so the compiler can
    // preserve this memoization.
    const sorted = [...list].sort((a, b) => {
      if (sortBy === "revenue") return b.revenue - a.revenue || b.orders - a.orders;
      if (sortBy === "orders") return b.orders - a.orders || b.revenue - a.revenue;
      if (sortBy === "views") return b.views - a.views;
      if (sortBy === "conversion") return b.conversionRate - a.conversionRate;
      if (sortBy === "abandonment") return b.cartDropoffRate - a.cartDropoffRate;
      return 0;
    });

    return sorted;
  }, [data, activeQuadrantFilter, searchQuery, sortBy]);

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-5 font-sans text-slate-900">
      {/* ── 1. Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-50 text-[#1877F2] flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Product Intelligence &amp; Hero Saree Matrix
            </h2>
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#1877F2] border border-blue-200/70">
              16 Saree Catalog Assets
            </span>
            <InfoPopover
              title="Product Performance Matrix"
              description="Cross-references live storefront telemetry (ViewContent & AddToCart) with verified store purchases and cash revenue to mathematically separate high-performing sarees from low-performing products."
              whyNeeded="Prevents wasting Meta ad budget on low-converting sarees and highlights high-converting 'Hidden Gems' that need more traffic."
              businessImpact="Directly increases blended ROAS and store profit margin by channeling marketing budget exclusively into high-converting inventory."
              actionableTip="Scale budget on Hero Winners in Advantage+ Dynamic Product Ads and feature Hidden Gems in your primary storefront menu."
              align="left"
            />
          </div>
          <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
            Live e-commerce telemetry identifying which sarees drive profit, which products shoppers abandon in cart, and where Meta advertising budget should be allocated.
          </p>
        </div>

        {/* Period Selector & Refresh */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80 text-xs">
            {(
              [
                { key: "today", label: "Today" },
                { key: "7d", label: "7D" },
                { key: "30d", label: "30D" },
                { key: "month", label: "This Month" },
                { key: "all", label: "All Time" },
              ] as const
            ).map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  period === p.key
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void fetchMatrix(period)}
            disabled={refreshing}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition cursor-pointer disabled:opacity-50 shadow-2xs"
            title="Refresh Product Matrix"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── 2. Interactive Quadrant Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Hero Winners */}
        <div
          onClick={() =>
            setActiveQuadrantFilter((prev) => (prev === "HERO_WINNER" ? "ALL" : "HERO_WINNER"))
          }
          className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-3 shadow-2xs ${
            activeQuadrantFilter === "HERO_WINNER"
              ? "bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-200"
              : "bg-emerald-50/40 border-emerald-200/80 hover:bg-emerald-50 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-emerald-600" />
              Hero Winners
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300/80">
              Validated N≥5
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-950">
              {data?.summary.heroWinnersCount ?? 0}
            </div>
            <div className="text-[11px] text-emerald-800 font-medium mt-0.5">
              Requires ≥5 verified orders &amp; ≥1.5% conversion. Never assigns fake winner badges.
            </div>
          </div>
          <div className="text-[10.5px] font-bold text-emerald-700 flex items-center gap-1">
            <span>Click to view products</span>
            <span>→</span>
          </div>
        </div>

        {/* Card 2: Early Signals / Emerging */}
        <div
          onClick={() =>
            setActiveQuadrantFilter((prev) =>
              prev === "EMERGING_SIGNAL" || prev === "HIDDEN_GEM" ? "ALL" : "EMERGING_SIGNAL"
            )
          }
          className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-3 shadow-2xs ${
            activeQuadrantFilter === "EMERGING_SIGNAL" || activeQuadrantFilter === "HIDDEN_GEM"
              ? "bg-indigo-50/90 border-indigo-400 ring-2 ring-indigo-200"
              : "bg-indigo-50/40 border-indigo-200/80 hover:bg-indigo-50 hover:border-indigo-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
              <Gem className="h-3.5 w-3.5 text-indigo-600" />
              Early Signals
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300/80">
              Sample N&lt;5
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-indigo-950">
              {data?.summary.hiddenGemsCount ?? 0}
            </div>
            <div className="text-[11px] text-indigo-800 font-medium mt-0.5">
              Early purchases (1-4 orders). Promising signal awaiting statistical validation.
            </div>
          </div>
          <div className="text-[10.5px] font-bold text-indigo-700 flex items-center gap-1">
            <span>Click to view products</span>
            <span>→</span>
          </div>
        </div>

        {/* Card 3: High Abandonment */}
        <div
          onClick={() =>
            setActiveQuadrantFilter((prev) =>
              prev === "HIGH_ABANDONMENT" ? "ALL" : "HIGH_ABANDONMENT"
            )
          }
          className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-3 shadow-2xs ${
            activeQuadrantFilter === "HIGH_ABANDONMENT"
              ? "bg-amber-50/90 border-amber-400 ring-2 ring-amber-200"
              : "bg-amber-50/40 border-amber-200/80 hover:bg-amber-50 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              High Drop-off
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80">
              Fix Friction
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-950">
              {data?.summary.highAbandonmentCount ?? 0}
            </div>
            <div className="text-[11px] text-amber-800 font-medium mt-0.5">
              Added to cart but abandoned. Check price or delivery.
            </div>
          </div>
          <div className="text-[10.5px] font-bold text-amber-700 flex items-center gap-1">
            <span>Click to view products</span>
            <span>→</span>
          </div>
        </div>

        {/* Card 4: Slow Movers */}
        <div
          onClick={() =>
            setActiveQuadrantFilter((prev) => (prev === "SLOW_MOVER" ? "ALL" : "SLOW_MOVER"))
          }
          className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-3 shadow-2xs ${
            activeQuadrantFilter === "SLOW_MOVER"
              ? "bg-slate-100 border-slate-400 ring-2 ring-slate-200"
              : "bg-slate-50/80 border-slate-200 hover:bg-slate-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <PauseCircle className="h-3.5 w-3.5 text-slate-500" />
              Slow Movers
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
              Cut Ad Waste
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {data?.summary.slowMoversCount ?? 0}
            </div>
            <div className="text-[11px] text-slate-600 font-medium mt-0.5">
              Low shopper engagement. Bundle or discount.
            </div>
          </div>
          <div className="text-[10.5px] font-bold text-slate-600 flex items-center gap-1">
            <span>Click to view products</span>
            <span>→</span>
          </div>
        </div>
      </div>

      {/* ── 3. Filters & Search Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by saree name, SKU, or category..."
            className="w-full h-9 pl-9 pr-3.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1877F2] focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">Sort by:</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#1877F2] transition shadow-2xs cursor-pointer"
          >
            <option value="revenue">Highest Store Revenue (৳)</option>
            <option value="orders">Most Orders Completed</option>
            <option value="views">Most Product Views (ViewContent)</option>
            <option value="conversion">Highest Conversion Rate (%)</option>
            <option value="abandonment">Highest Cart Abandonment (%)</option>
          </select>

          {activeQuadrantFilter !== "ALL" && (
            <button
              type="button"
              onClick={() => setActiveQuadrantFilter("ALL")}
              className="text-xs font-semibold text-[#1877F2] hover:underline px-2 cursor-pointer"
            >
              Reset filter
            </button>
          )}
        </div>
      </div>

      {/* ── 4. Main Matrix Data Table ── */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/90 shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[10.5px] uppercase font-bold text-slate-500 tracking-wider">
              <th className="py-3 px-4">Saree Product</th>
              <th className="py-3 px-3">Price</th>
              <th className="py-3 px-3 text-center">Telemetry Funnel (Views → Carts → Orders)</th>
              <th className="py-3 px-3 text-center">Conversion</th>
              <th className="py-3 px-3 text-center">Cart Drop-off</th>
              <th className="py-3 px-3 text-right">Realized Cash</th>
              <th className="py-3 px-4">Performance Quadrant &amp; Recommendation</th>
              <th className="py-3 pr-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-slate-400" />
                  <span>Analyzing catalog telemetry and store order ledger...</span>
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-xs text-slate-500">
                  No saree products matched the selected filters.
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                const isHero = p.quadrant === "HERO_WINNER";
                const isGem = p.quadrant === "HIDDEN_GEM" || p.quadrant === "EMERGING_SIGNAL";
                const isAbandon = p.quadrant === "HIGH_ABANDONMENT";

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Saree Product */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 rounded-xl border border-slate-200/80 bg-slate-100 overflow-hidden shrink-0">
                          {p.image ? (
                            <Image
                              src={p.image}
                              alt={p.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold text-xs">
                              ANK
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/products/${p.slug}`}
                            target="_blank"
                            className="font-bold text-slate-900 hover:text-[#1877F2] transition truncate block text-xs"
                            title={p.name}
                          >
                            {p.name}
                          </Link>
                          <div className="flex items-center gap-2 text-[10.5px] text-slate-500 font-mono mt-0.5">
                            <span>SKU: {p.sku}</span>
                            <span>•</span>
                            <span className="text-slate-600 font-sans">{p.category}</span>
                          </div>
                          <div className="mt-1">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                                p.stockStatus === "instock"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {p.stockStatus === "instock"
                                ? p.stockQuantity !== null
                                  ? `${p.stockQuantity} in stock`
                                  : "In Stock"
                                : "Out of Stock"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-3 font-mono font-bold text-xs text-slate-900 whitespace-nowrap">
                      ৳{p.price.toLocaleString("en-BD")}
                      {p.onSale && p.regularPrice > p.price && (
                        <div className="text-[10px] text-slate-400 line-through font-normal">
                          ৳{p.regularPrice.toLocaleString("en-BD")}
                        </div>
                      )}
                    </td>

                    {/* Telemetry Funnel */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80 font-mono text-[11px]">
                        <span className="text-slate-600 font-semibold" title="ViewContent Views">
                          {p.views} <span className="text-[9.5px] font-sans text-slate-400">v</span>
                        </span>
                        <span className="text-slate-300">→</span>
                        <span className="text-purple-700 font-semibold" title="AddToCart Additions">
                          {p.cartAdds} <span className="text-[9.5px] font-sans text-purple-400">c</span>
                        </span>
                        <span className="text-slate-300">→</span>
                        <span className="text-emerald-700 font-bold" title="Orders Completed">
                          {p.orders} <span className="text-[9.5px] font-sans text-emerald-500">o</span>
                        </span>
                      </div>
                    </td>

                    {/* Conversion Rate */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[11px] font-mono ${
                          p.conversionRate >= 3.0
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : p.conversionRate > 0
                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {p.conversionRate}%
                      </span>
                    </td>

                    {/* Cart Drop-off Rate */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {p.cartAdds > 0 ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[11px] font-mono ${
                            p.cartDropoffRate >= 70
                              ? "bg-rose-50 text-rose-800 border border-rose-200"
                              : p.cartDropoffRate >= 50
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {p.cartDropoffRate}%
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">—</span>
                      )}
                    </td>

                    {/* Realized Cash */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-xs whitespace-nowrap">
                      <span className={p.revenue > 0 ? "text-slate-900" : "text-slate-400"}>
                        ৳{p.revenue.toLocaleString("en-BD")}
                      </span>
                      {p.unitsSold > 0 && (
                        <div className="text-[10px] text-slate-500 font-normal font-sans">
                          {p.unitsSold} {p.unitsSold === 1 ? "unit" : "units"}
                        </div>
                      )}
                    </td>

                    {/* Quadrant & Recommendation */}
                    <td className="py-3 px-4 max-w-sm">
                      <div className="space-y-1">
                        <div>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                              isHero
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : isGem
                                ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                                : isAbandon
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {isHero && <Flame className="h-3 w-3 text-emerald-600" />}
                            {isGem && <Gem className="h-3 w-3 text-indigo-600" />}
                            {isAbandon && <AlertTriangle className="h-3 w-3 text-amber-600" />}
                            {!isHero && !isGem && !isAbandon && (
                              <PauseCircle className="h-3 w-3 text-slate-500" />
                            )}
                            <span>{p.quadrantLabel}</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          {p.actionRecommendation}
                        </p>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 pr-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(p)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                          title="Copy Store Link"
                        >
                          {copiedId === p.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>

                        <Link
                          href={`/products/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                          title="Open Storefront Product Page"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── 5. Bottom Insights Footer ── */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            Telemetry synchronized with MongoDB collection <strong>metaeventlogs</strong> &amp; verified store orders.
          </span>
        </div>
        <div className="font-mono text-[11px] text-slate-500">
          Total Analyzed Catalog Revenue:{" "}
          <strong className="text-slate-900">
            ৳{(data?.summary.totalCatalogRevenue ?? 0).toLocaleString("en-BD")}
          </strong>
        </div>
      </div>
    </div>
  );
}
