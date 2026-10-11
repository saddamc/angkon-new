"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2, UploadCloud, X, CheckCircle2 } from "lucide-react";

export function PromoSettings() {
  const [enabled, setEnabled] = useState(false);
  const [image, setImage] = useState("");
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/promo")
      .then((r) => r.json())
      .then((data) => {
        setEnabled(!!data.enabled);
        setImage(data.image || "");
        setLink(data.link || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      const res = await fetch("/api/admin/settings/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, image, link }),
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3500);
      } else {
        alert("Failed to save settings");
      }
    } catch {
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("category", "Promotions");
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) setImage(data.url);
    } catch {
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-[13px] text-stone-500 py-4">
        <Loader2 className="w-4 h-4 animate-spin inline mr-2 text-[#400604]" />
        Loading promo configuration…
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t border-stone-100 pt-6 mt-6">
      <div>
        <h3 className="text-[15px] font-serif font-bold text-[#1A0302]">Storefront Promotional Popup</h3>
        <p className="text-[12px] text-stone-500">
          Display an exclusive modal campaign to visitors on first visit.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <div className="peer h-6 w-11 rounded-full bg-stone-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-stone-300 after:bg-white after:transition-all peer-checked:bg-[#400604] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
        </label>
        <span className="text-[13px] font-semibold text-stone-700">Enable Promotional Modal</span>
      </div>

      <div className="space-y-3">
        <label className="block text-[12px] font-bold uppercase tracking-wider text-stone-500">
          Banner Image (Cloudinary)
        </label>
        {image ? (
          <div className="relative inline-block border border-stone-200 rounded-xl overflow-hidden group shadow-sm">
            <Image src={image} alt="Promo" width={280} height={280} className="object-cover max-h-[300px]" />
            <button
              type="button"
              onClick={() => setImage("")}
              className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <label className="flex h-[140px] w-[280px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-200 bg-[#FDFBF7] transition hover:bg-[#400604]/5 hover:border-[#E1B76F]">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#400604]" />
              ) : (
                <>
                  <UploadCloud className="h-7 w-7 text-stone-400 mb-1" />
                  <span className="text-[12px] font-semibold text-stone-600">Upload to Cloudinary</span>
                  <span className="text-[10px] text-stone-400">PNG, JPG, WebP</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
        )}
      </div>

      <div className="space-y-2 max-w-md">
        <label className="block text-[12px] font-bold uppercase tracking-wider text-stone-500">
          Destination Action Link (Optional)
        </label>
        <input
          type="text"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="e.g. /category/new-arrivals or /products/royal-sherwani"
          className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[13px] text-stone-800 placeholder:text-stone-400 outline-none focus:border-[#400604] focus:ring-1 focus:ring-[#400604]/20"
        />
      </div>

      <div className="flex items-center gap-4 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[#400604] hover:bg-[#250302] px-6 py-2.5 text-[13px] font-bold text-white shadow-sm transition disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#E1B76F]" />
              Saving to MongoDB…
            </>
          ) : (
            "Save Promo Settings"
          )}
        </button>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Promo configuration saved!
          </div>
        )}
      </div>
    </div>
  );
}
