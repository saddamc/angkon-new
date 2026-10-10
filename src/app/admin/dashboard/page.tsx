"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowUpRight,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  RotateCcw,
  Phone,
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
  images: { src: string }[];
}

/* ─── Status colour map ───────────────────────────────────────────── */
const STATUS_BADGE: Record<string, { bg: string; text: string; dot: string }> = {
  pending:    { bg: "bg-amber-50",   text: "text-amber-600",   dot: "bg-amber-400" },
  processing: { bg: "bg-blue-50",    text: "text-blue-600",    dot: "bg-blue-400" },
  "on-hold":  { bg: "bg-yellow-50",  text: "text-yellow-600",  dot: "bg-yellow-400" },
  completed:  { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-400" },
  cancelled:  { bg: "bg-red-50",     text: "text-red-600",     dot: "bg-red-400" },
  refunded:   { bg: "bg-gray-50",    text: "text-gray-600",    dot: "bg-gray-400" },
  failed:     { bg: "bg-rose-50",    text: "text-rose-600",    dot: "bg-rose-400" },
};

/* ─── Donut Chart SVG ─────────────────────────────────────────────── */
function DonutChart({
  value,
  max,
  color,
  size = 140,
}: {
  value: number;
  max: number;
  color: string;
  size?: number;
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
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-gray-700">
          {pct.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

/* ─── Helper ──────────────────────────────────────────────────────── */
function fmt(n: number) {
  return `৳ ${n.toLocaleString("en-BD", { minimumFractionDigits: 0 })}`;
}

/* ─── Page ────────────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const { authFetch } = useAuth();
  const [orders, setOrders] = useState<WCOrder[]>([]);
  const [products, setProducts] = useState<WCProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [oRes, pRes] = await Promise.all([
          authFetch("/api/admin/orders?per_page=100&status=any"),
          authFetch("/api/admin/products?per_page=100"),
        ]);
        if (oRes.ok) {
          const d = await oRes.json();
          setOrders(Array.isArray(d) ? d : d.orders ?? []);
        }
        if (pRes.ok) {
          const d = await pRes.json();
          setProducts(Array.isArray(d) ? d : d.products ?? []);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Derived stats ───────────────────────────────────────── */
  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter((o) => !["cancelled", "failed", "refunded", "trash"].includes(o.status))
      .reduce((sum, o) => sum + Number(o.total), 0);
    const pendingCount = orders.filter(
      (o) => o.status === "pending" || o.status === "on-hold"
    ).length;
    const completedCount = orders.filter(
      (o) => o.status === "completed"
    ).length;
    const processingCount = orders.filter(
      (o) => o.status === "processing"
    ).length;
    const cancelledCount = orders.filter(
      (o) => o.status === "cancelled"
    ).length;
    const deliveredCount = completedCount;

    // Today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = orders.filter(
      (o) => new Date(o.date_created) >= today
    );
    const todayRevenue = todayOrders.reduce(
      (sum, o) => sum + Number(o.total),
      0
    );

    // This month's orders
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthOrders = orders.filter(
      (o) => new Date(o.date_created) >= thisMonth
    );
    const monthRevenue = monthOrders.reduce(
      (sum, o) => sum + Number(o.total),
      0
    );

    return {
      totalRevenue,
      pendingCount,
      completedCount,
      processingCount,
      cancelledCount,
      deliveredCount,
      todayRevenue,
      todayOrders: todayOrders.length,
      monthRevenue,
      monthOrders: monthOrders.length,
    };
  }, [orders]);

  const topProducts = useMemo(
    () => [...products].sort((a, b) => b.total_sales - a.total_sales).slice(0, 5),
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
        <div className="h-8 w-48 bg-purple-100 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-52 bg-white rounded-2xl shadow-sm" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 h-80 bg-white rounded-2xl shadow-sm" />
          <div className="h-80 bg-white rounded-2xl shadow-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* ── Page title ───────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Welcome back, here&apos;s your store overview.
        </p>
      </div>

      {/* ── Donut Charts Row (Today / Monthly / All Time) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          {
            title: "Today",
            value: stats.todayRevenue,
            max: stats.totalRevenue || 1,
            color: "#9333ea",
            orders: stats.todayOrders,
          },
          {
            title: "Monthly",
            value: stats.monthRevenue,
            max: stats.totalRevenue || 1,
            color: "#ef4444",
            orders: stats.monthOrders,
          },
          {
            title: "All Time",
            value: stats.totalRevenue,
            max: stats.totalRevenue || 1,
            color: "#7c3aed",
            orders: orders.length,
          },
        ].map((item) => (
          <div
            key={item.title}
            className="bg-white rounded-2xl border border-purple-100/60 p-6 flex flex-col items-center shadow-sm hover:shadow-md transition-shadow duration-300"
          >
            <h3 className="text-sm font-semibold text-gray-500 mb-4">
              {item.title}
            </h3>
            <DonutChart
              value={item.value}
              max={item.max}
              color={item.color}
            />
            <div className="mt-4 space-y-1.5 w-full">
              <div className="flex items-center gap-2 text-[13px]">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: item.color }}
                />
                <span className="text-gray-500">Achievement</span>
                <span className="ml-auto font-bold text-gray-700">
                  {fmt(item.value)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[13px]">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-100" />
                <span className="text-gray-500">Orders</span>
                <span className="ml-auto font-semibold text-gray-600">
                  {item.orders}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Stats Cards Row ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: "Total Revenue",
            value: fmt(stats.totalRevenue),
            icon: TrendingUp,
            color: "text-purple-600",
            bg: "bg-purple-50",
            border: "border-purple-100",
          },
          {
            label: "Total Orders",
            value: orders.length,
            icon: ShoppingCart,
            color: "text-blue-600",
            bg: "bg-blue-50",
            border: "border-blue-100",
          },
          {
            label: "Pending",
            value: stats.pendingCount,
            icon: Clock,
            color: "text-amber-600",
            bg: "bg-amber-50",
            border: "border-amber-100",
          },
          {
            label: "Delivered",
            value: stats.deliveredCount,
            icon: CheckCircle2,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            border: "border-emerald-100",
          },
          {
            label: "Cancelled",
            value: stats.cancelledCount,
            icon: XCircle,
            color: "text-red-600",
            bg: "bg-red-50",
            border: "border-red-100",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-2xl bg-white border ${s.border} p-4 shadow-sm hover:shadow-md transition-all duration-300`}
          >
            <div
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${s.bg} mb-3`}
            >
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <p className="text-[22px] font-black text-gray-800">{s.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 font-medium">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Order Analytics Section ─────────────────────── */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          Order Analytics
        </h2>
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
          {/* ── Recent Orders ─────────────────────────────── */}
          <div className="xl:col-span-3 bg-white rounded-2xl border border-purple-100/60 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-purple-50">
              <h3 className="text-[15px] font-bold text-gray-700">
                Recent Order
              </h3>
              <Link
                href="/admin/orders"
                className="flex items-center gap-1 text-[12px] text-purple-600 hover:text-purple-500 font-medium transition"
              >
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Table header */}
            <div className="hidden md:grid grid-cols-[120px_1fr_1fr] gap-3 px-5 py-3 bg-purple-50/50 text-[11px] font-bold uppercase tracking-wider text-purple-400">
              <span>Order No & Date</span>
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
                    `${order.billing.first_name} ${order.billing.last_name}`.trim() ||
                    "Guest";
                  const thumb = order.line_items[0]?.image?.src;
                  const productName =
                    order.line_items[0]?.name ?? "—";

                  return (
                    <div
                      key={order.id}
                      className="grid grid-cols-1 md:grid-cols-[120px_1fr_1fr] gap-3 px-5 py-3.5 hover:bg-purple-50/30 transition items-center"
                    >
                      {/* Order # & Date */}
                      <div>
                        <p className="text-[13px] font-bold text-purple-600">
                          #{order.number}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {new Date(order.date_created).toLocaleDateString(
                            "en-GB",
                            {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            }
                          )}
                        </p>
                      </div>

                      {/* Customer */}
                      <div className="flex items-center gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3 w-3 text-gray-400" />
                            <span className="text-[12px] font-semibold text-gray-700">
                              {name}
                            </span>
                          </div>
                          {order.billing.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3 w-3 text-gray-400" />
                              <span className="text-[11px] text-gray-500">
                                {order.billing.phone}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Product */}
                      <div className="flex items-center gap-2">
                        {thumb && (
                          <div className="h-9 w-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-purple-100">
                            <Image
                              src={thumb}
                              alt={productName}
                              width={36}
                              height={36}
                              className="object-cover w-full h-full"
                            />
                          </div>
                        )}
                        <p className="text-[12px] text-gray-600 truncate">
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
              <h3 className="text-[15px] font-bold text-gray-700">
                Top Selling Products
              </h3>
              <Link
                href="/admin/products"
                className="flex items-center gap-1 text-[12px] text-purple-600 hover:text-purple-500 font-medium transition"
              >
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Table header */}
            <div className="hidden md:flex items-center justify-between px-5 py-3 bg-purple-50/50 text-[11px] font-bold uppercase tracking-wider text-purple-400">
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
                    <div className="h-10 w-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-purple-100">
                      {p.images[0]?.src ? (
                        <Image
                          src={p.images[0].src}
                          alt={p.name}
                          width={40}
                          height={40}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-400 text-[10px]">
                          {p.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <p className="text-[12px] font-medium text-gray-600 flex-1 truncate">
                      {p.name}
                    </p>
                    <span className="flex-shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-full bg-purple-600 text-white text-[11px] font-bold">
                      {p.total_sales}
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
        <h3 className="text-[15px] font-bold text-gray-700 mb-4">
          Order Status Overview
        </h3>
        <div className="flex flex-wrap gap-3">
          {[
            // NOTE: Tailwind only generates classes it can see as complete
            // static strings, so the color classes must be written in full
            // here — never built with `bg-${color}-50` style interpolation
            // (those would silently render with no styling).
            { key: "pending", label: "Pending", icon: Clock, wrap: "border-amber-200 bg-amber-50 text-amber-700", badge: "bg-amber-200 text-amber-800" },
            { key: "processing", label: "Confirmed", icon: CheckCircle2, wrap: "border-blue-200 bg-blue-50 text-blue-700", badge: "bg-blue-200 text-blue-800" },
            { key: "on-hold", label: "On Hold", icon: RotateCcw, wrap: "border-yellow-200 bg-yellow-50 text-yellow-700", badge: "bg-yellow-200 text-yellow-800" },
            { key: "completed", label: "Delivered", icon: Truck, wrap: "border-emerald-200 bg-emerald-50 text-emerald-700", badge: "bg-emerald-200 text-emerald-800" },
            { key: "cancelled", label: "Cancelled", icon: XCircle, wrap: "border-red-200 bg-red-50 text-red-700", badge: "bg-red-200 text-red-800" },
          ].map((s) => {
            const count = orderStatusCounts[s.key] ?? 0;
            return (
              <Link
                key={s.key}
                href={`/admin/orders?status=${s.key}`}
                className={`flex items-center gap-2 rounded-xl border ${s.wrap} px-4 py-2.5 text-[13px] font-medium hover:shadow-sm transition`}
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
            desc: "Create a new product listing",
            color: "from-purple-600 to-purple-700",
          },
          {
            href: "/admin/orders",
            label: "View Orders",
            desc: "Manage & update order status",
            color: "from-blue-600 to-blue-700",
          },
          {
            href: "/admin/products",
            label: "All Products",
            desc: "Edit prices, images, stock",
            color: "from-violet-600 to-violet-700",
          },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className={`rounded-2xl bg-gradient-to-br ${a.color} p-5 flex flex-col gap-2 hover:opacity-90 transition shadow-md hover:shadow-lg`}
          >
            <p className="text-[14px] font-bold text-white">{a.label}</p>
            <p className="text-[12px] text-white/70">{a.desc}</p>
            <ArrowUpRight className="h-4 w-4 text-white/60 self-end mt-auto" />
          </Link>
        ))}
      </div>
    </div>
  );
}
