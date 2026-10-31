"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, KeyRound, Mail, ArrowLeft } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [view, setView] = useState<"login" | "forgot">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot password states
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  // If already logged in, redirect straight to dashboard
  useEffect(() => {
    fetch("/api/admin/login")
      .then((res) => {
        if (res.ok) {
          router.replace("/admin/dashboard");
        }
      })
      .catch(() => {});
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid credentials");
        return;
      }
      router.replace("/admin/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotStatus(null);
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setForgotStatus({ type: "error", text: data.error || "Failed to send reset link." });
        return;
      }
      setForgotStatus({
        type: "success",
        text: "Reset link sent! Please check your email inbox (and spam folder) for instructions to set a new password.",
      });
    } catch {
      setForgotStatus({ type: "error", text: "Network error. Please try again." });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f0f8] flex items-center justify-center p-4 relative overflow-hidden font-sans antialiased text-gray-800">
      {/* Background ambient SaaS glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-purple-500/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-indigo-500/10 blur-[100px]" />
        <div className="absolute top-1/3 left-0 h-48 w-48 rounded-full bg-purple-600/5 blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#400604] border border-stone-200/90 shadow-lg p-1.5 mb-3">
            <Image
              src="/logo.jpeg"
              alt="ANGKON Logo"
              width={80}
              height={80}
              priority
              className="h-full w-full rounded-xl object-cover"
            />
          </div>
          <div className="text-center">
            <h1 className="font-serif text-[24px] font-bold tracking-[0.22em] text-[#400604] uppercase">
              ANGKON
            </h1>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-purple-100/80 bg-white p-8 shadow-[0_20px_50px_rgba(123,97,255,0.08)]">
          {view === "login" ? (
            <form onSubmit={onSubmit} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                  Username or Email
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="Username or email"
                  className="w-full rounded-xl bg-stone-50 border border-stone-200 px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (username.includes("@") && !forgotEmail) {
                        setForgotEmail(username.trim());
                      }
                      setError("");
                      setForgotStatus(null);
                      setView("forgot");
                    }}
                    className="text-[11px] font-semibold text-purple-600 hover:text-purple-700 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full rounded-xl bg-stone-50 border border-stone-200 px-4 py-3 pr-11 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition"
                  >
                    {showPass ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs font-semibold text-rose-700 animate-in fade-in">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 py-3 text-sm font-bold text-white shadow-md shadow-purple-200 hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 mt-2 cursor-pointer"
              >
                {loading ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>
                    <KeyRound className="h-4 w-4 text-purple-200" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-gray-800">Reset Admin Password</h2>
                <p className="text-xs text-stone-500 mt-1">
                  Enter your admin email address to receive a secure link to reset your password.
                </p>
              </div>

              <form onSubmit={onForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="admin@angkon.com.bd"
                    className="w-full rounded-xl bg-stone-50 border border-stone-200 px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition"
                    required
                  />
                </div>

                {forgotStatus && (
                  <div
                    className={`rounded-xl border px-3.5 py-2.5 text-xs font-semibold animate-in fade-in ${
                      forgotStatus.type === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-rose-50 border-rose-200 text-rose-700"
                    }`}
                  >
                    {forgotStatus.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 py-3 text-sm font-bold text-white shadow-md shadow-purple-200 hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {forgotLoading ? (
                    <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <Mail className="h-4 w-4 text-purple-200" />
                      <span>Send Reset Link</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForgotStatus(null);
                    setView("login");
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-stone-500 hover:text-stone-800 transition cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
