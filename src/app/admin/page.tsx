"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect straight to dashboard
  useEffect(() => {
    fetch("/api/admin/login")
      .then((res) => {
        if (res.ok) {
          window.location.href = "/admin/dashboard";
        }
      })
      .catch(() => {});
  }, []);

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
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background ambient royal glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#400604]/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-[#E1B76F]/10 blur-[100px]" />
        <div className="absolute top-1/3 left-0 h-48 w-48 rounded-full bg-[#400604]/5 blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#400604] to-[#1A0302] border border-[#E1B76F]/40 shadow-xl shadow-[#400604]/15">
            <span className="font-serif font-black text-2xl tracking-widest text-[#E1B76F]">AK</span>
          </div>
          <div className="text-center">
            <h1 className="text-[24px] font-serif font-bold tracking-widest text-[#400604]">
              ANGKON
            </h1>
            <p className="text-[11px] uppercase font-bold tracking-widest text-[#E1B76F] mt-0.5">
              Executive Administration
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#E1B76F]/30 bg-white p-8 shadow-[0_24px_80px_rgba(64,6,4,0.06)]">
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-1.5">
                Executive Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="admin"
                className="w-full rounded-xl bg-stone-50 border border-stone-200 px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#400604] focus:ring-1 focus:ring-[#400604]/20 transition"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-1.5">
                Passphrase
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-stone-50 border border-stone-200 px-4 py-3 pr-11 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#400604] focus:ring-1 focus:ring-[#400604]/20 transition"
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
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#400604] hover:bg-[#250302] py-3 text-sm font-bold text-white shadow-md shadow-[#400604]/20 hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="h-4 w-4 rounded-full border-2 border-[#E1B76F] border-t-transparent animate-spin" />
              ) : (
                <>
                  <KeyRound className="h-4 w-4 text-[#E1B76F]" />
                  <span>Authenticate Session</span>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-stone-400 mt-6 tracking-wide">
          Protected by HttpOnly JWT Session Tokens · ANGKON
        </p>
      </div>
    </div>
  );
}
