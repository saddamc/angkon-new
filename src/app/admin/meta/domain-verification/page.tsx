"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Globe,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  Server,
  FileCode,
  Shield,
  Clock,
  RefreshCw,
  History,
  Activity,
  Settings,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Layers,
  Lock,
  Filter,
  Sparkles,
  Info,
  Calendar,
  AlertTriangle,
  Radio,
} from "lucide-react";
import { MetaNavigationHeader } from "../meta-nav";
import { MetaConfirmWarningModal } from "@/components/admin/meta/meta-credential-modals";

// ── Types & Interfaces ──────────────────────────────────────────────────

interface DomainListItem {
  id: string;
  domain: string;
  isPrimary: boolean;
  lifecycleState: string;
  dnsStatus: string;
  htmlStatus: string;
  metaOwnershipStatus: string;
  metaOwnershipVerified: boolean;
  verificationMethod: "dns_txt" | "html_meta_tag";
  lastCheckedAt?: string | null;
}

interface GroupedAuditItem {
  _id: string;
  domain: string;
  action: string;
  previousState?: string | null;
  newState: string;
  verificationMethod: string;
  actor: string;
  details?: string | null;
  createdAt: string;
  isGrouped: boolean;
  groupCount: number;
  firstCheckedAt?: string;
  lastCheckedAt?: string;
  dnsResult?: {
    status?: string;
    recordsExamined?: number;
    matchedRecord?: string | null;
    error?: string | null;
  } | null;
  htmlResult?: {
    status?: string;
    detectedToken?: string | null;
    error?: string | null;
  } | null;
}

interface AemSlotItem {
  slot: number;
  name: string;
  level: string;
  optimization: string;
  description: string;
  badge: string;
  isCalibrated: boolean;
}

interface AemConfigData {
  domain: string;
  maxSlots: number;
  calibratedCount: number;
  availableSlotsCount: number;
  calibratedSlots: AemSlotItem[];
  allSlots: AemSlotItem[];
  localStatus: string;
  metaSyncStatus: string;
  metaApiLimitationNote: string;
  lastSynchronizedAt?: string | null;
}

interface DomainCheckResponse {
  ok: boolean;
  domain: string;
  verified: boolean;
  isPrimary: boolean;
  nameservers: string[];
  dnsProvider: string;
  verificationToken: string;
  maskedToken: string;
  verificationMethod: "dns_txt" | "html_meta_tag";
  lifecycleState: "NEEDS_VERIFICATION" | "DNS_DETECTED" | "PENDING_META" | "VERIFIED" | "DNS_MISMATCH" | "FAILED";
  dnsStatus: "DETECTED" | "NOT_FOUND" | "ERROR";
  htmlStatus: "DETECTED" | "NOT_FOUND" | "NOT_CHECKED" | "ERROR";
  metaOwnershipStatus: "VERIFIED" | "NEEDS_VERIFICATION" | "FAILED";
  metaOwnershipVerified: boolean;
  metaOwnershipVerifiedAt?: string | null;
  metaOwnershipSource?: string | null;
  metaOwnershipConfirmedBy?: string | null;
  portfolio: {
    name: string;
    id: string;
    role: string;
  };
  lastCheckedAt?: string | null;
  lastSuccessfulCheckAt?: string | null;
  lastFailedCheckAt?: string | null;
  nextScheduledCheck?: string | null;
  lastExaminedRecords: string[];
  lastMatchedRecord?: string | null;
  lastDetails?: string | null;
  lastError?: string | null;
  domains: DomainListItem[];
  aem?: AemConfigData;
  auditHistory: any[];
  groupedAuditHistory: GroupedAuditItem[];
  siteUrl: string;
  message: string;
}

