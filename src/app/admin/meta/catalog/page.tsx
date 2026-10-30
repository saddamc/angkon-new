"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Clock3,
  Copy,
  Database,
  ExternalLink,
  FileCode,
  Globe,
  KeyRound,
  Link2,
  Loader2,
  PackageCheck,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Store,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { MetaNavigationHeader } from "../meta-nav";
import type { PublicAdminPixelSettings } from "@/server/pixel-settings";
import type {
  MetaCatalogConnectionState,
  PublicMetaCatalogSettings,
} from "@/server/meta-catalog";
import type {
  CatalogCategoryCoverage,
  CatalogFeedCounts,
  FeedValidationIssue,
} from "@/lib/meta-catalog";

interface FeedInfo {
  environment: string;
  currentUrl: string;
  currentBaseUrl: string;
  currentSource: string;
  currentIsPublicHttps: boolean;
  productionUrl: string;
  productionBaseUrl: string;
  productionSource: string;
  productionIsPublicHttps: boolean;
  warnings: string[];
}

interface CatalogSettingsResponse {
  settings: PublicMetaCatalogSettings;
  feed: FeedInfo;
}

interface ProductionFeedProbe {
  state:
    | "reachable"
    | "invalid-response"
    | "http-error"
    | "network-error"
    | "not-public"
    | "not-configured";
  checkedAt: string;
  url: string;
  httpStatus?: number;
  contentType?: string;
  itemCount?: number;
  bytes?: number;
  validXml?: boolean;
  error?: string;
  durationMs?: number;
}

interface CatalogDiagnostics {
  generatedAt: string;
  environment: string;
  baseUrl: string;
  baseUrlSource: string;
  feedUrl: string;
  feedIsPublicHttps: boolean;
  productionFeedUrl: string;
  productionFeedUrlSource: string;
  localFeedUrl: string;
  publicHttpsConfigured: boolean;
  page: {
    page: number;
    perPage: number;
    totalPages: number;
    totalVisible: number;
    totalAll: number;
    excludedFromCatalog: number;
    truncated: boolean;
  };
  counts: CatalogFeedCounts;
  categoryCoverage: CatalogCategoryCoverage;
  latestProductUpdatedAt: string | null;
  allLinksPublicHttps: boolean;
  invalidSamples: FeedValidationIssue[];
  excludedSamples: Array<{
    productId: string | null;
    name: string;
    slug: string;
    reason: string;
  }>;
  duplicateIds: string[];
  xmlBytes: number;
  warnings: string[];
}

interface DiagnosticsResponse {
  diagnostics: CatalogDiagnostics;
  catalog: PublicMetaCatalogSettings;
  production: ProductionFeedProbe | null;
  metaStatus: {
    catalogConnection: {
      state: MetaCatalogConnectionState;
      label: string;
      detail: string;
    };
    lastSuccessfulMetaFetch: {
      available: boolean;
      value: string | null;
      detail: string;
    };
    productImportErrors: {
      localValidationAvailable: boolean;
      metaImportErrorsAvailable: boolean;
      detail: string;
    };
  };
}

interface CatalogItem {
  id: string;
  title: string;
  price: string;
  sale_price?: string;
  availability: string;
  link: string;
  image_link: string;
  brand?: string;
  google_product_category?: string;
  product_type?: string;
  size?: string;
  gender?: string;
}

type Tone = "success" | "warning" | "error" | "neutral" | "pending";

const toneClasses: Record<Tone, { badge: string; icon: string; panel: string }> = {
  success: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: "bg-emerald-50 text-emerald-600",
    panel: "border-emerald-100",
  },
  warning: {
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    icon: "bg-amber-50 text-amber-600",
    panel: "border-amber-100",
  },
  error: {
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    icon: "bg-rose-50 text-rose-600",
    panel: "border-rose-100",
  },
  neutral: {
    badge: "bg-stone-100 text-stone-600 border-stone-200",
    icon: "bg-stone-100 text-stone-500",
    panel: "border-stone-200",
  },
  pending: {
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    icon: "bg-blue-50 text-blue-600",
    panel: "border-blue-100",
  },
};

