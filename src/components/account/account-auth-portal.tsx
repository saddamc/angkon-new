"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { requestEmailCode } from "@/components/checkout/email-verify-dialog";
import {
  ArrowRight,
  ChevronRight,
  FileText,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Truck,
  User as UserIcon,
} from "lucide-react";
import type { AccountNotice, AccountUserProfile } from "@/types/account";
import {
  AccountFieldLabel,
  AccountNoticeBanner,
  AccountPasswordInput,
  accountInputClass,
  accountPrimaryBtnClass,
  postJson,
} from "./account-ui";

const PASSWORD_HINT = "At least 8 characters, with a letter and a number";

interface AccountAuthPortalProps {
  initialAuthTab?: "login" | "register" | "code";
  notice: AccountNotice;
  onNotice: (n: AccountNotice) => void;
  onAuthenticated: () => Promise<void>;
}

export function AccountAuthPortal({
  initialAuthTab = "login",
  notice,
  onNotice,
  onAuthenticated,
}: AccountAuthPortalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"auth" | "forgot">("auth");
  const [authTab, setAuthTab] = useState<"login" | "register" | "code">(initialAuthTab);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPass, setRegPass] = useState("");

  const [forgotEmail, setForgotEmail] = useState("");

  // Password-less sign-in with a 6-digit email code (ideal for checkout-created accounts).
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

  const runTask = async (fn: () => Promise<void>) => {
    setSubmitting(true);
    onNotice(null);
    try {
      await fn();
    } catch {
      onNotice({ text: "Network error. Please check your connection and try again.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    void runTask(async () => {
      const { ok, data } = await postJson("/api/auth/login", { email: loginEmail, password: loginPass });
      if (!ok) {
        if (data.code === "NO_PASSWORD") {
          setForgotEmail(loginEmail);
          setMode("forgot");
        }
        onNotice({ text: data.error || "Sign in failed.", type: "error" });
        return;
      }
      setLoginPass("");
      await onAuthenticated();
    });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    void runTask(async () => {
      const { ok, data } = await postJson("/api/auth/register", {
        name: regName,
        email: regEmail,
        phone: regPhone,
        password: regPass,
      });
      if (!ok) {
        onNotice({ text: data.error || "Registration failed.", type: "error" });
        return;
      }
      setRegPass("");
      await onAuthenticated();
      if (data.emailSent === false) {
        onNotice({
          text:
            "Your account is ready, but we couldn't send the verification email right now. Use the “Verify with code” button above to confirm your address instantly.",
          type: "error",
        });
        return;
      }
      const created = data.user as AccountUserProfile | undefined;
      onNotice({
        text: `Welcome to ANGKON! We sent a verification link to ${created?.email ?? regEmail}.`,
        type: "success",
      });
    });
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    void runTask(async () => {
      const { ok, data } = await postJson("/api/auth/forgot-password", { email: forgotEmail });
      onNotice({
        text: ok ? data.message : data.error || "Something went wrong.",
        type: ok ? "success" : "error",
      });
    });
  };

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
      await onAuthenticated();
      setAuthTab("login");
      setSignInCodeSent(false);
      setSignInCode("");
      onNotice({
        text: "Signed in with a code. Set a password on your account so you can sign in faster next time.",
        type: "success",
      });
    } catch {
      setSignInCodeError("Network error. Please check your connection and try again.");
    } finally {
      setSignInCodeBusy(false);
    }
  };

  const memberPrivileges = [
    {
      icon: Truck,
      title: "Live Steadfast Tracking",
      desc: "Watch parcel pickup, transit milestones, and delivery status in one dashboard.",
    },
    {
      icon: FileText,
      title: "Official A4 Tax Invoices",
      desc: "View and print itemized invoices with payment and refund records anytime.",
    },
    {
      icon: MapPin,
      title: "Saved Express Addresses",
      desc: "Manage default Dhaka and nationwide addresses for effortless one-tap checkout.",
    },
    {
      icon: ShieldCheck,
      title: "Verified Order Protection",
      desc: "Auto-sync past guest orders and manage eligible cancellations transparently.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#530911] bg-gradient-to-b from-[#5d0a14] via-[#530911] to-[#42070d] text-white pb-28">
      {/* Checkout-matched Storefront Breadcrumb Bar */}
      <div className="border-b border-[#E1B76F]/20 bg-[#42070e]">
        <div className="mx-auto max-w-5xl flex h-11 items-center gap-2 px-4 sm:px-6 text-xs text-white/85 font-medium">
          <Link href="/" className="transition hover:text-white">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 opacity-60" />
          <span className="font-bold text-[#E1B76F]">My Account</span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-7 sm:pt-12 space-y-6">
        <AccountNoticeBanner notice={notice} onDismiss={() => onNotice(null)} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Editorial Brand Atelier Column (below Auth Card on mobile so customers can sign in right away) */}
          <div className="order-2 lg:order-1 lg:col-span-5 space-y-6 pt-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E1B76F]/40 bg-[#3b050b] px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#E1B76F]">
                <Sparkles className="h-3.5 w-3.5" />
                ANGKON Atelier Portal
              </div>
              <h1 className="mt-4 font-heading text-3xl sm:text-4xl font-black uppercase tracking-tight text-white leading-[1.12]">
                Your Orders, <span className="text-[#E1B76F]">Tailored</span> in One Place
              </h1>
              <p className="mt-3 text-sm text-[#F5EAE0] leading-relaxed">
                Sign in with your password or an instant 6-digit email code — even if your account was created automatically at checkout.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              {memberPrivileges.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex items-start gap-3.5 rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-4 shadow-md"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E1B76F]/35 bg-[#2b0408] text-[#E1B76F]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-white">{item.title}</p>
                      <p className="mt-0.5 text-xs text-[#EADBC8] leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-4 flex items-center justify-between gap-3 shadow-md">
              <div>
                <p className="text-xs font-bold text-white">Only need to check delivery status?</p>
                <p className="text-xs text-[#EADBC8] mt-0.5">Track any parcel using your order ID and phone.</p>
              </div>
              <Link
                href="/track"
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-[#E1B76F]/45 bg-[#2b0408] px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-[#E1B76F] hover:bg-[#4b0810] transition"
              >
                Track Order <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Elevated Wine Auth Form Column */}
          <div className="order-1 lg:order-2 lg:col-span-7">
            {mode === "forgot" ? (
              <div className="rounded-3xl border border-[#E1B76F]/30 bg-[#3b050b] p-6 sm:p-8 shadow-2xl space-y-5">
                <div className="border-b border-[#E1B76F]/15 pb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E1B76F]/35 bg-[#2b0408]">
                    <KeyRound className="h-5 w-5 text-[#E1B76F]" />
                  </div>
                  <div>
                    <h2 className="font-heading text-xl font-black uppercase text-white">Reset Password</h2>
                    <p className="text-xs text-[#EADBC8] mt-0.5">We will email a one-time setup or reset link.</p>
                  </div>
                </div>
                <form onSubmit={handleForgot} className="space-y-4">
                  <p className="text-xs sm:text-sm text-[#F5EAE0] leading-relaxed">
                    Enter the email address associated with your order and we&apos;ll send a secure link valid for 1 hour.
                  </p>
                  <div>
                    <AccountFieldLabel required>Email address</AccountFieldLabel>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@example.com"
                      autoComplete="email"
                      className={accountInputClass}
                    />
                  </div>
                  <button type="submit" disabled={submitting} className={accountPrimaryBtnClass}>
                    {submitting ? "Sending link…" : "Send reset link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("auth");
                      onNotice(null);
                    }}
                    className="block w-full text-center text-xs font-bold uppercase tracking-wider text-[#E1B76F] hover:underline pt-2 cursor-pointer"
                  >
                    ← Back to sign in
                  </button>
                </form>
              </div>
            ) : (
              <div className="rounded-3xl border border-[#E1B76F]/30 bg-[#3b050b] p-6 sm:p-8 shadow-2xl space-y-6">
                {/* Refined Auth Switcher */}
                <div className="grid grid-cols-[0.82fr_0.96fr_1.22fr] sm:grid-cols-3 rounded-2xl bg-[#240407] p-1 border border-[#E1B76F]/25 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab("login");
                      onNotice(null);
                    }}
                    className={`rounded-xl py-2.5 px-1 sm:px-2 whitespace-nowrap text-[10px] sm:text-xs font-black uppercase tracking-normal sm:tracking-wider transition cursor-pointer ${
                      authTab === "login"
                        ? "bg-gradient-to-r from-[#E1B76F] to-[#edd19b] text-[#2a0408] shadow-md"
                        : "text-white/80 hover:text-white"
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab("code");
                      setSignInCodeError(null);
                      onNotice(null);
                    }}
                    className={`rounded-xl py-2.5 px-1 sm:px-2 whitespace-nowrap text-[10px] sm:text-xs font-black uppercase tracking-normal sm:tracking-wider transition cursor-pointer ${
                      authTab === "code"
                        ? "bg-gradient-to-r from-[#E1B76F] to-[#edd19b] text-[#2a0408] shadow-md"
                        : "text-white/80 hover:text-white"
                    }`}
                  >
                    Quick Code
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab("register");
                      onNotice(null);
                    }}
                    className={`rounded-xl py-2.5 px-1 sm:px-2 whitespace-nowrap text-[10px] sm:text-xs font-black uppercase tracking-normal sm:tracking-wider transition cursor-pointer ${
                      authTab === "register"
                        ? "bg-gradient-to-r from-[#E1B76F] to-[#edd19b] text-[#2a0408] shadow-md"
                        : "text-white/80 hover:text-white"
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                {authTab === "login" ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <AccountFieldLabel required>Email address</AccountFieldLabel>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="name@example.com"
                          autoComplete="email"
                          className={`${accountInputClass} pr-10`}
                        />
                        <Mail className="absolute right-3.5 top-3.5 h-4 w-4 text-white/60" />
                      </div>
                    </div>
                    <div>
                      <AccountFieldLabel required>Password</AccountFieldLabel>
                      <AccountPasswordInput
                        value={loginPass}
                        onChange={setLoginPass}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab("code");
                          setSignInCodeError(null);
                          onNotice(null);
                        }}
                        className="font-semibold text-[#E1B76F] hover:underline cursor-pointer"
                      >
                        Sign in with a code
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(loginEmail);
                          setMode("forgot");
                          onNotice(null);
                        }}
                        className="font-semibold text-white/85 hover:text-[#E1B76F] cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <button type="submit" disabled={submitting} className={accountPrimaryBtnClass}>
                      {submitting ? "Signing in…" : "Sign in to Account"}
                    </button>
                    <p className="text-center text-xs text-[#EADBC8] pt-2 border-t border-[#E1B76F]/15">
                      Ordered at checkout without setting a password?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab("code");
                          setSignInCodeError(null);
                          onNotice(null);
                        }}
                        className="font-bold text-[#E1B76F] hover:underline cursor-pointer"
                      >
                        Use 6-digit email code
                      </button>
                    </p>
                  </form>
                ) : authTab === "code" ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!signInCodeSent) void sendSignInCode();
                      else if (signInCode.length === 6) void handleCodeSignIn(signInCode);
                    }}
                    className="space-y-4"
                  >
                    <div className="rounded-xl border border-[#E1B76F]/25 bg-[#2b0408] p-3.5 text-xs text-[#F5EAE0] leading-relaxed">
                      Enter your checkout or account email. We&apos;ll send a 6-digit code that verifies your email and signs you in immediately — no password required.
                    </div>
                    <div>
                      <AccountFieldLabel required>Email address</AccountFieldLabel>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={loginEmail}
                          onChange={(e) => {
                            setLoginEmail(e.target.value);
                            setSignInCodeSent(false);
                            setSignInCode("");
                            setSignInCodeError(null);
                          }}
                          placeholder="name@example.com"
                          autoComplete="email"
                          className={`${accountInputClass} pr-10`}
                        />
                        <Mail className="absolute right-3.5 top-3.5 h-4 w-4 text-white/60" />
                      </div>
                    </div>

                    {signInCodeSent && (
                      <div>
                        <AccountFieldLabel required>6-digit verification code</AccountFieldLabel>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          autoFocus
                          autoComplete="one-time-code"
                          value={signInCode}
                          disabled={signInCodeBusy}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                            setSignInCode(digits);
                            setSignInCodeError(null);
                            if (digits.length === 6) void handleCodeSignIn(digits);
                          }}
                          placeholder="000000"
                          className={`${accountInputClass} text-center font-mono text-2xl tracking-[0.45em] font-bold`}
                        />
                        <p className="mt-1.5 text-xs text-[#EADBC8] text-center">
                          Code emailed to <span className="text-white font-semibold">{loginEmail.trim()}</span>
                        </p>
                      </div>
                    )}

                    {signInCodeError && (
                      <p role="alert" className="rounded-xl border border-rose-400/45 bg-[#4a0710] p-3 text-xs text-rose-100 font-medium">
                        {signInCodeError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={signInCodeBusy || (signInCodeSent && signInCode.length < 6)}
                      className={accountPrimaryBtnClass}
                    >
                      {signInCodeBusy
                        ? signInCodeSent
                          ? "Verifying code…"
                          : "Sending code…"
                        : signInCodeSent
                        ? "Verify & Sign in"
                        : "Email me a 6-digit code"}
                    </button>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E1B76F]/15">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab("login");
                          setSignInCodeError(null);
                        }}
                        className="font-semibold text-white/85 hover:text-[#E1B76F] cursor-pointer"
                      >
                        ← Back to password login
                      </button>
                      {signInCodeSent && (
                        <button
                          type="button"
                          disabled={signInResendAfter > 0 || signInCodeBusy}
                          onClick={() => void sendSignInCode()}
                          className="font-semibold text-[#E1B76F] hover:underline disabled:opacity-50 cursor-pointer"
                        >
                          {signInResendAfter > 0 ? `Resend in ${signInResendAfter}s` : "Resend code"}
                        </button>
                      )}
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <AccountFieldLabel required>Full name</AccountFieldLabel>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            placeholder="Your full name"
                            autoComplete="name"
                            className={`${accountInputClass} pr-10`}
                          />
                          <UserIcon className="absolute right-3.5 top-3.5 h-4 w-4 text-white/60" />
                        </div>
                      </div>
                      <div>
                        <AccountFieldLabel>Phone number</AccountFieldLabel>
                        <div className="relative">
                          <input
                            type="tel"
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            placeholder="017XXXXXXXX"
                            autoComplete="tel"
                            className={`${accountInputClass} pr-10`}
                          />
                          <Phone className="absolute right-3.5 top-3.5 h-4 w-4 text-white/60" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <AccountFieldLabel required>Email address</AccountFieldLabel>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="name@example.com"
                          autoComplete="email"
                          className={`${accountInputClass} pr-10`}
                        />
                        <Mail className="absolute right-3.5 top-3.5 h-4 w-4 text-white/60" />
                      </div>
                    </div>
                    <div>
                      <AccountFieldLabel required>Password</AccountFieldLabel>
                      <AccountPasswordInput
                        value={regPass}
                        onChange={setRegPass}
                        placeholder={PASSWORD_HINT}
                        autoComplete="new-password"
                      />
                    </div>
                    <p className="text-xs text-[#EADBC8] leading-relaxed">
                      We&apos;ll email a verification link so past and future orders stay synced.{" "}
                      <Link href="/privacy-policy" className="text-[#E1B76F] underline">
                        Privacy Policy
                      </Link>
                      .
                    </p>
                    <button type="submit" disabled={submitting} className={accountPrimaryBtnClass}>
                      {submitting ? "Creating account…" : "Create My Account"}
                    </button>
                    <p className="text-center text-xs text-[#EADBC8] pt-2 border-t border-[#E1B76F]/15">
                      Already ordered or registered?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab("login");
                          onNotice(null);
                        }}
                        className="font-bold text-[#E1B76F] hover:underline cursor-pointer"
                      >
                        Sign in
                      </button>
                    </p>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
