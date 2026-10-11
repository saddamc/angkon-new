"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Mail,
  MailCheck,
  Package,
  Phone,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  emailVerified: boolean;
  hasPassword: boolean;
  addresses?: Array<{ fullName: string; phone: string; address: string; city: string; district: string }>;
}

interface OrderSummary {
  orderNumber: string;
  total: number;
  shippingFee: number;
  orderStatus: string;
  paymentMethod: string;
  createdAt: string;
  items: { productId: number; name: string; price: number; quantity: number; size?: string }[];
  customer: { fullName: string; phone: string; address: string; district: string };
}

type Notice = { text: string; type: "error" | "success" | "info" } | null;

const VERIFY_NOTICES: Record<string, Notice> = {
  success: { text: "Your email is verified. You're signed in.", type: "success" },
  invalid: { text: "That verification link has expired or was already used. Sign in and request a new one.", type: "error" },
  error: { text: "We couldn't verify your email right now. Please try the link again.", type: "error" },
};

const PASSWORD_HINT = "At least 8 characters, with a letter and a number";

/* ── Small shared pieces ─────────────────────────────────────────────── */

const inputClass =
  "w-full rounded-xl border border-[#400604] bg-[#1A0302] px-4 py-3 text-sm text-[#f5ebd8] placeholder-[#7a6550] focus:border-[#E1B76F] focus:outline-none";
const primaryButton =
  "w-full rounded-xl bg-[#E1B76F] py-3.5 text-xs font-black uppercase tracking-wider text-[#400604] hover:bg-[#edd19b] transition shadow-md disabled:opacity-50";

