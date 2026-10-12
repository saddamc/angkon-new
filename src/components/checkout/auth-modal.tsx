"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Sparkles,
} from "lucide-react";

export interface AuthModalUser {
  id?: string;
  name?: string;
  email: string;
  phone?: string;
  emailVerified: boolean;
  addresses?: Array<{
    address: string;
    city: string;
    district: string;
    postalCode?: string;
    isDefault?: boolean;
  }>;
}

interface AuthModalProps {
  isOpen: boolean;
  initialView?: "login" | "register" | "forgot";
  onClose: () => void;
  onSuccess: (user: AuthModalUser) => void;
}

export function AuthModal({
  isOpen,
  initialView = "login",
  onClose,
  onSuccess,
}: AuthModalProps) {
  const [view, setView] = useState<"login" | "register" | "forgot">(initialView);
  const [loginMethod, setLoginMethod] = useState<"password" | "otp">("password");

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setView(initialView);
    setError(null);
    setSuccessMsg(null);
    setOtpSent(false);
  }, [initialView, isOpen]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  // ── 1. Password Login ──
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Invalid email or password.");
        return;
      }
      onSuccess(data.user as AuthModalUser);
      onClose();
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── 2. Request OTP Code ──
  const handleSendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError("Please enter a valid email address first.");
      emailInputRef.current?.focus();
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/auth/email-code/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, name: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Unable to send verification code. Please try again.");
        return;
      }
      setOtpSent(true);
      setCountdown(data.resendAfterSeconds || 60);
      setSuccessMsg(`We sent a 6-digit code to ${cleanEmail}. Check your inbox.`);
    } catch {
      setError("Failed to send code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── 3. Verify OTP Code ──
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = (codeToVerify || otpCode).trim();
    if (!code || code.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/email-code/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code,
          name: name.trim(),
          phone: phone.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Invalid verification code.");
        return;
      }
      onSuccess(data.user as AuthModalUser);
      onClose();
    } catch {
      setError("Verification failed. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // ── 4. Account Registration ──
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (cleanPhone && !/^(?:\+?88)?01[3-9]\d{8}$/.test(cleanPhone)) {
      setError("Please enter a valid 11-digit Bangladeshi phone number (e.g. 017XXXXXXXX).");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password,
          phone: cleanPhone,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to create account. Please try again.");
        return;
      }
      onSuccess(data.user as AuthModalUser);
      onClose();
    } catch {
      setError("Registration error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // ── 5. Forgot Password ──
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not send password reset link.");
        return;
      }
      setSuccessMsg("We sent a password reset link to your email. Please check your inbox and spam folder.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Angkon Authentication"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-[#E1B76F]/30 bg-[#260302] p-6 sm:p-8 shadow-2xl text-white animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Brand Header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#400604] border border-[#E1B76F]/40 text-[#E1B76F] shadow-inner">
            <ShieldCheck className="h-6 w-6 text-[#E1B76F]" />
          </div>
          <h2 className="font-serif text-2xl font-bold tracking-wide text-white">
            {view === "login" && "Welcome Back to Angkon"}
            {view === "register" && "Create Your Angkon Account"}
            {view === "forgot" && "Reset Your Password"}
          </h2>
          <p className="mt-1 text-xs text-white/70">
            {view === "login" && "Sign in to access your saved delivery address & past orders."}
            {view === "register" && "Enjoy instant order tracking, saved addresses & royal privileges."}
            {view === "forgot" && "Enter your email to receive a secure password reset link."}
          </p>
        </div>

        {/* Top Switcher Tabs (Login vs Register) */}
        {view !== "forgot" && (
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#1e0202] p-1 border border-[#E1B76F]/20 mb-5 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setView("login");
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-lg transition cursor-pointer ${
                view === "login"
                  ? "bg-[#400604] text-[#E1B76F] shadow-sm border border-[#E1B76F]/40"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setView("register");
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-lg transition cursor-pointer ${
                view === "register"
                  ? "bg-[#400604] text-[#E1B76F] shadow-sm border border-[#E1B76F]/40"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Feedback Alerts */}
        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/50 bg-rose-950/40 p-3 text-xs text-rose-200 flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-200 flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            <span className="leading-snug">{successMsg}</span>
          </div>
        )}

        {/* ── VIEW 1: LOGIN ── */}
        {view === "login" && (
          <div>
            {/* Sub-tab: Password vs One-Time Code */}
            <div className="flex items-center justify-center gap-4 mb-4 text-xs">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod("password");
                  setError(null);
                }}
                className={`pb-1 font-semibold transition border-b-2 cursor-pointer ${
                  loginMethod === "password"
                    ? "border-[#E1B76F] text-[#E1B76F]"
                    : "border-transparent text-white/50 hover:text-white"
                }`}
              >
                Password Login
              </button>
              <span className="text-white/20">|</span>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod("otp");
                  setError(null);
                }}
                className={`pb-1 font-semibold transition border-b-2 cursor-pointer ${
                  loginMethod === "otp"
                    ? "border-[#E1B76F] text-[#E1B76F]"
                    : "border-transparent text-white/50 hover:text-white"
                }`}
              >
                Email Code (OTP)
              </button>
            </div>

            {/* A. Password Login Form */}
            {loginMethod === "password" ? (
              <form onSubmit={handlePasswordLogin} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/80 mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <input
                      ref={emailInputRef}
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="h-11 w-full rounded-xl border border-[#E1B76F]/30 bg-[#340402] pl-10 pr-3 text-sm text-white outline-none placeholder:text-[#E1B76F]/30 focus:border-[#E1B76F] transition"
                    />
                    <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E1B76F]/60" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setView("forgot")}
                      className="text-[11px] text-[#E1B76F] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      autoComplete="current-password"
                      className="h-11 w-full rounded-xl border border-[#E1B76F]/30 bg-[#340402] pl-10 pr-10 text-sm text-white outline-none placeholder:text-[#E1B76F]/30 focus:border-[#E1B76F] transition"
                    />
                    <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E1B76F]/60" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 h-11 rounded-xl bg-[#E1B76F] text-[#400604] font-bold text-sm tracking-wide uppercase hover:bg-[#f3cb87] active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In & Return to Checkout"}
                </button>
              </form>
            ) : (
              /* B. Email Code (OTP) Passwordless Login */
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/80 mb-1.5">
                    Email address
                  </label>
                  <div className="relative flex items-center">
                    <input
                      ref={emailInputRef}
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="h-11 w-full rounded-xl border border-[#E1B76F]/30 bg-[#340402] pl-10 pr-24 text-sm text-white outline-none placeholder:text-[#E1B76F]/30 focus:border-[#E1B76F] transition"
                    />
                    <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E1B76F]/60" />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading || countdown > 0}
                      className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-[#E1B76F] text-[#400604] text-[11px] font-bold uppercase hover:bg-[#f3cb87] transition disabled:opacity-50 cursor-pointer flex items-center gap-1"
                    >
                      {loading && !otpSent ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : countdown > 0 ? (
                        `${countdown}s`
                      ) : otpSent ? (
                        "Resend"
                      ) : (
                        "Send Code"
                      )}
                    </button>
                  </div>
                </div>

                {otpSent && (
                  <div className="space-y-2 pt-1 animate-in fade-in">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-white/80">
                      Enter 6-digit Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                          setOtpCode(digits);
                          if (digits.length === 6) {
                            void handleVerifyOtp(digits);
                          }
                        }}
                        placeholder="123456"
                        className="h-11 w-full text-center font-mono text-lg font-bold tracking-[0.3em] rounded-xl border border-[#E1B76F]/40 bg-[#1e0202] text-white outline-none focus:border-[#E1B76F]"
                      />
                      <button
                        type="button"
                        onClick={() => handleVerifyOtp()}
                        disabled={loading || otpCode.length !== 6}
                        className="px-5 rounded-xl bg-[#E1B76F] text-[#400604] text-xs font-bold uppercase hover:bg-[#f3cb87] transition disabled:opacity-50 cursor-pointer shrink-0 flex items-center gap-1.5"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── VIEW 2: REGISTER ── */}
        {view === "register" && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/80 mb-1.5">
                Full name <span className="text-[#E1B76F]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Asif Mahmud"
                  className="h-11 w-full rounded-xl border border-[#E1B76F]/30 bg-[#340402] pl-10 pr-3 text-sm text-white outline-none placeholder:text-[#E1B76F]/30 focus:border-[#E1B76F] transition"
                />
                <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E1B76F]/60" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/80 mb-1.5">
                Phone number <span className="text-white/40">(Recommended for delivery)</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="h-11 w-full rounded-xl border border-[#E1B76F]/30 bg-[#340402] pl-10 pr-3 text-sm text-white outline-none placeholder:text-[#E1B76F]/30 focus:border-[#E1B76F] transition"
                />
                <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E1B76F]/60" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/80 mb-1.5">
                Email address <span className="text-[#E1B76F]">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="h-11 w-full rounded-xl border border-[#E1B76F]/30 bg-[#340402] pl-10 pr-3 text-sm text-white outline-none placeholder:text-[#E1B76F]/30 focus:border-[#E1B76F] transition"
                />
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E1B76F]/60" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/80 mb-1.5">
                Password <span className="text-[#E1B76F]">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password (min. 6 characters)"
                  className="h-11 w-full rounded-xl border border-[#E1B76F]/30 bg-[#340402] pl-10 pr-10 text-sm text-white outline-none placeholder:text-[#E1B76F]/30 focus:border-[#E1B76F] transition"
                />
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E1B76F]/60" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 h-11 rounded-xl bg-[#E1B76F] text-[#400604] font-bold text-sm tracking-wide uppercase hover:bg-[#f3cb87] active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account & Continue"}
            </button>
          </form>
        )}

        {/* ── VIEW 3: FORGOT PASSWORD ── */}
        {view === "forgot" && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/80 mb-1.5">
                Your account email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-xl border border-[#E1B76F]/30 bg-[#340402] pl-10 pr-3 text-sm text-white outline-none placeholder:text-[#E1B76F]/30 focus:border-[#E1B76F] transition"
                />
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E1B76F]/60" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#E1B76F] text-[#400604] font-bold text-sm tracking-wide uppercase hover:bg-[#f3cb87] active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Password Reset Link"}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setView("login");
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-xs text-[#E1B76F] hover:underline cursor-pointer"
              >
                ← Back to Login
              </button>
            </div>
          </form>
        )}

        {/* ── Social Login inside modal (keeps checkout form clean!) ── */}
        {view !== "forgot" && (
          <div className="mt-6 pt-5 border-t border-[#E1B76F]/20 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-3">
              Or connect securely with
            </p>
            <div className="flex items-center justify-center gap-3">
              {/* Facebook Button */}
              <button
                type="button"
                onClick={() => {
                  // Direct to social provider or friendly prompt
                  setError("Social sign-in will connect to your account.");
                }}
                className="flex items-center gap-2 h-10 px-4 rounded-xl bg-[#1877F2] text-white text-xs font-semibold hover:opacity-90 transition cursor-pointer shadow-sm"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Facebook</span>
              </button>

              {/* Google Button */}
              <button
                type="button"
                onClick={() => {
                  setError("Google sign-in will connect to your account.");
                }}
                className="flex items-center gap-2 h-10 px-4 rounded-xl bg-white text-stone-800 text-xs font-semibold hover:bg-stone-100 transition cursor-pointer shadow-sm"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.25 21.31 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.6H1.26C.46 8.2.01 10.04.01 12c0 1.96.45 3.8 1.25 5.4l4.02-3.13z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.69 1.26 6.6l4.02 3.13c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Google</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer helper */}
        <p className="mt-5 text-[11px] text-center text-white/50 leading-relaxed">
          Your personal details are encrypted and securely authenticated with Angkon&apos;s privacy standard.
        </p>
      </div>
    </div>
  );
}
