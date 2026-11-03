"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  BarChart3,
  Calendar,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Download,
  ShieldCheck,
  Zap,
  Layers,
  Percent,
  Loader2,
  AlertCircle,
  Clock,
  Coins,
  Globe,
  Sliders,
  RotateCcw,
  BookOpen,
  Trash2,
  Settings,
  ArrowRight,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  ChevronRight,
  Eye,
} from "lucide-react";
import { MetaNavigationHeader } from "../meta-nav";
import { MetaAssetLocatorModal } from "@/components/admin/meta/meta-asset-locator-modal";
import { InfoPopover } from "@/components/admin/meta/info-popover";
import { MetaConfirmWarningModal } from "@/components/admin/meta/meta-credential-modals";
import type { PublicAdminPixelSettings } from "@/server/pixel-settings";
import type { PublicAdminMetaMarketingSettings } from "@/server/meta-marketing-settings";
import type { DualLedgerAttributionReport } from "@/server/meta-ads";

interface EnrichedMetaCampaign {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  objective?: string;
  start_time?: string;
  stop_time?: string;
  spend?: number;
  currency?: string;
  impressions?: number;
  clicks?: number;
  results?: number;
  lastSynchronized?: string | null;
}

interface ImportJobSummary {
  jobId: string;
  level: string;
  status: "pending" | "running" | "paused_rate_limit" | "completed" | "failed";
  requestedRange: { since: string; until: string };
  totalSlices: number;
  completedSlices: number;
  totalRecords: number;
  totalSpend: number;
  currency: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  slices?: Array<{
    sliceIndex: number;
    since: string;
    until: string;
    status: string;
    recordsImported: number;
    spendInSlice: number;
    errorMessage?: string;
  }>;
}

function getInitialDates() {
  const d = new Date();
  const until = d.toISOString().slice(0, 10);
  const since = new Date(d.getTime() - 30 * 86400000).toISOString().slice(0, 10);
  return { since, until };
}

