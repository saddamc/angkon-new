"use client";

import { useState, useEffect } from "react";
import { Loader2, Truck, CheckCircle2, Sparkles } from "lucide-react";

export function ShippingSettings() {
  const [insideDhaka, setInsideDhaka] = useState<number>(60);
  const [outsideDhaka, setOutsideDhaka] = useState<number>(120);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/shipping")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.insideDhaka === "number") setInsideDhaka(data.insideDhaka);
        if (typeof data.outsideDhaka === "number") setOutsideDhaka(data.outsideDhaka);
        if (typeof data.freeDeliveryThreshold === "number") setFreeDeliveryThreshold(data.freeDeliveryThreshold);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      const res = await fetch("/api/admin/settings/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insideDhaka: Number(insideDhaka),
          outsideDhaka: Number(outsideDhaka),
          freeDeliveryThreshold: Number(freeDeliveryThreshold),
        }),
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3500);
      } else {
        alert("Failed to save shipping settings.");
      }
    } catch {
      alert("Error saving settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-[13px] text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin text-[#400604]" />
        Loading delivery configuration from MongoDB…
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div>
        <h2 className="text-lg font-serif font-bold text-[#1A0302] mb-1">Shipping & Delivery Rates</h2>
        <p className="text-[13px] text-stone-500">
          Configure default delivery charges for ANGKON. Stored in MongoDB Atlas and automatically applied to checkout.
        </p>
      </div>

      <div className="rounded-2xl border border-[#E1B76F]/30 bg-[#FDFBF7] p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 shrink-0 text-[#E1B76F] mt-0.5" />
          <div className="text-[12.5px] text-stone-800 leading-relaxed space-y-1">
            <p className="font-bold text-[#400604]">How Product Overrides Work:</p>
            <ul className="list-disc pl-4 space-y-0.5 text-stone-600">
              <li><strong>Default:</strong> Products without custom delivery fees use these store-wide rates.</li>
              <li><strong>Special Rate:</strong> You can enter custom delivery fees on any garment in the product editor.</li>
              <li><strong>Free Delivery (৳0):</strong> Entering <code className="bg-stone-200/80 px-1.5 py-0.5 rounded font-mono font-bold text-[#400604]">0</code> on a product makes its delivery 100% free!</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-2 shadow-sm">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Inside Dhaka Delivery (৳)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-bold text-stone-400">৳</span>
            <input
              type="number"
              min="0"
              required
              value={insideDhaka}
              onChange={(e) => setInsideDhaka(Number(e.target.value))}
              placeholder="60"
              className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-4 text-[14px] font-semibold text-stone-800 outline-none focus:border-[#400604] focus:ring-1 focus:ring-[#400604]/20"
            />
          </div>
          <p className="text-[11px] text-stone-400">Applied when customer selects Dhaka district.</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-2 shadow-sm">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
            Outside Dhaka Delivery (৳)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-bold text-stone-400">৳</span>
            <input
              type="number"
              min="0"
              required
              value={outsideDhaka}
              onChange={(e) => setOutsideDhaka(Number(e.target.value))}
              placeholder="120"
              className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-4 text-[14px] font-semibold text-stone-800 outline-none focus:border-[#400604] focus:ring-1 focus:ring-[#400604]/20"
            />
          </div>
          <p className="text-[11px] text-stone-400">Applied for all other 63 districts nationwide.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-2 shadow-sm">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
          Free Delivery Subtotal Threshold (Optional)
        </label>
        <div className="relative max-w-md">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-bold text-stone-400">৳</span>
          <input
            type="number"
            min="0"
            value={freeDeliveryThreshold || ""}
            onChange={(e) => setFreeDeliveryThreshold(Number(e.target.value) || 0)}
            placeholder="e.g. 2000 (leave empty or 0 to disable)"
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-4 text-[14px] font-semibold text-stone-800 outline-none focus:border-[#400604] focus:ring-1 focus:ring-[#400604]/20"
          />
        </div>
        <p className="text-[11px] text-stone-400">
          If customer order subtotal reaches this amount or more, delivery fee is automatically <strong>FREE (৳0)</strong>. Set to 0 to disable.
        </p>
      </div>

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[#400604] hover:bg-[#250302] px-6 py-2.5 text-[13px] font-bold text-white shadow-sm transition disabled:opacity-50 active:scale-95"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-[#E1B76F]" />
              Saving to MongoDB…
            </>
          ) : (
            <>
              <Truck className="h-4 w-4 text-[#E1B76F]" />
              Save Shipping Rates
            </>
          )}
        </button>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4" />
            Shipping settings updated successfully in MongoDB Atlas!
          </div>
        )}
      </div>
    </form>
  );
}
