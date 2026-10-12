"use client";

import Image from "next/image";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSearchParams } from "next/navigation";
import {
  RefreshCw,
  Search,
  ShoppingCart,
  Phone,
  Mail,
  MapPin,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  RotateCcw,
  Pause,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────────────────── */
interface WCLineItem {
  id?: number | string;
  name: string;
  quantity: number;
  price?: string | number;
  total?: string | number;
  image?: { src: string };
  meta_data?: { key: string; value: string }[];
}

interface WCOrder {
  id: string | number;
  number: string;
  status: string;
  payment_status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  date_created: string;
  total: string;
  discount_total?: string;
  shipping_total?: string;
  payment_method_title?: string;
  billing: {
    first_name: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address_1?: string;
    city?: string;
    postcode?: string;
  };
  customer_note?: string;
  line_items: WCLineItem[];
}

/* ─── Constants ───────────────────────────────────────────────────── */
const STATUS_FILTERS = [
  { key: "any", label: "All", icon: ShoppingCart },
  { key: "pending", label: "Pending", icon: Clock },
  { key: "processing", label: "Confirmed", icon: CheckCircle2 },
  { key: "on-hold", label: "On Hold", icon: Pause },
  { key: "completed", label: "Delivered", icon: Truck },
  { key: "cancelled", label: "Cancelled", icon: XCircle },
  { key: "refunded", label: "Returned", icon: RotateCcw },
  { key: "failed", label: "Failed", icon: XCircle },
];

const STATUS_OPTIONS = [
  { key: "pending", label: "Pending", icon: Clock, color: "amber", desc: "Awaiting verification or confirmation" },
  { key: "processing", label: "Confirmed", icon: CheckCircle2, color: "blue", desc: "Confirmed, preparing order" },
  { key: "on-hold", label: "On Hold", icon: Pause, color: "yellow", desc: "Waiting for customer/admin action" },
  { key: "completed", label: "Delivered", icon: Truck, color: "emerald", desc: "Order fulfilled and delivered" },
  { key: "cancelled", label: "Cancelled", icon: XCircle, color: "red", desc: "Order was cancelled" },
  { key: "refunded", label: "Refunded", icon: RotateCcw, color: "gray", desc: "Payment returned to customer" },
];

const STATUS_MODAL_COLORS: Record<string, string> = {
  amber: "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100",
  blue: "border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100",
  yellow: "border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-100",
  emerald: "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  red: "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100",
  gray: "border-stone-300 bg-stone-50 text-stone-800 hover:bg-stone-100",
};

const STATUS_ACTIVE_COLORS: Record<string, string> = {
  amber: "border-amber-500 bg-amber-100 text-amber-900 ring-2 ring-amber-300",
  blue: "border-blue-500 bg-blue-100 text-blue-900 ring-2 ring-blue-300",
  yellow: "border-yellow-500 bg-yellow-100 text-yellow-900 ring-2 ring-yellow-300",
  emerald: "border-emerald-500 bg-emerald-100 text-emerald-900 ring-2 ring-emerald-300",
  red: "border-rose-500 bg-rose-100 text-rose-900 ring-2 ring-rose-300",
  gray: "border-stone-500 bg-stone-200 text-stone-900 ring-2 ring-stone-300",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  processing: "bg-blue-50 text-blue-800 border-blue-200",
  "on-hold": "bg-yellow-50 text-yellow-800 border-yellow-200",
  completed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-800 border-rose-200",
  refunded: "bg-stone-100 text-stone-700 border-stone-200",
  failed: "bg-rose-50 text-rose-800 border-rose-200",
  "checkout-draft": "bg-stone-50 text-stone-500 border-stone-200",
};

/* Final statuses — once set, locked */
const FINAL_STATUSES = ["completed", "cancelled", "refunded"];

function formatBDT(amount: string | number) {
  return `৳ ${Number(amount || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 0,
  })}`;
}

const REFRESH_INTERVAL = 30_000;

/* ─── Client Cache for Instant Tab Switching ──────────────────────── */
let cachedOrdersAll: WCOrder[] | null = null;
let cachedOrdersFiltered: WCOrder[] | null = null;

/* ─── Page ────────────────────────────────────────────────────────── */
export default function AdminOrdersPage() {
  const { authFetch } = useAuth();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") ?? "any";

  const [orders, setOrders] = useState<WCOrder[]>(cachedOrdersFiltered || cachedOrdersAll || []);
  const [allOrders, setAllOrders] = useState<WCOrder[]>(cachedOrdersAll || []);
  const [loading, setLoading] = useState(!cachedOrdersAll);
  const [updating, setUpdating] = useState<string | number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>(initialStatus);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & toasts
  const [statusModal, setStatusModal] = useState<WCOrder | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [warningModal, setWarningModal] = useState<{
    orderId: string | number;
    status: string;
    orderNumber: string;
  } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(
    async (status = "any", showSpinner = !cachedOrdersAll) => {
      if (showSpinner) setLoading(true);
      try {
        const query = status && status !== "any" ? `?status=${status}&per_page=100` : "?per_page=100";
        const res = await authFetch(`/api/admin/orders${query}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.orders ?? [];
          cachedOrdersFiltered = list;
          setOrders(list);
        }
      } catch (err) {
        console.error("Failed to load orders:", err);
      } finally {
        setLoading(false);
      }
    },
    [authFetch]
  );

  const loadAllCounts = useCallback(async () => {
    try {
      const res = await authFetch("/api/admin/orders?per_page=200&status=any");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.orders ?? [];
        cachedOrdersAll = list;
        setAllOrders(list);
      }
    } catch {
      // ignore
    }
  }, [authFetch]);

  useEffect(() => {
    void load(initialStatus);
    void loadAllCounts();
  }, [load, loadAllCounts, initialStatus]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      void load(filterStatus, false);
      void loadAllCounts();
    }, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [load, loadAllCounts, filterStatus]);

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = { any: allOrders.length };
    allOrders.forEach((o) => {
      map[o.status] = (map[o.status] ?? 0) + 1;
    });
    return map;
  }, [allOrders]);

  const handleStatusChange = async (orderId: string | number, newStatus: string) => {
    setUpdating(orderId);
    try {
      const res = await authFetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        const isCompleted = newStatus === "completed";
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId || o.number === String(orderId)
              ? {
                  ...o,
                  status: newStatus,
                  payment_status: isCompleted ? "paid" : o.payment_status,
                  paymentStatus: isCompleted ? "paid" : o.paymentStatus,
                }
              : o
          )
        );
        setAllOrders((prev) =>
          prev.map((o) =>
            o.id === orderId || o.number === String(orderId)
              ? {
                  ...o,
                  status: newStatus,
                  payment_status: isCompleted ? "paid" : o.payment_status,
                  paymentStatus: isCompleted ? "paid" : o.paymentStatus,
                }
              : o
          )
        );
        if (statusModal?.id === orderId) {
          setStatusModal((prev) =>
            prev
              ? {
                  ...prev,
                  status: newStatus,
                  payment_status: isCompleted ? "paid" : prev.payment_status,
                  paymentStatus: isCompleted ? "paid" : prev.paymentStatus,
                }
              : null
          );
        }
        showToast(`Order #${orderId} status changed to ${newStatus.replace("-", " ")}`, "success");
      } else {
        showToast(`Failed to update order #${orderId}`, "error");
      }
    } catch {
      showToast("Network error — please try again", "error");
    }
    setUpdating(null);
  };

  const handleTogglePayment = async (orderId: string | number, currentPaymentStatus?: string) => {
    const isPaid = currentPaymentStatus === "paid";
    const nextStatus = isPaid ? "pending" : "paid";
    setUpdating(orderId);
    try {
      const res = await authFetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ paymentStatus: nextStatus }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId || o.number === String(orderId)
              ? { ...o, payment_status: nextStatus, paymentStatus: nextStatus }
              : o
          )
        );
        setAllOrders((prev) =>
          prev.map((o) =>
            o.id === orderId || o.number === String(orderId)
              ? { ...o, payment_status: nextStatus, paymentStatus: nextStatus }
              : o
          )
        );
        showToast(`Order #${orderId} payment marked as ${nextStatus.toUpperCase()}`, "success");
      } else {
        showToast("Failed to update payment status", "error");
      }
    } catch {
      showToast("Network error — please try again", "error");
    } finally {
      setUpdating(null);
    }
  };

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
    void load(status);
  };

  // Filtered by search
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter((o) => {
      const name = `${o.billing?.first_name || ""} ${o.billing?.last_name || ""}`.toLowerCase();
      return (
        name.includes(q) ||
        String(o.number || o.id).includes(q) ||
        o.billing?.phone?.includes(q) ||
        o.billing?.email?.toLowerCase().includes(q)
      );
    });
  }, [orders, searchQuery]);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#400604]/10 border border-[#E1B76F]/30 flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-[#400604]" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-[#1A0302]">Orders Processing</h1>
          </div>
        </div>
      </div>

      {/* ── Status Filter Pills ────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#E1B76F]/25 p-4 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-3">
          Filter by Status
        </p>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => {
            const count = statusCounts[f.key] ?? 0;
            const active = filterStatus === f.key;
            return (
              <button
                key={f.key}
                onClick={() => handleFilterChange(f.key)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-200 border ${
                  active
                    ? "bg-[#400604] text-white border-[#400604] shadow-sm"
                    : "bg-white text-stone-600 border-stone-200 hover:border-[#E1B76F] hover:text-[#400604]"
                }`}
              >
                {f.label}
                <span
                  className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full text-[10px] font-bold px-1 ${
                    active
                      ? "bg-white/20 text-[#E1B76F]"
                      : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Actions bar ────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div />
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search by order #, phone, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border border-stone-200 bg-white pl-10 pr-4 py-2.5 text-[13px] text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#400604] focus:ring-1 focus:ring-[#400604]/20 transition w-64"
            />
          </div>
          <button
            onClick={() => load(filterStatus)}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[13px] text-stone-600 hover:text-[#400604] hover:border-[#400604] transition"
            title="Refresh Orders"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* ── Orders Table ───────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#E1B76F]/25 overflow-hidden shadow-sm">
        {/* Table header */}
        <div className="hidden lg:grid grid-cols-[45px_150px_minmax(190px,1.4fr)_minmax(180px,1.2fr)_120px_100px_90px_105px] gap-3 px-5 py-3.5 bg-[#FDFBF7] text-[10px] font-bold uppercase tracking-widest text-[#400604] border-b border-stone-100 items-center">
          <span>SL</span>
          <span>Order No & Date</span>
          <span>Customer Info</span>
          <span>Product Info</span>
          <span>Payment</span>
          <span>Total</span>
          <span>Due</span>
          <span>Status</span>
        </div>

        {loading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-stone-100/60 animate-pulse"
              />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <p className="text-center py-24 text-stone-400 text-sm">
            No orders found.
          </p>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredOrders.map((order, idx) => {
              const custName =
                `${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim() ||
                "Guest";
              const statusColor =
                STATUS_BADGE[order.status] ??
                "bg-stone-50 text-stone-600 border-stone-200";
              const firstItem = order.line_items?.[0];
              const productName = firstItem?.name ?? "—";
              const productQty = (order.line_items || []).reduce(
                (sum, li) => sum + (li.quantity || 1),
                0
              );
              const thumb = firstItem?.image?.src;
              const isPaid =
                order.payment_status === "paid" ||
                order.paymentStatus === "paid" ||
                order.status === "completed";
              const isCancelled =
                order.status === "cancelled" || order.status === "failed";

              return (
                <div key={order.id} className="group">
                  {/* Summary row */}
                  <div
                    className="w-full grid grid-cols-[auto_1fr] lg:grid-cols-[45px_150px_minmax(190px,1.4fr)_minmax(180px,1.2fr)_120px_100px_90px_105px] items-center gap-3 px-5 py-4 text-left hover:bg-stone-50/70 transition"
                  >
                    {/* SL */}
                    <span className="hidden lg:block text-[12px] text-stone-400 font-bold">
                      {idx + 1}
                    </span>

                    {/* Order No & Date */}
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-[#400604] whitespace-nowrap font-mono tracking-tight">
                        #{order.number || order.id}
                      </p>
                      <p className="text-[10px] text-stone-400">
                        {order.date_created
                          ? new Date(order.date_created).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </p>
                      <span className="inline-block mt-0.5 text-[9px] font-bold uppercase tracking-wider text-[#E1B76F] bg-[#400604]/5 px-1.5 py-0.2 rounded border border-[#E1B76F]/20">
                        Online
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3 w-3 text-stone-400 flex-shrink-0" />
                        <span className="text-[12px] font-semibold text-stone-800 truncate">
                          {custName}
                        </span>
                      </div>
                      {order.billing?.email && (
                        <div className="flex items-center gap-1.5 min-w-0" title={order.billing.email}>
                          <Mail className="h-3 w-3 text-stone-400 flex-shrink-0" />
                          <span className="text-[11px] text-stone-500 truncate hover:text-[#400604] transition select-all">
                            {order.billing.email}
                          </span>
                        </div>
                      )}
                      {order.billing?.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-stone-400 flex-shrink-0" />
                          <span className="text-[11px] text-stone-500 font-mono">
                            {order.billing.phone}
                          </span>
                        </div>
                      )}
                      {order.billing?.address_1 && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-stone-400 flex-shrink-0" />
                          <span className="text-[10px] text-stone-400 truncate">
                            {order.billing.address_1}
                          </span>
                        </div>
                      )}
                      {/* Mobile Row Info */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap lg:hidden">
                        <span className="text-[11px] font-bold text-[#1A0302]">
                          {formatBDT(order.total)}
                        </span>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!FINAL_STATUSES.includes(order.status)) {
                              setSelectedStatus(null);
                              setStatusModal(order);
                            }
                          }}
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold capitalize ${statusColor}`}
                        >
                          {order.status.replace("-", " ")}
                        </span>
                        {isCancelled ? (
                          <span className="text-[9px] font-medium text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                            Void
                          </span>
                        ) : isPaid ? (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            ✓ Paid
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            ⏳ Unpaid
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="hidden lg:flex items-center gap-2.5 min-w-0">
                      {thumb ? (
                        <div className="h-10 w-10 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200">
                          <Image
                            src={thumb}
                            alt={productName}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-stone-100 flex-shrink-0 border border-stone-200 flex items-center justify-center text-stone-300">
                          <ShoppingCart className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-stone-700 truncate" title={productName}>
                          {productName}
                        </p>
                        <p className="text-[10px] text-stone-400">
                          Qty: {productQty}
                        </p>
                      </div>
                    </div>

                    {/* Payment & Collection Status */}
                    <div className="hidden lg:flex flex-col items-start gap-1">
                      <span
                        className="text-[11px] font-medium text-stone-600 truncate max-w-[110px]"
                        title={order.payment_method_title || order.paymentMethod || "COD"}
                      >
                        {order.payment_method_title || order.paymentMethod || "COD"}
                      </span>
                      {isCancelled ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium bg-stone-100 text-stone-500 border border-stone-200">
                          Void
                        </span>
                      ) : isPaid ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleTogglePayment(order.id, "paid");
                          }}
                          disabled={updating === order.id}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition shadow-xs cursor-pointer"
                          title="Payment received. Click to switch to Unpaid."
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Paid
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleTogglePayment(order.id, "pending");
                          }}
                          disabled={updating === order.id}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition shadow-xs cursor-pointer"
                          title="Pending collection / COD. Click to mark Paid."
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Unpaid
                        </button>
                      )}
                    </div>

                    {/* Total Price */}
                    <span className="hidden lg:block text-[13px] font-bold text-[#1A0302]">
                      {formatBDT(order.total)}
                    </span>

                    {/* Due */}
                    <div className="hidden lg:block">
                      {isCancelled ? (
                        <span className="text-[11px] font-medium text-stone-400">Void</span>
                      ) : isPaid ? (
                        <span className="text-[12px] font-bold text-emerald-600">৳ 0</span>
                      ) : (
                        <span className="text-[13px] font-bold text-[#400604]">
                          {formatBDT(order.total)}
                        </span>
                      )}
                    </div>

                    {/* Status Button */}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!FINAL_STATUSES.includes(order.status)) {
                          setSelectedStatus(null);
                          setStatusModal(order);
                        }
                      }}
                      className={`hidden lg:inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[10px] font-bold capitalize transition ${
                        FINAL_STATUSES.includes(order.status)
                          ? "opacity-75 cursor-not-allowed"
                          : "cursor-pointer hover:shadow-sm"
                      } ${statusColor}`}
                      title={
                        FINAL_STATUSES.includes(order.status)
                          ? `Status is locked (${order.status})`
                          : "Click to change status"
                      }
                    >
                      {order.status.replace("-", " ")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Status Change Modal ──────────────────────── */}
      {statusModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setStatusModal(null);
              setSelectedStatus(null);
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-lg overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-[#FDFBF7]">
              <div>
                <h3 className="text-[16px] font-serif font-bold text-[#1A0302]">Update Order Status</h3>
                <p className="text-[12px] text-stone-500">
                  Order #{statusModal.number || statusModal.id} · {statusModal.billing?.first_name || "Guest"}
                </p>
              </div>
              <button
                onClick={() => {
                  setStatusModal(null);
                  setSelectedStatus(null);
                }}
                className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Status options */}
            <div className="p-6 space-y-2">
              {STATUS_OPTIONS.map((s) => {
                const isCurrent = statusModal.status === s.key;
                const isSelected = selectedStatus === s.key;
                const colorClass = isCurrent || isSelected
                  ? STATUS_ACTIVE_COLORS[s.color]
                  : STATUS_MODAL_COLORS[s.color];
                return (
                  <button
                    key={s.key}
                    disabled={isCurrent}
                    onClick={() => setSelectedStatus(s.key)}
                    className={`w-full flex items-center gap-4 rounded-xl border-2 px-4 py-3.5 text-left transition-all duration-200 disabled:opacity-50 ${colorClass}`}
                  >
                    <div className="h-10 w-10 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold">{s.label}</p>
                      <p className="text-[11px] opacity-75">{s.desc}</p>
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                        Current
                      </span>
                    )}
                    {isSelected && !isCurrent && (
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        ✓ Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Modal footer with Confirm */}
            <div className="px-6 py-4 border-t border-stone-100 bg-[#FDFBF7] flex items-center justify-between">
              <button
                onClick={() => {
                  setStatusModal(null);
                  setSelectedStatus(null);
                }}
                className="px-4 py-2.5 rounded-xl text-[13px] font-medium text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition"
              >
                Cancel
              </button>
              <button
                disabled={!selectedStatus || selectedStatus === statusModal.status || updating === statusModal.id}
                onClick={() => {
                  if (!selectedStatus) return;
                  if (FINAL_STATUSES.includes(selectedStatus)) {
                    setWarningModal({
                      orderId: statusModal.id,
                      status: selectedStatus,
                      orderNumber: String(statusModal.number || statusModal.id),
                    });
                  } else {
                    void handleStatusChange(statusModal.id, selectedStatus);
                  }
                }}
                className="px-6 py-2.5 rounded-xl text-[13px] font-bold text-white bg-[#400604] hover:bg-[#250302] disabled:opacity-40 disabled:cursor-not-allowed transition shadow-md flex items-center gap-2"
              >
                {updating === statusModal.id && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Status Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Warning Modal for Final Statuses ────────── */}
      {warningModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setWarningModal(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-rose-200 w-full max-w-md overflow-hidden">
            <div className="p-6 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-rose-100 flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-rose-600" />
              </div>
              <h3 className="text-[18px] font-serif font-bold text-stone-900 mb-2">
                Permanent Status Warning
              </h3>
              <p className="text-[13px] text-stone-600 mb-1">
                You are about to change Order <strong>#{warningModal.orderNumber}</strong> to:
              </p>
              <p
                className="text-[16px] font-bold capitalize mb-4"
                style={{
                  color:
                    warningModal.status === "completed"
                      ? "#059669"
                      : warningModal.status === "cancelled"
                      ? "#dc2626"
                      : "#4b5563",
                }}
              >
                {warningModal.status.replace("-", " ")}
              </p>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-5">
                <p className="text-[12px] text-rose-700 font-medium">
                  🔒 This action is permanent. Once set to {warningModal.status.replace("-", " ")}, the status cannot be reverted.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setWarningModal(null)}
                  className="flex-1 px-4 py-3 rounded-xl text-[13px] font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 transition"
                >
                  Go Back
                </button>
                <button
                  disabled={updating === warningModal.orderId}
                  onClick={async () => {
                    await handleStatusChange(warningModal.orderId, warningModal.status);
                    setWarningModal(null);
                    setStatusModal(null);
                    setSelectedStatus(null);
                  }}
                  className="flex-1 px-4 py-3 rounded-xl text-[13px] font-bold text-white bg-[#400604] hover:bg-[#250302] disabled:opacity-50 transition shadow-md flex items-center justify-center gap-2"
                >
                  {updating === warningModal.orderId && <Loader2 className="h-4 w-4 animate-spin" />}
                  Yes, Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[400]">
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
            )}
            <p className="text-[13px] font-medium">{toast.message}</p>
            <button onClick={() => setToast(null)} className="ml-2 p-1 rounded-lg hover:bg-black/5 transition">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