function formatDateTime(value?: string | null): string {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function connectionTone(state?: MetaCatalogConnectionState): Tone {
  if (state === "verified") return "success";
  if (state === "error") return "error";
  if (state === "configured-untested" || state === "catalog-id-only" || state === "credential-only") {
    return "warning";
  }
  return "neutral";
}

function productionTone(state?: ProductionFeedProbe["state"] | "not-checked"): Tone {
  if (state === "reachable") return "success";
  if (state === "not-checked" || state === undefined) return "pending";
  if (state === "invalid-response" || state === "http-error") return "error";
  if (state === "network-error" || state === "not-public") return "warning";
  return "neutral";
}

function DiagnosticCard({
  title,
  stateLabel,
  tone,
  detail,
  meta,
  icon,
  action,
}: {
  title: string;
  stateLabel: string;
  tone: Tone;
  detail: string;
  meta?: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
}) {
  const styles = toneClasses[tone];

  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-xs ${styles.panel}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-stone-900">{title}</h4>
            <span
              className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${styles.badge}`}
            >
              {stateLabel}
            </span>
          </div>
        </div>
        {action}
      </div>
      <p className="mt-2.5 text-[11px] leading-relaxed text-stone-600">{detail}</p>
      {meta && <p className="mt-1.5 font-mono text-[10px] text-stone-500">{meta}</p>}
    </div>
  );
}

export default function MetaCatalogPage() {
  const [settings, setSettings] = useState<PublicAdminPixelSettings | null>(null);
  const [catalogSettings, setCatalogSettings] = useState<PublicMetaCatalogSettings | null>(null);
  const [feedInfo, setFeedInfo] = useState<FeedInfo | null>(null);
  const [diagnostics, setDiagnostics] = useState<CatalogDiagnostics | null>(null);
  const [productionProbe, setProductionProbe] = useState<ProductionFeedProbe | null>(null);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [probeLoading, setProbeLoading] = useState(false);
  const [copiedFeed, setCopiedFeed] = useState(false);
  const [copiedLocal, setCopiedLocal] = useState(false);
  const [catalogId, setCatalogId] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [catalogToken, setCatalogToken] = useState("");
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const formHydratedRef = useRef(false);

  const hydrateForm = useCallback((data: PublicMetaCatalogSettings) => {
    setCatalogId(data.catalogId || "");
    setBusinessId(data.businessId || "");
    setCatalogToken("");
    formHydratedRef.current = true;
  }, []);

  const loadData = useCallback(async () => {
    setRefreshing(true);

    try {
      const [pixelResult, catalogResult, diagnosticsResult, previewResult] =
        await Promise.allSettled([
          fetch("/api/admin/settings/pixel", { cache: "no-store" }),
          fetch("/api/admin/meta/catalog/settings", { cache: "no-store" }),
          fetch("/api/admin/meta/catalog/diagnostics", { cache: "no-store" }),
          fetch("/api/meta/catalog?format=json&per_page=20", { cache: "no-store" }),
        ]);

      if (pixelResult.status === "fulfilled" && pixelResult.value.ok) {
        const data = (await pixelResult.value.json()) as PublicAdminPixelSettings;
        setSettings(data);
      }

      if (catalogResult.status === "fulfilled" && catalogResult.value.ok) {
        const data = (await catalogResult.value.json()) as CatalogSettingsResponse;
        setCatalogSettings(data.settings);
        setFeedInfo(data.feed);
        if (!formHydratedRef.current) hydrateForm(data.settings);
      }

      if (diagnosticsResult.status === "fulfilled" && diagnosticsResult.value.ok) {
        const data = (await diagnosticsResult.value.json()) as DiagnosticsResponse;
        setDiagnostics(data.diagnostics);
        setCatalogSettings(data.catalog);
        setProductionProbe(data.production);
      }

      if (previewResult.status === "fulfilled" && previewResult.value.ok) {
        const data = (await previewResult.value.json()) as { items?: CatalogItem[] };
        setItems(Array.isArray(data.items) ? data.items : []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hydrateForm]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // Defer so the first setState happens outside the effect body itself.
      await Promise.resolve();
      if (!cancelled) await loadData();
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const copyText = async (text: string, onCopied: (value: boolean) => void) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      onCopied(true);
      setTimeout(() => onCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const runProductionProbe = async () => {
    setProbeLoading(true);
    try {
      const response = await fetch("/api/admin/meta/catalog/diagnostics?probe=1", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Diagnostics returned HTTP ${response.status}`);
      const data = (await response.json()) as DiagnosticsResponse;
      setDiagnostics(data.diagnostics);
      setCatalogSettings(data.catalog);
      setProductionProbe(data.production);
    } catch (error) {
      setFormMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not reach the public feed.",
      });
    } finally {
      setProbeLoading(false);
    }
  };

  const saveCatalogSetup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingCatalog(true);
    setFormMessage(null);

    try {
      const response = await fetch("/api/admin/meta/catalog/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catalogId,
          businessId,
          ...(catalogToken.trim() ? { catalogApiToken: catalogToken.trim() } : {}),
        }),
      });

      const data = (await response.json()) as
        | CatalogSettingsResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(("error" in data && data.error) || "Failed to save catalog settings.");
      }

      const saved = data as CatalogSettingsResponse;
      setCatalogSettings(saved.settings);
      setFeedInfo(saved.feed);
      setCatalogToken("");
      setFormMessage({
        type: "success",
        text: "Catalog settings saved. Catalog API management remains off until you verify access.",
      });
    } catch (error) {
      setFormMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save catalog settings.",
      });
    } finally {
      setSavingCatalog(false);
    }
  };

  const clearCatalogSetup = async () => {
    setSavingCatalog(true);
    setFormMessage(null);

    try {
      const response = await fetch("/api/admin/meta/catalog/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalogId: "", businessId: "", catalogApiToken: "" }),
      });
      const data = (await response.json()) as CatalogSettingsResponse | { error?: string };
      if (!response.ok) {
        throw new Error(("error" in data && data.error) || "Failed to clear catalog settings.");
      }
      const saved = data as CatalogSettingsResponse;
      setCatalogSettings(saved.settings);
      setFeedInfo(saved.feed);
      hydrateForm(saved.settings);
      setFormMessage({
        type: "success",
        text: "Catalog API credentials cleared. The scheduled feed URL remains available.",
      });
    } catch (error) {
      setFormMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to clear catalog settings.",
      });
    } finally {
      setSavingCatalog(false);
    }
  };

  const verifyCatalogAccess = async () => {
    setVerifying(true);
    setFormMessage(null);

    try {
      const response = await fetch("/api/admin/meta/catalog/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        verification?: { error?: string; catalogName?: string; productCount?: number };
        settings?: PublicMetaCatalogSettings;
      };

      if (data.settings) setCatalogSettings(data.settings);

      if (!response.ok || !data.ok) {
        throw new Error(data.verification?.error || data.error || "Meta catalog verification failed.");
      }

      setFormMessage({
        type: "success",
        text: `Meta confirmed API access${
          data.verification?.catalogName ? ` to "${data.verification.catalogName}"` : ""
        }. This confirms access, not that the scheduled feed has been imported.`,
      });
    } catch (error) {
      setFormMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Meta catalog verification failed.",
      });
    } finally {
      setVerifying(false);
    }
  };

  const pixelId = settings?.pixelId || "";
  const productionUrl = feedInfo?.productionUrl || diagnostics?.productionFeedUrl || "";
  const localUrl = feedInfo?.currentUrl || diagnostics?.localFeedUrl || "";
  const counts = diagnostics?.counts;
  const coverage = diagnostics?.categoryCoverage;
  const invalidCount = counts?.invalidItems ?? 0;
  const validCount = counts?.validItems ?? items.length;
  const excludedCount =
    diagnostics?.page.excludedFromCatalog ?? counts?.excludedItems ?? 0;
  const mappedCount = coverage?.mapped ?? 0;
  const genericCount = coverage?.generic ?? 0;
  const unmappedCount = coverage?.unmapped ?? 0;
  const totalClassified = mappedCount + genericCount + unmappedCount;
  const classificationPct =
    totalClassified > 0 ? Math.round((mappedCount / totalClassified) * 100) : 0;

  const localFeedTone: Tone = diagnostics
    ? invalidCount > 0
      ? "warning"
      : validCount > 0
        ? "success"
        : "neutral"
    : "pending";

  const catalogConnectionState = catalogSettings?.connectionState;
  const catalogConnectionTone = connectionTone(catalogConnectionState);

  return (
    <div className="min-w-0 max-w-7xl space-y-6 pb-24 font-sans text-stone-900 antialiased">
      <MetaNavigationHeader pixelId={pixelId} testEventCode={settings?.testEventCode} />

      {/* ── 1. Hero ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-200/70 bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-purple-800">
              <ShoppingBag className="h-3 w-3 text-purple-600" />
              <span>Meta Commerce Catalog</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
              Product Catalog Feed &amp; Commerce Manager Setup
            </h1>
            <p className="max-w-3xl text-xs leading-relaxed text-stone-600 sm:text-[13px]">
              Publish a validated RSS 2.0 product feed for Facebook &amp; Instagram Shops and
              Dynamic Product Ads. Feed item IDs use the same numeric product ID as the browser
              Pixel and server Conversions API.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                Public URL, no admin cookie required
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">
                <ShieldCheck className="h-3 w-3" />
                Currency: BDT
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 font-semibold text-stone-600">
                <Activity className="h-3 w-3" />
                RSS 2.0 / XML
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <a
              href={productionUrl || "/api/meta/catalog"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-purple-700"
            >
              <FileCode className="h-3.5 w-3.5" />
              <span>Open Production Feed</span>
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-2xs transition hover:bg-stone-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>
        </div>

        <div className="mt-4 border-t border-stone-100 pt-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Production scheduled-feed URL
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                    feedInfo?.productionIsPublicHttps
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  {feedInfo?.productionIsPublicHttps ? "HTTPS" : "CHECK CONFIGURATION"}
                </span>
                <span className="font-mono text-[10px] text-stone-500">
                  source: {feedInfo?.productionSource || "resolving..."}
                </span>
              </div>
              <div className="min-w-0 rounded-xl border border-stone-200/80 bg-stone-50 px-3.5 py-2 shadow-2xs">
                <code className="block break-all font-mono text-xs text-stone-800">
                  {productionUrl || "Resolving canonical production URL..."}
                </code>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void copyText(productionUrl, setCopiedFeed)}
                disabled={!productionUrl}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-semibold text-purple-900 shadow-2xs transition hover:bg-purple-100 disabled:opacity-50"
              >
                {copiedFeed ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>{copiedFeed ? "Copied URL" : "Copy URL"}</span>
              </button>
              <a
                href={productionUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-2xs transition hover:bg-stone-50"
              >
                <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
                <span>Open Feed</span>
              </a>
            </div>
          </div>

          {(feedInfo?.currentUrl !== productionUrl || !feedInfo?.productionIsPublicHttps) && (
            <div className="mt-3 flex flex-col gap-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  Local development preview
                </p>
                <code className="mt-0.5 block break-all font-mono text-[11px] text-blue-900">
                  {localUrl || "http://localhost:3001/api/meta/catalog"}
                </code>
                <p className="mt-1 text-[10px] leading-relaxed text-blue-800/80">
                  Localhost links work for preview only. Meta requires the production HTTPS URL.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void copyText(localUrl, setCopiedLocal)}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-blue-800 transition hover:bg-blue-50"
              >
                {copiedLocal ? (
                  <Check className="h-3 w-3 text-emerald-600" />
                ) : (
                  <ClipboardCopy className="h-3 w-3" />
                )}
                <span>{copiedLocal ? "Copied" : "Copy local URL"}</span>
              </button>
            </div>
          )}

          {feedInfo?.warnings && feedInfo.warnings.length > 0 && (
            <details className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-[11px] text-amber-900">
              <summary className="cursor-pointer font-semibold">
                Feed URL configuration notices ({feedInfo.warnings.length})
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {feedInfo.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>

      {/* ── 2. KPI cards ── */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Valid feed items
            </span>
            <PackageCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-1.5 text-2xl font-black text-stone-900">{validCount}</div>
          <p className="mt-1 text-[11px] leading-snug text-emerald-700">
            Products that passed every required feed check.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Invalid feed items
            </span>
            <ShieldAlert className={`h-4 w-4 ${invalidCount > 0 ? "text-rose-600" : "text-stone-400"}`} />
          </div>
          <div className="mt-1.5 text-2xl font-black text-stone-900">{invalidCount}</div>
          <p className={`mt-1 text-[11px] leading-snug ${invalidCount > 0 ? "text-rose-700" : "text-stone-500"}`}>
            {invalidCount > 0
              ? "These rows are excluded from the XML and listed below."
              : "No local validation errors detected."}
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Excluded from catalog
            </span>
            <XCircle className="h-4 w-4 text-stone-400" />
          </div>
          <div className="mt-1.5 text-2xl font-black text-stone-900">{excludedCount}</div>
          <p className="mt-1 text-[11px] leading-snug text-stone-500">
            Draft, private, deleted, inactive, or hidden products are never emitted.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Category mapping
            </span>
            <Globe className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-1.5 text-2xl font-black text-stone-900">{classificationPct}%</div>
          <p className="mt-1 text-[11px] leading-snug text-stone-500">
            {mappedCount} specific, {genericCount} product-type fallback, {unmappedCount} unmapped.
            This is coverage, not a claim that every item is perfectly classified.
          </p>
        </div>
      </div>

      {/* ── 3. Setup: scheduled feed ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-2 border-b border-stone-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                OPTION A
              </span>
              <h2 className="text-sm font-bold text-stone-900">Scheduled feed (recommended)</h2>
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-stone-600">
              No Meta API token is required. Paste the production HTTPS URL into Commerce Manager
              and let Meta fetch it on a schedule.
            </p>
          </div>
          <a
            href="https://business.facebook.com/commerce"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-2xs transition hover:bg-stone-50"
          >
            <Store className="h-3.5 w-3.5 text-stone-400" />
            <span>Commerce Manager</span>
            <ExternalLink className="h-3 w-3 text-stone-400" />
          </a>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              step: "1",
              title: "Select the catalog",
              body: "In Commerce Manager choose the ANGKON catalog that owns your Facebook & Instagram shop. Use one catalog per storefront.",
            },
            {
              step: "2",
              title: "Add a scheduled feed",
              body: "Open Data Sources → Add Items → Data Feed. Choose Scheduled feed, not a manual CSV upload.",
            },
            {
              step: "3",
              title: "Paste the HTTPS URL",
              body: "Use the production URL above. Set currency to BDT and choose an hourly or daily refresh.",
            },
            {
              step: "4",
              title: "Wait for Meta's import",
              body: "ANGKON can serve the XML, but only Meta can confirm import. Check Commerce Manager for item errors and status.",
            },
          ].map((item) => (
            <div key={item.step} className="rounded-xl border border-stone-200/70 bg-stone-50/60 p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white">
                  {item.step}
                </span>
                <span className="text-xs font-bold text-stone-900">{item.title}</span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-stone-600">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-[11px] leading-relaxed text-blue-900">
          <strong>Refresh schedule:</strong> hourly is suitable for frequent price or stock changes;
          daily is enough for a mostly static catalog. Meta controls the fetch schedule — saving this
          page does not trigger an immediate Meta import.
        </div>
      </div>

      {/* ── 4. Setup: Catalog API (optional) ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-2 border-b border-stone-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-stone-200 bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                OPTION B
              </span>
              <h2 className="text-sm font-bold text-stone-900">Catalog API (advanced, optional)</h2>
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-stone-600">
              Separate from CAPI. Requires a customer-authorized Meta app with{" "}
              <code className="rounded bg-stone-100 px-1 py-0.5 font-mono text-[10px]">
                catalog_management
              </code>{" "}
              permission. This page never reuses your Conversions API token.
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
              toneClasses[catalogConnectionTone].badge
            }`}
          >
            {catalogSettings?.connectionLabel || "Not Configured"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <form onSubmit={saveCatalogSetup} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Meta Catalog ID
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={catalogId}
                  onChange={(event) => setCatalogId(event.target.value)}
                  placeholder="e.g. 123456789012345"
                  autoComplete="off"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 font-mono text-xs text-stone-800 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Meta Business ID (optional)
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={businessId}
                  onChange={(event) => setBusinessId(event.target.value)}
                  placeholder="Business Manager ID"
                  autoComplete="off"
                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 font-mono text-xs text-stone-800 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Catalog API access token
              </span>
              <input
                type="password"
                value={catalogToken}
                onChange={(event) => setCatalogToken(event.target.value)}
                placeholder={
                  catalogSettings?.hasCatalogApiToken
                    ? `Saved: ${catalogSettings.maskedCatalogApiToken} — leave blank to keep`
                    : "Dedicated catalog_management token"
                }
                autoComplete="new-password"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 font-mono text-xs text-stone-800 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
              <span className="mt-1 block text-[10px] leading-relaxed text-stone-500">
                Stored server-side and never returned to the browser. Do not paste your CAPI token.
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={savingCatalog}
                className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-stone-800 disabled:opacity-50"
              >
                {savingCatalog ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <KeyRound className="h-3.5 w-3.5" />
                )}
                <span>{savingCatalog ? "Saving..." : "Save Catalog API Settings"}</span>
              </button>

              <button
                type="button"
                onClick={() => void verifyCatalogAccess()}
                disabled={verifying || !catalogSettings?.apiConfigured}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {verifying ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
                <span>{verifying ? "Verifying..." : "Verify API Access"}</span>
              </button>

              {(catalogSettings?.catalogId || catalogSettings?.hasCatalogApiToken) && (
                <button
                  type="button"
                  onClick={() => void clearCatalogSetup()}
                  disabled={savingCatalog}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5 text-stone-400" />
                  <span>Clear API setup</span>
                </button>
              )}
            </div>

            {formMessage && (
              <div
                role="status"
                className={`flex items-start gap-2 rounded-xl border p-3 text-[11px] leading-relaxed ${
                  formMessage.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-800"
                }`}
              >
                {formMessage.type === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                )}
                <span>{formMessage.text}</span>
              </div>
            )}
          </form>

          <div className="space-y-3 rounded-xl border border-stone-200/70 bg-stone-50/60 p-4">
            <h3 className="text-xs font-bold text-stone-900">Current API state</h3>
            <dl className="space-y-2 text-[11px]">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-stone-500">Catalog ID</dt>
                <dd className="break-all text-right font-mono font-semibold text-stone-800">
                  {catalogSettings?.catalogId || "Not set"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-stone-500">Credential</dt>
                <dd className="break-all text-right font-mono font-semibold text-stone-800">
                  {catalogSettings?.hasCatalogApiToken
                    ? catalogSettings.maskedCatalogApiToken
                    : "Not set"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-stone-500">Catalog name</dt>
                <dd className="text-right font-semibold text-stone-800">
                  {catalogSettings?.catalogName || "Not verified"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-stone-500">Last verified</dt>
                <dd className="text-right font-semibold text-stone-800">
                  {formatDateTime(catalogSettings?.lastVerifiedAt)}
                </dd>
              </div>
            </dl>
            <p className="border-t border-stone-200 pt-2 text-[10px] leading-relaxed text-stone-500">
              {catalogSettings?.connectionDetail ||
                "Catalog API management is not configured. Scheduled-feed setup still works."}
            </p>
          </div>
        </div>
      </div>

      {/* ── 5. Truthful diagnostics ── */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-stone-900">Feed diagnostics</h2>
            <p className="text-xs leading-relaxed text-stone-600">
              Serving XML does not mean Meta imported it. Each state below is reported separately.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void runProductionProbe()}
            disabled={probeLoading}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-100 disabled:opacity-50"
          >
            {probeLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Activity className="h-3.5 w-3.5" />
            )}
            <span>{probeLoading ? "Checking public feed..." : "Check Public Feed"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          <DiagnosticCard
            title="Local feed generation"
            stateLabel={
              diagnostics
                ? invalidCount > 0
                  ? "Generated with warnings"
                  : validCount > 0
                    ? "Generated"
                    : "Empty feed"
                : "Checking..."
            }
            tone={localFeedTone}
            detail={
              diagnostics
                ? `${validCount} valid and ${invalidCount} invalid items generated from ${diagnostics.page.totalVisible} visible products.`
                : "Reading products and validating the XML feed."
            }
            meta={diagnostics ? `XML size: ${diagnostics.xmlBytes.toLocaleString()} bytes` : undefined}
            icon={<Database className="h-4 w-4" />}
          />

          <DiagnosticCard
            title="Production feed accessibility"
            stateLabel={
              !productionProbe
                ? "Not checked"
                : productionProbe.state === "reachable"
                  ? "Public URL responded"
                  : productionProbe.state === "invalid-response"
                    ? "Response is not valid XML"
                    : productionProbe.state === "not-public"
                      ? "No public HTTPS URL"
                      : "Unreachable"
            }
            tone={productionTone(productionProbe?.state)}
            detail={
              productionProbe
                ? productionProbe.state === "reachable"
                  ? `HTTP ${productionProbe.httpStatus} with ${productionProbe.itemCount || 0} XML items. ANGKON served the feed; Meta import is separate.`
                  : productionProbe.error || "The public feed check did not succeed."
                : "Run Check Public Feed to fetch the production URL without an admin session or cookies."
            }
            meta={
              productionProbe
                ? `${formatDateTime(productionProbe.checkedAt)} · ${productionProbe.durationMs || 0}ms${
                    productionProbe.contentType ? ` · ${productionProbe.contentType}` : ""
                  }`
                : undefined
            }
            icon={<Globe className="h-4 w-4" />}
          />

          <DiagnosticCard
            title="Feed validation"
            stateLabel={
              !diagnostics
                ? "Checking..."
                : invalidCount > 0
                  ? `${invalidCount} item${invalidCount === 1 ? "" : "s"} rejected`
                  : "All visible items valid"
            }
            tone={!diagnostics ? "pending" : invalidCount > 0 ? "error" : "success"}
            detail={
              diagnostics
                ? invalidCount > 0
                  ? "Invalid rows are excluded from XML. Fix the reasons listed below before relying on Meta retargeting."
                  : "Titles, descriptions, IDs, prices, URLs, images, availability, and conditions passed local checks."
                : "Validating required Meta fields."
            }
            meta={
              diagnostics
                ? `Duplicates: ${diagnostics.duplicateIds.length} · Public HTTPS links: ${
                    validCount === 0
                      ? "n/a"
                      : diagnostics.allLinksPublicHttps
                        ? "yes"
                        : "no"
                  }`
                : undefined
            }
            icon={<ShieldCheck className="h-4 w-4" />}
          />

          <DiagnosticCard
            title="Meta catalog connection"
            stateLabel={catalogSettings?.connectionLabel || "Not configured"}
            tone={catalogConnectionTone}
            detail={
              catalogSettings?.connectionDetail ||
              "Optional Catalog API management is not configured. Option A scheduled feed does not need it."
            }
            meta={
              catalogSettings?.lastVerifiedAt
                ? `Verified ${formatDateTime(catalogSettings.lastVerifiedAt)}${
                    catalogSettings.metaProductCount !== undefined
                      ? ` · ${catalogSettings.metaProductCount} products reported by Meta`
                      : ""
                  }`
                : "API access has not been verified"
            }
            icon={<Server className="h-4 w-4" />}
          />

          <DiagnosticCard
            title="Last successful Meta fetch"
            stateLabel="Not available"
            tone="neutral"
            detail="Meta owns the import schedule. ANGKON cannot truthfully report a successful Meta fetch without an authorized Catalog API connection and Meta-side import data."
            meta={catalogSettings?.lastVerifiedAt ? "API access verified, import time still unknown" : "Requires Catalog API access + Meta diagnostics"}
            icon={<Clock3 className="h-4 w-4" />}
          />

          <DiagnosticCard
            title="Product import errors"
            stateLabel={
              invalidCount > 0 ? `${invalidCount} local error${invalidCount === 1 ? "" : "s"}` : "No local errors"
            }
            tone={invalidCount > 0 ? "warning" : "success"}
            detail="Local feed validation errors are shown below. Meta-side product import errors are only visible in Commerce Manager or with authorized Catalog API access."
            meta="Meta import errors: unavailable"
            icon={<AlertTriangle className="h-4 w-4" />}
          />
        </div>

        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
          <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-stone-400" />
              <h4 className="text-xs font-bold text-stone-900">Last updated</h4>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-stone-600">
              Feed generated: <strong>{formatDateTime(diagnostics?.generatedAt)}</strong>
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-stone-600">
              Latest product change:{" "}
              <strong>{formatDateTime(diagnostics?.latestProductUpdatedAt)}</strong>
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-stone-400" />
              <h4 className="text-xs font-bold text-stone-900">Identifier alignment</h4>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-stone-600">
              Canonical ID is the numeric product ID. Legacy{" "}
              <code className="rounded bg-stone-100 px-1 py-0.5 font-mono text-[10px]">
                wc_post_228001
              </code>{" "}
              is normalized to{" "}
              <code className="rounded bg-emerald-50 px-1 py-0.5 font-mono text-[10px] text-emerald-700">
                228001
              </code>{" "}
              in the feed, browser Pixel, and server CAPI.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-stone-400" />
              <h4 className="text-xs font-bold text-stone-900">Taxonomy coverage</h4>
            </div>
            {Object.keys(coverage?.byCategory || {}).length > 0 ? (
              <ul className="mt-2 space-y-1 text-[11px] text-stone-600">
                {Object.entries(coverage?.byCategory || {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([category, count]) => (
                    <li key={category} className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2">{category}</span>
                      <span className="shrink-0 font-mono font-semibold text-stone-800">{count}</span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="mt-2 text-[11px] text-stone-500">
                No specific taxonomy mappings yet. Product type is still emitted from the real store
                categories.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── 6. Product preview ── */}
      <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 p-4 sm:p-5">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">
              Catalog feed products preview
            </h3>
            <p className="mt-0.5 text-xs text-stone-500">
              IDs shown here are the exact identifiers sent to Meta in the feed, Pixel, and CAPI.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-stone-100 px-2.5 py-1 font-mono text-[11px] font-semibold text-stone-600">
              {items.length} loaded
            </span>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-400" />}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="p-10 text-center text-xs text-stone-500">
            {loading ? "Loading catalog items..." : "No valid products are available for the feed."}
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-stone-100 bg-stone-50/80 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">Item ID</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Availability</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Storefront</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {items.map((item) => (
                  <tr key={item.id} className="transition hover:bg-stone-50/60">
                    <td className="px-4 py-3 font-mono font-bold text-purple-700">{item.id}</td>
                    <td className="max-w-xs px-4 py-3">
                      <div className="truncate font-semibold text-stone-800">{item.title}</div>
                      <div className="truncate text-[10px] text-stone-400">
                        {item.brand || "ANGKON"}
                        {item.size ? ` · ${item.size}` : ""}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-stone-900">
                      {item.sale_price ? (
                        <span>
                          <span className="text-emerald-700">{item.sale_price}</span>
                          <span className="ml-1 text-[10px] font-normal text-stone-400 line-through">
                            {item.price}
                          </span>
                        </span>
                      ) : (
                        item.price
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                          item.availability === "in stock"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-700"
                        }`}
                      >
                        {item.availability}
                      </span>
                    </td>
                    <td className="max-w-[220px] px-4 py-3">
                      <div className="truncate text-[11px] text-stone-600">
                        {item.google_product_category || "Product-type fallback"}
                      </div>
                      {item.product_type && (
                        <div className="truncate text-[10px] text-stone-400">{item.product_type}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <span>View</span>
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

      {/* ── 7. Invalid items ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">
              Local validation errors
            </h3>
            <p className="mt-0.5 text-xs text-stone-500">
              Rows listed here are not present in the XML feed.
            </p>
          </div>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
              invalidCount > 0
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {invalidCount} invalid
          </span>
        </div>

        {!diagnostics ? (
          <p className="pt-4 text-xs text-stone-500">Running local validation...</p>
        ) : diagnostics.invalidSamples.length === 0 ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-[11px] text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>No local feed validation errors were found for the current product set.</span>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="border-b border-stone-100 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">Item ID</th>
                  <th className="py-2">Reasons</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {diagnostics.invalidSamples.map((issue, index) => (
                  <tr key={`${issue.productId || issue.slug || "invalid"}-${index}`}>
                    <td className="max-w-[260px] py-3 pr-4">
                      <div className="truncate font-semibold text-stone-800">
                        {issue.name || "(untitled product)"}
                      </div>
                      <div className="truncate font-mono text-[10px] text-stone-400">
                        {issue.slug || "no slug"}
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-mono text-[11px] text-stone-600">
                      {issue.productId || "—"}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {issue.reasons.map((reason) => (
                          <span
                            key={reason}
                            className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-mono text-[10px] text-rose-700"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {diagnostics && diagnostics.duplicateIds.length > 0 && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 font-mono text-[10px] leading-relaxed text-amber-900">
            Duplicate product IDs: {diagnostics.duplicateIds.join(", ")}
          </p>
        )}
      </div>

      {/* ── 8. Footer guidance ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0 space-y-1.5">
            <h3 className="text-xs font-bold text-stone-900">What ANGKON can and cannot confirm</h3>
            <p className="text-[11px] leading-relaxed text-stone-600">
              ANGKON generates and serves this XML feed and validates required fields. It can also
              verify optional Catalog API access when credentials are configured. Only Meta can
              confirm that a scheduled feed was fetched, that products were imported, or why Meta
              rejected an item. Check Commerce Manager for those states.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <a
                href="https://business.facebook.com/commerce"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900"
              >
                <span>Open Commerce Manager</span>
                <ArrowRight className="h-3 w-3" />
              </a>
              <Link
                href="/admin/meta/conversions-api"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900"
              >
                <span>Conversions API settings</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
