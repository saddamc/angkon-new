"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  ShieldCheck,
  ShoppingBag,
  ArrowRight,
  LogOut,
  Package,
  Calendar,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  addresses?: Array<{
    fullName: string;
    phone: string;
    address: string;
    city: string;
    district: string;
    postalCode?: string;
    isDefault?: boolean;
  }>;
}

interface OrderItemSummary {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  size?: string;
}

interface OrderSummary {
  orderNumber: string;
  total: number;
  shippingFee: number;
  orderStatus: string;
  paymentMethod: string;
  createdAt: string;
  items: OrderItemSummary[];
  customer: {
    fullName: string;
    phone: string;
    address: string;
    district: string;
  };
}

export default function MyAccountPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Register form state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [showRegPass, setShowRegPass] = useState(false);

  // Check existing session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setUser(data.user);
            setOrders(data.orders || []);
          }
        }
      } catch (err) {
        console.error("Session check error:", err);
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ text: data.error || "Login failed. Please verify credentials.", type: "error" });
        return;
      }

      setUser(data.user);
      setMessage({ text: "Welcome back! Login successful.", type: "success" });

      // Fetch user's orders
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      if (meRes.ok) {
        const meData = await meRes.json();
        setOrders(meData.orders || []);
      }
    } catch {
      setMessage({ text: "Network error during login. Please try again.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPass,
          phone: regPhone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ text: data.error || "Registration failed. Please try again.", type: "error" });
        return;
      }

      setUser(data.user);
      setMessage({ text: "Account created successfully! Welcome to ANGKON.", type: "success" });
    } catch {
      setMessage({ text: "Network error during registration. Please try again.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setOrders([]);
      setMessage({ text: "You have been logged out.", type: "success" });
    } catch {
      setUser(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A0302] text-[#E1B76F] flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#E1B76F] border-t-transparent" />
          <p className="text-xs uppercase tracking-widest text-[#d8cec4]">Loading ANGKON Account Portal...</p>
        </div>
      </div>
    );
  }

  // ── Authenticated Customer Dashboard ───────────────────────────────────────
  if (user) {
    return (
      <div className="min-h-screen bg-[#1A0302] text-[#E1B76F] py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1100px]">
          {/* Welcome Card */}
          <div className="rounded-2xl border border-[#400604] bg-[#240403] p-6 sm:p-8 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#400604] pb-6 gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#E1B76F]/80">
                  Patron Portal
                </span>
                <h1 className="font-heading text-2xl sm:text-4xl font-black uppercase text-[#E1B76F] mt-1">
                  Welcome, {user.name}
                </h1>
                <p className="text-xs text-[#d8cec4] mt-1 font-mono">
                  {user.email} {user.phone && `• ${user.phone}`}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-[#E1B76F]/30 bg-[#400604] px-5 py-2.5 text-xs font-bold uppercase text-[#E1B76F] hover:bg-[#E1B76F] hover:text-[#400604] transition duration-200"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              {/* Card 1: Orders */}
              <div className="rounded-xl border border-[#400604] bg-[#1a0302] p-6">
                <div className="flex items-center justify-between mb-4">
                  <ShoppingBag className="h-6 w-6 text-[#E1B76F]" />
                  <span className="text-xs font-bold bg-[#400604] px-2.5 py-1 rounded-full text-[#E1B76F]">
                    {orders.length} {orders.length === 1 ? "Order" : "Orders"}
                  </span>
                </div>
                <h3 className="font-bold text-base text-[#f5ebd8] uppercase">Order History</h3>
                <p className="text-xs text-[#d8cec4] mt-1">
                  Track and view details of your online collections.
                </p>
              </div>

              {/* Card 2: Saved Address */}
              <div className="rounded-xl border border-[#400604] bg-[#1a0302] p-6">
                <div className="flex items-center justify-between mb-4">
                  <ShieldCheck className="h-6 w-6 text-[#E1B76F]" />
                  <span className="text-xs font-bold text-[#E1B76F]/80">64 Districts</span>
                </div>
                <h3 className="font-bold text-base text-[#f5ebd8] uppercase">Delivery Address</h3>
                <p className="text-xs text-[#d8cec4] mt-1">
                  {user.addresses && user.addresses.length > 0
                    ? `${user.addresses[0].address}, ${user.addresses[0].district}`
                    : "Saved upon your first checkout order."}
                </p>
              </div>

              {/* Card 3: Membership */}
              <div className="rounded-xl border border-[#400604] bg-[#1a0302] p-6">
                <div className="flex items-center justify-between mb-4">
                  <UserIcon className="h-6 w-6 text-[#E1B76F]" />
                  <span className="text-xs font-bold bg-[#E1B76F]/20 text-[#E1B76F] px-2.5 py-1 rounded-full uppercase">
                    {user.role}
                  </span>
                </div>
                <h3 className="font-bold text-base text-[#f5ebd8] uppercase">ANGKON Patron</h3>
                <p className="text-xs text-[#d8cec4] mt-1">
                  Access bespoke releases and priority dispatch.
                </p>
                <Link
                  href="/products"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#E1B76F] hover:underline"
                >
                  Explore Catalog <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Orders Breakdown */}
            <div className="mt-10">
              <h2 className="font-heading text-xl font-bold uppercase text-[#E1B76F] mb-4 pb-2 border-b border-[#400604] flex items-center gap-2">
                <Package className="h-5 w-5" /> Recent Orders
              </h2>

              {orders.length === 0 ? (
                <div className="rounded-xl border border-[#400604] bg-[#1a0302] p-8 text-center">
                  <Clock className="h-10 w-10 text-[#E1B76F]/50 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-[#f5ebd8]">No orders found yet.</p>
                  <p className="text-xs text-[#d8cec4] mt-1 max-w-sm mx-auto">
                    When you place an order on our store using this email or phone number, it will appear here in real time.
                  </p>
                  <Link
                    href="/products"
                    className="mt-5 inline-block rounded-xl bg-[#E1B76F] px-6 py-2.5 text-xs font-black uppercase text-[#400604] hover:bg-[#edd19b] transition"
                  >
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((ord) => (
                    <div
                      key={ord.orderNumber}
                      className="rounded-xl border border-[#400604] bg-[#1a0302] p-5 transition hover:border-[#E1B76F]/50"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#400604]/50 pb-3">
                        <div>
                          <span className="font-mono text-sm font-bold text-[#E1B76F]">
                            #{ord.orderNumber}
                          </span>
                          <span className="text-xs text-[#d8cec4] ml-3 inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(ord.createdAt).toLocaleDateString("en-BD", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#400604] px-3 py-0.5 text-xs font-semibold uppercase text-[#E1B76F]">
                            <CheckCircle2 className="h-3 w-3" />
                            {ord.orderStatus}
                          </span>
                          <span className="text-sm font-black text-[#E1B76F]">
                            ৳{Number(ord.total).toLocaleString("en-BD")}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3">
                        <p className="text-xs text-[#d8cec4]">
                          <strong>Delivery To:</strong> {ord.customer.fullName} ({ord.customer.phone}) — {ord.customer.address}, {ord.customer.district}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {ord.items.map((it, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-[#240403] border border-[#400604] text-[#f5ebd8] px-2.5 py-1 rounded-md"
                            >
                              {it.name} {it.size ? `(${it.size})` : ""} × {it.quantity}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Unauthenticated Sign In / Registration Forms ────────────────────────────
  return (
    <div className="min-h-screen bg-[#1A0302] text-[#E1B76F]">
      {/* Top Banner */}
      <div className="border-b border-[#400604] bg-[#240403] py-12 px-4 text-center">
        <div className="container mx-auto max-w-[900px]">
          <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#E1B76F]/80">
            ANGKON Patron Access
          </span>
          <h1 className="mt-2 font-heading text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#E1B76F]">
            My Account
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#f5ebd8]/80 max-w-md mx-auto">
            Sign in to track orders, manage your delivery addresses, and experience expedited luxury checkout.
          </p>
        </div>
      </div>

      {message && (
        <div className="container mx-auto max-w-[1100px] px-4 pt-6">
          <div
            className={`rounded-xl border p-4 text-center text-sm font-bold ${
              message.type === "success"
                ? "border-green-500/50 bg-green-950/40 text-green-300"
                : "border-red-500/50 bg-red-950/40 text-red-300"
            }`}
          >
            {message.text}
          </div>
        </div>
      )}

      {/* 2-Column Authentication Layout */}
      <div className="container mx-auto max-w-[1100px] px-4 py-12 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Column 1: Login */}
          <div className="rounded-2xl border-2 border-[#400604] bg-[#240403] p-6 sm:p-8 shadow-xl">
            <h2 className="font-heading text-2xl sm:text-3xl font-black uppercase text-[#E1B76F] mb-6 pb-2 border-b border-[#400604]">
              Sign In
            </h2>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#f5ebd8] mb-1.5">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-[#400604] bg-[#1A0302] px-4 py-3 text-sm text-[#f5ebd8] placeholder-[#7a6550] focus:border-[#E1B76F] focus:outline-none"
                  />
                  <Mail className="absolute right-3 top-3.5 h-4 w-4 text-[#7a6550]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#f5ebd8] mb-1.5">
                  Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showLoginPass ? "text" : "password"}
                    required
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-[#400604] bg-[#1A0302] px-4 py-3 pr-10 text-sm text-[#f5ebd8] placeholder-[#7a6550] focus:border-[#E1B76F] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPass(!showLoginPass)}
                    className="absolute right-3 top-3.5 text-[#7a6550] hover:text-[#E1B76F]"
                    aria-label={showLoginPass ? "Hide password" : "Show password"}
                  >
                    {showLoginPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-[#d8cec4] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-[#400604] bg-[#1A0302] text-[#E1B76F] focus:ring-0"
                  />
                  <span>Remember me</span>
                </label>
                <Link href="/contact" className="text-xs text-[#E1B76F] hover:underline">
                  Need assistance?
                </Link>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-[#E1B76F] py-3.5 text-xs font-black uppercase tracking-wider text-[#400604] hover:bg-[#edd19b] transition shadow-md disabled:opacity-50"
              >
                {submitting ? "Signing In..." : "Sign In to Account"}
              </button>
            </form>
          </div>

          {/* Column 2: Register */}
          <div className="rounded-2xl border-2 border-[#400604] bg-[#240403] p-6 sm:p-8 shadow-xl">
            <h2 className="font-heading text-2xl sm:text-3xl font-black uppercase text-[#E1B76F] mb-6 pb-2 border-b border-[#400604]">
              Register
            </h2>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#f5ebd8] mb-1.5">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Your Full Name"
                    className="w-full rounded-xl border border-[#400604] bg-[#1A0302] px-4 py-3 text-sm text-[#f5ebd8] placeholder-[#7a6550] focus:border-[#E1B76F] focus:outline-none"
                  />
                  <UserIcon className="absolute right-3 top-3.5 h-4 w-4 text-[#7a6550]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#f5ebd8] mb-1.5">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-[#400604] bg-[#1A0302] px-4 py-3 text-sm text-[#f5ebd8] placeholder-[#7a6550] focus:border-[#E1B76F] focus:outline-none"
                  />
                  <Mail className="absolute right-3 top-3.5 h-4 w-4 text-[#7a6550]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#f5ebd8] mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full rounded-xl border border-[#400604] bg-[#1A0302] px-4 py-3 text-sm text-[#f5ebd8] placeholder-[#7a6550] focus:border-[#E1B76F] focus:outline-none"
                  />
                  <Phone className="absolute right-3 top-3.5 h-4 w-4 text-[#7a6550]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#f5ebd8] mb-1.5">
                  Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showRegPass ? "text" : "password"}
                    required
                    minLength={6}
                    value={regPass}
                    onChange={(e) => setRegPass(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-[#400604] bg-[#1A0302] px-4 py-3 pr-10 text-sm text-[#f5ebd8] placeholder-[#7a6550] focus:border-[#E1B76F] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPass(!showRegPass)}
                    className="absolute right-3 top-3.5 text-[#7a6550] hover:text-[#E1B76F]"
                    aria-label={showRegPass ? "Hide password" : "Show password"}
                  >
                    {showRegPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-[#d8cec4]/80 leading-relaxed pt-1">
                Your credentials are encrypted using industry-standard cryptography. By registering, you agree to our{" "}
                <Link href="/privacy-policy" className="text-[#E1B76F] underline">
                  Privacy Policy
                </Link>
                .
              </p>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-[#E1B76F] py-3.5 text-xs font-black uppercase tracking-wider text-[#400604] hover:bg-[#edd19b] transition shadow-md disabled:opacity-50"
              >
                {submitting ? "Creating Account..." : "Create Patron Account"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