function NoticeBanner({ notice }: { notice: Notice }) {
  if (!notice) return null;
  const styles = {
    success: "border-green-500/50 bg-green-950/40 text-green-300",
    error: "border-red-500/50 bg-red-950/40 text-red-300",
    info: "border-[#E1B76F]/40 bg-[#2b0403] text-[#f0d29d]",
  }[notice.type];
  return (
    <div role="status" className={`rounded-xl border p-4 text-center text-sm font-semibold ${styles}`}>
      {notice.text}
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${inputClass} pr-10`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-3.5 text-[#7a6550] hover:text-[#E1B76F]"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wider text-[#f5ebd8] mb-1.5">
      {children} {required && <span className="text-red-400">*</span>}
    </label>
  );
}

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

/* ── Page ────────────────────────────────────────────────────────────── */

export default function MyAccountPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  // The verification link redirects here with ?verify=success|invalid|error.
  // Only rendered after the session check, so server and client markup match.
  const [notice, setNotice] = useState<Notice>(() => {
    if (typeof window === "undefined") return null;
    const key = new URLSearchParams(window.location.search).get("verify");
    return key ? VERIFY_NOTICES[key] ?? null : null;
  });

  // Signed-out forms
  const [mode, setMode] = useState<"auth" | "forgot">("auth");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPass, setRegPass] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");

  // Signed-in password forms
  const [newPass, setNewPass] = useState("");
  const [currentPass, setCurrentPass] = useState("");
  const [showChangePassword, setShowChangePassword] = useState(false);

  const loadSession = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.authenticated && data.user) {
        setUser(data.user);
        setOrders(data.orders || []);
      } else {
        setUser(null);
        setOrders([]);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Drop ?verify=… from the address bar so a refresh doesn't repeat the message.
    if (window.location.search.includes("verify=")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load the session once on mount
    void loadSession();
  }, []);

  const run = async (action: () => Promise<void>) => {
    setNotice(null);
    setSubmitting(true);
    try {
      await action();
    } catch {
      setNotice({ text: "Network error. Please check your connection and try again.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const { ok, data } = await postJson("/api/auth/login", { email: loginEmail, password: loginPass });
      if (!ok) {
        if (data.code === "NO_PASSWORD") {
          setForgotEmail(loginEmail);
          setMode("forgot");
        }
        setNotice({ text: data.error || "Sign in failed.", type: "error" });
        return;
      }
      setLoginPass("");
      await loadSession();
    });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const { ok, data } = await postJson("/api/auth/register", {
        name: regName,
        email: regEmail,
        phone: regPhone,
        password: regPass,
      });
      if (!ok) {
        setNotice({ text: data.error || "Registration failed.", type: "error" });
        return;
      }
      setRegPass("");
      await loadSession();
      setNotice({ text: `Welcome to ANGKON! We sent a verification link to ${data.user?.email ?? regEmail}.`, type: "success" });
    });
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const { ok, data } = await postJson("/api/auth/forgot-password", { email: forgotEmail });
      setNotice({ text: ok ? data.message : data.error || "Something went wrong.", type: ok ? "success" : "error" });
    });
  };

  const handleResend = () =>
    void run(async () => {
      const { ok, data } = await postJson("/api/auth/resend-verification");
      if (ok && data.alreadyVerified) {
        await loadSession();
        return;
      }
      setNotice({
        text: ok ? `A new verification link is on its way to ${user?.email}.` : data.error || "Couldn't send the email.",
        type: ok ? "success" : "error",
      });
    });

  const handleSetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const { ok, data } = await postJson("/api/auth/set-password", {
        password: newPass,
        currentPassword: user?.hasPassword ? currentPass : undefined,
      });
      if (!ok) {
        setNotice({ text: data.error || "Couldn't save the password.", type: "error" });
        return;
      }
      setNewPass("");
      setCurrentPass("");
      setShowChangePassword(false);
      setUser(data.user);
      setNotice({ text: "Your password has been saved.", type: "success" });
    });
  };

  const handleLogout = () =>
    void run(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setOrders([]);
      setMode("auth");
      setNotice({ text: "You have been signed out.", type: "info" });
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A0302] text-[#E1B76F] flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#E1B76F] border-t-transparent" />
          <p className="text-xs uppercase tracking-widest text-[#d8cec4]">Loading your account…</p>
        </div>
      </div>
    );
  }

  /* ── Signed in ─────────────────────────────────────────────────────── */
  if (user) {
    const needsPassword = !user.hasPassword;
    return (
      <div className="min-h-screen bg-[#1A0302] text-[#E1B76F] py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1100px] space-y-6">
          <NoticeBanner notice={notice} />

          {/* Email verification */}
          {!user.emailVerified && (
            <div className="flex flex-col gap-4 rounded-2xl border border-[#E1B76F]/40 bg-[#2b0403] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#E1B76F]" />
                <div>
                  <p className="text-sm font-bold text-[#f5ebd8]">Please verify your email</p>
                  <p className="mt-1 text-xs text-[#d8cec4]">
                    We sent a link to <strong className="text-[#E1B76F]">{user.email}</strong>. Verifying lets you
                    {needsPassword ? " set a password," : ""} see orders you placed earlier with this email, and
                    recover your account.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResend}
                disabled={submitting}
                className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl border border-[#E1B76F]/40 bg-[#400604] px-5 py-2.5 text-xs font-bold uppercase text-[#E1B76F] transition hover:bg-[#E1B76F] hover:text-[#400604] disabled:opacity-50"
              >
                <MailCheck className="h-3.5 w-3.5" /> Resend link
              </button>
            </div>
          )}

          {/* Set a password (account created at checkout, email verified) */}
          {needsPassword && user.emailVerified && (
            <form
              onSubmit={handleSetPassword}
              className="rounded-2xl border border-[#E1B76F]/40 bg-[#2b0403] p-5 sm:p-6"
            >
              <div className="flex items-start gap-3">
                <KeyRound className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#E1B76F]" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#f5ebd8]">Set a password for your account</p>
                  <p className="mt-1 text-xs text-[#d8cec4]">
                    Your account was created with your order. Add a password so you can sign in on any device.
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <div className="flex-1">
                      <PasswordInput value={newPass} onChange={setNewPass} placeholder={PASSWORD_HINT} autoComplete="new-password" />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-xl bg-[#E1B76F] px-6 py-3 text-xs font-black uppercase tracking-wider text-[#400604] transition hover:bg-[#edd19b] disabled:opacity-50"
                    >
                      Save password
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          <div className="rounded-2xl border border-[#400604] bg-[#240403] p-6 sm:p-8 shadow-2xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#400604] pb-6 gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#E1B76F]/80">My account</span>
                <h1 className="font-heading text-2xl sm:text-4xl font-black uppercase text-[#E1B76F] mt-1">
                  Welcome, {user.name}
                </h1>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#d8cec4]">
                  <span className="font-mono">{user.email}</span>
                  {user.emailVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-900/40 px-2 py-0.5 text-[10px] font-bold uppercase text-green-300">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#400604] px-2 py-0.5 text-[10px] font-bold uppercase text-[#E1B76F]">
                      Not verified
                    </span>
                  )}
                  {user.phone && <span>• {user.phone}</span>}
                </p>
              </div>
              <button
                onClick={handleLogout}
                disabled={submitting}
                className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-[#E1B76F]/30 bg-[#400604] px-5 py-2.5 text-xs font-bold uppercase text-[#E1B76F] hover:bg-[#E1B76F] hover:text-[#400604] transition"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="rounded-xl border border-[#400604] bg-[#1a0302] p-5">
                <Package className="h-5 w-5 text-[#E1B76F]" />
                <p className="mt-3 text-2xl font-black text-[#f5ebd8]">{orders.length}</p>
                <p className="text-xs uppercase tracking-wider text-[#d8cec4]">{orders.length === 1 ? "Order" : "Orders"}</p>
              </div>
              <div className="rounded-xl border border-[#400604] bg-[#1a0302] p-5">
                <ShieldCheck className="h-5 w-5 text-[#E1B76F]" />
                <p className="mt-3 text-sm font-bold text-[#f5ebd8]">Delivery address</p>
                <p className="mt-1 text-xs text-[#d8cec4]">
                  {user.addresses && user.addresses.length > 0
                    ? `${user.addresses[0].address}, ${user.addresses[0].district}`
                    : "Saved with your first order."}
                </p>
              </div>
              <div className="rounded-xl border border-[#400604] bg-[#1a0302] p-5">
                <KeyRound className="h-5 w-5 text-[#E1B76F]" />
                <p className="mt-3 text-sm font-bold text-[#f5ebd8]">Password</p>
                {user.hasPassword ? (
                  <button
                    type="button"
                    onClick={() => setShowChangePassword((v) => !v)}
                    className="mt-1 text-xs font-bold text-[#E1B76F] underline underline-offset-4 hover:text-white"
                  >
                    {showChangePassword ? "Cancel" : "Change password"}
                  </button>
                ) : (
                  <p className="mt-1 text-xs text-[#d8cec4]">
                    {user.emailVerified ? "Not set yet — use the form above." : "Verify your email to set one."}
                  </p>
                )}
              </div>
            </div>

            {showChangePassword && user.hasPassword && (
              <form onSubmit={handleSetPassword} className="mt-4 grid gap-3 rounded-xl border border-[#400604] bg-[#1a0302] p-5 sm:grid-cols-[1fr_1fr_auto]">
                <PasswordInput value={currentPass} onChange={setCurrentPass} placeholder="Current password" autoComplete="current-password" />
                <PasswordInput value={newPass} onChange={setNewPass} placeholder={PASSWORD_HINT} autoComplete="new-password" />
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-[#E1B76F] px-6 py-3 text-xs font-black uppercase tracking-wider text-[#400604] transition hover:bg-[#edd19b] disabled:opacity-50"
                >
                  Update
                </button>
              </form>
            )}

            {/* Orders */}
            <div className="mt-10">
              <h2 className="font-heading text-xl font-bold uppercase text-[#E1B76F] mb-4 pb-2 border-b border-[#400604] flex items-center gap-2">
                <Package className="h-5 w-5" /> Your orders
              </h2>

              {orders.length === 0 ? (
                <div className="rounded-xl border border-[#400604] bg-[#1a0302] p-8 text-center">
                  <Clock className="h-10 w-10 text-[#E1B76F]/50 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-[#f5ebd8]">No orders yet.</p>
                  <p className="text-xs text-[#d8cec4] mt-1 max-w-sm mx-auto">
                    {user.emailVerified
                      ? "Orders you place with this account or email will appear here."
                      : "Orders placed with this account appear here. Earlier orders using this email show up once it's verified."}
                  </p>
                  <Link
                    href="/products"
                    className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#E1B76F] px-6 py-2.5 text-xs font-black uppercase text-[#400604] hover:bg-[#edd19b] transition"
                  >
                    Start shopping <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((ord) => (
                    <div key={ord.orderNumber} className="rounded-xl border border-[#400604] bg-[#1a0302] p-5 transition hover:border-[#E1B76F]/50">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#400604]/50 pb-3">
                        <div>
                          <span className="font-mono text-sm font-bold text-[#E1B76F]">#{ord.orderNumber}</span>
                          <span className="text-xs text-[#d8cec4] ml-3 inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(ord.createdAt).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#400604] px-3 py-0.5 text-xs font-semibold uppercase text-[#E1B76F]">
                            <CheckCircle2 className="h-3 w-3" /> {ord.orderStatus}
                          </span>
                          <span className="text-sm font-black text-[#E1B76F]">৳{Number(ord.total).toLocaleString("en-BD")}</span>
                        </div>
                      </div>
                      <div className="pt-3">
                        <p className="text-xs text-[#d8cec4]">
                          <strong className="text-[#E1B76F]">Delivery to:</strong> {ord.customer.fullName} ({ord.customer.phone}) — {ord.customer.address}, {ord.customer.district}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {ord.items.map((it, idx) => (
                            <span key={idx} className="text-xs bg-[#240403] border border-[#400604] text-[#f5ebd8] px-2.5 py-1 rounded-md">
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

  /* ── Signed out ────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#1A0302] text-[#E1B76F]">
      <div className="border-b border-[#400604] bg-[#240403] py-12 px-4 text-center">
        <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#E1B76F]/80">ANGKON</span>
        <h1 className="mt-2 font-heading text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#E1B76F]">My Account</h1>
        <p className="mt-2 text-xs sm:text-sm text-[#f5ebd8]/80 max-w-md mx-auto">
          Sign in to track your orders and check out faster.
        </p>
      </div>

      <div className="container mx-auto max-w-[1100px] px-4 pt-6">
        <NoticeBanner notice={notice} />
      </div>

      <div className="container mx-auto max-w-[1100px] px-4 py-10 lg:px-8">
        {mode === "forgot" ? (
          <form onSubmit={handleForgot} className="mx-auto max-w-md space-y-5 rounded-2xl border-2 border-[#400604] bg-[#240403] p-6 sm:p-8 shadow-xl">
            <h2 className="font-heading text-2xl font-black uppercase text-[#E1B76F] pb-2 border-b border-[#400604]">Reset password</h2>
            <p className="text-xs text-[#d8cec4]">
              Enter your email and we&apos;ll send a link to set a new password. This also works if your account was created
              with an order and has no password yet.
            </p>
            <div>
              <Label required>Email address</Label>
              <div className="relative">
                <input type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" className={inputClass} />
                <Mail className="absolute right-3 top-3.5 h-4 w-4 text-[#7a6550]" />
              </div>
            </div>
            <button type="submit" disabled={submitting} className={primaryButton}>
              {submitting ? "Sending…" : "Send reset link"}
            </button>
            <button type="button" onClick={() => setMode("auth")} className="w-full text-xs font-bold text-[#E1B76F] hover:underline">
              ← Back to sign in
            </button>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Sign in */}
            <form onSubmit={handleLogin} className="space-y-5 rounded-2xl border-2 border-[#400604] bg-[#240403] p-6 sm:p-8 shadow-xl">
              <h2 className="font-heading text-2xl sm:text-3xl font-black uppercase text-[#E1B76F] pb-2 border-b border-[#400604]">Sign in</h2>
              <div>
                <Label required>Email address</Label>
                <div className="relative">
                  <input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" className={inputClass} />
                  <Mail className="absolute right-3 top-3.5 h-4 w-4 text-[#7a6550]" />
                </div>
              </div>
              <div>
                <Label required>Password</Label>
                <PasswordInput value={loginPass} onChange={setLoginPass} placeholder="••••••••" autoComplete="current-password" />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(loginEmail);
                    setNotice(null);
                    setMode("forgot");
                  }}
                  className="text-xs font-bold text-[#E1B76F] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <button type="submit" disabled={submitting} className={primaryButton}>
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>

            {/* Register */}
            <form onSubmit={handleRegister} className="space-y-4 rounded-2xl border-2 border-[#400604] bg-[#240403] p-6 sm:p-8 shadow-xl">
              <h2 className="font-heading text-2xl sm:text-3xl font-black uppercase text-[#E1B76F] pb-2 border-b border-[#400604]">Create account</h2>
              <div>
                <Label required>Full name</Label>
                <div className="relative">
                  <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Your full name" autoComplete="name" className={inputClass} />
                  <UserIcon className="absolute right-3 top-3.5 h-4 w-4 text-[#7a6550]" />
                </div>
              </div>
              <div>
                <Label required>Email address</Label>
                <div className="relative">
                  <input type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" className={inputClass} />
                  <Mail className="absolute right-3 top-3.5 h-4 w-4 text-[#7a6550]" />
                </div>
              </div>
              <div>
                <Label>Phone number</Label>
                <div className="relative">
                  <input type="tel" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="017XXXXXXXX" autoComplete="tel" className={inputClass} />
                  <Phone className="absolute right-3 top-3.5 h-4 w-4 text-[#7a6550]" />
                </div>
              </div>
              <div>
                <Label required>Password</Label>
                <PasswordInput value={regPass} onChange={setRegPass} placeholder={PASSWORD_HINT} autoComplete="new-password" />
              </div>
              <p className="text-[11px] text-[#d8cec4]/80 leading-relaxed">
                We&apos;ll email you a link to verify your address. By creating an account you agree to our{" "}
                <Link href="/privacy-policy" className="text-[#E1B76F] underline">Privacy Policy</Link>.
              </p>
              <button type="submit" disabled={submitting} className={primaryButton}>
                {submitting ? "Creating account…" : "Create account"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