export default function MetaAdsPage() {
  const [pixelSettings, setPixelSettings] = useState<PublicAdminPixelSettings | null>(null);
  const [marketingSettings, setMarketingSettings] = useState<PublicAdminMetaMarketingSettings | null>(null);
  // True until the initial /ads/account request settles. Without it the status
  // pill cannot tell "still loading" apart from "the request failed".
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [businessId, setBusinessId] = useState("1646756900434912");
  const [marketingApiVersion, setMarketingApiVersion] = useState("v22.0");
  const [permissionScope, setPermissionScope] = useState("ads_read, ads_management");
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [adAccountId, setAdAccountId] = useState("");
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guideAssetId, setGuideAssetId] = useState("ad_account_id");
  const [testingConnection, setTestingConnection] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [inspectingJobId, setInspectingJobId] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<EnrichedMetaCampaign | null>(null);

  // Warning Modal State
  const [warningModalState, setWarningModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmButtonText?: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  // Level selection tab: "campaign" | "adset" | "ad"
  const [reportingLevel, setReportingLevel] = useState<"campaign" | "adset" | "ad">("campaign");

  // Date range
  const [since, setSince] = useState(() => getInitialDates().since);
  const [until, setUntil] = useState(() => getInitialDates().until);

  // Attribution comparison state
  const [report, setReport] = useState<DualLedgerAttributionReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Campaign list state
  const [campaigns, setCampaigns] = useState<EnrichedMetaCampaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  // Ingestion job state
  const [syncJobs, setSyncJobs] = useState<ImportJobSummary[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [resumingJobId, setResumingJobId] = useState<string | null>(null);
  const [showAdsDetails, setShowAdsDetails] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const setDatePreset = (preset: "today" | "7d" | "30d" | "month") => {
    const d = new Date();
    const untilStr = d.toISOString().slice(0, 10);
    if (preset === "today") {
      setSince(untilStr);
      setUntil(untilStr);
    } else if (preset === "7d") {
      const s = new Date(d.getTime() - 7 * 86400000).toISOString().slice(0, 10);
      setSince(s);
      setUntil(untilStr);
    } else if (preset === "30d") {
      const s = new Date(d.getTime() - 30 * 86400000).toISOString().slice(0, 10);
      setSince(s);
      setUntil(untilStr);
    } else if (preset === "month") {
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
      setSince(firstDay);
      setUntil(untilStr);
    }
  };

  // Fetch marketing account settings
  const refreshMarketingAccount = useCallback(async (verify = false) => {
    try {
      const res = await fetch(`/api/admin/meta/ads/account${verify ? "?verify=true" : ""}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.settings) {
          setMarketingSettings(data.settings);
          if (data.settings.adAccountId && !adAccountId) {
            setAdAccountId(data.settings.adAccountId);
          }
          if (data.businessId) setBusinessId(data.businessId);
          if (data.marketingApiVersion) setMarketingApiVersion(data.marketingApiVersion);
          if (data.permissionScope) setPermissionScope(data.permissionScope);
          if (data.lastSyncAt) setLastSyncAt(data.lastSyncAt);
        }
      }
    } catch {
      // ignore
    }
  }, [adAccountId]);

  // Fetch attribution report
  const refreshAttribution = useCallback(async (s: string, u: string, lvl: string) => {
    setLoadingReport(true);
    try {
      const res = await fetch(`/api/admin/meta/ads/attribution?since=${s}&until=${u}&level=${lvl}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok) setReport(data.report);
      }
    } catch {
      // ignore
    } finally {
      setLoadingReport(false);
    }
  }, []);

  // Fetch campaigns
  const refreshCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const res = await fetch("/api/admin/meta/ads/campaigns");
      if (res.ok) {
        const data = await res.json();
        if (data.ok) setCampaigns(data.campaigns || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  // Fetch sync jobs
  const refreshSyncJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/meta/ads/sync");
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.jobs)) {
          setSyncJobs(data.jobs);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Load initial settings
  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const [pixelRes, mktRes] = await Promise.all([
          fetch("/api/admin/settings/pixel"),
          fetch("/api/admin/meta/ads/account"),
        ]);

        if (pixelRes.ok && !ignore) {
          const pixelData: PublicAdminPixelSettings = await pixelRes.json();
          setPixelSettings(pixelData);
        }

        if (mktRes.ok && !ignore) {
          const mktData = await mktRes.json();
          if (mktData.ok && mktData.settings) {
            setMarketingSettings(mktData.settings);
            setAdAccountId(mktData.settings.adAccountId || "");
            if (mktData.businessId) setBusinessId(mktData.businessId);
            if (mktData.marketingApiVersion) setMarketingApiVersion(mktData.marketingApiVersion);
            if (mktData.permissionScope) setPermissionScope(mktData.permissionScope);
            if (mktData.lastSyncAt) setLastSyncAt(mktData.lastSyncAt);
          }
        }
      } catch {
        // ignore
      } finally {
        if (!ignore) setLoadingSettings(false);
      }
    }
    void init();
    return () => {
      ignore = true;
    };
  }, []);

  // Load attribution and jobs on dates/level changes
  useEffect(() => {
    void refreshAttribution(since, until, reportingLevel);
    void refreshSyncJobs();
  }, [since, until, reportingLevel, refreshAttribution, refreshSyncJobs]);

  // Load campaigns when token is present
  useEffect(() => {
    if (!marketingSettings?.hasAccessToken) return;
    void refreshCampaigns();
  }, [marketingSettings?.hasAccessToken, refreshCampaigns]);

  const handleRequestDismissJob = (jobId: string) => {
    setWarningModalState({
      isOpen: true,
      title: "Remove Sync Record?",
      description: `This will remove sync record #${jobId} from your local historical ledger.`,
      confirmButtonText: "Remove Record",
      onConfirm: async () => {
        await handleDismissJob(jobId);
      },
    });
  };

  const handleRequestClearFailedJobs = () => {
    setWarningModalState({
      isOpen: true,
      title: "Clear All Failed Sync Jobs?",
      description: "This will remove all failed synchronization attempts from your ledger history.",
      confirmButtonText: "Clear Failed Jobs",
      onConfirm: async () => {
        await handleClearFailedJobs();
      },
    });
  };

  // Test & Verify Connection Live
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setMessage(null);
    const start = Date.now();
    try {
      const res = await fetch("/api/admin/meta/ads/account?verify=true");
      const data = await res.json();
      const latency = Date.now() - start;
      if (res.ok && data.ok) {
        setMarketingSettings(data.settings);
        if (data.businessId) setBusinessId(data.businessId);
        if (data.lastSyncAt) setLastSyncAt(data.lastSyncAt);
        await refreshCampaigns();
        setMessage({
          type: "success",
          text: `Verified in ${latency}ms! Account "${data.settings.accountName || "Plain Stitch"}" connected via Meta Graph API v22.0.`,
        });
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to verify Meta Marketing API connection.",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Network error verifying Marketing API connection." });
    } finally {
      setTestingConnection(false);
    }
  };

  // Trigger Sliced Historical Sync
  const handleStartSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/meta/ads/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          since,
          until,
          level: reportingLevel,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMessage({
          type: "success",
          text: `Sync job finished: ${data.job?.totalRecords || 0} records imported (Spend: ${data.job?.currency || "BDT"} ${(data.job?.totalSpend || 0).toLocaleString("en-BD")}).`,
        });
        setLastSyncAt(new Date().toISOString());
        void refreshAttribution(since, until, reportingLevel);
        void refreshSyncJobs();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to run sync job." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error during sync." });
    } finally {
      setSyncing(false);
    }
  };

  // Resume Paused Job
  const handleResumeJob = async (jobId: string) => {
    setResumingJobId(jobId);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/meta/ads/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resume", jobId }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMessage({
          type: "success",
          text: `Resumed job '${jobId}'. Status is now ${data.job?.status}.`,
        });
        void refreshAttribution(since, until, reportingLevel);
        void refreshSyncJobs();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to resume sync job." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error resuming job." });
    } finally {
      setResumingJobId(null);
    }
  };

  const handleDismissJob = async (jobId: string) => {
    try {
      const res = await fetch(`/api/admin/meta/ads/sync?jobId=${jobId}`, { method: "DELETE" });
      if (res.ok) {
        void refreshSyncJobs();
        setMessage({ type: "info", text: `Removed job ${jobId} from history.` });
      }
    } catch {
      // ignore
    }
  };

  const handleClearFailedJobs = async () => {
    try {
      const res = await fetch("/api/admin/meta/ads/sync?status=failed", { method: "DELETE" });
      if (res.ok) {
        void refreshSyncJobs();
        setMessage({ type: "success", text: "Cleared previous failed sync jobs from history." });
      }
    } catch {
      // ignore
    }
  };

  const handleRetryJob = async (job: ImportJobSummary) => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/meta/ads/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          since: job.requestedRange?.since || since,
          until: job.requestedRange?.until || until,
          level: job.level || reportingLevel,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMessage({
          type: "success",
          text: `Retried sync for ${job.level} completed: ${data.job?.totalRecords || 0} records imported.`,
        });
        void refreshAttribution(since, until, reportingLevel);
        void refreshSyncJobs();
      } else {
        setMessage({ type: "error", text: data.error || "Retry sync failed." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error during sync retry." });
    } finally {
      setSyncing(false);
    }
  };

  const pixelId = pixelSettings?.pixelId || "";
  const currencySymbol = report?.metaPlatformMetrics?.currency === "USD" ? "$" : "৳";

  // Connection Indicator Evaluation
  const renderConnectionStatus = () => {
    if (loadingSettings) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 border border-slate-200">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-pulse" />
          <span>Auditing credentials…</span>
        </span>
      );
    }
    if (marketingSettings === null) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 border border-slate-200">
          <AlertCircle className="h-3.5 w-3.5 text-slate-500" />
          <span>Settings Unavailable</span>
        </span>
      );
    }
    if (marketingSettings?.status === "connected" || marketingSettings?.status === "assets_retrieved") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span>Connected &amp; Verified</span>
        </span>
      );
    }
    if (marketingSettings?.status === "rate_limited") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200">
          <Clock className="h-3.5 w-3.5 text-amber-600" />
          <span>Rate-Limited (Throttled by Meta)</span>
        </span>
      );
    }
    if (marketingSettings?.status === "token_expired") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-800 border border-rose-200">
          <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
          <span>Token Expired (Code 190)</span>
        </span>
      );
    }
    if (marketingSettings?.status === "permission_denied") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-800 border border-rose-200">
          <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
          <span>Missing Required Permissions</span>
        </span>
      );
    }
    if (marketingSettings?.hasAccessToken) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200">
          <Info className="h-3.5 w-3.5 text-blue-600" />
          <span>Configured (Awaiting Validation)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 border border-slate-200">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        <span>Unconfigured</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl pb-24 text-slate-900 font-sans antialiased">
      {/* ── 1. Unified Navigation ── */}
      <MetaNavigationHeader pixelId={pixelId} testEventCode={pixelSettings?.testEventCode} />

      {/* ── 2. Toast Alerts ── */}
      {message && (
        <div
          className={`flex items-start gap-3 rounded-xl p-3.5 border shadow-2xs transition-all ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : message.type === "info"
              ? "bg-blue-50 border-blue-200 text-blue-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
          ) : message.type === "info" ? (
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
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
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/70 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
              <BarChart3 className="h-3 w-3 text-amber-600" />
              <span>Meta Marketing API v22.0 (Strict Read-Only ads_read)</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              Ad Account Attribution &amp; Dual-Ledger Financial Audit
            </h2>
            <p className="text-xs sm:text-[13px] text-slate-600 max-w-3xl leading-relaxed">
              Connect your authorized Meta Ad Account to audit daily ad performance, inspect level-isolated metrics (Campaign, Ad Set, Ad), and reconcile Meta platform-attributed conversions against actual realized store cash.
            </p>
          </div>

          <a
            href="https://adsmanager.facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer self-start md:self-auto shrink-0"
          >
            <span>Open Meta Ads Manager</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </a>
        </div>
      </div>

      {/* ── 4. PHASE 1 & 2: Meta Ads Account Connection (Read-Only Control Hub) ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Meta Ads Account Connection
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Read-only connection telemetry. Credential modifications and token replacements are strictly managed in Meta Suite Settings.
            </p>
          </div>
          <div>{renderConnectionStatus()}</div>
        </div>

        {/* Account Telemetry & Connection Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Tile 1: Account Name & Ad Account ID */}
          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between gap-2 shadow-2xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Connected Ad Account
              </span>
              <span className="font-bold text-slate-900 text-sm block">
                {marketingSettings?.accountName || "Plain Stitch"}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-slate-700">
                {adAccountId || "act_1646756900434912"}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(adAccountId || "act_1646756900434912", "actId")}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                title="Copy Ad Account ID"
              >
                {copiedKey === "actId" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{copiedKey === "actId" ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* Tile 2: Business Manager Portfolio ID */}
          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between gap-2 shadow-2xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Business Portfolio ID
              </span>
              <span className="font-bold text-slate-900 text-sm block">
                Plain Stitch Portfolio
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-slate-700">
                {businessId}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(businessId, "bizId")}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                title="Copy Business ID"
              >
                {copiedKey === "bizId" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{copiedKey === "bizId" ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* Tile 3: Currency & Timezone */}
          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between gap-2 shadow-2xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Account Currency &amp; Timezone
              </span>
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-amber-600" />
                <span>{marketingSettings?.accountCurrency || "BDT"}</span>
                <span className="text-slate-400 font-normal">•</span>
                <span className="text-xs text-slate-700 font-medium">
                  {marketingSettings?.accountTimezoneName || "Asia/Dhaka"}
                </span>
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
              UTC+{marketingSettings?.accountTimezoneOffsetHours ?? 6} standard offset
            </div>
          </div>

          {/* Tile 4: Attribution Windows & Graph Version */}
          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between gap-2 shadow-2xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Attribution Setting &amp; API Version
              </span>
              <span className="font-bold text-slate-900 text-xs block font-mono">
                {marketingSettings?.attributionConfigKey || "7d_click+1d_view_rt_conversion"}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
              <span>Graph API: <strong className="font-mono text-slate-800">{marketingApiVersion}</strong></span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                Live Direct
              </span>
            </div>
          </div>
        </div>

        {/* Security, Permissions & Verification Status Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50/60 border border-slate-200/80 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Marketing API Token (AES-256 Vault)
            </span>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="font-mono font-bold text-slate-800">
                {marketingSettings?.maskedAccessToken || "EAAG••••••••••••••••"}
              </span>
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Verified Permission Scope
            </span>
            <span className="font-mono text-slate-700 font-semibold text-[11px]">
              {permissionScope}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Verification &amp; Sync Timestamps
            </span>
            <div className="text-[11px] text-slate-600">
              Verified: <strong className="text-slate-800 font-medium">
                {marketingSettings?.lastVerifiedAt ? new Date(marketingSettings.lastVerifiedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Active (v22.0)"}
              </strong>
              {lastSyncAt && (
                <>
                  <span className="text-slate-300 mx-1.5">|</span>
                  Synced: <strong className="text-slate-800 font-medium">{new Date(lastSyncAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</strong>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/admin/meta/settings?section=ads"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition cursor-pointer shadow-2xs"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Manage in Meta Suite Settings</span>
              <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
            </Link>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition disabled:opacity-40 cursor-pointer shadow-2xs"
            >
              {testingConnection ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Verifying via Graph API v22.0...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                  <span>Verify Connection</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowAdsDetails(!showAdsDetails)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 text-xs font-semibold cursor-pointer shadow-2xs"
            >
              <span>{showAdsDetails ? "Hide Technical Details" : "Show Technical Details"}</span>
              {showAdsDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setGuideAssetId("ad_account_id");
                setIsGuideOpen(true);
              }}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Where to find IDs?</span>
            </button>
          </div>
        </div>

        {/* Collapsible Technical Details Panel */}
        {showAdsDetails && (
          <div className="pt-3 border-t border-slate-200/80 text-xs space-y-3 animate-in fade-in-0 duration-150">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Technical Marketing API &amp; Attribution Architecture Specifications
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Graph API Endpoint</span>
                <span className="font-mono text-slate-800 text-xs block truncate" title={`https://graph.facebook.com/v22.0/${adAccountId || "act_1646756900434912"}`}>
                  /v22.0/{adAccountId || "act_1646756900434912"}
                </span>
                <div className="text-slate-500 text-[11px]">Insights, campaigns, and ad set attribution queries.</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Token Security &amp; Vault</span>
                <span className="font-semibold text-slate-800 text-xs block">AES-256-GCM Vault</span>
                <div className="text-slate-500 text-[11px]">Strict <code className="font-mono">ads_read</code> scope. Plaintext is never exposed.</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Reporting Isolation</span>
                <span className="font-semibold text-slate-800 text-xs block">Level-Isolated Queries</span>
                <div className="text-slate-500 text-[11px]">Campaign, ad set, and ad layers are stored in separate ledger partitions.</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 5. PHASE 4: Level Switcher & Reporting Controls ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Level Switcher Tabs */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Reporting Isolation Level (Prevents Double-Counting)
              </span>
              <InfoPopover metricKey="reporting-level" iconSize="xs" />
            </div>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
              {(["campaign", "adset", "ad"] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setReportingLevel(lvl)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition capitalize cursor-pointer ${
                    reportingLevel === lvl
                      ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {lvl === "campaign" ? "Campaign Level" : lvl === "adset" ? "Ad Set Level" : "Ad Level"}
                </button>
              ))}
            </div>
          </div>

          {/* Date Picker, Presets & Sync Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Presets */}
            <div className="hidden sm:inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/70 text-[11px] font-medium text-slate-600">
              <button
                type="button"
                onClick={() => setDatePreset("today")}
                className="px-2.5 py-1 hover:text-slate-900 cursor-pointer rounded-lg hover:bg-white/60 transition"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("7d")}
                className="px-2.5 py-1 hover:text-slate-900 cursor-pointer rounded-lg hover:bg-white/60 transition"
              >
                7D
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("30d")}
                className="px-2.5 py-1 hover:text-slate-900 cursor-pointer rounded-lg hover:bg-white/60 transition"
              >
                30D
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("month")}
                className="px-2.5 py-1 hover:text-slate-900 cursor-pointer rounded-lg hover:bg-white/60 transition"
              >
                This Month
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="date"
                value={since}
                onChange={(e) => setSince(e.target.value)}
                className="font-mono text-xs bg-transparent focus:outline-none"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
                className="font-mono text-xs bg-transparent focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => void refreshAttribution(since, until, reportingLevel)}
              disabled={loadingReport}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingReport ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleStartSync}
              disabled={syncing || !marketingSettings?.hasAccessToken}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-40 cursor-pointer shadow-2xs"
            >
              {syncing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Syncing (30d slices)...</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>Sync Insights ({reportingLevel})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Timezone and Attribution Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-slate-400" />
            <span>Account Timezone: <strong className="text-slate-700 font-semibold">{marketingSettings?.accountTimezoneName || "Asia/Dhaka"} (UTC+{marketingSettings?.accountTimezoneOffsetHours ?? 6})</strong></span>
            <span className="text-slate-300">•</span>
            <span>Attribution Window: <strong className="font-mono text-slate-700">{marketingSettings?.attributionConfigKey || "7d_click+1d_view_rt_conversion"}</strong></span>
          </div>
          {lastSyncAt && (
            <div>
              Last Sliced Sync: <strong className="text-slate-700 font-semibold">{new Date(lastSyncAt).toLocaleString()}</strong>
            </div>
          )}
        </div>
      </div>

      {/* ── 6. PHASE 3: Dual-Ledger Financial Reconciliation (Platform Claims vs. Real Store Cash) ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Dual-Ledger Audit: Meta Claimed Conversions vs. Real Store Cash Collected
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Active Level: <strong className="uppercase text-slate-800">{reportingLevel}</strong> | Tenant: {marketingSettings?.tenantId || "angkon-main"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* Card A: Meta Platform Reported */}
          <div className="p-5 sm:p-6 space-y-3 bg-blue-50/20">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                Meta Ads Manager Attributed
              </span>
              <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                Level: {reportingLevel}
              </span>
            </div>
            <div>
              {report?.metaPlatformMetrics?.isAvailable === false ? (
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-slate-400">Unavailable</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                    Sync Required
                  </span>
                </div>
              ) : (
                <div className="text-2xl font-black text-slate-900">
                  {currencySymbol} {(report?.metaPlatformMetrics.totalSpend ?? 0).toLocaleString("en-BD")}
                </div>
              )}
              <p className="text-[11px] text-slate-500 mt-0.5">
                Meta Ad Spend ({report?.metaPlatformMetrics?.currency || "BDT"})
              </p>
            </div>

            <div className="pt-2 border-t border-blue-100/60 space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between">
                <span>Impressions / Reach:</span>
                <strong className="font-bold">
                  {(report?.metaPlatformMetrics.totalImpressions || 0).toLocaleString("en-BD")} /{" "}
                  {(report?.metaPlatformMetrics.totalReach || 0).toLocaleString("en-BD")}
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1">
                  <span>Clicks / CTR:</span>
                  <InfoPopover metricKey="ctr" iconSize="xs" />
                </span>
                <strong className="font-bold">
                  {(report?.metaPlatformMetrics.totalClicks || 0).toLocaleString("en-BD")} (
                  {report?.metaPlatformMetrics.avgCtr ?? 0}%)
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1">
                  <span>Avg CPC / CPM:</span>
                  <InfoPopover metricKey="cpc" iconSize="xs" />
                </span>
                <strong className="font-bold">
                  {currencySymbol}{report?.metaPlatformMetrics.avgCpc ?? 0} / {currencySymbol}{report?.metaPlatformMetrics.avgCpm ?? 0}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Claimed Purchases:</span>
                <strong className="font-bold text-blue-900">
                  {report?.metaPlatformMetrics.metaReportedPurchases ?? "—"}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Claimed Value:</span>
                <strong className="font-bold text-blue-900">
                  {currencySymbol} {(report?.metaPlatformMetrics.metaReportedRevenue ?? 0).toLocaleString("en-BD")}
                </strong>
              </div>
              <div className="flex justify-between items-center text-blue-700 font-bold pt-1 border-t border-blue-100">
                <span className="flex items-center gap-1">
                  <span>Meta Claimed ROAS:</span>
                  <InfoPopover metricKey="meta-roas" iconSize="xs" />
                </span>
                <span>
                  {report?.metaPlatformMetrics?.metaClaimedRoas !== null && report?.metaPlatformMetrics?.metaClaimedRoas !== undefined
                    ? `${report.metaPlatformMetrics.metaClaimedRoas}x`
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Card B: Real Store Internal Sales & Cash */}
          <div className="p-5 sm:p-6 space-y-3 bg-emerald-50/20">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Store Realized Cash (Net)
              </span>
              <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                Cash Basis
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-900">
                ৳ {(report?.actualStoreMetrics.netRealizedCash || 0).toLocaleString("en-BD")}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Settled Online Payments + Settled COD (Less Refunds)
              </p>
            </div>

            <div className="pt-2 border-t border-emerald-100/60 space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between">
                <span>Total Orders Created:</span>
                <strong className="font-bold">{report?.actualStoreMetrics.totalOrders || 0}</strong>
              </div>
              <div className="flex justify-between">
                <span>Delivered Orders:</span>
                <strong className="font-bold">{report?.actualStoreMetrics.deliveredOrders || 0}</strong>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Cancelled / Failed:</span>
                <span>{report?.actualStoreMetrics.cancelledOrders || 0}</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Refunded Orders:</span>
                <span>৳ {(report?.actualStoreMetrics.refundedCash || 0).toLocaleString("en-BD")}</span>
              </div>
              <div className="flex justify-between text-amber-800 font-medium">
                <span>Unsettled / In-Transit COD:</span>
                <span>৳ {(report?.actualStoreMetrics.unsettledPendingCash || 0).toLocaleString("en-BD")}</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-bold pt-1 border-t border-emerald-100">
                <span>Gross Realized Cash:</span>
                <span>৳ {(report?.actualStoreMetrics.realizedPaidCash || 0).toLocaleString("en-BD")}</span>
              </div>
            </div>
          </div>

          {/* Card C: Cross-System Comparison & Diagnostic Disclaimer */}
          <div className="p-5 sm:p-6 space-y-3 bg-slate-50/60 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5 text-slate-500" />
                  Cross-System Diagnostic
                </span>
                <span className="text-[10px] font-mono bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded">
                  Dual-Ledger
                </span>
              </div>
              <div>
                {report?.reconciliationDiagnostics?.isAvailable === false ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-slate-400">—</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      Awaiting Sync
                    </span>
                  </div>
                ) : (
                  <div className="text-2xl font-black text-slate-900">
                    {report?.actualStoreMetrics.storeRealizedCashPerMetaSpend !== null &&
                    report?.actualStoreMetrics.storeRealizedCashPerMetaSpend !== undefined
                      ? `${report.actualStoreMetrics.storeRealizedCashPerMetaSpend}x`
                      : "—"}
                  </div>
                )}
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  Store Realized Cash / Meta Ad Spend (Cross-System Diagnostic)
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/60 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Purchase Count Gap:</span>
                  <span className="font-mono">
                    {report?.reconciliationDiagnostics?.isAvailable === false
                      ? "—"
                      : `${report?.reconciliationDiagnostics.purchaseCountGap || 0} orders`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Revenue Variance:</span>
                  <span className="font-mono">
                    {report?.reconciliationDiagnostics?.isAvailable === false
                      ? "—"
                      : `${currencySymbol} ${(report?.reconciliationDiagnostics.revenueGap || 0).toLocaleString("en-BD")}`}
                  </span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>ROAS Discrepancy:</span>
                  <span className="font-mono">
                    {report?.reconciliationDiagnostics?.isAvailable === false
                      ? "—"
                      : `${report?.reconciliationDiagnostics.roasDiscrepancy || 0}x`}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/60 text-[10.5px] text-amber-900 leading-normal">
              <strong>Measurement Rule:</strong> Meta Platform Conversions use statistical 7d-click / 1d-view windows and cross-device models. Store Net Realized Cash counts only collected bank payouts and settled COD. Delivered status alone is never treated as collected cash.
            </div>
          </div>
        </div>
      </div>

      {/* ── 7. PHASE 5: Resumable Slice Ingestion Jobs & Rate-Limit Audit ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-slate-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Historical Synchronization Jobs ({syncJobs.length})
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {syncJobs.some((j) => j.status === "failed") && (
              <button
                type="button"
                onClick={handleRequestClearFailedJobs}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer inline-flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear Failed Logs</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => void refreshSyncJobs()}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Refresh Jobs
            </button>
          </div>
        </div>

        {syncJobs.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            No historical sync jobs recorded yet. Click &quot;Sync Insights&quot; above to import ad performance.
          </div>
        ) : (
          <div className="space-y-3">
            {syncJobs.map((job) => (
              <div
                key={job.jobId}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800">{job.jobId}</span>
                      <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                        {job.level}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          job.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : job.status === "paused_rate_limit"
                            ? "bg-amber-100 text-amber-800"
                            : job.status === "running"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Range: {job.requestedRange?.since} to {job.requestedRange?.until} | Slices:{" "}
                      {job.completedSlices}/{job.totalSlices} | Records: {job.totalRecords} | Spend:{" "}
                      {job.currency} {(job.totalSpend || 0).toLocaleString("en-BD")}
                    </div>
                    {job.errorMessage && (
                      <div className="text-rose-600 text-[11px] font-mono leading-tight max-w-2xl bg-rose-50/80 p-2 rounded-lg border border-rose-200/60 mt-1">
                        {job.errorMessage}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setInspectingJobId(inspectingJobId === job.jobId ? null : job.jobId)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-2xs cursor-pointer"
                    >
                      <span>{inspectingJobId === job.jobId ? "Hide Slices" : "Inspect Slices"}</span>
                      {inspectingJobId === job.jobId ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>

                    {job.status === "paused_rate_limit" && (
                      <button
                        type="button"
                        onClick={() => handleResumeJob(job.jobId)}
                        disabled={resumingJobId === job.jobId}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition cursor-pointer shadow-2xs"
                      >
                        {resumingJobId === job.jobId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        <span>Resume Slices</span>
                      </button>
                    )}

                    {job.status === "failed" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRetryJob(job)}
                          disabled={syncing}
                          className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition cursor-pointer shadow-2xs disabled:opacity-50"
                        >
                          <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
                          <span>Retry Sync</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequestDismissJob(job.jobId)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:border-rose-200 transition cursor-pointer shadow-2xs"
                          title="Dismiss this failed job from history"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Dismiss</span>
                        </button>
                      </>
                    )}

                    {job.status === "completed" && (
                      <button
                        type="button"
                        onClick={() => handleRequestDismissJob(job.jobId)}
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                        title="Clear log"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Slices Inspection Drawer */}
                {inspectingJobId === job.jobId && Array.isArray(job.slices) && job.slices.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/70 space-y-1.5 animate-in fade-in-0 duration-150">
                    <div className="text-[10px] uppercase font-bold text-slate-500">
                      Partitioned 30-Day Execution Slices ({job.slices.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {job.slices.map((sl) => (
                        <div
                          key={sl.sliceIndex}
                          className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1 text-[11px]"
                        >
                          <div className="flex items-center justify-between font-mono">
                            <span className="font-bold text-slate-800">Slice #{sl.sliceIndex + 1}</span>
                            <span
                              className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                                sl.status === "completed"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : sl.status === "rate_limited"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {sl.status}
                            </span>
                          </div>
                          <div className="text-slate-500">
                            {sl.since} to {sl.until}
                          </div>
                          <div className="text-slate-700 font-medium">
                            Records: {sl.recordsImported} • Spend: {job.currency} {sl.spendInSlice.toLocaleString("en-BD")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 8. PHASE 6: Active Campaigns Telemetry ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-slate-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Ad Account Campaigns Telemetry ({campaigns.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={() => void refreshCampaigns()}
            disabled={loadingCampaigns || !marketingSettings?.hasAccessToken}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-40 cursor-pointer"
          >
            {loadingCampaigns ? "Loading..." : "Refresh Campaigns"}
          </button>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            {marketingSettings?.hasAccessToken
              ? "No campaigns found in this Meta Ad Account."
              : "Save your Meta Ad Account ID and authorized Marketing API token in Meta Suite Settings to load live campaigns."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold uppercase text-slate-400">
                  <th className="py-2.5 px-3">Campaign Name &amp; ID</th>
                  <th className="py-2.5 px-3">Delivery Status</th>
                  <th className="py-2.5 px-3">Objective</th>
                  <th className="py-2.5 px-3 text-right">Spend</th>
                  <th className="py-2.5 px-3 text-right">Impressions</th>
                  <th className="py-2.5 px-3 text-right">Clicks</th>
                  <th className="py-2.5 px-3 text-right">Results</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((camp) => (
                  <tr
                    key={camp.id}
                    onClick={() => setSelectedCampaign(camp)}
                    className="hover:bg-slate-50/80 transition cursor-pointer group"
                  >
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition">
                        {camp.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                        <span>ID: {camp.id}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(camp.id, `camp_${camp.id}`);
                          }}
                          className="hover:text-slate-700 cursor-pointer"
                          title="Copy Campaign ID"
                        >
                          {copiedKey === `camp_${camp.id}` ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          camp.effective_status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {camp.effective_status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-[11px] text-slate-600">
                        {camp.objective || "OUTCOME_SALES"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {camp.currency || "BDT"} {(camp.spend || 0).toLocaleString("en-BD")}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      {(camp.impressions || 0).toLocaleString("en-BD")}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      {(camp.clicks || 0).toLocaleString("en-BD")}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-blue-700">
                      {(camp.results || 0).toLocaleString("en-BD")}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-slate-400 group-hover:text-blue-600 transition">
                        <span className="text-[11px] font-semibold">Inspect</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Campaign Detail Modal ── */}
      {selectedCampaign && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0 duration-150"
        >
          <div
            className="fixed inset-0"
            onClick={() => setSelectedCampaign(null)}
            aria-hidden="true"
          />
          <div className="relative bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl z-10 space-y-4 font-sans text-slate-900">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  Campaign Telemetry Details
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedCampaign.name}
                </h3>
                <span className="font-mono text-xs text-slate-500">ID: {selectedCampaign.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Delivery Status</span>
                <span className="font-bold text-slate-800">{selectedCampaign.effective_status}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Objective</span>
                <span className="font-mono font-bold text-slate-800">{selectedCampaign.objective || "OUTCOME_SALES"}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Total Spend</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {selectedCampaign.currency || "BDT"} {(selectedCampaign.spend || 0).toLocaleString("en-BD")}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Conversions (Results)</span>
                <span className="font-mono font-bold text-blue-700 text-sm">
                  {(selectedCampaign.results || 0).toLocaleString("en-BD")} purchases
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Total Impressions</span>
                <span className="font-mono font-semibold text-slate-800">
                  {(selectedCampaign.impressions || 0).toLocaleString("en-BD")}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Total Clicks</span>
                <span className="font-mono font-semibold text-slate-800">
                  {(selectedCampaign.clicks || 0).toLocaleString("en-BD")}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <a
                href={`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${adAccountId || "1646756900434912"}&selected_campaign_ids=${selectedCampaign.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
              >
                <span>View Campaign in Meta Ads Manager</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Meta Asset Locator Guide Modal */}
      <MetaAssetLocatorModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        defaultAssetId={guideAssetId}
      />

      {/* Standardized White Destructive Warning Confirmation Modal */}
      <MetaConfirmWarningModal
        isOpen={warningModalState.isOpen}
        onClose={() => setWarningModalState((prev) => ({ ...prev, isOpen: false }))}
        title={warningModalState.title}
        description={warningModalState.description}
        confirmButtonText={warningModalState.confirmButtonText}
        onConfirm={warningModalState.onConfirm}
      />
    </div>
  );
}
