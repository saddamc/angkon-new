"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Sparkles, Truck } from "lucide-react";
import { DEFAULT_SHIPPING_SETTINGS, normalizeShippingSettings, type ShippingSettings } from "@/lib/shipping";

type FormState = { insideDhaka: string; nearDhaka: string; outsideDhaka: string; freeDeliveryThreshold: string };

const toForm = (s: ShippingSettings): FormState => ({
  insideDhaka: String(s.insideDhaka),
  nearDhaka: String(s.nearDhaka),
  outsideDhaka: String(s.outsideDhaka),
  freeDeliveryThreshold: String(s.freeDeliveryThreshold),
});

const money = (n: number) => `৳${n.toLocaleString("en-BD")}`;

/** Returns the parsed settings, or the first validation message. */
function parseForm(form: FormState): { ok: true; value: ShippingSettings } | { ok: false; error: string } {
  const fields: [keyof FormState, string][] = [
    ["insideDhaka", "Inside Dhaka delivery"],
    ["nearDhaka", "Gazipur / Narayanganj / Savar delivery"],
    ["outsideDhaka", "Outside Dhaka delivery"],
    ["freeDeliveryThreshold", "Free delivery threshold"],
  ];
  const value = { ...DEFAULT_SHIPPING_SETTINGS };
  for (const [key, label] of fields) {
    const raw = form[key].trim();
    const n = Number(raw);
    if (raw === "" || !Number.isFinite(n) || n < 0 || n > 1_000_000) {
      return { ok: false, error: `${label} must be a number from 0 to 1,000,000 (use 0 to turn it off).` };
    }
    value[key] = Math.round(n);
  }
  return { ok: true, value };
}

