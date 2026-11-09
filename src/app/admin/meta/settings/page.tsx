"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Settings,
  Layers,
  Activity,
  BarChart3,
  Globe,
  ShoppingBag,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  Server,
  Zap,
  Info,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  Play,
  Copy,
  Search,
  Sliders,
  Trash2,
  Key,
  Lock,
} from "lucide-react";
import { MetaNavigationHeader } from "../meta-nav";
import { SettingsHealthConsole } from "@/components/admin/meta/settings-health-console";
import { MetaSettingsSection } from "@/components/admin/meta/meta-setting-row";
import {
  buildSettingsHealth,
  formatStamp,
  type SettingsSectionId,
} from "@/components/admin/meta/settings-health";
import {
  ConfigureAdAccountModal,
  ReplaceMarketingTokenModal,
  UpdateBusinessIdModal,
  UpdateAttributionConfigModal,
  MetaConfirmWarningModal,
  EditCatalogIdModal,
  ConfigureCatalogTokenModal,
  ConfigureFeedScheduleModal,
  AddDomainModal,
  ConfigureDomainTokenModal,
  ConfigureAemPriorityModal,
  ConfigureAppSecretModal,
  ConfigureCapiTokenModal,
  EditDatasetIdModal,
  ConfigureTestCodeModal,
  EditAppIdModal,
  EditTrackingSignalsModal,
} from "@/components/admin/meta/meta-credential-modals";

interface SettingsData {
  ok: boolean;
  tenantId: string;
  general: {
    businessName: string;
    businessId: string;
    appId: string;
    hasAppSecret: boolean;
    maskedAppSecret: string;
    status: string;
  };
  dataset: {
    datasetId: string;
    pixelId: string;
    testEventCode: string;
    enabled: boolean;
    trackPageView: boolean;
    trackViewContent: boolean;
    trackAddToCart: boolean;
    trackInitiateCheckout: boolean;
    trackPurchase: boolean;
    status: string;
  };
  ads: {
    adAccountId: string;
    accountName: string;
    accountCurrency: string;
    accountTimezone: string;
    hasMarketingToken: boolean;
    maskedMarketingToken: string;
    status: string;
    lastVerifiedAt: string | null;
    lastError: string | null;
    attributionConfig?: {
      actionAttributionWindows: string[];
      actionReportTime: "conversion" | "impression";
    };
  };
  capi: {
    hasCapiToken: boolean;
    maskedCapiToken: string;
    graphApiVersion: string;
    status: string;
  };
  catalog: {
    catalogId: string;
    feedUrl: string;
    hasCatalogApiToken?: boolean;
    maskedCatalogApiToken?: string;
    hasFeedKey: boolean;
    maskedFeedKey: string;
    currency: string;
    productCount: number;
    syncInterval: string;
    status: string;
  };
  domain: {
    domain: string;
    domainVerificationToken?: string;
    verificationMethod: string;
    status: string;
    source: string;
    lastVerifiedAt: string | null;
  };
  security: {
    encryptionAlgorithm: string;
    isEncryptionKeyExternal: boolean;
    keyRotationSupported: boolean;
    capiTokenEncrypted: boolean;
    marketingTokenEncrypted: boolean;
    lastCredentialUpdate: string | null;
  };
  sync: {
    intervals: {
      eventsReportingMinutes: number;
      integrationsVerificationMinutes: number;
      assetRelationshipsMinutes: number;
      datasetQualityHours: number;
    };
    staleWindows: {
      eventsReportingMinutes: number;
      integrationsVerificationMinutes: number;
      assetRelationshipsMinutes: number;
      datasetQualityHours: number;
    };
    status: string;
    lastSuccessfulSync: string | null;
    nextScheduledSync: string | null;
    durationMs: number;
    lastError: string | null;
  };
}

function CentralizedMetaSettingsContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("all");
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  // Free-text filter for the section rail ("token", "domain", "sync"…).
  const [settingsQuery, setSettingsQuery] = useState("");

  // Deep-linking from query param: ?section=dataset / ?section=ads etc.
  useEffect(() => {
    const s = searchParams.get("section")?.toLowerCase();
    if (s && ["general", "dataset", "ads", "capi", "catalog", "domain", "security", "sync", "all"].includes(s)) {
      setActiveSection(s);
    }
  }, [searchParams]);

  // General Form state
  const [businessName, setBusinessName] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [appId, setAppId] = useState("");

  // Dataset Form state
  const [pixelId, setPixelId] = useState("");
  const [testEventCode, setTestEventCode] = useState("");
  const [datasetEnabled, setDatasetEnabled] = useState(true);
  const [trackPageView, setTrackPageView] = useState(true);
  const [trackViewContent, setTrackViewContent] = useState(true);
  const [trackAddToCart, setTrackAddToCart] = useState(true);
  const [trackInitiateCheckout, setTrackInitiateCheckout] = useState(true);
  const [trackPurchase, setTrackPurchase] = useState(true);

  // Ads Form state
  const [adAccountId, setAdAccountId] = useState("");
  const [isAdAccountModalOpen, setIsAdAccountModalOpen] = useState(false);
  const [isReplaceMarketingTokenModalOpen, setIsReplaceMarketingTokenModalOpen] = useState(false);
  const [isBusinessModalOpen, setIsBusinessModalOpen] = useState(false);
  const [isAppIdModalOpen, setIsAppIdModalOpen] = useState(false);
  const [isAppSecretModalOpen, setIsAppSecretModalOpen] = useState(false);
  const [isDatasetIdModalOpen, setIsDatasetIdModalOpen] = useState(false);
  const [isTestCodeModalOpen, setIsTestCodeModalOpen] = useState(false);
  const [isTrackingSignalsModalOpen, setIsTrackingSignalsModalOpen] = useState(false);
  const [isCapiTokenModalOpen, setIsCapiTokenModalOpen] = useState(false);
  const [isAttributionModalOpen, setIsAttributionModalOpen] = useState(false);
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const [attributionWindows, setAttributionWindows] = useState<string[]>(["7d_click", "1d_view"]);
  const [attributionReportTime, setAttributionReportTime] = useState<"conversion" | "impression">("conversion");

  // Catalog Form state
  const [catalogId, setCatalogId] = useState("");
  const [isCatalogIdModalOpen, setIsCatalogIdModalOpen] = useState(false);
  const [isCatalogTokenModalOpen, setIsCatalogTokenModalOpen] = useState(false);
  const [isFeedScheduleModalOpen, setIsFeedScheduleModalOpen] = useState(false);

  // Domain Form state
  const [domainToken, setDomainToken] = useState("");
  const [verificationMethod, setVerificationMethod] = useState("dns_txt");
  const [isAddDomainModalOpen, setIsAddDomainModalOpen] = useState(false);
  const [isConfigureDomainTokenModalOpen, setIsConfigureDomainTokenModalOpen] = useState(false);
  const [isConfigureAemPriorityModalOpen, setIsConfigureAemPriorityModalOpen] = useState(false);

  // Live Test States across all sections
  const [testingSection, setTestingSection] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, {
    ok: boolean;
    status?: string;
    message: string;
    latencyMs?: number;
    details?: Record<string, unknown>;
  } | null>>({});

  // Collapsible Technical Details states
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  const toggleDetails = (sec: string) => {
    setExpandedDetails((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Fetch Centralized Settings
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/meta/settings");
      if (res.ok) {
        const json: SettingsData = await res.json();
        if (json.ok) {
          setData(json);
          setBusinessName(json.general.businessName);
          setBusinessId(json.general.businessId);
          setAppId(json.general.appId);
          setPixelId(json.dataset.pixelId);
          setTestEventCode(json.dataset.testEventCode);
          setDatasetEnabled(json.dataset.enabled);
          setTrackPageView(json.dataset.trackPageView);
          setTrackViewContent(json.dataset.trackViewContent);
          setTrackAddToCart(json.dataset.trackAddToCart);
          setTrackInitiateCheckout(json.dataset.trackInitiateCheckout);
          setTrackPurchase(json.dataset.trackPurchase);
          setAdAccountId(json.ads.adAccountId);
          if (json.ads.attributionConfig) {
            setAttributionWindows(json.ads.attributionConfig.actionAttributionWindows || ["7d_click", "1d_view"]);
            setAttributionReportTime(json.ads.attributionConfig.actionReportTime || "conversion");
          }
          setCatalogId(json.catalog.catalogId || "1112170671558899");
          setDomainToken(json.domain.domainVerificationToken || "");
          setVerificationMethod(json.domain.verificationMethod || "dns_txt");
        }
      } else {
        setMessage({ type: "error", text: "Failed to load centralized settings." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error loading settings." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  // Save specific section
  const handleSaveSection = async (
    section: "general" | "dataset" | "ads" | "capi" | "catalog" | "domain" | "security" | "sync",
    payload: Record<string, unknown>
  ) => {
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch("/api/admin/meta/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, data: payload }),
      });
      const resJson = await res.json();
      if (res.ok && resJson.ok) {
        setMessage({ type: "success", text: resJson.message || "Settings updated successfully." });
        await fetchSettings();
      } else {
        setMessage({ type: "error", text: resJson.error || "Failed to update settings." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error while saving settings." });
    } finally {
      setSaving(false);
    }
  };

  // Test specific service directly from Settings
  const handleTestSection = async (section: "dataset" | "ads" | "capi" | "catalog" | "domain" | "security") => {
    try {
      setTestingSection(section);
      setTestResults((prev) => ({ ...prev, [section]: null }));
      const payload: Record<string, unknown> = { test: true };
      if (section === "dataset") payload.pixelId = pixelId;
      if (section === "ads") payload.adAccountId = adAccountId;
      if (section === "capi") payload.testEventCode = testEventCode;
      if (section === "catalog") payload.catalogId = catalogId;

      const res = await fetch("/api/admin/meta/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, data: payload }),
      });
      const resJson = await res.json();
      if (res.ok && resJson.ok) {
        setTestResults((prev) => ({
          ...prev,
          [section]: {
            ok: true,
            status: resJson.status || "Verified",
            message: resJson.message || "Test passed successfully.",
            latencyMs: resJson.latencyMs,
            details: resJson.details || resJson.account || resJson.dnsResult,
          },
        }));
      } else {
        setTestResults((prev) => ({
          ...prev,
          [section]: {
            ok: false,
            status: "Failed",
            message: resJson.error || "Verification probe failed.",
          },
        }));
      }
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [section]: {
          ok: false,
          status: "Failed",
          message: "Network error while running test probe.",
        },
      }));
    } finally {
      setTestingSection(null);
    }
  };

  const renderTestResultPanel = (section: string) => {
    const isTesting = testingSection === section;
    const result = testResults[section];

    if (!isTesting && !result) return null;

    return (
      <div className="rounded-xl border p-3.5 text-xs animate-in fade-in-0 duration-150 transition-all mt-3">
        {isTesting ? (
          <div className="flex items-center gap-2.5 text-blue-700 bg-blue-50/80 p-3 rounded-lg border border-blue-200/80">
            <Loader2 className="h-4 w-4 animate-spin shrink-0 text-blue-600" />
            <div className="font-semibold">Executing live test probe with Meta Graph API v22.0...</div>
          </div>
        ) : result ? (
          <div
            className={`p-3 rounded-xl border flex flex-col gap-2 ${
              result.ok
                ? "bg-emerald-50/90 border-emerald-300 text-emerald-950"
                : "bg-rose-50/90 border-rose-300 text-rose-950"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {result.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                )}
                <span className="font-bold text-xs">
                  {result.ok ? "Live Test Passed" : "Live Test Failed"}
                </span>
                {result.latencyMs !== undefined && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/80 border border-slate-200/80 text-slate-700 font-bold">
                    {result.latencyMs}ms roundtrip
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  result.ok
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : "bg-rose-100 text-rose-800 border-rose-300"
                }`}
              >
                {result.status || (result.ok ? "Verified" : "Failed")}
              </span>
            </div>
            <p className="text-xs leading-relaxed font-medium">
              {result.message}
            </p>
          </div>
        ) : null}
      </div>
    );
  };

  // Trigger Manual Sync
  const handleTriggerSync = async () => {
    try {
      setSyncing(true);
      setMessage(null);
      const res = await fetch("/api/admin/meta/sync/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncType: "all", forceFresh: true }),
      });
      const synJson = await res.json();
      if (res.ok && synJson.ok) {
        setMessage({
          type: "success",
          text: `Synchronization complete in ${synJson.durationMs}ms. Status: ${synJson.status}.`,
        });
        await fetchSettings();
      } else {
        setMessage({ type: "error", text: synJson.error || "Manual synchronization failed." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error triggering synchronization." });
    } finally {
      setSyncing(false);
    }
  };

  // Copies a support-ready configuration snapshot. Every secret is already
  // masked by the API, so nothing sensitive leaves the browser.
  const handleCopyReport = async () => {
    if (!data) return;
    const lines = [
      "# ANGKON — Meta Suite configuration",
      `Tenant: ${data.tenantId}`,
      "",
      `Business: ${data.general.businessName || "—"} (${data.general.businessId || "no ID"})`,
      `App ID: ${data.general.appId || "—"} · App secret: ${data.general.maskedAppSecret || "not set"}`,
      `Dataset: ${data.dataset.datasetId || data.dataset.pixelId || "—"} · enabled=${data.dataset.enabled}`,
      `Ad account: ${data.ads.adAccountId || "—"} (${data.ads.accountName || "—"}) · token ${data.ads.maskedMarketingToken || "not set"}`,
      `CAPI token: ${data.capi.maskedCapiToken || "not set"} · Graph ${data.capi.graphApiVersion}`,
      `Catalog: ${data.catalog.catalogId || "—"} · ${data.catalog.productCount} products · feed key ${data.catalog.maskedFeedKey || "not set"}`,
      `Domain: ${data.domain.domain || "—"} · ${data.domain.status} (${data.domain.verificationMethod})`,
      `Encryption: ${data.security.encryptionAlgorithm} · last credential update ${data.security.lastCredentialUpdate || "—"}`,
      `Sync: ${data.sync.status} · last ${data.sync.lastSuccessfulSync || "never"} · next ${data.sync.nextScheduledSync || "—"}`,
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setMessage({ type: "success", text: "Configuration summary copied to clipboard." });
    } catch {
      setMessage({ type: "error", text: "Clipboard is unavailable in this browser." });
    }
  };

  // Status Badge Component adhering to Priority 7 unified guidelines
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Verified":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Verified</span>
          </span>
        );
      case "Connected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Connected</span>
          </span>
        );
      case "Configured":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Info className="h-3.5 w-3.5 text-blue-600" />
            <span>Configured</span>
          </span>
        );
      case "Partially Configured":
      case "Partial":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
            <span>Needs App Secret</span>
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>Pending</span>
          </span>
        );
      case "Attention required":
      case "Scope Req.":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            <span>Attention required</span>
          </span>
        );
      case "Failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
            <span>Failed</span>
          </span>
        );
      // Synchronization snapshots use their own vocabulary (MetaSyncStatus).
      case "up_to_date":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Up to date</span>
          </span>
        );
      case "synchronizing":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" />
            <span>Synchronizing</span>
          </span>
        );
      case "stale":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>Stale</span>
          </span>
        );
      case "permission_required":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            <span>Permission required</span>
          </span>
        );
      case "unavailable":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <Info className="h-3.5 w-3.5 text-slate-500" />
            <span>Unavailable</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <span>Unavailable</span>
          </span>
        );
    }
  };

  const sectionsNav = [
    { id: "all", label: "All Settings", icon: Settings },
    { id: "general", label: "1. General & Business", icon: Layers },
    { id: "dataset", label: "2. Dataset & Pixel", icon: Activity },
    { id: "ads", label: "3. Ads & Marketing API", icon: BarChart3 },
    { id: "capi", label: "4. Conversions API", icon: Server },
    { id: "catalog", label: "5. Catalog & Feed", icon: ShoppingBag },
    { id: "domain", label: "6. Domain Verification", icon: Globe },
    { id: "security", label: "7. Security & Encryption", icon: ShieldCheck },
    { id: "sync", label: "8. Auto-Synchronization", icon: RefreshCw },
  ];

  // Keyword filter for the section rail. Matching on id as well as label means
  // "capi" or "sync" work even though the labels spell them out.
  const normalizedQuery = settingsQuery.trim().toLowerCase();
  const filteredSections = normalizedQuery
    ? sectionsNav.filter((sec) =>
        `${sec.label} ${sec.id}`.toLowerCase().includes(normalizedQuery)
      )
    : sectionsNav;

  // Same derivation the health console uses, so the rail and the console can
  // never disagree about a subsystem's state.
  const healthById = new Map(buildSettingsHealth(data).map((item) => [item.id, item.state]));

  // Summary for the read-only Dataset row.
  const enabledSignalCount = [
    trackPageView,
    trackViewContent,
    trackAddToCart,
    trackInitiateCheckout,
    trackPurchase,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-7xl pb-24 text-slate-900 font-sans antialiased">
      {/* ── 1. Unified Navigation ── */}
      <MetaNavigationHeader pixelId={pixelId} testEventCode={testEventCode} />

      {/* ── 2. Saving progress ── */}
      {saving && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs font-semibold text-blue-900 shadow-2xs"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
          <span>Saving changes to the Meta Suite…</span>
        </div>
      )}

      {/* ── 3. Toast Alerts ── */}
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

      {/* ── 4. Page Header ── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#1877F2]/10 text-[#1877F2] border border-[#1877F2]/20">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Settings className="h-3.5 w-3.5" />}
              <span>Control plane</span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-[11px] text-slate-500 font-mono">Tenant: {data?.tenantId || "primary_store"}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Meta Marketing Suite Configuration
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Single authoritative control plane for Business Portfolio, Dataset, Ads, CAPI, Catalog Feed,
            Domain Verification, and Auto-Sync.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void handleCopyReport()}
            disabled={!data}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2.5 text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Copy a masked configuration summary for support tickets"
          >
            <Copy className="h-4 w-4" />
            <span className="hidden sm:inline">Copy report</span>
          </button>
          <button
            type="button"
            onClick={handleTriggerSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Synchronizing..." : "Trigger Full Sync"}</span>
          </button>
        </div>
      </div>

      {/* ── 5. Configuration Health Console ── */}
      <SettingsHealthConsole
        data={data}
        loading={loading}
        onOpenSection={(id: SettingsSectionId) => {
          setActiveSection(id);
          if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
      />

      {/* ── 6. Section rail: keyword search + quick filters ── */}
      <div className="sticky top-0 z-20 -mx-1 bg-[#f8fafc]/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-[#f8fafc]/80">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative shrink-0 lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={settingsQuery}
              onChange={(e) => setSettingsQuery(e.target.value)}
              placeholder="Search settings — token, domain, sync…"
              aria-label="Search settings sections"
              className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {filteredSections.length === 0 ? (
              <span className="px-1 text-xs text-slate-500">
                No section matches “{settingsQuery.trim()}”.
              </span>
            ) : (
              filteredSections.map((sec) => {
                const Icon = sec.icon;
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setActiveSection(sec.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      isActive
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{sec.label}</span>
                    {sec.id !== "all" && (
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 rounded-full ${
                          loading || !data
                            ? "bg-slate-300 animate-pulse"
                            : healthById.get(sec.id as SettingsSectionId) === "ready"
                            ? "bg-emerald-500"
                            : healthById.get(sec.id as SettingsSectionId) === "partial"
                              ? "bg-amber-500"
                              : "bg-rose-400"
                        }`}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 1: GENERAL & BUSINESS ── */}
      {(activeSection === "all" || activeSection === "general") && (
        <MetaSettingsSection
          index={1}
          title="General & Business Portfolio"
          description="Meta Business Portfolio identity and App credentials."
          icon={<Layers className="h-5 w-5" />}
          accent="bg-blue-50 text-blue-600 border-blue-200/60"
          status={data ? renderStatusBadge(data.general.status) : null}
          canEdit={false}
          editing={false}
          onEdit={() => {}}
          onCancel={() => {}}
          rows={[
            {
              label: "Business Name",
              value: businessName,
              isSet: Boolean(businessName.trim()),
              onAction: () => setIsBusinessModalOpen(true),
            },
            {
              label: "Business Portfolio ID",
              value: businessId,
              isSet: Boolean(businessId.trim()),
              mono: true,
              onAction: () => setIsBusinessModalOpen(true),
            },
            {
              label: "Meta App ID",
              value: appId,
              isSet: Boolean(appId.trim()),
              mono: true,
              onAction: () => setIsAppIdModalOpen(true),
            },
            {
              label: "Meta App Secret",
              value: data?.general.maskedAppSecret || "••••••••••••••••",
              isSet: Boolean(data?.general.hasAppSecret),
              secret: true,
              actionLabel: data?.general.hasAppSecret ? "Replace" : "Configure",
              onAction: () => setIsAppSecretModalOpen(true),
            },
          ]}
          footer={null}
        />
      )}

      {/* ── SECTION 2: DATASET & PIXEL ── */}
      {(activeSection === "all" || activeSection === "dataset") && (
        <MetaSettingsSection
          index={2}
          title="Dataset & Meta Pixel"
          description="Primary dataset identifier (configured in .env file — locked in read-only mode), browser tracking switches, and test sandbox."
          headerExtra={
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-200/90 shadow-2xs">
              <Lock className="h-3 w-3 text-amber-600" />
              .env Managed
            </span>
          }
          banner={
            <div className="flex items-center gap-2 text-xs font-medium text-amber-900">
              <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>
                Configured in the <strong>.env file</strong> (zero database connection overhead). Changes are locked in the admin interface to protect serverless database stability and prevent Atlas pool spikes.
              </span>
            </div>
          }
          icon={<Activity className="h-5 w-5" />}
          accent="bg-purple-50 text-purple-600 border-purple-200/60"
          status={data ? renderStatusBadge(data.dataset.status) : null}
          canEdit={false}
          editing={false}
          onEdit={() => {}}
          onCancel={() => {}}
          rows={[
            {
              label: "Dataset / Pixel ID",
              value: pixelId || "1304551066085265",
              isSet: Boolean((pixelId || "1304551066085265").trim()),
              mono: true,
              locked: true,
              lockReason: "Active in .env via NEXT_PUBLIC_FACEBOOK_PIXEL_ID — locked to protect database connection pool",
            },
            {
              label: "Test Event Code",
              value: testEventCode,
              isSet: Boolean(testEventCode.trim()),
              mono: true,
              onAction: () => setIsTestCodeModalOpen(true),
            },
            {
              label: "Tracking signals",
              value: datasetEnabled
                ? `${enabledSignalCount} of 5 enabled`
                : "Tracking disabled",
              isSet: datasetEnabled && enabledSignalCount > 0,
              onAction: () => setIsTrackingSignalsModalOpen(true),
            },
          ]}
          belowContent={
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTestSection("dataset")}
                  disabled={testingSection === "dataset"}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-semibold text-purple-900 shadow-2xs transition hover:bg-purple-100 disabled:opacity-50"
                >
                  {testingSection === "dataset" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5 fill-purple-700 text-purple-700" />
                  )}
                  <span>{testingSection === "dataset" ? "Testing Health..." : "Test Dataset Health"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleDetails("dataset")}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                >
                  {expandedDetails["dataset"] ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  <span>{expandedDetails["dataset"] ? "Hide Technical Details" : "Show Technical Details"}</span>
                </button>
              </div>

              {renderTestResultPanel("dataset")}

              {expandedDetails["dataset"] && (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Dataset Technical Architecture Specifications
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="block text-[10px] font-bold uppercase text-slate-400">Meta Graph API Target</span>
                      <span className="font-mono text-xs text-slate-800">https://graph.facebook.com/v22.0/{pixelId || "1304551066085265"}/events</span>
                      <div className="text-[11px] text-slate-500">Direct dataset event ingestion endpoint with retry queue.</div>
                    </div>
                    <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="block text-[10px] font-bold uppercase text-slate-400">PII Cryptographic Hasher</span>
                      <span className="text-xs font-semibold text-slate-800">SHA-256 (Email &amp; Phone Normalization)</span>
                      <div className="text-[11px] text-slate-500">Strict lowercase trim &amp; SHA-256 pre-hashing before dispatch.</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          }
          footer={null}
        />
      )}

      {/* ── SECTION 3: ADS & MARKETING API ── */}
      {(activeSection === "all" || activeSection === "ads") && (
        <MetaSettingsSection
          index={3}
          title="Ads & Marketing API"
          description="Ad Account ID, Marketing token permissions, and campaign attribution."
          icon={<BarChart3 className="h-5 w-5" />}
          accent="bg-emerald-50 text-emerald-600 border-emerald-200/60"
          status={data ? renderStatusBadge(data.ads.status) : null}
          canEdit={false}
          editing={false}
          onEdit={() => {}}
          onCancel={() => {}}
          rows={[
            {
              label: "Ad Account ID",
              value: adAccountId || "act_1646756900434912",
              isSet: Boolean((adAccountId || "act_1646756900434912").trim()),
              mono: true,
              locked: true,
              lockReason: "Active in .env via META_AD_ACCOUNT_ID — locked in read-only mode",
            },
            {
              label: "Marketing API Access Token",
              value: data?.ads.maskedMarketingToken || "EAAG••••••••••••",
              isSet: Boolean(data?.ads.hasMarketingToken),
              secret: true,
              actionLabel: "Replace",
              onAction: () => setIsReplaceMarketingTokenModalOpen(true),
            },
            {
              label: "Verified account",
              value: `${data?.ads.accountName || "Plain Stitch"} · ${data?.ads.accountCurrency || "BDT"} · ${data?.ads.accountTimezone || "Asia/Dhaka"}`,
              isSet: Boolean(data?.ads.accountName),
              readOnly: true,
              auto: true,
            },
          ]}
          belowContent={
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={testingSection === "ads"}
                  onClick={() => handleTestSection("ads")}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 shadow-2xs transition hover:bg-emerald-100 disabled:opacity-50"
                >
                  {testingSection === "ads" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Zap className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                  <span>{testingSection === "ads" ? "Probing Graph API..." : "Test Marketing API Connection"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleDetails("ads")}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                >
                  {expandedDetails["ads"] ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  <span>{expandedDetails["ads"] ? "Hide Details" : "Show Details"}</span>
                </button>
              </div>

              {renderTestResultPanel("ads")}

              {expandedDetails["ads"] && (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Marketing API Endpoint &amp; Permission Scopes
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="block text-[10px] font-bold uppercase text-slate-400">Ad Account Resource Path</span>
                      <span className="font-mono text-xs text-slate-800">/v22.0/{adAccountId || "act_1646756900434912"}</span>
                      <div className="text-[11px] text-slate-500">Insights, campaign objects, and conversion attribution query endpoint.</div>
                    </div>
                    <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="block text-[10px] font-bold uppercase text-slate-400">Scope Token Security</span>
                      <span className="text-xs font-semibold text-slate-800">ads_read, ads_management • AES-256-GCM Vault</span>
                      <div className="text-[11px] text-slate-500">Token validity and rate limit quotas checked during background synchronization.</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAdAccountModalOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Configure Ad Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsReplaceMarketingTokenModalOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                >
                  <Key className="h-3.5 w-3.5" />
                  <span>Replace Token</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAttributionModalOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Attribution Windows</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDisconnectModalOpen(true)}
                  className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/60 px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-2xs hover:bg-rose-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Disconnect Account</span>
                </button>
              </div>
            </>
          }
          footer={null}
        />
      )}

      {/* ── SECTION 4: CONVERSIONS API (CAPI) ── */}
      {(activeSection === "all" || activeSection === "capi") && (
        <MetaSettingsSection
          index={4}
          title="Conversions API (CAPI)"
          description="Server-side telemetry token (configured in .env file — locked in read-only mode), Graph API version, and delivery channel."
          icon={<Server className="h-5 w-5" />}
          accent="bg-blue-50 text-blue-600 border-blue-200/60"
          status={data ? renderStatusBadge(data.capi.status) : null}
          headerExtra={
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-200/90 shadow-2xs">
              <Lock className="h-3 w-3 text-amber-600" />
              .env Managed
            </span>
          }
          banner={
            <div className="flex items-center gap-2 text-xs font-medium text-amber-900">
              <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>
                Conversions API Dataset Token is managed in the <strong>.env file</strong> (zero DB query overhead). Token replacement is locked in the UI for security.
              </span>
            </div>
          }
          canEdit={false}
          editing={false}
          onEdit={() => {}}
          onCancel={() => {}}
          rows={[
            {
              label: "Conversions API Dataset Token",
              value: data?.capi.maskedCapiToken || "EAAT••••••••••••",
              isSet: true,
              secret: true,
              locked: true,
              lockReason: "Active in .env via META_CAPI_ACCESS_TOKEN — locked in read-only mode",
            },
            {
              label: "Graph API Version",
              value: data?.capi.graphApiVersion || "v22.0",
              isSet: true,
              mono: true,
              readOnly: true,
            },
            {
              label: "Token encryption",
              value: "AES-256-GCM envelope + .env fallback",
              isSet: true,
              readOnly: true,
            },
          ]}
          belowContent={
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={testingSection === "capi"}
                  onClick={() => handleTestSection("capi")}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-900 shadow-2xs transition hover:bg-blue-100 disabled:opacity-50"
                >
                  {testingSection === "capi" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5 fill-blue-700 text-blue-700" />
                  )}
                  <span>{testingSection === "capi" ? "Dispatching Test Ping..." : "Test CAPI Server Dispatch"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleDetails("capi")}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                >
                  {expandedDetails["capi"] ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  <span>{expandedDetails["capi"] ? "Hide Technical Details" : "Show Technical Details"}</span>
                </button>

                <span className="ml-auto font-mono text-[11px] text-slate-400">Cipher: AES-256-GCM Envelope</span>
              </div>

              {renderTestResultPanel("capi")}

              {expandedDetails["capi"] && (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Conversions API Gateway &amp; Payload Specifications
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="block text-[10px] font-bold uppercase text-slate-400">Deduplication Matching Engine</span>
                      <span className="font-mono text-xs text-slate-800">event_id + event_name pair</span>
                      <div className="text-[11px] text-slate-500">Deterministic hash window prevents duplicate ad attribution across client and server.</div>
                    </div>
                    <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="block text-[10px] font-bold uppercase text-slate-400">Enriched Client Headers</span>
                      <span className="text-xs font-semibold text-slate-800">client_ip_address, client_user_agent, fbp, fbc</span>
                      <div className="text-[11px] text-slate-500">Forwarded on all server conversions to optimize Event Match Quality (EMQ).</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          }
          footer={null}
        />
      )}

      {/* ── SECTION 5: CATALOG & FEED ── */}
      {(activeSection === "all" || activeSection === "catalog") && (
        <MetaSettingsSection
          index={5}
          title="Dynamic Product Catalog & Feed"
          description="Live RSS 2.0 XML product feed endpoint and Catalog ID configuration."
          icon={<ShoppingBag className="h-5 w-5" />}
          accent="bg-pink-50 text-pink-600 border-pink-200/60"
          status={data ? renderStatusBadge(data.catalog.status) : null}
          canEdit={false}
          editing={false}
          onEdit={() => {}}
          onCancel={() => {}}
          rows={[
            {
              label: "Catalog Dataset ID",
              value: catalogId || "1112170671558899",
              isSet: Boolean(catalogId),
              mono: true,
              onAction: () => setIsCatalogIdModalOpen(true),
            },
            {
              label: "Catalog Management Token",
              value: data?.catalog.maskedCatalogApiToken || "Not configured",
              isSet: Boolean(data?.catalog.hasCatalogApiToken),
              secret: true,
              actionLabel: "Replace",
              onAction: () => setIsCatalogTokenModalOpen(true),
            },
            {
              label: "Synchronized products",
              value: `${data?.catalog.productCount ?? 0} active items`,
              isSet: (data?.catalog.productCount ?? 0) > 0,
              readOnly: true,
              auto: true,
            },
            {
              label: "Public feed URL",
              value: data?.catalog.feedUrl || "—",
              isSet: Boolean(data?.catalog.feedUrl),
              mono: true,
              readOnly: true,
              auto: true,
            },
          ]}
          belowContent={
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={testingSection === "catalog"}
                  onClick={() => handleTestSection("catalog")}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-pink-200 bg-pink-50 px-3.5 py-2 text-xs font-semibold text-pink-900 shadow-2xs transition hover:bg-pink-100 disabled:opacity-50"
                >
                  {testingSection === "catalog" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5 fill-pink-700 text-pink-700" />
                  )}
                  <span>{testingSection === "catalog" ? "Verifying Catalog..." : "Test & Verify Catalog Access"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFeedScheduleModalOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                >
                  <Sliders className="h-3.5 w-3.5 text-slate-500" />
                  <span>Configure Schedule (Dialog)</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleDetails("catalog")}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                >
                  {expandedDetails["catalog"] ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  <span>{expandedDetails["catalog"] ? "Hide Technical Details" : "Show Technical Details"}</span>
                </button>

                <a
                  href="/api/admin/meta/catalog-feed/preview"
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                  title="Opens the live feed with the environment key applied server-side"
                >
                  <span>Preview feed</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {renderTestResultPanel("catalog")}

              {expandedDetails["catalog"] && (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Catalog Manager XML Feed &amp; Inventory Integration
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="block text-[10px] font-bold uppercase text-slate-400">Feed Schema Standard</span>
                      <span className="text-xs font-semibold text-slate-800">RSS 2.0 / Google Merchant Feed Spec</span>
                      <div className="text-[11px] text-slate-500">Validates title, description, price, availability, condition, brand, and media URLs.</div>
                    </div>
                    <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="block text-[10px] font-bold uppercase text-slate-400">Catalog ID Binding</span>
                      <span className="font-mono text-xs text-slate-800">Meta Commerce Manager: {catalogId || "1112170671558899"}</span>
                      <div className="text-[11px] text-slate-500">Connected to Advantage+ Dynamic Product Ads and Instagram shopping tags.</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          }
          footer={null}
        />
      )}

      {/* ── SECTION 6: DOMAIN VERIFICATION ── */}
      {(activeSection === "all" || activeSection === "domain") && (
        <MetaSettingsSection
          index={6}
          title="Domain Verification & AEM"
          description="Ownership verification for Aggregated Event Measurement under iOS 14.5+."
          icon={<Globe className="h-5 w-5" />}
          accent="bg-emerald-50 text-emerald-600 border-emerald-200/60"
          status={data ? renderStatusBadge(data.domain.status) : null}
          canEdit={false}
          editing={false}
          onEdit={() => {}}
          onCancel={() => {}}
          rows={[
            {
              label: "Canonical root domain",
              value: data?.domain.domain || "angkon.net",
              isSet: Boolean(data?.domain.domain),
              mono: true,
              actionLabel: "Add domain",
              onAction: () => setIsAddDomainModalOpen(true),
            },
            {
              label: "Meta verification token",
              value: domainToken
                ? `${domainToken.slice(0, 10)}${"•".repeat(16)}`
                : "c82us1ogm8••••••••••••••••••••",
              isSet: Boolean(domainToken),
              secret: true,
              actionLabel: "Replace",
              onAction: () => setIsConfigureDomainTokenModalOpen(true),
            },
            {
              label: "Verification method",
              value: verificationMethod === "dns_txt" ? "DNS TXT record (@)" : "HTML <head> tag",
              isSet: true,
              readOnly: true,
            },
            {
              label: "AEM event priority",
              value: "5 of 8 slots calibrated",
              isSet: true,
              actionLabel: "Configure",
              onAction: () => setIsConfigureAemPriorityModalOpen(true),
            },
          ]}
          belowContent={
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={testingSection === "domain"}
                  onClick={() => handleTestSection("domain")}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-900 shadow-2xs transition hover:bg-emerald-100 disabled:opacity-50"
                >
                  {testingSection === "domain" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5 fill-emerald-700 text-emerald-700" />
                  )}
                  <span>{testingSection === "domain" ? "Querying Namecheap DNS..." : "Test Live DNS TXT Lookup"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleDetails("domain")}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                >
                  {expandedDetails["domain"] ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  <span>{expandedDetails["domain"] ? "Hide Technical Details" : "Show Technical Details"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsConfigureDomainTokenModalOpen(true)}
                  className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>Configure Token (Dialog)</span>
                </button>
              </div>

              {renderTestResultPanel("domain")}

              {expandedDetails["domain"] && (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Domain Verification &amp; Namecheap Apex DNS Record
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="block text-[10px] font-bold uppercase text-slate-400">Expected DNS TXT Record</span>
                      <span className="break-all font-mono text-xs text-slate-800">
                        facebook-domain-verification={domainToken || "c82us1ogm8zgy1u7zn8v7dcvzpt1a2"}
                      </span>
                      <div className="text-[11px] text-slate-500">Host: @ • TTL: Automatic / 300s on Namecheap DNS.</div>
                    </div>
                    <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="block text-[10px] font-bold uppercase text-slate-400">Alternative HTML Meta Injection</span>
                      <span className="break-all font-mono text-xs text-slate-800">
                        &lt;meta name=&quot;facebook-domain-verification&quot; content=&quot;{domainToken || "c82us1og..."}&quot; /&gt;
                      </span>
                      <div className="text-[11px] text-slate-500">Auto-injected into storefront layout metadata.</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          }
          footer={null}
        />
      )}

      {/* ── SECTION 7: SECURITY & PERMISSIONS ── */}
      {(activeSection === "all" || activeSection === "security") && (
        <MetaSettingsSection
          index={7}
          title="Security, Token Encryption & Permissions"
          description="Cryptographic protection of credentials at rest in MongoDB."
          icon={<ShieldCheck className="h-5 w-5" />}
          accent="bg-emerald-50 text-emerald-600 border-emerald-200/60"
          status={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>AES-256-GCM Active</span>
            </span>
          }
          canEdit={false}
          editing={false}
          onEdit={() => {}}
          onCancel={() => {}}
          rows={[
            {
              label: "Encryption cipher",
              value: "AES-256-GCM (authenticated envelope)",
              isSet: true,
              mono: true,
              readOnly: true,
              auto: true,
            },
            {
              label: "Key storage",
              value: "External environment (isolated from the database)",
              isSet: true,
              readOnly: true,
              auto: true,
            },
            {
              label: "CAPI token encryption",
              value: data?.security.capiTokenEncrypted
                ? "Encrypted with nonce & auth tag"
                : "Not encrypted",
              isSet: Boolean(data?.security.capiTokenEncrypted),
              readOnly: true,
              auto: true,
            },
            {
              label: "Marketing token encryption",
              value: data?.security.marketingTokenEncrypted
                ? "Encrypted with nonce & auth tag"
                : "Not encrypted",
              isSet: Boolean(data?.security.marketingTokenEncrypted),
              readOnly: true,
              auto: true,
            },
            {
              label: "PII normalization",
              value: "SHA-256 (email & phone hashed before dispatch)",
              isSet: true,
              readOnly: true,
              auto: true,
            },
            {
              label: "Last credential update",
              value: formatStamp(data?.security.lastCredentialUpdate),
              isSet: Boolean(data?.security.lastCredentialUpdate),
              readOnly: true,
              auto: true,
            },
          ]}
          belowContent={
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={testingSection === "security"}
                  onClick={() => handleTestSection("security")}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-900 shadow-2xs transition hover:bg-emerald-100 disabled:opacity-50"
                >
                  {testingSection === "security" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                  <span>{testingSection === "security" ? "Verifying Vault Cipher..." : "Test Cryptographic Vault Integrity"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleDetails("security")}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                >
                  {expandedDetails["security"] ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  <span>{expandedDetails["security"] ? "Hide Technical Details" : "Show Technical Details"}</span>
                </button>

                <span className="ml-auto flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Zero-plaintext leakage enforced</span>
                </span>
              </div>

              {renderTestResultPanel("security")}

              {expandedDetails["security"] && (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Cryptographic Key Derivation &amp; Key Rotation Protocol
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="block text-[10px] font-bold uppercase text-slate-400">Key Derivation Function</span>
                      <span className="text-xs font-semibold text-slate-800">scrypt / 256-bit Key Stretching</span>
                      <div className="text-[11px] text-slate-500">Salted derivation ensures collision-resistance against offline brute-force attacks.</div>
                    </div>
                    <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="block text-[10px] font-bold uppercase text-slate-400">Zero-Downtime Rotation</span>
                      <span className="font-mono text-xs text-slate-800">META_TOKEN_ROTATION_KEYS</span>
                      <div className="text-[11px] text-slate-500">Graceful rollover allows historical tokens to decrypt while re-encrypting with primary key.</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          }
          footer={null}
        />
      )}

      {/* ── SECTION 8: AUTOMATIC SYNCHRONIZATION ── */}
      {(activeSection === "all" || activeSection === "sync") && (
        <MetaSettingsSection
          index={8}
          title="Automatic Meta Graph API Synchronization"
          description="Scheduled server-side polling, concurrency locking, and cache refresh intervals."
          icon={<RefreshCw className="h-5 w-5" />}
          accent="bg-blue-50 text-blue-600 border-blue-200/60"
          status={data ? renderStatusBadge(data.sync.status) : null}
          canEdit={false}
          editing={false}
          onEdit={() => {}}
          onCancel={() => {}}
          rows={[
            {
              label: "Event reporting",
              value: `Every ${data?.sync.intervals.eventsReportingMinutes ?? 10} min`,
              isSet: true,
              readOnly: true,
              auto: true,
            },
            {
              label: "Integrations health check",
              value: `Every ${data?.sync.intervals.integrationsVerificationMinutes ?? 20} min`,
              isSet: true,
              readOnly: true,
              auto: true,
            },
            {
              label: "Asset relationships",
              value: `Every ${data?.sync.intervals.assetRelationshipsMinutes ?? 45} min`,
              isSet: true,
              readOnly: true,
              auto: true,
            },
            {
              label: "Dataset quality (EMQ)",
              value: `Every ${data?.sync.intervals.datasetQualityHours ?? 12} hours`,
              isSet: true,
              readOnly: true,
              auto: true,
            },
            {
              label: "Vercel production cron",
              value: "0 0 * * * (/api/cron/meta-sync - daily)",
              isSet: true,
              mono: true,
              readOnly: true,
              auto: true,
            },
            {
              label: "Last successful sync",
              value: formatStamp(data?.sync.lastSuccessfulSync),
              isSet: Boolean(data?.sync.lastSuccessfulSync),
              readOnly: true,
              auto: true,
            },
            {
              label: "Next scheduled sync",
              value: formatStamp(data?.sync.nextScheduledSync),
              isSet: Boolean(data?.sync.nextScheduledSync),
              readOnly: true,
              auto: true,
            },
            {
              label: "Concurrency locking",
              value: "Single-flight guard active (atomic lockUntil)",
              isSet: true,
              readOnly: true,
              auto: true,
            },
          ]}
          belowContent={
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={syncing}
                  onClick={handleTriggerSync}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-900 shadow-2xs transition hover:bg-blue-100 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-blue-600 ${syncing ? "animate-spin" : ""}`} />
                  <span>{syncing ? "Synchronizing All Services..." : "Trigger Full Synchronization Now"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleDetails("sync")}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                >
                  {expandedDetails["sync"] ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  <span>{expandedDetails["sync"] ? "Hide Technical Details" : "Show Technical Details"}</span>
                </button>

                <span className="ml-auto font-mono text-[11px] text-slate-400">Vercel Cron: Daily cadence</span>
              </div>

              {expandedDetails["sync"] && (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Background Synchronization Engine &amp; Lock Architecture
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="block text-[10px] font-bold uppercase text-slate-400">MongoDB Persistence</span>
                      <span className="font-mono text-xs text-slate-800">MetaSyncSnapshot collection</span>
                      <div className="text-[11px] text-slate-500">Stores latest validated response snapshots for immediate UI rendering without external rate spikes.</div>
                    </div>
                    <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="block text-[10px] font-bold uppercase text-slate-400">Crash Recovery &amp; Timeout</span>
                      <span className="text-xs font-semibold text-slate-800">3-Minute Atomic Lock Leases</span>
                      <div className="text-[11px] text-slate-500">Stale jobs automatically clear after 180 seconds to prevent pipeline deadlocks.</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          }
          footer={null}
        />
      )}

      {/* ── PHASE 7: Dedicated Credentials & Attribution Modals ── */}
      <ConfigureAdAccountModal
        isOpen={isAdAccountModalOpen}
        onClose={() => setIsAdAccountModalOpen(false)}
        currentAccountId={adAccountId}
        hasExistingToken={Boolean(data?.ads.hasMarketingToken)}
        onSaveCredentials={async (newId, newToken) => {
          await handleSaveSection("ads", {
            adAccountId: newId,
            ...(newToken ? { accessToken: newToken } : {}),
            verify: true,
          });
          setAdAccountId(newId);
          await fetchSettings();
        }}
        onRequestDisconnect={() => setIsDisconnectModalOpen(true)}
      />

      <ReplaceMarketingTokenModal
        isOpen={isReplaceMarketingTokenModalOpen}
        onClose={() => setIsReplaceMarketingTokenModalOpen(false)}
        adAccountId={adAccountId}
        currentMasked={data?.ads.maskedMarketingToken || undefined}
        onSaveToken={async (token) => {
          await handleSaveSection("ads", { adAccountId, accessToken: token, verify: true });
          await fetchSettings();
        }}
      />

      {/* ── Domain & AEM Modals ── */}
      <AddDomainModal
        isOpen={isAddDomainModalOpen}
        onClose={() => setIsAddDomainModalOpen(false)}
        onAddDomain={async (payload) => {
          const res = await fetch("/api/admin/meta/domain-verification/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "add_domain",
              domain: payload.domain,
              verificationMethod: payload.verificationMethod,
              customToken: payload.customToken,
            }),
          });
          const json = await res.json();
          if (!res.ok || !json.ok) throw new Error(json.error || "Failed to register domain");
          await fetchSettings();
        }}
      />

      <ConfigureDomainTokenModal
        isOpen={isConfigureDomainTokenModalOpen}
        onClose={() => setIsConfigureDomainTokenModalOpen(false)}
        domain={data?.domain.domain || "angkon.net"}
        currentToken={domainToken}
        currentMethod={verificationMethod as "dns_txt" | "html_meta_tag"}
        onSaveToken={async (payload) => {
          const res = await fetch("/api/admin/meta/domain-verification/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "update_token",
              domain: data?.domain.domain || "angkon.net",
              customToken: payload.token,
              verificationMethod: payload.method,
            }),
          });
          const json = await res.json();
          if (!res.ok || !json.ok) throw new Error(json.error || "Failed to update domain token");
          setDomainToken(payload.token);
          setVerificationMethod(payload.method);
          await fetchSettings();
        }}
      />

      <ConfigureAemPriorityModal
        isOpen={isConfigureAemPriorityModalOpen}
        onClose={() => setIsConfigureAemPriorityModalOpen(false)}
        onSavePriority={async (priorityEvents) => {
          await handleSaveSection("domain", {
            domainVerificationToken: domainToken,
            verificationMethod,
            aemPriority: priorityEvents,
          });
          await fetchSettings();
        }}
      />

      <UpdateBusinessIdModal
        isOpen={isBusinessModalOpen}
        onClose={() => setIsBusinessModalOpen(false)}
        currentBusinessId={businessId}
        currentBusinessName={businessName}
        onSaveBusiness={async (id, name) => {
          await handleSaveSection("general", { businessId: id, businessName: name });
          setBusinessId(id);
          setBusinessName(name);
          await fetchSettings();
        }}
      />

      <ConfigureAppSecretModal
        isOpen={isAppSecretModalOpen}
        onClose={() => setIsAppSecretModalOpen(false)}
        hasExistingSecret={Boolean(data?.general.hasAppSecret)}
        currentMasked={data?.general.maskedAppSecret || undefined}
        onSaveSecret={async (secret) => {
          await handleSaveSection("general", { appSecret: secret });
          await fetchSettings();
        }}
        onRequestRemoveSecret={async () => {
          await handleSaveSection("general", { removeAppSecret: true });
          await fetchSettings();
        }}
      />

      <EditAppIdModal
        isOpen={isAppIdModalOpen}
        onClose={() => setIsAppIdModalOpen(false)}
        currentAppId={appId}
        onSaveAppId={async (id) => {
          await handleSaveSection("general", { appId: id });
          setAppId(id);
          await fetchSettings();
        }}
      />

      <EditDatasetIdModal
        isOpen={isDatasetIdModalOpen}
        onClose={() => setIsDatasetIdModalOpen(false)}
        currentPixelId={pixelId}
        onSave={async (id) => {
          await handleSaveSection("dataset", { pixelId: id });
          setPixelId(id);
          await fetchSettings();
        }}
      />

      <ConfigureTestCodeModal
        isOpen={isTestCodeModalOpen}
        onClose={() => setIsTestCodeModalOpen(false)}
        currentCode={testEventCode}
        onSaveCode={async (code) => {
          await handleSaveSection("dataset", { testEventCode: code });
          setTestEventCode(code);
          await fetchSettings();
        }}
      />

      <EditTrackingSignalsModal
        isOpen={isTrackingSignalsModalOpen}
        onClose={() => setIsTrackingSignalsModalOpen(false)}
        current={{
          enabled: datasetEnabled,
          trackPageView,
          trackViewContent,
          trackAddToCart,
          trackInitiateCheckout,
          trackPurchase,
        }}
        onSaveSignals={async (next) => {
          await handleSaveSection("dataset", { ...next });
          setDatasetEnabled(next.enabled);
          setTrackPageView(next.trackPageView);
          setTrackViewContent(next.trackViewContent);
          setTrackAddToCart(next.trackAddToCart);
          setTrackInitiateCheckout(next.trackInitiateCheckout);
          setTrackPurchase(next.trackPurchase);
          await fetchSettings();
        }}
      />

      <ConfigureCapiTokenModal
        isOpen={isCapiTokenModalOpen}
        onClose={() => setIsCapiTokenModalOpen(false)}
        hasExistingToken={Boolean(data?.capi.hasCapiToken)}
        currentMasked={data?.capi.maskedCapiToken || undefined}
        onSaveToken={async (token) => {
          await handleSaveSection("capi", { capiAccessToken: token });
          await fetchSettings();
        }}
        onRequestRemoveToken={async () => {
          await handleSaveSection("capi", { removeToken: true });
        }}
      />

      <UpdateAttributionConfigModal
        isOpen={isAttributionModalOpen}
        onClose={() => setIsAttributionModalOpen(false)}
        currentWindows={attributionWindows}
        currentReportTime={attributionReportTime}
        onSaveConfig={async (wins, rep) => {
          await handleSaveSection("ads", {
            adAccountId,
            attributionConfig: { actionAttributionWindows: wins, actionReportTime: rep },
          });
          setAttributionWindows(wins);
          setAttributionReportTime(rep);
          await fetchSettings();
        }}
      />

      <MetaConfirmWarningModal
        isOpen={isDisconnectModalOpen}
        onClose={() => setIsDisconnectModalOpen(false)}
        title="Disconnect Meta Ad Account?"
        description="This will remove the saved Marketing API access token from the AES-256 encrypted vault. Daily ad spend imports, multi-level campaign insights, and dual-ledger ROAS reconciliation will be paused until you reconnect."
        confirmButtonText="Disconnect & Remove Token"
        onConfirm={async () => {
          try {
            const res = await fetch("/api/admin/meta/settings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ section: "ads", disconnect: true }),
            });
            const d = await res.json();
            if (res.ok && d.ok) {
              setMessage({ type: "success", text: "Meta Ad Account disconnected successfully." });
              await fetchSettings();
            } else {
              setMessage({ type: "error", text: d.error || "Failed to disconnect account." });
            }
          } catch {
            setMessage({ type: "error", text: "Network error disconnecting account." });
          }
        }}
      />

      {/* ── Catalog Modals ── */}
      <EditCatalogIdModal
        isOpen={isCatalogIdModalOpen}
        onClose={() => setIsCatalogIdModalOpen(false)}
        currentCatalogId={catalogId}
        onSave={async (newId) => {
          await handleSaveSection("catalog", { catalogId: newId });
          setCatalogId(newId);
          await fetchSettings();
        }}
      />

      <ConfigureCatalogTokenModal
        isOpen={isCatalogTokenModalOpen}
        onClose={() => setIsCatalogTokenModalOpen(false)}
        hasExistingToken={Boolean(data?.catalog.hasCatalogApiToken)}
        currentMasked={data?.catalog.maskedCatalogApiToken || undefined}
        onSaveToken={async (token) => {
          await handleSaveSection("catalog", { catalogId, catalogApiToken: token, verify: true });
          await fetchSettings();
        }}
        onRequestRemoveToken={async () => {
          // The API clears the token only on `removeToken` — an empty string is
          // treated as "no change", which made Remove silently do nothing.
          await handleSaveSection("catalog", { catalogId, removeToken: true });
          await fetchSettings();
        }}
      />

      <ConfigureFeedScheduleModal
        isOpen={isFeedScheduleModalOpen}
        onClose={() => setIsFeedScheduleModalOpen(false)}
        currentSchedule={data?.catalog.syncInterval || "DAILY"}
        currentFeedName="ANGKON Production Catalog Feed"
        onSaveSchedule={async (config) => {
          await handleSaveSection("catalog", {
            catalogId,
            feedSchedule: config.schedule,
            feedName: config.feedName,
            feedHour: config.hour,
          });
          await fetchSettings();
        }}
      />

    </div>
  );
}



function SettingsLoadingFallback() {
  return (
    <div className="space-y-6 max-w-7xl pb-24 text-slate-900 font-sans antialiased p-6">
      <div className="h-16 bg-white rounded-2xl border border-slate-200 animate-pulse" />
      <div className="h-48 bg-white rounded-2xl border border-slate-200 animate-pulse" />
    </div>
  );
}

export default function CentralizedMetaSettingsPage() {
  return (
    <Suspense fallback={<SettingsLoadingFallback />}>
      <CentralizedMetaSettingsContent />
    </Suspense>
  );
}
