"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowUpRight,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  RotateCcw,
  Phone,
  ShoppingBag,
  Package,
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────────────────── */
interface WCOrder {
  id: number;
  number: string;
  status: string;
  date_created: string;
  total: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  line_items: {
    id: number;
    name: string;
    quantity: number;
    total: string;
    image?: { src: string };
  }[];
}

interface WCProduct {
  id: number;
  name: string;
  total_sales: number;
  price: string;
  regular_price?: string;
  sale_price?: string;
  buy_price?: string;
  stock_quantity?: number | null;
  manage_stock?: boolean;
  images: { src: string }[];
}

/* ─── Donut Chart SVG ─────────────────────────────────────────────── */
function DonutChart({
  value,
  max,
  color,
  size = 140,
  label = "COLLECTED",
}: {
  value: number;
  max: number;
  color: string;
  size?: number;
  label?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#f0ebff"
          strokeWidth={10}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-gray-800">
          {pct.toFixed(0)}%
        </span>
        <span className="text-[10px] font-bold tracking-wider uppercase text-gray-400">
          {label}
        </span>
      </div>
    </div>
  );
}

/* ─── Helper ──────────────────────────────────────────────────────── */
function fmt(n: number) {
  return `৳ ${n.toLocaleString("en-BD", { minimumFractionDigits: 0 })}`;
}

/* ─── Client Cache for Instant Tab Switching ──────────────────────── */
let cachedDashboard: { orders: WCOrder[]; products: WCProduct[] } | null = null;