export function ShippingSettings() {
  const [saved, setSaved] = useState<ShippingSettings | null>(null);
  const [form, setForm] = useState<FormState>(toForm(DEFAULT_SHIPPING_SETTINGS));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [overrides, setOverrides] = useState<{
    count: number;
    products: { id: number; name: string; inside: number | null; outside: number | null }[];
  } | null>(null);
  const [clearing, setClearing] = useState(false);

  const loadOverrides = () =>
    fetch("/api/admin/settings/shipping/overrides", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setOverrides(d))
      .catch(() => {});

  useEffect(() => {
    void loadOverrides();
  }, []);

  const clearOverrides = async () => {
    setClearing(true);
    try {
      const res = await fetch("/api/admin/settings/shipping/overrides", { method: "POST" });
      if (!res.ok) throw new Error();
      await loadOverrides();
    } catch {
      setError("Couldn't clear the product delivery fees. Please try again.");
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/settings/shipping", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load failed"))))
      .then((data) => {
        if (cancelled) return;
        const settings = normalizeShippingSettings(data);
        setSaved(settings);
        setForm(toForm(settings));
      })
      .catch(() => !cancelled && setLoadError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const parsed = useMemo(() => parseForm(form), [form]);
  const dirty = Boolean(
    saved && parsed.ok && (
      parsed.value.insideDhaka !== saved.insideDhaka ||
      parsed.value.nearDhaka !== saved.nearDhaka ||
      parsed.value.outsideDhaka !== saved.outsideDhaka ||
      parsed.value.freeDeliveryThreshold !== saved.freeDeliveryThreshold
    ),
  );

  const update = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setError(null);
    setJustSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setSaving(true);
    setError(null);
    setJustSaved(false);
    try {
      const res = await fetch("/api/admin/settings/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.value),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't save the shipping settings. Please try again.");
        return;
      }
      const settings = normalizeShippingSettings(data.shipping);
      setSaved(settings);
      setForm(toForm(settings));
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 4000);
    } catch {
      setError("Network error — your changes were not saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-[13px] text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin text-[#400604]" />
        Loading delivery settings…
      </div>
    );
  }

  const preview = parsed.ok ? parsed.value : saved ?? DEFAULT_SHIPPING_SETTINGS;
  const inputClass =
    "w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-4 text-[14px] font-semibold text-stone-800 outline-none focus:border-[#400604] focus:ring-1 focus:ring-[#400604]/20";

  return (
    <form onSubmit={handleSave} className="space-y-6" noValidate>
      <div>
        <h2 className="text-lg font-serif font-bold text-[#1A0302] mb-1">Shipping &amp; Delivery Rates</h2>
        <p className="text-[13px] text-stone-500">
          These rates are used by the cart, checkout and every new order. Changes apply to customers straight away.
        </p>
      </div>

      {overrides && overrides.count > 0 && (
        <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-[12.5px] text-amber-900 space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-bold">
                {overrides.count} product{overrides.count === 1 ? " has its" : "s have their"} own delivery fee — it overrides the rates below.
              </p>
              <p className="mt-0.5">
                That is why checkout can show a different price (for example ৳60) than the rate you set here. Clear them to use these store-wide rates for every product.
              </p>
            </div>
          </div>
          <ul className="max-h-28 overflow-y-auto rounded-lg bg-white/70 px-3 py-2 space-y-0.5">
            {overrides.products.map((p) => (
              <li key={p.id} className="flex justify-between gap-3">
                <span className="truncate">{p.name}</span>
                <span className="shrink-0 font-mono text-stone-600">
                  Dhaka {p.inside ?? "—"} · Other {p.outside ?? "—"}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={clearOverrides}
            disabled={clearing}
            className="inline-flex items-center gap-2 rounded-lg bg-[#400604] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#5a0906] disabled:opacity-60"
          >
            {clearing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Use store-wide rates for all products
          </button>
        </div>
      )}

      {loadError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-[12.5px] text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Couldn&apos;t load the saved rates, so the defaults are shown. Saving will overwrite the stored values.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-2 shadow-sm">
          <label htmlFor="ship-inside" className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Inside Dhaka delivery (৳)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-bold text-stone-400">৳</span>
            <input id="ship-inside" type="number" inputMode="numeric" min="0" step="1" value={form.insideDhaka} onChange={update("insideDhaka")} className={inputClass} />
          </div>
          <p className="text-[11px] text-stone-400">Charged when the customer chooses Dhaka as the district.</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-2 shadow-sm">
          <label htmlFor="ship-near" className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Gazipur / Narayanganj / Savar (৳)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-bold text-stone-400">৳</span>
            <input id="ship-near" type="number" inputMode="numeric" min="0" step="1" value={form.nearDhaka} onChange={update("nearDhaka")} className={inputClass} />
          </div>
          <p className="text-[11px] text-stone-400">Charged when the district is Gazipur or Narayanganj, or the town is Savar.</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-2 shadow-sm">
          <label htmlFor="ship-outside" className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Outside Dhaka delivery (৳)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-bold text-stone-400">৳</span>
            <input id="ship-outside" type="number" inputMode="numeric" min="0" step="1" value={form.outsideDhaka} onChange={update("outsideDhaka")} className={inputClass} />
          </div>
          <p className="text-[11px] text-stone-400">Charged for every other district in Bangladesh.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-2 shadow-sm">
        <label htmlFor="ship-free" className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
          Free delivery when the order subtotal reaches (৳)
        </label>
        <div className="relative max-w-md">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-bold text-stone-400">৳</span>
          <input id="ship-free" type="number" inputMode="numeric" min="0" step="1" value={form.freeDeliveryThreshold} onChange={update("freeDeliveryThreshold")} className={inputClass} />
        </div>
        <p className="text-[11px] text-stone-400">
          Enter <strong>0</strong> to turn this off — no order is then free just because of its size.
        </p>
      </div>

      {/* What customers will actually see */}
      <div className="rounded-2xl border border-[#E1B76F]/40 bg-[#FDFBF7] p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#400604] mb-3">What customers will pay</p>
        <dl className="grid gap-2 text-[13px] sm:grid-cols-4">
          <div className="rounded-xl bg-white border border-stone-200 p-3">
            <dt className="text-stone-500 text-[11px] uppercase tracking-wide">Inside Dhaka</dt>
            <dd className="mt-0.5 font-bold text-stone-900">{preview.insideDhaka === 0 ? "Free" : money(preview.insideDhaka)}</dd>
          </div>
          <div className="rounded-xl bg-white border border-stone-200 p-3">
            <dt className="text-stone-500 text-[11px] uppercase tracking-wide">Gazipur / Narayanganj / Savar</dt>
            <dd className="mt-0.5 font-bold text-stone-900">{preview.nearDhaka === 0 ? "Free" : money(preview.nearDhaka)}</dd>
          </div>
          <div className="rounded-xl bg-white border border-stone-200 p-3">
            <dt className="text-stone-500 text-[11px] uppercase tracking-wide">Outside Dhaka</dt>
            <dd className="mt-0.5 font-bold text-stone-900">{preview.outsideDhaka === 0 ? "Free" : money(preview.outsideDhaka)}</dd>
          </div>
          <div className="rounded-xl bg-white border border-stone-200 p-3">
            <dt className="text-stone-500 text-[11px] uppercase tracking-wide">Free delivery</dt>
            <dd className="mt-0.5 font-bold text-stone-900">
              {preview.freeDeliveryThreshold > 0 ? `Orders of ${money(preview.freeDeliveryThreshold)}+` : "Off"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 shrink-0 text-[#E1B76F] mt-0.5" />
          <ul className="list-disc pl-4 space-y-0.5 text-[12.5px] text-stone-600 leading-relaxed">
            <li>An order pays <strong>one</strong> delivery charge — the highest among its products.</li>
            <li>A product can have its own delivery fee in the product editor; it replaces the rates above for that product.</li>
            <li>A product fee of <code className="bg-stone-200/80 px-1.5 py-0.5 rounded font-mono font-bold text-[#400604]">0</code> makes that product ship free. Leave the field empty to use these rates.</li>
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-1" aria-live="polite">
        <button
          type="submit"
          disabled={saving || !dirty || !parsed.ok}
          className="flex items-center gap-2 rounded-xl bg-[#400604] hover:bg-[#250302] px-6 py-2.5 text-[13px] font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-[#E1B76F]" />
              Saving…
            </>
          ) : (
            <>
              <Truck className="h-4 w-4 text-[#E1B76F]" />
              Save shipping rates
            </>
          )}
        </button>

        {dirty && !saving && <span className="text-[12.5px] font-semibold text-amber-700">Unsaved changes</span>}
        {justSaved && (
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Saved — customers now see these rates.
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-2 text-[13px] font-semibold text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
      {!error && !parsed.ok && (
        <p className="flex items-start gap-2 text-[12.5px] text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {parsed.error}
        </p>
      )}
    </form>
  );
}
