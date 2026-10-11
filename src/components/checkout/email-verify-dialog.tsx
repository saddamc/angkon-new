"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mail, ShieldCheck, X } from "lucide-react";

export interface VerifiedUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  emailVerified: boolean;
}

/** Ask the server to email a 6-digit code. A "cooldown" reply means one was sent a moment ago. */
export async function requestEmailCode(
  email: string,
  name?: string,
): Promise<{ ok: true; resendAfter: number } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/auth/email-code/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, resendAfter: data.resendAfterSeconds ?? 60 };
    if (res.status === 429 && data.reason === "cooldown") {
      return { ok: true, resendAfter: Math.min(60, data.retryAfterSeconds ?? 60) };
    }
    return { ok: false, error: data.error || "We couldn't send the code. Please try again." };
  } catch {
    return { ok: false, error: "Network error. Please check your connection and try again." };
  }
}

interface Props {
  email: string;
  name?: string;
  phone?: string;
  /** Seconds before "Resend code" is available (from the send that opened this dialog). */
  initialResendAfter?: number;
  onVerified: (user: VerifiedUser) => void;
  onClose: () => void;
}

export function EmailVerifyDialog({ email, name, phone, initialResendAfter = 60, onVerified, onClose }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(initialResendAfter);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittedCode = useRef("");

  // Resend countdown
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !verifying && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, verifying]);

  const verify = async (value: string) => {
    if (verifying || submittedCode.current === value) return;
    submittedCode.current = value;
    setError(null);
    setInfo(null);
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/email-code/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: value, name, phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "That code didn't work. Please try again.");
        setCode("");
        submittedCode.current = "";
        inputRef.current?.focus();
        return;
      }
      onVerified(data.user as VerifiedUser);
    } catch {
      setError("Network error. Please check your connection and try again.");
      submittedCode.current = "";
    } finally {
      setVerifying(false);
    }
  };

  const onCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
    setCode(digits);
    setError(null);
    if (digits.length === 6) void verify(digits); // submit as soon as the 6th digit is typed or pasted
  };

  const resend = async () => {
    setResending(true);
    setError(null);
    setInfo(null);
    const result = await requestEmailCode(email, name);
    setResending(false);
    if (result.ok) {
      setSecondsLeft(result.resendAfter);
      setInfo("A new code is on its way. Check your inbox and spam folder.");
      setCode("");
      submittedCode.current = "";
      inputRef.current?.focus();
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="verify-title"
        aria-describedby="verify-desc"
        className="relative w-full max-w-md rounded-2xl border border-[#E1B76F]/30 bg-[#340402] p-6 text-white shadow-2xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={verifying}
          aria-label="Close and change email"
          className="absolute right-3 top-3 rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#E1B76F]/40 bg-[#2b0403]">
          <Mail className="h-6 w-6 text-[#E1B76F]" />
        </div>

        <h2 id="verify-title" className="text-center font-heading text-xl font-black uppercase tracking-wide text-white">
          Confirm your email
        </h2>
        <p id="verify-desc" className="mt-2 text-center text-sm text-white/80">
          We sent a 6-digit code to <strong className="break-all text-white">{email}</strong>. Enter it below and your
          order will be placed — you&apos;ll be signed in automatically.
        </p>

        <label htmlFor="verify-code" className="sr-only">
          6-digit verification code
        </label>
        <input
          ref={inputRef}
          id="verify-code"
          autoFocus
          value={code}
          onChange={onCodeChange}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="••••••"
          disabled={verifying}
          aria-invalid={Boolean(error)}
          className="mt-5 h-14 w-full rounded-xl border border-[#E1B76F]/40 bg-[#2b0403] text-center font-mono text-3xl font-bold tracking-[0.5em] text-white outline-none transition placeholder:text-white/25 focus:border-[#E1B76F] focus:ring-1 focus:ring-[#E1B76F] disabled:opacity-60"
        />

        <div className="mt-3 min-h-[1.25rem] text-center text-sm" aria-live="polite">
          {verifying && (
            <span className="inline-flex items-center gap-2 text-white/80">
              <Loader2 className="h-4 w-4 animate-spin text-[#E1B76F]" /> Verifying…
            </span>
          )}
          {!verifying && error && <span role="alert" className="font-semibold text-red-300">{error}</span>}
          {!verifying && !error && info && <span className="text-emerald-300">{info}</span>}
        </div>

        <button
          type="button"
          onClick={() => code.length === 6 && void verify(code)}
          disabled={verifying || code.length !== 6}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#E1B76F] py-3.5 text-sm font-bold uppercase tracking-wide text-[#400604] transition hover:bg-[#f3cb87] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShieldCheck className="h-4 w-4" />
          Verify &amp; place order
        </button>

        <div className="mt-4 flex flex-col items-center gap-2 text-xs text-white/70 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={resend}
            disabled={secondsLeft > 0 || resending || verifying}
            className="font-semibold text-[#E1B76F] underline underline-offset-4 transition hover:text-white disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
          >
            {resending ? "Sending…" : secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : "Resend code"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={verifying}
            className="font-semibold underline underline-offset-4 transition hover:text-white disabled:opacity-50"
          >
            Wrong email? Change it
          </button>
        </div>
      </div>
    </div>
  );
}
