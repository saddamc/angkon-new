"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  Calendar,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Save,
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
} from "lucide-react";
import { MetaNavigationHeader } from "../meta-nav";
import type { PublicAdminPixelSettings } from "@/server/pixel-settings";
import type { PublicAdminMetaMarketingSettings } from "@/server/meta-marketing-settings";
import type { DualLedgerAttributionReport } from "@/server/meta-ads";

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  effective_status: string;
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
  createdAt: string;
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
  const [adAccountId, setAdAccountId] = useState("");
  const [marketingToken, setMarketingToken] = useState("");
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Level selection tab: "campaign" | "adset" | "ad"
  const [reportingLevel, setReportingLevel] = useState<"campaign" | "adset" | "ad">("campaign");

  // Date range
  const [since, setSince] = useState(() => getInitialDates().since);
  const [until, setUntil] = useState(() => getInitialDates().until);

  // Attribution comparison state
  const [report, setReport] = useState<DualLedgerAttributionReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Campaign list state
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  // Ingestion job state
  const [syncJobs, setSyncJobs] = useState<ImportJobSummary[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [resumingJobId, setResumingJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

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
          }
        }
      } catch {
        // ignore
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

  // Save Decoupled Credentials
  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCredentials(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/meta/ads/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adAccountId: adAccountId.trim(),
          accessToken: marketingToken.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setMarketingSettings(data.settings);
        setMarketingToken("");
        setMessage({
          type: "success",
          text: `Verified & connected Meta Ad Account '${data.account?.accountName || data.settings?.accountName}' (${data.account?.accountCurrency || "BDT"}).`,
        });
        void refreshCampaigns();
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to save or verify Marketing API credentials.",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Network error saving Marketing API credentials." });
    } finally {
      setSavingCredentials(false);
    }
  };

  // Test & Verify Connection
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setMessage(null);
    try {
      await refreshMarketingAccount(true);
      const res = await fetch("/api/admin/meta/ads/campaigns");
      const data = await res.json();
      if (res.ok && data.ok) {
        setCampaigns(data.campaigns || []);
        setMessage({
          type: "success",
          text: `Connection verified! Loaded ${data.total} campaign(s) from Meta Marketing API v22.0.`,
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

  const pixelId = pixelSettings?.pixelId || "";
  const currencySymbol = report?.metaPlatformMetrics?.currency === "USD" ? "$" : "৳";

  return (
    <div className="space-y-6 max-w-7xl pb-24 text-stone-900 font-sans antialiased">
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
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/70 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
              <BarChart3 className="h-3 w-3 text-amber-600" />
              <span>Meta Marketing API v22.0 (Strict Read-Only ads_read)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              Ad Account Attribution &amp; Dual-Ledger Financial Audit
            </h1>
            <p className="text-xs sm:text-[13px] text-stone-600 max-w-3xl leading-relaxed">
              Connect your authorized Meta Ad Account to audit daily ad performance, inspect level-isolated metrics (Campaign, Ad Set, Ad), and reconcile Meta platform-attributed conversions against actual realized store cash.
            </p>
          </div>

          <a
            href="https://adsmanager.facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-50 hover:border-stone-300 transition cursor-pointer self-start md:self-auto shrink-0"
          >
            <span>Open Meta Ads Manager</span>
            <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
          </a>
        </div>
      </div>

      {/* ── 4. Decoupled Marketing API Credentials & Account Status ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-stone-100">
          <div>
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
              Meta Marketing API Settings (Decoupled)
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Decoupled from Pixel/CAPI tokens. Requires a System User or OAuth token with <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-700 font-mono text-[11px]">ads_read</code> permission.
            </p>
          </div>
          <div>
            {marketingSettings?.status === "connected" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Connected &amp; Verified</span>
              </span>
            ) : marketingSettings?.status === "rate_limited" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                <Clock className="h-3.5 w-3.5" />
                <span>Rate-Limited (Throttled by Meta)</span>
              </span>
            ) : marketingSettings?.status === "token_expired" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-800 border border-rose-200">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Token Expired (Code 190)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-600 border border-stone-200">
                <span>Unconfigured</span>
              </span>
            )}
          </div>
        </div>

        {/* Ad Account Metadata Banner */}
        {marketingSettings?.accountName && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200/80 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Account Name</span>
              <span className="font-semibold text-stone-800">{marketingSettings.accountName}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 flex items-center gap-1">
                <Coins className="h-3 w-3 text-stone-500" />
                Currency
              </span>
              <span className="font-semibold text-stone-800 font-mono">{marketingSettings.accountCurrency || "BDT"}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 flex items-center gap-1">
                <Globe className="h-3 w-3 text-stone-500" />
                Timezone
              </span>
              <span className="font-semibold text-stone-800">{marketingSettings.accountTimezoneName} (UTC+{marketingSettings.accountTimezoneOffsetHours})</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Attribution Key</span>
              <span className="font-mono text-[11px] text-stone-600 truncate block" title={marketingSettings.attributionConfigKey}>
                {marketingSettings.attributionConfigKey}
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSaveCredentials} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5">
              Meta Ad Account ID
            </label>
            <input
              type="text"
              value={adAccountId}
              onChange={(e) => setAdAccountId(e.target.value)}
              placeholder="e.g. act_1234567890 or 1234567890"
              className="w-full rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-mono text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 transition shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5">
              Marketing API Access Token (OAuth / System User)
            </label>
            <input
              type="password"
              value={marketingToken}
              onChange={(e) => setMarketingToken(e.target.value)}
              placeholder={
                marketingSettings?.hasAccessToken
                  ? `${marketingSettings.maskedAccessToken} (Saved — enter new to replace)`
                  : "EAAG... (Paste token with ads_read permission)"
              }
              className="w-full rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-mono text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 transition shadow-2xs"
            />
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection || (!marketingToken && !marketingSettings?.hasAccessToken)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition disabled:opacity-40 cursor-pointer shadow-2xs"
            >
              {testingConnection ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Verifying via Graph API v22.0...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Verify Ad Account Connection</span>
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={savingCredentials}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-stone-800 transition disabled:opacity-40 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{savingCredentials ? "Saving..." : "Save & Verify Credentials"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── 5. Level Switcher & Audit Controls ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Level Switcher Tabs */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
              Reporting Isolation Level (Prevents Double-Counting)
            </span>
            <div className="inline-flex rounded-xl bg-stone-100 p-1 border border-stone-200/80">
              {(["campaign", "adset", "ad"] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setReportingLevel(lvl)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition capitalize cursor-pointer ${
                    reportingLevel === lvl
                      ? "bg-white text-stone-900 shadow-2xs border border-stone-200/60"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  {lvl === "campaign" ? "Campaign Level" : lvl === "adset" ? "Ad Set Level" : "Ad Level"}
                </button>
              ))}
            </div>
          </div>

          {/* Date Picker & Sync Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-700 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
              <Calendar className="h-3.5 w-3.5 text-stone-400" />
              <input
                type="date"
                value={since}
                onChange={(e) => setSince(e.target.value)}
                className="font-mono text-xs bg-transparent focus:outline-none"
              />
              <span className="text-stone-400">to</span>
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition cursor-pointer shadow-2xs"
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
      </div>

      {/* ── 6. Dual-Ledger Financial Reconciliation (Platform Claims vs. Real Store Cash) ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-white shadow-xs overflow-hidden">
        <div className="px-5 sm:px-6 py-3.5 bg-stone-50 border-b border-stone-200/90 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Dual-Ledger Audit: Meta Claimed Conversions vs. Real Store Cash Collected
            </h3>
          </div>
          <span className="text-[11px] font-mono text-stone-500">
            Active Level: <strong className="uppercase text-stone-800">{reportingLevel}</strong> | Tenant: {marketingSettings?.tenantId || "angkon-main"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-stone-100">
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
                  <span className="text-xl font-bold text-stone-400">Unavailable</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                    Sync Required
                  </span>
                </div>
              ) : (
                <div className="text-2xl font-black text-stone-900">
                  {currencySymbol} {(report?.metaPlatformMetrics.totalSpend ?? 0).toLocaleString("en-BD")}
                </div>
              )}
              <p className="text-[11px] text-stone-500 mt-0.5">
                Meta Ad Spend ({report?.metaPlatformMetrics?.currency || "BDT"})
              </p>
            </div>

            <div className="pt-2 border-t border-blue-100/60 space-y-1.5 text-xs text-stone-700">
              <div className="flex justify-between">
                <span>Impressions / Reach:</span>
                <strong className="font-bold">
                  {(report?.metaPlatformMetrics.totalImpressions || 0).toLocaleString("en-BD")} /{" "}
                  {(report?.metaPlatformMetrics.totalReach || 0).toLocaleString("en-BD")}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Clicks / CTR:</span>
                <strong className="font-bold">
                  {(report?.metaPlatformMetrics.totalClicks || 0).toLocaleString("en-BD")} (
                  {report?.metaPlatformMetrics.avgCtr ?? 0}%)
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Avg CPC / CPM:</span>
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
              <div className="flex justify-between text-blue-700 font-bold pt-1 border-t border-blue-100">
                <span>Meta Claimed ROAS:</span>
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
              <p className="text-[11px] text-stone-500 mt-0.5">
                Settled Online Payments + Settled COD (Less Refunds)
              </p>
            </div>

            <div className="pt-2 border-t border-emerald-100/60 space-y-1.5 text-xs text-stone-700">
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
          <div className="p-5 sm:p-6 space-y-3 bg-stone-50/60 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5 text-stone-500" />
                  Cross-System Diagnostic
                </span>
                <span className="text-[10px] font-mono bg-stone-200/80 text-stone-700 px-1.5 py-0.5 rounded">
                  Dual-Ledger
                </span>
              </div>
              <div>
                {report?.reconciliationDiagnostics?.isAvailable === false ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-stone-400">—</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200">
                      Awaiting Sync
                    </span>
                  </div>
                ) : (
                  <div className="text-2xl font-black text-stone-900">
                    {report?.actualStoreMetrics.storeRealizedCashPerMetaSpend !== null &&
                    report?.actualStoreMetrics.storeRealizedCashPerMetaSpend !== undefined
                      ? `${report.actualStoreMetrics.storeRealizedCashPerMetaSpend}x`
                      : "—"}
                  </div>
                )}
                <p className="text-[11px] text-stone-500 mt-0.5 font-medium">
                  Store Realized Cash / Meta Ad Spend (Cross-System Diagnostic)
                </p>
              </div>

              <div className="pt-2 border-t border-stone-200/60 space-y-1.5 text-xs text-stone-600">
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

      {/* ── 7. Resumable Slice Ingestion Jobs & Rate-Limit Audit ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-stone-600" />
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Historical Synchronization Jobs ({syncJobs.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={() => void refreshSyncJobs()}
            className="text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
          >
            Refresh Jobs
          </button>
        </div>

        {syncJobs.length === 0 ? (
          <div className="text-center py-6 text-xs text-stone-500">
            No historical sync jobs recorded yet. Click &quot;Sync Insights&quot; above to import ad performance.
          </div>
        ) : (
          <div className="space-y-3">
            {syncJobs.map((job) => (
              <div
                key={job.jobId}
                className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-stone-800">{job.jobId}</span>
                    <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-200 text-stone-700">
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
                  <div className="text-stone-500 text-[11px]">
                    Range: {job.requestedRange?.since} to {job.requestedRange?.until} | Slices:{" "}
                    {job.completedSlices}/{job.totalSlices} | Records: {job.totalRecords} | Spend:{" "}
                    {job.currency} {(job.totalSpend || 0).toLocaleString("en-BD")}
                  </div>
                  {job.errorMessage && (
                    <div className="text-rose-600 text-[11px] font-mono">{job.errorMessage}</div>
                  )}
                </div>

                {job.status === "paused_rate_limit" && (
                  <button
                    type="button"
                    onClick={() => handleResumeJob(job.jobId)}
                    disabled={resumingJobId === job.jobId}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition cursor-pointer shadow-2xs self-start sm:self-auto shrink-0"
                  >
                    {resumingJobId === job.jobId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    <span>Resume Slices</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 8. Active Campaigns Telemetry ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-stone-600" />
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Ad Account Campaigns Telemetry ({campaigns.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={() => void refreshCampaigns()}
            disabled={loadingCampaigns || !marketingSettings?.hasAccessToken}
            className="text-xs font-semibold text-stone-600 hover:text-stone-900 disabled:opacity-40 cursor-pointer"
          >
            {loadingCampaigns ? "Loading..." : "Refresh Campaigns"}
          </button>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-8 text-xs text-stone-500">
            {marketingSettings?.hasAccessToken
              ? "No campaigns found in this Meta Ad Account."
              : "Save your Meta Ad Account ID and authorized Marketing API token to load live campaigns."}
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {campaigns.map((camp) => (
              <div key={camp.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-stone-900">{camp.name}</div>
                  <div className="text-[11px] text-stone-400 font-mono mt-0.5">ID: {camp.id}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      camp.effective_status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {camp.effective_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
