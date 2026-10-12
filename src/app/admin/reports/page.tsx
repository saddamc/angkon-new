"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  BarChart3,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  Truck,
  Percent,
} from "lucide-react";

interface SalesReport {
  total_sales: string;
  paid_revenue?: string;
  pending_revenue?: string;
  cancelled_sales?: string;
  net_sales: string;
  average_sales: string;
  total_orders: number;
  all_orders_count?: number;
  total_items: number;
  total_tax: string;
  total_shipping: string;
  total_refunds: number;
  total_discount: string;
  total_customers: number;
}

interface OrderStatus {
  slug: string;
  name: string;
  total: number;
}

interface TopSeller {
  title: string;
  product_id: number;
  quantity: number;
}

interface CustomerTotal {
  slug: string;
  name: string;
  total: number;
}

interface WCProduct {
  id: number;
  name: string;
  sku: string;
  price: string;
  buy_price?: string;
  stock_quantity: number | null;
  stock_status: string;
  manage_stock: boolean;
  total_sales: number;
  status: string;
}

interface ReportData {
  sales: SalesReport;
  order_statuses: OrderStatus[];
  top_sellers: TopSeller[];
  customer_totals?: CustomerTotal[];
  period: string;
  date_min?: string;
  date_max?: string;
}

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week", label: "Last 7 Days" },
  { key: "month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "year", label: "This Year" },
] as const;

function fmt(n: string | number) {
  return `৳ ${Number(n || 0).toLocaleString("en-BD", { minimumFractionDigits: 0 })}`;
}

/* ─── Client Cache for Instant Tab Switching ──────────────────────── */
let cachedReportData: { report: ReportData | null; products: WCProduct[] } | null = null;

