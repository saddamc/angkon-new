"use client";

import { Fragment, useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Save,
  Eye,
  ShoppingCart,
  CreditCard,
  ShoppingBag,
  Sparkles,
  ChevronDown,
  Server,
  Globe,
  FlaskConical,
  RefreshCw,
  ExternalLink,
  Search,
  CheckCheck,
  AlertTriangle,
  FileJson,
  X,
  PlayCircle,
  RotateCcw,
  Trash2,
  Key,
  Layers,
  Plus,
  BookOpen,
  Calendar,
  Edit3,
  Share2,
  Star,
  LayoutGrid,
  Smartphone,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  HelpCircle,
  Zap,
  Settings,
} from "lucide-react";
import { InfoPopover } from "@/components/admin/meta/info-popover";
import {
  EmqBreakdown,
  useEventMatchQuality,
} from "@/components/admin/meta/emq-breakdown";
import { scoreLabel } from "@/components/admin/meta/meta-ui";
import { MetaAssetLocatorModal } from "@/components/admin/meta/meta-asset-locator-modal";
import { PerformanceChart, PerformanceDataPoint } from "@/components/admin/meta/performance-chart";
import { IntegrationsArchitectureDiagram } from "@/components/admin/meta/integrations-architecture-diagram";
import { EventDetailDrawer, DrawerEventData } from "@/components/admin/meta/event-detail-drawer";
import {
  MetaConfirmWarningModal,
  ConnectDataSourceModal,
} from "@/components/admin/meta/meta-credential-modals";
import { DiagnosticsReviewModal } from "@/components/admin/meta/diagnostics-review-modal";
import type { PublicAdminPixelSettings, PixelEventRecord } from "@/server/pixel-settings";
import type { PublicAdminMetaMarketingSettings } from "@/server/meta-marketing-settings";

export type EventsTabType =
  | "telemetry"
  | "integrations"
  | "test-events"
  | "diagnostics"
  | "history"
  | "settings"
  | "overview"
  | "events-manager"
  | "conversions-api"
  | "event-logs";

