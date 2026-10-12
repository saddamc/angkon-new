"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MailCheck,
  ShieldCheck,
  UserCheck,
  Tag,
  Plus,
  Trash2,
  Sparkles,
  Percent,
  Coins,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import type { PromoCodeItem, CheckoutSettings as ICheckoutSettings } from "@/server/checkout-settings";

interface PromoFormState {
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minSpend: number;
  description: string;
  active: boolean;
}

const DEFAULT_SETTINGS: ICheckoutSettings = {
  requireEmailVerification: true,
  allowGuestCheckout: true,
  enablePromoCodes: true,
  promoCodes: [
    { code: "ANGKON10", type: "percentage", value: 10, minSpend: 0, active: true, description: "10% off for our patrons" },
    { code: "WELCOME", type: "fixed", value: 200, minSpend: 1500, active: true, description: "৳200 flat discount on orders over ৳1,500" },
    { code: "ROYAL20", type: "percentage", value: 20, minSpend: 3000, active: true, description: "20% off on luxury orders over ৳3,000" },
  ],
};

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label,
  id,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#400604]/40 focus:ring-offset-2 ${
          checked ? "bg-[#400604]" : "bg-stone-300"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${
          checked
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
            : "bg-stone-100 text-stone-600 border border-stone-200"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            checked ? "bg-emerald-500 animate-pulse" : "bg-stone-400"
          }`}
        />
        {checked ? "ON" : "OFF"}
      </span>
    </div>
  );
}

export function CheckoutSettings() {
  const [settings, setSettings] = useState<ICheckoutSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<ICheckoutSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  // New promo form modal / inline state
  const [showAddPromo, setShowAddPromo] = useState(false);
  const [newPromo, setNewPromo] = useState<PromoFormState>({
    code: "",
    type: "percentage",
    value: 10,
    minSpend: 0,
    description: "",
    active: true,
  });
  const [addPromoError, setAddPromoError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/settings/checkout", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load failed"))))
      .then((data: ICheckoutSettings) => {
        if (cancelled) return;
        const normalized: ICheckoutSettings = {
          requireEmailVerification: data.requireEmailVerification !== false,
          allowGuestCheckout: data.allowGuestCheckout !== false,
          enablePromoCodes: data.enablePromoCodes !== false,
          promoCodes: Array.isArray(data.promoCodes) && data.promoCodes.length > 0 ? data.promoCodes : DEFAULT_SETTINGS.promoCodes,
        };
        setSettings(normalized);
        setSavedSettings(normalized);
      })
      .catch(() => !cancelled && setLoadError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const isDirty =
    savedSettings !== null &&
    (settings.requireEmailVerification !== savedSettings.requireEmailVerification ||
      settings.allowGuestCheckout !== savedSettings.allowGuestCheckout ||
      settings.enablePromoCodes !== savedSettings.enablePromoCodes ||
      JSON.stringify(settings.promoCodes) !== JSON.stringify(savedSettings.promoCodes));

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);
    setJustSaved(false);
    try {
      const res = await fetch("/api/admin/settings/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't save checkout settings. Please try again.");
        return;
      }
      setSavedSettings({ ...settings });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 4500);
    } catch {
      setError("Network error — your change was not saved. Please check your connection.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddPromoCode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newPromo.code.trim().toUpperCase();
    if (!cleanCode) {
      setAddPromoError("Promo code is required.");
      return;
    }
    if (settings.promoCodes.some((p) => p.code.toUpperCase() === cleanCode)) {
      setAddPromoError(`Code "${cleanCode}" already exists.`);
      return;
    }
    if (newPromo.value <= 0) {
      setAddPromoError("Discount value must be greater than 0.");
      return;
    }
    if (newPromo.type === "percentage" && newPromo.value > 90) {
      setAddPromoError("Percentage discount cannot exceed 90%.");
      return;
    }

    const item: PromoCodeItem = {
      code: cleanCode,
      type: newPromo.type,
      value: Number(newPromo.value),
      minSpend: Math.max(0, Number(newPromo.minSpend) || 0),
      active: newPromo.active,
      description: newPromo.description.trim(),
    };

    setSettings((prev) => ({
      ...prev,
      promoCodes: [item, ...prev.promoCodes],
    }));

    setNewPromo({
      code: "",
      type: "percentage",
      value: 10,
      minSpend: 0,
      description: "",
      active: true,
    });
    setAddPromoError(null);
    setShowAddPromo(false);
  };

  const handleTogglePromoActive = (index: number) => {
    setSettings((prev) => {
      const updated = [...prev.promoCodes];
      updated[index] = { ...updated[index], active: !updated[index].active };
      return { ...prev, promoCodes: updated };
    });
  };

  const handleDeletePromo = (index: number) => {
    setSettings((prev) => {
      const updated = prev.promoCodes.filter((_, i) => i !== index);
      return { ...prev, promoCodes: updated };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-10 text-[13px] text-stone-500">
        <Loader2 className="h-5 w-5 animate-spin text-[#400604]" />
        Loading checkout &amp; promotional parameters…
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-5">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#1A0302]">Checkout, Accounts &amp; Promo Codes</h2>
          <p className="mt-1 text-[13px] text-stone-500">
            Control order gates, customer account creation, and storefront promotional codes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || !isDirty}
            className="flex items-center gap-2 rounded-xl bg-[#400604] px-5 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#250302] disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#E1B76F]" /> Saving to MongoDB…
              </>
            ) : (
              <>
                <Check className="h-4 w-4 text-[#E1B76F]" /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-[12.5px] text-amber-900"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          Could not fetch existing settings from database. Default parameters are shown. Saving will update the database.
        </div>
      )}

      {justSaved && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-[13px] font-semibold text-emerald-800 animate-in fade-in"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          Settings successfully saved! Checkout, accounts &amp; promo codes are now updated live.
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-3.5 text-[13px] font-semibold text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          {error}
        </div>
      )}

      {/* Section 1: Checkout & Verification Gate Switches */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#400604]" />
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-stone-700">
            Checkout Security &amp; Customer Accounts
          </h3>
        </div>

        {/* Card 1: Email Verification Toggle */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-[#E1B76F]/40">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E1B76F]/40 bg-[#FDFBF7]">
                <MailCheck className="h-5 w-5 text-[#400604]" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-stone-900">
                  Require Email Verification (6-Digit OTP Gate)
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-stone-500">
                  Customer must confirm their email via a 6-digit one-time code before order placement. Creates an authentic verified profile.
                </p>
              </div>
            </div>

            <ToggleSwitch
              checked={settings.requireEmailVerification}
              onChange={(val) => {
                setSettings((prev) => ({ ...prev, requireEmailVerification: val }));
                setError(null);
                setJustSaved(false);
              }}
              label="Require email verification"
              id="toggle-verify-email"
            />
          </div>

          <div className="mt-4 grid gap-3 text-[12px] sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
              <p className="flex items-center gap-1.5 font-bold text-emerald-900">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> When ON (Recommended)
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-emerald-900/80">
                <li>100% verified customer contact for delivery dispatch.</li>
                <li>Eliminates bot and spam orders automatically.</li>
                <li>Customer account is created and order receipt is guaranteed.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
              <p className="flex items-center gap-1.5 font-bold text-amber-900">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> When OFF (Express Checkout)
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-amber-900/80">
                <li>Customers can submit orders without typing a verification code.</li>
                <li>Useful if email service is undergoing domain maintenance.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Card 2: Customer Accounts & Auto-Save */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-[#E1B76F]/40">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E1B76F]/40 bg-[#FDFBF7]">
                <UserCheck className="h-5 w-5 text-[#400604]" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-stone-900">
                  Customer Accounts &amp; Profile Auto-Save
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-stone-500">
                  Automatically create customer accounts in MongoDB upon checkout and sync their delivery addresses and order history.
                </p>
              </div>
            </div>

            <ToggleSwitch
              checked={settings.allowGuestCheckout}
              onChange={(val) => {
                setSettings((prev) => ({ ...prev, allowGuestCheckout: val }));
                setError(null);
                setJustSaved(false);
              }}
              label="Customer accounts auto save"
              id="toggle-customer-accounts"
            />
          </div>

          <div className="mt-3 flex items-center gap-2 text-[12px] text-stone-500 bg-[#FDFBF7] border border-stone-200/80 p-2.5 rounded-xl">
            <Sparkles className="h-4 w-4 text-[#E1B76F] shrink-0" />
            <span>
              When active, every checkout preserves full client credentials in the admin customer directory, enabling repeat order identification.
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: Storefront Promo Codes & Discount Engine */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-[#400604]" />
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-stone-700">
              Promo Codes &amp; Store Discounts
            </h3>
          </div>
          <span className="text-[12px] text-stone-500">
            {settings.promoCodes.length} coupon{settings.promoCodes.length === 1 ? "" : "s"} configured
          </span>
        </div>

        {/* Master Promo Switch Card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-[#E1B76F]/40">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E1B76F]/40 bg-[#FDFBF7]">
                <Tag className="h-5 w-5 text-[#400604]" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-stone-900">
                  Master Promo Code Feature
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-stone-500">
                  Activate or deactivate promo code input across the entire store (Shopping Bag &amp; Checkout).
                </p>
              </div>
            </div>

            <ToggleSwitch
              checked={settings.enablePromoCodes}
              onChange={(val) => {
                setSettings((prev) => ({ ...prev, enablePromoCodes: val }));
                setError(null);
                setJustSaved(false);
              }}
              label="Enable promo codes"
              id="toggle-master-promo"
            />
          </div>

          {!settings.enablePromoCodes && (
            <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[12px] text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              Promo codes are currently disabled storewide. Customers will not see coupon input fields at checkout.
            </div>
          )}
        </div>

        {/* Promo Codes Manager Table / Card List */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <h4 className="text-[14px] font-bold text-[#1A0302]">Manage Discount Coupons</h4>
              <p className="text-[12px] text-stone-500">
                Define promotional codes, percentage or flat discounts, and minimum order thresholds.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddPromo((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#400604] bg-[#400604]/5 px-3.5 py-2 text-[12.5px] font-bold text-[#400604] transition hover:bg-[#400604] hover:text-white shadow-2xs"
            >
              {showAddPromo ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {showAddPromo ? "Cancel" : "Add New Promo Code"}
            </button>
          </div>

          {/* Add Promo Code Form */}
          {showAddPromo && (
            <div className="rounded-xl border border-[#E1B76F]/40 bg-[#FDFBF7] p-4.5 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#400604] flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-[#E1B76F]" /> New Promotional Code
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddPromo(false)}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {addPromoError && (
                <p className="text-[12px] font-semibold text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {addPromoError}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SUMMER25"
                    value={newPromo.code}
                    onChange={(e) =>
                      setNewPromo((p) => ({ ...p, code: e.target.value.toUpperCase().replace(/\s+/g, "") }))
                    }
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] font-mono font-bold uppercase text-stone-900 focus:border-[#400604] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={newPromo.type}
                    onChange={(e) =>
                      setNewPromo((p) => ({ ...p, type: e.target.value as "percentage" | "fixed" }))
                    }
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] font-medium text-stone-900 focus:border-[#400604] focus:outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (৳)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    Discount Value *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      placeholder={newPromo.type === "percentage" ? "10" : "200"}
                      value={newPromo.value || ""}
                      onChange={(e) => setNewPromo((p) => ({ ...p, value: Number(e.target.value) || 0 }))}
                      className="w-full rounded-xl border border-stone-200 bg-white pl-3 pr-8 py-2 text-[13px] font-bold text-stone-900 focus:border-[#400604] focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-stone-400">
                      {newPromo.type === "percentage" ? "%" : "৳"}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    Min Order Spend (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 (No minimum)"
                    value={newPromo.minSpend || ""}
                    onChange={(e) => setNewPromo((p) => ({ ...p, minSpend: Number(e.target.value) || 0 }))}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] font-medium text-stone-900 focus:border-[#400604] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                  Description / Customer Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Special Eid 15% discount for orders above ৳2,000"
                  value={newPromo.description}
                  onChange={(e) => setNewPromo((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-900 focus:border-[#400604] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-200/60">
                <label className="flex items-center gap-2 cursor-pointer text-[12.5px] font-semibold text-stone-700">
                  <input
                    type="checkbox"
                    checked={newPromo.active}
                    onChange={(e) => setNewPromo((p) => ({ ...p, active: e.target.checked }))}
                    className="rounded border-stone-300 text-[#400604] focus:ring-[#400604]"
                  />
                  Activate immediately upon creation
                </label>

                <button
                  type="button"
                  onClick={handleAddPromoCode}
                  className="rounded-xl bg-[#400604] px-4 py-2 text-[12.5px] font-bold text-white shadow-sm hover:bg-[#250302] transition"
                >
                  Save &amp; Add Code
                </button>
              </div>
            </div>
          )}

          {/* Table / List of Promo Codes */}
          {settings.promoCodes.length === 0 ? (
            <div className="py-8 text-center text-stone-400 text-[13px]">
              No promo codes created yet. Click &quot;Add New Promo Code&quot; above to create one.
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {settings.promoCodes.map((promo, idx) => (
                <div
                  key={`${promo.code}-${idx}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E1B76F]/30 bg-[#FDFBF7]">
                      {promo.type === "percentage" ? (
                        <Percent className="h-4 w-4 text-[#400604]" />
                      ) : (
                        <Coins className="h-4 w-4 text-[#400604]" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[13px] font-extrabold tracking-wider text-[#400604] bg-[#400604]/5 px-2.5 py-0.5 rounded-lg border border-[#E1B76F]/30">
                          {promo.code}
                        </span>
                        <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-700">
                          {promo.type === "percentage" ? `${promo.value}% OFF` : `৳${promo.value} OFF`}
                        </span>
                        {promo.minSpend > 0 ? (
                          <span className="text-[11px] text-stone-500">
                            Min spend: <strong>৳{promo.minSpend.toLocaleString()}</strong>
                          </span>
                        ) : (
                          <span className="text-[11px] text-stone-400">No minimum spend</span>
                        )}
                      </div>
                      {promo.description && (
                        <p className="mt-0.5 text-[12px] text-stone-500">{promo.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    {/* Active toggle button */}
                    <button
                      type="button"
                      onClick={() => handleTogglePromoActive(idx)}
                      title={promo.active ? "Click to deactivate" : "Click to activate"}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition ${
                        promo.active
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                          : "bg-stone-100 text-stone-500 border border-stone-200 hover:bg-stone-200"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          promo.active ? "bg-emerald-500" : "bg-stone-400"
                        }`}
                      />
                      {promo.active ? "Active" : "Paused"}
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDeletePromo(idx)}
                      className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
                      title={`Delete code ${promo.code}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save Bar / Footer */}
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E1B76F]/30 bg-white/95 backdrop-blur p-4 shadow-lg">
        <div className="flex items-center gap-2">
          {isDirty ? (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Unsaved changes in parameters
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-stone-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> All settings synchronized
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || !isDirty}
            className="flex items-center gap-2 rounded-xl bg-[#400604] px-6 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#250302] disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#E1B76F]" /> Saving settings…
              </>
            ) : (
              "Save Checkout Settings"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
