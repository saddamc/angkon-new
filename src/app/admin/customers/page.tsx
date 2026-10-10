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
    address_1: string;
    city: string;
    postcode: string;
  };
  line_items: {
    id: number;
    name: string;
    quantity: number;
    total: string;
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

/* ─── Page ────────────────────────────────────────────────────────── */
export default function AdminCustomersPage() {
  const { authFetch } = useAuth();
  const [orders, setOrders] = useState<WCOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await authFetch("/api/admin/orders?per_page=100&status=any");
        if (res.ok) {
          const data = await res.json();
          setOrders(Array.isArray(data) ? data : data.orders ?? []);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive customers from orders
  const customers = useMemo(() => {
    const map = new Map<string, Customer>();

    orders.forEach((order) => {
      const phone = order.billing.phone || "";
      const email = order.billing.email || "";
      // Key by phone or email
      const key = phone || email || `${order.billing.first_name}-${order.billing.last_name}`;
      if (!key) return;

      const existing = map.get(key);
      if (existing) {
        existing.totalOrders += 1;
        existing.totalSpent += Number(order.total);
        if (new Date(order.date_created) > new Date(existing.lastOrderDate)) {
          existing.lastOrderDate = order.date_created;
        }
        existing.orders.push(order);
      } else {
        map.set(key, {
          name: `${order.billing.first_name} ${order.billing.last_name}`.trim() || "Guest",
          email,
          phone,
          city: order.billing.city || "",
          address: order.billing.address_1 || "",
          totalOrders: 1,
          totalSpent: Number(order.total),
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
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <Users className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Customers</h1>
            <p className="text-[12px] text-gray-400">
              {customers.length} total customers (derived from orders)
            </p>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] text-gray-500 hover:text-purple-600 hover:border-purple-300 transition"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ── Search ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-purple-100/60 p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone, email or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-[13px] text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
          />
        </div>
      </div>

      {/* ── Customers Table ────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-purple-100/60 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="hidden lg:grid grid-cols-[50px_1fr_150px_150px_120px_100px_50px] gap-3 px-5 py-3 bg-purple-50/70 text-[10px] font-bold uppercase tracking-widest text-purple-500">
          <span>SL</span>
          <span>Customer</span>
          <span>Phone</span>
          <span>City</span>
          <span>Total Spent</span>
          <span>Orders</span>
          <span></span>
        </div>

        {loading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-purple-50/50 animate-pulse" />
            ))}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-12 w-12 text-purple-200 mx-auto mb-3" />
            <p className="text-gray-400">No customers found.</p>
          </div>
        ) : (
          <div className="divide-y divide-purple-50">
            {filteredCustomers.map((customer, idx) => {
              const isOpen = expanded === customer.phone + customer.email;
              return (
                <div key={customer.phone + customer.email + idx}>
                  <button
                    onClick={() =>
                      setExpanded(
                        isOpen ? null : customer.phone + customer.email
                      )
                    }
                    className="w-full grid grid-cols-[auto_1fr_auto] lg:grid-cols-[50px_1fr_150px_150px_120px_100px_50px] items-center gap-3 px-5 py-3.5 text-left hover:bg-purple-50/30 transition"
                  >
                    <span className="hidden lg:block text-[12px] text-purple-500 font-bold">
                      {idx + 1}
                    </span>

                    {/* Customer info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-gray-700 truncate">
                          {customer.name}
                        </p>
                        {customer.email && (
                          <p className="text-[11px] text-gray-400 truncate">
                            {customer.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="hidden lg:flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-gray-400" />
                      <span className="text-[12px] text-gray-600">
                        {customer.phone || "—"}
                      </span>
                    </div>

                    <div className="hidden lg:flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <span className="text-[12px] text-gray-600">
                        {customer.city || "—"}
                      </span>
                    </div>

                    <span className="hidden lg:block text-[13px] font-bold text-purple-600">
                      ৳ {customer.totalSpent.toLocaleString()}
                    </span>

                    <span className="hidden lg:inline-flex items-center justify-center h-7 min-w-[28px] rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold px-2">
                      {customer.totalOrders}
                    </span>

                    <span className="text-gray-400">
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </span>
                  </button>

                  {/* Expanded details */}
                  {isOpen && (
                    <div className="border-t border-purple-100 bg-purple-50/20 px-5 py-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <div className="bg-white rounded-xl p-3 border border-purple-100/60">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Mail className="h-3 w-3 text-purple-400" />
                            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">
                              Email
                            </span>
                          </div>
                          <span className="text-[12px] text-gray-700">
                            {customer.email || "—"}
                          </span>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-purple-100/60">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Phone className="h-3 w-3 text-purple-400" />
                            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">
                              Phone
                            </span>
                          </div>
                          <span className="text-[12px] text-gray-700">
                            {customer.phone || "—"}
                          </span>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-purple-100/60">
                          <div className="flex items-center gap-1.5 mb-1">
                            <MapPin className="h-3 w-3 text-purple-400" />
                            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">
                              Address
                            </span>
                          </div>
                          <span className="text-[12px] text-gray-700">
                            {customer.address || "—"}, {customer.city}
                          </span>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-purple-100/60">
                          <div className="flex items-center gap-1.5 mb-1">
                            <ShoppingBag className="h-3 w-3 text-purple-400" />
                            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">
                              Last Order
                            </span>
                          </div>
                          <span className="text-[12px] text-gray-700">
                            {new Date(customer.lastOrderDate).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Recent orders */}
                      <p className="text-[10px] font-bold uppercase tracking-widest text-purple-400 mb-2">
                        Order History
                      </p>
                      <div className="space-y-1.5">
                        {customer.orders.slice(0, 5).map((order) => (
                          <div
                            key={order.id}
                            className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-purple-100/60 text-[12px]"
                          >
                            <span className="font-bold text-purple-600">
                              #{order.number}
                            </span>
                            <span className="text-gray-400">
                              {new Date(order.date_created).toLocaleDateString("en-GB")}
                            </span>
                            <span className="font-bold text-gray-700">
                              ৳ {Number(order.total).toLocaleString()}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                                order.status === "completed"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : order.status === "pending"
                                  ? "bg-amber-50 text-amber-600"
                                  : order.status === "cancelled"
                                  ? "bg-red-50 text-red-600"
                                  : "bg-blue-50 text-blue-600"
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
