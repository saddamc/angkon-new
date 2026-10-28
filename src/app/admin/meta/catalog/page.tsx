"use client";

import { useEffect, useState } from "react";
import {
  ShoppingBag,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Layers,
  Sparkles,
  CheckCircle2,
  FileCode,
  Tag,
  Download,
} from "lucide-react";
import { MetaNavigationHeader } from "../meta-nav";
import type { PixelSettings } from "@/server/pixel-settings";

interface CatalogItem {
  id: string;
  title: string;
  price: string;
  availability: string;
  link: string;
  image_link: string;
}

export default function MetaCatalogPage() {
  const [settings, setSettings] = useState<PixelSettings | null>(null);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copiedFeed, setCopiedFeed] = useState(false);
  const [feedUrl, setFeedUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setFeedUrl(`${window.location.origin}/api/meta/catalog`);
    }

    Promise.all([
      fetch("/api/admin/settings/pixel").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/meta/catalog?format=json").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([sData, cData]) => {
        if (sData) setSettings(sData);
        if (cData) {
          setItems(cData.items || []);
          setTotalCount(cData.total || 0);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCopyFeed = () => {
    if (!feedUrl) return;
    void navigator.clipboard.writeText(feedUrl);
    setCopiedFeed(true);
    setTimeout(() => setCopiedFeed(false), 2000);
  };

  const pixelId = settings?.pixelId || "1480517547316620";

  return (
    <div className="space-y-8 max-w-7xl pb-20">
      {/* ── Meta Navigation ── */}
      <MetaNavigationHeader pixelId={pixelId} testEventCode={settings?.testEventCode} />

      {/* ── Top Catalog Banner ── */}
      <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 via-white to-indigo-50/40 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800">
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Facebook &amp; Instagram Commerce Catalog</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              Meta Dynamic Product Ads (DPA) Data Feed
            </h2>
            <p className="text-sm text-stone-600 max-w-2xl leading-relaxed">
              Real-time XML RSS 2.0 product catalog feed calibrated for Meta Commerce Manager. Connects your luxury attire collection directly into Facebook Shop, Instagram Shopping, and Dynamic Retargeting campaigns.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <a
              href="/api/meta/catalog"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-purple-700 transition"
            >
              <FileCode className="h-4 w-4" />
              <span>View Raw XML Feed</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </a>
            <a
              href="https://business.facebook.com/commerce"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-xs font-bold text-stone-700 shadow-xs hover:bg-stone-50 transition"
            >
              <span>Meta Commerce Manager</span>
              <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
            </a>
          </div>
        </div>

        {/* Feed URL Copy Bar */}
        <div className="mt-6 pt-6 border-t border-purple-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900 block mb-1">
              Your Live Catalog Data Feed URL
            </span>
            <div className="flex items-center gap-2 bg-white rounded-xl border border-purple-200 px-3.5 py-2 font-mono text-xs text-stone-800 shadow-xs overflow-x-auto">
              <span className="text-purple-600 font-bold">GET</span>
              <span className="text-stone-700 truncate">{feedUrl || "/api/meta/catalog"}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyFeed}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 px-4 py-2 text-xs font-bold transition self-end sm:self-auto cursor-pointer"
          >
            {copiedFeed ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            <span>{copiedFeed ? "Copied Feed URL!" : "Copy Data Feed URL"}</span>
          </button>
        </div>
      </div>

      {/* ── 3 Summary KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
            Total Products Synced
          </div>
          <div className="text-3xl font-black text-stone-800">{totalCount}</div>
          <div className="text-[12px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Active in MongoDB Atlas
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
            Feed Currency Standard
          </div>
          <div className="text-2xl font-black text-stone-800 mt-0.5">BDT (৳ Taka)</div>
          <div className="text-[12px] text-stone-500 mt-1">
            Normalized with standard Meta Commerce prices
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
            Product Taxonomy
          </div>
          <div className="text-sm font-bold text-stone-800 mt-1 truncate">
            Apparel &gt; Traditional &gt; Cultural
          </div>
          <div className="text-[12px] text-stone-500 mt-1">Google/Meta standard categorization</div>
        </div>
      </div>

      {/* ── Catalog Items Sample Preview ── */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-stone-800">Catalog Feed Products Sample</h3>
            <p className="text-[12px] text-stone-500">
              Live products currently served to Meta Dynamic Ads from your database
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg">
            {items.length} Products Previewed
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-stone-400 text-sm">Loading catalog items...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-stone-400 text-sm">No products found in database.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 border-b border-stone-100 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="py-3 px-4">Item ID</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Availability</th>
                  <th className="py-3 px-4 text-right">Storefront Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-[13px]">
                {items.slice(0, 10).map((it) => (
                  <tr key={it.id} className="hover:bg-stone-50/60 transition">
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-purple-700">
                      {it.id}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-stone-800 max-w-xs truncate">
                      {it.title}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-stone-900">{it.price}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          it.availability === "in stock"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {it.availability}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <a
                        href={it.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                      >
                        <span>View Product</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Setup Instructions Guide ── */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-stone-900">
          How to Connect this Feed to Meta Commerce Manager
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-[13px] text-stone-600">
          <div className="p-4 rounded-xl border border-stone-100 bg-stone-50">
            <span className="font-bold text-purple-900 block mb-1">Step 1: Open Commerce Manager</span>
            Go to business.facebook.com/commerce and select or create your Maison ANGKON Catalog.
          </div>
          <div className="p-4 rounded-xl border border-stone-100 bg-stone-50">
            <span className="font-bold text-purple-900 block mb-1">Step 2: Add Data Feed</span>
            Click <strong>Data Sources → Add Items → Data Feed / Scheduled Feed</strong>.
          </div>
          <div className="p-4 rounded-xl border border-stone-100 bg-stone-50">
            <span className="font-bold text-purple-900 block mb-1">Step 3: Paste Feed URL</span>
            Paste our live URL: <code className="text-xs font-mono text-purple-700">/api/meta/catalog</code> and set update schedule to Hourly or Daily.
          </div>
          <div className="p-4 rounded-xl border border-stone-100 bg-stone-50">
            <span className="font-bold text-purple-900 block mb-1">Step 4: Launch Dynamic Ads</span>
            Meta will automatically match product views and carts with ad creative on Facebook &amp; Instagram.
          </div>
        </div>
      </div>
    </div>
  );
}