export default function MetaDomainVerificationPage() {
  const [checking, setChecking] = useState(false);
  const [recheckingDns, setRecheckingDns] = useState(false);
  const [recheckingHtml, setRecheckingHtml] = useState(false);
  const [confirmingOwnership, setConfirmingOwnership] = useState(false);
  const [checkResult, setCheckResult] = useState<DomainCheckResponse | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>("angkon.net");
  const [copiedMeta, setCopiedMeta] = useState(false);
  const [copiedDns, setCopiedDns] = useState(false);
  const [copiedPortfolioId, setCopiedPortfolioId] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Inspector Toggles
  const [showExaminedRecords, setShowExaminedRecords] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  // Audit Filters
  const [auditFilter, setAuditFilter] = useState<"ALL" | "CHANGES" | "ROUTINE" | "ERRORS">("ALL");
  const [auditMethodFilter, setAuditMethodFilter] = useState<string>("ALL");

  // Warning Confirmation Modal
  const [warningModalState, setWarningModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: async () => {},
  });

  // ── Fetch Domain Overview ──────────────────────────────────────────────
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
      } else {
        setMessage({ type: "error", text: data.message || "Failed to load domain verification." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error querying domain verification status." });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void fetchDomainOverview();
  }, [fetchDomainOverview]);

  // ── Manual DNS Re-check ────────────────────────────────────────────────
  const handleManualDnsCheck = async () => {
    setRecheckingDns(true);
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
          type: "success",
          text: `Apex DNS TXT check completed for ${selectedDomain}. State: ${data.lifecycleState}.`,
        });
        await fetchDomainOverview(selectedDomain, false);
      } else {
        setMessage({ type: "error", text: data.error || "DNS verification check failed." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error executing DNS verification check." });
    } finally {
      setRecheckingDns(false);
    }
  };

  // ── Manual HTML Tag Re-check ───────────────────────────────────────────
  const handleManualHtmlCheck = async () => {
    setRecheckingHtml(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/meta/domain-verification/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "recheck_html",
          domain: selectedDomain,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMessage({
          type: "success",
          text: `Website HTML <head> meta tag check completed for ${selectedDomain}. Status: ${data.htmlStatus}.`,
        });
        await fetchDomainOverview(selectedDomain, false);
      } else {
        setMessage({ type: "error", text: data.error || "HTML tag verification check failed." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error executing HTML tag check." });
    } finally {
      setRecheckingHtml(false);
    }
  };

  // ── Toggle Meta Business Manager Ownership ────────────────────────────
  const handleToggleMetaOwnership = (newVerifiedState: boolean) => {
    const isRevoke = !newVerifiedState;
    setWarningModalState({
      isOpen: true,
      title: isRevoke
        ? `Revoke Meta Business Manager Ownership for ${selectedDomain}?`
        : `Record Meta Business Manager Ownership for ${selectedDomain}`,
      description: isRevoke
        ? "Revoking Meta ownership will drop this domain into PENDING or DNS_DETECTED state, which may impact iOS 14.5+ Aggregated Event Measurement campaign optimization."
        : `Record that ${selectedDomain} has been successfully verified inside Meta Business Manager under portfolio Plain Stitch (ID: 1068222718624963).`,
      onConfirm: async () => {
        setConfirmingOwnership(true);
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
              text: isRevoke
                ? `Meta ownership confirmation revoked for ${selectedDomain}.`
                : `Meta ownership confirmation successfully recorded for ${selectedDomain}.`,
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
      },
    });
  };

  // ── Copy Helpers ───────────────────────────────────────────────────────
  const copyText = (txt: string, cb: (v: boolean) => void) => {
    navigator.clipboard.writeText(txt);
    cb(true);
    setTimeout(() => cb(false), 2000);
  };

  const verificationToken = checkResult?.verificationToken || "c82us1ogm8zgy1u7zn8v7dcvzpt1a2";
  const maskedToken = checkResult?.maskedToken || `${verificationToken.slice(0, 10)}••••••••••••••••••••`;
  const dnsSnippet = `facebook-domain-verification=${verificationToken}`;
  const metaTagSnippet = `<meta name="facebook-domain-verification" content="${verificationToken}" />`;
  const rootDomain = checkResult?.domain || "angkon.net";
  const isOwnershipVerified = Boolean(checkResult?.metaOwnershipVerified);
  const isDnsDetected = checkResult?.dnsStatus === "DETECTED";
  const isHtmlDetected = checkResult?.htmlStatus === "DETECTED";

  // ── Dynamic Status Badge Configuration ────────────────────────────────
  const badgeInfo = useMemo(() => {
    const state = checkResult?.lifecycleState;
    switch (state) {
      case "VERIFIED":
        return {
          label: "VERIFIED & ACTIVE",
          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dotClass: "bg-emerald-500",
          desc: "Confirmed in Meta Business Manager and verified locally via Namecheap DNS TXT records.",
        };
      case "DNS_DETECTED":
        return {
          label: "DNS RECORD DETECTED",
          badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
          dotClass: "bg-blue-500",
          desc: "Valid TXT record detected on Namecheap apex. Awaiting ownership confirmation in Meta Business Manager.",
        };
      case "PENDING_META":
        return {
          label: "PENDING META CONFIRMATION",
          badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
          dotClass: "bg-amber-500",
          desc: "HTML meta tag or DNS record detected. Awaiting Meta Business Manager verification confirmation.",
        };
      case "DNS_MISMATCH":
        return {
          label: "DNS TOKEN MISMATCH",
          badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
          dotClass: "bg-rose-500",
          desc: "A TXT record was detected on Namecheap, but the token does not match the configured verification key.",
        };
      case "FAILED":
        return {
          label: "VERIFICATION FAILED",
          badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
          dotClass: "bg-rose-500",
          desc: "DNS record missing or unresolvable across recent checks. Confirm records on Namecheap cPanel.",
        };
      case "NEEDS_VERIFICATION":
      default:
        return {
          label: "NEEDS VERIFICATION",
          badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
          dotClass: "bg-amber-500",
          desc: "Verification token is configured. Live DNS propagation check has not run yet.",
        };
    }
  }, [checkResult?.lifecycleState]);

  // ── Filtered Audit History ─────────────────────────────────────────────
  const filteredAuditLogs = useMemo(() => {
    if (!checkResult?.groupedAuditHistory) return [];
    return checkResult.groupedAuditHistory.filter((item) => {
      // Type/State Filter
      if (auditFilter === "CHANGES") {
        if (item.isGrouped) return false;
        if (item.action === "dns_check" || item.action === "scheduled_health_check") {
          if (item.previousState === item.newState) return false;
        }
      } else if (auditFilter === "ROUTINE") {
        if (!item.isGrouped && item.action !== "dns_check" && item.action !== "scheduled_health_check") {
          return false;
        }
      } else if (auditFilter === "ERRORS") {
        const hasError =
          item.newState === "FAILED" ||
          item.newState === "DNS_MISMATCH" ||
          Boolean(item.dnsResult?.error) ||
          Boolean(item.htmlResult?.error);
        if (!hasError) return false;
      }

      // Method Filter
      if (auditMethodFilter !== "ALL") {
        if (auditMethodFilter === "dns_txt" && item.verificationMethod !== "dns_txt") return false;
        if (auditMethodFilter === "html_meta_tag" && item.verificationMethod !== "html_meta_tag") return false;
        if (auditMethodFilter === "ownership" && !item.action.includes("ownership")) return false;
      }

      return true;
    });
  }, [checkResult, auditFilter, auditMethodFilter]);

  return (
    <div className="space-y-6 pb-16">
      {/* ── Standard Navigation Header ── */}
      <MetaNavigationHeader />

      {/* ── Status Feedback Banner ── */}
      {message && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl border text-xs font-semibold animate-in fade-in-0 duration-150 ${
            message.type === "success"
              ? "bg-emerald-50/90 border-emerald-200 text-emerald-900"
              : "bg-rose-50/90 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
          >
            ×
          </button>
        </div>
      )}

      {/* ── 1. Executive Hero Header ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[#1877F2]/10 text-[#1877F2] flex items-center justify-center shrink-0 border border-[#1877F2]/20 shadow-xs">
            <Globe className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badgeInfo.badgeClass}`}>
                <span className={`h-2 w-2 rounded-full ${badgeInfo.dotClass} animate-pulse`} />
                <span>{badgeInfo.label}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <Shield className="h-3 w-3 text-slate-500" />
                <span>Portfolio: Plain Stitch (1068222718624963)</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Layers className="h-3 w-3 text-blue-600" />
                <span>Apple iOS 14.5+ AEM Active</span>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              Domain Ownership &amp; Aggregated Event Measurement (AEM)
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
              Monitor apex domain verification, live Namecheap DNS TXT record propagation, and iOS 14.5+ conversion priority tiers for <strong>{rootDomain}</strong>. All configuration and token edits are centralized in Meta Suite Settings.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap lg:flex-col items-center lg:items-end gap-2.5 shrink-0">
          <Link
            href="/admin/meta/settings?section=domain"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold text-xs px-4 py-2.5 shadow-xs transition cursor-pointer"
          >
            <Settings className="h-4 w-4" />
            <span>Manage in Meta Suite Settings</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualDnsCheck}
              disabled={checking || recheckingDns}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs px-3.5 py-2 transition cursor-pointer shadow-2xs disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-emerald-600 ${checking || recheckingDns ? "animate-spin" : ""}`} />
              <span>{checking || recheckingDns ? "Checking DNS..." : "Run Live DNS Check"}</span>
            </button>
            <a
              href="https://business.facebook.com/settings/owned-domains"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs px-3 py-2 transition cursor-pointer shadow-2xs"
            >
              <span>Meta Domains</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </a>
          </div>
        </div>
      </div>

      {/* ── Multi-Domain Registry Selector ── */}
      {checkResult && checkResult.domains && checkResult.domains.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto text-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
              Registered Domains:
            </span>
            {checkResult.domains.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => fetchDomainOverview(d.domain, false)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border font-semibold text-xs transition cursor-pointer shrink-0 ${
                  d.domain === selectedDomain
                    ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span>{d.domain}</span>
                {d.isPrimary && (
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-500 text-white font-black tracking-wider">
                    Primary Root
                  </span>
                )}
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    d.lifecycleState === "VERIFIED"
                      ? "bg-emerald-400"
                      : d.lifecycleState === "DNS_DETECTED"
                      ? "bg-blue-400"
                      : "bg-amber-400"
                  }`}
                />
              </button>
            ))}
          </div>
          <Link
            href="/admin/meta/settings?section=domain"
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 shrink-0 inline-flex items-center gap-1"
          >
            <span>+ Add / Manage Domains</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* ── 2. Phase 1: Domain Verification Overview Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Primary Domain */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Root Domain</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span>Primary Apex</span>
            </span>
          </div>
          <div>
            <div className="font-mono text-base font-black text-slate-900">{rootDomain}</div>
            <div className="text-[11px] text-slate-500 mt-1">Apex DNS &amp; Storefront FQDN Target</div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">DNS Provider</span>
            <span className="text-slate-700 font-semibold text-[11px]">Namecheap Apex</span>
          </div>
        </div>

        {/* Card 2: Verification Status */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Verification Status</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeInfo.badgeClass}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${badgeInfo.dotClass}`} />
              <span>{badgeInfo.label}</span>
            </span>
          </div>
          <div>
            <div className="font-semibold text-sm text-slate-900 leading-snug">
              {checkResult?.lifecycleState === "VERIFIED"
                ? "Meta & DNS Confirmed"
                : checkResult?.lifecycleState === "DNS_DETECTED"
                ? "Namecheap DNS Detected"
                : "Awaiting Verification"}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">
              {badgeInfo.desc}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">Primary Method</span>
            <span className="text-emerald-700 font-semibold text-[11px]">DNS TXT Record</span>
          </div>
        </div>

        {/* Card 3: Meta Business Portfolio */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Business Portfolio</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              <Shield className="h-3 w-3 text-purple-600" />
              <span>Confirmed</span>
            </span>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>{checkResult?.portfolio?.name || "Plain Stitch"}</span>
              <button
                type="button"
                onClick={() => copyText(checkResult?.portfolio?.id || "1068222718624963", setCopiedPortfolioId)}
                className="text-[10px] text-slate-400 hover:text-slate-700 font-mono inline-flex items-center gap-1 cursor-pointer"
                title="Copy Business ID"
              >
                {copiedPortfolioId ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{checkResult?.portfolio?.id || "1068222718624963"}</span>
              </button>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Verified Business Asset Holder</div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">Portfolio Binding</span>
            <span className="text-purple-700 font-semibold text-[11px]">Authoritative</span>
          </div>
        </div>

        {/* Card 4: AEM Configuration */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Aggregated Events</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <Layers className="h-3 w-3 text-blue-600" />
              <span>5 of 8 Active</span>
            </span>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">5 Calibrated / 3 Open</div>
            <div className="text-[11px] text-slate-500 mt-1">Apple iOS 14.5+ conversion priority</div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">Hierarchy Order</span>
            <span className="text-blue-700 font-semibold text-[11px]">Purchase #1 (ROAS)</span>
          </div>
        </div>
      </div>

      {/* ── 3. Phase 2: Three Independent Diagnostic Pillars ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Shield className="h-4 w-4 text-slate-600" />
              <span>Three Independent Verification Pillars</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Local DNS checks, website metadata injection, and Meta Business Manager ownership confirmation are tracked separately.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 text-xs font-semibold cursor-pointer shadow-2xs"
            >
              <span>{showTechnicalDetails ? "Hide Snippets & Records" : "Show Snippets & Records"}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pillar 1: DNS TXT Verification */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5 text-slate-600" />
                  Pillar 1: DNS TXT
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
              <div>
                <div className="text-sm font-bold text-slate-900">
                  {rootDomain} (Apex DNS)
                </div>
                <div className="text-xs text-slate-600 font-mono mt-0.5">
                  Host: @ | Type: TXT
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {checkResult?.lastDetails || "Querying live DNS TXT records directly on Namecheap..."}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-slate-400 font-bold uppercase text-[10px]">
                  <span>Configured Token</span>
                  <button
                    type="button"
                    onClick={() => copyText(dnsSnippet, setCopiedDns)}
                    className="text-emerald-600 hover:text-emerald-800 cursor-pointer inline-flex items-center gap-1"
                  >
                    {copiedDns ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedDns ? "Copied" : "Copy Record"}</span>
                  </button>
                </div>
                <div className="font-mono text-slate-700 truncate">{maskedToken}</div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/60 space-y-2">
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>Provider: <strong>Namecheap</strong></span>
                <span>Records: <strong>{checkResult?.lastExaminedRecords?.length || 0}</strong></span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleManualDnsCheck}
                  disabled={recheckingDns}
                  className="w-full text-center py-1.5 px-3 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold cursor-pointer disabled:opacity-40 transition"
                >
                  {recheckingDns ? "Querying Namecheap..." : "Re-check DNS"}
                </button>
              </div>
            </div>
          </div>

          {/* Pillar 2: HTML Meta Tag Verification */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <FileCode className="h-3.5 w-3.5 text-slate-600" />
                  Pillar 2: HTML Meta Tag
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
              <div>
                <div className="text-sm font-bold text-slate-900">
                  https://{rootDomain}/
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Root <code>&lt;head&gt;</code> Next.js metadata
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Injected automatically across all storefront pages to satisfy Meta crawler fallback verification.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-slate-400 font-bold uppercase text-[10px]">
                  <span>HTML Snippet</span>
                  <button
                    type="button"
                    onClick={() => copyText(metaTagSnippet, setCopiedMeta)}
                    className="text-emerald-600 hover:text-emerald-800 cursor-pointer inline-flex items-center gap-1"
                  >
                    {copiedMeta ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedMeta ? "Copied" : "Copy Tag"}</span>
                  </button>
                </div>
                <div className="font-mono text-slate-700 truncate">
                  {'<meta name="facebook-domain-verification" ... />'}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/60 space-y-2">
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>Channel: <strong>Storefront Head</strong></span>
                <span>Role: <strong>Secondary</strong></span>
              </div>
              <button
                type="button"
                onClick={handleManualHtmlCheck}
                disabled={recheckingHtml}
                className="w-full text-center py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer disabled:opacity-40 transition shadow-2xs"
              >
                {recheckingHtml ? "Fetching HTML..." : "Re-check Website Tag"}
              </button>
            </div>
          </div>

          {/* Pillar 3: Meta Business Manager Ownership */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-slate-600" />
                  Pillar 3: Meta Ownership
                </span>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    isOwnershipVerified
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  {isOwnershipVerified ? "CONFIRMED" : "ACTION REQUIRED"}
                </span>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">
                  Portfolio: {checkResult?.portfolio?.name || "Plain Stitch"}
                </div>
                <div className="text-xs text-slate-600 font-mono mt-0.5">
                  ID: {checkResult?.portfolio?.id || "1068222718624963"}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {isOwnershipVerified
                    ? `Confirmed in Meta Business Manager on ${
                        checkResult?.metaOwnershipVerifiedAt
                          ? new Date(checkResult.metaOwnershipVerifiedAt).toLocaleDateString()
                          : "Active"
                      } by ${checkResult?.metaOwnershipConfirmedBy || "Administrator"}.`
                    : "Domain ownership must be recorded once confirmed inside Meta Business Manager."}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 text-[11px] space-y-1">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Verification Evidence</div>
                <div className="text-slate-700 text-xs">
                  {isOwnershipVerified ? "Confirmed via Business Portfolio binding." : "Awaiting administrator confirmation."}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/60 space-y-2">
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span>{isOwnershipVerified ? "Confirmed" : "Action Req."}</span>
                </div>
                <a
                  href="https://business.facebook.com/settings/owned-domains"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#1877F2] hover:underline inline-flex items-center gap-1"
                >
                  <span>Open Meta</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <button
                type="button"
                disabled={confirmingOwnership}
                onClick={() => handleToggleMetaOwnership(!isOwnershipVerified)}
                className={`w-full text-center py-1.5 px-3 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50 transition border ${
                  isOwnershipVerified
                    ? "border-slate-200 bg-white hover:bg-slate-50 text-rose-600"
                    : "border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800"
                }`}
              >
                {confirmingOwnership
                  ? "Updating..."
                  : isOwnershipVerified
                  ? "Revoke Meta Confirmation"
                  : "Record Meta Confirmation"}
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Technical Details: Code Snippets & Namecheap Records Inspector */}
        {showTechnicalDetails && (
          <div className="space-y-4 pt-4 border-t border-slate-200/80 animate-in fade-in-0 duration-150">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Method 1 Code Snippet */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Server className="h-3.5 w-3.5 text-slate-600" />
                    <span>DNS TXT Record Spec (Namecheap Advanced DNS)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(dnsSnippet, setCopiedDns)}
                    className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 cursor-pointer text-[11px] font-bold"
                  >
                    {copiedDns ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedDns ? "Copied!" : "Copy Record"}</span>
                  </button>
                </div>
                <pre className="bg-slate-900 text-emerald-400 p-2.5 rounded-lg text-[11px] font-mono overflow-x-auto shadow-inner [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {dnsSnippet}
                </pre>
                <p className="text-[11px] text-slate-500 leading-normal">
                  In Namecheap cPanel or Advanced DNS, add a <strong>TXT Record</strong> with Host: <code>@</code> and Value: <code>{dnsSnippet}</code>. TTL can be set to Automatic or 1 min for fast propagation.
                </p>
              </div>

              {/* Method 2 Code Snippet */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <FileCode className="h-3.5 w-3.5 text-slate-600" />
                    <span>HTML &lt;head&gt; Meta Tag (Auto-Injected)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(metaTagSnippet, setCopiedMeta)}
                    className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 cursor-pointer text-[11px] font-bold"
                  >
                    {copiedMeta ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedMeta ? "Copied!" : "Copy Tag"}</span>
                  </button>
                </div>
                <pre className="bg-slate-900 text-emerald-400 p-2.5 rounded-lg text-[11px] font-mono overflow-x-auto shadow-inner [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {metaTagSnippet}
                </pre>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Automatically injected into <code>&lt;head&gt;</code> across all <strong>https://{rootDomain}</strong> pages via Next.js metadata.
                </p>
              </div>
            </div>

            {/* Live Namecheap TXT Records Inspector */}
            {checkResult && checkResult.lastExaminedRecords && checkResult.lastExaminedRecords.length > 0 && (
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-slate-600" />
                    <span>Live Examined TXT Records Detected on {rootDomain} ({checkResult.lastExaminedRecords.length} records)</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">Direct resolver query</span>
                </div>
                <div className="space-y-1.5">
                  {checkResult.lastExaminedRecords.map((rec, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded-lg text-[11px] font-mono border flex items-center justify-between ${
                        rec.includes("facebook-domain-verification")
                          ? "bg-emerald-50/90 border-emerald-300 text-emerald-900 font-bold"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      <span className="truncate flex-1">{rec}</span>
                      {rec.includes("facebook-domain-verification") && (
                        <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-extrabold ml-2">
                          Meta Match
                        </span>
                      )}
                      {rec.startsWith("v=spf") && (
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold ml-2">
                          SPF Record
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 4. Phase 4 & 5: Aggregated Event Measurement (AEM) 8-Event Priority Tier ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#1877F2]" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Apple iOS 14.5+ Aggregated Event Measurement (AEM) Hierarchy
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              When iOS 14.5+ users opt out of app tracking, Meta only receives and attributes the single highest-priority event configured in this hierarchy.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700 self-start sm:self-auto">
              5 of 8 Slots Calibrated
            </span>
            <Link
              href="/admin/meta/settings?section=domain"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-1 text-xs font-semibold cursor-pointer shadow-2xs"
            >
              <Settings className="h-3 w-3" />
              <span>Configure in Suite Settings</span>
            </Link>
          </div>
        </div>

        {/* 8-Slot Layout: 5 Calibrated Slots + 3 Unassigned Slots */}
        <div className="space-y-2.5">
          {checkResult?.aem?.allSlots ? (
            checkResult.aem.allSlots.map((item) => (
              <div
                key={item.slot}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition gap-3 ${
                  item.isCalibrated
                    ? "border-slate-200/80 bg-slate-50/60 hover:bg-slate-50"
                    : "border-dashed border-slate-200 bg-slate-50/20 text-slate-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-7 w-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                      item.isCalibrated ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    #{item.slot}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${item.isCalibrated ? "text-slate-900" : "text-slate-500"}`}>
                        {item.name}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${item.badge}`}>
                        {item.level}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
                  </div>
                </div>

                <div className="text-left sm:text-right text-xs font-medium text-slate-600 shrink-0">
                  <span className="text-slate-400">Optimization: </span>
                  <span className={item.isCalibrated ? "font-bold text-slate-800" : "text-slate-400"}>
                    {item.optimization}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-xs text-slate-400">Loading AEM priority configuration...</div>
          )}
        </div>

        {/* Meta Graph API v22.0 Architectural Limitation Disclosure Card */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-blue-900">
            <Info className="h-4 w-4 text-blue-600 shrink-0" />
            <span>Meta Graph API v22.0 Architectural Disclosure</span>
          </div>
          <p className="text-blue-800 leading-relaxed text-[11px]">
            {checkResult?.aem?.metaApiLimitationNote ||
              "Meta Graph API v22.0 does not expose a public programmatic REST endpoint to query or mutate tenant Aggregated Event Measurement (AEM) slot priorities. ANGKON maintains this calibrated hierarchy locally to ensure high-priority CAPI payload dispatching. Ensure your Meta Events Manager > Aggregated Event Measurement configuration mirrors this exact hierarchy."}
          </p>
          <div className="pt-2 flex items-center justify-between text-[11px] text-blue-700 border-t border-blue-200/60 font-semibold">
            <span>Local Dispatch Priority: <strong>100% Calibrated (Purchase #1)</strong></span>
            <a
              href="https://business.facebook.com/events_manager2/list/dataset"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
            >
              <span>Verify in Meta Events Manager</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* ── 5. Phase 3: Grouped Audit History (Deduplicated & Filterable) ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-slate-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Verification Audit History ({rootDomain})
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Append-only audit trail. Routine consecutive successful checks are collapsed to prevent visual noise.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Pills */}
            <div className="inline-flex p-0.5 rounded-xl bg-slate-100 text-xs">
              {(["ALL", "CHANGES", "ROUTINE", "ERRORS"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setAuditFilter(mode)}
                  className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition cursor-pointer ${
                    auditFilter === mode ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {mode === "ALL" ? "All" : mode === "CHANGES" ? "State Changes" : mode === "ROUTINE" ? "Routine Checks" : "Errors"}
                </button>
              ))}
            </div>

            {/* Method Filter */}
            <select
              value={auditMethodFilter}
              onChange={(e) => setAuditMethodFilter(e.target.value)}
              className="px-2.5 py-1 rounded-xl border border-slate-200 bg-white text-slate-700 text-[11px] font-semibold cursor-pointer"
            >
              <option value="ALL">All Methods</option>
              <option value="dns_txt">DNS TXT</option>
              <option value="html_meta_tag">HTML Meta Tag</option>
              <option value="ownership">Ownership Action</option>
            </select>
          </div>
        </div>

        {/* Audit Log Entries */}
        {filteredAuditLogs && filteredAuditLogs.length > 0 ? (
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
            {filteredAuditLogs.map((item) => (
              <div key={item._id} className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.isGrouped ? (
                      <span className="font-bold text-[10px] uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>{item.groupCount} Consecutive Successful Checks</span>
                      </span>
                    ) : (
                      <span className="font-semibold text-slate-800 uppercase tracking-wider text-[10px] bg-slate-100 px-2 py-0.5 rounded">
                        {item.action.replace(/_/g, " ")}
                      </span>
                    )}

                    <span
                      className={`font-bold text-[10px] px-2 py-0.5 rounded-full border ${
                        item.newState === "VERIFIED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : item.newState === "DNS_DETECTED"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : item.newState === "FAILED"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      State: {item.newState}
                    </span>

                    <span className="text-[10px] text-slate-400 font-mono">
                      Method: {item.verificationMethod}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600">
                    {item.isGrouped
                      ? `${item.groupCount} routine scheduled checks confirmed Namecheap DNS TXT records without changes.`
                      : item.details || "Domain verification event executed."}
                  </p>

                  {/* Expandable inspector for record details */}
                  {expandedAuditId === item._id && (
                    <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[10px] text-slate-700 space-y-1">
                      <div>Actor: {item.actor}</div>
                      {item.previousState && <div>Previous State: {item.previousState}</div>}
                      {item.dnsResult?.status && <div>DNS Status: {item.dnsResult.status}</div>}
                      {item.dnsResult?.recordsExamined !== undefined && (
                        <div>Examined Records Count: {item.dnsResult.recordsExamined}</div>
                      )}
                      {item.dnsResult?.matchedRecord && (
                        <div className="truncate text-emerald-700">Match: {item.dnsResult.matchedRecord}</div>
                      )}
                      {item.dnsResult?.error && <div className="text-rose-600">Error: {item.dnsResult.error}</div>}
                    </div>
                  )}
                </div>

                <div className="text-left sm:text-right text-[11px] text-slate-400 shrink-0 space-y-0.5">
                  <div>
                    {item.isGrouped && item.firstCheckedAt
                      ? `${new Date(item.firstCheckedAt).toLocaleTimeString()} – ${new Date(item.createdAt).toLocaleTimeString()}`
                      : new Date(item.createdAt).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500">By {item.actor}</div>
                  <button
                    type="button"
                    onClick={() => setExpandedAuditId(expandedAuditId === item._id ? null : item._id)}
                    className="text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    {expandedAuditId === item._id ? "Hide Details" : "View Details"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-slate-400 italic text-xs py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            No audit records matching the selected filter.
          </div>
        )}
      </div>

      {/* ── 6. Phase 7: Scheduled Verification & Resilience Bar ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-slate-400" />
            <span>
              Last Live Check:{" "}
              <strong className="text-slate-900 font-mono">
                {checkResult?.lastCheckedAt ? new Date(checkResult.lastCheckedAt).toLocaleTimeString() : "Pending"}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>
              Last Successful:{" "}
              <strong className="text-slate-900 font-mono">
                {checkResult?.lastSuccessfulCheckAt
                  ? new Date(checkResult.lastSuccessfulCheckAt).toLocaleTimeString()
                  : "N/A"}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Radio className="h-4 w-4 text-[#1877F2]" />
            <span>
              Next Scheduled Polling:{" "}
              <strong className="text-slate-900 font-mono">
                {checkResult?.nextScheduledCheck
                  ? new Date(checkResult.nextScheduledCheck).toLocaleTimeString()
                  : "~30 mins"}
              </strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50/80 px-3 py-1.5 rounded-xl border border-emerald-200/60 font-medium">
          <Shield className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>Transient DNS timeout resilience active (no false unverified alerts).</span>
        </div>
      </div>

      {/* ── Standardized Warning Confirmation Modal ── */}
      <MetaConfirmWarningModal
        isOpen={warningModalState.isOpen}
        onClose={() => setWarningModalState((s) => ({ ...s, isOpen: false }))}
        title={warningModalState.title}
        description={warningModalState.description}
        onConfirm={warningModalState.onConfirm}
        confirmButtonText="Confirm Change"
      />
    </div>
  );
}
