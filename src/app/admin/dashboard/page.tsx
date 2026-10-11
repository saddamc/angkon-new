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
          stroke="#F5EFE6"
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
        <span className="text-lg font-serif font-bold text-[#1A0302]">
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
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
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
      (sum, o) => sum + Number(o.total || 0),
      0
    );

    // This month's orders
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthOrders = orders.filter(
      (o) => new Date(o.date_created) >= thisMonth
    );
    const monthRevenue = monthOrders.reduce(
      (sum, o) => sum + Number(o.total || 0),
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
        <div className="h-8 w-48 bg-[#400604]/10 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-52 bg-white rounded-2xl shadow-sm border border-[#E1B76F]/20" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 h-80 bg-white rounded-2xl shadow-sm border border-[#E1B76F]/20" />
          <div className="h-80 bg-white rounded-2xl shadow-sm border border-[#E1B76F]/20" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* ── Page title ───────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#1A0302]">Store Overview</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          Welcome to the ANGKON luxury administration dashboard. Real-time MongoDB intelligence.
        </p>
      </div>

      {/* ── Donut Charts Row (Today / Monthly / All Time) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          {
            title: "Today",
            value: stats.todayRevenue,
            max: stats.totalRevenue || 1,
            color: "#E1B76F",
            orders: stats.todayOrders,
          },
          {
            title: "This Month",
            value: stats.monthRevenue,
            max: stats.totalRevenue || 1,
            color: "#400604",
            orders: stats.monthOrders,
          },
          {
            title: "All Time",
            value: stats.totalRevenue,
            max: stats.totalRevenue || 1,
            color: "#1A0302",
            orders: orders.length,
          },
        ].map((item) => (
          <div
            key={item.title}
            className="bg-white rounded-2xl border border-[#E1B76F]/25 p-6 flex flex-col items-center shadow-sm hover:shadow-md transition-shadow duration-300"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-4">
              {item.title}
            </h3>
            <DonutChart
              value={item.value}
              max={item.max}
              color={item.color}
            />
            <div className="mt-5 space-y-2 w-full">
              <div className="flex items-center gap-2 text-[13px]">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: item.color }}
                />
                <span className="text-stone-500">Revenue</span>
                <span className="ml-auto font-bold text-[#1A0302]">
                  {fmt(item.value)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[13px]">
                <span className="h-2.5 w-2.5 rounded-full bg-stone-200" />
                <span className="text-stone-500">Orders Placed</span>
                <span className="ml-auto font-semibold text-stone-700">
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
            color: "text-[#400604]",
            bg: "bg-[#400604]/10",
            border: "border-[#E1B76F]/30",
          },
          {
            label: "Total Orders",
            value: orders.length,
            icon: ShoppingBag,
            color: "text-amber-700",
            bg: "bg-amber-50",
            border: "border-amber-200",
          },
          {
            label: "Pending",
            value: stats.pendingCount,
            icon: Clock,
            color: "text-orange-600",
            bg: "bg-orange-50",
            border: "border-orange-200",
          },
          {
            label: "Delivered",
            value: stats.deliveredCount,
            icon: CheckCircle2,
            color: "text-emerald-700",
            bg: "bg-emerald-50",
            border: "border-emerald-200",
          },
          {
            label: "Cancelled",
            value: stats.cancelledCount,
            icon: XCircle,
            color: "text-rose-700",
            bg: "bg-rose-50",
            border: "border-rose-200",
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
            <p className="text-[20px] font-bold text-[#1A0302]">{s.value}</p>
            <p className="text-[11px] text-stone-400 mt-0.5 font-medium">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Order Analytics Section ─────────────────────── */}
      <div>
        <h2 className="text-lg font-serif font-bold text-[#1A0302] mb-4">
          Order & Product Activity
        </h2>
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
          {/* ── Recent Orders ─────────────────────────────── */}
          <div className="xl:col-span-3 bg-white rounded-2xl border border-[#E1B76F]/25 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h3 className="text-[15px] font-serif font-bold text-[#1A0302]">
                Recent Orders
              </h3>
              <Link
                href="/admin/orders"
                className="flex items-center gap-1 text-[12px] text-[#400604] hover:text-[#E1B76F] font-semibold transition"
              >
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Table header */}
            <div className="hidden md:grid grid-cols-[120px_1fr_1fr] gap-3 px-5 py-3 bg-[#FDFBF7] text-[11px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100">
              <span>Order No & Date</span>
              <span>Customer Info</span>
              <span>Product Info</span>
            </div>

            <div className="divide-y divide-stone-100">
              {recentOrders.length === 0 ? (
                <p className="text-center py-12 text-stone-400 text-sm">
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
                      className="grid grid-cols-1 md:grid-cols-[120px_1fr_1fr] gap-3 px-5 py-3.5 hover:bg-stone-50/60 transition items-center"
                    >
                      {/* Order # & Date */}
                      <div>
                        <p className="text-[13px] font-bold text-[#400604]">
                          #{order.number || order.id}
                        </p>
                        <p className="text-[11px] text-stone-400">
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
                            <Users className="h-3 w-3 text-stone-400" />
                            <span className="text-[12px] font-semibold text-stone-800">
                              {name}
                            </span>
                          </div>
                          {order.billing?.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3 w-3 text-stone-400" />
                              <span className="text-[11px] text-stone-500 font-mono">
                                {order.billing.phone}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Product */}
                      <div className="flex items-center gap-2 min-w-0">
                        {thumb && (
                          <div className="h-9 w-9 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200">
                            <Image
                              src={thumb}
                              alt={productName}
                              width={36}
                              height={36}
                              className="object-cover w-full h-full"
                            />
                          </div>
                        )}
                        <p className="text-[12px] text-stone-700 truncate">
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
          <div className="xl:col-span-2 bg-white rounded-2xl border border-[#E1B76F]/25 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h3 className="text-[15px] font-serif font-bold text-[#1A0302]">
                Top Selling
              </h3>
              <Link
                href="/admin/products"
                className="flex items-center gap-1 text-[12px] text-[#400604] hover:text-[#E1B76F] font-semibold transition"
              >
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Table header */}
            <div className="hidden md:flex items-center justify-between px-5 py-3 bg-[#FDFBF7] text-[11px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100">
              <span>Product Info</span>
              <span>Total Sold</span>
            </div>

            <div className="divide-y divide-stone-100">
              {topProducts.length === 0 ? (
                <p className="text-center py-12 text-stone-400 text-sm">
                  No products yet
                </p>
              ) : (
                topProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50/60 transition"
                  >
                    <div className="h-10 w-10 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200">
                      {p.images?.[0]?.src ? (
                        <Image
                          src={p.images[0].src}
                          alt={p.name}
                          width={40}
                          height={40}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-stone-400 text-[10px]">
                          {p.name?.charAt(0) || "P"}
                        </div>
                      )}
                    </div>
                    <p className="text-[12px] font-medium text-stone-700 flex-1 truncate">
                      {p.name}
                    </p>
                    <span className="flex-shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-full bg-[#400604] text-[#E1B76F] text-[11px] font-bold">
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
      <div className="bg-white rounded-2xl border border-[#E1B76F]/25 p-6 shadow-sm">
        <h3 className="text-[15px] font-serif font-bold text-[#1A0302] mb-4">
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
            color: "from-[#400604] to-[#250302]",
          },
          {
            href: "/admin/orders",
            label: "Process Orders",
            desc: "Update status & delivery",
            color: "from-stone-800 to-stone-900",
          },
          {
            href: "/admin/products",
            label: "Manage Catalog",
            desc: "Prices, stock, measurements",
            color: "from-[#B38838] to-[#8C621E]",
          },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className={`rounded-2xl bg-gradient-to-br ${a.color} p-5 flex flex-col gap-2 hover:opacity-95 transition shadow-sm hover:shadow-md`}
          >
            <p className="text-[14px] font-serif font-bold text-white">{a.label}</p>
            <p className="text-[12px] text-white/80">{a.desc}</p>
            <ArrowUpRight className="h-4 w-4 text-[#E1B76F] self-end mt-auto" />
          </Link>
        ))}
      </div>
    </div>
  );
}
