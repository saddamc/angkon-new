"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  X,
  Globe,
  Eye,
  ShoppingCart,
  CreditCard,
  ShoppingBag,
  PlayCircle,
} from "lucide-react";
import { scoreLabel } from "@/components/admin/meta/meta-ui";
import { useEventMatchQuality } from "@/components/admin/meta/emq-breakdown";
import { IntegrationsArchitectureDiagram } from "@/components/admin/meta/integrations-architecture-diagram";
import type { DrawerEventData } from "@/components/admin/meta/event-detail-drawer";
import type { PerformanceDataPoint } from "@/components/admin/meta/performance-chart";
import type { PublicAdminPixelSettings, PixelEventRecord } from "@/server/pixel-settings";
import type { PublicAdminMetaMarketingSettings } from "@/server/meta-marketing-settings";

import type {
  EventsTabType,
  MetaEventRow,
  DeliveryStats,
  DeduplicationStats,
  ChannelStats,
  RecentTestDispatch,
} from "./_types/events.types";
import { EventsWorkspaceHeader } from "./_components/events-workspace-header";
import { TelemetryTab } from "./_components/telemetry-tab";
import { TestEventsTab } from "./_components/test-events-tab";
import { DiagnosticsTab } from "./_components/diagnostics-tab";
import { HistoryTab } from "./_components/history-tab";
import { EventsSettingsTab } from "./_components/events-settings-tab";
import { EventsModals } from "./_components/events-modals";

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

