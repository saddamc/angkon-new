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
} from "lucide-react";
import { MetaNavigationHeader } from "../meta-nav";
import type { PublicAdminPixelSettings } from "@/server/pixel-settings";

interface AttributionReport {
  period: { since: string; until: string };
  metaPlatformMetrics: {
    isAvailable?: boolean;
    status?: string;
    totalSpend: number | null;
    totalImpressions: number | null;
    totalClicks: number | null;
    metaReportedPurchases: number | null;
    metaReportedRevenue: number | null;
    metaClaimedRoas: number | null;
  };
  actualStoreMetrics: {
    storeTotalOrders: number;
    storeDeliveredOrders: number;
    storeCancelledOrders: number;
    storeRefunds: number;
    actualRealizedNetRevenue: number;
    storePendingRevenue: number;
    trueBlendedRoas: number | null;
  };
  attributionDiscrepancy: {
    isAvailable?: boolean;
    orderGap: number | null;
    revenueGap: number | null;
    roasInflation: number | null;
  };
}

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  effective_status: string;
}

function getInitialDates() {
  const d = new Date();
  const until = d.toISOString().slice(0, 10);
  const since = new Date(d.getTime() - 30 * 86400000).toISOString().slice(0, 10);
  return { since, until };
}

export default function MetaAdsPage() {
  const [settings, setSettings] = useState<PublicAdminPixelSettings | null>(null);
  const [adAccountId, setAdAccountId] = useState("");
  const [marketingToken, setMarketingToken] = useState("");
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Date range
  const [since, setSince] = useState(() => getInitialDates().since);
  const [until, setUntil] = useState(() => getInitialDates().until);

  // Attribution comparison state
  const [report, setReport] = useState<AttributionReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Campaign list state
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  // Historical import state
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const refreshAttribution = useCallback(async (s: string, u: string) => {
    setLoadingReport(true);
    try {
      const res = await fetch(`/api/admin/meta/ads/attribution?since=${s}&until=${u}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok) setReport(data.report);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingReport(false);
    }
  }, []);

  const refreshCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const res = await fetch("/api/admin/meta/ads/campaigns");
      if (res.ok) {
        const data = await res.json();
        if (data.ok) setCampaigns(data.campaigns || []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const res = await fetch("/api/admin/settings/pixel");
        if (res.ok && !ignore) {
          const data: PublicAdminPixelSettings = await res.json();
          setSettings(data);
          setAdAccountId(data.adAccountId || "");
        }
      } catch {
        /* ignore */
      }
    }
    void init();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/admin/meta/ads/attribution?since=${since}&until=${until}`);
        if (res.ok && !ignore) {
          const data = await res.json();
          if (data.ok) setReport(data.report);
        }
      } catch {
        /* ignore */
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [since, until]);

  useEffect(() => {
    if (!settings?.hasMarketingApiAccessToken) return;
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/meta/ads/campaigns");
        if (res.ok && !ignore) {
          const data = await res.json();
          if (data.ok) setCampaigns(data.campaigns || []);
        }
      } catch {
        /* ignore */
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [settings?.hasMarketingApiAccessToken]);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCredentials(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/settings/pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adAccountId: adAccountId.trim(),
          marketingApiAccessToken: marketingToken.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.settings);
        setMarketingToken("");
        setMessage({
          type: "success",
          text: "Meta Marketing API credentials saved securely!",
        });
        void refreshCampaigns();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save credentials." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error saving credentials." });
    } finally {
      setSavingCredentials(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/meta/ads/campaigns");
      const data = await res.json();
      if (res.ok && data.ok) {
        setCampaigns(data.campaigns || []);
        setMessage({
          type: "success",
          text: `Connection verified! Found ${data.total} campaign(s) in Ad Account.`,
        });
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to connect to Meta Marketing API.",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Network error testing Marketing API connection." });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleImportHistorical = async () => {
    setImporting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/meta/ads/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ since, until }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMessage({ type: "success", text: data.message });
        void refreshAttribution(since, until);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to import historical data." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error during historical sync." });
    } finally {
      setImporting(false);
    }
  };

  const pixelId = settings?.pixelId || "";

  return (
    <div className="space-y-6 max-w-7xl pb-24 text-stone-900 font-sans antialiased">
      {/* ── 1. Unified Navigation ── */}
      <MetaNavigationHeader pixelId={pixelId} testEventCode={settings?.testEventCode} />

      {/* ── 2. Toast Alerts ── */}
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
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/70 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
              <BarChart3 className="h-3 w-3 text-amber-600" />
              <span>Meta Marketing API v22.0</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              Ad Account Attribution &amp; Reporting Audit
            </h1>
            <p className="text-xs sm:text-[13px] text-stone-600 max-w-2xl leading-relaxed">
              Connect your customer-authorized Meta Ad Account to audit ad spend, compare Meta platform-attributed conversions against actual realized store revenue, and detect attribution inflation.
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

      {/* ── 4. Ad Account Credentials Form ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-stone-100">
          <div>
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
              Meta Ad Account Connection
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Requires a Meta System User token or OAuth token with <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-700 font-mono text-[11px]">ads_read</code> and <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-700 font-mono text-[11px]">read_insights</code> permissions.
            </p>
          </div>
          <div>
            {campaigns.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Connected &amp; Verified ({campaigns.length} campaigns)</span>
              </span>
            ) : settings?.hasMarketingApiAccessToken ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                <span>Configured (Verification Required)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-600 border border-stone-200">
                <span>Disconnected</span>
              </span>
            )}
          </div>
        </div>

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
                settings?.hasMarketingApiAccessToken
                  ? `${settings.maskedMarketingApiAccessToken} (Saved — enter new to replace)`
                  : "EAAG... (Paste token with ads_read permission)"
              }
              className="w-full rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-mono text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 transition shadow-2xs"
            />
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection || (!marketingToken && !settings?.hasMarketingApiAccessToken)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition disabled:opacity-40 cursor-pointer shadow-2xs"
            >
              {testingConnection ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Querying Ad Account...</span>
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
              <span>{savingCredentials ? "Saving..." : "Save Ad Credentials"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── 5. Date Filter & Historical Sync Manager ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-stone-400 shrink-0" />
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-stone-700">
            <span>Audit Period:</span>
            <input
              type="date"
              value={since}
              onChange={(e) => setSince(e.target.value)}
              className="rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-mono"
            />
            <span>to</span>
            <input
              type="date"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              className="rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refreshAttribution(since, until)}
            disabled={loadingReport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingReport ? "animate-spin" : ""}`} />
            <span>Refresh Audit</span>
          </button>

          <button
            type="button"
            onClick={handleImportHistorical}
            disabled={importing || !settings?.hasMarketingApiAccessToken}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-40 cursor-pointer shadow-2xs"
          >
            {importing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                <span>Import Insights</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── 6. Executive Attribution Comparison (Meta Claimed vs Store Realized) ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-white shadow-xs overflow-hidden">
        <div className="px-5 sm:px-6 py-3.5 bg-stone-50 border-b border-stone-200/90 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Attribution Truth Audit — Platform Claims vs. Actual Realized Sales
            </h3>
          </div>
          <span className="text-[11px] font-mono text-stone-500">
            Tenant: {settings?.tenantId || "angkon-main"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-stone-100">
          {/* Card A: Meta Platform Reported */}
          <div className="p-5 sm:p-6 space-y-3 bg-blue-50/20">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              <span>Meta Ads Manager Attributed</span>
            </div>
            <div>
              {report?.metaPlatformMetrics?.isAvailable === false ? (
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-stone-400">Unavailable</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                    Import Required
                  </span>
                </div>
              ) : (
                <div className="text-2xl font-black text-stone-900">
                  ৳ {(report?.metaPlatformMetrics.totalSpend ?? 0).toLocaleString("en-BD")}
                </div>
              )}
              <p className="text-[11px] text-stone-500 mt-0.5">Total Ad Spend on Meta</p>
            </div>
            <div className="pt-2 border-t border-blue-100/60 space-y-1.5 text-xs text-stone-700">
              <div className="flex justify-between">
                <span>Claimed Purchases:</span>
                <strong className="font-bold">
                  {report?.metaPlatformMetrics?.isAvailable === false
                    ? "—"
                    : report?.metaPlatformMetrics.metaReportedPurchases ?? "—"}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Claimed Revenue:</span>
                <strong className="font-bold">
                  {report?.metaPlatformMetrics?.isAvailable === false
                    ? "—"
                    : `৳ ${(report?.metaPlatformMetrics.metaReportedRevenue ?? 0).toLocaleString("en-BD")}`}
                </strong>
              </div>
              <div className="flex justify-between text-blue-700 font-bold">
                <span>Reported ROAS:</span>
                <span>
                  {report?.metaPlatformMetrics?.isAvailable === false
                    ? "—"
                    : `${report?.metaPlatformMetrics.metaClaimedRoas ?? 0}x`}
                </span>
              </div>
            </div>
          </div>

          {/* Card B: Real Store Internal Sales */}
          <div className="p-5 sm:p-6 space-y-3 bg-emerald-50/20">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Store Realized Net Revenue</span>
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-900">
                ৳ {(report?.actualStoreMetrics.actualRealizedNetRevenue || 0).toLocaleString("en-BD")}
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">Paid &amp; Delivered Orders</p>
            </div>
            <div className="pt-2 border-t border-emerald-100/60 space-y-1.5 text-xs text-stone-700">
              <div className="flex justify-between">
                <span>Delivered Orders:</span>
                <strong className="font-bold">{report?.actualStoreMetrics.storeDeliveredOrders || 0}</strong>
              </div>
              <div className="flex justify-between">
                <span>Cancelled / Failed:</span>
                <span className="text-rose-600 font-medium">
                  {report?.actualStoreMetrics.storeCancelledOrders || 0}
                </span>
              </div>
              <div className="flex justify-between text-emerald-800 font-bold">
                <span>True Blended ROAS:</span>
                <span>
                  {report?.actualStoreMetrics.trueBlendedRoas !== null && report?.actualStoreMetrics.trueBlendedRoas !== undefined
                    ? `${report.actualStoreMetrics.trueBlendedRoas}x`
                    : "— (Requires Ad Spend)"}
                </span>
              </div>
            </div>
          </div>

          {/* Card C: Attribution Discrepancy */}
          <div className="p-5 sm:p-6 space-y-3 bg-stone-50/50">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5" />
              <span>Attribution Discrepancy</span>
            </div>
            <div>
              {report?.attributionDiscrepancy?.isAvailable === false ? (
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-stone-400">—</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200">
                    Awaiting Ad Data
                  </span>
                </div>
              ) : (
                <div className="text-2xl font-black text-stone-800">
                  {(report?.attributionDiscrepancy.roasInflation || 0) > 0 ? "+" : ""}
                  {report?.attributionDiscrepancy.roasInflation || 0}x
                </div>
              )}
              <p className="text-[11px] text-stone-500 mt-0.5">ROAS Variance (Claimed vs Realized)</p>
            </div>
            <div className="pt-2 border-t border-stone-200/60 space-y-1.5 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Conversion Count Gap:</span>
                <span className="font-mono">
                  {report?.attributionDiscrepancy?.isAvailable === false
                    ? "—"
                    : `${report?.attributionDiscrepancy.orderGap || 0} orders`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Revenue Variance:</span>
                <span className="font-mono">
                  {report?.attributionDiscrepancy?.isAvailable === false
                    ? "—"
                    : `৳ ${(report?.attributionDiscrepancy.revenueGap || 0).toLocaleString("en-BD")}`}
                </span>
              </div>
              <p className="text-[10px] text-stone-400 pt-1 leading-normal">
                Meta attributes touchpoints via 7-day click / 1-day view, whereas store revenue only counts verified cash on delivery and completed electronic payments.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 7. Active Campaigns List ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-stone-600" />
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Ad Account Campaigns ({campaigns.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={() => void refreshCampaigns()}
            disabled={loadingCampaigns || !settings?.hasMarketingApiAccessToken}
            className="text-xs font-semibold text-stone-600 hover:text-stone-900 disabled:opacity-40 cursor-pointer"
          >
            {loadingCampaigns ? "Loading..." : "Refresh Campaigns"}
          </button>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-8 text-xs text-stone-500">
            {settings?.hasMarketingApiAccessToken
              ? "No active campaigns found in this Meta Ad Account."
              : "Connect your Meta Ad Account ID and Marketing API token above to load live campaigns."}
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
