"use client";

import { useEffect, useState, useCallback } from "react";
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
  Plus,
  Trash2,
  History,
  Activity,
  X,
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

interface DomainListItem {
  id: string;
  domain: string;
  isPrimary: boolean;
  lifecycleState: "NEEDS_VERIFICATION" | "DNS_DETECTED" | "PENDING_META" | "VERIFIED" | "DNS_MISMATCH" | "FAILED";
  dnsStatus: "DETECTED" | "NOT_FOUND" | "ERROR";
  htmlStatus: "DETECTED" | "NOT_FOUND" | "NOT_CHECKED" | "ERROR";
  metaOwnershipStatus: "VERIFIED" | "NEEDS_VERIFICATION" | "FAILED";
  metaOwnershipVerified: boolean;
  verificationMethod: "dns_txt" | "html_meta_tag";
  lastCheckedAt?: string | null;
}

interface AuditLogItem {
  _id: string;
  domain: string;
  action: string;
  previousState?: string | null;
  newState: string;
  verificationMethod: string;
  dnsResult?: {
    status?: string;
    recordsExamined?: number;
    matchedRecord?: string | null;
    error?: string | null;
  } | null;
  actor: string;
  details?: string | null;
  createdAt: string;
}

interface DomainCheckResponse {
  ok: boolean;
  domain: string;
  isPrimary: boolean;
  nameservers: string[];
  verificationToken: string;
  verificationMethod: "dns_txt" | "html_meta_tag";
  lifecycleState: "NEEDS_VERIFICATION" | "DNS_DETECTED" | "PENDING_META" | "VERIFIED" | "DNS_MISMATCH" | "FAILED";
  dnsStatus: "DETECTED" | "NOT_FOUND" | "ERROR";
  htmlStatus: "DETECTED" | "NOT_FOUND" | "NOT_CHECKED" | "ERROR";
  metaOwnershipStatus: "VERIFIED" | "NEEDS_VERIFICATION" | "FAILED";
  metaOwnershipVerified: boolean;
  metaOwnershipVerifiedAt?: string | null;
  metaOwnershipSource?: string | null;
  metaOwnershipConfirmedBy?: string | null;
  lastCheckedAt?: string | null;
  lastSuccessfulCheckAt?: string | null;
  lastFailedCheckAt?: string | null;
  lastExaminedRecords: string[];
  lastMatchedRecord?: string | null;
  lastDetails?: string | null;
  lastError?: string | null;
  domains: DomainListItem[];
  auditHistory: AuditLogItem[];
  siteUrl: string;
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
  const [selectedDomain, setSelectedDomain] = useState<string>("angkon.net");
  const [copiedMeta, setCopiedMeta] = useState(false);
  const [copiedDns, setCopiedDns] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Add Domain Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDomainInput, setNewDomainInput] = useState("");
  const [newDomainMethod, setNewDomainMethod] = useState<"dns_txt" | "html_meta_tag">("dns_txt");
  const [newDomainToken, setNewDomainToken] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);

  const fetchDomainOverview = useCallback(async (domainToFetch?: string, runLive = false) => {
    setChecking(true);
    try {
      const q = new URLSearchParams();
      if (domainToFetch) q.set("domain", domainToFetch);
      if (runLive) q.set("live", "true");

      const res = await fetch(`/api/admin/meta/domain-verification/check?${q.toString()}`);
      const data: DomainCheckResponse = await res.json();
      if (res.ok && data.ok) {
        setCheckResult(data);
        setSelectedDomain(data.domain);
        setDomainToken(data.verificationToken || "");
        setVerificationMethod(data.verificationMethod || "dns_txt");
      }
    } catch {
      // silent load failure handled in UI
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/settings/pixel")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setSettings(data);
          if (data.domainVerificationToken) setDomainToken(data.domainVerificationToken);
        }
      })
      .catch(console.error);

    void fetchDomainOverview(undefined, true);
  }, [fetchDomainOverview]);

  const handleManualRecheck = async () => {
    setChecking(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/meta/domain-verification/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "recheck_dns",
          domain: selectedDomain,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMessage({
          type: data.dnsStatus === "DETECTED" ? "success" : "error",
          text: data.message || `DNS recheck completed for ${selectedDomain}.`,
        });
        await fetchDomainOverview(selectedDomain, false);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to recheck DNS." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error executing DNS recheck." });
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
        await handleManualRecheck();
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
          domain: selectedDomain,
          verified: newVerifiedState,
          source: "meta_business_manager",
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMessage({
          type: "success",
          text: data.message,
        });
        await fetchDomainOverview(selectedDomain, false);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update ownership status." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error updating ownership status." });
    } finally {
      setConfirmingOwnership(false);
    }
  };

  const handleAddDomainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingDomain(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/meta/domain-verification/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_domain",
          domain: newDomainInput.trim(),
          customToken: newDomainToken.trim() || undefined,
          verificationMethod: newDomainMethod,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMessage({ type: "success", text: data.message });
        setShowAddModal(false);
        setNewDomainInput("");
        setNewDomainToken("");
        await fetchDomainOverview(data.domain.domain, true);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to add domain." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error creating domain." });
    } finally {
      setAddingDomain(false);
    }
  };

  const handleDeleteDomain = async (domainToDelete: string) => {
    if (!confirm(`Are you sure you want to delete '${domainToDelete}' from domain verification?`)) {
      return;
    }
    setMessage(null);
    try {
      const res = await fetch("/api/admin/meta/domain-verification/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_domain",
          domain: domainToDelete,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMessage({ type: "success", text: data.message });
        await fetchDomainOverview(undefined, true);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to delete domain." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error deleting domain." });
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
  const lifecycle = checkResult?.lifecycleState || "NEEDS_VERIFICATION";
  const isDnsDetected = checkResult?.dnsStatus === "DETECTED";
  const isHtmlDetected = checkResult?.htmlStatus === "DETECTED";
  const isOwnershipVerified = checkResult?.metaOwnershipVerified || false;

  const getLifecycleBadge = (state: string) => {
    switch (state) {
      case "VERIFIED":
        return {
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          dot: "bg-emerald-500",
          label: "VERIFIED & ACTIVE",
          desc: "Domain verified via DNS TXT and confirmed in Meta Business Manager.",
        };
      case "DNS_DETECTED":
        return {
          bg: "bg-indigo-50 text-indigo-800 border-indigo-200",
          dot: "bg-indigo-500",
          label: "DNS DETECTED",
          desc: "DNS TXT record found on Namecheap. Awaiting confirmation in Meta Business Manager.",
        };
      case "PENDING_META":
        return {
          bg: "bg-blue-50 text-blue-800 border-blue-200",
          dot: "bg-blue-500",
          label: "PENDING META",
          desc: "Verification tag detected. Click 'Verify Domain' in Meta Business Manager.",
        };
      case "DNS_MISMATCH":
        return {
          bg: "bg-rose-50 text-rose-800 border-rose-200",
          dot: "bg-rose-500",
          label: "TOKEN MISMATCH",
          desc: "DNS TXT record found on domain, but token does not match your stored token.",
        };
      case "FAILED":
        return {
          bg: "bg-rose-50 text-rose-800 border-rose-200",
          dot: "bg-rose-500",
          label: "VERIFICATION FAILED",
          desc: "DNS lookup failed, timed out, or verification record was removed.",
        };
      default:
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          dot: "bg-amber-400",
          label: "NEEDS VERIFICATION",
          desc: "Token configured. Run live DNS check to confirm status.",
        };
    }
  };

  const badgeInfo = getLifecycleBadge(lifecycle);

  return (
    <div className="space-y-6 max-w-7xl pb-24 text-slate-900 font-sans antialiased">
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
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
              <Globe className="h-3 w-3 text-emerald-600" />
              <span>Apple iOS 14.5+ Brand Safety &amp; AEM</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              Root Domain Verification &amp; Aggregated Event Measurement
            </h2>
            <p className="text-xs sm:text-[13px] text-slate-600 max-w-2xl leading-relaxed">
              Meta requires root domain ownership verification to configure conversion event priority in Aggregated Event Measurement (AEM). Production domain <strong className="text-slate-900">angkon.net</strong> is managed on Namecheap with live DNS TXT verification.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer shrink-0"
            >
              <Plus className="h-3.5 w-3.5 text-slate-500" />
              <span>Add Domain</span>
            </button>

            <a
              href="https://business.facebook.com/settings/brand-safety/domains"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer shrink-0"
            >
              <span>Meta Domains</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </a>
          </div>
        </div>

        {/* Multi-Domain Registry Selector */}
        {checkResult && checkResult.domains && checkResult.domains.length > 0 && (
          <div className="pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
              Domains:
            </span>
            {checkResult.domains.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => fetchDomainOverview(d.domain, false)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-semibold text-xs transition cursor-pointer shrink-0 ${
                  d.domain === selectedDomain
                    ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span>{d.domain}</span>
                {d.isPrimary && (
                  <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-emerald-500 text-white font-extrabold">
                    Primary
                  </span>
                )}
                {!d.isPrimary && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDeleteDomain(d.domain);
                    }}
                    className="ml-1 text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 4. Domain Health & Lifecycle Bar ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badgeInfo.bg}`}>
                <span className={`h-2 w-2 rounded-full ${badgeInfo.dot} animate-pulse`} />
                <span>{badgeInfo.label}</span>
              </span>
              <span className="text-xs text-slate-500">
                Target Root Domain: <strong className="font-mono text-slate-900">{rootDomain}</strong>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {badgeInfo.desc}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualRecheck}
              disabled={checking}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 text-xs font-semibold text-emerald-800 transition disabled:opacity-40 cursor-pointer shadow-2xs shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-emerald-600 ${checking ? "animate-spin" : ""}`} />
              <span>{checking ? "Checking DNS..." : "Run Live DNS Check"}</span>
            </button>
          </div>
        </div>

        {/* Three Independent Pillars (Section D) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Pillar 1: DNS TXT Verification */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5 text-slate-600" />
                  DNS TXT Verification
                </span>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    isDnsDetected
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : checkResult?.dnsStatus === "ERROR"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  {checkResult ? checkResult.dnsStatus : "CHECKING..."}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900 mt-2">
                {rootDomain} (Apex DNS)
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                {checkResult?.lastDetails || "Querying live DNS TXT records directly on Namecheap..."}
              </p>
            </div>
            <div className="pt-2.5 border-t border-slate-200/60 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Provider: <strong>Namecheap</strong></span>
              <span>Records: <strong>{checkResult?.lastExaminedRecords?.length || 0}</strong></span>
            </div>
          </div>

          {/* Pillar 2: HTML Meta Tag Verification */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <FileCode className="h-3.5 w-3.5 text-slate-600" />
                  HTML Meta Tag
                </span>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    isHtmlDetected
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : checkResult?.htmlStatus === "NOT_CHECKED"
                      ? "bg-slate-100 text-slate-600 border-slate-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  {checkResult ? checkResult.htmlStatus : "CHECKING..."}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900 mt-2">
                https://{rootDomain}/
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Injected in root HTML <code>&lt;head&gt;</code> of all storefront pages via Next.js metadata.
              </p>
            </div>
            <div className="pt-2.5 border-t border-slate-200/60 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Channel: <strong>Storefront Head</strong></span>
              <span>Role: <strong>Secondary</strong></span>
            </div>
          </div>

          {/* Pillar 3: Meta Business Manager Ownership */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-slate-600" />
                  Meta Ownership
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
              <div className="text-sm font-bold text-slate-900 mt-2">
                Meta Business Manager
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                {isOwnershipVerified
                  ? `Confirmed in Meta Business Manager on ${
                      checkResult?.metaOwnershipVerifiedAt
                        ? new Date(checkResult.metaOwnershipVerifiedAt).toLocaleDateString()
                        : "Active"
                    } by ${checkResult?.metaOwnershipConfirmedBy || "Administrator"}.`
                  : "Meta Business Manager confirmation required."}
              </p>
            </div>
            <div className="pt-2.5 border-t border-slate-200/60 text-[11px] text-slate-500 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-slate-400" />
                <span>{isOwnershipVerified ? "Confirmed" : "Action Req."}</span>
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

        {/* Timestamps Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-slate-500 border-t border-slate-100">
          <div className="flex items-center gap-4">
            <span>
              Last Checked:{" "}
              <strong>
                {checkResult?.lastCheckedAt ? new Date(checkResult.lastCheckedAt).toLocaleTimeString() : "Pending"}
              </strong>
            </span>
            <span>
              Last Successful:{" "}
              <strong>
                {checkResult?.lastSuccessfulCheckAt
                  ? new Date(checkResult.lastSuccessfulCheckAt).toLocaleTimeString()
                  : "N/A"}
              </strong>
            </span>
            {checkResult?.lastFailedCheckAt && (
              <span className="text-rose-600">
                Last Failed: <strong>{new Date(checkResult.lastFailedCheckAt).toLocaleTimeString()}</strong>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-emerald-700 font-semibold">
            <Activity className="h-3 w-3" />
            <span>Namecheap NS: dns1.registrar-servers.com, dns2.registrar-servers.com</span>
          </div>
        </div>
      </div>

      {/* ── 5. Token Configuration & Snippets ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <form onSubmit={handleSaveToken} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Meta Domain Verification Token for {rootDomain}
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={domainToken}
                onChange={(e) => setDomainToken(e.target.value)}
                placeholder="e.g. c82us1ogm8zgy1u7zn8v7dcvzpt1a2"
                className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-mono text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition shadow-2xs"
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
            <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Obtained from Meta Business Manager &gt; Brand Safety and Suitability &gt; Domains.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Primary Method:</span>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="verificationMethod"
                value="dns_txt"
                checked={verificationMethod === "dns_txt"}
                onChange={() => setVerificationMethod("dns_txt")}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span>DNS TXT Record (Namecheap DNS - Recommended)</span>
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

        {/* Code Snippets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
          {/* Method 1: DNS TXT Record */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-slate-600" />
                <span>Method 1: DNS TXT Record (Namecheap)</span>
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
            <pre className="bg-slate-900 text-emerald-400 p-2.5 rounded-lg text-[11px] font-mono overflow-x-auto shadow-inner [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {dnsSnippet}
            </pre>
            <p className="text-[11px] text-slate-500 leading-normal">
              In Namecheap cPanel or Advanced DNS, add a <strong>TXT Record</strong> with Host: <code>@</code> and Value: <code>{dnsSnippet}</code>.
            </p>
          </div>

          {/* Method 2: HTML Meta Tag */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
              <span className="flex items-center gap-1.5">
                <FileCode className="h-3.5 w-3.5 text-slate-600" />
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
            <pre className="bg-slate-900 text-emerald-400 p-2.5 rounded-lg text-[11px] font-mono overflow-x-auto shadow-inner [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {metaTagSnippet}
            </pre>
            <p className="text-[11px] text-slate-500 leading-normal">
              Automatically injected into <code>&lt;head&gt;</code> on all <strong>https://{rootDomain}</strong> pages via Next.js metadata.
            </p>
          </div>
        </div>

        {/* Examined TXT Records Inspector */}
        {checkResult && checkResult.lastExaminedRecords && checkResult.lastExaminedRecords.length > 0 && (
          <div className="pt-3 border-t border-slate-100 space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Live Namecheap DNS TXT Records Detected on {rootDomain} ({checkResult.lastExaminedRecords.length} records):
            </div>
            <div className="space-y-1">
              {checkResult.lastExaminedRecords.map((rec, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg text-[11px] font-mono border flex items-center justify-between ${
                    rec.includes("facebook-domain-verification")
                      ? "bg-emerald-50/80 border-emerald-300 text-emerald-900 font-bold"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  <span className="truncate flex-1">{rec}</span>
                  {rec.includes("facebook-domain-verification") && (
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold ml-2">
                      Meta Match
                    </span>
                  )}
                  {rec.startsWith("v=spf") && (
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold ml-2">
                      SPF Record
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 6. Verification History Timeline (Section 5) ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Verification Audit History ({rootDomain})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Append-Only Audit Trail</span>
        </div>

        {checkResult && checkResult.auditHistory && checkResult.auditHistory.length > 0 ? (
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {checkResult.auditHistory.map((item) => (
              <div key={item._id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 uppercase tracking-wider text-[10px] bg-slate-100 px-2 py-0.5 rounded">
                      {item.action.replace(/_/g, " ")}
                    </span>
                    <span className="font-bold text-slate-900">
                      State: {item.newState}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {item.details || "Domain verification check executed."}
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-400 shrink-0">
                  <div>{new Date(item.createdAt).toLocaleString()}</div>
                  <div className="text-[10px] text-slate-500">By {item.actor}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-slate-400 italic text-xs py-4 text-center">
            No audit records logged yet for this domain.
          </div>
        )}
      </div>

      {/* ── 7. Aggregated Event Measurement (AEM) Priority Hierarchy ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Aggregated Event Measurement (AEM) 8-Event Priority Tier
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
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
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition gap-2"
            >
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black shrink-0">
                  #{item.priority}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{item.name}</span>
                    <span className={`rounded-full px-2 py-0.2 text-[10px] font-bold border ${item.badge}`}>
                      {item.level}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
                </div>
              </div>

              <div className="text-left sm:text-right text-xs font-medium text-slate-600 sm:self-center">
                <span>Optimization: </span>
                <span className="font-bold text-slate-800">{item.optimization}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Add Domain Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Additional Domain</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddDomainSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Domain Name (FQDN)
                </label>
                <input
                  type="text"
                  required
                  value={newDomainInput}
                  onChange={(e) => setNewDomainInput(e.target.value)}
                  placeholder="e.g. angkon-outlet.com"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 font-mono text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Enter the root domain. Subdomains will be automatically normalized.
                </p>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Custom Verification Token (Optional)
                </label>
                <input
                  type="text"
                  value={newDomainToken}
                  onChange={(e) => setNewDomainToken(e.target.value)}
                  placeholder="Leave blank to auto-generate"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 font-mono text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Verification Method
                </label>
                <select
                  value={newDomainMethod}
                  onChange={(e) => setNewDomainMethod(e.target.value as "dns_txt" | "html_meta_tag")}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="dns_txt">DNS TXT Record (Recommended)</option>
                  <option value="html_meta_tag">HTML &lt;head&gt; Meta Tag</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingDomain}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 cursor-pointer disabled:opacity-50"
                >
                  {addingDomain ? "Adding..." : "Add Domain"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
