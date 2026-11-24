"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { createPortal } from "react-dom";
import { requestEmailCode } from "@/components/checkout/email-verify-dialog";
import { getCourierLabel, getCourierTrackingUrl } from "@/server/courier/core/tracking";
import { getPaymentMethodLabel, isOnlinePaymentMethod } from "@/lib/payment-methods";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  LogOut,
  Mail,
  MailCheck,
  MapPin,
  Package,
  Phone,
  Printer,
  ShieldCheck,
  ShoppingBag,
  Truck,
  User as UserIcon,
  X,
  CreditCard,
  Sparkles,
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

interface OrderItem {
  productId: number;
  slug?: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  image?: string;
}

interface OrderSummary {
  _id?: string;
  orderNumber: string;
  subtotal?: number;
  total: number;
  shippingFee: number;
  discount?: number;
  promoCode?: string;
  orderStatus: string;
  paymentMethod: string;
  paymentStatus?: string;
  paidAmount?: number;
  paidAt?: string;
  courier?: string;
  shipmentStatus?: string;
  trackingCode?: string;
  consignmentId?: string;
  createdAt: string;
  items: OrderItem[];
  customer: {
    fullName: string;
    email?: string;
    phone: string;
    address: string;
    city?: string;
    district: string;
    postalCode?: string;
  };
}

type Notice = { text: string; type: "error" | "success" | "info" } | null;

const VERIFY_NOTICES: Record<string, Notice> = {
  success: { text: "Your email is verified. You're signed in.", type: "success" },
  invalid: { text: "That verification link has expired or was already used. Sign in and request a new one.", type: "error" },
  error: { text: "We couldn't verify your email right now. Please try the link again.", type: "error" },
};

const PASSWORD_HINT = "At least 8 characters, with a letter and a number";

/* ── UI Helpers ──────────────────────────────────────────────────────── */

const inputClass =
  "w-full rounded-xl border border-[#530911] bg-[#1a0306] px-4 py-3 text-sm text-white placeholder-stone-400 focus:border-[#E1B76F] focus:ring-1 focus:ring-[#E1B76F]/50 focus:outline-none transition shadow-inner";
const primaryButton =
  "w-full rounded-xl bg-gradient-to-r from-[#E1B76F] to-[#edd19b] py-3.5 text-xs font-black uppercase tracking-wider text-[#240407] hover:brightness-105 active:scale-[0.99] transition shadow-lg disabled:opacity-50 cursor-pointer";

