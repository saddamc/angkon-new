"use client";

import { useEffect, useState } from "react";
import {
  Globe,
  CheckCircle2,
  ShieldCheck,
  Copy,
  Check,
  Save,
  Info,
  ExternalLink,
  Layers,
  ArrowDown,
  ArrowUp,
  AlertTriangle,
} from "lucide-react";
import { MetaNavigationHeader } from "../meta-nav";
import type { PixelSettings } from "@/server/pixel-settings";

const AEM_PRIORITY_LIST = [
  {
    priority: 1,
    name: "Purchase",
    level: "Highest Priority (Tier 1)",
    optimization: "Value Optimization (ROAS)",
    description: "Tracks confirmed luxury orders. Must remain #1 for Meta conversion bidding.",
    badge: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  {
    priority: 2,
    name: "InitiateCheckout",
    level: "High Priority (Tier 2)",
    optimization: "Conversion Funnel Progression",
    description: "Tracks visitors opening the checkout page with cart contents.",
    badge: "text-indigo-700 bg-indigo-50 border-indigo-200",
  },
  {
    priority: 3,
    name: "AddToCart",
    level: "Medium-High Priority (Tier 3)",
    optimization: "Audience Remarketing",
    description: "Tracks product size selections and cart additions.",
    badge: "text-amber-700 bg-amber-50 border-amber-200",
  },
  {
    priority: 4,
    name: "ViewContent",
    level: "Medium Priority (Tier 4)",
    optimization: "Dynamic Product Retargeting",
    description: "Tracks specific attire detail views for catalog retargeting.",
    badge: "text-purple-700 bg-purple-50 border-purple-200",
  },
  {
    priority: 5,
    name: "PageView",
    level: "Base Priority (Tier 5)",
    optimization: "General Store Traffic",
    description: "Base visitor volume across all landing pages.",
    badge: "text-blue-700 bg-blue-50 border-blue-200",
  },
];

export default function MetaDomainVerificationPage() {
  const [settings, setSettings] = useState<PixelSettings | null>(null);
  const [domainToken, setDomainToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedMeta, setCopiedMeta] = useState(false);
  const [copiedDns, setCopiedDns] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings/pixel")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setSettings(data);
          setDomainToken(data.domainVerificationToken || "");
        }
      })
      .catch(console.error);
  }, []);

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domainVerificationToken: domainToken.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.settings);
        setMessage({ type: "success", text: "Domain verification token saved to MongoDB Atlas!" });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save token." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error saving verification token." });
    } finally {
      setSaving(false);
    }
  };

  const activeToken = domainToken.trim() || "angkon_meta_verification_token_sample";
  const metaTagSnippet = `<meta name="facebook-domain-verification" content="${activeToken}" />`;
  const dnsSnippet = `facebook-domain-verification=${activeToken}`;

  const copyMetaSnippet = () => {
    void navigator.clipboard.writeText(metaTagSnippet);
    setCopiedMeta(true);
    setTimeout(() => setCopiedMeta(false), 2000);
  };

  const copyDnsSnippet = () => {
    void navigator.clipboard.writeText(dnsSnippet);
    setCopiedDns(true);
    setTimeout(() => setCopiedDns(false), 2000);
  };

  const pixelId = settings?.pixelId || "1480517547316620";

  return (
    <div className="space-y-8 max-w-7xl pb-20">
      {/* ── Meta Navigation ── */}
      <MetaNavigationHeader pixelId={pixelId} testEventCode={settings?.testEventCode} />

      {/* ── Alert Toast ── */}
      {message && (
        <div
          className={`flex items-start gap-3 rounded-2xl p-4 border shadow-sm transition-all ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-[13px] font-medium">{message.text}</div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Domain Verification Section ── */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-stone-900">Root Domain Verification</h2>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                angkon.com.bd
              </span>
            </div>
            <p className="text-[13px] text-stone-500 mt-1">
              Meta requires domain verification to configure event priority in Aggregated Event Measurement (AEM) for Apple iOS 14.5+
            </p>
          </div>

          <a
            href="https://business.facebook.com/settings/brand-safety/domains"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 shadow-xs hover:bg-stone-50"
          >
            <span>Meta Brand Safety Domains</span>
            <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
          </a>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSaveToken} className="space-y-4">
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wider text-stone-600 mb-2">
              Meta Domain Verification Token
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={domainToken}
                onChange={(e) => setDomainToken(e.target.value)}
                placeholder="e.g. qwer1234asdf5678zxcv"
                className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-mono text-stone-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition shadow-sm"
              />
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? "Saving..." : "Save Token"}</span>
              </button>
            </div>
            <p className="text-[11px] text-stone-400 mt-1.5 flex items-center gap-1">
              <Info className="h-3.5 w-3.5" />
              Found in Meta Business Manager &gt; Brand Safety &gt; Domains.
            </p>
          </div>
        </form>

        {/* Verification Code Snippets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Method 1: HTML Meta Tag */}
          <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-800">
              <span>Method 1: HTML &lt;head&gt; Meta Tag</span>
              <button
                type="button"
                onClick={copyMetaSnippet}
                className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 cursor-pointer text-[11px]"
              >
                {copiedMeta ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedMeta ? "Copied!" : "Copy Tag"}</span>
              </button>
            </div>
            <pre className="bg-stone-900 text-emerald-400 p-2.5 rounded-lg text-[11px] font-mono overflow-x-auto shadow-inner">
              {metaTagSnippet}
            </pre>
          </div>

          {/* Method 2: DNS TXT Record */}
          <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-800">
              <span>Method 2: DNS TXT Entry</span>
              <button
                type="button"
                onClick={copyDnsSnippet}
                className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 cursor-pointer text-[11px]"
              >
                {copiedDns ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedDns ? "Copied!" : "Copy DNS"}</span>
              </button>
            </div>
            <pre className="bg-stone-900 text-emerald-400 p-2.5 rounded-lg text-[11px] font-mono overflow-x-auto shadow-inner">
              {dnsSnippet}
            </pre>
          </div>
        </div>
      </div>

      {/* ── Aggregated Event Measurement (AEM) Priority Hierarchy ── */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-stone-100">
          <div>
            <h3 className="text-base font-bold text-stone-900">
              Aggregated Event Measurement (AEM) 8-Event Priority Tier
            </h3>
            <p className="text-[13px] text-stone-500">
              When iOS 14.5+ users opt out of tracking, Meta only receives the single highest-priority event in this hierarchy
            </p>
          </div>
          <span className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700">
            5 of 8 Slots Calibrated
          </span>
        </div>

        <div className="space-y-3">
          {AEM_PRIORITY_LIST.map((item) => (
            <div
              key={item.priority}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-stone-100 bg-stone-50/50 hover:bg-stone-50 transition gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-lg bg-stone-900 text-white flex items-center justify-center text-xs font-black">
                  #{item.priority}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-stone-900">{item.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${item.badge}`}>
                      {item.level}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">{item.description}</p>
                </div>
              </div>

              <div className="text-right sm:text-right text-xs font-semibold text-stone-600 sm:self-center">
                <span>Optimization: </span>
                <span className="font-bold text-stone-800">{item.optimization}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
