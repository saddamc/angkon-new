"use client";

import { useState } from "react";
import { Eye, EyeOff, ShieldCheck, ShoppingCart } from "lucide-react";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      window.location.href = "/admin/dashboard";
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f0f8] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-purple-400/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-violet-500/10 blur-[100px]" />
        <div className="absolute top-1/3 left-0 h-48 w-48 rounded-full bg-purple-300/10 blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-purple-500 shadow-[0_8px_32px_rgba(147,51,234,0.35)]">
            <ShoppingCart className="h-8 w-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-[22px] font-black tracking-tight text-gray-800">
              ANGKON Admin
            </h1>
            <p className="text-[13px] text-gray-400 mt-0.5">
              Secure store management portal
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-purple-100/60 bg-white p-8 shadow-[0_24px_80px_rgba(147,51,234,0.08)]">
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="Enter your username"
                className="w-full rounded-xl bg-purple-50/50 border border-purple-100 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full rounded-xl bg-purple-50/50 border border-purple-100 px-4 py-3 pr-11 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-500 transition"
                  tabIndex={-1}
                >
                  {showPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-600">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 py-3 text-sm font-bold text-white shadow-[0_4px_20px_rgba(147,51,234,0.3)] hover:shadow-[0_4px_24px_rgba(147,51,234,0.5)] hover:from-purple-500 hover:to-purple-400 disabled:opacity-50 disabled:shadow-none transition-all duration-200 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Signing in…
                </span>
              ) : (
                "Sign In to Dashboard"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-gray-400">
          Protected area · Unauthorized access is prohibited
        </p>
      </div>
    </div>
  );
}