function NoticeBanner({ notice }: { notice: Notice }) {
  if (!notice) return null;
  const styles = {
    success: "border-green-500/50 bg-green-950/70 text-green-200",
    error: "border-red-500/50 bg-red-950/70 text-red-200",
    info: "border-[#E1B76F]/40 bg-[#3b050b] text-[#E1B76F]",
  }[notice.type];
  return (
    <div role="status" className={`rounded-xl border p-4 text-center text-sm font-semibold shadow-md ${styles}`}>
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
        className="absolute right-3 top-3.5 text-stone-400 hover:text-[#E1B76F] transition cursor-pointer"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wider text-stone-200 mb-1.5">
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

/* ── Interactive Official Printable Invoice Modal ────────────────────── */

function InvoiceModal({
  order,
  onClose,
}: {
  order: OrderSummary;
  onClose: () => void;
}) {
  const isPaid = order.paymentStatus === "paid" || (order.paidAmount && order.paidAmount >= order.total);
  const paidAmount = order.paidAmount ?? (isPaid ? order.total : 0);
  const balanceDue = Math.max(0, order.total - paidAmount);
  const subtotal = order.subtotal ?? (order.total - (order.shippingFee || 0) + (order.discount || 0));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Portal the modal to <body>: the print stylesheet can then print exactly
  // this sheet and nothing else — the page behind it takes no print space,
  // so the printout is never padded with blank pages.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      id="angkon-invoice-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
    >
      {/* Modal Card */}
      <div
        id="angkon-invoice-card"
        className="relative w-full max-w-3xl rounded-2xl bg-[#220407] border border-[#E1B76F]/40 shadow-2xl overflow-hidden my-auto"
      >
        {/* Modal Top Control Bar (Hidden on print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#2f060c] border-b border-[#E1B76F]/30 no-print">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#E1B76F]" />
            <span className="text-xs font-black uppercase tracking-wider text-white">
              Official Tax Invoice & Receipt
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#E1B76F] px-3.5 py-1.5 text-xs font-black uppercase text-[#240407] hover:bg-[#edd19b] transition shadow-md cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" /> Print Invoice
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-stone-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              aria-label="Close invoice"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet Container */}
        <div
          id="angkon-printable-invoice"
          className="p-6 sm:p-8 bg-[#1f0306] text-stone-200 overflow-y-auto max-h-[82vh]"
        >
          {/* Brand Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-[#530911] gap-4">
            <div>
              <span className="font-heading text-2xl sm:text-3xl font-black uppercase tracking-tight text-white block">
                ANGKON
              </span>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#E1B76F] mt-0.5">
                Authentic Ethnic Luxury Apparel
              </p>
              <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                House 12, Road 4, Banani, Dhaka-1213, Bangladesh<br />
                Hotline: +880 1829-370699 • contact@angkon.com.bd • angkon.com.bd
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#3b050b] text-[#E1B76F] border border-[#E1B76F]/30">
                Tax Invoice / Receipt
              </span>
              <p className="font-mono text-sm font-bold text-white mt-2">
                INV-{order.orderNumber}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                Date: {new Date(order.createdAt).toLocaleDateString("en-BD", { year: "numeric", month: "short", day: "numeric" })}
              </p>
            </div>
          </div>

          {/* Customer & Order Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-[#530911]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#E1B76F] mb-1.5">
                Billed & Shipped To:
              </p>
              <p className="text-sm font-bold text-white">{order.customer.fullName}</p>
              <p className="text-xs text-stone-300 mt-0.5">{order.customer.phone}</p>
              {order.customer.email && <p className="text-xs text-stone-400">{order.customer.email}</p>}
              <p className="text-xs text-stone-300 mt-1.5 leading-relaxed">
                {order.customer.address}, {order.customer.city ? `${order.customer.city}, ` : ""}{order.customer.district}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#E1B76F] mb-1.5">
                Order & Payment Info:
              </p>
              <p className="text-xs text-stone-300">
                <span className="text-stone-400">Order ID:</span> <strong className="text-white font-mono">#{order.orderNumber}</strong>
              </p>
              <p className="text-xs text-stone-300 mt-1">
                <span className="text-stone-400">Payment Method:</span>{" "}
                <span className="font-semibold text-white">
                  {getPaymentMethodLabel(order.paymentMethod)}
                </span>
              </p>
              <p className="text-xs text-stone-300 mt-1">
                <span className="text-stone-400">Payment Status:</span>{" "}
                {isPaid ? (
                  <span className="inline-flex items-center gap-1 font-bold text-green-400">
                    <CheckCircle2 className="h-3 w-3" /> PAID IN FULL
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-400">
                    <Clock className="h-3 w-3" /> CASH ON DELIVERY
                  </span>
                )}
              </p>
              {order.courier && (
                <p className="text-xs text-stone-300 mt-1">
                  <span className="text-stone-400">Assigned Courier:</span> {getCourierLabel(order.courier)}
                </p>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#530911] text-stone-400 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 font-bold">Item Description</th>
                    <th className="py-2.5 font-bold text-center">Variant</th>
                    <th className="py-2.5 font-bold text-center">Qty</th>
                    <th className="py-2.5 font-bold text-right">Price</th>
                    <th className="py-2.5 font-bold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#530911]/60">
                  {order.items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02]">
                      <td className="py-3 pr-2">
                        <span className="font-semibold text-white block">{it.name}</span>
                        {it.color && <span className="text-[10px] text-stone-400">Color: {it.color}</span>}
                      </td>
                      <td className="py-3 text-center text-stone-300">
                        {it.size ? <span className="rounded bg-[#33070d] px-2 py-0.5 border border-[#530911] font-mono">{it.size}</span> : "Standard"}
                      </td>
                      <td className="py-3 text-center font-bold text-white">{it.quantity}</td>
                      <td className="py-3 text-right text-stone-300">৳{Number(it.price).toLocaleString("en-BD")}</td>
                      <td className="py-3 text-right font-bold text-white">
                        ৳{Number(it.price * it.quantity).toLocaleString("en-BD")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Totals */}
          <div className="border-t border-[#530911] pt-4 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="text-xs text-stone-400 max-w-sm">
              <p className="font-semibold text-stone-300">Notice & Terms:</p>
              <p className="mt-1 leading-relaxed text-[11px]">
                Goods once sold can be exchanged within 7 days in their original unused condition with tags intact. Please keep this official invoice for all returns and customer care.
              </p>
            </div>
            <div className="w-full sm:w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-300">
                <span>Subtotal:</span>
                <span>৳{Number(subtotal).toLocaleString("en-BD")}</span>
              </div>
              <div className="flex justify-between text-stone-300">
                <span>Home Delivery:</span>
                <span>৳{Number(order.shippingFee || 0).toLocaleString("en-BD")}</span>
              </div>
              {Boolean(order.discount && order.discount > 0) && (
                <div className="flex justify-between text-[#E1B76F]">
                  <span>Discount {order.promoCode ? `(${order.promoCode})` : ""}:</span>
                  <span>-৳{Number(order.discount).toLocaleString("en-BD")}</span>
                </div>
              )}
              <div className="border-t border-[#530911] pt-2 mt-2 flex justify-between text-sm font-black text-white">
                <span>Grand Total:</span>
                <span className="text-[#E1B76F]">৳{Number(order.total).toLocaleString("en-BD")}</span>
              </div>
              <div className="flex justify-between text-xs text-stone-300 pt-1">
                <span>Amount Paid:</span>
                <span className="font-bold text-green-400">৳{Number(paidAmount).toLocaleString("en-BD")}</span>
              </div>
              <div className="flex justify-between text-xs text-stone-300">
                <span>Balance Due:</span>
                <span className={`font-bold ${balanceDue > 0 ? "text-amber-400" : "text-stone-400"}`}>
                  ৳{Number(balanceDue).toLocaleString("en-BD")}
                </span>
              </div>
            </div>
          </div>

          {/* Invoice Footer Seal */}
          <div className="mt-8 pt-4 border-t border-[#530911] flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-400 gap-2">
            <span>Official Computer-Generated Tax Invoice • ANGKON Luxury Fashion</span>
            <span className="font-mono text-stone-400">Auth Token: ANG-{order.orderNumber.slice(-8)}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Main Page ───────────────────────────────────────────────────────── */

export default function MyAccountPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [activeTab, setActiveTab] = useState<"orders" | "addresses" | "security">("orders");
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<OrderSummary | null>(null);

  // Print isolation: while the invoice modal is open, tag <body> so the
  // print stylesheet prints ONLY the invoice sheet (everything else on the
  // account page is display:none in print and takes no paper space).
  useEffect(() => {
    if (selectedInvoiceOrder) document.body.classList.add("invoice-print-mode");
    else document.body.classList.remove("invoice-print-mode");
    return () => document.body.classList.remove("invoice-print-mode");
  }, [selectedInvoiceOrder]);

  // The verification link redirects here with ?verify=success|invalid|error.
  const [notice, setNotice] = useState<Notice>(() => {
    if (typeof window === "undefined") return null;
    const key = new URLSearchParams(window.location.search).get("verify");
    return key ? VERIFY_NOTICES[key] ?? null : null;
  });

  // Signed-out forms
  const [mode, setMode] = useState<"auth" | "forgot">("auth");
  const [authTab, setAuthTab] = useState<"login" | "register" | "code">("login");
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
    const params = new URLSearchParams(window.location.search);
    const key = params.get("verify");
    if (key && VERIFY_NOTICES[key]) {
      setNotice(VERIFY_NOTICES[key]);
    }
    if (window.location.search.includes("verify=")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
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
      // Be honest when the verification email could not be dispatched — the
      // account exists, so the banner's Resend button is the recovery path.
      if (data.emailSent === false) {
        setNotice({
          text:
            "Your account is ready, but we couldn't send the verification email right now. Use the “Verify with code” button above to confirm your address instantly.",
          type: "error",
        });
        return;
      }
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

  // ── Verify by code: the same 6-digit codes checkout emails, usable
  // directly from My Account so a customer holding a code isn't stuck
  // waiting for a verification link. */
  const [codeFormOpen, setCodeFormOpen] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeSending, setCodeSending] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeResendAfter, setCodeResendAfter] = useState(0);

  useEffect(() => {
    if (codeResendAfter <= 0) return;
    const timer = setTimeout(() => setCodeResendAfter((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [codeResendAfter]);

  const sendVerificationCode = async () => {
    if (!user) return;
    setCodeSending(true);
    setCodeError(null);
    const result = await requestEmailCode(user.email, user.name);
    setCodeSending(false);
    if (!result.ok) {
      setCodeError(result.error);
      return;
    }
    setCodeResendAfter(result.resendAfter);
  };

  const openCodeVerification = () => {
    setCodeFormOpen(true);
    setCodeInput("");
    setCodeError(null);
    void sendVerificationCode();
  };

  const handleVerifyCode = async (value: string) => {
    if (!user) return;
    setCodeBusy(true);
    setCodeError(null);
    try {
      const { ok, data } = await postJson("/api/auth/email-code/verify", {
        email: user.email,
        code: value,
        name: user.name,
      });
      if (!ok) {
        setCodeError(data.error || "That code didn't work. Please try again.");
        setCodeInput("");
        return;
      }
      setCodeFormOpen(false);
      await loadSession();
      setNotice({ text: "Your email is verified. Thank you!", type: "success" });
    } catch {
      setCodeError("Network error. Please check your connection and try again.");
    } finally {
      setCodeBusy(false);
    }
  };

  // ── Password-less sign-in with a code. Essential for accounts created at
  // checkout (they have no password yet) and for anyone who can't sign in:
  // the code proves the mailbox, marks the account verified, and signs in.
  const [signInCode, setSignInCode] = useState("");
  const [signInCodeSent, setSignInCodeSent] = useState(false);
  const [signInCodeBusy, setSignInCodeBusy] = useState(false);
  const [signInCodeError, setSignInCodeError] = useState<string | null>(null);
  const [signInResendAfter, setSignInResendAfter] = useState(0);

  useEffect(() => {
    if (signInResendAfter <= 0) return;
    const timer = setTimeout(() => setSignInResendAfter((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [signInResendAfter]);

  const sendSignInCode = async () => {
    const email = loginEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSignInCodeError("Enter your email address first.");
      return;
    }
    setSignInCodeBusy(true);
    setSignInCodeError(null);
    const result = await requestEmailCode(email);
    setSignInCodeBusy(false);
    if (!result.ok) {
      setSignInCodeError(result.error);
      return;
    }
    setSignInCodeSent(true);
    setSignInResendAfter(result.resendAfter);
  };

  const handleCodeSignIn = async (value: string) => {
    const email = loginEmail.trim().toLowerCase();
    setSignInCodeBusy(true);
    setSignInCodeError(null);
    try {
      const { ok, data } = await postJson("/api/auth/email-code/verify", { email, code: value });
      if (!ok) {
        setSignInCodeError(data.error || "That code didn't work. Please try again.");
        setSignInCode("");
        return;
      }
      await loadSession();
      setAuthTab("login");
      setSignInCodeSent(false);
      setSignInCode("");
      setNotice({
        text: "Signed in with a code. Set a password on your account so you can sign in faster next time.",
        type: "success",
      });
    } catch {
      setSignInCodeError("Network error. Please check your connection and try again.");
    } finally {
      setSignInCodeBusy(false);
    }
  };

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

  // Calculate lifetime purchase total
  const totalSpent = useMemo(() => {
    return orders
      .filter((o) => o.orderStatus !== "cancelled")
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [orders]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#200407] text-white flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#E1B76F] border-t-transparent" />
          <p className="text-xs uppercase tracking-widest text-stone-300 font-semibold">Loading your account…</p>
        </div>
      </div>
    );
  }

  /* ── Signed in ─────────────────────────────────────────────────────── */
  if (user) {
    const needsPassword = !user.hasPassword;
    const userInitials = (user.name || "A")
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#220407] via-[#1a0306] to-[#120204] text-white py-10 px-4 sm:px-6 lg:px-8">
        {/* Global Print Stylesheet for Invoices */}
        <style jsx global>{`
          @media print {
            @page {
              size: A4;
              margin: 12mm;
            }

            /* While the invoice modal is open, print EXACTLY the invoice.
               Everything else is display:none — hidden content takes no
               space, so the printout spans only the pages the invoice
               itself needs (visibility:hidden kept layout and produced
               many blank pages). */
            body.invoice-print-mode > *:not(#angkon-invoice-backdrop) {
              display: none !important;
            }
            body.invoice-print-mode #angkon-invoice-backdrop {
              position: static !important;
              display: block !important;
              background: none !important;
              backdrop-filter: none !important;
              padding: 0 !important;
              margin: 0 !important;
              overflow: visible !important;
            }
            body.invoice-print-mode #angkon-invoice-card {
              position: static !important;
              display: block !important;
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              border: none !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              background: #ffffff !important;
              overflow: visible !important;
            }
            body.invoice-print-mode #angkon-printable-invoice {
              position: static !important;
              display: block !important;
              width: 100% !important;
              max-height: none !important;
              overflow: visible !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #111827 !important;
              border: none !important;
              box-shadow: none !important;
            }
            body.invoice-print-mode #angkon-printable-invoice .overflow-x-auto {
              overflow: visible !important;
            }
            body.invoice-print-mode #angkon-printable-invoice tr {
              break-inside: avoid;
            }

            /* Dark-screen palette → print-safe equivalents. Every utility used
               inside the sheet maps to a legible ink color on white paper. */
            #angkon-printable-invoice .text-white {
              color: #111827 !important;
            }
            #angkon-printable-invoice .text-stone-200,
            #angkon-printable-invoice .text-stone-300,
            #angkon-printable-invoice .text-stone-400 {
              color: #4b5563 !important;
            }
            #angkon-printable-invoice .text-\\[\\#E1B76F\\] {
              color: #92400e !important;
            }
            #angkon-printable-invoice .text-green-400 {
              color: #15803d !important;
            }
            #angkon-printable-invoice .text-amber-400 {
              color: #b45309 !important;
            }
            #angkon-printable-invoice table th {
              color: #4b5563 !important;
              border-color: #e5e7eb !important;
            }
            #angkon-printable-invoice table td {
              color: #111827 !important;
              border-color: #f3f4f6 !important;
            }
            #angkon-printable-invoice tbody tr {
              border-color: #f3f4f6 !important;
            }
            #angkon-printable-invoice .border-\\[\\#530911\\] {
              border-color: #e5e7eb !important;
            }
            #angkon-printable-invoice .bg-\\[\\#33070d\\],
            #angkon-printable-invoice .bg-\\[\\#3b050b\\] {
              background-color: #faf6f1 !important;
            }

            .no-print {
              display: none !important;
            }
          }
        `}</style>

        <div className="mx-auto max-w-[1140px] space-y-6">
          <NoticeBanner notice={notice} />

          {/* Email verification reminder banner */}
          {!user.emailVerified && (
            <div className="space-y-4">
              <div className="flex flex-col gap-4 rounded-2xl border border-amber-500/40 bg-[#34070e] p-5 sm:flex-row sm:items-center sm:justify-between shadow-xl">
                <div className="flex gap-3.5">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
                  <div>
                    <p className="text-sm font-bold text-white">Email Verification Required</p>
                    <p className="mt-1 text-xs text-stone-300 leading-relaxed">
                      Verify <strong className="text-white font-mono">{user.email}</strong> to unlock invoice
                      downloads, password recovery, and order synchronization. Use a 6-digit code (fastest) or a
                      verification link.
                    </p>
                  </div>
                </div>
                <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={openCodeVerification}
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E1B76F] px-4 py-2.5 text-xs font-bold uppercase text-[#240407] transition hover:bg-[#edd19b] disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    <ShieldCheck className="h-4 w-4" /> Verify with code
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E1B76F]/50 bg-[#530911] px-4 py-2.5 text-xs font-bold uppercase text-white transition hover:bg-[#E1B76F] hover:text-[#240407] disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    <MailCheck className="h-4 w-4" /> Send link
                  </button>
                </div>
              </div>

              {/* Inline 6-digit code verification */}
              {codeFormOpen && (
                <div className="rounded-2xl border border-[#E1B76F]/40 bg-[#2a050a] p-5 shadow-xl">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-3.5">
                      <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#E1B76F]" />
                      <div>
                        <p className="text-sm font-bold text-white">Enter your 6-digit code</p>
                        <p className="mt-1 text-xs text-stone-400 leading-relaxed">
                          {codeResendAfter > 0 || codeSending
                            ? codeSending
                              ? "Sending a fresh code…"
                              : `A code is on its way to ${user.email}. It expires in 10 minutes.`
                            : `Enter the code we emailed to ${user.email}. It expires in 10 minutes.`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={codeInput}
                        disabled={codeBusy}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                          setCodeInput(digits);
                          setCodeError(null);
                          if (digits.length === 6) void handleVerifyCode(digits);
                        }}
                        placeholder="••••••"
                        aria-label="6-digit verification code"
                        className="w-40 rounded-xl border border-[#E1B76F]/40 bg-[#1c0307] px-3.5 py-2.5 text-center font-mono text-xl tracking-[0.45em] text-white placeholder:text-stone-600 focus:border-[#E1B76F] focus:outline-none disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => void handleVerifyCode(codeInput)}
                        disabled={codeBusy || codeInput.length !== 6}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#E1B76F] px-4 py-2.5 text-xs font-bold uppercase text-[#240407] transition hover:bg-[#edd19b] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {codeBusy ? "Verifying…" : "Verify"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#E1B76F]/15 pt-3">
                    <button
                      type="button"
                      onClick={() => void sendVerificationCode()}
                      disabled={codeSending || codeResendAfter > 0}
                      className="text-xs font-bold text-[#E1B76F] hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed cursor-pointer"
                    >
                      {codeResendAfter > 0
                        ? `Resend code in ${codeResendAfter}s`
                        : codeSending
                          ? "Sending…"
                          : "Resend code"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCodeFormOpen(false);
                        setCodeError(null);
                        setCodeInput("");
                      }}
                      className="text-xs font-semibold text-stone-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    {codeError && (
                      <p className="text-xs font-semibold text-rose-300">{codeError}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Prompt to set password if account was created at checkout */}
          {needsPassword && user.emailVerified && (
            <form
              onSubmit={handleSetPassword}
              className="rounded-2xl border border-[#E1B76F]/40 bg-[#2d060c] p-5 sm:p-6 shadow-xl"
            >
              <div className="flex items-start gap-3.5">
                <KeyRound className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#E1B76F]" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">Secure Your Account With a Password</p>
                  <p className="mt-1 text-xs text-stone-300">
                    Your account was generated during checkout. Set a password to easily sign in from any mobile device or desktop.
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <div className="flex-1">
                      <PasswordInput value={newPass} onChange={setNewPass} placeholder={PASSWORD_HINT} autoComplete="new-password" />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-xl bg-gradient-to-r from-[#E1B76F] to-[#edd19b] px-6 py-3 text-xs font-black uppercase tracking-wider text-[#240407] transition hover:brightness-105 disabled:opacity-50 cursor-pointer shadow-md"
                    >
                      Save password
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* User Profile Header Card */}
          <div className="rounded-3xl border border-[#E1B76F]/25 bg-[#25050a] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            {/* Top decorative gradient glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#E1B76F]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#530911] pb-6 gap-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-[#E1B76F] to-[#f4deb3] text-[#240407] font-black text-xl flex items-center justify-center shadow-lg border-2 border-white/20">
                  {userInitials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#E1B76F]">
                      ANGKON Luxury Member
                    </span>
                    <Sparkles className="h-3 w-3 text-[#E1B76F]" />
                  </div>
                  <h1 className="font-heading text-2xl sm:text-3xl font-black uppercase text-white mt-0.5">
                    Welcome, {user.name}
                  </h1>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-xs text-stone-300">
                    <span className="font-mono text-stone-300">{user.email}</span>
                    {user.emailVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-950/70 border border-green-500/40 px-2.5 py-0.5 text-[10px] font-bold uppercase text-green-300">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-950/70 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                        <AlertTriangle className="h-3 w-3" /> Unverified
                      </span>
                    )}
                    {user.phone && <span className="text-stone-400">• {user.phone}</span>}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                disabled={submitting}
                className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-[#E1B76F]/30 bg-[#3a060f] px-5 py-2.5 text-xs font-bold uppercase text-stone-200 hover:text-white hover:bg-[#E1B76F] hover:text-[#240407] transition shadow-md cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 relative z-10">
              <div className="rounded-2xl border border-[#530911] bg-[#1a0306] p-5 shadow-inner">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-300">Total Orders</span>
                  <Package className="h-5 w-5 text-[#E1B76F]" />
                </div>
                <p className="mt-3 text-3xl font-black text-white">{orders.length}</p>
                <p className="text-xs text-stone-400 mt-0.5">{orders.length === 1 ? "Order placed" : "Orders placed"}</p>
              </div>

              <div className="rounded-2xl border border-[#530911] bg-[#1a0306] p-5 shadow-inner">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-300">Total Fashion Purchased</span>
                  <ShoppingBag className="h-5 w-5 text-[#E1B76F]" />
                </div>
                <p className="mt-3 text-3xl font-black text-[#E1B76F]">৳{totalSpent.toLocaleString("en-BD")}</p>
                <p className="text-xs text-stone-400 mt-0.5">Across confirmed orders</p>
              </div>

              <div className="rounded-2xl border border-[#530911] bg-[#1a0306] p-5 shadow-inner">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-300">Primary Delivery Address</span>
                  <MapPin className="h-5 w-5 text-[#E1B76F]" />
                </div>
                <p className="mt-3 text-sm font-bold text-white truncate">
                  {user.addresses && user.addresses.length > 0
                    ? user.addresses[0].address
                    : orders.length > 0
                    ? orders[0].customer.address
                    : "No address recorded yet"}
                </p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {user.addresses && user.addresses.length > 0
                    ? `${user.addresses[0].city ? `${user.addresses[0].city}, ` : ""}${user.addresses[0].district}`
                    : orders.length > 0
                    ? orders[0].customer.district
                    : "Saved with your first order"}
                </p>
              </div>
            </div>

            {/* Portal Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-[#530911] mt-8 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab("orders")}
                className={`pb-3.5 px-4 text-xs font-bold uppercase tracking-wider transition border-b-2 cursor-pointer flex items-center gap-2 ${
                  activeTab === "orders"
                    ? "border-[#E1B76F] text-[#E1B76F]"
                    : "border-transparent text-stone-400 hover:text-white"
                }`}
              >
                <Package className="h-4 w-4" />
                Orders & Invoices
                <span className="ml-1 rounded-full bg-[#3d0710] px-2 py-0.5 text-[10px] text-stone-300">
                  {orders.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("addresses")}
                className={`pb-3.5 px-4 text-xs font-bold uppercase tracking-wider transition border-b-2 cursor-pointer flex items-center gap-2 ${
                  activeTab === "addresses"
                    ? "border-[#E1B76F] text-[#E1B76F]"
                    : "border-transparent text-stone-400 hover:text-white"
                }`}
              >
                <MapPin className="h-4 w-4" />
                Delivery Address
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("security")}
                className={`pb-3.5 px-4 text-xs font-bold uppercase tracking-wider transition border-b-2 cursor-pointer flex items-center gap-2 ${
                  activeTab === "security"
                    ? "border-[#E1B76F] text-[#E1B76F]"
                    : "border-transparent text-stone-400 hover:text-white"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Security & Access
              </button>
            </div>

            {/* Tab 1: Orders & Invoices Content */}
            {activeTab === "orders" && (
              <div className="mt-6">
                {orders.length === 0 ? (
                  <div className="rounded-2xl border border-[#530911] bg-[#1a0306] p-10 text-center shadow-inner">
                    <Clock className="h-12 w-12 text-stone-500 mx-auto mb-3" />
                    <p className="text-base font-bold text-white">No Orders Placed Yet</p>
                    <p className="text-xs text-stone-300 mt-1.5 max-w-md mx-auto leading-relaxed">
                      {user.emailVerified
                        ? "Any order placed using this account or your verified email will automatically appear here with complete tracking and downloadable official tax invoices."
                        : "Orders placed with this account appear here. Prior orders using your email address will synchronize once verified."}
                    </p>
                    <Link
                      href="/products"
                      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E1B76F] to-[#edd19b] px-6 py-3 text-xs font-black uppercase text-[#240407] hover:brightness-105 transition shadow-lg cursor-pointer"
                    >
                      Explore Luxury Collection <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((ord) => {
                      const isOrderPaid =
                        ord.paymentStatus === "paid" ||
                        (ord.paidAmount && ord.paidAmount >= ord.total);

                      return (
                        <div
                          key={ord.orderNumber}
                          className="rounded-2xl border border-[#530911] bg-[#1a0306] p-5 sm:p-6 transition hover:border-[#E1B76F]/50 shadow-lg"
                        >
                          {/* Order Header Row */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#530911]/60 pb-4">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="font-mono text-sm font-bold text-white">
                                #{ord.orderNumber}
                              </span>
                              <span className="text-xs text-stone-400 inline-flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-stone-400" />
                                {new Date(ord.createdAt).toLocaleDateString("en-BD", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                              {isOnlinePaymentMethod(ord.paymentMethod) ? (
                                <span className="rounded-full bg-[#3d0710] border border-[#E1B76F]/30 px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#E1B76F]">
                                  SSLCOMMERZ Online
                                </span>
                              ) : (
                                <span className="rounded-full bg-[#2a060c] border border-stone-600 px-2.5 py-0.5 text-[10px] font-bold uppercase text-stone-300">
                                  Cash on Delivery
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              {/* Payment Status Pill */}
                              {isOrderPaid ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-950/70 border border-green-500/40 px-2.5 py-0.5 text-[11px] font-bold uppercase text-green-300">
                                  <CheckCircle2 className="h-3 w-3" /> Paid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-950/70 border border-amber-500/40 px-2.5 py-0.5 text-[11px] font-bold uppercase text-amber-300">
                                  <Clock className="h-3 w-3" /> COD (Unpaid)
                                </span>
                              )}

                              {/* Fulfillment Status Pill */}
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#3b050b] border border-[#530911] px-3 py-0.5 text-[11px] font-bold uppercase text-stone-200">
                                {ord.orderStatus}
                              </span>

                              {/* Total Amount */}
                              <span className="text-base font-black text-[#E1B76F]">
                                ৳{Number(ord.total).toLocaleString("en-BD")}
                              </span>
                            </div>
                          </div>

                          {/* Order Details & Items */}
                          <div className="pt-4">
                            <p className="text-xs text-stone-300">
                              <strong className="text-white">Delivery to:</strong> {ord.customer.fullName} ({ord.customer.phone}) —{" "}
                              {ord.customer.address}, {ord.customer.district}
                            </p>

                            {/* Item preview chips */}
                            <div className="mt-3 flex flex-wrap gap-2">
                              {ord.items.map((it, idx) => (
                                <div
                                  key={idx}
                                  className="inline-flex items-center gap-2 rounded-lg bg-[#240407] border border-[#530911] px-3 py-1.5 text-xs text-stone-200 shadow-inner"
                                >
                                  {it.image && (
                                    <div className="relative h-6 w-6 rounded overflow-hidden flex-shrink-0 bg-stone-800">
                                      <Image
                                        src={it.image}
                                        alt={it.name}
                                        fill
                                        sizes="24px"
                                        className="object-cover"
                                      />
                                    </div>
                                  )}
                                  <span className="font-medium text-white">{it.name}</span>
                                  {it.size && (
                                    <span className="text-[10px] font-mono rounded bg-[#38060d] px-1.5 py-0.5 text-[#E1B76F]">
                                      {it.size}
                                    </span>
                                  )}
                                  <span className="text-stone-400 font-bold">× {it.quantity}</span>
                                </div>
                              ))}
                            </div>

                            {/* Courier Tracking Strip (if courier assigned) */}
                            {(ord.courier || ord.trackingCode || ord.consignmentId) && (() => {
                              const trackUrl = getCourierTrackingUrl(
                                ord.courier,
                                ord.trackingCode,
                                ord.consignmentId
                              );
                              const refCode = ord.trackingCode || ord.consignmentId;
                              return (
                                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E1B76F]/30 bg-[#240407] px-4 py-2.5 text-xs shadow-inner">
                                  <div className="flex flex-wrap items-center gap-2.5 text-stone-200">
                                    <Truck className="h-4 w-4 text-[#E1B76F]" />
                                    <span className="font-bold text-[#E1B76F]">
                                      {getCourierLabel(ord.courier)}
                                    </span>
                                    {ord.shipmentStatus && ord.shipmentStatus !== "none" && (
                                      <span className="rounded bg-[#530911] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                                        {ord.shipmentStatus.replace(/_/g, " ")}
                                      </span>
                                    )}
                                    {refCode && (
                                      <span className="font-mono text-stone-300">
                                        Tracking: {refCode}
                                      </span>
                                    )}
                                  </div>
                                  {trackUrl && (
                                    <a
                                      href={trackUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 font-bold text-[#E1B76F] hover:underline cursor-pointer"
                                    >
                                      Track Parcel <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Actions: View & Print Official Invoice */}
                            <div className="mt-4 pt-3 border-t border-[#530911]/60 flex flex-wrap items-center justify-between gap-3">
                              <span className="text-[11px] text-stone-400">
                                Official invoice includes tax details, transaction IDs & print view.
                              </span>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setSelectedInvoiceOrder(ord)}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E1B76F]/50 bg-[#2d060c] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#E1B76F] hover:bg-[#E1B76F] hover:text-[#240407] transition shadow-md cursor-pointer"
                                >
                                  <FileText className="h-3.5 w-3.5" /> View & Print Invoice
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Delivery Address Content */}
            {activeTab === "addresses" && (
              <div className="mt-6">
                <div className="rounded-2xl border border-[#530911] bg-[#1a0306] p-6 shadow-inner">
                  <div className="flex items-center justify-between border-b border-[#530911] pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#E1B76F]" /> Primary Delivery Address
                    </span>
                    <span className="rounded-full bg-green-950/80 border border-green-500/40 px-2 py-0.5 text-[10px] font-bold text-green-300 uppercase">
                      Default
                    </span>
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    {user.addresses && user.addresses.length > 0 ? (
                      user.addresses.map((addr, idx) => (
                        <div key={idx} className="space-y-1">
                          <p className="font-bold text-white">{addr.fullName || user.name}</p>
                          <p className="text-xs text-stone-300">{addr.phone || user.phone}</p>
                          <p className="text-xs text-stone-300">
                            {addr.address}, {addr.city ? `${addr.city}, ` : ""}{addr.district}
                          </p>
                        </div>
                      ))
                    ) : orders.length > 0 ? (
                      <div className="space-y-1">
                        <p className="font-bold text-white">{orders[0].customer.fullName}</p>
                        <p className="text-xs text-stone-300">{orders[0].customer.phone}</p>
                        <p className="text-xs text-stone-300">
                          {orders[0].customer.address}, {orders[0].customer.district}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-stone-400">
                        No delivery address saved yet. Your shipping address will be safely saved when you complete your first order.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Security & Access Content */}
            {activeTab === "security" && (
              <div className="mt-6 space-y-6">
                {/* Change Password Card */}
                <div className="rounded-2xl border border-[#530911] bg-[#1a0306] p-6 shadow-inner">
                  <div className="flex items-center justify-between border-b border-[#530911] pb-3">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-[#E1B76F]" /> Account Password
                      </h3>
                      <p className="text-xs text-stone-400 mt-1">
                        Ensure your account uses a secure password of at least 8 characters.
                      </p>
                    </div>
                    {user.hasPassword && (
                      <button
                        type="button"
                        onClick={() => setShowChangePassword((v) => !v)}
                        className="text-xs font-bold text-[#E1B76F] hover:underline cursor-pointer"
                      >
                        {showChangePassword ? "Cancel" : "Change password"}
                      </button>
                    )}
                  </div>

                  {(!user.hasPassword || showChangePassword) && (
                    <form onSubmit={handleSetPassword} className="mt-5 space-y-4 max-w-lg">
                      {user.hasPassword && (
                        <div>
                          <Label required>Current Password</Label>
                          <PasswordInput
                            value={currentPass}
                            onChange={setCurrentPass}
                            placeholder="Enter current password"
                            autoComplete="current-password"
                          />
                        </div>
                      )}
                      <div>
                        <Label required>New Password</Label>
                        <PasswordInput
                          value={newPass}
                          onChange={setNewPass}
                          placeholder={PASSWORD_HINT}
                          autoComplete="new-password"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-xl bg-gradient-to-r from-[#E1B76F] to-[#edd19b] px-6 py-2.5 text-xs font-black uppercase tracking-wider text-[#240407] hover:brightness-105 transition shadow-md disabled:opacity-50 cursor-pointer"
                      >
                        {submitting ? "Saving…" : "Update Password"}
                      </button>
                    </form>
                  )}
                </div>

                {/* Account Verification & Recovery */}
                <div className="rounded-2xl border border-[#530911] bg-[#1a0306] p-6 shadow-inner">
                  <div className="flex items-center justify-between border-b border-[#530911] pb-3">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <Mail className="h-4 w-4 text-[#E1B76F]" /> Email Verification Status
                      </h3>
                      <p className="text-xs text-stone-400 mt-1">
                        Registered email: <span className="font-mono text-white">{user.email}</span>
                      </p>
                    </div>
                    {user.emailVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-950/70 border border-green-500/40 px-3 py-1 text-xs font-bold uppercase text-green-300">
                        <ShieldCheck className="h-3.5 w-3.5" /> Verified
                      </span>
                    ) : (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("security");
                            openCodeVerification();
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          disabled={submitting}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#E1B76F] px-3.5 py-1.5 text-xs font-bold uppercase text-[#240407] hover:bg-[#edd19b] transition disabled:opacity-50 cursor-pointer"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" /> Verify with code
                        </button>
                        <button
                          type="button"
                          onClick={handleResend}
                          disabled={submitting}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E1B76F]/40 bg-[#3a060f] px-3.5 py-1.5 text-xs font-bold text-[#E1B76F] hover:bg-[#E1B76F] hover:text-[#240407] transition cursor-pointer"
                        >
                          <MailCheck className="h-3.5 w-3.5" /> Send link
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Official Printable Invoice Modal */}
        {selectedInvoiceOrder && (
          <InvoiceModal
            order={selectedInvoiceOrder}
            onClose={() => setSelectedInvoiceOrder(null)}
          />
        )}
      </div>
    );
  }

  /* ── Signed out ────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#220407] via-[#1a0306] to-[#120204] text-white py-12 px-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="text-center max-w-xl mx-auto mb-8">
        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#E1B76F] block">
          ANGKON • LUXURY ETHNIC COUTURE
        </span>
        <h1 className="mt-2 font-heading text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
          My Account
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-stone-300 max-w-md mx-auto leading-relaxed">
          Sign in to track orders in real-time, view official invoices, and manage your luxury wardrobe.
        </p>
      </div>

      <div className="mx-auto max-w-md mb-6">
        <NoticeBanner notice={notice} />
      </div>

      <div className="mx-auto max-w-md">
        {mode === "forgot" ? (
          <form
            onSubmit={handleForgot}
            className="space-y-5 rounded-3xl border border-[#E1B76F]/25 bg-[#25050a] p-6 sm:p-8 shadow-2xl animate-in fade-in duration-200"
          >
            <h2 className="font-heading text-2xl font-black uppercase text-white pb-3 border-b border-[#530911]">
              Reset password
            </h2>
            <p className="text-xs text-stone-300 leading-relaxed">
              Enter your email address and we&apos;ll send an official link to securely reset your password. This also works if your account was created with an order.
            </p>
            <div>
              <Label required>Email address</Label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className={inputClass}
                />
                <Mail className="absolute right-3 top-3.5 h-4 w-4 text-stone-400" />
              </div>
            </div>
            <button type="submit" disabled={submitting} className={primaryButton}>
              {submitting ? "Sending…" : "Send reset link"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("auth");
                setAuthTab("login");
              }}
              className="w-full text-xs font-bold text-[#E1B76F] hover:underline cursor-pointer pt-2"
            >
              ← Back to sign in
            </button>
          </form>
        ) : (
          <div className="rounded-3xl border border-[#E1B76F]/25 bg-[#25050a] p-6 sm:p-8 shadow-2xl">
            {/* Tab switcher: Toggle between Sign in & Create account */}
            <div className="flex rounded-2xl bg-[#1a0306] p-1.5 border border-[#530911] mb-6 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setAuthTab("login");
                  setNotice(null);
                }}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer ${
                  authTab === "login" || authTab === "code"
                    ? "bg-gradient-to-r from-[#E1B76F] to-[#edd19b] text-[#240407] shadow-md"
                    : "text-stone-300 hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab("register");
                  setNotice(null);
                }}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer ${
                  authTab === "register"
                    ? "bg-gradient-to-r from-[#E1B76F] to-[#edd19b] text-[#240407] shadow-md"
                    : "text-stone-300 hover:text-white"
                }`}
              >
                Create Account
              </button>
            </div>

            {authTab === "code" ? (
              /* Password-less sign-in with a code */
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!signInCodeSent) void sendSignInCode();
                  else if (signInCode.length === 6) void handleCodeSignIn(signInCode);
                }}
                className="space-y-4 animate-in fade-in duration-200"
              >
                <h2 className="font-heading text-2xl font-black uppercase text-white pb-2 border-b border-[#530911]">
                  Sign in with a code
                </h2>
                <p className="text-xs text-stone-400 leading-relaxed">
                  No password needed. We email a 6-digit code to your address — perfect for accounts created
                  with your order, or if you can&apos;t remember your password.
                </p>
                <div>
                  <Label required>Email address</Label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => {
                        setLoginEmail(e.target.value);
                        setSignInCodeError(null);
                      }}
                      placeholder="name@example.com"
                      autoComplete="email"
                      className={inputClass}
                    />
                    <Mail className="absolute right-3 top-3.5 h-4 w-4 text-stone-400" />
                  </div>
                </div>

                {signInCodeSent && (
                  <div>
                    <Label required>6-digit code</Label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={signInCode}
                      disabled={signInCodeBusy}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                        setSignInCode(digits);
                        setSignInCodeError(null);
                        if (digits.length === 6) void handleCodeSignIn(digits);
                      }}
                      placeholder="••••••"
                      aria-label="6-digit sign-in code"
                      className={`${inputClass} text-center font-mono text-lg tracking-[0.4em]`}
                    />
                    <p className="mt-1 text-[11px] text-stone-400">
                      Code sent to <span className="font-mono text-stone-200">{loginEmail.trim()}</span> · expires
                      in 10 minutes
                    </p>
                  </div>
                )}

                {signInCodeError && (
                  <p className="text-xs font-semibold text-rose-300">{signInCodeError}</p>
                )}

                <button type="submit" disabled={signInCodeBusy || (signInCodeSent && signInCode.length !== 6)} className={primaryButton}>
                  {signInCodeBusy
                    ? signInCodeSent
                      ? "Verifying…"
                      : "Sending…"
                    : signInCodeSent
                      ? "Verify & sign in"
                      : "Email me a code"}
                </button>

                {signInCodeSent && (
                  <button
                    type="button"
                    onClick={() => void sendSignInCode()}
                    disabled={signInCodeBusy || signInResendAfter > 0}
                    className="w-full text-xs font-bold text-[#E1B76F] hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed cursor-pointer"
                  >
                    {signInResendAfter > 0 ? `Resend code in ${signInResendAfter}s` : "Resend code"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setAuthTab("login");
                    setSignInCodeSent(false);
                    setSignInCode("");
                    setSignInCodeError(null);
                  }}
                  className="w-full text-xs font-bold text-stone-300 hover:text-white hover:underline cursor-pointer pt-2"
                >
                  ← Back to password sign-in
                </button>
              </form>
            ) : authTab === "login" ? (
              /* Sign in Form */
              <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in duration-200">
                <h2 className="font-heading text-2xl font-black uppercase text-white pb-2 border-b border-[#530911]">
                  Sign in
                </h2>
                <div>
                  <Label required>Email address</Label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="name@example.com"
                      autoComplete="email"
                      className={inputClass}
                    />
                    <Mail className="absolute right-3 top-3.5 h-4 w-4 text-stone-400" />
                  </div>
                </div>
                <div>
                  <Label required>Password</Label>
                  <PasswordInput
                    value={loginPass}
                    onChange={setLoginPass}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSignInCodeSent(false);
                      setSignInCode("");
                      setSignInCodeError(null);
                      setNotice(null);
                      setAuthTab("code");
                    }}
                    className="text-xs font-bold text-[#E1B76F] hover:underline cursor-pointer"
                    title="No password needed — we email you a 6-digit code"
                  >
                    Sign in with a code
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(loginEmail);
                      setNotice(null);
                      setMode("forgot");
                    }}
                    className="text-xs font-bold text-[#E1B76F] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <button type="submit" disabled={submitting} className={primaryButton}>
                  {submitting ? "Signing in…" : "Sign in"}
                </button>
                <div className="pt-4 border-t border-[#530911] text-center text-xs text-stone-300">
                  Don&apos;t have an account yet?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab("register");
                      setNotice(null);
                    }}
                    className="font-bold text-[#E1B76F] hover:underline cursor-pointer"
                  >
                    Create an account
                  </button>
                </div>
              </form>
            ) : (
              /* Register Form */
              <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in duration-200">
                <h2 className="font-heading text-2xl font-black uppercase text-white pb-2 border-b border-[#530911]">
                  Create account
                </h2>
                <div>
                  <Label required>Full name</Label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Your full name"
                      autoComplete="name"
                      className={inputClass}
                    />
                    <UserIcon className="absolute right-3 top-3.5 h-4 w-4 text-stone-400" />
                  </div>
                </div>
                <div>
                  <Label required>Email address</Label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="name@example.com"
                      autoComplete="email"
                      className={inputClass}
                    />
                    <Mail className="absolute right-3 top-3.5 h-4 w-4 text-stone-400" />
                  </div>
                </div>
                <div>
                  <Label>Phone number</Label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      autoComplete="tel"
                      className={inputClass}
                    />
                    <Phone className="absolute right-3 top-3.5 h-4 w-4 text-stone-400" />
                  </div>
                </div>
                <div>
                  <Label required>Password</Label>
                  <PasswordInput
                    value={regPass}
                    onChange={setRegPass}
                    placeholder={PASSWORD_HINT}
                    autoComplete="new-password"
                  />
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  We&apos;ll email you a link to verify your address. By creating an account you agree to our{" "}
                  <Link href="/privacy-policy" className="text-[#E1B76F] underline">
                    Privacy Policy
                  </Link>.
                </p>
                <button type="submit" disabled={submitting} className={primaryButton}>
                  {submitting ? "Creating account…" : "Create account"}
                </button>
                <div className="pt-4 border-t border-[#530911] text-center text-xs text-stone-300">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab("login");
                      setNotice(null);
                    }}
                    className="font-bold text-[#E1B76F] hover:underline cursor-pointer"
                  >
                    Sign in
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
