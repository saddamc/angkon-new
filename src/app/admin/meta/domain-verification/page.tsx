"use client";

import { useEffect, useState } from "react";
import {
  Globe,
  CheckCircle2,
  Copy,
  Check,
  Save,
  Info,
  ExternalLink,
  AlertCircle,
  Server,
  FileCode,
  Shield,
  Clock,
  RefreshCw,
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

interface DomainCheckResponse {
  ok: boolean;
  domain: string;
  nameservers: string[];
  tokenConfigured: boolean;
  token: string;
  verificationMethod: "dns_txt" | "html_meta_tag";
  dnsTxt: {
    status: "DETECTED" | "NOT_FOUND" | "ERROR";
    domain: string;
    recordsExamined: number;
    matchedRecord?: string;
    allTxtRecords: string[];
    nameservers: string[];
    details: string;
    error?: string;
  };
  htmlMetaTag: {
    status: "DETECTED" | "NOT_FOUND" | "NOT_CHECKED" | "ERROR";
    url: string;
    detectedToken?: string;
    details: string;
    error?: string;
  };
  metaOwnership: {
    status: "VERIFIED" | "NEEDS_VERIFICATION" | "FAILED";
    verified: boolean;
    verifiedAt?: string | null;
    source?: string | null;
    confirmedBy?: string | null;
  };
  message: string;
}

export default function MetaDomainVerificationPage() {
  const [settings, setSettings] = useState<PixelSettings | null>(null);
  const [domainToken, setDomainToken] = useState("");
  const [verificationMethod, setVerificationMethod] = useState<"dns_txt" | "html_meta_tag">("dns_txt");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [confirmingOwnership, setConfirmingOwnership] = useState(false);
  const [checkResult, setCheckResult] = useState<DomainCheckResponse | null>(null);
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
          if (data.domainVerificationMethod) {
            setVerificationMethod(data.domainVerificationMethod);
          }
        }
      })
      .catch(console.error);

    // Initial check on load
    void runDomainCheck();
  }, []);

  const runDomainCheck = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/admin/meta/domain-verification/check");
      const data: DomainCheckResponse = await res.json();
      if (res.ok && data.ok) {
        setCheckResult(data);
        if (data.token) {
          setDomainToken(data.token);
        }
      }
    } catch {
      // silent initial check error
    } finally {
      setChecking(false);
    }
  };

  const handleRunCheck = async () => {
    setChecking(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/meta/domain-verification/check");
      const data: DomainCheckResponse = await res.json();
      if (res.ok && data.ok) {
        setCheckResult(data);
        if (data.dnsTxt.status === "DETECTED") {
          setMessage({
            type: "success",
            text: `DNS verification successful: TXT record detected on ${data.domain}!`,
          });
        } else if (data.dnsTxt.status === "ERROR") {
          setMessage({
            type: "error",
            text: `DNS check error: ${data.dnsTxt.error || data.dnsTxt.details}`,
          });
        } else {
          setMessage({
            type: "error",
            text: data.dnsTxt.details || "Verification record not found on DNS.",
          });
        }
      } else {
        setMessage({ type: "error", text: "Failed to run domain verification check." });
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
          domainVerificationMethod: verificationMethod,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.settings);
        setMessage({
          type: "success",
          text: "Meta verification token saved! Checking live DNS TXT record now...",
        });
        await handleRunCheck();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save token." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error saving verification token." });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMetaOwnership = async (newVerifiedState: boolean) => {
    setConfirmingOwnership(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/meta/domain-verification/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_meta_ownership",
          verified: newVerifiedState,
          source: "meta_business_manager",
          verificationMethod,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMessage({
          type: "success",
          text: data.message,
        });
        await handleRunCheck();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update ownership confirmation." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error updating ownership confirmation." });
    } finally {
      setConfirmingOwnership(false);
    }
  };

  const activeToken = domainToken.trim() || "c82us1ogm8zgy1u7zn8v7dcvzpt1a2";
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
  const rootDomain = checkResult?.domain || "angkon.net";
  const isDnsDetected = checkResult?.dnsTxt.status === "DETECTED";
  const isHtmlDetected = checkResult?.htmlMetaTag.status === "DETECTED";
  const isOwnershipVerified = checkResult?.metaOwnership.status === "VERIFIED";

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
              Meta requires root domain ownership verification to configure conversion event priority in Aggregated Event Measurement (AEM). Production domain <strong className="text-stone-900">angkon.net</strong> is managed on Namecheap with DNS TXT verification.
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

      {/* ── 4. Three-Pillar Status Dashboard (Section D) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pillar 1: DNS TXT Verification */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-stone-600" />
                DNS TXT Verification
              </span>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                  isDnsDetected
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : checkResult?.dnsTxt.status === "ERROR"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                {checkResult ? checkResult.dnsTxt.status : "CHECKING..."}
              </span>
            </div>
            <div>
              <div className="text-base font-bold text-stone-900">
                {rootDomain} (Apex DNS)
              </div>
              <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                {checkResult?.dnsTxt.details || "Querying live DNS TXT records directly on Namecheap..."}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-stone-500 flex items-center justify-between">
            <span>Provider: <strong>Namecheap</strong></span>
            <span>NS: <strong>dns1.registrar-servers.com</strong></span>
          </div>
        </div>

        {/* Pillar 2: HTML Meta Tag Verification */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <FileCode className="h-3.5 w-3.5 text-stone-600" />
                HTML Meta Tag
              </span>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                  isHtmlDetected
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : checkResult?.htmlMetaTag.status === "NOT_CHECKED"
                    ? "bg-stone-100 text-stone-600 border-stone-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                {checkResult ? checkResult.htmlMetaTag.status : "CHECKING..."}
              </span>
            </div>
            <div>
              <div className="text-base font-bold text-stone-900">
                https://{rootDomain}/
              </div>
              <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                {checkResult?.htmlMetaTag.details || "Inspecting storefront HTML <head> meta tag..."}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-stone-500 flex items-center justify-between">
            <span>Injected: <strong>Next.js Head</strong></span>
            <span>Secondary: <strong>Fallback</strong></span>
          </div>
        </div>

        {/* Pillar 3: Meta Business Manager Ownership */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-stone-600" />
                Meta Business Ownership
              </span>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                  isOwnershipVerified
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                {isOwnershipVerified ? "VERIFIED" : "NEEDS_VERIFICATION"}
              </span>
            </div>
            <div>
              <div className="text-base font-bold text-stone-900">
                Meta Business Manager
              </div>
              <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                {isOwnershipVerified
                  ? `Ownership confirmed in Meta Business Manager on ${
                      checkResult?.metaOwnership.verifiedAt
                        ? new Date(checkResult.metaOwnership.verifiedAt).toLocaleDateString()
                        : "Active"
                    } by ${checkResult?.metaOwnership.confirmedBy || "Administrator"}.`
                  : "Meta Business Manager ownership requires administrator confirmation."}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-stone-500 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-stone-400" />
              <span>{isOwnershipVerified ? "Status: Verified" : "Action Required"}</span>
            </div>
            <button
              type="button"
              disabled={confirmingOwnership}
              onClick={() => handleToggleMetaOwnership(!isOwnershipVerified)}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer underline disabled:opacity-50"
            >
              {isOwnershipVerified ? "Revoke Confirmation" : "Record Meta Confirmation"}
            </button>
          </div>
        </div>
      </div>

      {/* ── 5. Configuration & Live DNS Diagnostic Bar ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-stone-100">
          <div>
            <div className="text-xs font-bold text-stone-900 flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isDnsDetected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                }`}
              />
              <span>
                Target Root Domain:{" "}
                <code className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {rootDomain}
                </code>
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              DNS TXT records are strictly queried on <strong className="text-stone-800">angkon.net</strong> (never www.angkon.net) matching Namecheap apex zone records.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRunCheck}
            disabled={checking}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 text-xs font-semibold text-emerald-800 transition disabled:opacity-40 cursor-pointer shadow-2xs shrink-0"
          >
            <RefreshCw className={`h-4 w-4 text-emerald-600 ${checking ? "animate-spin" : ""}`} />
            <span>{checking ? "Checking DNS TXT..." : "Run Live Verification Check"}</span>
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSaveToken} className="space-y-4 pt-1">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5">
              Meta Domain Verification Token
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={domainToken}
                onChange={(e) => setDomainToken(e.target.value)}
                placeholder="e.g. c82us1ogm8zgy1u7zn8v7dcvzpt1a2"
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
              Obtained from Meta Business Manager &gt; Brand Safety and Suitability &gt; Domains.
            </p>
          </div>

          {/* Verification Method Selector */}
          <div className="flex items-center gap-4 text-xs font-medium text-stone-700">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Primary Method:</span>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="verificationMethod"
                value="dns_txt"
                checked={verificationMethod === "dns_txt"}
                onChange={() => setVerificationMethod("dns_txt")}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span>DNS TXT Record (Namecheap - Recommended)</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="verificationMethod"
                value="html_meta_tag"
                checked={verificationMethod === "html_meta_tag"}
                onChange={() => setVerificationMethod("html_meta_tag")}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span>HTML &lt;head&gt; Meta Tag (Storefront)</span>
            </label>
          </div>
        </form>

        {/* Verification Code Snippets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
          {/* Method 1: DNS TXT Record (Primary) */}
          <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-800">
              <span className="flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-stone-600" />
                <span>Method 1: DNS TXT Record (Namecheap DNS)</span>
              </span>
              <button
                type="button"
                onClick={copyDnsSnippet}
                className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 cursor-pointer text-[11px] font-bold"
              >
                {copiedDns ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedDns ? "Copied!" : "Copy DNS Record"}</span>
              </button>
            </div>
            <pre className="bg-stone-900 text-emerald-400 p-2.5 rounded-lg text-[11px] font-mono overflow-x-auto shadow-inner [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {dnsSnippet}
            </pre>
            <p className="text-[11px] text-stone-500 leading-normal">
              In Namecheap cPanel or Advanced DNS, add a <strong>TXT Record</strong> with Host: <code>@</code> and Value: <code>{dnsSnippet}</code>.
            </p>
          </div>

          {/* Method 2: HTML Meta Tag */}
          <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-800">
              <span className="flex items-center gap-1.5">
                <FileCode className="h-3.5 w-3.5 text-stone-600" />
                <span>Method 2: HTML &lt;head&gt; Meta Tag (Auto-Injected)</span>
              </span>
              <button
                type="button"
                onClick={copyMetaSnippet}
                className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 cursor-pointer text-[11px] font-bold"
              >
                {copiedMeta ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedMeta ? "Copied!" : "Copy HTML Tag"}</span>
              </button>
            </div>
            <pre className="bg-stone-900 text-emerald-400 p-2.5 rounded-lg text-[11px] font-mono overflow-x-auto shadow-inner [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {metaTagSnippet}
            </pre>
            <p className="text-[11px] text-stone-500 leading-normal">
              Automatically injected into <code>&lt;head&gt;</code> on all <strong>https://{rootDomain}</strong> pages via Next.js metadata.
            </p>
          </div>
        </div>

        {/* Examined TXT Records Inspector */}
        {checkResult && checkResult.dnsTxt.allTxtRecords.length > 0 && (
          <div className="pt-3 border-t border-stone-100 space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Public DNS TXT Records Detected on {rootDomain} ({checkResult.dnsTxt.recordsExamined} records):
            </div>
            <div className="space-y-1">
              {checkResult.dnsTxt.allTxtRecords.map((rec, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg text-[11px] font-mono border flex items-center justify-between ${
                    rec.includes("facebook-domain-verification")
                      ? "bg-emerald-50/80 border-emerald-300 text-emerald-900 font-bold"
                      : "bg-stone-50 border-stone-200 text-stone-600"
                  }`}
                >
                  <span className="truncate flex-1">{rec}</span>
                  {rec.includes("facebook-domain-verification") && (
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold ml-2">
                      Meta Match
                    </span>
                  )}
                  {rec.startsWith("v=spf") && (
                    <span className="text-[10px] bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded font-bold ml-2">
                      SPF Record
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 6. Aggregated Event Measurement (AEM) Priority Hierarchy ── */}
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
