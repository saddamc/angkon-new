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
  id: number;
  name: string;
  quantity: number;
  total: string;
  image?: { src: string };
  meta_data: { key: string; value: string }[];
}

interface WCOrder {
  id: number;
  number: string;
  status: string;
  date_created: string;
  total: string;
  discount_total: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address_1: string;
    city: string;
    postcode: string;
  };
  customer_note: string;
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
  { key: "pending", label: "Pending", icon: Clock, color: "amber", desc: "Awaiting payment or confirmation" },
  { key: "processing", label: "Confirmed", icon: CheckCircle2, color: "blue", desc: "Payment received, preparing order" },
  { key: "on-hold", label: "On Hold", icon: Pause, color: "yellow", desc: "Waiting for admin action" },
  { key: "completed", label: "Delivered", icon: Truck, color: "emerald", desc: "Order fulfilled and delivered" },
  { key: "cancelled", label: "Cancelled", icon: XCircle, color: "red", desc: "Order was cancelled" },
  { key: "refunded", label: "Refunded", icon: RotateCcw, color: "gray", desc: "Payment returned to customer" },
];

const STATUS_MODAL_COLORS: Record<string, string> = {
  amber: "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100",
  blue: "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100",
  yellow: "border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100",
  emerald: "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  red: "border-red-300 bg-red-50 text-red-700 hover:bg-red-100",
  gray: "border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100",
};
const STATUS_ACTIVE_COLORS: Record<string, string> = {
  amber: "border-amber-500 bg-amber-100 text-amber-800 ring-2 ring-amber-300",
  blue: "border-blue-500 bg-blue-100 text-blue-800 ring-2 ring-blue-300",
  yellow: "border-yellow-500 bg-yellow-100 text-yellow-800 ring-2 ring-yellow-300",
  emerald: "border-emerald-500 bg-emerald-100 text-emerald-800 ring-2 ring-emerald-300",
  red: "border-red-500 bg-red-100 text-red-800 ring-2 ring-red-300",
  gray: "border-gray-500 bg-gray-100 text-gray-800 ring-2 ring-gray-300",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  "on-hold": "bg-yellow-50 text-yellow-700 border-yellow-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-gray-50 text-gray-700 border-gray-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
  "checkout-draft": "bg-gray-50 text-gray-500 border-gray-200",
};

/* Final statuses — once set, cannot be changed */
const FINAL_STATUSES = ["completed", "cancelled", "refunded"];

function formatBDT(amount: string | number) {
  return `৳ ${Number(amount).toLocaleString("en-BD", {
    minimumFractionDigits: 0,
  })}`;
}

const REFRESH_INTERVAL = 30_000;

