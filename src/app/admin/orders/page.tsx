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
  ClipboardList,
  Banknote,
  Copy,
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────────────────── */
interface WCLineItem {
  id?: number | string;
  name: string;
  quantity: number;
  price?: string | number;
  total?: string | number;
  size?: string;
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
// Permanently locked statuses. `completed` is deliberately NOT here: a
// delivery recorded by mistake must be correctable, so it can be reopened.
const FINAL_STATUSES = ["cancelled", "refunded"];

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
    kind: "permanent" | "revert-payment";
    orderId: string | number;
    status: string;
    orderNumber: string;
    total?: string | number;
  } | null>(null);
  // Shown when the operator tries to deliver an order that is not paid.
  const [paymentModal, setPaymentModal] = useState<{
    orderId: string | number;
    orderNumber: string;
    total: string | number;
  } | null>(null);
  // Read-only detail sheet for a customer or a product line.
  const [infoModal, setInfoModal] = useState<{
    title: string;
    subtitle?: string;
    fields: { label: string; value: string; mono?: boolean }[];
  } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Escape closes the top-most dialog and background scrolling is locked while
  // either dialog is open.
  useEffect(() => {
    if (!statusModal && !warningModal && !paymentModal && !infoModal) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (infoModal) {
        setInfoModal(null);
        return;
      }
      if (paymentModal) {
        setPaymentModal(null);
        return;
      }
      if (warningModal) {
        setWarningModal(null);
        return;
      }
      setStatusModal(null);
      setSelectedStatus(null);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [statusModal, warningModal, paymentModal, infoModal]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  /** Copies a value and confirms it, falling back to an error toast if blocked. */
  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} copied`, "success");
    } catch {
      showToast("Clipboard access was blocked by the browser", "error");
    }
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

  const handleStatusChange = async (
    orderId: string | number,
    newStatus: string,
    options: { revertPayment?: boolean } = {}
  ): Promise<boolean> => {
    setUpdating(orderId);
    try {
      // Delivering records payment as collected; reverting a paid order to
      // pending can undo the payment. Both are sent explicitly so the persisted
      // state matches the optimistic update below.
      const payload: Record<string, unknown> = { status: newStatus };
      if (newStatus === "completed") payload.paymentStatus = "paid";
      if (options.revertPayment) payload.paymentStatus = "pending";

      const res = await authFetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        showToast(`Failed to update order #${orderId}`, "error");
        return false;
      }

      await res.json();

      const nextPayment =
        newStatus === "completed" ? "paid" : options.revertPayment ? "pending" : undefined;

      const apply = (o: WCOrder): WCOrder =>
        o.id === orderId || o.number === String(orderId)
          ? {
              ...o,
              status: newStatus,
              ...(nextPayment
                ? { payment_status: nextPayment, paymentStatus: nextPayment }
                : {}),
            }
          : o;

      setOrders((prev) => prev.map(apply));
      setAllOrders((prev) => prev.map(apply));
      setStatusModal((prev) => (prev ? apply(prev) : null));

      showToast(`Order #${orderId} marked ${newStatus.replace("-", " ")}`, "success");
      return true;
    } catch {
      showToast("Network error — please try again", "error");
      return false;
    } finally {
      setUpdating(null);
    }
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

  const warningIsRevert = warningModal?.kind === "revert-payment";

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-sm">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Orders Processing</h1>
          </div>
        </div>
      </div>

      {/* ── Status Filter Pills ────────────────────────── */}
      <div className="bg-white rounded-2xl border border-purple-100/60 p-4 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">
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
              placeholder="Search by order #, phone, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition w-64"
            />
          </div>
          <button
            onClick={() => load(filterStatus)}
            className="inline-flex items-center gap-2 rounded-xl border border-purple-100 bg-white px-3 py-2.5 text-[13px] text-gray-600 hover:text-purple-600 hover:border-purple-300 transition shadow-sm"
            title="Refresh Orders"
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
        <div className="hidden lg:grid grid-cols-[45px_150px_minmax(190px,1.4fr)_minmax(180px,1.2fr)_120px_100px_90px_105px] gap-3 px-5 py-3.5 bg-purple-50/70 text-[10px] font-bold uppercase tracking-widest text-purple-600 border-b border-purple-100/50 items-center">
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
                className="h-16 rounded-xl bg-purple-50/60 animate-pulse"
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
                `${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim() ||
                "Guest";
              const statusColor =
                STATUS_BADGE[order.status] ??
                "bg-gray-50 text-gray-600 border-gray-200";
              const firstItem = order.line_items?.[0];
              const productName = firstItem?.name ?? "—";
              const productQty = (order.line_items || []).reduce(
                (sum, li) => sum + (li.quantity || 1),
                0
              );
              // Distinct, non-empty sizes across every line item — so a
              // multi-item order shows "M, L" rather than only the first size.
              const productSizes = Array.from(
                new Set(
                  (order.line_items || [])
                    .map((li) => (li.size || "").trim())
                    .filter(Boolean)
                )
              );
              const thumb = firstItem?.image?.src;
              // Full address for the detail sheet — avoids repeating the city
              // when the stored address already contains it.
              const rawAddress = order.billing?.address_1 || "";
              const city = order.billing?.city || "";
              const fullAddress =
                city && !rawAddress.toLowerCase().includes(city.toLowerCase())
                  ? `${rawAddress}, ${city}`.replace(/^,\s*/, "")
                  : rawAddress;

              const openCustomerDetails = () =>
                setInfoModal({
                  title: "Customer details",
                  subtitle: `Order #${order.number || order.id}`,
                  fields: [
                    { label: "Name", value: custName },
                    ...(order.billing?.email
                      ? [{ label: "Email", value: order.billing.email, mono: true }]
                      : []),
                    ...(order.billing?.phone
                      ? [{ label: "Phone", value: order.billing.phone, mono: true }]
                      : []),
                    ...(fullAddress ? [{ label: "Address", value: fullAddress }] : []),
                  ],
                });

              const openProductDetails = () =>
                setInfoModal({
                  title: "Product details",
                  subtitle: `Order #${order.number || order.id}`,
                  fields: [
                    { label: "Product", value: productName },
                    { label: "Quantity", value: String(productQty) },
                    {
                      label: productSizes.length === 1 ? "Size" : "Sizes",
                      value: productSizes.length ? productSizes.join(", ") : "—",
                      mono: true,
                    },
                  ],
                });
              // The badge reflects the stored payment status only. Order status
              // is a fulfilment state, not a payment state: a delivered COD
              // order can still be unpaid, and payment can be toggled back to
              // pending after delivery. The API already defaults legacy orders
              // with no paymentStatus to "paid" when they are completed.
              const paymentStatus = (
                order.payment_status ||
                order.paymentStatus ||
                ""
              ).toLowerCase();
              const isPaid = paymentStatus === "paid";
              const isCancelled =
                order.status === "cancelled" || order.status === "failed";

              return (
                <div key={order.id} className="group">
                  {/* Summary row */}
                  <div
                    className="w-full grid grid-cols-[auto_1fr] lg:grid-cols-[45px_150px_minmax(190px,1.4fr)_minmax(180px,1.2fr)_120px_100px_90px_105px] items-center gap-3 px-5 py-4 text-left hover:bg-purple-50/40 transition"
                  >
                    {/* SL */}
                    <span className="hidden lg:block text-[12px] text-gray-400 font-bold">
                      {idx + 1}
                    </span>

                    {/* Order No & Date */}
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void copyValue(`#${order.number || order.id}`, "Order number");
                        }}
                        className="group/ord flex max-w-full items-center gap-1 rounded text-left font-mono text-[12px] font-bold tracking-tight text-purple-600 transition hover:text-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40"
                        title="Click to copy the order number"
                      >
                        <span className="truncate">#{order.number || order.id}</span>
                        <Copy className="h-3 w-3 shrink-0 opacity-0 transition group-hover/ord:opacity-100" />
                      </button>
                      <p className="text-[11px] text-gray-500">
                        {order.date_created
                          ? new Date(order.date_created).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </p>
                      <span className="mt-1 inline-block rounded border border-purple-200/60 bg-purple-50 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wider text-purple-700">
                        Online
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div className="min-w-0 space-y-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCustomerDetails();
                        }}
                        className="flex w-full min-w-0 items-center gap-1.5 rounded text-left transition hover:text-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40"
                        title="View full customer details"
                      >
                        <Users className="h-3 w-3 flex-shrink-0 text-gray-400" />
                        <span className="truncate text-[12px] font-semibold text-gray-800">
                          {custName}
                        </span>
                      </button>
                      {order.billing?.email && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCustomerDetails();
                          }}
                          className="flex w-full min-w-0 items-center gap-1.5 rounded text-left transition hover:text-purple-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40"
                          title={`${order.billing.email} — click for details`}
                        >
                          <Mail className="h-3 w-3 flex-shrink-0 text-gray-400" />
                          <span className="truncate text-[11px] text-gray-500">
                            {order.billing.email}
                          </span>
                        </button>
                      )}
                      {order.billing?.phone && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCustomerDetails();
                          }}
                          className="flex w-full min-w-0 items-center gap-1.5 rounded text-left transition hover:text-purple-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40"
                          title={`${order.billing.phone} — click for details`}
                        >
                          <Phone className="h-3 w-3 flex-shrink-0 text-gray-400" />
                          <span className="truncate font-mono text-[11px] text-gray-500">
                            {order.billing.phone}
                          </span>
                        </button>
                      )}
                      {order.billing?.address_1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCustomerDetails();
                          }}
                          className="flex w-full min-w-0 items-center gap-1.5 rounded text-left transition hover:text-purple-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40"
                          title={`${fullAddress} — click for details`}
                        >
                          <MapPin className="h-3 w-3 flex-shrink-0 text-gray-400" />
                          <span className="truncate text-[11px] text-gray-500">
                            {order.billing.address_1}
                          </span>
                        </button>
                      )}
                      {/* Mobile Row Info */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap lg:hidden">
                        <span className="text-[11px] font-bold text-gray-900">
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
                          <span className="text-[9px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
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
                        <div className="h-10 w-10 rounded-lg overflow-hidden bg-purple-50/50 flex-shrink-0 border border-purple-100">
                          <Image
                            src={thumb}
                            alt={productName}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-purple-50/50 flex-shrink-0 border border-purple-100 flex items-center justify-center text-purple-300">
                          <ShoppingCart className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openProductDetails();
                          }}
                          className="block w-full truncate rounded text-left text-[12px] font-semibold text-gray-800 transition hover:text-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40"
                          title={`${productName} — click for details`}
                        >
                          {productName}
                        </button>
                        <p className="text-[11px] font-medium text-gray-700">
                          Qty: {productQty}
                          {productSizes.length > 0 && (
                            <>
                              {" · "}
                              <span className="font-semibold text-gray-900">
                                {productSizes.length === 1 ? "Size" : "Sizes"}:{" "}
                                {productSizes.join(", ")}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Payment & Collection Status */}
                    <div className="hidden lg:flex flex-col items-start gap-1">
                      <span
                        className="text-[11px] font-medium text-gray-600 truncate max-w-[110px]"
                        title={order.payment_method_title || order.paymentMethod || "COD"}
                      >
                        {order.payment_method_title || order.paymentMethod || "COD"}
                      </span>
                      {isCancelled ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
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
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[9px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-100 transition hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 disabled:opacity-60"
                          title="Payment received. Click to switch to Unpaid."
                        >
                          <CheckCircle2 className="h-2.5 w-2.5" />
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
                          className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[9px] font-bold text-amber-700 transition hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 disabled:opacity-60"
                          title="Pending collection / COD. Click to mark Paid."
                        >
                          <Clock className="h-2.5 w-2.5" />
                          Unpaid
                        </button>
                      )}
                    </div>

                    {/* Total Price */}
                    <span className="hidden text-[13px] font-bold tabular-nums text-gray-900 lg:block">
                      {formatBDT(order.total)}
                    </span>

                    {/* Due */}
                    <div className="hidden lg:block">
                      {isCancelled ? (
                        <span className="text-[11px] font-medium text-gray-400">Void</span>
                      ) : isPaid ? (
                        <span className="text-[12px] font-bold tabular-nums text-emerald-600">
                          ৳ 0
                        </span>
                      ) : (
                        <span className="text-[13px] font-bold tabular-nums text-purple-700">
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
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="status-modal-title"
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <ClipboardList className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3
                    id="status-modal-title"
                    className="text-[15px] font-semibold leading-snug text-slate-900"
                  >
                    Update order status
                  </h3>
                  <p className="mt-0.5 truncate text-[12px] text-slate-500">
                    #{statusModal.number || statusModal.id}
                    <span className="mx-1.5 text-slate-300">·</span>
                    {statusModal.billing?.first_name || "Guest"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => {
                  setStatusModal(null);
                  setSelectedStatus(null);
                }}
                className="-mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Status options */}
            <div
              role="radiogroup"
              aria-label="Order status"
              className="max-h-[60vh] space-y-1.5 overflow-y-auto px-6 py-5"
            >
              {STATUS_OPTIONS.map((s) => {
                const isCurrent = statusModal.status === s.key;
                const isSelected = selectedStatus === s.key;

                return (
                  <button
                    key={s.key}
                    type="button"
                    role="radio"
                    aria-checked={isCurrent || isSelected}
                    disabled={isCurrent}
                    onClick={() => setSelectedStatus(s.key)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 disabled:cursor-default ${
                      isCurrent
                        ? "border-slate-200 bg-slate-50"
                        : isSelected
                          ? "border-purple-400 bg-purple-50/60 ring-1 ring-purple-200"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isSelected && !isCurrent
                          ? "bg-purple-100 text-purple-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <s.icon className="h-4 w-4" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-slate-900">
                        {s.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-slate-500">
                        {s.desc}
                      </span>
                    </span>

                    {isCurrent ? (
                      <span className="shrink-0 rounded-full bg-slate-200/70 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-slate-500">
                        Current
                      </span>
                    ) : (
                      <span
                        aria-hidden="true"
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          isSelected ? "border-purple-600 bg-purple-600" : "border-slate-300"
                        }`}
                      >
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Modal footer with Confirm */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-6 py-3.5">
              <button
                onClick={() => {
                  setStatusModal(null);
                  setSelectedStatus(null);
                }}
                className="rounded-xl px-4 py-2.5 text-[13px] font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40"
              >
                Cancel
              </button>
              <button
                disabled={!selectedStatus || selectedStatus === statusModal.status || updating === statusModal.id}
                onClick={async () => {
                  if (!selectedStatus) return;

                  const paidNow =
                    (statusModal.paymentStatus || statusModal.payment_status || "").toLowerCase() ===
                    "paid";

                  // Delivering an unpaid order: confirm payment collection first.
                  if (selectedStatus === "completed" && !paidNow) {
                    setPaymentModal({
                      orderId: statusModal.id,
                      orderNumber: String(statusModal.number || statusModal.id),
                      total: statusModal.total,
                    });
                    return;
                  }

                  // Cancelled / refunded are permanent.
                  if (FINAL_STATUSES.includes(selectedStatus)) {
                    setWarningModal({
                      kind: "permanent",
                      orderId: statusModal.id,
                      status: selectedStatus,
                      orderNumber: String(statusModal.number || statusModal.id),
                    });
                    return;
                  }

                  // A paid order cannot silently return to pending — that would
                  // leave the money recorded against a pending order.
                  if (paidNow && selectedStatus === "pending") {
                    setWarningModal({
                      kind: "revert-payment",
                      orderId: statusModal.id,
                      status: selectedStatus,
                      orderNumber: String(statusModal.number || statusModal.id),
                      total: statusModal.total,
                    });
                    return;
                  }

                  const ok = await handleStatusChange(statusModal.id, selectedStatus);
                  if (ok) {
                    setStatusModal(null);
                    setSelectedStatus(null);
                  }
                }}
                className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-[13px] font-bold text-white shadow-md shadow-purple-200 transition hover:bg-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {updating === statusModal.id && <Loader2 className="h-4 w-4 animate-spin" />}
                Update status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Required Before Delivery ────────── */}
      {paymentModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setPaymentModal(null)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-2xl"
          >
            <button
              type="button"
              aria-label="Close dialog"
              onClick={() => setPaymentModal(null)}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-6 pt-9">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                <Banknote className="h-7 w-7 text-amber-600" />
              </div>
              <h3
                id="payment-modal-title"
                className="text-center text-[16px] font-semibold text-slate-900"
              >
                Payment required before delivery
              </h3>
              <p className="mx-auto mt-1.5 max-w-sm text-center text-[12.5px] leading-relaxed text-slate-500">
                Order <strong className="text-slate-700">#{paymentModal.orderNumber}</strong> is not
                marked as paid. Deliveries must be paid first — confirming records the payment and
                marks the order delivered.
              </p>

              <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Amount due
                </span>
                <span className="text-[15px] font-bold tabular-nums text-slate-900">
                  {formatBDT(paymentModal.total)}
                </span>
              </div>

              <p className="mt-3 text-center text-[11px] text-slate-400">
                The payment is recorded as collected for this order only.
              </p>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentModal(null)}
                  className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-[13px] font-medium text-slate-600 transition hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
                >
                  Go back
                </button>
                <button
                  type="button"
                  disabled={updating === paymentModal.orderId}
                  onClick={async () => {
                    await handleStatusChange(paymentModal.orderId, "completed");
                    setPaymentModal(null);
                    setStatusModal(null);
                    setSelectedStatus(null);
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-[13px] font-bold text-white shadow-md transition hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 disabled:opacity-50"
                >
                  {updating === paymentModal.orderId && <Loader2 className="h-4 w-4 animate-spin" />}
                  Mark paid &amp; deliver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Warning Modal for Final Statuses ────────── */}
      {/* ── Confirmation dialog: permanent status / payment reversal ── */}
      {warningModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setWarningModal(null)}
          />

          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="warning-modal-title"
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <button
              type="button"
              aria-label="Close dialog"
              onClick={() => setWarningModal(null)}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="px-6 pb-5 pt-9">
              <div
                className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
                  warningIsRevert ? "bg-amber-100" : "bg-rose-100"
                }`}
              >
                {warningIsRevert ? (
                  <Banknote className="h-7 w-7 text-amber-600" />
                ) : (
                  <AlertTriangle className="h-7 w-7 text-rose-600" />
                )}
              </div>

              <h3
                id="warning-modal-title"
                className="text-center text-[16px] font-semibold text-slate-900"
              >
                {warningIsRevert ? "Undo payment and reopen order?" : "Permanent status change"}
              </h3>

              <p className="mx-auto mt-1.5 max-w-sm text-center text-[12.5px] leading-relaxed text-slate-500">
                {warningIsRevert ? (
                  <>
                    Order{" "}
                    <strong className="text-slate-700">#{warningModal.orderNumber}</strong> is already
                    paid. Moving it back to{" "}
                    <strong className="capitalize text-slate-700">
                      {warningModal.status.replace("-", " ")}
                    </strong>{" "}
                    will mark the payment as pending again.
                  </>
                ) : (
                  <>
                    Order{" "}
                    <strong className="text-slate-700">#{warningModal.orderNumber}</strong> will be
                    marked{" "}
                    <strong className="capitalize text-slate-700">
                      {warningModal.status.replace("-", " ")}
                    </strong>
                    .
                  </>
                )}
              </p>

              {warningIsRevert && (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Paid amount
                  </span>
                  <span className="text-[15px] font-bold tabular-nums text-slate-900">
                    {formatBDT(warningModal.total || 0)}
                  </span>
                </div>
              )}

              <div
                className={`mt-4 rounded-xl border px-3.5 py-2.5 text-[11.5px] leading-relaxed ${
                  warningIsRevert
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {warningIsRevert
                  ? "The order will show as Unpaid and the full amount will count as due until it is marked paid again."
                  : "Cancelled and refunded orders are locked and cannot be changed afterwards."}
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setWarningModal(null)}
                  className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-[13px] font-medium text-slate-600 transition hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50"
                >
                  Go back
                </button>
                <button
                  type="button"
                  disabled={updating === warningModal.orderId}
                  onClick={async () => {
                    const ok =
                      warningModal.kind === "revert-payment"
                        ? await handleStatusChange(warningModal.orderId, warningModal.status, {
                            revertPayment: true,
                          })
                        : await handleStatusChange(warningModal.orderId, warningModal.status);
                    setWarningModal(null);
                    if (ok) {
                      setStatusModal(null);
                      setSelectedStatus(null);
                    }
                  }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-bold text-white shadow-md transition focus:outline-none focus-visible:ring-2 disabled:opacity-50 ${
                    warningIsRevert
                      ? "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500/50"
                      : "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500/50"
                  }`}
                >
                  {updating === warningModal.orderId && <Loader2 className="h-4 w-4 animate-spin" />}
                  {warningIsRevert ? "Undo payment & reopen" : "Yes, confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ────────────────────────── */}
      {/* ── Detail sheet (customer / product) ────────── */}
      {infoModal && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setInfoModal(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="info-modal-title"
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <h3 id="info-modal-title" className="text-[15px] font-semibold text-slate-900">
                  {infoModal.title}
                </h3>
                {infoModal.subtitle && (
                  <p className="mt-0.5 truncate font-mono text-[11.5px] text-slate-500">
                    {infoModal.subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setInfoModal(null)}
                className="-mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[60vh] space-y-2.5 overflow-y-auto px-5 py-4">
              {infoModal.fields.map((field) => (
                <div
                  key={field.label}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    {field.label}
                  </p>
                  <div className="mt-1 flex items-start justify-between gap-3">
                    <p
                      className={`min-w-0 break-all text-[12.5px] leading-relaxed text-slate-800 ${
                        field.mono ? "font-mono" : ""
                      }`}
                    >
                      {field.value}
                    </p>
                    <button
                      type="button"
                      onClick={() => void copyValue(field.value, field.label)}
                      aria-label={`Copy ${field.label}`}
                      title={`Copy ${field.label.toLowerCase()}`}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-purple-300 hover:text-purple-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
              <button
                type="button"
                onClick={() =>
                  void copyValue(
                    infoModal.fields.map((f) => `${f.label}: ${f.value}`).join("\n"),
                    "Details"
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40"
              >
                <Copy className="h-3 w-3" />
                Copy all
              </button>
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-[11.5px] font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

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
