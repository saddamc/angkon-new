"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, MailCheck, ShieldCheck } from "lucide-react";

export function CheckoutSettings() {
  const [saved, setSaved] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/settings/checkout", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load failed"))))
      .then((data) => {
        if (cancelled) return;
        const value = data.requireEmailVerification !== false;
        setSaved(value);
        setEnabled(value);
      })
      .catch(() => !cancelled && setLoadError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = saved !== null && enabled !== saved;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setJustSaved(false);
    try {
      const res = await fetch("/api/admin/settings/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requireEmailVerification: enabled }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't save the checkout settings. Please try again.");
        return;
      }
      setSaved(enabled);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 4000);
    } catch {
      setError("Network error — your change was not saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-[13px] text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin text-[#400604]" />
        Loading checkout settings…
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div>
        <h2 className="text-lg font-serif font-bold text-[#1A0302] mb-1">Checkout &amp; Customer Accounts</h2>
        <p className="text-[13px] text-stone-500">
          Controls what a customer must do before an order is accepted. Changes apply straight away.
        </p>
      </div>

      {loadError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-[12.5px] text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Couldn&apos;t load the saved setting, so the default (on) is shown. Saving will overwrite the stored value.
        </div>
      )}

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E1B76F]/40 bg-[#FDFBF7]">
              <MailCheck className="h-5 w-5 text-[#400604]" />
            </div>
            <div>
              <p id="verify-label" className="text-[14px] font-bold text-stone-900">Require email verification to place an order</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-stone-500">
                The customer enters their email, receives a 6-digit code, and types it in. They are then signed in
                automatically and the order is placed on their verified account.
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-labelledby="verify-label"
            onClick={() => {
              setEnabled((v) => !v);
              setError(null);
              setJustSaved(false);
            }}
            className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#400604]/40 ${
              enabled ? "bg-[#400604]" : "bg-stone-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                enabled ? "translate-x-[22px]" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <div className="mt-4 grid gap-3 text-[12.5px] sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
            <p className="flex items-center gap-1.5 font-bold text-emerald-900">
              <ShieldCheck className="h-4 w-4" /> When ON (recommended)
            </p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-emerald-900/80">
              <li>Every order comes from a real, confirmed email address.</li>
              <li>Order emails and receipts always reach the customer.</li>
              <li>Customers get an account and can track their orders.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            <p className="flex items-center gap-1.5 font-bold text-amber-900">
              <AlertCircle className="h-4 w-4" /> When OFF
            </p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-amber-900/80">
              <li>Customers can order without confirming their email.</li>
              <li>Use only if code emails can&apos;t be delivered (for example, your sending domain isn&apos;t verified).</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4" aria-live="polite">
        <button
          type="submit"
          disabled={saving || !dirty}
          className="flex items-center gap-2 rounded-xl bg-[#400604] px-6 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#250302] disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-[#E1B76F]" /> Saving…
            </>
          ) : (
            "Save checkout settings"
          )}
        </button>
        {dirty && !saving && <span className="text-[12.5px] font-semibold text-amber-700">Unsaved changes</span>}
        {justSaved && (
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Saved — checkout now follows this setting.
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-2 text-[13px] font-semibold text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </form>
  );
}
