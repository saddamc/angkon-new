"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  BarChart3, ShoppingCart, Users, Package, TrendingUp,
  RefreshCw, DollarSign, AlertTriangle, Truck, Tag, Percent,
} from "lucide-react";

interface SalesReport {
  total_sales: string; net_sales: string; average_sales: string;
  total_orders: number; total_items: number; total_tax: string;
  total_shipping: string; total_refunds: number; total_discount: string;
  total_customers: number;
}
interface OrderStatus { slug: string; name: string; total: number; }
interface TopSeller { title: string; product_id: number; quantity: number; }
interface CustomerTotal { slug: string; name: string; total: number; }
interface WCProduct {
  id: number; name: string; sku: string; price: string;
  stock_quantity: number | null; stock_status: string; manage_stock: boolean;
  total_sales: number; status: string;
}
interface ReportData {
  sales: SalesReport; order_statuses: OrderStatus[];
  top_sellers: TopSeller[]; customer_totals: CustomerTotal[];
  period: string; date_min: string; date_max: string;
}

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week", label: "Last 7 Days" },
  { key: "month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "year", label: "Year" },
] as const;

function fmt(n: string | number) {
  return `৳${Number(n).toLocaleString("en-BD", { minimumFractionDigits: 2 })}`;
}

export default function ReportsPage() {
  const { authFetch } = useAuth();
  const [report, setReport] = useState<ReportData | null>(null);
  const [products, setProducts] = useState<WCProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  const load = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const [rRes, pRes] = await Promise.all([
        authFetch(`/api/admin/reports?period=${p}`),
        authFetch("/api/admin/products?per_page=100"),
      ]);
      if (rRes.ok) setReport(await rRes.json());
      if (pRes.ok) {
        const d = await pRes.json();
        setProducts(Array.isArray(d) ? d : d.products ?? []);
      }
    } finally { setLoading(false); }
  }, [authFetch]);

  useEffect(() => { void load(period); }, [load, period]);

  const handlePeriod = (p: string) => { setPeriod(p); };

  // Stock stats from products
  const lowStock = products.filter(p => p.manage_stock && p.stock_quantity !== null && p.stock_quantity <= 5 && p.stock_quantity > 0);
  const outOfStock = products.filter(p => p.stock_status === "outofstock");
  const inStock = products.filter(p => p.stock_status === "instock");
  const totalStockValue = products.reduce((s, p) => s + (Number(p.price) || 0) * (p.stock_quantity ?? 0), 0);

  // Customer totals from WC
  const totalCustomers = report?.customer_totals?.reduce((s, c) => s + c.total, 0) ?? 0;
  const payingCustomers = report?.customer_totals?.find(c => c.slug === "paying")?.total ?? 0;

  if (loading) return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center"><BarChart3 className="h-5 w-5 text-purple-600" /></div>
        <div><h1 className="text-xl font-bold text-gray-800">Reports</h1><p className="text-[12px] text-gray-400">Loading from WooCommerce...</p></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({length:8}).map((_,i)=><div key={i} className="h-28 rounded-2xl bg-purple-50/50 animate-pulse"/>)}</div>
    </div>
  );

  const s = report?.sales;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center"><BarChart3 className="h-5 w-5 text-purple-600" /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Reports & Analytics</h1>
            <p className="text-[12px] text-gray-400">
              Data from WooCommerce · {report?.date_min} to {report?.date_max}
            </p>
          </div>
        </div>
        <button onClick={() => load(period)} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] text-gray-500 hover:text-purple-600 hover:border-purple-300 transition">
          <RefreshCw className="h-4 w-4"/>
        </button>
      </div>

      {/* Period Tabs */}
      <div className="bg-white rounded-2xl border border-purple-100/60 p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((t) => (
            <button key={t.key} onClick={() => handlePeriod(t.key)} className={`rounded-full px-4 py-2 text-[13px] font-medium border transition-all ${period === t.key ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200" : "bg-white text-gray-600 border-gray-200 hover:border-purple-300"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sales Cards — matches WooCommerce exactly */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Gross Sales", value: fmt(s?.total_sales ?? "0"), icon: DollarSign, color: "bg-purple-50 text-purple-600", sub: "in this period" },
          { label: "Net Sales", value: fmt(s?.net_sales ?? "0"), icon: TrendingUp, color: "bg-emerald-50 text-emerald-600", sub: "after refunds" },
          { label: "Orders Placed", value: String(s?.total_orders ?? 0), icon: ShoppingCart, color: "bg-blue-50 text-blue-600", sub: `${s?.total_items ?? 0} items purchased` },
          { label: "Items Purchased", value: String(s?.total_items ?? 0), icon: Package, color: "bg-indigo-50 text-indigo-600", sub: "total items" },
          { label: "Refunded", value: `${s?.total_refunds ?? 0} orders`, icon: AlertTriangle, color: "bg-red-50 text-red-600", sub: "refunded orders" },
          { label: "Shipping Charged", value: fmt(s?.total_shipping ?? "0"), icon: Truck, color: "bg-amber-50 text-amber-600", sub: "shipping fees" },
          { label: "Coupons Used", value: fmt(s?.total_discount ?? "0"), icon: Percent, color: "bg-rose-50 text-rose-600", sub: "discount value" },
          { label: "Average Order", value: fmt(s?.average_sales ?? "0"), icon: Tag, color: "bg-cyan-50 text-cyan-600", sub: "per order" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-purple-100/60 p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${c.color}`}><c.icon className="h-5 w-5" /></div>
            </div>
            <p className="text-[22px] font-bold text-gray-800">{c.value}</p>
            <p className="text-[12px] text-gray-500 mt-0.5">{c.label}</p>
            <p className="text-[10px] text-gray-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Order Status Totals + Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Order Statuses from WC */}
        <div className="bg-white rounded-2xl border border-purple-100/60 p-5 shadow-sm">
          <h3 className="text-[14px] font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-purple-500"/>Order Status Totals (All Time)
          </h3>
          <div className="space-y-2.5">
            {(report?.order_statuses ?? []).filter(s => s.total > 0).sort((a,b) => b.total - a.total).map((st) => {
              const max = Math.max(...(report?.order_statuses ?? []).map(s => s.total), 1);
              const pct = (st.total / max) * 100;
              return (
                <div key={st.slug} className="flex items-center gap-3">
                  <span className="text-[12px] font-medium text-gray-700 capitalize w-28 truncate">{st.name}</span>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full transition-all" style={{width:`${pct}%`}}/>
                  </div>
                  <span className="text-[13px] font-bold text-gray-700 w-10 text-right">{st.total}</span>
                </div>
              );
            })}
            {(report?.order_statuses ?? []).filter(s=>s.total>0).length === 0 && (
              <p className="text-[12px] text-gray-400 text-center py-4">No orders yet</p>
            )}
          </div>
        </div>

        {/* Customers from WC */}
        <div className="bg-white rounded-2xl border border-purple-100/60 p-5 shadow-sm">
          <h3 className="text-[14px] font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-500"/>Customer Overview
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl border-2 border-purple-200 bg-purple-50 p-4 text-center">
              <p className="text-[24px] font-bold text-purple-600">{totalCustomers}</p>
              <p className="text-[11px] text-purple-400 font-medium">Total Customers</p>
            </div>
            <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="text-[24px] font-bold text-emerald-600">{payingCustomers}</p>
              <p className="text-[11px] text-emerald-400 font-medium">Paying Customers</p>
            </div>
          </div>
          <div className="space-y-2">
            {(report?.customer_totals ?? []).map((ct) => (
              <div key={ct.slug} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-[12px] font-medium text-gray-700 capitalize">{ct.name}</span>
                <span className="text-[13px] font-bold text-gray-800">{ct.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Sellers + Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Sellers from WC */}
        <div className="bg-white rounded-2xl border border-purple-100/60 p-5 shadow-sm">
          <h3 className="text-[14px] font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-500"/>Top Sellers ({PERIODS.find(p=>p.key===period)?.label})
          </h3>
          <div className="space-y-2">
            {(report?.top_sellers ?? []).map((ts, i) => (
              <div key={ts.product_id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-purple-50/30 transition">
                <span className="h-7 w-7 rounded-lg bg-purple-100 flex items-center justify-center text-[11px] font-bold text-purple-600 flex-shrink-0">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-gray-700 truncate">{ts.title}</p>
                  <p className="text-[10px] text-gray-400">ID: {ts.product_id}</p>
                </div>
                <span className="text-[13px] font-bold text-emerald-600">{ts.quantity} sold</span>
              </div>
            ))}
            {(report?.top_sellers ?? []).length === 0 && (
              <p className="text-[12px] text-gray-400 text-center py-4">No sales in this period</p>
            )}
          </div>
        </div>

        {/* Stock Alerts */}
        <div className="bg-white rounded-2xl border border-purple-100/60 p-5 shadow-sm">
          <h3 className="text-[14px] font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Package className="h-4 w-4 text-purple-500"/>Stock Report
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-3 text-center">
              <p className="text-[20px] font-bold text-emerald-600">{inStock.length}</p>
              <p className="text-[10px] text-emerald-400 font-bold">In Stock</p>
            </div>
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-3 text-center">
              <p className="text-[20px] font-bold text-amber-600">{lowStock.length}</p>
              <p className="text-[10px] text-amber-400 font-bold">Low Stock</p>
            </div>
            <div className="rounded-xl border-2 border-red-200 bg-red-50 p-3 text-center">
              <p className="text-[20px] font-bold text-red-600">{outOfStock.length}</p>
              <p className="text-[10px] text-red-400 font-bold">Out of Stock</p>
            </div>
          </div>
          <div className="rounded-xl border border-purple-100 bg-purple-50/30 p-3 mb-3">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Inventory Value</p>
            <p className="text-[18px] font-bold text-purple-600">{fmt(totalStockValue)}</p>
          </div>
          {lowStock.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-2">Low Stock Items</p>
              {lowStock.map(p => (
                <div key={p.id} className="flex items-center justify-between py-1.5">
                  <span className="text-[11px] text-gray-600 truncate flex-1">{p.name}</span>
                  <span className="text-[11px] font-bold text-amber-600 ml-2">{p.stock_quantity} left</span>
                </div>
              ))}
            </div>
          )}
          {outOfStock.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-2">Out of Stock Items</p>
              {outOfStock.slice(0,5).map(p => (
                <div key={p.id} className="py-1.5"><span className="text-[11px] text-red-500">• {p.name}</span></div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