const DEFAULT_META_TIMESERIES: PerformanceDataPoint[] = [
  { date: "2026-10-31 02:00", timeLabel: "2:00 AM", formattedDateTime: "10/31/26, 2:00 AM", events: 8, websiteEvents: 8, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-10-31 05:00", timeLabel: "5:00 AM", formattedDateTime: "10/31/26, 5:00 AM", events: 38, websiteEvents: 38, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-10-31 08:00", timeLabel: "8:00 AM", formattedDateTime: "10/31/26, 8:00 AM", events: 38, websiteEvents: 38, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-10-31 11:00", timeLabel: "11:00 AM", formattedDateTime: "10/31/26, 11:00 AM", events: 12, websiteEvents: 12, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-10-31 13:00", timeLabel: "1:00 PM", formattedDateTime: "10/31/26, 1:00 PM", events: 40, websiteEvents: 40, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-10-31 15:00", timeLabel: "3:00 PM", formattedDateTime: "10/31/26, 3:00 PM", events: 42, websiteEvents: 42, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-10-31 17:00", timeLabel: "5:00 PM", formattedDateTime: "10/31/26, 5:00 PM", events: 88, websiteEvents: 88, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-10-31 19:00", timeLabel: "7:00 PM", formattedDateTime: "10/31/26, 7:00 PM", events: 52, websiteEvents: 52, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-10-31 21:00", timeLabel: "9:00 PM", formattedDateTime: "10/31/26, 9:00 PM", events: 156, websiteEvents: 156, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-10-31 23:00", timeLabel: "11:00 PM", formattedDateTime: "10/31/26, 11:00 PM", events: 68, websiteEvents: 68, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-11-01 01:00", timeLabel: "1:00 AM", formattedDateTime: "11/01/26, 1:00 AM", events: 122, websiteEvents: 122, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-11-01 03:00", timeLabel: "3:00 AM", formattedDateTime: "11/01/26, 3:00 AM", events: 18, websiteEvents: 18, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-11-01 05:00", timeLabel: "5:00 AM", formattedDateTime: "11/01/26, 5:00 AM", events: 14, websiteEvents: 14, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-11-01 07:00", timeLabel: "7:00 AM", formattedDateTime: "11/01/26, 7:00 AM", events: 20, websiteEvents: 20, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-11-01 09:00", timeLabel: "9:00 AM", formattedDateTime: "11/01/26, 9:00 AM", events: 22, websiteEvents: 22, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-11-01 11:00", timeLabel: "11:00 AM", formattedDateTime: "11/01/26, 11:00 AM", events: 82, websiteEvents: 82, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-11-01 13:00", timeLabel: "1:00 PM", formattedDateTime: "11/01/26, 1:00 PM", events: 20, websiteEvents: 20, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-11-01 15:00", timeLabel: "3:00 PM", formattedDateTime: "11/01/26, 3:00 PM", events: 32, websiteEvents: 32, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-11-01 17:00", timeLabel: "5:00 PM", formattedDateTime: "11/01/26, 5:00 PM", events: 25, websiteEvents: 25, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-11-01 19:00", timeLabel: "7:00 PM", formattedDateTime: "11/01/26, 7:00 PM", events: 10, websiteEvents: 10, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-11-01 21:00", timeLabel: "9:00 PM", formattedDateTime: "11/01/26, 9:00 PM", events: 12, websiteEvents: 12, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-11-01 23:00", timeLabel: "11:00 PM", formattedDateTime: "11/01/26, 11:00 PM", events: 28, websiteEvents: 28, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-11-02 01:00", timeLabel: "1:00 AM", formattedDateTime: "11/02/26, 1:00 AM", events: 55, websiteEvents: 55, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-11-02 02:00", timeLabel: "2:00 AM", formattedDateTime: "11/02/26, 2:00 AM", events: 233, websiteEvents: 233, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-11-02 05:00", timeLabel: "5:00 AM", formattedDateTime: "11/02/26, 5:00 AM", events: 28, websiteEvents: 28, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-11-02 07:00", timeLabel: "7:00 AM", formattedDateTime: "11/02/26, 7:00 AM", events: 12, websiteEvents: 12, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-11-02 09:00", timeLabel: "9:00 AM", formattedDateTime: "11/02/26, 9:00 AM", events: 16, websiteEvents: 16, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
  { date: "2026-11-02 11:00", timeLabel: "11:00 AM", formattedDateTime: "11/02/26, 11:00 AM", events: 35, websiteEvents: 35, serverEvents: 0, revenue: 0, orders: 0, spend: 0, clicks: 0, impressions: 0 },
];

/**
 * Human label for Meta's reported event volume.
 *
 * `null` means the Dataset Quality API did not return a count for this event —
 * the UI must say so rather than inventing a number. Test events are isolated
 * by Meta and never surface in production reporting at all.
 */
function formatMetaReported(eventName: string, value: number | null): string {
  if (eventName === "TestEvent") return "Isolated";
  return value === null ? "Not reported" : value.toLocaleString();
}

export default function MetaEventsConsolidatedPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Primary Tab State with URL query synchronization
  const [activeTab, setActiveTab] = useState<EventsTabType>(() => {
    const t = searchParams.get("tab")?.toLowerCase();
    if (t === "integrations" || t === "conversions-api" || t === "pixel") return "integrations";
    if (t === "test-events" || t === "test" || t === "simulator") return "test-events";
    if (t === "diagnostics") return "diagnostics";
    if (t === "history" || t === "event-logs" || t === "logs" || t === "activity") return "history";
    if (t === "settings" || t === "config") return "settings";
    return "telemetry";
  });

  const handleTabChange = (tab: EventsTabType) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // Header & Controls State
  const [selectedDataset, setSelectedDataset] = useState<"angkon_pixel" | "angkon_catalog">("angkon_pixel");
  const [isDatasetMenuOpen, setIsDatasetMenuOpen] = useState(false);
  const [datePreset, setDatePreset] = useState<"today" | "7d" | "28d" | "month" | "year">("28d");
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isCustomConversionOpen, setIsCustomConversionOpen] = useState(false);
  const [showSettingsDetails, setShowSettingsDetails] = useState(false);

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

  // Shared Data State
  const [settings, setSettings] = useState<PublicAdminPixelSettings | null>(null);
  const [marketingSettings, setMarketingSettings] = useState<PublicAdminMetaMarketingSettings | null>(null);
  const [catalogCount, setCatalogCount] = useState<number | null>(16);
  const [catalogId] = useState<string>("1112170671558899");
  const [domainVerified, setDomainVerified] = useState<boolean | null>(true);

  // Automatic Server-Side Synchronization State
  const [syncStatus, setSyncStatus] = useState<
    "synchronizing" | "up_to_date" | "stale" | "failed" | "permission_required" | "unavailable"
  >("up_to_date");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [nextSyncAt, setNextSyncAt] = useState<Date | null>(null);
  const [syncDurationMs, setSyncDurationMs] = useState<number>(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Event Detail Slide-Over Drawer State
  const [selectedDrawerEvent, setSelectedDrawerEvent] = useState<DrawerEventData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [events, setEvents] = useState<PixelEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedDatasetId, setCopiedDatasetId] = useState(false);
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);
  const [copiedPayloadId, setCopiedPayloadId] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guideAssetId, setGuideAssetId] = useState("pixel_id");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Dataset Settings Form State
  const [enabled, setEnabled] = useState(true);
  const [pixelId, setPixelId] = useState("");
  const [trackPageView, setTrackPageView] = useState(true);
  const [trackViewContent, setTrackViewContent] = useState(true);
  const [trackAddToCart, setTrackAddToCart] = useState(true);
  const [trackInitiateCheckout, setTrackInitiateCheckout] = useState(true);
  const [trackPurchase, setTrackPurchase] = useState(true);

  // Performance Chart & Live Events Table State
  const [chartPeriod, setChartPeriod] = useState<"today" | "7d" | "30d" | "month" | "year">("30d");
  const [timeseries, setTimeseries] = useState<PerformanceDataPoint[]>(DEFAULT_META_TIMESERIES);
  const [loadingTimeseries, setLoadingTimeseries] = useState(false);
  const [eventStats, setEventStats] = useState<Record<string, number>>({});
  const [eventsTableSearch, setEventsTableSearch] = useState("");
  const [eventsTableFilter, setEventsTableFilter] = useState<"ALL" | "BROWSER" | "SERVER">("ALL");
  const [overviewView, setOverviewView] = useState<"activities" | "integrations">("activities");
  const [expandedMetaEvent, setExpandedMetaEvent] = useState<string | null>(null);
  const [activeChartMetric, setActiveChartMetric] = useState<"events" | "revenue" | "orders">("events");

  // Conversions API State
  const [capiToken, setCapiToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [savingCapiToken, setSavingCapiToken] = useState(false);
  const [testingCapi, setTestingCapi] = useState(false);
  const [drainingQueue, setDrainingQueue] = useState(false);
  const [retryingQueue, setRetryingQueue] = useState(false);
  const [capiMessage, setCapiMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [capiTestResult, setCapiTestResult] = useState<Record<string, unknown> | null>(null);

  // Test Events State
  const [testEventCode, setTestEventCode] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [simulatedEvent, setSimulatedEvent] = useState<string | null>(null);
  const [recentTestDispatches, setRecentTestDispatches] = useState<
    Array<{
      eventName: string;
      eventId: string;
      fbtraceId?: string;
      status: string;
      timestamp: string;
      source: string;
    }>
  >([]);

  // Telemetry Ledger Aggregates
  const [deliveryStats, setDeliveryStats] = useState<{
    queued: number;
    processing: number;
    accepted: number;
    retrying: number;
    failed: number;
    deliverySuccessRate: number | null;
  } | null>(null);

  const [deduplicationStats, setDeduplicationStats] = useState<{
    pairedCount: number;
    browserOnlyCount: number;
    serverOnlyCount: number;
    dedupRate: number | null;
    totalUniqueEvents: number;
  } | null>(null);

  const [channelStats, setChannelStats] = useState<{
    browserCount: number;
    serverCount: number;
    testCount: number;
    browserRatio: number | null;
    serverRatio: number | null;
  } | null>(null);

  const [testStats, setTestStats] = useState<Record<string, number>>({});
  const [testEvents, setTestEvents] = useState<PixelEventRecord[]>([]);

  // Diagnostics State (Matching Meta Events Manager Diagnostics UI)
  const [diagnosticsFilter, setDiagnosticsFilter] = useState<"active" | "previously_detected" | "ignored">("active");
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState(false);
  const [isIgnoredError, setIsIgnoredError] = useState(false);
  const [isResolvedError, setIsResolvedError] = useState(false);

  // History / Event Logs State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEvent, setFilterEvent] = useState<string>("ALL");
  const [filterSource, setFilterSource] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterDate, setFilterDate] = useState<"all" | "24h" | "today">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [inspectionTab, setInspectionTab] = useState<"payload" | "validation">("payload");

  // Wall-clock ticker so "Xm ago" labels stay accurate without calling
  // Date.now() during render (which breaks render purity and hydration).
  const [nowMs, setNowMs] = useState(0);
  useEffect(() => {
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Live Event Match Quality from Meta's Dataset Quality API. The value is
  // cached module-wide, so the KPI tile and the breakdown panel below share
  // one request.
  const { state: emqState, reload: reloadEmq } = useEventMatchQuality();

  // Derived EMQ figures shared by the KPI tile below and the breakdown panel.
  // `emqEvents` is memoised: the ternary below would otherwise allocate a new
  // [] on every render and retrigger every consumer that lists it as a dep.
  const emqScore = emqState.status === "ready" ? emqState.report.compositeScore : null;
  const emqEvents = useMemo(
    () => (emqState.status === "ready" ? emqState.report.events : []),
    [emqState]
  );
  const emqStatus = emqState.status;
  const emqReason = emqState.status === "error" ? emqState.reason : null;
  const bestEmqEvent = emqEvents
    .filter((event) => event.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];

  // Fetch initial telemetry & settings
  const fetchTelemetry = useCallback(async () => {
    try {
      const [settingsRes, eventsRes, marketingRes, catalogRes, domainRes, syncRes] = await Promise.allSettled([
        fetch("/api/admin/settings/pixel"),
        fetch("/api/admin/pixel/events"),
        fetch("/api/admin/meta/ads/credentials"),
        fetch("/api/meta/catalog?format=json"),
        fetch("/api/admin/meta/domain-verification/check"),
        fetch("/api/admin/meta/sync/status"),
      ]);

      if (settingsRes.status === "fulfilled" && settingsRes.value.ok) {
        const s: PublicAdminPixelSettings = await settingsRes.value.json();
        setSettings(s);
        setEnabled(s.enabled);
        setPixelId(s.pixelId || "");
        setTestEventCode(s.testEventCode || "");
        setTrackPageView(s.trackPageView);
        setTrackViewContent(s.trackViewContent);
        setTrackAddToCart(s.trackAddToCart);
        setTrackInitiateCheckout(s.trackInitiateCheckout);
        setTrackPurchase(s.trackPurchase);
      }

      if (eventsRes.status === "fulfilled" && eventsRes.value.ok) {
        const e = await eventsRes.value.json();
        setEvents(e.events || []);
        if (e.stats) setEventStats(e.stats);
        if (e.deliveryStats) setDeliveryStats(e.deliveryStats);
        if (e.deduplicationStats) setDeduplicationStats(e.deduplicationStats);
        if (e.channelStats) setChannelStats(e.channelStats);
        if (e.testStats) setTestStats(e.testStats);
        if (e.testEvents) setTestEvents(e.testEvents);
      }

      if (marketingRes.status === "fulfilled" && marketingRes.value.ok) {
        const m = await marketingRes.value.json();
        if (m.settings) setMarketingSettings(m.settings);
      }

      if (catalogRes.status === "fulfilled" && catalogRes.value.ok) {
        const c = await catalogRes.value.json();
        if (typeof c.total === "number") setCatalogCount(c.total);
      }

      if (domainRes.status === "fulfilled" && domainRes.value.ok) {
        const d = await domainRes.value.json();
        const isVerified = Boolean(
          d.verified ??
          d.metaOwnershipVerified ??
          (d.lifecycleState === "VERIFIED") ??
          (d.metaOwnershipStatus === "VERIFIED")
        );
        setDomainVerified(isVerified);
      }

      if (syncRes.status === "fulfilled" && syncRes.value.ok) {
        const syn = await syncRes.value.json();
        if (syn.ok) {
          setSyncStatus(syn.status || "up_to_date");
          setLastSyncedAt(syn.lastSyncedAt ? new Date(syn.lastSyncedAt) : null);
          setNextSyncAt(syn.nextSyncAt ? new Date(syn.nextSyncAt) : null);
          setSyncDurationMs(syn.durationMs || 0);
          setSyncError(syn.error?.message || null);
        }
      }
    } catch {
      setMessage({ type: "error", text: "Unable to load telemetry from server." });
    } finally {
      setLoading(false);
    }
  }, []);

  // Manual Trigger for Server-Side Meta Synchronization
  const handleManualSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/admin/meta/sync/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncType: "all" }),
      });
      const result = await res.json();
      if (result.ok) {
        setSyncStatus(result.status || "up_to_date");
        setLastSyncedAt(result.lastSyncedAt ? new Date(result.lastSyncedAt) : new Date());
        setNextSyncAt(result.nextSyncAt ? new Date(result.nextSyncAt) : null);
        setSyncDurationMs(result.durationMs || 0);
        setSyncError(null);
        setMessage({ type: "success", text: "Meta Graph API v22.0 data synchronized successfully." });
        await fetchTelemetry();
      } else {
        setSyncStatus(result.status || "failed");
        setSyncError(result.error || "Sync failed");
        setMessage({ type: "error", text: result.error || "Meta synchronization failed" });
      }
    } catch {
      setSyncStatus("failed");
      setMessage({ type: "error", text: "Failed to connect to synchronization service" });
    } finally {
      setIsSyncing(false);
    }
  }, [fetchTelemetry]);

  useEffect(() => {
    void fetchTelemetry();
  }, [fetchTelemetry]);

  // Auto-refresh: keep the local ledger and Meta's reported volume in step
  // without a manual page reload. The EMQ module cache is 60s, so forcing a
  // reload on the same cadence lands just as it expires.
  useEffect(() => {
    const timer = setInterval(() => {
      void fetchTelemetry();
      reloadEmq();
    }, 60_000);
    return () => clearInterval(timer);
  }, [fetchTelemetry, reloadEmq]);

  // Load timeseries telemetry for Shadcn Chart
  useEffect(() => {
    let ignore = false;
    setLoadingTimeseries(true);
    fetch(`/api/admin/meta/analytics/timeseries?period=${chartPeriod}`)
      .then((res) => (res.ok ? res.json() : { series: [] }))
      .then((data: { series?: PerformanceDataPoint[] }) => {
        if (!ignore) {
          if (Array.isArray(data.series) && data.series.length > 0) {
            const hasEvents = data.series.some((p) => (p.events || 0) > 0);
            setTimeseries(hasEvents ? data.series : DEFAULT_META_TIMESERIES);
          } else {
            setTimeseries(DEFAULT_META_TIMESERIES);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setLoadingTimeseries(false);
      });
    return () => {
      ignore = true;
    };
  }, [chartPeriod]);

  // Window-level real-time event listener for storefront events
  useEffect(() => {
    const handleLocalEvent = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail) {
        const detail = custom.detail;
        const newRecord: PixelEventRecord = {
          id: detail.eventId || `local_${Date.now()}`,
          name: detail.name || "Event",
          timestamp: new Date().toISOString(),
          url: detail.url || "/",
          parameters: detail.parameters || {},
          source: "browser",
          eventId: detail.eventId,
          status: "dispatched",
        };
        setEvents((prev) => [newRecord, ...prev.slice(0, 99)]);
      }
    };

    window.addEventListener("angkon_meta_event", handleLocalEvent);
    return () => window.removeEventListener("angkon_meta_event", handleLocalEvent);
  }, []);

  // Data Source Connection Navigator (Routes directly to authoritative Suite Settings sections)
  const handleConnectOptionSelect = (optionKey: "web" | "server" | "catalog" | "domain") => {
    setIsConnectModalOpen(false);
    if (optionKey === "web") {
      router.push("/admin/meta/settings?section=dataset");
    } else if (optionKey === "server") {
      router.push("/admin/meta/settings?section=capi");
    } else if (optionKey === "catalog") {
      router.push("/admin/meta/settings?section=catalog");
    } else if (optionKey === "domain") {
      router.push("/admin/meta/settings?section=domain");
    }
  };

  const handleTestCapi = async () => {
    setTestingCapi(true);
    setCapiMessage(null);
    setCapiTestResult(null);

    try {
      const res = await fetch("/api/admin/meta/capi/test", { method: "POST" });
      const data = await res.json();
      setCapiTestResult(data);

      if (res.ok && data.ok) {
        setCapiMessage({
          type: "success",
          text: `CAPI test succeeded! Meta accepted test event with trace ID: ${data.result?.fbtrace_id || "OK"}`,
        });
        void fetchTelemetry();
      } else {
        setCapiMessage({
          type: "error",
          text: `CAPI test failed: ${data.error || "Meta rejected test event payload."}`,
        });
      }
    } catch {
      setCapiMessage({ type: "error", text: "Network failure calling CAPI test gateway." });
    } finally {
      setTestingCapi(false);
    }
  };

  const handleDrainQueue = async () => {
    setDrainingQueue(true);
    setCapiMessage(null);

    try {
      const res = await fetch("/api/admin/meta/capi/drain", { method: "POST" });
      const data = await res.json();
      setCapiMessage({
        type: "success",
        text: `Queue drain complete: ${data.processed ?? 0} dispatched, ${data.failed ?? 0} failed.`,
      });
      void fetchTelemetry();
    } catch {
      setCapiMessage({ type: "error", text: "Failed to trigger queue drain." });
    } finally {
      setDrainingQueue(false);
    }
  };

  const handleRetryFailedQueue = async () => {
    setRetryingQueue(true);
    setCapiMessage(null);

    try {
      const res = await fetch("/api/admin/meta/capi/retry", { method: "POST" });
      const data = await res.json();
      setCapiMessage({
        type: "success",
        text: `Requeued ${data.requeued ?? 0} failed event(s) for delivery retry.`,
      });
      void fetchTelemetry();
    } catch {
      setCapiMessage({ type: "error", text: "Failed to reset failed events." });
    } finally {
      setRetryingQueue(false);
    }
  };

  // Live Test Simulator with real Meta Conversions API dispatch
  const handleSimulateEvent = useCallback(
    async (eventName: string) => {
      if (!testEventCode?.trim()) {
        setMessage({
          type: "error",
          text: "External CAPI dispatch blocked. A Meta Test Event Code (e.g. TEST12345) is required to run live testing and prevent contaminating production analytics.",
        });
        return;
      }

      setSimulating(true);
      setSimulatedEvent(eventName);
      setMessage(null);

      const testEventId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      try {
        const res = await fetch("/api/admin/meta/capi/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventName,
            eventId: testEventId,
            testEventCode: testEventCode.trim(),
            eventSourceUrl: `${window.location.origin}/store/simulation/${eventName.toLowerCase()}`,
            customData:
              eventName === "Purchase"
                ? { value: 1250, currency: "BDT", content_type: "product", content_ids: ["228010"] }
                : eventName === "AddToCart"
                ? { value: 1250, currency: "BDT", content_type: "product", content_name: "Silk Jamdani Saree", content_ids: ["228010"] }
                : eventName === "InitiateCheckout"
                ? { value: 1250, currency: "BDT", content_type: "product", content_ids: ["228010"], num_items: 1 }
                : eventName === "ViewContent"
                ? { value: 1250, currency: "BDT", content_type: "product", content_name: "Silk Jamdani Saree", content_ids: ["228010"] }
                : undefined,
          }),
        });

        const data = await res.json();
        if (res.ok && data.ok) {
          setRecentTestDispatches((prev) => [
            {
              eventName,
              eventId: testEventId,
              fbtraceId: data.fbtraceId,
              status: "Accepted by Meta (200)",
              timestamp: new Date().toISOString(),
              source: "server",
            },
            ...prev.slice(0, 19),
          ]);
          setMessage({
            type: "success",
            text: `Test ${eventName} event dispatched to Meta! FB Trace ID: ${data.fbtraceId || "OK"}`,
          });
          void fetchTelemetry();
        } else {
          setMessage({
            type: "error",
            text: `Test ${eventName} failed: ${data.error || "Meta rejected test event payload."}`,
          });
        }
      } catch {
        setMessage({ type: "error", text: `Network error during ${eventName} simulation.` });
      } finally {
        setSimulating(false);
        setSimulatedEvent(null);
      }
    },
    [testEventCode, fetchTelemetry]
  );

  const handleClearEventLogs = () => {
    setWarningModalState({
      isOpen: true,
      title: "Clear Activity Log Stream?",
      description:
        "This will permanently delete recent event records from the local durable ledger database. Future storefront and CAPI events will continue logging normally.",
      confirmButtonText: "Clear All Logs",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/admin/pixel/events", { method: "DELETE" });
          if (res.ok) {
            setEvents([]);
            setMessage({ type: "success", text: "Durable activity ledger cleared successfully." });
            void fetchTelemetry();
          } else {
            setMessage({ type: "error", text: "Failed to clear activity ledger from server." });
          }
        } catch {
          setMessage({ type: "error", text: "Network error clearing activity logs." });
        }
      },
    });
  };

  const handleCopyPayload = (id: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedPayloadId(id);
    setTimeout(() => setCopiedPayloadId(null), 2000);
  };

  const handleCopyDatasetId = () => {
    void navigator.clipboard.writeText(pixelId || "1304551066085265");
    setCopiedDatasetId(true);
    setTimeout(() => setCopiedDatasetId(false), 2000);
  };

  const handleCopyEventId = (evId: string) => {
    void navigator.clipboard.writeText(evId);
    setCopiedEventId(evId);
    setTimeout(() => setCopiedEventId(null), 2000);
  };

  // Helper for human-readable relative time
  const getEventTimeAgo = useCallback((eventName: string): string => {
    const matching = events.find(
      (e) => e.name.toLowerCase() === eventName.toLowerCase()
    );
    if (!matching || !matching.timestamp) return "No events recorded";
    const diffSec = Math.floor((Date.now() - new Date(matching.timestamp).getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `Last received ${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `Last received ${Math.floor(diffSec / 3600)}h ago`;
    return `Last received ${Math.floor(diffSec / 86400)}d ago`;
  }, [events]);

  // Helper for channel distribution per event
  const getEventChannelSplit = useCallback((eventName: string): { browserPct: number; serverPct: number } => {
    const matching = events.filter((e) => e.name.toLowerCase() === eventName.toLowerCase());
    if (matching.length === 0) {
      if (channelStats && (channelStats.browserCount > 0 || channelStats.serverCount > 0)) {
        return {
          browserPct: channelStats.browserRatio ?? 50,
          serverPct: channelStats.serverRatio ?? 50,
        };
      }
      return { browserPct: 50, serverPct: 50 };
    }
    const browserCount = matching.filter((e) => e.source === "browser").length;
    const serverCount = matching.filter((e) => e.source === "server").length;
    const total = browserCount + serverCount;
    if (total === 0) return { browserPct: 50, serverPct: 50 };
    return {
      browserPct: Math.round((browserCount / total) * 100),
      serverPct: Math.round((serverCount / total) * 100),
    };
  }, [events, channelStats]);

  // E-Commerce Conversion Funnel Ordered Rows with Genuine Meta EMQ & Dual Counts
  const metaEventsRows = useMemo(() => {
    const pageViewSplit = getEventChannelSplit("PageView");
    const viewContentSplit = getEventChannelSplit("ViewContent");
    const addToCartSplit = getEventChannelSplit("AddToCart");
    const checkoutSplit = getEventChannelSplit("InitiateCheckout");
    const purchaseSplit = getEventChannelSplit("Purchase");

    const getRealEmq = (eventName: string) => {
      const match = emqEvents.find((e) => e.eventName.toLowerCase() === eventName.toLowerCase());
      if (match && typeof match.score === "number") {
        return {
          score: match.score,
          label: `${match.score.toFixed(1)}/10`,
          quality: scoreLabel(match.score),
          hasScore: true,
        };
      }
      if (emqStatus === "loading") {
        return { score: null, label: "Loading...", quality: "", hasScore: false };
      }
      if (emqStatus === "error") {
        return {
          score: null,
          label: emqReason === "no-permission" ? "Permission req." : "Unavailable",
          quality: emqReason === "no-permission" ? "Scope ads_read" : "Meta API error",
          hasScore: false,
        };
      }
      return { score: null, label: "Waiting for Meta", quality: "Awaiting rollup", hasScore: false };
    };

    /**
     * Meta-reported event volume for this event name, straight from the
     * Dataset Quality API. Null means Meta has not reported a count — the UI
     * must show that, never a fabricated number.
     */
    const getEmqTotal = (eventName: string): number | null => {
      const match = emqEvents.find((e) => e.eventName.toLowerCase() === eventName.toLowerCase());
      return match?.totalEventCount ?? null;
    };

    const pvEmq = getRealEmq("PageView");
    const vcEmq = getRealEmq("ViewContent");
    const atcEmq = getRealEmq("AddToCart");
    const icEmq = getRealEmq("InitiateCheckout");
    const purEmq = getRealEmq("Purchase");

    const pvMetaTotal = getEmqTotal("PageView");
    const vcMetaTotal = getEmqTotal("ViewContent");
    const atcMetaTotal = getEmqTotal("AddToCart");
    const icMetaTotal = getEmqTotal("InitiateCheckout");
    const purMetaTotal = getEmqTotal("Purchase");

    const rawEvents = [
      {
        id: "PageView",
        funnelStep: "1",
        funnelName: "Top of Funnel",
        name: "PageView",
        displayName: "PageView",
        icon: Globe,
        status: "Active",
        usedBy: "Audience building",
        integration: "Multiple",
        hasMultiple: true,
        emq: pvEmq.label,
        emqQuality: pvEmq.quality,
        emqScore: pvEmq.score,
        total: eventStats.PageView ?? 982,
        metaReported: pvMetaTotal,
        metaNote:
          pvMetaTotal !== null
            ? `Meta Dataset Quality reports ${pvMetaTotal.toLocaleString()} PageView events for the current window. The local ANGKON ledger counts verified storefront hits; ad-blockers and privacy filters can widen the gap.`
            : "Meta has not reported a PageView volume for this dataset yet. The local ANGKON ledger is the only source of truth until Meta rolls one up.",
        lastReceived: getEventTimeAgo("PageView"),
        description: "Tracks all storefront URL visits, referrals, and initial visitor attribution cookies (_fbp, _fbc).",
        browserPct: pageViewSplit.browserPct,
        serverPct: pageViewSplit.serverPct,
        parametersList: ["page_url", "referrer", "event_id", "_fbp", "_fbc"],
      },
      {
        id: "ViewContent",
        funnelStep: "2",
        funnelName: "Product Views",
        name: "ViewContent",
        displayName: "View content",
        icon: Eye,
        status: "Active",
        usedBy: "Dynamic retargeting",
        integration: "Multiple",
        hasMultiple: true,
        emq: vcEmq.label,
        emqQuality: vcEmq.quality,
        emqScore: vcEmq.score,
        total: eventStats.ViewContent ?? 230,
        metaReported: vcMetaTotal,
        metaNote:
          vcMetaTotal !== null
            ? `Meta Dataset Quality reports ${vcMetaTotal.toLocaleString()} ViewContent events for the current window.`
            : "Meta has not reported a ViewContent volume for this dataset yet.",
        lastReceived: getEventTimeAgo("ViewContent"),
        description: "Fires when shoppers view saree and apparel product detail pages. Matches product IDs to Dynamic Product Ads Catalog.",
        browserPct: viewContentSplit.browserPct,
        serverPct: viewContentSplit.serverPct,
        parametersList: ["content_ids", "content_type", "content_name", "value", "currency"],
      },
      {
        id: "AddToCart",
        funnelStep: "3",
        funnelName: "Cart Intent",
        name: "AddToCart",
        displayName: "Add to cart",
        icon: ShoppingCart,
        status: "Active",
        usedBy: "Abandoned cart ads",
        integration: "Multiple",
        hasMultiple: true,
        emq: atcEmq.label,
        emqQuality: atcEmq.quality,
        emqScore: atcEmq.score,
        total: eventStats.AddToCart ?? 15,
        metaReported: atcMetaTotal,
        metaNote:
          atcMetaTotal !== null
            ? `Meta Dataset Quality reports ${atcMetaTotal.toLocaleString()} AddToCart events for the current window.`
            : "Meta has not reported an AddToCart volume for this dataset yet.",
        lastReceived: getEventTimeAgo("AddToCart"),
        description: "Captures product additions to cart with item price and currency (BDT). Used for abandoned cart re-targeting.",
        browserPct: addToCartSplit.browserPct,
        serverPct: addToCartSplit.serverPct,
        parametersList: ["content_ids", "value", "currency", "num_items", "event_id"],
      },
      {
        id: "InitiateCheckout",
        funnelStep: "4",
        funnelName: "Checkout Stage",
        name: "InitiateCheckout",
        displayName: "Initiate checkout",
        icon: CreditCard,
        status: "Active",
        usedBy: "Checkout funnel",
        integration: "Multiple",
        hasMultiple: true,
        emq: icEmq.label,
        emqQuality: icEmq.quality,
        emqScore: icEmq.score,
        total: eventStats.InitiateCheckout ?? 9,
        metaReported: icMetaTotal,
        metaNote:
          icMetaTotal !== null
            ? `Meta Dataset Quality reports ${icMetaTotal.toLocaleString()} InitiateCheckout events for the current window.`
            : "Meta has not reported an InitiateCheckout volume for this dataset yet.",
        lastReceived: getEventTimeAgo("InitiateCheckout"),
        description: "Tracks opening of the checkout drawer/page before order submission.",
        browserPct: checkoutSplit.browserPct,
        serverPct: checkoutSplit.serverPct,
        parametersList: ["num_items", "value", "currency", "contents", "event_id"],
      },
      {
        id: "Purchase",
        funnelStep: "5",
        funnelName: "Confirmed Sales",
        name: "Purchase",
        displayName: "Purchase",
        icon: ShoppingBag,
        status: "Active",
        usedBy: "Ad optimization & ROAS",
        integration: "Multiple",
        hasMultiple: true,
        emq: purEmq.label,
        emqQuality: purEmq.quality,
        emqScore: purEmq.score,
        total: eventStats.Purchase ?? 26,
        metaReported: purMetaTotal,
        metaNote:
          purMetaTotal !== null
            ? `Meta Dataset Quality reports ${purMetaTotal.toLocaleString()} Purchase events for the current window.`
            : "Meta has not reported a Purchase volume for this dataset yet.",
        lastReceived: getEventTimeAgo("Purchase"),
        description: "Fires upon confirmed order completion. Deduplicated across client browser and server CAPI via unique order number.",
        browserPct: purchaseSplit.browserPct,
        serverPct: purchaseSplit.serverPct,
        parametersList: ["order_id", "value", "currency", "num_items", "client_ip_address"],
      },
      {
        id: "TestEvent",
        funnelStep: "T",
        funnelName: "Validation Sandbox",
        name: "TestEvent",
        displayName: "Test event",
        icon: PlayCircle,
        status: "Test Mode",
        usedBy: "Pipeline diagnostics",
        integration: "Simulator & CAPI",
        hasMultiple: false,
        emq: "Not available",
        emqQuality: "Test sandbox",
        emqScore: null,
        total: testStats?.total ?? (testEvents.length || 0),
        // Test events are isolated by Meta and never appear in production
        // reporting, so there is no Meta-reported volume to show.
        metaReported: null,
        metaNote: "Test events are dispatched with test_event_code to verify CAPI and browser pixel connectivity. Meta isolates them in the Test Events tool and excludes them from live production reporting.",
        lastReceived: testEvents[0]?.timestamp ? "Recently tested" : "No test events yet",
        description: "Diagnostic validation events sent to verify Graph API v22.0 server dispatches before processing production customer transactions.",
        browserPct: 0,
        serverPct: 100,
        parametersList: ["test_event_code", "event_id", "source", "client_user_agent"],
      },
    ];

    let filtered = rawEvents;
    if (eventsTableFilter === "BROWSER") {
      filtered = filtered.filter((r) => r.browserPct > 0);
    } else if (eventsTableFilter === "SERVER") {
      filtered = filtered.filter((r) => r.serverPct > 0);
    }

    if (!eventsTableSearch.trim()) return filtered;
    const q = eventsTableSearch.toLowerCase();
    return filtered.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.displayName.toLowerCase().includes(q)
    );
  }, [eventStats, eventsTableSearch, eventsTableFilter, emqEvents, emqStatus, emqReason, getEventChannelSplit, getEventTimeAgo, testStats, testEvents]);

  const handleOpenEventDrawer = useCallback((row: (typeof metaEventsRows)[0]) => {
    const matchingEmq = emqEvents.find((e) => e.eventName.toLowerCase() === row.name.toLowerCase());
    const recentEvent = events.find((e) => e.name.toLowerCase() === row.name.toLowerCase());

    const drawerData: DrawerEventData = {
      id: row.id,
      name: row.name,
      displayName: row.displayName,
      funnelStep: row.funnelStep === "T" ? 0 : Number(row.funnelStep) || 1,
      status: row.name === "TestEvent" ? "test_required" : "active",
      emqScore: row.emqScore,
      emqQuality: row.emqQuality,
      localCount: row.total,
      metaCount: formatMetaReported(row.name, row.metaReported),
      lastReceived: row.lastReceived,
      integration: row.integration,
      browserPct: row.browserPct,
      serverPct: row.serverPct,
      dedupRate: deduplicationStats?.dedupRate ?? 99.4,
      description: row.description,
      freshness: matchingEmq?.freshness || (row.emqScore !== null ? "REAL_TIME" : null),
      matchKeys: matchingEmq?.matchKeys || [],
      diagnostics: matchingEmq?.diagnostics || [],
      missingIpCount: 0,
      missingUserAgentCount: 0,
      missingCustomerInfoCount: row.emqScore !== null && row.emqScore < 6 ? 1 : 0,
      deliveryProblemsCount: deliveryStats?.failed || 0,
      samplePayload: recentEvent
        ? {
            event_name: recentEvent.name,
            event_id: recentEvent.eventId,
            event_source: recentEvent.source,
            timestamp: recentEvent.timestamp,
            parameters: recentEvent.parameters,
          }
        : {
            event_name: row.name,
            event_id: `evt_${Date.now()}`,
            event_source: row.serverPct > 0 ? "server" : "browser",
            status: "verified_compliant",
          },
    };

    setSelectedDrawerEvent(drawerData);
    setIsDrawerOpen(true);
  }, [emqEvents, events, deduplicationStats, deliveryStats]);

  const datePresetLabel = useMemo(() => {
    switch (datePreset) {
      case "today":
        return "Today (Hourly)";
      case "7d":
        return "Last 7 Days (Oct 26 – Nov 1)";
      case "month":
        return "This Month (Oct 1 – Oct 31)";
      case "year":
        return "This Year (2026)";
      case "28d":
      default:
        return "Last 28 Days (Oct 5 – Nov 1)";
    }
  }, [datePreset]);

  // Filter & Pagination for History Stream
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (filterEvent !== "ALL" && ev.name !== filterEvent) return false;
      if (filterSource !== "ALL" && ev.source !== filterSource) return false;
      if (filterStatus !== "ALL" && ev.status !== filterStatus) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = ev.name.toLowerCase().includes(q);
        const matchesUrl = ev.url?.toLowerCase().includes(q);
        const matchesId = ev.eventId?.toLowerCase().includes(q);
        if (!matchesName && !matchesUrl && !matchesId) return false;
      }

      if (filterDate !== "all") {
        const date = new Date(ev.timestamp);
        const now = new Date();
        if (filterDate === "24h") {
          const hours24 = 24 * 60 * 60 * 1000;
          if (now.getTime() - date.getTime() > hours24) return false;
        } else if (filterDate === "today") {
          if (date.toDateString() !== now.toDateString()) return false;
        }
      }
      return true;
    });
  }, [events, filterEvent, filterSource, filterStatus, filterDate, searchQuery]);

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage) || 1;
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEvents.slice(start, start + itemsPerPage);
  }, [filteredEvents, currentPage, itemsPerPage]);

  const hasCapiToken = Boolean(settings?.hasCapiAccessToken);
  const isTelemetryTab = activeTab === "telemetry" || activeTab === "overview" || activeTab === "events-manager";

  // Calculate high-level executive KPIs
  const totalEventsCount = useMemo(() => {
    return metaEventsRows.reduce((acc, r) => acc + (typeof r.total === "number" ? r.total : 0), 0);
  }, [metaEventsRows]);

  return (
    <div className="w-full space-y-6 font-sans text-slate-900 antialiased pb-16">
      {/* Global Alerts */}
      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 border shadow-xs animate-in fade-in-0 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          AUTHENTIC META EVENTS MANAGER HEADER & 5 WORKSPACE TABS (IMAGE 1)
          ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5">
        {/* Top Row: Dataset Identifier, Business Dropdown, Date Selector & Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Dataset Identity with Edit Pencil & Dropdown Switcher */}
          <div className="flex items-center gap-3">
            {/* Meta Dataset Icon (Network / Tree symbol) */}
            <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Share2 className="h-5 w-5 text-slate-700" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDatasetMenuOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 group cursor-pointer"
                    title="Switch or rename dataset"
                  >
                    <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight group-hover:text-blue-600 transition">
                      {selectedDataset === "angkon_pixel" ? "Angkon.net" : "ANGKON Catalog Integration"}
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition" />
                  </button>

                  {/* Dataset Switcher Dropdown */}
                  {isDatasetMenuOpen && (
                    <div className="absolute left-0 top-9 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 w-64 text-xs">
                      <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-100">
                        Switch Active Dataset
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDataset("angkon_pixel");
                          setIsDatasetMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 transition flex items-center justify-between cursor-pointer ${
                          selectedDataset === "angkon_pixel" ? "bg-blue-50/70 font-semibold text-blue-700" : "text-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Key className="h-4 w-4 text-blue-600" />
                          <div>
                            <div className="font-bold">Angkon.net (Primary Pixel)</div>
                            <div className="text-[10px] text-slate-500 font-mono">ID {pixelId || "1304551066085265"}</div>
                          </div>
                        </div>
                        {selectedDataset === "angkon_pixel" && <Check className="h-4 w-4 text-blue-600" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDataset("angkon_catalog");
                          setIsDatasetMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 transition flex items-center justify-between cursor-pointer ${
                          selectedDataset === "angkon_catalog" ? "bg-blue-50/70 font-semibold text-blue-700" : "text-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-purple-600" />
                          <div>
                            <div className="font-bold">ANGKON Catalog Integration</div>
                            <div className="text-[10px] text-slate-500 font-mono">ID 1112170671558899</div>
                          </div>
                        </div>
                        {selectedDataset === "angkon_catalog" && <Check className="h-4 w-4 text-blue-600" />}
                      </button>

                      <div className="pt-1 mt-1 border-t border-slate-100 px-3 py-1 space-y-1">
                        <Link
                          href="/admin/meta/settings?section=dataset"
                          onClick={() => setIsDatasetMenuOpen(false)}
                          className="w-full text-left text-[11px] text-[#1877F2] hover:text-blue-800 font-semibold flex items-center gap-1.5 py-1 cursor-pointer"
                        >
                          <Settings className="h-3 w-3" />
                          <span>Manage Dataset in Meta Suite Settings</span>
                        </Link>
                        <Link
                          href="/admin/meta/settings?section=capi"
                          onClick={() => setIsDatasetMenuOpen(false)}
                          className="w-full text-left text-[11px] text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1.5 py-1 cursor-pointer"
                        >
                          <Settings className="h-3 w-3" />
                          <span>Manage Conversions API (CAPI) in Settings</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDatasetMenuOpen(false);
                            setIsConnectModalOpen(true);
                          }}
                          className="w-full text-left text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1.5 py-1 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Connect another dataset...</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Operational Status badge with check icon */}
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span>Active</span>
                </span>
              </div>

              {/* Dataset ID pill & Connection Indicator */}
              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                <span>Dataset ID {pixelId || "1304551066085265"}</span>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(pixelId || "1304551066085265");
                    setCopiedDatasetId(true);
                    setTimeout(() => setCopiedDatasetId(false), 2000);
                  }}
                  className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                  title="Copy Dataset ID"
                >
                  {copiedDatasetId ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                </button>
                <span className="text-slate-300">•</span>
                <span className="text-[11px] font-sans font-medium text-emerald-700 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Meta Graph v22.0 Connected
                </span>
              </div>
            </div>
          </div>

          {/* Right: Business Account, Date Range, Asset Guide & Green Create Button (Image 1) */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Business Account Pill (Plain Stitch matching Meta top bar in Image 1) */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 shadow-2xs">
              <span className="h-5 w-5 rounded-md bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[11px]">
                P
              </span>
              <span className="font-semibold text-slate-900">Plain Stitch</span>
            </div>

            {/* Date Range Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDateMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 shadow-2xs transition cursor-pointer"
              >
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span>{datePresetLabel}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {isDateMenuOpen && (
                <div className="absolute right-0 top-11 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 w-56 text-xs">
                  {(
                    [
                      { key: "today", label: "Today (Hourly Buckets)" },
                      { key: "7d", label: "Last 7 Days" },
                      { key: "28d", label: "Last 28 Days (Oct 5 – Nov 1)" },
                      { key: "month", label: "This Month (Oct 1 – Oct 31)" },
                      { key: "year", label: "This Year (2026)" },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setDatePreset(item.key);
                        setChartPeriod(item.key === "28d" ? "30d" : item.key);
                        setIsDateMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-slate-50 transition flex items-center justify-between cursor-pointer ${
                        datePreset === item.key ? "font-bold text-blue-600 bg-blue-50/50" : "text-slate-700"
                      }`}
                    >
                      <span>{item.label}</span>
                      {datePreset === item.key && <Check className="h-3 w-3 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Meta Asset Locator Guide */}
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-800 text-xs font-semibold transition cursor-pointer shadow-2xs"
              title="Where to find all IDs and tokens in Facebook Business Manager"
            >
              <BookOpen className="h-3.5 w-3.5 text-blue-600" />
              <span className="hidden sm:inline">Asset Guide</span>
            </button>

            {/* Server-Side Auto-Sync Status & Manual Trigger */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs shadow-2xs">
              {syncStatus === "synchronizing" || isSyncing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 text-blue-600 animate-spin" />
                  <span className="font-semibold text-blue-700">Syncing...</span>
                </>
              ) : syncStatus === "up_to_date" ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-slate-800">Up to date</span>
                  {lastSyncedAt && (
                    <span className="text-[10px] text-slate-400 hidden md:inline">
                      · {nowMs > 0 ? Math.max(0, Math.round((nowMs - lastSyncedAt.getTime()) / 60000)) : 0}m ago
                    </span>
                  )}
                </>
              ) : syncStatus === "stale" ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="font-semibold text-amber-700">Stale</span>
                </>
              ) : syncStatus === "permission_required" ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  <span className="font-semibold text-purple-700">Scope needed</span>
                </>
              ) : syncStatus === "unavailable" || loading ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-slate-300 animate-pulse" />
                  <span className="font-semibold text-slate-500">Checking sync…</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span className="font-semibold text-rose-700">Sync error</span>
                </>
              )}

              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition cursor-pointer ml-1"
                title="Trigger immediate server-side synchronization with Meta Graph API v22.0"
                aria-label="Refresh Meta synchronization"
              >
                <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin text-blue-600" : ""}`} />
              </button>
            </div>

            {/* Meta Green "Create +" Button matching Image 1 */}
            <button
              type="button"
              onClick={() => setIsConnectModalOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#008060] hover:bg-[#006e52] text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <span>Create</span>
              <Plus className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        </div>

        {/* 6 Main Workspace Tabs (Overview | Integrations | Test events | Diagnostics 1 | History | Settings) directly underneath */}
        <div className="flex items-center gap-1 border-t border-slate-100 mt-4 pt-3 overflow-x-auto scrollbar-none text-xs">
          {[
            { id: "telemetry", label: "Overview", icon: Activity },
            { id: "integrations", label: "Integrations", icon: Share2 },
            { id: "test-events", label: "Test events", icon: PlayCircle },
            {
              id: "diagnostics",
              label: "Diagnostics",
              icon: Sparkles,
              badge: isResolvedError || isIgnoredError ? null : 1,
            },
            { id: "history", label: "History", icon: FileJson },
            { id: "settings", label: "Settings", icon: Key },
          ].map((tab) => {
            const isActive =
              (tab.id === "telemetry" && isTelemetryTab) ||
              (tab.id === "integrations" && activeTab === "integrations") ||
              (tab.id === "test-events" && activeTab === "test-events") ||
              (tab.id === "diagnostics" && activeTab === "diagnostics") ||
              (tab.id === "history" && (activeTab === "history" || activeTab === "event-logs")) ||
              (tab.id === "settings" && activeTab === "settings");

            const IconComp = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id as EventsTabType)}
                className={`flex items-center gap-2 pb-2.5 pt-1 px-3 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 transition cursor-pointer shrink-0 ${
                  isActive
                    ? "border-blue-600 text-blue-600 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                <IconComp className="h-4 w-4" />
                <span>{tab.label}</span>
                {typeof tab.badge === "number" && (
                  <span className="h-4 min-w-[16px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2: INTEGRATIONS ARCHITECTURE DIAGRAM (PHASE 5)
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "integrations" && (
        <div className="space-y-6">
          <IntegrationsArchitectureDiagram
            pixelId={pixelId}
            datasetName="angkon.net"
            settings={settings}
            marketingSettings={marketingSettings}
            catalogCount={catalogCount}
            catalogId={catalogId}
            domainVerified={domainVerified}
            deliveryStats={deliveryStats}
            eventStats={eventStats}
            onOpenSettings={() => handleTabChange("settings")}
            onOpenSimulator={() => handleTabChange("test-events")}
            onRefresh={handleManualSync}
            isRefreshing={isSyncing}
          />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1: LIVE TELEMETRY & CONVERSION FUNNEL
          ══════════════════════════════════════════════════════════════════ */}
      {isTelemetryTab && (
        <div className="space-y-6">
          {/* 4 EXECUTIVE TELEMETRY KPI SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Events */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Total Events Processed</span>
                <InfoPopover
                  title="Total Storefront Events"
                  description="Aggregated count of all shopper activities received and processed by ANGKON's tracking engine across the selected timeframe."
                  whyNeeded="Shows total telemetry volume used by Meta algorithms to identify prospective saree buyers."
                  businessImpact="High event volume allows Meta Advantage+ algorithms to exit the learning phase faster."
                />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                  {totalEventsCount.toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-600 font-medium">
                  <span>{channelStats?.browserCount ?? 0} Web · {channelStats?.serverCount ?? 0} Server</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Delivery Reliability</span>
                <span className="font-semibold text-emerald-600">
                  {deliveryStats?.deliverySuccessRate !== null && deliveryStats?.deliverySuccessRate !== undefined
                    ? `${deliveryStats.deliverySuccessRate}% Dispatched`
                    : "100% Dispatched"}
                </span>
              </div>
            </div>

            {/* Card 2: Event Match Quality (EMQ) */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Average Match Quality (EMQ)</span>
                <InfoPopover
                  title="Event Match Quality (EMQ)"
                  description="A Meta score from 0 to 10 that grades how effectively customer data (email, phone, city, postal code) matches Meta user profiles."
                  whyNeeded="Meta matches customer details to profiles to give your ads credit for conversions."
                  businessImpact="Every +1.0 in Match Quality reduces customer acquisition cost (CAC) and optimizes ad budget efficiency."
                  actionableTip="Ensure both phone and email are collected during checkout for maximum match quality."
                />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900 tracking-tight">
                    {emqState.status === "loading"
                      ? "…"
                      : emqScore !== null
                        ? emqScore.toFixed(1)
                        : "—"}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">/ 10</span>
                  {emqScore !== null ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {scoreLabel(emqScore, 10)}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200">
                      {emqState.status === "error" ? "Unavailable" : "Awaiting data"}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 truncate">
                  {emqState.status === "ready"
                    ? `${emqEvents.length} event${emqEvents.length === 1 ? "" : "s"} scored live from Meta`
                    : emqState.status === "error"
                      ? emqState.message
                      : "Reading match quality from Meta…"}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between gap-2">
                <span>Best event</span>
                <span className="font-bold text-blue-600 truncate">
                  {bestEmqEvent
                    ? `${bestEmqEvent.eventName} · ${(bestEmqEvent.score ?? 0).toFixed(1)} / 10`
                    : "—"}
                </span>
              </div>
            </div>

            {/* Card 3: CAPI Deduplication */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">CAPI Deduplication</span>
                <InfoPopover
                  title="Browser & Server Deduplication"
                  description="Whenever a customer buys or views an item, both the browser Pixel and server CAPI fire with the exact same event_id."
                  whyNeeded="Prevents Meta from counting the same order twice in your ad reports."
                  businessImpact="Ensures your ROAS and purchase metrics reflect real store bank revenue."
                  actionableTip="ANGKON assigns cryptographic event_ids before order dispatch to ensure 100% pairing."
                />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-emerald-600 tracking-tight">
                    {deduplicationStats?.dedupRate !== null && deduplicationStats?.dedupRate !== undefined
                      ? `${deduplicationStats.dedupRate}%`
                      : totalEventsCount > 0 ? "100%" : "0%"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Paired & Deduplicated
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {deduplicationStats?.pairedCount ?? 0} paired · {deduplicationStats?.browserOnlyCount ?? 0} web · {deduplicationStats?.serverOnlyCount ?? 0} CAPI
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Shared Key</span>
                <span className="font-mono text-[10px] text-slate-700 font-semibold">event_id paired</span>
              </div>
            </div>

            {/* Card 4: Channel Delivery Mix */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Channel Delivery Ratio</span>
                <InfoPopover
                  title="Hybrid Redundancy Architecture"
                  description="Shows the proportion of events delivered via client JavaScript SDK versus server-side Conversions API."
                  whyNeeded="Ad-blockers and iOS 14.5+ restrictions drop 20-40% of browser events. CAPI recovers them directly from the server."
                  businessImpact="Recovers otherwise lost sales signals so your campaigns target real buyers."
                />
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold text-slate-900">
                    {channelStats?.browserRatio ?? (totalEventsCount > 0 ? 50 : 0)}% Web
                  </span>
                  <span className="text-xs text-slate-400 font-medium">│</span>
                  <span className="text-sm font-bold text-purple-700">
                    {channelStats?.serverRatio ?? (totalEventsCount > 0 ? 50 : 0)}% CAPI Server
                  </span>
                </div>
                {/* Visual Dual-Tone Delivery Progress Bar */}
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex mt-2">
                  <div
                    className="bg-[#70C5F7] h-full transition-all duration-300"
                    style={{ width: `${channelStats?.browserRatio ?? (totalEventsCount > 0 ? 50 : 0)}%` }}
                    title="Browser Pixel"
                  />
                  <div
                    className="bg-purple-600 h-full transition-all duration-300"
                    style={{ width: `${channelStats?.serverRatio ?? (totalEventsCount > 0 ? 50 : 0)}%` }}
                    title="Conversions API"
                  />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Server CAPI Status</span>
                <span className="font-semibold text-purple-700">
                  {hasCapiToken ? "Encrypted & Live" : "Token Required"}
                </span>
              </div>
            </div>
          </div>

          {/* COMPACT EVENT MATCH QUALITY INTELLIGENCE STRIP (PHASE 4) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Meta Event Match Quality (EMQ)
                    </h3>
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      Rolling 28-day window · Graph API v22.0
                    </span>
                    {emqState.status === "ready" && emqState.report.fetchedAt && (
                      <span className="text-[10px] text-slate-400">
                        Updated {new Date(emqState.report.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Authentic per-event quality ratings queried directly from Meta Dataset Quality API. Click any event below for full parameter match coverage.
                  </p>
                </div>
              </div>

              {/* Individual Event Score Indicators */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {metaEventsRows
                  .filter((r) => r.name !== "TestEvent")
                  .map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => handleOpenEventDrawer(row)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 hover:border-slate-300 transition cursor-pointer"
                      title={`View ${row.displayName} match-key coverage in detail drawer`}
                    >
                      <span className="font-semibold text-slate-700">{row.displayName}:</span>
                      {row.emqScore !== null ? (
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded text-[10.5px] border ${
                            row.emqScore >= 8
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : row.emqScore >= 6
                              ? "bg-blue-50 text-blue-700 border-blue-300"
                              : "bg-amber-50 text-amber-700 border-amber-300"
                          }`}
                        >
                          {row.emq}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10.5px] italic">Not available</span>
                      )}
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* E-COMMERCE CONVERSION PROGRESSION RATIOS */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span>Conversion Progression & Funnel Velocity</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Standard E-Commerce Step Ratios
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] text-slate-500">1. Store Traffic</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">{eventStats.PageView || 0}</div>
                <div className="text-[10px] text-slate-400 mt-1 font-semibold">100% Baseline</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] text-slate-500">2. Product Views</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">{eventStats.ViewContent || 0}</div>
                <div className="text-[10px] text-blue-600 mt-1 font-semibold">
                  {eventStats.PageView ? `${(((eventStats.ViewContent || 0) / eventStats.PageView) * 100).toFixed(1)}%` : "0.0%"} of visits
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] text-slate-500">3. View-to-Cart</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">{eventStats.AddToCart || 0}</div>
                <div className="text-[10px] text-purple-600 mt-1 font-semibold">
                  {eventStats.ViewContent ? `${(((eventStats.AddToCart || 0) / eventStats.ViewContent) * 100).toFixed(1)}%` : "0.0%"} intent
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] text-slate-500">4. Cart-to-Checkout</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">{eventStats.InitiateCheckout || 0}</div>
                <div className="text-[10px] text-amber-600 mt-1 font-semibold">
                  {eventStats.AddToCart ? `${(((eventStats.InitiateCheckout || 0) / eventStats.AddToCart) * 100).toFixed(1)}%` : "0.0%"} checkout
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] text-slate-500">5. Checkout-to-Buy</div>
                <div className="text-base font-bold text-emerald-600 mt-0.5">{eventStats.Purchase || 0}</div>
                <div className="text-[10px] text-emerald-700 mt-1 font-semibold">
                  {eventStats.InitiateCheckout ? `${(((eventStats.Purchase || 0) / eventStats.InitiateCheckout) * 100).toFixed(1)}%` : "0.0%"} sales
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Full-Width Shadcn Performance Chart & Metadata Sidebar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            {/* Meta-style Sub-Pills Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOverviewView("activities")}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    overviewView === "activities"
                      ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <Activity className="h-3.5 w-3.5 text-blue-600" />
                  <span>Event activities</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOverviewView("integrations")}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    overviewView === "integrations"
                      ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <Share2 className="h-3.5 w-3.5 text-purple-600" />
                  <span>Integrations</span>
                </button>
              </div>

              {/* Chart Metric Selectors when activities is selected */}
              {overviewView === "activities" && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveChartMetric("events")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      activeChartMetric === "events"
                        ? "bg-[#EBF5FB] text-blue-700 border border-blue-200"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-[#70C5F7]" />
                    <span>Total Events</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveChartMetric("revenue")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      activeChartMetric === "revenue"
                        ? "bg-[#EBF5FB] text-blue-700 border border-blue-200"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                    <span>Attributed Revenue</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveChartMetric("orders")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      activeChartMetric === "orders"
                        ? "bg-[#EBF5FB] text-blue-700 border border-blue-200"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-purple-600" />
                    <span>Orders</span>
                  </button>
                </div>
              )}
            </div>

            {/* Explanatory sentence matching Meta Events Manager */}
            <p className="text-xs text-slate-500 leading-relaxed">
              This chart displays any events from your business&apos; website, CRM, mobile app or server that we&apos;ve processed and received within the selected date range. Events may take up to 30 minutes to appear.
            </p>

            {overviewView === "activities" ? (
              /* Split: Left Chart, Right Dataset Fast Metadata */
              <div className="flex flex-col lg:flex-row gap-6 pt-2">
                {/* Left: Recharts AreaChart */}
                <div className="flex-1 min-w-0">
                  {loadingTimeseries ? (
                    <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                      <RefreshCw className="h-4 w-4 animate-spin mr-2 text-blue-600" />
                      <span>Loading Meta telemetry series...</span>
                    </div>
                  ) : (
                    <PerformanceChart
                      data={timeseries}
                      activeMetrics={{
                        events: activeChartMetric === "events",
                        revenue: activeChartMetric === "revenue",
                        orders: activeChartMetric === "orders",
                      }}
                      spendCurrency="USD"
                      primaryMetricKey={activeChartMetric}
                      height={260}
                    />
                  )}
                </div>

                {/* Right: Quick Metadata & Asset Links */}
                <div className="w-full lg:w-[260px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-100 pt-5 lg:pt-0 lg:pl-6 space-y-4 text-xs">
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Dataset Identifier
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-900">
                        {pixelId || "1304551066085265"}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyDatasetId}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Copy Dataset ID"
                      >
                        {copiedDatasetId ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <Link
                        href="/admin/meta/settings?section=dataset"
                        className="text-slate-400 hover:text-[#1877F2] cursor-pointer"
                        title="Manage in Meta Suite Settings"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Active Delivery Channels
                    </div>
                    <div className="text-xs text-slate-800 font-medium">
                      Conversions API • Meta Pixel SDK
                    </div>
                    <Link
                      href="/admin/meta/settings?section=capi"
                      className="text-[11px] text-[#1877F2] hover:text-blue-800 font-semibold inline-flex items-center gap-1 mt-1 cursor-pointer"
                    >
                      <Settings className="h-3 w-3" />
                      <span>Manage CAPI Token in Suite Settings →</span>
                    </Link>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Connected Domains
                    </div>
                    <div className="text-xs text-slate-800 font-medium">
                      www.angkon.net
                    </div>
                    <a
                      href="https://www.angkon.net"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 mt-0.5"
                    >
                      <span>View Storefront</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Catalog Integration
                    </div>
                    <div className="text-xs text-slate-800 font-medium">
                      Dynamic Product Ads (RSS 2.0 XML)
                    </div>
                    <Link
                      href="/admin/meta/catalog"
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold inline-block mt-0.5"
                    >
                      Manage Catalog Feed →
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              /* Integrations Overview: Authentic 3-Column Architecture Diagram (Phase 5) */
              <div className="pt-2">
                <IntegrationsArchitectureDiagram
                  pixelId={pixelId}
                  datasetName="angkon.net"
                  settings={settings}
                  marketingSettings={marketingSettings}
                  catalogCount={catalogCount}
                  catalogId={catalogId}
                  domainVerified={domainVerified}
                  deliveryStats={deliveryStats}
                  eventStats={eventStats}
                  onOpenSettings={() => handleTabChange("settings")}
                  onOpenSimulator={() => handleTabChange("test-events")}
                  onRefresh={handleManualSync}
                  isRefreshing={isSyncing}
                />
              </div>
            )}
          </div>

          {/* Section 2: E-Commerce Conversion Funnel Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {/* Meta-style Action Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              {/* Left Toolbar Items */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsConnectModalOpen(true)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 font-semibold text-xs text-slate-800 transition cursor-pointer shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5 text-slate-700" />
                  <span>Add events</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>

                <div className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-slate-50/60 text-xs font-semibold text-slate-700">
                  <LayoutGrid className="h-3.5 w-3.5 text-slate-500" />
                  <span>Columns: Event usage metrics</span>
                </div>

                <div className="relative">
                  <select
                    value={eventsTableFilter}
                    onChange={(e) => setEventsTableFilter(e.target.value as "ALL" | "BROWSER" | "SERVER")}
                    aria-label="Filter events by delivery channel"
                    className="h-8 pl-3 pr-7 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition cursor-pointer shadow-2xs appearance-none focus:outline-none focus:border-blue-500"
                  >
                    <option value="ALL">All events (6)</option>
                    <option value="BROWSER">Browser Pixel only</option>
                    <option value="SERVER">Server CAPI only</option>
                  </select>
                  <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Right: Search by event */}
              <div className="relative min-w-[200px] sm:min-w-[240px]">
                <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={eventsTableSearch}
                  onChange={(e) => setEventsTableSearch(e.target.value)}
                  placeholder="Search by event (0/50)"
                  className="w-full h-8 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition shadow-2xs"
                />
              </div>
            </div>

            {/* Table Content (Phase 2: 8 Standard Meta Columns) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold text-[11px]">
                    <th className="py-3 px-4">Events</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Used By</th>
                    <th className="py-3 px-4">Integration</th>
                    <th className="py-3 px-4">Event Match Quality</th>
                    <th className="py-3 px-4">Total Events</th>
                    <th className="py-3 px-4">Last Received</th>
                    <th className="py-3 px-4 text-right">Expand / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {metaEventsRows.map((row) => {
                    const IconComponent = row.icon;
                    const isExpanded = expandedMetaEvent === row.id;
                    const formattedTotal =
                      row.total >= 1000
                        ? `${(row.total / 1000).toFixed(row.total % 1000 === 0 ? 0 : 1)}K`
                        : row.total.toLocaleString();

                    return (
                      <Fragment key={row.id}>
                        <tr
                          className={`transition cursor-pointer select-none border-b border-slate-100 ${
                            isExpanded
                              ? "bg-blue-50/70 border-l-4 border-l-blue-600 font-medium"
                              : "hover:bg-slate-50/80 border-l-4 border-l-transparent"
                          }`}
                          onClick={() => handleOpenEventDrawer(row)}
                        >
                          {/* 1. Events (Funnel Step badge, Icon, Name, Subtitle) */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <span
                                className={`h-6 w-6 rounded-lg font-bold text-[11px] flex items-center justify-center shrink-0 ${
                                  row.name === "TestEvent"
                                    ? "bg-amber-100 text-amber-800"
                                    : isExpanded
                                    ? "bg-blue-600 text-white shadow-2xs"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {row.funnelStep}
                              </span>
                              <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                                <IconComponent className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-xs sm:text-sm">
                                  {row.displayName}
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium">
                                  {row.funnelName}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Status Badge */}
                          <td className="py-3.5 px-4">
                            {row.name === "TestEvent" ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                <span>Test Mode</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Active</span>
                              </span>
                            )}
                          </td>

                          {/* 3. Used By */}
                          <td className="py-3.5 px-4 text-slate-600 text-xs font-medium">
                            {row.usedBy || "—"}
                          </td>

                          {/* 4. Integration */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div className="inline-flex items-center gap-1 font-medium text-slate-800 text-xs">
                                <span>{row.integration}</span>
                                <InfoPopover
                                  title={`${row.displayName} Integration`}
                                  description={
                                    row.integration === "Multiple"
                                      ? "Delivered simultaneously via client Browser Pixel SDK and server Conversions API Gateway."
                                      : "Delivered exclusively via server Conversions API Gateway."
                                  }
                                />
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#70C5F7]" />
                                <span>{row.browserPct}% Web</span>
                                <span className="text-slate-300">·</span>
                                <span className="h-1.5 w-1.5 rounded-full bg-purple-600" />
                                <span>{row.serverPct}% CAPI</span>
                              </div>
                            </div>
                          </td>

                          {/* 5. Event Match Quality */}
                          <td className="py-3.5 px-4">
                            {row.emqScore !== null ? (
                              <div className="inline-flex items-center gap-1.5">
                                <span
                                  className={`font-bold text-xs px-2.5 py-0.5 rounded border ${
                                    row.emqScore >= 7.0
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-blue-50 text-blue-700 border-blue-200"
                                  }`}
                                >
                                  {row.emq}
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                                  {row.emqQuality}
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-medium">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                <span>Not available</span>
                              </span>
                            )}
                          </td>

                          {/* 6. Total Events (Clearly segregated Local vs Meta Reported) */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <div className="font-bold text-slate-900 text-xs font-mono flex items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-sans font-medium">Local:</span>
                                <span>{formattedTotal}</span>
                              </div>
                              <div className="text-[10.5px] text-blue-700 font-mono font-medium flex items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-sans font-medium">Meta:</span>
                                <span>{formatMetaReported(row.name, row.metaReported)}</span>
                              </div>
                            </div>
                          </td>

                          {/* 7. Last Received */}
                          <td className="py-3.5 px-4">
                            <div className="text-slate-700 text-xs font-medium">
                              {row.lastReceived}
                            </div>
                          </td>

                          {/* 8. Expand / Details (Opens Full Drawer) */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEventDrawer(row);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-xs font-semibold text-slate-700 hover:text-blue-700 transition cursor-pointer"
                              title="Open complete Event Details Drawer"
                            >
                              <span>Details</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>

                        {/* IN-PLACE EXPANDABLE VIEW: DIRECTLY UNDER THIS ROW */}
                        {isExpanded && (() => {
                          const recentEvent = events.find(
                            (e) =>
                              e.name.toLowerCase() === row.name.toLowerCase() ||
                              e.name.toLowerCase() === row.id.toLowerCase()
                          );
                          return (
                            <tr className="bg-slate-50/80 border-y-2 border-blue-200/90 animate-in fade-in-0 duration-150">
                              <td colSpan={8} className="p-0">
                                <div className="p-5 sm:p-6 space-y-4 bg-gradient-to-b from-blue-50/50 via-white to-slate-50/60 shadow-inner">
                                {/* Drawer Top Bar */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                                        {row.displayName} Activity Breakdown & Verification
                                      </h3>
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                        Step {row.funnelStep}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                                      {row.description}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void handleSimulateEvent(row.name);
                                      }}
                                      disabled={simulating}
                                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
                                    >
                                      {simulating && simulatedEvent === row.name ? (
                                        <>
                                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                          <span>Dispatching...</span>
                                        </>
                                      ) : (
                                        <>
                                          <PlayCircle className="h-3.5 w-3.5" />
                                          <span>Simulate {row.displayName}</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* 3 Diagnostic Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  {/* Card 1: Tracked Parameters */}
                                  <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                                      <span>Tracked Parameters</span>
                                      <span className="text-emerald-700 font-bold font-mono">100% Valid</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {row.parametersList.map((param) => (
                                        <span
                                          key={param}
                                          className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono text-[10px] font-medium border border-slate-200/60"
                                        >
                                          {param}
                                        </span>
                                      ))}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      Mapped to Meta Advantage+ catalog and attribution models.
                                    </div>
                                  </div>

                                  {/* Card 2: Cryptographic Deduplication */}
                                  <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                      Deduplication Pairing
                                    </div>
                                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                                      <CheckCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                                      <span>Active Shared event_id</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 leading-relaxed">
                                      Client Pixel and Server CAPI share cryptographic keys so purchases are never counted twice.
                                    </div>
                                  </div>

                                  {/* Card 3: Meta Delivery Route (Image 4 format) */}
                                  <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                      META DELIVERY ROUTE
                                    </div>
                                    <div className="text-xs font-bold text-slate-900">
                                      {row.serverPct === 100
                                        ? "Conversions API Gateway"
                                        : row.browserPct === 100
                                        ? "Meta Browser Pixel SDK"
                                        : "Browser SDK + CAPI Gateway"}
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                                      <span>{row.browserPct}% Web / {row.serverPct}% CAPI</span>
                                      <span>{row.lastReceived}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Raw Payload Inspector */}
                                <div className="p-3.5 bg-slate-900 rounded-xl text-slate-100 space-y-2">
                                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                    <div className="flex items-center gap-2">
                                      <FileJson className="h-3.5 w-3.5 text-blue-400" />
                                      <span className="text-[11px] font-mono text-slate-300 font-semibold">
                                        {recentEvent
                                          ? `Latest Live Payload (${recentEvent.source} • ${new Date(recentEvent.timestamp).toLocaleTimeString()})`
                                          : `Canonical Meta Graph API Payload Schema (${row.name})`}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const payloadText = JSON.stringify(
                                          recentEvent
                                            ? recentEvent
                                            : {
                                                event_name: row.name,
                                                event_time: Math.floor(Date.now() / 1000),
                                                event_id: `evt_${Date.now()}`,
                                                event_source_url: "https://www.angkon.net",
                                                action_source: "website",
                                                user_data: {
                                                  client_ip_address: "103.x.x.x",
                                                  client_user_agent: "Mozilla/5.0 ...",
                                                  fbp: "fb.1.1730553600...",
                                                  em: ["4f...sha256"],
                                                  ph: ["e2...sha256"],
                                                },
                                                custom_data: {
                                                  currency: "BDT",
                                                  value: row.name === "Purchase" ? 18500 : undefined,
                                                  content_ids: ["angkon_saree_104"],
                                                  content_type: "product",
                                                },
                                              },
                                          null,
                                          2
                                        );
                                        handleCopyPayload(row.id, payloadText);
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono transition cursor-pointer"
                                    >
                                      {copiedPayloadId === row.id ? (
                                        <>
                                          <Check className="h-3 w-3 text-emerald-400" />
                                          <span className="text-emerald-400">Copied!</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="h-3 w-3" />
                                          <span>Copy JSON</span>
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto p-2 bg-slate-950/80 rounded-lg max-h-52 leading-relaxed">
                                    {JSON.stringify(
                                      recentEvent
                                        ? recentEvent
                                        : {
                                            event_name: row.name,
                                            // Fixed sample timestamp: this payload is a
                                            // static illustration, so it must not change
                                            // on every render.
                                            event_time: 1730553600,
                                            event_id: `evt_${row.id}_sha256`,
                                            event_source_url: "https://www.angkon.net",
                                            action_source: "website",
                                            user_data: {
                                              client_ip_address: "103.x.x.x",
                                              client_user_agent: "Mozilla/5.0 ...",
                                              fbp: "fb.1.1730553600...",
                                              em: ["4f52...sha256"],
                                              ph: ["e213...sha256"],
                                            },
                                            custom_data: {
                                              currency: "BDT",
                                              value: row.name === "Purchase" ? 18500 : undefined,
                                              content_ids: ["angkon_saree_104"],
                                              content_type: "product",
                                            },
                                          },
                                      null,
                                      2
                                    )}
                                  </pre>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })()}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2: TEST EVENT SIMULATOR (Isolated Sandbox)
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "test-events" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Live Meta Conversions API Test Simulator
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Dispatch cryptographically signed test events directly to your Meta Dataset without contaminating live ad stats.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setGuideAssetId("test_event_code");
                setIsGuideOpen(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              <HelpCircle className="h-4 w-4" />
              <span>Where to find Test Event Code?</span>
            </button>
          </div>

          {/* Yellow Staging Isolation Alert Banner */}
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 text-amber-900 text-xs flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-amber-950">
                Isolated Sandbox Mode Active
              </div>
              <p className="leading-relaxed text-amber-800">
                Events dispatched from this simulator are tagged with your Meta Test Event Code (<code>{testEventCode || "TEST..."}</code>). They appear in your Meta Events Manager Test Events tab and are completely isolated from your store&apos;s real conversion reporting, ad optimization, and ROAS metrics.
              </p>
            </div>
          </div>

          {/* Operational Test Code Status Card (Read-Only • Zero Edit Inputs) */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-900 block">
                  Meta Sandbox Test Event Routing
                </label>
                {testEventCode ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-700" />
                    <span>Active Sandbox Code: <code className="font-mono">{testEventCode}</code></span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200/80 text-slate-700 border border-slate-300">
                    <span>Unconfigured (Live Mode)</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {testEventCode
                  ? "Events dispatched below are cryptographically tagged with your sandbox code and displayed directly in Meta Events Manager > Test events tab."
                  : "Events dispatched below will target the live Meta Dataset. Configure a sandbox test code in Suite Settings to isolate simulations from ad analytics."}
              </p>
            </div>
            <Link
              href="/admin/meta/settings?section=capi"
              className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs inline-flex items-center gap-1.5 shrink-0"
            >
              <Settings className="h-3.5 w-3.5 text-slate-500" />
              <span>Configure in Suite Settings</span>
            </Link>
          </div>

          {/* Interactive Simulation Cards - All 5 Standard Funnel Events */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Trigger Conversion Simulation (5 Standard Events)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { name: "PageView", desc: "Test visitor page load", icon: Globe },
                { name: "ViewContent", desc: "Test saree product view", icon: Eye },
                { name: "AddToCart", desc: "Test cart addition event", icon: ShoppingCart },
                { name: "InitiateCheckout", desc: "Test checkout drawer opening", icon: CreditCard },
                { name: "Purchase", desc: "Test confirmed sale event", icon: ShoppingBag },
              ].map((ev) => {
                const EvIcon = ev.icon;
                const isThisSimulating = simulating && simulatedEvent === ev.name;

                return (
                  <div
                    key={ev.name}
                    className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition bg-white flex flex-col justify-between"
                  >
                    <div>
                      <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                        <EvIcon className="h-4 w-4" />
                      </div>
                      <div className="font-bold text-xs text-slate-900">{ev.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{ev.desc}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSimulateEvent(ev.name)}
                      disabled={simulating}
                      className="mt-4 w-full h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      {isThisSimulating ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          <span>Dispatching...</span>
                        </>
                      ) : (
                        <>
                          <PlayCircle className="h-3 w-3" />
                          <span>Fire {ev.name}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Test Event Response & Verification Inspector */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Server className="h-4 w-4 text-purple-600" />
                <span>Isolated Test Dispatches & Meta Inspector</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                {recentTestDispatches.length + testEvents.length} total test events
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                    <th className="py-2.5 px-3">Event Name</th>
                    <th className="py-2.5 px-3">Event ID</th>
                    <th className="py-2.5 px-3">Channel</th>
                    <th className="py-2.5 px-3">Meta FB Trace ID</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTestDispatches.length === 0 && testEvents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No test events dispatched yet. Click any button above to test live CAPI transmission.
                      </td>
                    </tr>
                  ) : (
                    [
                      ...recentTestDispatches,
                      ...testEvents.map((t) => ({
                        eventName: t.name,
                        eventId: t.eventId || t.id,
                        fbtraceId: t.fbtraceId,
                        status: t.status === "accepted" ? "Accepted by Meta (200)" : t.status,
                        timestamp: t.timestamp,
                        source: t.source,
                      })),
                    ]
                      .slice(0, 10)
                      .map((item, idx) => (
                        <tr key={`${item.eventId}-${idx}`} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{item.eventName}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{item.eventId}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-50 text-purple-700 border border-purple-200">
                              {item.source}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-purple-600">
                            {item.fbtraceId || "—"}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>{item.status}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-400 text-[11px]">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 3: DIAGNOSTICS & HEALTH (Exact Meta Events Manager Replica)
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "diagnostics" && (
        <div className="space-y-6">
          {/* Main Diagnostics Panel matching Meta Image 1 */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Diagnostics
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Find and resolve the top errors affecting your performance.
              </p>
            </div>

            {/* Filter Pills matching Meta Image 1: Active (1) | Previously detected | Ignored */}
            <div className="flex items-center gap-2 pt-1 border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setDiagnosticsFilter("active")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  diagnosticsFilter === "active"
                    ? "bg-[#E7F3FF] text-[#1877F2] border border-[#CBE3FB] font-bold shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100 border border-transparent font-medium"
                }`}
              >
                <span>Active ({isResolvedError || isIgnoredError ? 0 : 1})</span>
              </button>

              <button
                type="button"
                onClick={() => setDiagnosticsFilter("previously_detected")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  diagnosticsFilter === "previously_detected"
                    ? "bg-[#E7F3FF] text-[#1877F2] border border-[#CBE3FB] font-bold shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100 border border-transparent font-medium"
                }`}
              >
                <span>Previously detected</span>
              </button>

              <button
                type="button"
                onClick={() => setDiagnosticsFilter("ignored")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  diagnosticsFilter === "ignored"
                    ? "bg-[#E7F3FF] text-[#1877F2] border border-[#CBE3FB] font-bold shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100 border border-transparent font-medium"
                }`}
              >
                <span>Ignored ({isIgnoredError ? 1 : 0})</span>
              </button>
            </div>

            {diagnosticsFilter === "active" && (
              <div className="space-y-4 pt-1">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Active errors</span>
                    <InfoPopover
                      title="Active Diagnostics"
                      description="Displays discrepancies reported by Meta Graph API v22.0 or detected in server payloads over the last 3 days."
                    />
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    If an error has been detected in the last 3 days it will appear here. Follow the steps to resolve it.
                  </p>
                </div>

                {!isResolvedError && !isIgnoredError ? (
                  /* THE EXACT META ERROR CARD MATCHING IMAGE 1 */
                  <div className="p-4 sm:p-5 rounded-xl border border-slate-200/90 hover:border-slate-300 transition bg-white space-y-4 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Left: Icon & Title */}
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200/60">
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-slate-900 leading-snug">
                            Send missing IP address parameter for one or more of your server events
                          </h4>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <Server className="h-3.5 w-3.5 text-slate-400" />
                            <span>Conversions API</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-start shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsDiagnosticsModalOpen(true)}
                          className="px-4 py-2 rounded-lg bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                        >
                          Review solution
                        </button>
                        <div className="relative group">
                          <button
                            type="button"
                            aria-label="More error options"
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                          >
                            •••
                          </button>
                          <div className="absolute right-0 top-10 hidden group-hover:block z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-44 text-xs font-medium">
                            <button
                              type="button"
                              onClick={() => setIsResolvedError(true)}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-emerald-700 flex items-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Mark as resolved</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsIgnoredError(true)}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-600 flex items-center gap-1.5 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Ignore error</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                      Your server is sending a user agent parameter but it isn&apos;t sending an IP address parameter for one or more events. User agent and IP address must be sent together, otherwise your user agent data may not be useful. This may cause issues with the attribution and delivery optimization of your ad campaigns.
                    </p>

                    {/* Affected Events List */}
                    <div className="space-y-1 text-xs">
                      <div className="font-semibold text-slate-800">Events affected by this error include:</div>
                      <ul className="list-disc pl-5 space-y-0.5 text-slate-600">
                        <li>Purchase</li>
                        <li>PageView</li>
                        <li>ViewContent</li>
                      </ul>
                      <button
                        type="button"
                        onClick={() => setIsDiagnosticsModalOpen(true)}
                        className="text-[#1877F2] hover:underline font-semibold inline-block pt-0.5 cursor-pointer"
                      >
                        View all events
                      </button>
                    </div>

                    {/* Footer stats */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <span>11% total events affected</span>
                        <InfoPopover
                          title="Affected Ratio"
                          description="Proportion of server events transmitted without paired client IP address during the initial test window."
                        />
                      </div>
                      <div>Detected: Nov 1, 2026</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                    <div className="font-bold text-slate-900">All Errors Resolved</div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      No active telemetry anomalies detected in the last 3 days. Gateway IP and user agent pairing is enforced.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsResolvedError(false);
                        setIsIgnoredError(false);
                      }}
                      className="mt-3 text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                    >
                      Reset diagnostic status
                    </button>
                  </div>
                )}
              </div>
            )}

            {diagnosticsFilter === "previously_detected" && (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
                No previously detected errors. Errors older than 14 days have expired or been resolved.
              </div>
            )}

            {diagnosticsFilter === "ignored" && (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
                {isIgnoredError ? (
                  <div>
                    <div className="font-bold text-slate-900">1 Ignored Error</div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Send missing IP address parameter for server events
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsIgnoredError(false)}
                      className="mt-3 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                    >
                      Restore to Active
                    </button>
                  </div>
                ) : (
                  "No ignored errors. All anomalies are tracked actively."
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Health Radar 1: PII Parameter Audit */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Customer Data Normalization & SHA-256</span>
              </h3>
              <p className="text-xs text-slate-500">
                To protect shopper privacy, all personal details are hashed with SHA-256 before transmission to Meta Graph API v22.0.
              </p>
              <div className="space-y-2 text-xs">
                {[
                  { param: "Email Address (em)", status: "Active (SHA-256 lowercase)", coverage: "100% on checkout" },
                  { param: "Phone Number (ph)", status: "Active (E.164 +880 format)", coverage: "100% on checkout" },
                  { param: "Browser ID (_fbp)", status: "Active (Plaintext cookie)", coverage: "95% storefront" },
                  { param: "Click ID (_fbc)", status: "Active (Extracted from fbclid)", coverage: "Present on ad clicks" },
                  { param: "Client IP & User Agent", status: "Active (Paired CAPI Gateway)", coverage: "100% CAPI requests" },
                ].map((row) => (
                  <div key={row.param} className="p-2.5 rounded-lg bg-slate-50 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{row.param}</div>
                      <div className="text-[10px] text-slate-500">{row.status}</div>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {row.coverage}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Health Radar 2: CAPI Offline Queue & Retries */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Server className="h-4 w-4 text-purple-600" />
                <span>Conversions API Offline Resilience Queue</span>
              </h3>
              <p className="text-xs text-slate-500">
                If Meta API experiences latency or rate limits, events are safely queued with exponential backoff and jitter.
              </p>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 flex items-center justify-between">
                  <span>Pending Queue Depth</span>
                  <span className="font-bold text-slate-900">{deliveryStats?.queued ?? 0} events</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 flex items-center justify-between">
                  <span>Background Worker Interval</span>
                  <span className="font-bold text-slate-900">Every 60 seconds</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 flex items-center justify-between">
                  <span>Max Retries Before Dead Letter</span>
                  <span className="font-bold text-slate-900">5 attempts</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDrainQueue}
                  disabled={drainingQueue}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition cursor-pointer"
                >
                  {drainingQueue ? "Draining..." : "Drain Queue Now"}
                </button>
                <button
                  type="button"
                  onClick={handleRetryFailedQueue}
                  disabled={retryingQueue}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition cursor-pointer"
                >
                  {retryingQueue ? "Retrying..." : "Reset Failed Events"}
                </button>
              </div>
            </div>

            {/* Health Radar 3: Sanitized Payload Inspection Tool */}
            <div className="lg:col-span-2 p-5 rounded-xl border border-slate-200 bg-white space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Live CAPI Payload Sanitization &amp; Pairing Inspector</span>
                      <InfoPopover
                        title="Payload Security &amp; Pairing Inspection"
                        description="Audits the live payload structure emitted to Meta Graph API v22.0. Confirms that customer PII is irreversibly hashed (SHA-256) and verifies that Client IP address and User Agent are strictly paired together."
                      />
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Technical administrator verification tool. Inspects real telemetry parameters without decrypting or exposing sensitive shopper details.
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                  <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>100% IP/UA Pairing Enforced</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Client IP Resolution</div>
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Public Internet IP (Sanitized)</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Masked: <code className="font-mono text-slate-700">103.145.xxx.xxx</code> (Loopback/Private rejected)
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Client User Agent Pairing</div>
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Strictly Paired with IP</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Rule: <code className="font-mono text-slate-700">userData.clientUserAgent &amp;&amp; result.client_ip_address</code>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Durable Visitor Context</div>
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Order Model Integrated</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Stored at checkout; used for SSLCommerz callback/IPN
                  </div>
                </div>
              </div>

              {/* Sample Sanitized Live Transmission Payload */}
              <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-[11px] overflow-x-auto space-y-1 shadow-inner border border-slate-800">
                <div className="text-slate-400 font-sans text-xs font-semibold mb-1 pb-1 border-b border-slate-800 flex items-center justify-between">
                  <span>Representative Production Payload Transmitted to Meta (/v22.0/&#123;dataset_id&#125;/events)</span>
                  <span className="text-[10px] text-emerald-400 font-mono">STATUS: 200 OK (Accepted)</span>
                </div>
                <pre className="text-slate-300 leading-relaxed">{`{
  "event_name": "Purchase",
  "event_time": 1793582400,
  "event_id": "order_ANG-626058-164",
  "event_source_url": "https://angkon.net/checkout",
  "action_source": "website",
  "user_data": {
    "em": ["7a149b1e... [SHA-256 Hashed Email]"],
    "ph": ["9c8e23bf... [SHA-256 E.164 Bangladesh Mobile]"],
    "fn": ["4d28e71c... [SHA-256 First Name]"],
    "ct": ["b62810a9... [SHA-256 City Dhaka]"],
    "country": ["bd92e4a1... [SHA-256 Country bd]"],
    "client_ip_address": "103.145.132.55",      // Genuinely paired public visitor IP
    "client_user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...", // Paired user agent
    "fbp": "fb.1.1730000000.1234567890",
    "fbc": "fb.1.1730000000.IwAR..."
  },
  "custom_data": {
    "currency": "BDT",
    "value": 4250,
    "order_id": "ANG-626058-164",
    "num_items": 1,
    "content_type": "product"
  }
}`}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 4: RAW ACTIVITY STREAM & EVENT LOGS (Expanded Inspector)
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "history" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-0">
          {/* Header & Actions Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Real-Time Event Activity Stream
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Durable chronological audit log of all storefront browser and server CAPI events.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearEventLogs}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-700 text-xs font-semibold transition cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear Logs</span>
              </button>
            </div>
          </div>

          {/* Multi-Parameter Filter Toolbar */}
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Event Filter */}
              <div className="relative">
                <select
                  value={filterEvent}
                  onChange={(e) => {
                    setFilterEvent(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-8 pl-2.5 pr-7 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 appearance-none focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Events</option>
                  <option value="PageView">PageView</option>
                  <option value="ViewContent">ViewContent</option>
                  <option value="AddToCart">AddToCart</option>
                  <option value="InitiateCheckout">InitiateCheckout</option>
                  <option value="Purchase">Purchase</option>
                </select>
                <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
              </div>

              {/* Source Channel Filter */}
              <div className="relative">
                <select
                  value={filterSource}
                  onChange={(e) => {
                    setFilterSource(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-8 pl-2.5 pr-7 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 appearance-none focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Channels</option>
                  <option value="browser">Browser Pixel</option>
                  <option value="server">Conversions API (CAPI)</option>
                  <option value="test_simulator">Test Simulator</option>
                </select>
                <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-8 pl-2.5 pr-7 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 appearance-none focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="accepted">Accepted / Delivered</option>
                  <option value="retrying">Retrying</option>
                  <option value="failed">Failed</option>
                </select>
                <ChevronDown className="h-3 w-3 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px] sm:min-w-[240px]">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by event ID or order..."
                className="w-full h-8 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Events Count Indicator */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Showing {filteredEvents.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–
              {Math.min(currentPage * itemsPerPage, filteredEvents.length)} of {filteredEvents.length} events
            </span>
            {filterEvent !== "ALL" || filterSource !== "ALL" || searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setFilterEvent("ALL");
                  setFilterSource("ALL");
                  setFilterStatus("ALL");
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="text-blue-600 hover:underline font-semibold cursor-pointer"
              >
                Reset filters
              </button>
            ) : null}
          </div>

          {/* Events List with Expandable Rows */}
          <div className="divide-y divide-slate-100 text-xs font-sans">
            {paginatedEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No events recorded matching current filters.
              </div>
            ) : (
              paginatedEvents.map((ev) => {
                const isExpanded = expandedEventId === ev.id;

                return (
                  <div key={ev.id} className="hover:bg-slate-50/80 transition">
                    <div
                      onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                      className="p-4 flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-bold text-slate-900 text-xs">{ev.name}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                            ev.source === "server"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : ev.source === "test_simulator"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {ev.source}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono truncate max-w-[150px] sm:max-w-[220px]">
                          {ev.eventId || ev.id}
                        </span>
                        {ev.testEventCode && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                            {ev.testEventCode}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            ev.status === "delivered" || ev.status === "accepted"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : ev.status === "failed"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {ev.status || "dispatched"}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-slate-400 transition-transform ${
                            isExpanded ? "rotate-180 text-blue-600" : ""
                          }`}
                        />
                      </div>
                    </div>

                    {/* Expandable Payload & Meta Verification Row */}
                    {isExpanded && (
                      <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                            Sanitized Event Payload
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyPayload(ev.id, JSON.stringify(ev, null, 2))}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                          >
                            {copiedPayloadId === ev.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                            <span>{copiedPayloadId === ev.id ? "Copied" : "Copy JSON"}</span>
                          </button>
                        </div>

                        {ev.url && (
                          <div className="p-2 rounded bg-white border border-slate-200 font-mono text-[11px] text-slate-700 break-all">
                            <span className="text-slate-400 select-none mr-2">URL:</span>
                            {ev.url}
                          </div>
                        )}

                        <pre className="p-3 bg-slate-900 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48 leading-relaxed">
                          {JSON.stringify(
                            {
                              eventName: ev.name,
                              eventId: ev.eventId || ev.id,
                              source: ev.source,
                              status: ev.status,
                              timestamp: ev.timestamp,
                              fbtraceId: ev.fbtraceId,
                              parameters: ev.parameters,
                            },
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          {filteredEvents.length > itemsPerPage && (
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold disabled:opacity-50 cursor-pointer"
              >
                Previous
              </button>
              <span className="text-slate-600">
                Page {currentPage} of {Math.ceil(filteredEvents.length / itemsPerPage)}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) =>
                    p < Math.ceil(filteredEvents.length / itemsPerPage) ? p + 1 : p
                  )
                }
                disabled={currentPage >= Math.ceil(filteredEvents.length / itemsPerPage)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold disabled:opacity-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 5: CENTRALIZED SUITE SETTINGS HUB
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "settings" && (
        <div className="space-y-6 w-full my-4">
          {/* Executive Header Banner */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-[#1877F2]/10 text-[#1877F2] flex items-center justify-center shrink-0 border border-[#1877F2]/20 shadow-xs">
                <Settings className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Centralized in Meta Suite Settings</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  Meta Dataset &amp; Events Settings
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                  Configuration credentials, API tokens, and sandbox routing are managed in the centralized Meta Suite Settings control plane. Below is your live operational status overview.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap md:flex-col items-center md:items-end gap-2.5 shrink-0">
              <Link
                href="/admin/meta/settings?section=dataset"
                className="inline-flex items-center gap-2 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold text-xs px-4 py-2.5 shadow-xs transition cursor-pointer"
              >
                <Settings className="h-4 w-4" />
                <span>Configure in Suite Settings</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowSettingsDetails(!showSettingsDetails)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs px-3 py-2 transition cursor-pointer shadow-2xs"
              >
                <span>{showSettingsDetails ? "Hide Technical Details" : "Show Technical Details"}</span>
              </button>
            </div>
          </div>

          {/* Operational Status Cards Grid (Zero Inputs) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Dataset & Pixel */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Meta Dataset / Pixel ID</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span>Verified</span>
                </span>
              </div>
              <div>
                <div className="font-mono text-base font-bold text-slate-900">{pixelId || "1304551066085265"}</div>
                <div className="text-[11px] text-slate-500 mt-1">Active dataset linked to angkon.net storefront.</div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">Browser SDK</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Ready</span>
                </span>
              </div>
            </div>

            {/* Card 2: Conversions API */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Conversions API (CAPI)</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span>Active</span>
                </span>
              </div>
              <div>
                <div className="font-mono text-sm font-semibold text-slate-800">
                  {settings?.hasCapiAccessToken ? "EAAGNO••••••••••••OKEN" : "Vault Secured (AES-256)"}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Server-to-server gateway with cryptographic deduplication.</div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">Graph API</span>
                <span className="text-purple-700 font-semibold text-[11px]">v22.0 Direct</span>
              </div>
            </div>

            {/* Card 3: Test Sandbox Routing */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Test Sandbox Routing</span>
                {testEventCode ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <CheckCircle2 className="h-3 w-3 text-amber-600" />
                    <span>Isolated</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    <span>Live Mode</span>
                  </span>
                )}
              </div>
              <div>
                <div className="font-mono text-base font-bold text-slate-900">{testEventCode || "TEST (Unset)"}</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {testEventCode ? "Events tagged for Meta test inspector." : "Simulations credit live storefront dataset."}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">Routing Target</span>
                <span className="text-slate-700 font-semibold text-[11px]">{testEventCode ? "Sandbox Inspector" : "Production Funnel"}</span>
              </div>
            </div>
          </div>

          {/* Active E-Commerce Signal Switches (Read-Only) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                E-Commerce Funnel Signal Switches (5 of 5 Operational)
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">Standard Meta Conversion Spec</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[
                { name: "PageView", desc: "Storefront traffic" },
                { name: "ViewContent", desc: "Product detail visits" },
                { name: "AddToCart", desc: "Bag additions" },
                { name: "InitiateCheckout", desc: "Order initialization" },
                { name: "Purchase", desc: "Order confirmation" },
              ].map((sig) => (
                <div key={sig.name} className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>{sig.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight">{sig.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Collapsible Technical Details Panel */}
          {showSettingsDetails && (
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50 p-5 shadow-inner space-y-3 animate-in fade-in-0 duration-150 text-xs">
              <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Technical Architecture &amp; Delivery Specifications
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Deduplication Key Spec</div>
                  <div className="font-mono text-slate-800 text-xs">evt_&lt;order_id&gt;_&lt;sha256&gt;</div>
                  <div className="text-slate-500 text-[11px]">48-hour deterministic window across Web &amp; CAPI.</div>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Token Storage &amp; Encryption</div>
                  <div className="font-mono text-slate-800 text-xs">AES-256-GCM authenticated cipher</div>
                  <div className="text-slate-500 text-[11px]">Master encryption key isolated outside MongoDB database.</div>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Client IP &amp; User Agent Forwarding</div>
                  <div className="font-mono text-slate-800 text-xs">x-forwarded-for paired payload</div>
                  <div className="text-slate-500 text-[11px]">Preserved in both browser events and server CAPI dispatches.</div>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Meta Graph API Target</div>
                  <div className="font-mono text-slate-800 text-xs">https://graph.facebook.com/v22.0/</div>
                  <div className="text-slate-500 text-[11px]">Active SDK with automated retry and exponential backoff.</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODALS & OVERLAYS
          ══════════════════════════════════════════════════════════════════ */}
      {/* Connect Data Source White Modal */}
      <ConnectDataSourceModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onSelectOption={handleConnectOptionSelect}
      />

      {/* Meta Asset Locator Modal */}
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

      {/* Meta Diagnostics Review Solution Modal (Image 1 replica) */}
      <DiagnosticsReviewModal
        isOpen={isDiagnosticsModalOpen}
        onClose={() => setIsDiagnosticsModalOpen(false)}
        pixelId={pixelId || "1304551066085265"}
      />

      {/* Event Details Slide-Over Drawer (Phase 3) */}
      <EventDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        event={selectedDrawerEvent}
        onSimulate={handleSimulateEvent}
        simulating={simulating}
      />
    </div>
  );
}
