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
  AlertCircle,
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
    badge: "text-amber-800 bg-amber-50 border-amber-200",
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
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    verified: boolean;
    message: string;
    domain: string;
    htmlMetaTag?: { found: boolean; details: string };
    dnsTxtRecord?: { found: boolean; details: string };
  } | null>(null);
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

  const handleRunCheck = async () => {
    setChecking(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/meta/domain-verification/check");
      const data = await res.json();
      if (res.ok && data.ok) {
        setCheckResult(data);
        if (data.verified) {
          setMessage({ type: "success", text: data.message });
        } else {
          setMessage({ type: "error", text: data.message });
        }
      } else {
        setMessage({ type: "error", text: data.error || "Failed to run domain verification check." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error running domain verification check." });
    } finally {
      setChecking(false);
    }
  };

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
        setMessage({ type: "success", text: "Domain verification token saved! Storefront <meta> tag updated." });
        void handleRunCheck();
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

  const pixelId = settings?.pixelId || "";

  return (
    <div className="space-y-6 max-w-7xl pb-24 text-stone-900 font-sans antialiased">
      {/* ── 1. Unified Navigation ── */}
      <MetaNavigationHeader pixelId={pixelId} testEventCode={settings?.testEventCode} />

      {/* ── 2. Alert Toast ── */}
      {message && (
        <div
          className={`flex items-start gap-3 rounded-xl p-3.5 border shadow-2xs transition-all ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
          )}
          <div className="flex-1 text-xs font-medium">{message.text}</div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── 3. Executive Hero Card ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
              <Globe className="h-3 w-3 text-emerald-600" />
              <span>Apple iOS 14.5+ Brand Safety &amp; AEM</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              Root Domain Verification &amp; Aggregated Event Measurement
            </h1>
            <p className="text-xs sm:text-[13px] text-stone-600 max-w-2xl leading-relaxed">
              Meta requires root domain ownership verification to configure conversion event priority in Aggregated Event Measurement (AEM). This ensures accurate conversion attribution for Apple iOS 14.5+ visitors.
            </p>
          </div>

          <a
            href="https://business.facebook.com/settings/brand-safety/domains"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-50 hover:border-stone-300 transition cursor-pointer self-start md:self-auto shrink-0"
          >
            <span>Meta Brand Safety Domains</span>
            <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
          </a>
        </div>
      </div>

      {/* ── 4. Live Verification Diagnostic Bar ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-stone-100">
          <div>
            <div className="text-xs font-bold text-stone-900 flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  checkResult?.verified ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                }`}
              />
              <span>
                Domain Verification State:{" "}
                <strong className={checkResult?.verified ? "text-emerald-700" : "text-amber-800"}>
                  {checkResult
                    ? checkResult.verified
                      ? "VERIFIED & ACTIVE"
                      : "NOT DETECTED YET"
                    : "READY TO CHECK"}
                </strong>
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Target root domain: <code className="font-mono text-stone-700 font-bold">angkon.com.bd</code>
            </p>
          </div>

          <button
            type="button"
            onClick={handleRunCheck}
            disabled={checking || !domainToken}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 text-xs font-semibold text-emerald-800 transition disabled:opacity-40 cursor-pointer shadow-2xs shrink-0"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>{checking ? "Checking Domain..." : "Run Live Verification Check"}</span>
          </button>
        </div>

        {checkResult && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div
              className={`p-3.5 rounded-xl border ${
                checkResult.htmlMetaTag?.found
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                  : "bg-stone-50 border-stone-200 text-stone-700"
              }`}
            >
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <span>{checkResult.htmlMetaTag?.found ? "✓" : "!"}</span>
                <span>HTML &lt;head&gt; Meta Tag Result</span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">{checkResult.htmlMetaTag?.details}</p>
            </div>

            <div
              className={`p-3.5 rounded-xl border ${
                checkResult.dnsTxtRecord?.found
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                  : "bg-stone-50 border-stone-200 text-stone-700"
              }`}
            >
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <span>{checkResult.dnsTxtRecord?.found ? "✓" : "!"}</span>
                <span>DNS TXT Record Result</span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">{checkResult.dnsTxtRecord?.details}</p>
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSaveToken} className="space-y-3 pt-1">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5">
              Meta Domain Verification Token
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={domainToken}
                onChange={(e) => setDomainToken(e.target.value)}
                placeholder="e.g. qwer1234asdf5678zxcv"
                className="flex-1 rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-mono text-stone-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition shadow-2xs"
              />
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 transition cursor-pointer shrink-0"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{saving ? "Saving..." : "Save Token"}</span>
              </button>
            </div>
            <p className="text-[11px] text-stone-400 mt-1.5 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Found in Meta Business Manager &gt; Brand Safety &gt; Domains.
            </p>
          </div>
        </form>

        {/* Verification Code Snippets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
          {/* Method 1: HTML Meta Tag */}
          <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-800">
              <span>Method 1: HTML &lt;head&gt; Meta Tag (Auto-Injected)</span>
              <button
                type="button"
                onClick={copyMetaSnippet}
                className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 cursor-pointer text-[11px] font-bold"
              >
                {copiedMeta ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedMeta ? "Copied!" : "Copy Tag"}</span>
              </button>
            </div>
            <pre className="bg-stone-900 text-emerald-400 p-2.5 rounded-lg text-[11px] font-mono overflow-x-auto shadow-inner [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {metaTagSnippet}
            </pre>
          </div>

          {/* Method 2: DNS TXT Record */}
          <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-800">
              <span>Method 2: DNS TXT Record</span>
              <button
                type="button"
                onClick={copyDnsSnippet}
                className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 cursor-pointer text-[11px] font-bold"
              >
                {copiedDns ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedDns ? "Copied!" : "Copy DNS"}</span>
              </button>
            </div>
            <pre className="bg-stone-900 text-emerald-400 p-2.5 rounded-lg text-[11px] font-mono overflow-x-auto shadow-inner [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {dnsSnippet}
            </pre>
          </div>
        </div>
      </div>

      {/* ── 5. Aggregated Event Measurement (AEM) Priority Hierarchy ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-stone-100">
          <div>
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Aggregated Event Measurement (AEM) 8-Event Priority Tier
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              When iOS 14.5+ users opt out of tracking, Meta only receives the single highest-priority event configured in this hierarchy
            </p>
          </div>
          <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-700 self-start sm:self-auto">
            5 of 8 Slots Calibrated
          </span>
        </div>

        <div className="space-y-2.5">
          {AEM_PRIORITY_LIST.map((item) => (
            <div
              key={item.priority}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-stone-100 bg-stone-50/50 hover:bg-stone-50 transition gap-2"
            >
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-lg bg-stone-900 text-white flex items-center justify-center text-xs font-black shrink-0">
                  #{item.priority}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-900">{item.name}</span>
                    <span className={`rounded-full px-2 py-0.2 text-[10px] font-bold border ${item.badge}`}>
                      {item.level}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5">{item.description}</p>
                </div>
              </div>

              <div className="text-left sm:text-right text-xs font-medium text-stone-600 sm:self-center">
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