export default function ReportsPage() {
  const { authFetch } = useAuth();
  const [report, setReport] = useState<ReportData | null>(cachedReportData?.report || null);
  const [products, setProducts] = useState<WCProduct[]>(cachedReportData?.products || []);
  const [loading, setLoading] = useState(!cachedReportData);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState("month");

  const load = useCallback(
    async (p: string, soft = false) => {
      if (soft || cachedReportData) setRefreshing(true);
      else setLoading(true);
      try {
        const [rRes, pRes] = await Promise.all([
          authFetch(`/api/admin/reports?period=${p}`),
          authFetch("/api/admin/products?per_page=150"),
        ]);
        let nextReport = cachedReportData?.report || null;
        let nextProducts = cachedReportData?.products || [];
        if (rRes.ok) nextReport = await rRes.json();
        if (pRes.ok) {
          const d = await pRes.json();
          nextProducts = Array.isArray(d) ? d : d.products ?? [];
        }
        setReport(nextReport);
        setProducts(nextProducts);
        cachedReportData = { report: nextReport, products: nextProducts };
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authFetch]
  );

  useEffect(() => {
    void load(period, Boolean(cachedReportData));
  }, [load, period]);

  const handlePeriod = (p: string) => {
    if (p === period) return;
    setPeriod(p);
  };

  const lowStock = products.filter(
    (p) => p.manage_stock && p.stock_quantity !== null && p.stock_quantity <= 5 && p.stock_quantity > 0
  );
  const outOfStock = products.filter((p) => p.stock_status === "outofstock");
  const inStock = products.filter((p) => p.stock_status === "instock");
  let totalStockCost = 0;
  let productsWithCostCount = 0;
  products.forEach((p) => {
    const isManaged = Boolean(p.manage_stock);
    const qty = typeof p.stock_quantity === "number" ? p.stock_quantity : 0;
    if (isManaged && qty > 0) {
      const cost = parseFloat(p.buy_price || "0");
      if (cost > 0) {
        totalStockCost += cost * qty;
        productsWithCostCount++;
      }
    }
  });

  const s = report?.sales;
  const periodLabel = PERIODS.find((t) => t.key === period)?.label ?? "This period";

  if (loading && !report) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#400604]/10 border border-[#E1B76F]/30 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-[#400604]" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-[#1A0302]">Analytics &amp; Reports</h1>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-stone-100/60 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#400604]/10 border border-[#E1B76F]/30 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-[#400604]" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-[#1A0302]">Reports &amp; Sales Intelligence</h1>
          </div>
        </div>

        {/* Period Pills & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex bg-stone-100 p-1 rounded-xl gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => handlePeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition ${
                  period === p.key
                    ? "bg-[#400604] text-white shadow-sm"
                    : "text-stone-600 hover:text-[#400604] hover:bg-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void load(period, true)}
            className="flex items-center justify-center h-9 w-9 rounded-xl border border-stone-200 bg-white text-stone-600 hover:text-[#400604] transition"
            title="Refresh metrics"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── KPI Grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#E1B76F]/25 p-5 shadow-sm">
          <div className="h-9 w-9 rounded-xl bg-[#400604]/10 flex items-center justify-center mb-3">
            <TrendingUp className="h-5 w-5 text-[#400604]" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Total Sales</p>
          <p className="text-2xl font-bold text-[#1A0302] mt-1">{fmt(s?.total_sales ?? "0")}</p>
          <p className="text-[11px] text-stone-400 mt-1">Active order volume</p>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200/60 bg-emerald-50/20 p-5 shadow-sm">
          <div className="h-9 w-9 rounded-xl bg-emerald-100 flex items-center justify-center mb-3">
            <Percent className="h-5 w-5 text-emerald-800" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800/70">Payment Received</p>
          <p className="text-2xl font-bold text-emerald-800 mt-1">{fmt(s?.paid_revenue ?? "0")}</p>
          <p className="text-[11px] text-emerald-700/80 mt-1">Delivered &amp; collected in cash</p>
        </div>

        <div className="bg-white rounded-2xl border border-amber-200/60 bg-amber-50/20 p-5 shadow-sm">
          <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
            <Truck className="h-5 w-5 text-amber-800" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-800/70">Pending Collection</p>
          <p className="text-2xl font-bold text-amber-800 mt-1">{fmt(s?.pending_revenue ?? "0")}</p>
          <p className="text-[11px] text-amber-700/80 mt-1">In-transit COD awaiting delivery</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E1B76F]/25 p-5 shadow-sm">
          <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
            <ShoppingCart className="h-5 w-5 text-blue-700" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Active Orders</p>
          <p className="text-2xl font-bold text-[#1A0302] mt-1">{s?.total_orders ?? 0}</p>
          <p className="text-[11px] text-stone-400 mt-1">
            Avg ticket: {fmt(s?.average_sales ?? "0")}
          </p>
        </div>
      </div>

      {/* ── Financial Details & Shipping ─────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#E1B76F]/25 p-5 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-700 flex-shrink-0">
            <Percent className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Net Sales</p>
            <p className="text-xl font-bold text-[#1A0302] mt-0.5">{fmt(s?.net_sales ?? "0")}</p>
            <p className="text-[10px] text-stone-400">Excluding delivery</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E1B76F]/25 p-5 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-700 flex-shrink-0">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Shipping Collected</p>
            <p className="text-xl font-bold text-[#1A0302] mt-0.5">{fmt(s?.total_shipping ?? "0")}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E1B76F]/25 p-5 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-700 flex-shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Unique Clients</p>
            <p className="text-xl font-bold text-[#1A0302] mt-0.5">{s?.total_customers ?? 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-rose-200/80 bg-rose-50/20 p-5 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-700 flex-shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-rose-800">Cancelled Orders</p>
            <p className="text-xl font-bold text-rose-800 mt-0.5">{s?.total_refunds ?? 0} Orders</p>
            <p className="text-[10px] text-rose-600 font-semibold">{fmt(s?.cancelled_sales ?? "0")} voided</p>
          </div>
        </div>
      </div>

      {/* ── Inventory Health ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#E1B76F]/25 p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-serif font-bold text-[#1A0302]">Catalog Inventory Health</h2>
          <p className="text-[12px] text-stone-500">Live stock statuses across all garment listings</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-[#FDFBF7] p-4 rounded-xl border border-stone-200">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400">In Stock</p>
            <p className="text-xl font-bold text-emerald-700 mt-1">{inStock.length}</p>
            <p className="text-[11px] text-stone-400">Ready for fulfillment</p>
          </div>

          <div className="bg-[#FDFBF7] p-4 rounded-xl border border-stone-200">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Low Stock (&le; 5)</p>
            <p className="text-xl font-bold text-amber-700 mt-1">{lowStock.length}</p>
            <p className="text-[11px] text-stone-400">Replenish soon</p>
          </div>

          <div className="bg-[#FDFBF7] p-4 rounded-xl border border-stone-200">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Out of Stock</p>
            <p className="text-xl font-bold text-rose-700 mt-1">{outOfStock.length}</p>
            <p className="text-[11px] text-stone-400">Zero inventory</p>
          </div>

          <div className="bg-[#FDFBF7] p-4 rounded-xl border border-stone-200">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Stock Value (Buy Price)</p>
            <p className="text-xl font-bold text-[#400604] mt-1">{totalStockCost > 0 ? fmt(totalStockCost) : "—"}</p>
            <p className="text-[11px] text-stone-500 mt-0.5 truncate">
              {totalStockCost > 0 ? `${productsWithCostCount} products with buy price` : "No buy price provided"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
