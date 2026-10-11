"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound } from "lucide-react";

const PASSWORD_HINT = "At least 8 characters, with a letter and a number";

type Status = "checking" | "valid" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<Status>("checking");
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("token") || "";
    // Keep the token out of the address bar / history once read.
    window.history.replaceState(null, "", window.location.pathname);
    if (!raw) {
      void Promise.resolve().then(() => setStatus("invalid"));
      return;
    }
    void (async () => {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(raw)}`, { cache: "no-store" });
        const data = await res.json();
        setToken(raw);
        setEmail(data.email ?? null);
        setStatus(data.valid ? "valid" : "invalid");
      } catch {
        setStatus("invalid");
      }
    })();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't set the password.");
        return;
      }
      router.replace("/my-account");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-[#400604] bg-[#1A0302] px-4 py-3 pr-10 text-sm text-white placeholder-[#7a6550] focus:border-[#E1B76F] focus:outline-none";

  return (
    <div className="min-h-screen bg-[#1A0302] px-4 py-16 text-white">
      <div className="mx-auto max-w-md rounded-2xl border-2 border-[#400604] bg-[#240403] p-6 shadow-xl sm:p-8">
        <div className="mb-6 flex items-center gap-3 border-b border-[#400604] pb-3">
          <KeyRound className="h-6 w-6" />
          <h1 className="font-heading text-2xl font-black uppercase">Set a new password</h1>
        </div>

        {status === "checking" && <p className="text-sm text-white/80">Checking your link…</p>}

        {status === "invalid" && (
          <div className="space-y-4">
            <p className="text-sm text-white/90">
              This link has expired or was already used. Reset links work once and last 1 hour.
            </p>
            <Link href="/my-account" className="inline-block text-xs font-bold uppercase tracking-wider underline underline-offset-4 hover:text-white">
              Request a new link
            </Link>
          </div>
        )}

        {status === "valid" && (
          <form onSubmit={onSubmit} className="space-y-4">
            {email && (
              <p className="text-xs text-white/80">
                For <strong className="text-white">{email}</strong>
              </p>
            )}
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={PASSWORD_HINT}
                autoComplete="new-password"
                className={inputClass}
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
            <input
              type={show ? "text" : "password"}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat the new password"
              autoComplete="new-password"
              className={inputClass}
            />
            {error && <p className="text-sm font-semibold text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[#E1B76F] py-3.5 text-xs font-black uppercase tracking-wider text-[#400604] shadow-md transition hover:bg-[#edd19b] disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save password & sign in"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
