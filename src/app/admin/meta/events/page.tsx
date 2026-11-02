"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  EyeOff,
  ShoppingCart,
  CreditCard,
  ShoppingBag,
  Sparkles,
  Sliders,
  ShieldCheck,
  PlayCircle,
  ChevronDown,
  ChevronUp,
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
  Terminal,
  Zap,
  Clock,
  RotateCcw,
  Trash2,
  Key,
  Layers,
  Info,
  Plus,
  MoreHorizontal,
  Lock,
  Code,
} from "lucide-react";
import { MetaNavigationHeader } from "../meta-nav";
import type { PublicAdminPixelSettings, PixelEventRecord } from "@/server/pixel-settings";

export type EventsTabType = "events-manager" | "conversions-api" | "diagnostics" | "event-logs";

export default function MetaEventsConsolidatedPage() {
  const searchParams = useSearchParams();

  // Tab State with URL query synchronization
  const [activeTab, setActiveTab] = useState<EventsTabType>(() => {
    const t = searchParams.get("tab")?.toLowerCase();
    if (t === "conversions-api" || t === "capi") return "conversions-api";
    if (t === "diagnostics") return "diagnostics";
    if (t === "event-logs" || t === "logs" || t === "activity") return "event-logs";
    return "events-manager";
  });

  const handleTabChange = (tab: EventsTabType) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // Shared Data State
  const [settings, setSettings] = useState<PublicAdminPixelSettings | null>(null);
  const [events, setEvents] = useState<PixelEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedDatasetId, setCopiedDatasetId] = useState(false);
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);
  const [copiedPayloadId, setCopiedPayloadId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Tab 1 (Events Manager) Settings Form State
  const [enabled, setEnabled] = useState(true);
  const [pixelId, setPixelId] = useState("");
  const [assetSearchQuery, setAssetSearchQuery] = useState("");
  const [trackPageView, setTrackPageView] = useState(true);
  const [trackViewContent, setTrackViewContent] = useState(true);
  const [trackAddToCart, setTrackAddToCart] = useState(true);
  const [trackInitiateCheckout, setTrackInitiateCheckout] = useState(true);
  const [trackPurchase, setTrackPurchase] = useState(true);

  // Tab 2 (Conversions API) State
  const [capiToken, setCapiToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [savingCapiToken, setSavingCapiToken] = useState(false);
  const [testingCapi, setTestingCapi] = useState(false);
  const [drainingQueue, setDrainingQueue] = useState(false);
  const [retryingQueue, setRetryingQueue] = useState(false);
  const [copiedCapiPayload, setCopiedCapiPayload] = useState(false);
  const [capiMessage, setCapiMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [capiTestResult, setCapiTestResult] = useState<Record<string, unknown> | null>(null);

  // Tab 3 (Diagnostics) State
  const [testEventCode, setTestEventCode] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [simulatedEvent, setSimulatedEvent] = useState<string | null>(null);

  // Tab 4 (Event Logs) Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEvent, setFilterEvent] = useState<string>("ALL");
  const [filterSource, setFilterSource] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterDate, setFilterDate] = useState<"all" | "24h" | "today">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [inspectionTab, setInspectionTab] = useState<"payload" | "validation">("payload");

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

  // Window-level real-time event listener for storefront events
  useEffect(() => {
    const handleLocalEvent = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail) {
        const detail = custom.detail;
        const newRecord: PixelEventRecord = {
          id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: detail.name,
          timestamp: detail.timestamp || new Date().toISOString(),
          url: detail.url || window.location.pathname,
          parameters: detail.parameters || {},
          source: "browser",
          testEventCode: detail.testEventCode,
          eventId:
            typeof detail.parameters?.eventId === "string"
              ? detail.parameters.eventId
              : typeof detail.parameters?.event_id === "string"
              ? detail.parameters.event_id
              : undefined,
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

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save settings");
      }

      const updated = await res.json();
      setSettings(updated);
      setMessage({ type: "success", text: "Meta configuration saved successfully!" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save settings",
      });
    } finally {
      setSaving(false);
    }
  };

  // Save CAPI Access Token
  const handleSaveCapiToken = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = capiToken.trim();
    if (!cleanToken) return;

    if (cleanToken.startsWith("{") || cleanToken.startsWith("[") || cleanToken.includes('"event_name"')) {
      setCapiMessage({
        type: "error",
        text: "You pasted JSON data instead of a Meta Access Token. A valid Meta Access Token starts with 'EAA'.",
      });
      return;
    }

    setSavingCapiToken(true);
    setCapiMessage(null);

    try {
      const res = await fetch("/api/admin/settings/pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capiAccessToken: cleanToken }),
      });

      if (!res.ok) throw new Error("Failed to save Conversions API token");

      const updated = await res.json();
      setSettings(updated);
      setCapiToken("");
      setCapiMessage({ type: "success", text: "Conversions API token encrypted and saved successfully!" });
    } catch (err) {
      setCapiMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save Conversions API token",
      });
    } finally {
      setSavingCapiToken(false);
    }
  };

  // Clear CAPI Token
  const handleClearCapiToken = async () => {
    if (!confirm("Are you sure you want to remove the Conversions API access token?")) return;
    setSavingCapiToken(true);
    setCapiMessage(null);
    try {
      const res = await fetch("/api/admin/settings/pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capiAccessToken: "" }),
      });
      if (!res.ok) throw new Error("Failed to remove token");
      const updated = await res.json();
      setSettings(updated);
      setCapiMessage({ type: "success", text: "Conversions API token removed." });
    } catch (err) {
      setCapiMessage({ type: "error", text: "Failed to remove token." });
    } finally {
      setSavingCapiToken(false);
    }
  };

  // Test CAPI Gateway
  const handleTestCapiGateway = async () => {
    setTestingCapi(true);
    setCapiMessage(null);
    setCapiTestResult(null);

    try {
      const res = await fetch("/api/admin/meta/capi/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: "Purchase",
          testEventCode: testEventCode.trim() || undefined,
        }),
      });

      const data = await res.json();
      setCapiTestResult(data);

      if (data.success && data.status === "accepted") {
        setCapiMessage({
          type: "success",
          text: `Event accepted by Meta Graph API! (fbtrace_id: ${data.fbtraceId || "ok"})`,
        });
      } else if (data.status === "queued" || data.status === "retrying") {
        setCapiMessage({
          type: "success",
          text: `Event scheduled in retry ledger (Status: ${data.status}). Background worker will deliver it.`,
        });
      } else {
        setCapiMessage({
          type: "error",
          text: data.error || "Event was not accepted by Meta. Check error diagnostics below.",
        });
      }
      void fetchTelemetry();
    } catch {
      setCapiMessage({ type: "error", text: "Failed to connect to CAPI test endpoint." });
    } finally {
      setTestingCapi(false);
    }
  };

  // Manual Queue Drain Pass
  const handleDrainQueue = async () => {
    setDrainingQueue(true);
    try {
      const res = await fetch("/api/admin/meta/capi/drain", { method: "POST" });
      const data = await res.json();
      setCapiMessage({
        type: "success",
        text: `Queue pass complete: ${data.processed ?? 0} processed (${data.accepted ?? 0} accepted, ${data.retrying ?? 0} retrying, ${data.failed ?? 0} failed).`,
      });
      void fetchTelemetry();
    } catch {
      setCapiMessage({ type: "error", text: "Failed to execute queue drain pass." });
    } finally {
      setDrainingQueue(false);
    }
  };

  // Retry Failed Events
  const handleRetryFailedQueue = async () => {
    setRetryingQueue(true);
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

  // Live Test Simulator (Tab 3)
  const handleSimulateEvent = useCallback(async (eventName: string) => {
    // Guard: Prevent contaminating live production dataset without a test event code
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
          text: `Simulated ${eventName} event dispatched with eventID ${testEventId}.`,
        });
      }
    } catch {
      setMessage({ type: "error", text: `Failed to dispatch simulated event.` });
    } finally {
      setSimulating(false);
      setSimulatedEvent(null);
    }
  }, [testEventCode]);

  // Clear Stream
  const handleClearActivity = async () => {
    if (!confirm("Clear all recorded telemetry events from local view and database?")) return;
    try {
      const res = await fetch("/api/admin/pixel/events", { method: "DELETE" });
      if (res.ok) {
        setEvents([]);
        setMessage({ type: "success", text: "Activity stream cleared successfully." });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to clear activity stream." });
    }
  };

  // Copy Helpers
  const handleCopyDatasetId = () => {
    const idToCopy = pixelId || settings?.pixelId || "";
    if (!idToCopy) return;
    void navigator.clipboard.writeText(idToCopy);
    setCopiedDatasetId(true);
    setTimeout(() => setCopiedDatasetId(false), 2000);
  };

  const handleCopyEventId = (evId: string) => {
    void navigator.clipboard.writeText(evId);
    setCopiedEventId(evId);
    setTimeout(() => setCopiedEventId(null), 2000);
  };

  // Filter & Metric Calculations
  const eventMetrics = useMemo(() => {
    const counts = { total: events.length, PageView: 0, ViewContent: 0, AddToCart: 0, Purchase: 0 };
    for (const ev of events) {
      if (ev.name === "PageView") counts.PageView++;
      else if (ev.name === "ViewContent") counts.ViewContent++;
      else if (ev.name === "AddToCart") counts.AddToCart++;
      else if (ev.name === "Purchase") counts.Purchase++;
    }
    return counts;
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (filterEvent !== "ALL" && ev.name !== filterEvent) return false;
      if (filterSource !== "ALL" && ev.source !== filterSource) return false;
      if (filterStatus !== "ALL" && ev.status !== filterStatus) return false;
      if (filterDate === "today") {
        const evDate = new Date(ev.timestamp).toDateString();
        const today = new Date().toDateString();
        if (evDate !== today) return false;
      } else if (filterDate === "24h") {
        const evTime = new Date(ev.timestamp).getTime();
        // eslint-disable-next-line react-hooks/purity
        const diff = Date.now() - evTime;
        if (diff > 24 * 60 * 60 * 1000) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inId = ev.id?.toLowerCase().includes(q) || false;
        const inEvId = ev.eventId?.toLowerCase().includes(q) || false;
        const inUrl = ev.url?.toLowerCase().includes(q) || false;
        const inName = ev.name?.toLowerCase().includes(q) || false;
        const inParams = JSON.stringify(ev.parameters || {}).toLowerCase().includes(q);
        if (!inId && !inEvId && !inUrl && !inName && !inParams) return false;
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
  const isConnected = Boolean(pixelId && pixelId.trim().length >= 8);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <MetaNavigationHeader
        pixelId={pixelId || settings?.pixelId}
        testEventCode={testEventCode || settings?.testEventCode}
      />

      {/* Main Container Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Header Ribbon */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold border border-purple-200 shrink-0 shadow-2xs">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Meta Events & Tracking
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                    Dataset v22.0
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Unified Meta Pixel SDK, Conversions API (CAPI), Diagnostics, and durable event logs.
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchTelemetry}
                disabled={loading}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-2xs disabled:opacity-60 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
              {pixelId && (
                <a
                  href={`https://eventsmanager.facebook.com/events_manager2/list/dataset/${pixelId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition shadow-2xs cursor-pointer"
                >
                  <span>Meta Suite</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {/* 4 Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 mt-6 -mb-4 sm:-mb-6 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => handleTabChange("events-manager")}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === "events-manager"
                  ? "border-blue-600 text-blue-600 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Events Manager</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("conversions-api")}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === "conversions-api"
                  ? "border-blue-600 text-blue-600 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Server className="h-3.5 w-3.5" />
              <span>Conversions API</span>
              {hasCapiToken && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Token configured" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("diagnostics")}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === "diagnostics"
                  ? "border-blue-600 text-blue-600 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              <span>Diagnostics & Testing</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("event-logs")}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === "event-logs"
                  ? "border-blue-600 text-blue-600 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Event Logs</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold border border-slate-200">
                {events.length}
              </span>
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {message && (
          <div
            className={`mx-4 sm:mx-6 mt-4 p-3 rounded-lg text-xs flex items-center justify-between gap-3 border ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              )}
              <span>{message.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="text-slate-400 hover:text-slate-700 transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 1: EVENTS MANAGER (PIXEL SETTINGS & ASSETS)
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === "events-manager" && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Top Identity Banner */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">ANGKON Store Dataset</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Active (v22.0)
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>ID: {pixelId || "Not configured"}</span>
                    {pixelId && (
                      <button
                        type="button"
                        onClick={handleCopyDatasetId}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Copy ID"
                      >
                        {copiedDatasetId ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-2xs transition disabled:opacity-60 cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{saving ? "Saving..." : "Save Configuration"}</span>
                </button>
              </div>
            </div>

            {/* Pixel Setup & Configuration Form */}
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dataset / Pixel ID Input */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Meta Dataset / Pixel ID</span>
                    <span className="text-[11px] text-slate-400 font-normal">Found in Events Manager</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={pixelId}
                      onChange={(e) => setPixelId(e.target.value)}
                      placeholder="e.g. 1304551066085265"
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    The 15–16 digit numeric identifier for your Meta Dataset.
                  </p>
                </div>

                {/* Master Switch */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800">
                    Master Tracking State
                  </label>
                  <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
                    <div>
                      <div className="text-xs font-semibold text-slate-800">
                        {enabled ? "Storefront Tracking Enabled" : "Tracking Paused"}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Controls both client Pixel SDK and server-side CAPI telemetry.
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => setEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Event Switches */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-500">
                  Tracked Storefront Events
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Globe className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-800">PageView</div>
                        <div className="text-[10px] text-slate-500">Route & storefront navigation</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={trackPageView}
                      onChange={(e) => setTrackPageView(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Eye className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-800">ViewContent</div>
                        <div className="text-[10px] text-slate-500">Product detail page visits</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={trackViewContent}
                      onChange={(e) => setTrackViewContent(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded bg-amber-50 text-amber-600 flex items-center justify-center">
                        <ShoppingCart className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-800">AddToCart</div>
                        <div className="text-[10px] text-slate-500">Product cart additions</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={trackAddToCart}
                      onChange={(e) => setTrackAddToCart(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <CreditCard className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-800">InitiateCheckout</div>
                        <div className="text-[10px] text-slate-500">Checkout funnel opening</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={trackInitiateCheckout}
                      onChange={(e) => setTrackInitiateCheckout(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCheck className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-800">Purchase</div>
                        <div className="text-[10px] text-slate-500">Confirmed store orders</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={trackPurchase}
                      onChange={(e) => setTrackPurchase(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                  </label>
                </div>
              </div>
            </form>

            {/* Assigned Business Assets */}
            <div className="space-y-4 pt-6 border-t border-slate-200">
              <div>
                <h3 className="text-xs font-bold text-slate-900">Connected Business Assets</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Portfolio assets paired with this Meta Dataset across Meta Business Suite.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                <div className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900">Ad Account: Plain Stitch</div>
                      <div className="text-[11px] text-slate-500">Partial access (View performance & attribution)</div>
                    </div>
                  </div>
                  <Link
                    href="/admin/meta/ads"
                    className="h-7 px-3 inline-flex items-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 shadow-2xs transition"
                  >
                    Manage
                  </Link>
                </div>

                <div className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                      <ShoppingBag className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900">Catalog: Catalog_Products</div>
                      <div className="text-[11px] text-slate-500">Dynamic Product Ads RSS 2.0 Feed</div>
                    </div>
                  </div>
                  <Link
                    href="/admin/meta/catalog"
                    className="h-7 px-3 inline-flex items-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 shadow-2xs transition"
                  >
                    Manage
                  </Link>
                </div>

                <div className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                      <Server className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900">Data Stream: Conversions API Gateway</div>
                      <div className="text-[11px] text-slate-500">Server-to-Server SHA-256 Telemetry Pipeline</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTabChange("conversions-api")}
                    className="h-7 px-3 inline-flex items-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 shadow-2xs transition cursor-pointer"
                  >
                    Manage
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 2: CONVERSIONS API (CAPI GATEWAY & WORKER)
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === "conversions-api" && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Top CAPI Status Alert */}
            {capiMessage && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center justify-between gap-3 border ${
                  capiMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-rose-50 text-rose-800 border-rose-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  {capiMessage.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  )}
                  <span>{capiMessage.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCapiMessage(null)}
                  className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Token Management Card */}
            <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-blue-600" />
                    <span>Conversions API Access Token</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      AES-256-GCM Encrypted at Rest
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Required for authenticated server-to-server event dispatch to Meta Graph API.
                  </p>
                </div>

                {hasCapiToken && (
                  <button
                    type="button"
                    onClick={handleClearCapiToken}
                    disabled={savingCapiToken}
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear Token</span>
                  </button>
                )}
              </div>

              {hasCapiToken ? (
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-900">
                        Token Configured & Encrypted
                      </div>
                      <div className="text-[11px] font-mono text-emerald-700">
                        {settings?.maskedCapiAccessToken || "••••••••"}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-medium">Ready for dispatch</span>
                </div>
              ) : (
                <form onSubmit={handleSaveCapiToken} className="space-y-3">
                  <div className="relative">
                    <input
                      type={showToken ? "text" : "password"}
                      value={capiToken}
                      onChange={(e) => setCapiToken(e.target.value)}
                      placeholder="Paste Meta Access Token (starts with EAA...)"
                      className="w-full h-9 pl-3 pr-10 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-slate-500">
                      Generated in Meta Events Manager → Settings → Conversions API → Generate Access Token.
                    </p>
                    <button
                      type="submit"
                      disabled={savingCapiToken || !capiToken.trim()}
                      className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-2xs transition disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>{savingCapiToken ? "Encrypting..." : "Save Token"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Gateway Tester & Worker Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Box 1: CAPI Gateway Test */}
              <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Live Gateway Test</h3>
                    <p className="text-[11px] text-slate-500">Dispatches an authentic server Purchase event to Meta.</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 text-xs space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>Target Endpoint:</span>
                    <span className="font-mono text-slate-900">Graph API v22.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IP / User-Agent:</span>
                    <span className="font-semibold text-emerald-700">Paired & Validated</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PII Normalization:</span>
                    <span className="font-semibold text-emerald-700">SHA-256 Hashed</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestCapiGateway}
                  disabled={testingCapi || !hasCapiToken}
                  className="w-full h-9 rounded-lg bg-purple-600 hover:bg-purple-700 text-xs font-semibold text-white transition shadow-2xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <PlayCircle className={`h-4 w-4 ${testingCapi ? "animate-spin" : ""}`} />
                  <span>{testingCapi ? "Dispatching to Meta..." : "Dispatch Test Purchase Event"}</span>
                </button>
              </div>

              {/* Box 2: Background Retry Queue Worker */}
              <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Queue Worker & Retry Controls</h3>
                    <p className="text-[11px] text-slate-500">Manages transient failures and delivery backoff.</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 text-xs space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>Worker Interval:</span>
                    <span className="font-semibold text-slate-900">60 seconds (Auto)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Delivery Attempts:</span>
                    <span className="font-semibold text-slate-900">5 attempts (Backoff)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Telemetry Retention:</span>
                    <span className="font-semibold text-slate-900">90 Days (MongoDB TTL)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDrainQueue}
                    disabled={drainingQueue}
                    className="flex-1 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${drainingQueue ? "animate-spin" : ""}`} />
                    <span>Drain Queue Now</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRetryFailedQueue}
                    disabled={retryingQueue}
                    className="flex-1 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className={`h-3.5 w-3.5 ${retryingQueue ? "animate-spin" : ""}`} />
                    <span>Requeue Failed</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Test Result Inspector (if available) */}
            {capiTestResult && (
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-900 text-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                  <span className="font-mono">Meta CAPI Response Payload</span>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(JSON.stringify(capiTestResult, null, 2));
                      setCapiMessage({ type: "success", text: "Response copied to clipboard!" });
                    }}
                    className="text-xs hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copy JSON</span>
                  </button>
                </div>
                <pre className="text-[11px] font-mono overflow-x-auto text-emerald-400 p-2">
                  {JSON.stringify(capiTestResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 3: DIAGNOSTICS & TESTING
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === "diagnostics" && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Meta Test Event Code Bar */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-purple-600" />
                  <h3 className="text-xs font-bold text-slate-900">Meta Test Event Code</h3>
                </div>
                <p className="text-[11px] text-slate-500">
                  Directs events to the &quot;Test Events&quot; tab in Meta Events Manager in real time.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={testEventCode}
                  onChange={(e) => setTestEventCode(e.target.value)}
                  placeholder="e.g. TEST12345"
                  className="h-8 px-3 rounded-lg border border-slate-300 bg-white text-xs font-mono uppercase text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-2xs transition disabled:opacity-60 cursor-pointer"
                >
                  Save Code
                </button>
              </div>
            </div>

            {/* Test Event Simulator Cards */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-500">
                Trigger Synthetic Test Telemetry
              </h3>
              <p className="text-xs text-slate-500 -mt-2">
                Emits test events locally and verifies end-to-end deduplication pairing with server CAPI.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase"].map((evName) => (
                  <button
                    key={evName}
                    type="button"
                    onClick={() => handleSimulateEvent(evName)}
                    disabled={simulating}
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-purple-50/40 hover:border-purple-300 transition text-left space-y-2 group cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-purple-700">
                        {evName}
                      </span>
                      <PlayCircle className="h-3.5 w-3.5 text-slate-400 group-hover:text-purple-600 transition" />
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {simulating && simulatedEvent === evName ? "Dispatching..." : "Click to fire"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Validation Rules Card */}
            <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Meta Conversion API Parameter Compliance Rules</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 space-y-1.5">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>User-Agent & IP Pairing (Mandatory)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Meta requires client_ip_address and client_user_agent to be dispatched together. Single parameter dispatches are rejected.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 space-y-1.5">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Deduplication via Shared Event ID</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Both browser window.fbq and server CAPI must send the identical event_id within 48 hours to ensure zero double-counting.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 space-y-1.5">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Bangladesh E.164 Phone Normalization</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Leading 01 numbers are automatically prefixed with country code 880 before SHA-256 hashing.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 space-y-1.5">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Content ID Catalog Pairing</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Product IDs sent in ViewContent and Purchase match the numeric catalog feed IDs (g:id) exactly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TAB 4: EVENT LOGS (THE DURABLE STREAM)
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === "event-logs" && (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Summary Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              <div className="p-2">
                <div className="text-[11px] text-slate-500 font-medium">Total Events</div>
                <div className="text-lg font-bold text-slate-900">{eventMetrics.total.toLocaleString()}</div>
              </div>
              <div className="p-2">
                <div className="text-[11px] text-slate-500 font-medium">PageView</div>
                <div className="text-lg font-bold text-blue-700">{eventMetrics.PageView.toLocaleString()}</div>
              </div>
              <div className="p-2">
                <div className="text-[11px] text-slate-500 font-medium">ViewContent</div>
                <div className="text-lg font-bold text-purple-700">{eventMetrics.ViewContent.toLocaleString()}</div>
              </div>
              <div className="p-2">
                <div className="text-[11px] text-slate-500 font-medium">AddToCart</div>
                <div className="text-lg font-bold text-amber-700">{eventMetrics.AddToCart.toLocaleString()}</div>
              </div>
              <div className="p-2">
                <div className="text-[11px] text-slate-500 font-medium">Purchase</div>
                <div className="text-lg font-bold text-emerald-700">{eventMetrics.Purchase.toLocaleString()}</div>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter by Event ID, Order #, URL, or Payload..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClearActivity}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition cursor-pointer shadow-2xs"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Clear Stream</span>
                  </button>
                </div>
              </div>

              {/* Quick Selectors */}
              <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-semibold">Event:</span>
                  <select
                    value={filterEvent}
                    onChange={(e) => {
                      setFilterEvent(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800"
                  >
                    <option value="ALL">All Events</option>
                    <option value="PageView">PageView</option>
                    <option value="ViewContent">ViewContent</option>
                    <option value="AddToCart">AddToCart</option>
                    <option value="InitiateCheckout">InitiateCheckout</option>
                    <option value="Purchase">Purchase</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-semibold">Source:</span>
                  <select
                    value={filterSource}
                    onChange={(e) => {
                      setFilterSource(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800"
                  >
                    <option value="ALL">All Sources</option>
                    <option value="browser">Browser Pixel</option>
                    <option value="server">Server CAPI</option>
                    <option value="test_simulator">Test Simulator</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-semibold">Date:</span>
                  <select
                    value={filterDate}
                    onChange={(e) => {
                      setFilterDate(e.target.value as "all" | "24h" | "today");
                      setCurrentPage(1);
                    }}
                    className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800"
                  >
                    <option value="all">All Time (90-Day)</option>
                    <option value="today">Today</option>
                    <option value="24h">Last 24 Hours</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Event Table */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Event</th>
                      <th className="py-2.5 px-4">Event ID / Hash</th>
                      <th className="py-2.5 px-4">Source</th>
                      <th className="py-2.5 px-4">Delivery Status</th>
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedEvents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <Activity className="h-8 w-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                          <p className="text-xs font-semibold text-slate-600">No telemetry events recorded</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Visit the storefront or trigger a test event in the Diagnostics tab.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      paginatedEvents.map((ev) => {
                        const isExpanded = expandedEventId === ev.id;
                        return (
                          <tr key={ev.id} className="hover:bg-slate-50/60 transition group">
                            <td className="py-2.5 px-4">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                  ev.name === "Purchase"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : ev.name === "AddToCart"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : ev.name === "ViewContent"
                                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                                    : "bg-blue-50 text-blue-700 border border-blue-200"
                                }`}
                              >
                                {ev.name}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <span>{ev.eventId || ev.id.slice(0, 16)}</span>
                                {ev.eventId && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyEventId(ev.eventId!)}
                                    className="opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-slate-700 cursor-pointer"
                                  >
                                    {copiedEventId === ev.eventId ? (
                                      <Check className="h-3 w-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="capitalize text-slate-700 font-medium">
                                {ev.source === "server" ? "Server CAPI" : ev.source === "browser" ? "Browser Pixel" : "Simulator"}
                              </span>
                            </td>
                            <td className="py-2.5 px-4">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  ev.status === "accepted" || ev.status === "sent"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : ev.status === "retrying" || ev.status === "queued"
                                    ? "bg-amber-50 text-amber-700"
                                    : ev.status === "failed"
                                    ? "bg-rose-50 text-rose-700"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {ev.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                              {new Date(ev.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                              >
                                <span>{isExpanded ? "Hide" : "Inspect"}</span>
                                {isExpanded ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              {totalPages > 1 && (
                <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 bg-slate-50/50">
                  <span>
                    Showing {paginatedEvents.length} of {filteredEvents.length} events (Page {currentPage} of {totalPages})
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 cursor-pointer shadow-2xs font-semibold"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 cursor-pointer shadow-2xs font-semibold"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Expandable Payload Inspector Drawer */}
            {expandedEventId && (
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-900 text-slate-100 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-mono font-bold">
                      Payload Details for Event ID: {expandedEventId}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedEventId(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {(() => {
                  const ev = events.find((e) => e.id === expandedEventId);
                  if (!ev) return null;
                  return (
                    <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto p-2 bg-slate-950/70 rounded-lg max-h-64">
                      {JSON.stringify(ev, null, 2)}
                    </pre>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