/* ─── Page ────────────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const { authFetch } = useAuth();
  const [orders, setOrders] = useState<WCOrder[]>(cachedDashboard?.orders || []);
  const [products, setProducts] = useState<WCProduct[]>(cachedDashboard?.products || []);
  const [loading, setLoading] = useState(!cachedDashboard);

  useEffect(() => {
    const load = async () => {
      if (!cachedDashboard) setLoading(true);
      try {
        const [oRes, pRes] = await Promise.all([
          authFetch("/api/admin/orders?per_page=100&status=any"),
          authFetch("/api/admin/products?per_page=100"),
        ]);
        let nextOrders = cachedDashboard?.orders || [];
        let nextProducts = cachedDashboard?.products || [];
        if (oRes.ok) {
          const d = await oRes.json();
          nextOrders = Array.isArray(d) ? d : d.orders ?? [];
          setOrders(nextOrders);
        }
        if (pRes.ok) {
          const d = await pRes.json();
          nextProducts = Array.isArray(d) ? d : d.products ?? [];
          setProducts(nextProducts);
        }
        cachedDashboard = { orders: nextOrders, products: nextProducts };
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Derived stats ───────────────────────────────────────── */
  const stats = useMemo(() => {
    // 1. Filter out cancelled, failed, and refunded orders from revenue
    const validOrders = orders.filter(
      (o) => !["cancelled", "failed", "refunded", "trash"].includes(o.status)
    );
    const cancelledOrders = orders.filter((o) =>
      ["cancelled", "failed", "refunded", "trash"].includes(o.status)
    );

    const totalRevenue = validOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const paidRevenue = validOrders
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((o: any) => o.paymentStatus === "paid" || o.payment_status === "paid" || o.status === "completed")
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
    const pendingRevenue = Math.max(0, totalRevenue - paidRevenue);

    const pendingCount = validOrders.filter(
      (o) => o.status === "pending" || o.status === "on-hold"
    ).length;
    const completedCount = validOrders.filter(
      (o) => o.status === "completed"
    ).length;
    const processingCount = validOrders.filter(
      (o) => o.status === "processing"
    ).length;
    const cancelledCount = cancelledOrders.length;
    const deliveredCount = completedCount;

    // Today's valid orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = validOrders.filter(
      (o) => new Date(o.date_created) >= today
    );
    const todayRevenue = todayOrders.reduce(
      (sum, o) => sum + Number(o.total || 0),
      0
    );
    const todayPaid = todayOrders
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((o: any) => o.paymentStatus === "paid" || o.payment_status === "paid" || o.status === "completed")
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    // This month's valid orders
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthOrders = validOrders.filter(
      (o) => new Date(o.date_created) >= thisMonth
    );
    const monthRevenue = monthOrders.reduce(
      (sum, o) => sum + Number(o.total || 0),
      0
    );
    const monthPaid = monthOrders
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((o: any) => o.paymentStatus === "paid" || o.payment_status === "paid" || o.status === "completed")
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    return {
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      pendingCount,
      completedCount,
      processingCount,
      cancelledCount,
      deliveredCount,
      todayRevenue,
      todayPaid,
      todayOrders: todayOrders.length,
      monthRevenue,
      monthPaid,
      monthOrders: monthOrders.length,
      totalActiveOrders: validOrders.length,
      allOrdersCount: orders.length,
    };
  }, [orders]);

  const inventoryStats = useMemo(() => {
    let totalStockQty = 0;
    let stockCostVal = 0;
    let itemsWithBuyPrice = 0;

    products.forEach((p) => {
      // Only count finite, tracked inventory with explicit buy price
      const isManaged = Boolean(p.manage_stock);
      const qty = typeof p.stock_quantity === "number" ? p.stock_quantity : 0;
      if (isManaged && qty > 0) {
        totalStockQty += qty;
        const cost = parseFloat(p.buy_price || "0");
        if (cost > 0) {
          stockCostVal += cost * qty;
          itemsWithBuyPrice++;
        }
      }
    });

    return {
      totalStockQty,
      stockCostVal,
      itemsWithBuyPrice,
    };
  }, [products]);

  const topProducts = useMemo(
    () => [...products].sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0)).slice(0, 5),
    [products]
  );

  const recentOrders = orders.slice(0, 6);

  const orderStatusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach((o) => {
      map[o.status] = (map[o.status] ?? 0) + 1;
    });
    return map;
  }, [orders]);

  /* ── Loading skeleton ──────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-purple-100/60 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-52 bg-white rounded-2xl shadow-sm border border-purple-100/60" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 h-80 bg-white rounded-2xl shadow-sm border border-purple-100/60" />
          <div className="h-80 bg-white rounded-2xl shadow-sm border border-purple-100/60" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* ── Page title ───────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Welcome back, here&apos;s your store overview.</p>
      </div>

      {/* ── Donut Charts Row (Today / Monthly / All Time) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          {
            title: "Today",
            revenue: stats.todayRevenue,
            paid: stats.todayPaid,
            pending: stats.todayRevenue - stats.todayPaid,
            color: "#9333ea",
            orders: stats.todayOrders,
          },
          {
            title: "This Month",
            revenue: stats.monthRevenue,
            paid: stats.monthPaid,
            pending: stats.monthRevenue - stats.monthPaid,
            color: "#ef4444",
            orders: stats.monthOrders,
          },
          {
            title: "All Time",
            revenue: stats.totalRevenue,
            paid: stats.paidRevenue,
            pending: stats.pendingRevenue,
            color: "#7c3aed",
            orders: stats.totalActiveOrders,
          },
        ].map((item) => (
          <div
            key={item.title}
            className="bg-white rounded-2xl border border-purple-100/60 p-6 flex flex-col items-center shadow-sm hover:shadow-md transition-shadow duration-300"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">
              {item.title}
            </h3>
            <DonutChart
              value={item.paid}
              max={item.revenue || 1}
              color={item.color}
              label="COLLECTED"
            />
            <div className="mt-5 space-y-2 w-full text-[13px]">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: item.color }}
                />
                <span className="text-gray-500">Gross Sales</span>
                <span className="ml-auto font-bold text-gray-800">
                  {fmt(item.revenue)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-gray-500">Payment Received</span>
                <span className="ml-auto font-bold text-emerald-600">
                  {fmt(item.paid)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-gray-500">Pending (COD)</span>
                <span className="ml-auto font-semibold text-amber-600">
                  {fmt(item.pending)}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-purple-50">
                <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                <span className="text-gray-500">Active Orders</span>
                <span className="ml-auto font-semibold text-gray-700">
                  {item.orders}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Stats Cards Row ────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          {
            label: "Total Revenue",
            value: fmt(stats.totalRevenue),
            subtext: "Net store sales",
            icon: TrendingUp,
            color: "text-purple-600",
            bg: "bg-purple-50",
            border: "border-purple-100/80",
          },
          {
            label: "Stock Value",
            value: inventoryStats.stockCostVal > 0 ? fmt(inventoryStats.stockCostVal) : "—",
            subtext:
              inventoryStats.stockCostVal > 0
                ? `${inventoryStats.itemsWithBuyPrice} products with buy price`
                : "No buy price provided",
            icon: Package,
            color: "text-amber-600",
            bg: "bg-amber-50",
            border: "border-amber-100",
          },
          {
            label: "Total Orders",
            value: orders.length,
            subtext: "All customer orders",
            icon: ShoppingBag,
            color: "text-blue-600",
            bg: "bg-blue-50",
            border: "border-blue-100",
          },
          {
            label: "Pending",
            value: stats.pendingCount,
            subtext: "Awaiting action",
            icon: Clock,
            color: "text-amber-600",
            bg: "bg-amber-50",
            border: "border-amber-100",
          },
          {
            label: "Delivered",
            value: stats.deliveredCount,
            subtext: "Fulfilled successfully",
            icon: CheckCircle2,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            border: "border-emerald-100",
          },
          {
            label: "Cancelled",
            value: stats.cancelledCount,
            subtext: "Voided or returned",
            icon: XCircle,
            color: "text-rose-600",
            bg: "bg-rose-50",
            border: "border-rose-100",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-2xl bg-white border ${s.border} p-4 shadow-sm hover:shadow-md transition-all duration-300`}
          >
            <div
              className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${s.bg} mb-2.5`}
            >
              <s.icon className={`h-4.5 w-4.5 ${s.color}`} />
            </div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              {s.label}
            </div>
            <div className="text-lg font-bold text-gray-800 mt-0.5 truncate">
              {s.value}
            </div>
            {s.subtext && (
              <div className="text-[10px] text-gray-500 mt-0.5 truncate">
                {s.subtext}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Order Analytics Section ─────────────────────── */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          Order &amp; Product Activity
        </h2>
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
          {/* ── Recent Orders ─────────────────────────────── */}
          <div className="xl:col-span-3 bg-white rounded-2xl border border-purple-100/60 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-purple-50">
              <h3 className="text-[15px] font-bold text-gray-800">
                Recent Orders
              </h3>
              <Link
                href="/admin/orders"
                className="flex items-center gap-1 text-[12px] text-purple-600 hover:text-purple-700 font-semibold transition"
              >
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Table header */}
            <div className="hidden md:grid grid-cols-[120px_1fr_1fr] gap-3 px-5 py-3 bg-purple-50/50 text-[11px] font-bold uppercase tracking-wider text-purple-600 border-b border-purple-100/40">
              <span>Order No &amp; Date</span>
              <span>Customer Info</span>
              <span>Product Info</span>
            </div>

            <div className="divide-y divide-purple-50">
              {recentOrders.length === 0 ? (
                <p className="text-center py-12 text-gray-400 text-sm">
                  No orders yet
                </p>
              ) : (
                recentOrders.map((order) => {
                  const name =
                    `${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim() ||
                    "Guest";
                  const thumb = order.line_items?.[0]?.image?.src;
                  const productName =
                    order.line_items?.[0]?.name ?? "—";

                  return (
                    <div
                      key={order.id}
                      className="grid grid-cols-1 md:grid-cols-[120px_1fr_1fr] gap-3 px-5 py-3.5 hover:bg-purple-50/30 transition items-center"
                    >
                      {/* Order # & Date */}
                      <div>
                        <p className="text-[13px] font-bold text-purple-600 hover:text-purple-700">
                          #{order.number || order.id}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {order.date_created ? new Date(order.date_created).toLocaleDateString(
                            "en-GB",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          ) : "—"}
                        </p>
                      </div>

                      {/* Customer */}
                      <div className="flex items-center gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3 w-3 text-gray-400" />
                            <span className="text-[12px] font-semibold text-gray-800">
                              {name}
                            </span>
                          </div>
                          {order.billing?.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3 w-3 text-gray-400" />
                              <span className="text-[11px] text-gray-500 font-mono">
                                {order.billing.phone}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Product */}
                      <div className="flex items-center gap-2 min-w-0">
                        {thumb && (
                          <div className="h-9 w-9 rounded-lg overflow-hidden bg-purple-50 flex-shrink-0 border border-purple-100">
                            <Image
                              src={thumb}
                              alt={productName}
                              width={36}
                              height={36}
                              className="object-cover w-full h-full"
                            />
                          </div>
                        )}
                        <p className="text-[12px] text-gray-700 truncate">
                          {productName}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Top Selling Products ──────────────────────── */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-purple-100/60 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-purple-50">
              <h3 className="text-[15px] font-bold text-gray-800">
                Top Selling
              </h3>
              <Link
                href="/admin/products"
                className="flex items-center gap-1 text-[12px] text-purple-600 hover:text-purple-700 font-semibold transition"
              >
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Table header */}
            <div className="hidden md:flex items-center justify-between px-5 py-3 bg-purple-50/50 text-[11px] font-bold uppercase tracking-wider text-purple-600 border-b border-purple-100/40">
              <span>Product Info</span>
              <span>Total Sold</span>
            </div>

            <div className="divide-y divide-purple-50">
              {topProducts.length === 0 ? (
                <p className="text-center py-12 text-gray-400 text-sm">
                  No products yet
                </p>
              ) : (
                topProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-purple-50/30 transition"
                  >
                    <div className="h-10 w-10 rounded-lg overflow-hidden bg-purple-50 flex-shrink-0 border border-purple-100">
                      {p.images?.[0]?.src ? (
                        <Image
                          src={p.images[0].src}
                          alt={p.name}
                          width={40}
                          height={40}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-purple-400 text-[10px]">
                          {p.name?.charAt(0) || "P"}
                        </div>
                      )}
                    </div>
                    <p className="text-[12px] font-medium text-gray-700 flex-1 truncate">
                      {p.name}
                    </p>
                    <span className="flex-shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold">
                      {p.total_sales || 0}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Order Status Overview ──────────────────────── */}
      <div className="bg-white rounded-2xl border border-purple-100/60 p-6 shadow-sm">
        <h3 className="text-[15px] font-bold text-gray-800 mb-4">
          Order Status Pipeline
        </h3>
        <div className="flex flex-wrap gap-3">
          {[
            { key: "pending", label: "Pending", icon: Clock, wrap: "border-amber-200 bg-amber-50 text-amber-800", badge: "bg-amber-200 text-amber-900" },
            { key: "processing", label: "Confirmed", icon: CheckCircle2, wrap: "border-blue-200 bg-blue-50 text-blue-800", badge: "bg-blue-200 text-blue-900" },
            { key: "on-hold", label: "On Hold", icon: RotateCcw, wrap: "border-yellow-200 bg-yellow-50 text-yellow-800", badge: "bg-yellow-200 text-yellow-900" },
            { key: "completed", label: "Delivered", icon: Truck, wrap: "border-emerald-200 bg-emerald-50 text-emerald-800", badge: "bg-emerald-200 text-emerald-900" },
            { key: "cancelled", label: "Cancelled", icon: XCircle, wrap: "border-rose-200 bg-rose-50 text-rose-800", badge: "bg-rose-200 text-rose-900" },
          ].map((s) => {
            const count = orderStatusCounts[s.key] ?? 0;
            return (
              <Link
                key={s.key}
                href={`/admin/orders?status=${s.key}`}
                className={`flex items-center gap-2.5 rounded-xl border ${s.wrap} px-4 py-2.5 text-[13px] font-medium hover:shadow-sm transition`}
              >
                <s.icon className="h-4 w-4" />
                {s.label}
                <span className={`inline-flex h-6 min-w-[24px] items-center justify-center rounded-full ${s.badge} text-[11px] font-bold px-1.5`}>
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          {
            href: "/admin/products/new",
            label: "Add Product",
            desc: "Create new catalog entry",
            color: "from-purple-600 to-indigo-600",
          },
          {
            href: "/admin/orders",
            label: "Process Orders",
            desc: "Update status & delivery",
            color: "from-indigo-600 to-blue-600",
          },
          {
            href: "/admin/products",
            label: "Manage Catalog",
            desc: "Prices, stock, measurements",
            color: "from-purple-700 to-purple-900",
          },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className={`rounded-2xl bg-gradient-to-br ${a.color} p-5 flex flex-col gap-2 hover:opacity-95 transition shadow-sm hover:shadow-md`}
          >
            <p className="text-[14px] font-bold text-white">{a.label}</p>
            <p className="text-[12px] text-white/80">{a.desc}</p>
            <ArrowUpRight className="h-4 w-4 text-white/80 self-end mt-auto" />
          </Link>
        ))}
      </div>
    </div>
  );
}