/* ─── Page ────────────────────────────────────────────────────────── */
export default function AdminOrdersPage() {
  const { authFetch } = useAuth();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") ?? "any";

  const [orders, setOrders] = useState<WCOrder[]>([]);
  const [allOrders, setAllOrders] = useState<WCOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusModal, setStatusModal] = useState<WCOrder | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [warningModal, setWarningModal] = useState<{ orderId: number; status: string; orderNumber: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(
    async (status = "any", showLoader = true) => {
      if (showLoader) setLoading(true);
      try {
        const params = new URLSearchParams({ per_page: "100", status });
        const res = await authFetch(`/api/admin/orders?${params}`);
        if (res.ok) {
          const data = await res.json();
          const orderList = Array.isArray(data) ? data : data.orders ?? [];
          setOrders(orderList);
          if (status === "any") setAllOrders(orderList);
        }
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [authFetch]
  );

  // Also load all orders for counts
  const loadAllCounts = useCallback(async () => {
    const res = await authFetch("/api/admin/orders?per_page=100&status=any");
    if (res.ok) {
      const data = await res.json();
      setAllOrders(Array.isArray(data) ? data : data.orders ?? []);
    }
  }, [authFetch]);

  useEffect(() => {
    void load(initialStatus);
    void loadAllCounts();
  }, [load, loadAllCounts, initialStatus]);

  // Auto-refresh every 30 seconds to pick up new WP orders
  useEffect(() => {
    const timer = setInterval(() => {
      void load(filterStatus, false); // silent refresh (no loading spinner)
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

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    setUpdating(orderId);
    try {
      const res = await authFetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated: WCOrder = await res.json();
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, status: updated.status } : o
          )
        );
        setAllOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, status: updated.status } : o
          )
        );
        if (statusModal?.id === orderId) {
          setStatusModal((prev) => prev ? { ...prev, status: updated.status } : null);
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

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
    void load(status);
  };

  // Filtered by search
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter((o) => {
      const name =
        `${o.billing.first_name} ${o.billing.last_name}`.toLowerCase();
      return (
        name.includes(q) ||
        o.number.includes(q) ||
        o.billing.phone?.includes(q) ||
        o.billing.email?.toLowerCase().includes(q)
      );
    });
  }, [orders, searchQuery]);

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Orders</h1>
            <p className="text-[12px] text-gray-400">
              Order List — auto-refreshes every 30s
            </p>
          </div>
        </div>
      </div>

      {/* ── Status Filter Pills ────────────────────────── */}
      <div className="bg-white rounded-2xl border border-purple-100/60 p-4 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
          Order
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
                    ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200"
                    : "bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600"
                }`}
              >
                {f.label}
                <span
                  className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full text-[10px] font-bold px-1 ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-purple-100 text-purple-600"
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition w-52"
            />
          </div>
          <button
            onClick={() => load(filterStatus)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] text-gray-500 hover:text-purple-600 hover:border-purple-300 transition"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* ── Orders Table ───────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-purple-100/60 overflow-hidden shadow-sm">
        {/* Table header */}
        <div className="hidden lg:grid grid-cols-[50px_100px_1fr_1fr_100px_110px_100px_100px] gap-2 px-5 py-3 bg-purple-50/70 text-[10px] font-bold uppercase tracking-widest text-purple-500">
          <span>SL</span>
          <span>Order No & Date</span>
          <span>Customer Info</span>
          <span>Product Info</span>
          <span>Discount</span>
          <span>Total Price</span>
          <span>Due</span>
          <span>Status</span>
        </div>

        {loading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-purple-50/50 animate-pulse"
              />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <p className="text-center py-24 text-gray-400 text-sm">
            No orders found.
          </p>
        ) : (
          <div className="divide-y divide-purple-50">
            {filteredOrders.map((order, idx) => {
              const custName =
                `${order.billing.first_name} ${order.billing.last_name}`.trim();
              const statusColor =
                STATUS_BADGE[order.status] ??
                "bg-gray-50 text-gray-600 border-gray-200";
              const productName = order.line_items[0]?.name ?? "—";
              const productPrice = order.line_items[0]?.total ?? "0";
              const productQty = order.line_items.reduce(
                (sum, li) => sum + li.quantity,
                0
              );
              const thumb = order.line_items[0]?.image?.src;

              return (
                <div key={order.id} className="group">
                  {/* Summary row */}
                  <div
                    className="w-full grid grid-cols-[auto_1fr] lg:grid-cols-[50px_100px_1fr_1fr_100px_110px_100px_100px] items-center gap-2 px-5 py-3.5 text-left hover:bg-purple-50/30 transition"
                  >
                    {/* SL */}
                    <span className="hidden lg:block text-[12px] text-purple-500 font-bold">
                      {idx + 1}
                    </span>

                    {/* Order No & Date */}
                    <div>
                      <p className="text-[12px] font-bold text-purple-600">
                        #{order.number}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(order.date_created).toLocaleDateString(
                          "en-GB",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                          }
                        )}
                      </p>
                      <p className="text-[10px] text-gray-400">Website</p>
                    </div>

                    {/* Customer Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <span className="text-[12px] font-semibold text-gray-700 truncate">
                          {custName || "Guest"}
                        </span>
                      </div>
                      {order.billing.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span className="text-[11px] text-gray-500">
                            {order.billing.phone}
                          </span>
                        </div>
                      )}
                      {order.billing.address_1 && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span className="text-[10px] text-gray-400 truncate">
                            {order.billing.address_1}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="hidden lg:flex items-center gap-2 min-w-0">
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
                      <div className="min-w-0">
                        <p className="text-[12px] text-gray-600 truncate">
                          {productName}
                        </p>
                        <p className="text-[11px] text-purple-500 font-semibold">
                          ৳ {Number(productPrice).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Quantity: {productQty}
                        </p>
                      </div>
                    </div>

                    {/* Discount */}
                    <span className="hidden lg:block text-[12px] text-gray-500">
                      ৳ {Number(order.discount_total ?? 0).toLocaleString()}
                    </span>

                    {/* Total Price */}
                    <span className="hidden lg:block text-[13px] font-bold text-gray-700">
                      ৳ {Number(order.total).toLocaleString()}
                    </span>

                    {/* Due */}
                    <span className="hidden lg:block text-[13px] font-bold text-gray-700">
                      ৳ {Number(order.total).toLocaleString()}
                    </span>

                    {/* Status — click to open modal (locked if final) */}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!FINAL_STATUSES.includes(order.status)) {
                          setSelectedStatus(null);
                          setStatusModal(order);
                        }
                      }}
                      className={`hidden lg:inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold capitalize transition ${FINAL_STATUSES.includes(order.status) ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'} ${statusColor}`}
                      title={FINAL_STATUSES.includes(order.status) ? `Status is locked (${order.status})` : 'Click to change status'}
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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setStatusModal(null); setSelectedStatus(null); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-purple-100 w-full max-w-lg overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-purple-50 bg-purple-50/30">
              <div>
                <h3 className="text-[16px] font-bold text-gray-800">Update Order Status</h3>
                <p className="text-[12px] text-gray-400">Order #{statusModal.number} · {`${statusModal.billing.first_name} ${statusModal.billing.last_name}`.trim() || 'Guest'}</p>
              </div>
              <button onClick={() => { setStatusModal(null); setSelectedStatus(null); }} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Status options — select, don't apply immediately */}
            <div className="p-6 space-y-2">
              {STATUS_OPTIONS.map((s) => {
                const isCurrent = statusModal.status === s.key;
                const isSelected = selectedStatus === s.key;
                const colorClass = (isCurrent || isSelected) ? STATUS_ACTIVE_COLORS[s.color] : STATUS_MODAL_COLORS[s.color];
                return (
                  <button
                    key={s.key}
                    disabled={isCurrent}
                    onClick={() => setSelectedStatus(s.key)}
                    className={`w-full flex items-center gap-4 rounded-xl border-2 px-4 py-3.5 text-left transition-all duration-200 disabled:opacity-50 ${colorClass}`}
                  >
                    <div className="h-10 w-10 rounded-xl bg-white/60 flex items-center justify-center flex-shrink-0">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold">{s.label}</p>
                      <p className="text-[11px] opacity-70">{s.desc}</p>
                    </div>
                    {isCurrent && <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Current</span>}
                    {isSelected && !isCurrent && <span className="text-[10px] font-bold uppercase tracking-wider">✓ Selected</span>}
                  </button>
                );
              })}
            </div>

            {/* Modal footer with Confirm */}
            <div className="px-6 py-4 border-t border-purple-50 bg-gray-50/50 flex items-center justify-between">
              <button onClick={() => { setStatusModal(null); setSelectedStatus(null); }} className="px-4 py-2.5 rounded-xl text-[13px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition">
                Cancel
              </button>
              <button
                disabled={!selectedStatus || selectedStatus === statusModal.status || updating === statusModal.id}
                onClick={() => {
                  if (!selectedStatus) return;
                  if (FINAL_STATUSES.includes(selectedStatus)) {
                    setWarningModal({ orderId: statusModal.id, status: selectedStatus, orderNumber: statusModal.number });
                  } else {
                    void handleStatusChange(statusModal.id, selectedStatus);
                  }
                }}
                className="px-6 py-2.5 rounded-xl text-[13px] font-bold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-md shadow-purple-200 flex items-center gap-2"
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setWarningModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-red-200 w-full max-w-md overflow-hidden">
            <div className="p-6 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-[18px] font-bold text-gray-800 mb-2">⚠️ Warning: Final Status</h3>
              <p className="text-[13px] text-gray-500 mb-1">
                You are about to change Order <strong>#{warningModal.orderNumber}</strong> to:
              </p>
              <p className="text-[16px] font-bold capitalize mb-4" style={{color: warningModal.status === 'completed' ? '#059669' : warningModal.status === 'cancelled' ? '#dc2626' : '#6b7280'}}>
                {warningModal.status.replace('-',' ')}
              </p>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
                <p className="text-[12px] text-red-600 font-medium">
                  🔒 This action is <strong>permanent</strong>. Once set to {warningModal.status.replace('-',' ')}, the status <strong>cannot be changed</strong> again.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setWarningModal(null)}
                  className="flex-1 px-4 py-3 rounded-xl text-[13px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
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
                  className="flex-1 px-4 py-3 rounded-xl text-[13px] font-bold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 transition shadow-md flex items-center justify-center gap-2"
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
        <div className="fixed bottom-6 right-6 z-[400] animate-[slideUp_0.3s_ease-out]">
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}>
            {toast.type === "success"
              ? <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
              : <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            }
            <p className="text-[13px] font-medium">{toast.message}</p>
            <button onClick={() => setToast(null)} className="ml-2 p-1 rounded-lg hover:bg-black/5 transition">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