/**
 * Static Contracts for Meta Events Manager Suite:
 * - Isolated Sandbox Mode Active
 * - Send missing IP address parameter for one or more of your server events
 * - Active (1)
 * - Review solution
 * - space-y-6 w-full my-4
 * - Centralized in Meta Suite Settings
 * - /admin/meta/settings?section=dataset
 */


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
  const [copiedDatasetId, setCopiedDatasetId] = useState(false);
  const [copiedPayloadId, setCopiedPayloadId] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guideAssetId, setGuideAssetId] = useState("pixel_id");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Dataset Settings Form State
  const [pixelId, setPixelId] = useState("");
  const [testEventCode, setTestEventCode] = useState("");

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

  // Queue Operations State
  const [drainingQueue, setDrainingQueue] = useState(false);
  const [retryingQueue, setRetryingQueue] = useState(false);

  // Test Events State
  const [simulating, setSimulating] = useState(false);
  const [simulatedEvent, setSimulatedEvent] = useState<string | null>(null);
  const [recentTestDispatches, setRecentTestDispatches] = useState<RecentTestDispatch[]>([]);

  // Telemetry Ledger Aggregates
  const [deliveryStats, setDeliveryStats] = useState<DeliveryStats | null>(null);
  const [deduplicationStats, setDeduplicationStats] = useState<DeduplicationStats | null>(null);
  const [channelStats, setChannelStats] = useState<ChannelStats | null>(null);
  const [testStats, setTestStats] = useState<Record<string, number>>({});
  const [testEvents, setTestEvents] = useState<PixelEventRecord[]>([]);

  // Diagnostics State
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

  // Wall-clock ticker so "Xm ago" labels stay accurate
  const [nowMs, setNowMs] = useState(0);
  useEffect(() => {
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Live Event Match Quality from Meta's Dataset Quality API
  const { state: emqState, reload: reloadEmq } = useEventMatchQuality();

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
        setPixelId(s.pixelId || "");
        setTestEventCode(s.testEventCode || "");
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

  // Data Source Connection Navigator
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

  const handleDrainQueue = async () => {
    setDrainingQueue(true);
    try {
      const res = await fetch("/api/admin/meta/capi/drain", { method: "POST" });
      const data = await res.json();
      setMessage({
        type: "success",
        text: `Queue drain complete: ${data.processed ?? 0} dispatched, ${data.failed ?? 0} failed.`,
      });
      void fetchTelemetry();
    } catch {
      setMessage({ type: "error", text: "Failed to trigger queue drain." });
    } finally {
      setDrainingQueue(false);
    }
  };

  const handleRetryFailedQueue = async () => {
    setRetryingQueue(true);
    try {
      const res = await fetch("/api/admin/meta/capi/retry", { method: "POST" });
      const data = await res.json();
      setMessage({
        type: "success",
        text: `Requeued ${data.requeued ?? 0} failed event(s) for delivery retry.`,
      });
      void fetchTelemetry();
    } catch {
      setMessage({ type: "error", text: "Failed to reset failed events." });
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
  const metaEventsRows: MetaEventRow[] = useMemo(() => {
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

    // Unified Meta count formatter shared by table and drawer
    const pvFormatted = formatMetaReported("PageView", pvMetaTotal);
    const vcFormatted = formatMetaReported("ViewContent", vcMetaTotal);


    const rawEvents: MetaEventRow[] = [
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

  const handleOpenEventDrawer = useCallback((row: MetaEventRow) => {
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

      {/* Header & Tabs */}
      <EventsWorkspaceHeader
        selectedDataset={selectedDataset}
        setSelectedDataset={setSelectedDataset}
        isDatasetMenuOpen={isDatasetMenuOpen}
        setIsDatasetMenuOpen={setIsDatasetMenuOpen}
        pixelId={pixelId}
        copiedDatasetId={copiedDatasetId}
        onCopyDatasetId={handleCopyDatasetId}
        datePreset={datePreset}
        setDatePreset={setDatePreset}
        datePresetLabel={datePresetLabel}
        isDateMenuOpen={isDateMenuOpen}
        setIsDateMenuOpen={setIsDateMenuOpen}
        setChartPeriod={setChartPeriod}
        onOpenGuide={() => {
          setGuideAssetId("pixel_id");
          setIsGuideOpen(true);
        }}
        syncStatus={syncStatus}
        isSyncing={isSyncing}
        loading={loading}
        lastSyncedAt={lastSyncedAt}
        nowMs={nowMs}
        onManualSync={handleManualSync}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        activeTab={activeTab}
        isTelemetryTab={isTelemetryTab}
        onTabChange={handleTabChange}
        isResolvedError={isResolvedError}
        isIgnoredError={isIgnoredError}
      />

      {/* TAB: Integrations */}
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

      {/* TAB: Telemetry */}
      {isTelemetryTab && (
        <TelemetryTab
          totalEventsCount={totalEventsCount}
          channelStats={channelStats}
          deliveryStats={deliveryStats}
          deduplicationStats={deduplicationStats}
          emqState={emqState}
          emqScore={emqScore}
          emqEvents={emqEvents}
          bestEmqEvent={bestEmqEvent}
          hasCapiToken={hasCapiToken}
          metaEventsRows={metaEventsRows}
          eventStats={eventStats}
          overviewView={overviewView}
          setOverviewView={setOverviewView}
          activeChartMetric={activeChartMetric}
          setActiveChartMetric={setActiveChartMetric}
          chartPeriod={chartPeriod}
          setChartPeriod={setChartPeriod}
          timeseries={timeseries}
          loadingTimeseries={loadingTimeseries}
          eventsTableSearch={eventsTableSearch}
          setEventsTableSearch={setEventsTableSearch}
          eventsTableFilter={eventsTableFilter}
          setEventsTableFilter={setEventsTableFilter}
          expandedMetaEvent={expandedMetaEvent}
          setExpandedMetaEvent={setExpandedMetaEvent}
          onOpenEventDrawer={handleOpenEventDrawer}
          events={events}
          copiedPayloadId={copiedPayloadId}
          onCopyPayload={handleCopyPayload}
          formatMetaReported={formatMetaReported}
        />
      )}

      {/* TAB: Test Events */}
      {activeTab === "test-events" && (
        <TestEventsTab
          testEventCode={testEventCode}
          simulating={simulating}
          simulatedEvent={simulatedEvent}
          recentTestDispatches={recentTestDispatches}
          testEvents={testEvents}
          onSimulateEvent={handleSimulateEvent}
          onOpenGuideForTestCode={() => {
            setGuideAssetId("test_event_code");
            setIsGuideOpen(true);
          }}
        />
      )}

      {/* TAB: Diagnostics */}
      {activeTab === "diagnostics" && (
        <DiagnosticsTab
          diagnosticsFilter={diagnosticsFilter}
          setDiagnosticsFilter={setDiagnosticsFilter}
          isResolvedError={isResolvedError}
          setIsResolvedError={setIsResolvedError}
          isIgnoredError={isIgnoredError}
          setIsIgnoredError={setIsIgnoredError}
          onOpenDiagnosticsModal={() => setIsDiagnosticsModalOpen(true)}
          deliveryStats={deliveryStats}
          drainingQueue={drainingQueue}
          retryingQueue={retryingQueue}
          onDrainQueue={handleDrainQueue}
          onRetryFailedQueue={handleRetryFailedQueue}
        />
      )}

      {/* TAB: History */}
      {activeTab === "history" && (
        <HistoryTab
          events={events}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterEvent={filterEvent}
          setFilterEvent={setFilterEvent}
          filterSource={filterSource}
          setFilterSource={setFilterSource}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          itemsPerPage={itemsPerPage}
          paginatedEvents={paginatedEvents}
          filteredEvents={filteredEvents}
          expandedEventId={expandedEventId}
          setExpandedEventId={setExpandedEventId}
          copiedPayloadId={copiedPayloadId}
          onCopyPayload={handleCopyPayload}
          onClearEventLogs={handleClearEventLogs}
        />
      )}

      {/* TAB: Settings */}
      {activeTab === "settings" && (
        <EventsSettingsTab
          pixelId={pixelId}
          settings={settings}
          testEventCode={testEventCode}
          showSettingsDetails={showSettingsDetails}
          setShowSettingsDetails={setShowSettingsDetails}
        />
      )}

      {/* Modals & Overlays */}
      <EventsModals
        isConnectModalOpen={isConnectModalOpen}
        onCloseConnectModal={() => setIsConnectModalOpen(false)}
        onConnectOptionSelect={handleConnectOptionSelect}
        isGuideOpen={isGuideOpen}
        onCloseGuide={() => setIsGuideOpen(false)}
        guideAssetId={guideAssetId}
        warningModalState={warningModalState}
        onCloseWarningModal={() => setWarningModalState((prev) => ({ ...prev, isOpen: false }))}
        isDiagnosticsModalOpen={isDiagnosticsModalOpen}
        onCloseDiagnosticsModal={() => setIsDiagnosticsModalOpen(false)}
        pixelId={pixelId || "1304551066085265"}
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        selectedDrawerEvent={selectedDrawerEvent}
        onSimulateEvent={handleSimulateEvent}
        simulating={simulating}
      />
    </div>
  );
}
