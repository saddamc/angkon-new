"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Users,
  Search,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────────────────── */
interface WCOrder {
  id: string | number;
  number: string;
  status: string;
  date_created: string;
  total: string;
  billing: {
    first_name: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address_1?: string;
    city?: string;
    postcode?: string;
  };
  line_items?: {
    id?: number | string;
    name: string;
    quantity: number;
    total?: string | number;
  }[];
}

interface Customer {
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  orders: WCOrder[];
}

/* ─── Client Cache for Instant Tab Switching ──────────────────────── */
let cachedCustomersOrders: WCOrder[] | null = null;

/* ─── Page ────────────────────────────────────────────────────────── */
export default function AdminCustomersPage() {
  const { authFetch } = useAuth();
  const [orders, setOrders] = useState<WCOrder[]>(cachedCustomersOrders || []);
  const [loading, setLoading] = useState(!cachedCustomersOrders);
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async (soft = false) => {
    if (!cachedCustomersOrders && !soft) setLoading(true);
    try {
      const res = await authFetch("/api/admin/orders?per_page=150&status=any");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.orders ?? [];
        cachedCustomersOrders = list;
        setOrders(list);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(Boolean(cachedCustomersOrders));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive customers from MongoDB orders
  const customers = useMemo(() => {
    const map = new Map<string, Customer>();

    orders.forEach((order) => {
      const phone = order.billing?.phone || "";
      const email = order.billing?.email || "";
      const key = phone || email || `${order.billing?.first_name}-${order.billing?.last_name}`;
      if (!key) return;

      const existing = map.get(key);
      const orderTotal = Number(order.total || 0);

      if (existing) {
        existing.totalOrders += 1;
        existing.totalSpent += orderTotal;
        if (new Date(order.date_created) > new Date(existing.lastOrderDate)) {
          existing.lastOrderDate = order.date_created;
        }
        existing.orders.push(order);
      } else {
        map.set(key, {
          name: `${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim() || "Guest",
          email,
          phone,
          city: order.billing?.city || "",
          address: order.billing?.address_1 || "",
          totalOrders: 1,
          totalSpent: orderTotal,
          lastOrderDate: order.date_created,
          orders: [order],
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#400604]/10 border border-[#E1B76F]/30 flex items-center justify-center">
            <Users className="h-5 w-5 text-[#400604]" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-[#1A0302]">Clientele Directory</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[13px] text-stone-600 hover:text-[#400604] hover:border-[#400604] transition"
            title="Refresh customers"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#E1B76F]/25 p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search by name, phone, email, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white pl-10 pr-4 py-2.5 text-[13px] text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#400604] focus:ring-1 focus:ring-[#400604]/20 transition"
          />
        </div>
      </div>

      {/* ── Customers Table ────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#E1B76F]/25 overflow-hidden shadow-sm">
        {/* Table header */}
        <div className="hidden lg:grid grid-cols-[50px_1fr_160px_140px_130px_110px_40px] gap-3 px-5 py-3.5 bg-[#FDFBF7] text-[10px] font-bold uppercase tracking-widest text-[#400604] border-b border-stone-100">
          <span>SL</span>
          <span>Customer</span>
          <span>Phone</span>
          <span>City / District</span>
          <span>Total Spent</span>
          <span>Total Orders</span>
          <span />
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
        ) : filteredCustomers.length === 0 ? (
          <div className="py-24 text-center">
            <Users className="h-12 w-12 mx-auto text-stone-300 mb-3" />
            <p className="text-[15px] font-bold text-stone-700">No customers found</p>
            <p className="text-[12px] text-stone-400 mt-1">
              Customers will automatically appear here once orders are placed.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredCustomers.map((customer, idx) => {
              const isOpen = expanded === customer.phone || expanded === customer.email || expanded === String(idx);
              const toggleKey = customer.phone || customer.email || String(idx);

              return (
                <div key={toggleKey}>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : toggleKey)}
                    className="w-full grid grid-cols-[1fr_auto] lg:grid-cols-[50px_1fr_160px_140px_130px_110px_40px] items-center gap-3 px-5 py-4 text-left hover:bg-stone-50/70 transition"
                  >
                    <span className="hidden lg:block text-[12px] text-stone-400 font-bold">
                      {idx + 1}
                    </span>

                    {/* Customer info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#400604] to-[#1A0302] border border-[#E1B76F]/30 flex items-center justify-center text-[#E1B76F] text-xs font-serif font-bold flex-shrink-0 shadow-sm">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-stone-900 truncate">
                          {customer.name}
                        </p>
                        {customer.email && (
                          <p className="text-[11px] text-stone-400 truncate">
                            {customer.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="hidden lg:flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-stone-400" />
                      <span className="text-[12px] text-stone-600 font-mono">
                        {customer.phone || "—"}
                      </span>
                    </div>

                    <div className="hidden lg:flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-stone-400" />
                      <span className="text-[12px] text-stone-600 truncate">
                        {customer.city || "—"}
                      </span>
                    </div>

                    <span className="hidden lg:block text-[13px] font-bold text-[#400604]">
                      ৳ {customer.totalSpent.toLocaleString()}
                    </span>

                    <span className="hidden lg:inline-flex items-center justify-center h-7 min-w-[28px] rounded-full bg-stone-100 text-stone-700 text-[11px] font-bold px-2">
                      {customer.totalOrders}
                    </span>

                    <span className="text-stone-400 flex justify-end">
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </span>
                  </button>

                  {/* Expanded details */}
                  {isOpen && (
                    <div className="border-t border-stone-100 bg-[#FDFBF7] px-5 py-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <div className="bg-white rounded-xl p-3 border border-stone-200">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Mail className="h-3 w-3 text-[#400604]" />
                            <span className="text-[10px] uppercase tracking-wide text-stone-400 font-bold">
                              Email
                            </span>
                          </div>
                          <span className="text-[12px] text-stone-700 truncate block">
                            {customer.email || "—"}
                          </span>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-stone-200">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Phone className="h-3 w-3 text-[#400604]" />
                            <span className="text-[10px] uppercase tracking-wide text-stone-400 font-bold">
                              Phone
                            </span>
                          </div>
                          <span className="text-[12px] text-stone-700 font-mono">
                            {customer.phone || "—"}
                          </span>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-stone-200">
                          <div className="flex items-center gap-1.5 mb-1">
                            <MapPin className="h-3 w-3 text-[#400604]" />
                            <span className="text-[10px] uppercase tracking-wide text-stone-400 font-bold">
                              Address
                            </span>
                          </div>
                          <span className="text-[12px] text-stone-700 truncate block">
                            {customer.address || "—"}, {customer.city}
                          </span>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-stone-200">
                          <div className="flex items-center gap-1.5 mb-1">
                            <ShoppingBag className="h-3 w-3 text-[#400604]" />
                            <span className="text-[10px] uppercase tracking-wide text-stone-400 font-bold">
                              Last Order
                            </span>
                          </div>
                          <span className="text-[12px] text-stone-700">
                            {customer.lastOrderDate
                              ? new Date(customer.lastOrderDate).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—"}
                          </span>
                        </div>
                      </div>

                      {/* Recent orders */}
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#400604] mb-2">
                        Order History
                      </p>
                      <div className="space-y-1.5">
                        {customer.orders.slice(0, 5).map((order) => (
                          <div
                            key={order.id}
                            className="flex items-center justify-between bg-white rounded-xl px-3.5 py-2.5 border border-stone-200 text-[12px]"
                          >
                            <span className="font-bold text-[#400604]">
                              #{order.number || order.id}
                            </span>
                            <span className="text-stone-400">
                              {order.date_created ? new Date(order.date_created).toLocaleDateString("en-GB") : "—"}
                            </span>
                            <span className="font-bold text-stone-800">
                              ৳ {Number(order.total || 0).toLocaleString()}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${
                                order.status === "completed"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : order.status === "pending"
                                  ? "bg-amber-50 text-amber-700"
                                  : order.status === "cancelled"
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {order.status.replace("-", " ")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
