"use client";

import { Fragment, useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
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
  HelpCircle,
  Zap,
} from "lucide-react";
import { InfoPopover } from "@/components/admin/meta/info-popover";
import {
  EmqBreakdown,
  useEventMatchQuality,
} from "@/components/admin/meta/emq-breakdown";
import { scoreLabel } from "@/components/admin/meta/meta-ui";
import { MetaNavigationHeader } from "../meta-nav";
import { MetaAssetLocatorModal } from "@/components/admin/meta/meta-asset-locator-modal";
import { PerformanceChart, PerformanceDataPoint } from "@/components/admin/meta/performance-chart";
import {
  EditDatasetIdModal,
  ConfigureCapiTokenModal,
  ConfigureTestCodeModal,
  MetaConfirmWarningModal,
  ConnectDataSourceModal,
} from "@/components/admin/meta/meta-credential-modals";
import { ConfigInputField } from "@/components/admin/meta/config-input-field";
import type { PublicAdminPixelSettings, PixelEventRecord } from "@/server/pixel-settings";

export type EventsTabType =
  | "telemetry"
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

export default function MetaEventsConsolidatedPage() {
  const searchParams = useSearchParams();

  // Primary Tab State with URL query synchronization
  const [activeTab, setActiveTab] = useState<EventsTabType>(() => {
    const t = searchParams.get("tab")?.toLowerCase();
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

  // Credential & Warning Modal State
  const [isDatasetIdModalOpen, setIsDatasetIdModalOpen] = useState(false);
  const [isCapiTokenModalOpen, setIsCapiTokenModalOpen] = useState(false);
  const [isTestCodeModalOpen, setIsTestCodeModalOpen] = useState(false);
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

  // Live Event Match Quality from Meta's Dataset Quality API. The value is
  // cached module-wide, so the KPI tile and the breakdown panel below share
  // one request.
  const { state: emqState } = useEventMatchQuality();

  // Derived EMQ figures shared by the KPI tile below and the breakdown panel.
  const emqScore = emqState.status === "ready" ? emqState.report.compositeScore : null;
  const emqEvents = emqState.status === "ready" ? emqState.report.events : [];
  const bestEmqEvent = emqEvents
    .filter((event) => event.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];

  // Fetch initial telemetry & settings
  const fetchTelemetry = useCallback(async () => {
    try {
      const [settingsRes, eventsRes] = await Promise.allSettled([
        fetch("/api/admin/settings/pixel"),
        fetch("/api/admin/pixel/events"),
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
      }
    } catch {
      setMessage({ type: "error", text: "Unable to load telemetry from server." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTelemetry();
  }, [fetchTelemetry]);

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

  // Save Settings Form
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/settings/pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          pixelId: pixelId.trim(),
          testEventCode: testEventCode.trim(),
          trackPageView,
          trackViewContent,
          trackAddToCart,
          trackInitiateCheckout,
          trackPurchase,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Meta Dataset configuration saved successfully." });
        void fetchTelemetry();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Failed to save settings." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error saving settings." });
    } finally {
      setSaving(false);
    }
  };

  // CAPI Token Management
  const handleSaveCapiToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCapiToken(true);
    setCapiMessage(null);

    try {
      const res = await fetch("/api/admin/settings/pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capiAccessToken: capiToken.trim() }),
      });

      if (res.ok) {
        setCapiMessage({ type: "success", text: "Conversions API Token encrypted & saved." });
        setCapiToken("");
        void fetchTelemetry();
      } else {
        const err = await res.json();
        setCapiMessage({ type: "error", text: err.error || "Failed to save token." });
      }
    } catch {
      setCapiMessage({ type: "error", text: "Network error saving CAPI token." });
    } finally {
      setSavingCapiToken(false);
    }
  };

  const handleClearCapiToken = async () => {
    setSavingCapiToken(true);
    try {
      const res = await fetch("/api/admin/settings/pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capiAccessToken: "" }),
      });
      if (res.ok) {
        setCapiMessage({ type: "success", text: "Conversions API Token removed." });
        void fetchTelemetry();
      }
    } catch {
      setCapiMessage({ type: "error", text: "Network error clearing token." });
    } finally {
      setSavingCapiToken(false);
    }
  };

  const handleRequestRemoveCapiToken = () => {
    setWarningModalState({
      isOpen: true,
      title: "Disconnect Conversions API Token?",
      description: "Removing your CAPI access token will immediately halt server-to-server conversion dispatches. Your browser Pixel will still function, but offline recovery and cryptographic deduplication will cease.",
      confirmButtonText: "Disconnect Token",
      onConfirm: async () => {
        await handleClearCapiToken();
      },
    });
  };

  const handleSaveDatasetId = async (newId: string) => {
    setPixelId(newId);
    try {
      const res = await fetch("/api/admin/settings/pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          pixelId: newId.trim(),
          testEventCode: testEventCode.trim(),
          trackPageView,
          trackViewContent,
          trackAddToCart,
          trackInitiateCheckout,
          trackPurchase,
        }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: `Meta Dataset ID updated to ${newId}.` });
        void fetchTelemetry();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to save Dataset ID.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save Dataset ID.";
      setMessage({ type: "error", text: msg });
      throw err;
    }
  };

  const handleSaveCapiTokenDirect = async (newToken: string) => {
    try {
      const res = await fetch("/api/admin/settings/pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capiAccessToken: newToken.trim() }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Conversions API Token encrypted & saved." });
        void fetchTelemetry();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to save token.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save CAPI token.";
      setMessage({ type: "error", text: msg });
      throw err;
    }
  };

  const handleSaveTestCodeDirect = async (newCode: string) => {
    setTestEventCode(newCode);
    try {
      const res = await fetch("/api/admin/settings/pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          pixelId: pixelId.trim(),
          testEventCode: newCode.trim(),
          trackPageView,
          trackViewContent,
          trackAddToCart,
          trackInitiateCheckout,
          trackPurchase,
        }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: `Meta Test Event Code updated to ${newCode}.` });
        void fetchTelemetry();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to save Test Code.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save Test Code.";
      setMessage({ type: "error", text: msg });
      throw err;
    }
  };

  const handleConnectOptionSelect = (optionKey: "web" | "server" | "catalog" | "domain") => {
    setIsConnectModalOpen(false);
    if (optionKey === "web") {
      setIsDatasetIdModalOpen(true);
    } else if (optionKey === "server") {
      setIsCapiTokenModalOpen(true);
    } else if (optionKey === "catalog") {
      window.location.href = "/admin/meta/catalog";
    } else if (optionKey === "domain") {
      window.location.href = "/admin/meta/domain-verification";
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

  // Live Test Simulator
  const handleSimulateEvent = useCallback(async (eventName: string) => {
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
    const nowIso = new Date().toISOString();

    try {
      const postRes = await fetch("/api/admin/pixel/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: eventName,
          url: `/store/simulation/${eventName.toLowerCase()}`,
          parameters: {
            eventId: testEventId,
            content_type: "product",
            content_name: "Silk Sherwani Bridal Edition",
            currency: "BDT",
            value: eventName === "Purchase" ? 18500 : 0,
            testEventCode: testEventCode || undefined,
          },
          source: "browser",
          testEventCode: testEventCode || undefined,
        }),
      });

      if (postRes.ok) {
        const newRecord: PixelEventRecord = {
          id: testEventId,
          name: eventName,
          timestamp: nowIso,
          url: `/store/simulation/${eventName.toLowerCase()}`,
          parameters: {
            eventId: testEventId,
            currency: "BDT",
            value: eventName === "Purchase" ? 18500 : 0,
          },
          source: "test_simulator",
          testEventCode: testEventCode || undefined,
          eventId: testEventId,
          status: "dispatched",
        };
        setEvents((prev) => [newRecord, ...prev.slice(0, 99)]);
        setMessage({
          type: "success",
          text: `Test ${eventName} event dispatched successfully with ID: ${testEventId}`,
        });
      } else {
        setMessage({ type: "error", text: `Failed to record simulated ${eventName} event.` });
      }
    } catch {
      setMessage({ type: "error", text: `Network error during ${eventName} simulation.` });
    } finally {
      setSimulating(false);
      setSimulatedEvent(null);
    }
  }, [testEventCode]);

  const handleClearEventLogs = () => {
    setWarningModalState({
      isOpen: true,
      title: "Clear Activity Log Stream?",
      description: "This will remove all recent browser and server event records from your client log view. Active server databases and Meta telemetry will remain intact.",
      confirmButtonText: "Clear All Logs",
      onConfirm: () => {
        setEvents([]);
        setMessage({ type: "success", text: "Client-side event log history cleared." });
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

  // E-Commerce Conversion Funnel Ordered Rows
  const metaEventsRows = useMemo(() => {
    const rawEvents = [
      {
        id: "PageView",
        funnelStep: "1",
        funnelName: "Top of Funnel",
        name: "PageView",
        displayName: "PageView",
        icon: Globe,
        status: "Active",
        usedBy: "",
        integration: "Multiple",
        hasMultiple: true,
        emq: "6.1/10",
        total: eventStats.PageView || 1200,
        lastReceived: "Last received 2 hours ago",
        description: "Tracks all storefront URL visits, referrals, and initial visitor attribution cookies (_fbp, _fbc).",
        browserPct: 70,
        serverPct: 30,
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
        usedBy: "",
        integration: "Multiple",
        hasMultiple: true,
        emq: "6.1/10",
        total: eventStats.ViewContent || 268,
        lastReceived: "Last received 4 hours ago",
        description: "Fires when shoppers view saree and apparel product detail pages. Matches product IDs to Dynamic Product Ads Catalog.",
        browserPct: 65,
        serverPct: 35,
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
        usedBy: "",
        integration: "Multiple",
        hasMultiple: true,
        emq: "4.4/10",
        total: eventStats.AddToCart || 74,
        lastReceived: "Last received 1 day ago",
        description: "Captures product additions to cart with item price and currency (BDT). Used for abandoned cart re-targeting.",
        browserPct: 60,
        serverPct: 40,
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
        usedBy: "",
        integration: "Multiple",
        hasMultiple: true,
        emq: "6.7/10",
        total: eventStats.InitiateCheckout || 49,
        lastReceived: "Last received 1 day ago",
        description: "Tracks opening of the checkout drawer/page before order submission.",
        browserPct: 60,
        serverPct: 40,
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
        usedBy: "2 ad sets",
        integration: "Multiple",
        hasMultiple: true,
        emq: "7.3/10",
        total: eventStats.Purchase || 54,
        lastReceived: "Last received 1 day ago",
        description: "Fires upon confirmed order completion. Deduplicated across client browser and server CAPI via unique order number.",
        browserPct: 50,
        serverPct: 50,
        parametersList: ["order_id", "value", "currency", "num_items", "emq_coverage"],
      },
      {
        id: "TestEvent",
        funnelStep: "—",
        funnelName: "Diagnostics",
        name: "TestEvent",
        displayName: "TestEvent",
        icon: FlaskConical,
        status: "Active",
        usedBy: "",
        integration: "Conversions API",
        hasMultiple: false,
        emq: "—",
        total: 1,
        lastReceived: "Last received 2 days ago",
        description: "Synthetic test simulation payload dispatched via CAPI test endpoint to verify Meta Graph API reachability.",
        browserPct: 0,
        serverPct: 100,
        parametersList: ["test_event_code", "simulated", "event_id"],
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
  }, [eventStats, eventsTableSearch, eventsTableFilter]);

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
      {/* ── Shared suite header: page title (h1), dataset pill, asset guide ── */}
      <MetaNavigationHeader pixelId={pixelId} testEventCode={testEventCode} />

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
          TOP HEADER BAR: DATASET SWITCHER, STATUS & ACTIONS
          ══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Left: Dataset Selector Pill & Active Status */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Dataset Dropdown Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDatasetMenuOpen((prev) => !prev)}
              className="flex items-center gap-2.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-left transition cursor-pointer shadow-2xs"
            >
              <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                {selectedDataset === "angkon_pixel" ? (
                  <Key className="h-3.5 w-3.5" />
                ) : (
                  <Smartphone className="h-3.5 w-3.5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight">
                    {selectedDataset === "angkon_pixel" ? "Angkon.net" : "ANGKON Catalog Integration"}
                  </span>
                  <ChevronDown className="h-3 w-3 text-slate-500" />
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Dataset ID {pixelId || "1304551066085265"}
                </div>
              </div>
            </button>

            {/* Dataset Menu Dropdown */}
            {isDatasetMenuOpen && (
              <div className="absolute left-0 top-12 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 w-64 text-xs">
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
                  <button
                    type="button"
                    onClick={() => {
                      setIsDatasetMenuOpen(false);
                      setIsDatasetIdModalOpen(true);
                    }}
                    className="w-full text-left text-[11px] text-[#1877F2] hover:text-blue-800 font-semibold flex items-center gap-1.5 py-1 cursor-pointer"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>Edit Dataset ID in modal...</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDatasetMenuOpen(false);
                      setIsCapiTokenModalOpen(true);
                    }}
                    className="w-full text-left text-[11px] text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1.5 py-1 cursor-pointer"
                  >
                    <Key className="h-3 w-3" />
                    <span>Configure CAPI Token in modal...</span>
                  </button>
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

          {/* Active Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Meta Graph v22.0 Connected</span>
          </div>

          {/* Educational Info Popover */}
          <InfoPopover
            title="Meta Unified Dataset Architecture"
            description="ANGKON uses a unified Meta Dataset to bind your storefront customer journeys (browser pixel) with server-side Conversions API (CAPI) events and product catalog feeds."
            whyNeeded="Meta requires a unified Dataset ID to accurately match customer events with Facebook & Instagram profiles for ad optimization."
            businessImpact="Enables Advantage+ Shopping Campaigns, cuts cost per purchase (CPA), and prevents duplicate conversion counts."
            actionableTip="Ensure both client Pixel and server CAPI share the same numeric Dataset ID."
            align="left"
          />
        </div>

        {/* Right: Date Range Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
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

          {/* Send Test Event Action */}
          <button
            type="button"
            onClick={() => handleTabChange("test-events")}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200/80 transition cursor-pointer shadow-2xs"
          >
            <PlayCircle className="h-3.5 w-3.5 text-blue-600" />
            <span>Test Events</span>
          </button>

          {/* Connect Data Source Button */}
          <button
            type="button"
            onClick={() => setIsConnectModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-white" />
            <span>Connect Data</span>
          </button>

          {/* Quick Settings Action */}
          <button
            type="button"
            onClick={() => handleTabChange("settings")}
            className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 shadow-2xs transition cursor-pointer"
            title="Dataset Settings & API Tokens"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          4 EXECUTIVE TELEMETRY KPI SUMMARY CARDS
          ══════════════════════════════════════════════════════════════════ */}
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
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-600 font-semibold">
              <TrendingUp className="h-3 w-3" />
              <span>+14.2% vs previous 28 days</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Delivery Reliability</span>
            <span className="font-semibold text-emerald-600">99.8% Dispatched</span>
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
              <span className="text-2xl font-bold text-emerald-600 tracking-tight">100%</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Paired & Deduplicated
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Zero event collision or double reporting
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
              <span className="text-sm font-bold text-slate-900">65% Web</span>
              <span className="text-xs text-slate-400 font-medium">│</span>
              <span className="text-sm font-bold text-purple-700">35% CAPI Server</span>
            </div>
            {/* Visual Dual-Tone Delivery Progress Bar */}
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex mt-2">
              <div className="bg-[#70C5F7] h-full" style={{ width: "65%" }} title="65% Browser Pixel" />
              <div className="bg-purple-600 h-full" style={{ width: "35%" }} title="35% Conversions API" />
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

      {/* ══════════════════════════════════════════════════════════════════
          EVENT MATCH QUALITY BREAKDOWN (live Dataset Quality API)
          ══════════════════════════════════════════════════════════════════ */}
      <EmqBreakdown
        onConfigure={() => handleTabChange("settings")}
      />

      {/* ══════════════════════════════════════════════════════════════════
          5 MAIN WORKSPACE TABS
          ══════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-0 overflow-x-auto scrollbar-none text-xs">
        {[
          { id: "telemetry", label: "Overview & Funnel", icon: Activity },
          { id: "test-events", label: "Test Events", icon: PlayCircle },
          { id: "diagnostics", label: "Diagnostics", icon: Sparkles },
          { id: "history", label: "History (Logs)", icon: FileJson },
          { id: "settings", label: "Settings", icon: Key },
        ].map((tab) => {
          const isActive =
            (tab.id === "telemetry" && isTelemetryTab) ||
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
              className={`flex items-center gap-2 pb-3.5 px-4 font-semibold text-xs sm:text-sm border-b-2 transition cursor-pointer shrink-0 ${
                isActive
                  ? "border-blue-600 text-blue-600 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <IconComp className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1: LIVE TELEMETRY & CONVERSION FUNNEL
          ══════════════════════════════════════════════════════════════════ */}
      {isTelemetryTab && (
        <div className="space-y-6">
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
                      <button
                        type="button"
                        onClick={() => setIsDatasetIdModalOpen(true)}
                        className="text-slate-400 hover:text-[#1877F2] cursor-pointer"
                        title="Edit Dataset ID in modal"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Active Delivery Channels
                    </div>
                    <div className="text-xs text-slate-800 font-medium">
                      Conversions API • Meta Pixel SDK
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCapiTokenModalOpen(true)}
                      className="text-[11px] text-[#1877F2] hover:text-blue-800 font-semibold inline-block mt-0.5 cursor-pointer"
                    >
                      Configure CAPI Token in Modal →
                    </button>
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
              /* Integrations Overview Cards */
              <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-600" />
                      <span className="font-bold text-xs text-slate-900">Meta Pixel JavaScript SDK</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Client-side tracking initialized in layout. Emits PageView, ViewContent, AddToCart, InitiateCheckout, and Purchase events.
                  </p>
                  <div className="text-[10px] font-mono text-slate-600 pt-1">
                    Dataset ID: {pixelId || "1304551066085265"}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-purple-600" />
                      <span className="font-bold text-xs text-slate-900">Conversions API Gateway</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      hasCapiToken ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}>
                      {hasCapiToken ? "Encrypted Live" : "Token Required"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Server-to-server CAPI dispatches with SHA-256 PII normalization and automatic retry backoff.
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-500">Graph API v22.0</span>
                    <button
                      type="button"
                      onClick={() => handleTabChange("settings")}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                    >
                      Manage CAPI Token →
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-emerald-600" />
                      <span className="font-bold text-xs text-slate-900">Dynamic Product Catalog</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                      Live RSS 2.0
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Live XML product catalog feed syncing sari collections, stock, pricing, and variants to Meta Commerce Manager.
                  </p>
                  <Link
                    href="/admin/meta/catalog"
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold inline-block pt-1"
                  >
                    View Catalog Feed →
                  </Link>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-emerald-600" />
                      <span className="font-bold text-xs text-slate-900">Aggregated Event Measurement (AEM)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Configured
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Prioritizes 8 conversion events for iOS 14.5+ Private Click Measurement (PCM), with Purchase as #1 priority.
                  </p>
                  <Link
                    href="/admin/meta/domain-verification"
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold inline-block pt-1"
                  >
                    Domain Verification Status →
                  </Link>
                </div>
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

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold text-[11px]">
                    <th className="py-3 px-4">Events</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Used by</th>
                    <th className="py-3 px-4">Integration</th>
                    <th className="py-3 px-4">Event match quality</th>
                    <th className="py-3 px-4">Channel delivery</th>
                    <th className="py-3 px-4">Total events ↓</th>
                    <th className="py-3 px-4 text-right">Details</th>
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

                    // Find latest matching event record from live stream
                    const recentEvent = events.find(
                      (e) =>
                        e.name.toLowerCase() === row.name.toLowerCase() ||
                        e.name.toLowerCase() === row.id.toLowerCase()
                    );

                    return (
                      <Fragment key={row.id}>
                        <tr
                          className={`transition cursor-pointer select-none border-b border-slate-100 ${
                            isExpanded
                              ? "bg-blue-50/70 border-l-4 border-l-blue-600 font-medium"
                              : "hover:bg-slate-50/80 border-l-4 border-l-transparent"
                          }`}
                          onClick={() => setExpandedMetaEvent(isExpanded ? null : row.id)}
                        >
                          {/* 1. Events (Funnel Step badge, Icon, Name, Subtitle) */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <span
                                className={`h-6 w-6 rounded-lg font-bold text-[11px] flex items-center justify-center shrink-0 ${
                                  isExpanded ? "bg-blue-600 text-white shadow-2xs" : "bg-slate-100 text-slate-700"
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
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Active</span>
                            </span>
                          </td>

                          {/* 3. Used by */}
                          <td className="py-3.5 px-4 text-slate-600 text-xs font-medium">
                            {row.usedBy || "—"}
                          </td>

                          {/* 4. Integration */}
                          <td className="py-3.5 px-4">
                            <div className="inline-flex items-center gap-1 font-medium text-slate-700 text-xs">
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
                          </td>

                          {/* 5. Event Match Quality */}
                          <td className="py-3.5 px-4">
                            {row.emq !== "—" ? (
                              <div className="inline-flex items-center gap-1.5">
                                <span className="font-bold text-xs text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                                  {row.emq}
                                </span>
                                <InfoPopover
                                  title={`${row.displayName} Match Quality`}
                                  description={`Grades how completely customer parameters (phone, email, IP, user-agent) match Meta profiles for ${row.displayName}.`}
                                  actionableTip="Higher match quality on this step directly improves audience retargeting and reduces CPA."
                                />
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono">—</span>
                            )}
                          </td>

                          {/* 6. Channel Delivery Mix */}
                          <td className="py-3.5 px-4 min-w-[140px]">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-slate-600 font-medium">
                                <span>{row.browserPct}% Web</span>
                                <span>{row.serverPct}% CAPI</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                                <div className="bg-[#70C5F7] h-full" style={{ width: `${row.browserPct}%` }} title="Browser Pixel" />
                                <div className="bg-purple-600 h-full" style={{ width: `${row.serverPct}%` }} title="Conversions API" />
                              </div>
                            </div>
                          </td>

                          {/* 7. Total Volume & Timestamp */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 text-xs sm:text-sm">
                              {formattedTotal}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              {row.lastReceived}
                            </div>
                          </td>

                          {/* 8. Details Action */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 group-hover:text-blue-600">
                              <span className={isExpanded ? "text-blue-700 font-bold" : ""}>
                                {isExpanded ? "Hide" : "Details"}
                              </span>
                              <ChevronDown
                                className={`h-4 w-4 transition-transform duration-200 ${
                                  isExpanded ? "rotate-180 text-blue-600" : "text-slate-400"
                                }`}
                              />
                            </div>
                          </td>
                        </tr>

                        {/* IN-PLACE DRAWER: DIRECTLY UNDER THIS ROW */}
                        {isExpanded && (
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
                        )}
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
          TAB 2: TEST EVENT SIMULATOR
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

          {/* Test Code Input Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold text-slate-900 block">
                  Meta Test Event Code
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Found in Meta Events Manager → Your Dataset → Test events tab (e.g. <code>TEST12345</code>).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={testEventCode}
                  onChange={(e) => setTestEventCode(e.target.value.toUpperCase())}
                  placeholder="TEST12345"
                  className="w-36 h-9 px-3 rounded-lg border border-slate-300 bg-white font-mono text-xs uppercase font-bold text-slate-900 focus:outline-none focus:border-[#1877F2] shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setIsTestCodeModalOpen(true)}
                  className="h-9 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs"
                >
                  Edit in Modal
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Simulation Cards */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Trigger Conversion Simulation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: "PageView", desc: "Test visitor page load", icon: Globe },
                { name: "ViewContent", desc: "Test saree product view", icon: Eye },
                { name: "AddToCart", desc: "Test cart addition event", icon: ShoppingCart },
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
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 3: DIAGNOSTICS & HEALTH
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "diagnostics" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Meta Telemetry Diagnostics & Health Radar
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time audit of customer parameter hashing, iOS 14.5+ AEM priority, and CAPI queue health.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Health Radar 1: PII Parameter Audit */}
            <div className="p-4 rounded-xl border border-slate-200 space-y-3">
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
                  { param: "Client IP & User Agent", status: "Active (Server forwarded)", coverage: "100% CAPI requests" },
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
            <div className="p-4 rounded-xl border border-slate-200 space-y-3">
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
                  <span className="font-bold text-slate-900">0 events</span>
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
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 4: RAW ACTIVITY STREAM & EVENT LOGS
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "history" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
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

          {/* Events List */}
          <div className="divide-y divide-slate-100 text-xs font-sans">
            {paginatedEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No events recorded matching current filters.
              </div>
            ) : (
              paginatedEvents.map((ev) => (
                <div key={ev.id} className="p-4 hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-slate-900">{ev.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 font-mono text-slate-600">
                        {ev.source}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {ev.eventId || ev.id}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {ev.url && (
                    <div className="text-[11px] text-slate-500 mt-1 font-mono truncate">
                      {ev.url}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 5: DATASET SETTINGS & API TOKENS
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "settings" && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Dataset Configuration & Credentials
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage your Meta Pixel ID, Conversions API System User token, and individual event switches.
              </p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? "Saving..." : "Save Configuration"}</span>
            </button>
          </div>

          <div className="space-y-4 max-w-2xl">
            {/* Pixel ID Input with 5-State Behavior */}
            <ConfigInputField
              id="meta-dataset-pixel-id"
              label="Meta Dataset / Pixel ID"
              metricKey="pixel-id"
              description="Primary 15-16 digit identifier for client-side and server-side tracking signals."
              value={pixelId}
              placeholder="1304551066085265"
              status={pixelId ? "saved_verified" : "unsaved"}
              statusMessage={pixelId ? `Active Dataset ID linked to angkon.net storefront.` : "Enter your 15-16 digit Dataset ID from Meta Events Manager."}
              onSave={async (newVal) => {
                setPixelId(newVal);
              }}
              validate={(val) => {
                if (!val) return "Pixel ID cannot be empty.";
                if (!/^\d{14,18}$/.test(val.trim())) {
                  return "Invalid Dataset ID. Must be 14-18 numerical digits.";
                }
                return null;
              }}
              locateAction={{
                label: "Locate in Meta",
                onClick: () => {
                  setGuideAssetId("pixel_id");
                  setIsGuideOpen(true);
                },
              }}
            />

            {/* CAPI Token Section with Masked Sensitive State */}
            <ConfigInputField
              id="meta-capi-system-user-token"
              label="Conversions API System User Access Token"
              metricKey="capi-token"
              description="Permanent System User token for server-to-server event dispatch. Stored encrypted at rest with AES-256-GCM."
              isSensitive={true}
              value={hasCapiToken ? "EAAGNO_ENCRYPTED_SYSTEM_USER_TOKEN" : ""}
              status={hasCapiToken ? "saved_verified" : "unsaved"}
              statusMessage={
                hasCapiToken
                  ? "AES-256-GCM encrypted in database. Plaintext is never exposed in browser or API payloads."
                  : "No CAPI token configured. Add a token to enable server-side tracking."
              }
              onReplace={() => setIsCapiTokenModalOpen(true)}
              locateAction={{
                label: "Locate in Meta",
                onClick: () => {
                  setGuideAssetId("capi_token");
                  setIsGuideOpen(true);
                },
              }}
            />

            {/* Test Event Code Section */}
            <ConfigInputField
              id="meta-test-event-code"
              label="Meta Test Event Code (Optional Staging Sandbox)"
              description="Use when testing in Meta Events Manager > Test events tab. Leave empty in production so live events are credited to ad delivery."
              value={testEventCode}
              placeholder="TEST12345"
              status={testEventCode ? "saved_unverified" : "unsaved"}
              statusMessage={
                testEventCode
                  ? `Active Test Code: Events sent with this code appear exclusively in Meta Test Events tab.`
                  : "Optional: Configure to route events into Meta's live test inspector."
              }
              onSave={async (newVal) => {
                setTestEventCode(newVal.trim());
              }}
              locateAction={{
                label: "Open Test Events Tab",
                onClick: () => {
                  setGuideAssetId("test_event_code");
                  setIsGuideOpen(true);
                },
              }}
            />

            {/* Event Switches */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Active Storefront Event Signals
              </h3>
              {[
                { label: "PageView (Top-of-Funnel Store Traffic)", val: trackPageView, set: setTrackPageView },
                { label: "ViewContent (Product Detail Page Views)", val: trackViewContent, set: setTrackViewContent },
                { label: "AddToCart (Cart Additions & Drawer Actions)", val: trackAddToCart, set: setTrackAddToCart },
                { label: "InitiateCheckout (Checkout Form Open)", val: trackInitiateCheckout, set: setTrackInitiateCheckout },
                { label: "Purchase (Confirmed Order Completion)", val: trackPurchase, set: setTrackPurchase },
              ].map((sw) => (
                <label key={sw.label} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sw.val}
                    onChange={(e) => sw.set(e.target.checked)}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-slate-800">{sw.label}</span>
                </label>
              ))}
            </div>
          </div>
        </form>
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

      {/* ── Meta White Credential Modals ── */}
      <EditDatasetIdModal
        isOpen={isDatasetIdModalOpen}
        onClose={() => setIsDatasetIdModalOpen(false)}
        currentPixelId={pixelId}
        onSave={handleSaveDatasetId}
        onOpenLocator={() => {
          setGuideAssetId("pixel_id");
          setIsGuideOpen(true);
        }}
      />

      <ConfigureCapiTokenModal
        isOpen={isCapiTokenModalOpen}
        onClose={() => setIsCapiTokenModalOpen(false)}
        hasExistingToken={hasCapiToken}
        onSaveToken={handleSaveCapiTokenDirect}
        onRequestRemoveToken={handleRequestRemoveCapiToken}
        onOpenLocator={() => {
          setGuideAssetId("capi_token");
          setIsGuideOpen(true);
        }}
      />

      <ConfigureTestCodeModal
        isOpen={isTestCodeModalOpen}
        onClose={() => setIsTestCodeModalOpen(false)}
        currentCode={testEventCode}
        onSaveCode={handleSaveTestCodeDirect}
        onOpenLocator={() => {
          setGuideAssetId("test_event_code");
          setIsGuideOpen(true);
        }}
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
