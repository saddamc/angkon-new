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
  BadgeCheck,
  UserCheck,
  Wallet,
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────────────────── */
interface CustomerOrder {
  id: string;
  number: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
  itemCount: number;
  items: { name: string; quantity: number; size?: string }[];
  date: string;
}

interface Customer {
  key: string;
  name: string;
  email: string;
  phone: string;
  otherPhones: string[];
  otherEmails: string[];
  city: string;
  address: string;
  postalCode: string;
  addresses: { address: string; city: string; postalCode: string }[];
  registered: boolean;
  emailVerified: boolean;
  source: string;
  joinedAt: string | null;
  totalOrders: number;
  validOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate: string | null;
  orders: CustomerOrder[];
}

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const STATUS_STYLE: Record<string, string> = {
  delivered: "bg-emerald-50 text-emerald-700",
  completed: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  cancelled: "bg-rose-50 text-rose-700",
  failed: "bg-rose-50 text-rose-700",
  refunded: "bg-stone-100 text-stone-600",
  shipped: "bg-indigo-50 text-indigo-700",
  processing: "bg-blue-50 text-blue-700",
};

/* ─── Client Cache for Instant Tab Switching ──────────────────────── */
let cachedCustomers: Customer[] | null = null;

/* ─── Page ────────────────────────────────────────────────────────── */
export default function AdminCustomersPage() {
  const { authFetch } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>(cachedCustomers || []);
  const [loading, setLoading] = useState(!cachedCustomers);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async (soft = false) => {
    if (!cachedCustomers && !soft) setLoading(true);
    setError("");
    try {
      const res = await authFetch("/api/admin/customers");
      if (!res.ok) throw new Error("Failed to load customers");
      const data = await res.json();
      cachedCustomers = data.customers ?? [];
      setCustomers(cachedCustomers as Customer[]);
    } catch {
      setError("Could not load customers. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(Boolean(cachedCustomers));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.name, c.phone, c.email, c.city, c.address, ...c.otherPhones, ...c.otherEmails, ...c.orders.map((o) => o.number)]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [customers, searchQuery]);

  const summary = useMemo(
    () => ({
      count: customers.length,
      registered: customers.filter((c) => c.registered).length,
      repeat: customers.filter((c) => c.validOrders > 1).length,
      revenue: customers.reduce((s, c) => s + c.totalSpent, 0),
    }),
    [customers],
  );

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-sm">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Clientele Directory</h1>
            <p className="text-[11px] text-gray-400">
              Every customer — registered accounts and guest buyers — across all orders
            </p>
          </div>
        </div>
        <button
          onClick={() => void load()}
          className="flex items-center gap-2 rounded-xl border border-purple-100 bg-white px-3 py-2.5 text-[13px] text-gray-600 hover:text-purple-600 hover:border-purple-300 transition shadow-sm"
          title="Refresh customers"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ── Summary ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Customers", value: summary.count.toLocaleString(), icon: Users },
          { label: "Registered Accounts", value: summary.registered.toLocaleString(), icon: UserCheck },
          { label: "Repeat Buyers", value: summary.repeat.toLocaleString(), icon: ShoppingBag },
          { label: "Net Revenue", value: `৳ ${summary.revenue.toLocaleString()}`, icon: Wallet },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-purple-100/60 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-1.5 mb-1">
              <s.icon className="h-3.5 w-3.5 text-purple-600" />
              <span className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">{s.label}</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Search ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-purple-100/60 p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone, email, city, order #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
          />
        </div>
        {!loading && (
          <p className="mt-2 text-[11px] text-gray-400">
            Showing {filteredCustomers.length} of {customers.length} customers
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">{error}</div>
      )}

      {/* ── Customers Table ────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-purple-100/60 overflow-hidden shadow-sm">
        <div className="hidden lg:grid grid-cols-[50px_1fr_160px_140px_130px_110px_40px] gap-3 px-5 py-3.5 bg-purple-50/70 text-[10px] font-bold uppercase tracking-widest text-purple-600 border-b border-purple-100/50">
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
              <div key={i} className="h-16 rounded-xl bg-purple-50/60 animate-pulse" />
            ))}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-24 text-center">
            <Users className="h-12 w-12 mx-auto text-purple-200 mb-3" />
            <p className="text-[15px] font-bold text-gray-700">No customers found</p>
            <p className="text-[12px] text-gray-400 mt-1">
              Customers appear here automatically when they register or place an order.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-purple-50">
            {filteredCustomers.map((customer, idx) => {
              const isOpen = expanded === customer.key;

              return (
                <div key={customer.key || idx}>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : customer.key)}
                    className="w-full grid grid-cols-[1fr_auto] lg:grid-cols-[50px_1fr_160px_140px_130px_110px_40px] items-center gap-3 px-5 py-4 text-left hover:bg-purple-50/30 transition"
                  >
                    <span className="hidden lg:block text-[12px] text-gray-400 font-bold">{idx + 1}</span>

                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900 truncate">
                          {customer.name}
                          {customer.registered && (
                            <span className="ml-2 align-middle rounded-full bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-purple-700">
                              Member
                            </span>
                          )}
                        </p>
                        {customer.email && (
                          <p className="text-[11px] text-gray-400 truncate">{customer.email}</p>
                        )}
                      </div>
                    </div>

                    <div className="hidden lg:flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-gray-400" />
                      <span className="text-[12px] text-gray-600 font-mono">{customer.phone || "—"}</span>
                    </div>

                    <div className="hidden lg:flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <span className="text-[12px] text-gray-600 truncate">{customer.city || "—"}</span>
                    </div>

                    <span className="hidden lg:block text-[13px] font-bold text-purple-600">
                      ৳ {customer.totalSpent.toLocaleString()}
                    </span>

                    <span className="hidden lg:inline-flex items-center justify-center h-7 min-w-[28px] rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold px-2">
                      {customer.totalOrders}
                    </span>

                    <span className="text-gray-400 flex justify-end">
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                  </button>

                  {/* Expanded details */}
                  {isOpen && (
                    <div className="border-t border-purple-100 bg-purple-50/20 px-5 py-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <Info icon={Mail} label="Email">
                          <span className="inline-flex items-center gap-1 break-all">
                            {customer.email || "—"}
                            {customer.registered && customer.emailVerified && (
                              <BadgeCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            )}
                          </span>
                          {customer.otherEmails.map((e) => (
                            <span key={e} className="block text-gray-400 break-all">{e}</span>
                          ))}
                        </Info>
                        <Info icon={Phone} label="Phone">
                          <span className="font-mono">{customer.phone || "—"}</span>
                          {customer.otherPhones.map((p) => (
                            <span key={p} className="block font-mono text-gray-400">{p}</span>
                          ))}
                        </Info>
                        <Info icon={MapPin} label="Address">
                          {customer.addresses.length === 0 ? (
                            "—"
                          ) : (
                            customer.addresses.slice(0, 3).map((a, i) => (
                              <span key={i} className={`block ${i ? "text-gray-400 mt-1" : ""}`}>
                                {a.address}, {a.city}
                                {a.postalCode ? ` - ${a.postalCode}` : ""}
                              </span>
                            ))
                          )}
                        </Info>
                        <Info icon={UserCheck} label="Account">
                          {customer.registered
                            ? `Registered (${customer.source}) · ${customer.emailVerified ? "email verified" : "email unverified"}`
                            : "Guest buyer"}
                          <span className="block text-gray-400">Since {fmtDate(customer.joinedAt)}</span>
                        </Info>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                        <Stat label="Total Spent" value={`৳ ${customer.totalSpent.toLocaleString()}`} strong />
                        <Stat label="Avg. Order" value={`৳ ${customer.averageOrderValue.toLocaleString()}`} />
                        <Stat label="Delivered" value={String(customer.deliveredOrders)} />
                        <Stat label="Cancelled" value={String(customer.cancelledOrders)} />
                        <Stat label="Last Order" value={fmtDate(customer.lastOrderDate)} />
                      </div>

                      <p className="text-[10px] font-bold uppercase tracking-widest text-purple-700 mb-2">
                        Order History ({customer.orders.length})
                      </p>
                      {customer.orders.length === 0 ? (
                        <p className="text-[12px] text-gray-400">No orders placed yet.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                          {customer.orders.map((order) => (
                            <div
                              key={order.id}
                              className="bg-white rounded-xl px-3.5 py-2.5 border border-purple-100/70 text-[12px] shadow-2xs"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-bold text-purple-600">#{order.number}</span>
                                <span className="text-gray-400">{fmtDate(order.date)}</span>
                                <span className="text-gray-500 uppercase text-[10px]">
                                  {order.paymentMethod} · {order.paymentStatus}
                                </span>
                                <span
                                  className={`font-bold ${
                                    ["cancelled", "failed", "refunded"].includes(order.status)
                                      ? "text-gray-400 line-through"
                                      : "text-gray-800"
                                  }`}
                                >
                                  ৳ {order.total.toLocaleString()}
                                </span>
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${
                                    STATUS_STYLE[order.status] ?? "bg-blue-50 text-blue-700"
                                  }`}
                                >
                                  {order.status.replace("-", " ")}
                                </span>
                              </div>
                              {order.items.length > 0 && (
                                <p className="mt-1 text-[11px] text-gray-400 truncate">
                                  {order.items
                                    .map((it) => `${it.name}${it.size ? ` (${it.size})` : ""} × ${it.quantity}`)
                                    .join(", ")}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
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

function Info({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl p-3 border border-purple-100/60 shadow-2xs">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 text-purple-600" />
        <span className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">{label}</span>
      </div>
      <div className="text-[12px] text-gray-700">{children}</div>
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="bg-white rounded-xl p-3 border border-purple-100/60 shadow-2xs">
      <span className="text-[10px] uppercase tracking-wide text-gray-400 font-bold block mb-1">{label}</span>
      <span className={`text-[13px] ${strong ? "font-bold text-purple-700" : "text-gray-700"}`}>{value}</span>
    </div>
  );
}
