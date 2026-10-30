"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
} from "lucide-react";
import { MetaNavigationHeader } from "../meta-nav";
import type { PublicAdminPixelSettings, PixelEventRecord } from "@/server/pixel-settings";

export default function MetaPixelEventsManagerPage() {
  const [activeTab, setActiveTab] = useState<"activity" | "diagnostics" | "settings">("activity");
  const [settings, setSettings] = useState<PublicAdminPixelSettings | null>(null);
  const [events, setEvents] = useState<PixelEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedDatasetId, setCopiedDatasetId] = useState(false);
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);
  const [copiedPayloadId, setCopiedPayloadId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEvent, setFilterEvent] = useState<string>("ALL");
  const [filterSource, setFilterSource] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterDate, setFilterDate] = useState<"all" | "24h" | "today">("all");

  // Table Pagination & Detail Inspection
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [inspectionTab, setInspectionTab] = useState<"payload" | "validation">("payload");

  // Settings form state
  const [enabled, setEnabled] = useState(true);
  const [pixelId, setPixelId] = useState("");
  const [testEventCode, setTestEventCode] = useState("");
  const [trackPageView, setTrackPageView] = useState(true);
  const [trackViewContent, setTrackViewContent] = useState(true);
  const [trackAddToCart, setTrackAddToCart] = useState(true);
  const [trackInitiateCheckout, setTrackInitiateCheckout] = useState(true);
  const [trackPurchase, setTrackPurchase] = useState(true);

  // Diagnostics test runner state
  const [testingCapi, setTestingCapi] = useState(false);
  const [capiTestResult, setCapiTestResult] = useState<{
    success: boolean;
    message: string;
    fbtraceId?: string;
    timestamp?: string;
  } | null>(null);
  const [simulatingEvent, setSimulatingEvent] = useState<string | null>(null);
  const [selectedSimulatorEvent, setSelectedSimulatorEvent] = useState<string>("Purchase");
  const [simulatorMode, setSimulatorMode] = useState<"both" | "browser" | "server">("both");
  const [simulatorLogs, setSimulatorLogs] = useState<
    Array<{ id: string; time: string; type: "info" | "success" | "error"; text: string }>
  >([]);
  const [deliveryStats, setDeliveryStats] = useState<{
    queued: number;
    processing: number;
    accepted: number;
    retrying: number;
    failed: number;
  } | null>(null);
  const [dedupStats, setDedupStats] = useState<{
    pairedCount: number;
    browserOnlyCount: number;
    serverOnlyCount: number;
  } | null>(null);
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);
  const [togglingMaster, setTogglingMaster] = useState(false);

  const reloadEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pixel/events");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        if (data.deliveryStats) setDeliveryStats(data.deliveryStats);
        if (data.deduplicationStats) setDedupStats(data.deduplicationStats);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleManualRetry = async (logId: string, eventId?: string) => {
    setRetryingLogId(logId);
    try {
      const res = await fetch("/api/admin/meta/capi/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId, eventId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({
          type: "success",
          text: `Event delivery accepted by Meta Graph API! (Events Received: ${data.eventsReceived ?? 1}, Trace ID: ${data.fbtraceId || "N/A"})`,
        });
      } else {
        setMessage({
          type: "error",
          text: data.error || "Retry attempt failed.",
        });
      }
      await reloadEvents();
    } catch {
      setMessage({ type: "error", text: "Network error retrying event delivery." });
    } finally {
      setRetryingLogId(null);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const [settingsRes, eventsRes] = await Promise.all([
          fetch("/api/admin/settings/pixel"),
          fetch("/api/admin/pixel/events"),
        ]);

        if (settingsRes.ok && !ignore) {
          const sData: PublicAdminPixelSettings = await settingsRes.json();
          setSettings(sData);
          setEnabled(sData.enabled);
          setPixelId(sData.pixelId || "");
          setTestEventCode(sData.testEventCode || "");
          setTrackPageView(sData.trackPageView !== false);
          setTrackViewContent(sData.trackViewContent !== false);
          setTrackAddToCart(sData.trackAddToCart !== false);
          setTrackInitiateCheckout(sData.trackInitiateCheckout !== false);
          setTrackPurchase(sData.trackPurchase !== false);
        }

        if (eventsRes.ok && !ignore) {
          const eData = await eventsRes.json();
          setEvents(eData.events || []);
          if (eData.deliveryStats) setDeliveryStats(eData.deliveryStats);
          if (eData.deduplicationStats) setDedupStats(eData.deduplicationStats);
        }
      } catch {
        if (!ignore) {
          setMessage({ type: "error", text: "Unable to load events telemetry from server." });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void init();
    return () => {
      ignore = true;
    };
  }, []);

  // Window-level real-time event listener
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

  // Copy helpers
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

  const handleCopyPayloadJson = (id: string, payload: unknown) => {
    void navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedPayloadId(id);
    setTimeout(() => setCopiedPayloadId(null), 2000);
  };

  // Clear test code safely
  const handleClearTestCode = async () => {
    try {
      const res = await fetch("/api/admin/settings/pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEventCode: "" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSettings(data.settings);
          setTestEventCode("");
          setMessage({
            type: "success",
            text: "Test Event Code disabled. Live storefront events will now record as production conversions.",
          });
        }
      }
    } catch {
      setMessage({ type: "error", text: "Failed to clear test code." });
    }
  };

  // Immediate Master Tracking Toggle (Persisted directly to MongoDB)
  const handleToggleMasterTracking = async (nextEnabled: boolean) => {
    const cleanId = (pixelId || settings?.pixelId || "").trim();
    if (nextEnabled && !cleanId) {
      setMessage({
        type: "error",
        text: "Cannot enable tracking without a valid Meta Pixel / Dataset ID. Please configure and save a Dataset ID first.",
      });
      setActiveTab("settings");
      return;
    }

    setTogglingMaster(true);
    const prevEnabled = enabled;
    setEnabled(nextEnabled);

    try {
      const res = await fetch("/api/admin/settings/pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.settings);
        setEnabled(data.settings.enabled);
        setMessage({
          type: "success",
          text: nextEnabled
            ? "Master tracking enabled. Storefront telemetry and Conversions API delivery are active."
            : "Master tracking paused. Storefront pixel and server CAPI dispatch are suspended.",
        });
      } else {
        setEnabled(prevEnabled);
        setMessage({ type: "error", text: data.error || "Failed to update tracking status." });
      }
    } catch {
      setEnabled(prevEnabled);
      setMessage({ type: "error", text: "Network error updating tracking status." });
    } finally {
      setTogglingMaster(false);
    }
  };

  // Dedicated Disconnect / Remove Dataset Action
  const handleDisconnectDataset = async () => {
    if (
      !confirm(
        "Are you sure you want to disconnect this Meta Dataset?\n\n" +
        "• Live browser pixel tracking will stop immediately.\n" +
        "• Server-side CAPI event dispatch will be paused.\n" +
        "• Your access tokens and historical event ledger will be preserved."
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pixelId: "", enabled: false }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.settings);
        setPixelId("");
        setEnabled(false);
        setMessage({
          type: "success",
          text: "Meta Dataset successfully disconnected. Tracking is disabled.",
        });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to disconnect dataset." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error disconnecting dataset." });
    } finally {
      setSaving(false);
    }
  };

  // Save settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const cleanId = pixelId.trim();
    if (cleanId && !/^\d{10,25}$/.test(cleanId)) {
      setMessage({
        type: "error",
        text: "Invalid Meta Pixel / Dataset ID. Value must consist of 10 to 25 numeric digits.",
      });
      setSaving(false);
      return;
    }

    // If ID is cleared, master tracking MUST automatically be turned off
    const nextEnabled = cleanId ? enabled : false;

    try {
      const res = await fetch("/api/admin/settings/pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: nextEnabled,
          pixelId: cleanId,
          testEventCode: testEventCode.trim(),
          trackPageView,
          trackViewContent,
          trackAddToCart,
          trackInitiateCheckout,
          trackPurchase,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.settings);
        setEnabled(data.settings.enabled);
        setPixelId(data.settings.pixelId || "");
        setTestEventCode(data.settings.testEventCode || "");
        setTrackPageView(data.settings.trackPageView !== false);
        setTrackViewContent(data.settings.trackViewContent !== false);
        setTrackAddToCart(data.settings.trackAddToCart !== false);
        setTrackInitiateCheckout(data.settings.trackInitiateCheckout !== false);
        setTrackPurchase(data.settings.trackPurchase !== false);

        setMessage({
          type: "success",
          text: cleanId
            ? "Meta Events Manager settings updated and saved to database."
            : "Meta Dataset removed and saved to database. Tracking is disabled.",
        });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save settings." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error occurred while saving." });
    } finally {
      setSaving(false);
    }
  };

  // Clear Activity
  const handleClearActivity = async () => {
    if (!confirm("Are you sure you want to clear all recorded conversion events from this feed?")) {
      return;
    }
    try {
      const res = await fetch("/api/admin/pixel/events", { method: "DELETE" });
      if (res.ok) {
        setEvents([]);
        setCurrentPage(1);
        setMessage({ type: "success", text: "Activity stream cleared successfully." });
      }
    } catch {
      setMessage({ type: "error", text: "Could not clear activity stream." });
    }
  };

  // Live Server CAPI Diagnostic Connection Test
  const handleTestCapiConnection = async () => {
    setTestingCapi(true);
    setCapiTestResult(null);
    try {
      const res = await fetch("/api/admin/meta/capi/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: "PageView",
          testEventCode: testEventCode || undefined,
          customData: {
            page_title: "CAPI Live Connection Diagnostic",
            url: "/admin/meta/pixel",
          },
        }),
      });

      const data = await res.json();
      const timeStr = new Date().toLocaleTimeString();
      if (res.ok && data.success) {
        setCapiTestResult({
          success: true,
          message: `Conversions API confirmed delivery (HTTP 200). Events received: ${
            data.eventsReceived || 1
          }. Meta Graph accepted event.`,
          fbtraceId: data.fbtraceId,
          timestamp: timeStr,
        });
        setSimulatorLogs((prev) => [
          {
            id: `log_${Date.now()}`,
            time: timeStr,
            type: "success",
            text: `[CAPI Test 200 OK] Delivery confirmed. fbtrace_id: ${data.fbtraceId || "N/A"}`,
          },
          ...prev.slice(0, 49),
        ]);
        await reloadEvents();
      } else {
        setCapiTestResult({
          success: false,
          message: data.error || "Meta Graph API rejected the server dispatch. Check token permissions.",
          fbtraceId: data.fbtraceId,
          timestamp: timeStr,
        });
        setSimulatorLogs((prev) => [
          {
            id: `log_${Date.now()}`,
            time: timeStr,
            type: "error",
            text: `[CAPI Error] ${data.error || "Rejection"} (fbtrace_id: ${data.fbtraceId || "none"})`,
          },
          ...prev.slice(0, 49),
        ]);
      }
    } catch {
      setCapiTestResult({
        success: false,
        message: "Network failure contacting server CAPI test endpoint.",
      });
    } finally {
      setTestingCapi(false);
    }
  };

  // Unified Event Simulator Runner
  const handleRunSimulator = async () => {
    // Check if master tracking is enabled
    if (!enabled) {
      setMessage({
        type: "error",
        text: "Cannot dispatch simulated event: Master Tracking is turned OFF in Dataset Configuration.",
      });
      return;
    }

    // Check if the selected event is disabled in settings
    const isSuppressed =
      (selectedSimulatorEvent === "PageView" && !trackPageView) ||
      (selectedSimulatorEvent === "ViewContent" && !trackViewContent) ||
      (selectedSimulatorEvent === "AddToCart" && !trackAddToCart) ||
      (selectedSimulatorEvent === "InitiateCheckout" && !trackInitiateCheckout) ||
      (selectedSimulatorEvent === "Purchase" && !trackPurchase);

    if (isSuppressed) {
      setMessage({
        type: "error",
        text: `[Suppressed] '${selectedSimulatorEvent}' trigger is unchecked in Dataset Configuration. No data dispatched to browser or server CAPI.`,
      });
      setSimulatorLogs((prev) => [
        {
          id: `log_${Date.now()}_suppressed`,
          time: new Date().toLocaleTimeString(),
          type: "error",
          text: `[Suppressed] '${selectedSimulatorEvent}' is disabled in settings. Dispatch aborted.`,
        },
        ...prev.slice(0, 49),
      ]);
      return;
    }

    setSimulatingEvent(selectedSimulatorEvent);
    const timeStr = new Date().toLocaleTimeString();

    // Generate realistic parameters based on event type
    const sampleOrderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const pairedEventId = `order_${sampleOrderId}`;

    let payloadParams: Record<string, unknown> = {};
    let targetUrl = "/";

    if (selectedSimulatorEvent === "PageView") {
      payloadParams = { page_path: "/", page_title: "Storefront Home — Modern Heritage" };
      targetUrl = "/";
    } else if (selectedSimulatorEvent === "ViewContent") {
      payloadParams = {
        content_name: "Royal Heritage Silk Panjabi",
        content_category: "Panjabi Collection",
        content_ids: ["PRD-PANJABI-001"],
        value: 4850,
        currency: "BDT",
      };
      targetUrl = "/products/royal-heritage-silk-panjabi";
    } else if (selectedSimulatorEvent === "AddToCart") {
      payloadParams = {
        content_name: "Royal Heritage Silk Panjabi",
        content_ids: ["PRD-PANJABI-001"],
        value: 4850,
        currency: "BDT",
        content_type: "product",
      };
      targetUrl = "/products/royal-heritage-silk-panjabi";
    } else if (selectedSimulatorEvent === "InitiateCheckout") {
      payloadParams = {
        num_items: 2,
        value: 9700,
        currency: "BDT",
        content_ids: ["PRD-PANJABI-001", "PRD-SHAWL-004"],
      };
      targetUrl = "/checkout";
    } else {
      // Purchase
      payloadParams = {
        order_id: sampleOrderId,
        value: 9700,
        currency: "BDT",
        num_items: 2,
        content_ids: ["PRD-PANJABI-001", "PRD-SHAWL-004"],
      };
      targetUrl = `/thankyou-for-shopping?order_id=${sampleOrderId}`;
    }

    try {
      // 1. Browser Event Dispatch
      if (simulatorMode === "both" || simulatorMode === "browser") {
        if (
          typeof window !== "undefined" &&
          typeof (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq === "function"
        ) {
          (
            window as unknown as {
              fbq: (act: string, ev: string, p?: Record<string, unknown>, opts?: { eventID: string }) => void;
            }
          ).fbq("track", selectedSimulatorEvent, payloadParams, { eventID: pairedEventId });
        }

        await fetch("/api/admin/pixel/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: selectedSimulatorEvent,
            eventId: pairedEventId,
            parameters: payloadParams,
            url: targetUrl,
            source: "browser",
            status: "dispatched",
            testEventCode: testEventCode || undefined,
          }),
        });

        setSimulatorLogs((prev) => [
          {
            id: `log_${Date.now()}_b`,
            time: timeStr,
            type: "info",
            text: `[Browser] Dispatched fbq('track', '${selectedSimulatorEvent}') with eventID '${pairedEventId}'.`,
          },
          ...prev.slice(0, 49),
        ]);
      }

      // 2. Server CAPI Dispatch
      if (simulatorMode === "both" || simulatorMode === "server") {
        const serverRes = await fetch("/api/admin/meta/capi/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventName: selectedSimulatorEvent,
            eventId: pairedEventId,
            testEventCode: testEventCode || undefined,
            customData: payloadParams,
          }),
        });

        const serverData = await serverRes.json();
        if (serverRes.ok && serverData.success) {
          setSimulatorLogs((prev) => [
            {
              id: `log_${Date.now()}_s`,
              time: timeStr,
              type: "success",
              text: `[Server CAPI] 200 OK — ${selectedSimulatorEvent} received by Meta Graph. Trace: ${
                serverData.fbtraceId || "N/A"
              }`,
            },
            ...prev.slice(0, 49),
          ]);
        } else {
          setSimulatorLogs((prev) => [
            {
              id: `log_${Date.now()}_s_err`,
              time: timeStr,
              type: "error",
              text: `[Server CAPI Error] ${serverData.error || "Rejected by Meta Graph"}`,
            },
            ...prev.slice(0, 49),
          ]);
        }
      }

      await reloadEvents();
      setMessage({
        type: "success",
        text: `Simulated '${selectedSimulatorEvent}' dispatched successfully (Mode: ${simulatorMode}, ID: ${pairedEventId}).`,
      });
    } catch {
      setMessage({ type: "error", text: "Failed to dispatch simulated event." });
    } finally {
      setSimulatingEvent(null);
    }
  };

  // Date filtering helper
  const isWithinDateFilter = useCallback(
    (timestamp: string): boolean => {
      if (filterDate === "all") return true;
      const eventTime = new Date(timestamp).getTime();
      const now = Date.now();
      if (filterDate === "24h") {
        return now - eventTime <= 24 * 60 * 60 * 1000;
      }
      if (filterDate === "today") {
        const todayStr = new Date().toISOString().slice(0, 10);
        return timestamp.startsWith(todayStr);
      }
      return true;
    },
    [filterDate]
  );

  // Filtered Events for Table & Overview
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // 1. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = ev.id?.toLowerCase().includes(q) || ev.eventId?.toLowerCase().includes(q);
        const matchUrl = ev.url?.toLowerCase().includes(q);
        const matchName = ev.name?.toLowerCase().includes(q);
        const matchParam = JSON.stringify(ev.parameters).toLowerCase().includes(q);
        if (!matchId && !matchUrl && !matchName && !matchParam) return false;
      }

      // 2. Event Name filter
      if (filterEvent !== "ALL" && ev.name.toLowerCase() !== filterEvent.toLowerCase()) {
        return false;
      }

      // 3. Source filter
      if (filterSource !== "ALL" && ev.source !== filterSource) {
        return false;
      }

      // 4. Status filter
      if (filterStatus !== "ALL") {
        const evStatus = ev.status || (ev.source === "server" ? "accepted" : "dispatched");
        if (filterStatus === "accepted") {
          if (evStatus !== "accepted" && evStatus !== "delivered") return false;
        } else if (evStatus !== filterStatus) {
          return false;
        }
      }

      // 5. Date filter
      if (!isWithinDateFilter(ev.timestamp)) {
        return false;
      }

      return true;
    });
  }, [events, searchQuery, filterEvent, filterSource, filterStatus, isWithinDateFilter]);

  // Event counts for Overview (scoped strictly to date filter)
  const eventMetrics = useMemo(() => {
    const scoped = events.filter((ev) => isWithinDateFilter(ev.timestamp));
    const total = scoped.length;
    return {
      total,
      PageView: scoped.filter((e) => e.name === "PageView").length,
      ViewContent: scoped.filter((e) => e.name === "ViewContent").length,
      AddToCart: scoped.filter((e) => e.name === "AddToCart").length,
      InitiateCheckout: scoped.filter((e) => e.name === "InitiateCheckout").length,
      Purchase: scoped.filter((e) => e.name === "Purchase").length,
    };
  }, [events, isWithinDateFilter]);

  // Timestamps for status cards
  const lastBrowserEvent = useMemo(() => {
    return events.find((e) => e.source === "browser");
  }, [events]);

  const lastServerEvent = useMemo(() => {
    return events.find((e) => e.source === "server");
  }, [events]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage) || 1;
  const paginatedEvents = useMemo(() => {
    return filteredEvents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredEvents, currentPage, itemsPerPage]);

  const activeDatasetId = (pixelId || settings?.pixelId || "").trim();
  const isConnected = Boolean(activeDatasetId && /^\d{10,25}$/.test(activeDatasetId));
  const launchTestModeUrl = `/?test_event_code=${encodeURIComponent(testEventCode.trim() || "TEST_DEBUG")}`;

  return (
    <div className="space-y-6 max-w-7xl pb-24 text-stone-900 font-sans antialiased">
      {/* ── 1. Top Meta Marketing Navigation ── */}
      <MetaNavigationHeader pixelId={activeDatasetId} testEventCode={testEventCode} />

      {/* ── 2. Prominent Safety Alert: Test Event Mode Active ── */}
      {Boolean(testEventCode) && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-1 rounded-md bg-amber-200/60 text-amber-900 shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-amber-950">
                  Meta Test Event Code is Active:{" "}
                  <code className="rounded bg-amber-200/80 px-1.5 py-0.5 font-mono text-amber-950 font-black">
                    {testEventCode}
                  </code>
                </p>
                <p className="text-[12px] text-amber-800 leading-normal">
                  All visitor events are currently tagged for Meta Events Manager testing and will not be counted in
                  production ad reports. Clear this code once verification is complete.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearTestCode}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition shadow-2xs cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear Test Code</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 3. Notification Toast ── */}
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

      {/* ── 4. Main Executive Header Section ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md">
                Meta Events Telemetry
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border transition-colors ${
                  enabled && isConnected
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                    : isConnected
                    ? "bg-amber-50 text-amber-800 border-amber-200/80"
                    : "bg-stone-100 text-stone-600 border-stone-200"
                }`}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      enabled && isConnected
                        ? "bg-emerald-400"
                        : isConnected
                        ? "bg-amber-400"
                        : "bg-stone-400"
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                      enabled && isConnected
                        ? "bg-emerald-500"
                        : isConnected
                        ? "bg-amber-500"
                        : "bg-stone-500"
                    }`}
                  />
                </span>
                <span>
                  {enabled && isConnected
                    ? "Tracking Active"
                    : isConnected
                    ? "Tracking Paused"
                    : "Not Configured"}
                </span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
              Meta Events Manager
            </h1>
            <p className="text-xs sm:text-[13px] text-stone-500 max-w-xl leading-relaxed">
              Real-time browser Pixel &amp; server Conversions API telemetry with verifiable delivery status and deduplication.
            </p>
          </div>

          {/* Action Strip */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
            <a
              href={launchTestModeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition shadow-2xs cursor-pointer"
            >
              <PlayCircle className="h-3.5 w-3.5 text-stone-500" />
              <span>Launch Test Mode</span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>

            <button
              type="button"
              onClick={() => setActiveTab("diagnostics")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition shadow-2xs cursor-pointer"
            >
              <FlaskConical className="h-3.5 w-3.5 text-stone-500" />
              <span>Test Events</span>
            </button>

            <button
              type="button"
              onClick={reloadEvents}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 transition shadow-2xs cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh Feed</span>
            </button>
          </div>
        </div>

        {/* Dataset Metadata Bar */}
        <div className="rounded-xl bg-stone-50/80 border border-stone-200/70 p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5 text-stone-600">
            <span className="font-medium text-stone-500">Connected Dataset:</span>
            <span className="font-bold text-stone-900">
              {isConnected ? "ANGKON Store Dataset" : "No Dataset Connected"}
            </span>
            <span className="text-stone-300">•</span>
            {isConnected ? (
              <span className="font-mono text-stone-700 inline-flex items-center gap-1.5 bg-white border border-stone-200/80 px-2.5 py-1 rounded-lg shadow-2xs">
                <span className="text-stone-400 font-sans font-medium text-[11px]">Dataset ID:</span>
                <span className="font-bold text-stone-900">{activeDatasetId}</span>
                <button
                  type="button"
                  onClick={handleCopyDatasetId}
                  aria-label="Copy Dataset ID"
                  className="text-stone-400 hover:text-stone-900 transition p-0.5 rounded hover:bg-stone-100 cursor-pointer"
                  title="Copy Dataset ID"
                >
                  {copiedDatasetId ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </span>
            ) : (
              <span className="text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded text-[11px] font-medium">
                Add your Dataset ID in settings to activate tracking
              </span>
            )}
            {copiedDatasetId && (
              <span className="text-xs text-emerald-600 font-semibold animate-pulse">Copied!</span>
            )}
          </div>

          {isConnected ? (
            <a
              href={`https://adsmanager.facebook.com/events_manager2/list/dataset/${activeDatasetId}/overview`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition hover:underline cursor-pointer"
            >
              <span>Open Meta Business Events Manager</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
            >
              <span>Configure Dataset ID &rarr;</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 5. Architecture Status Cards (Industry Standard Polished Layout) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Browser Pixel Status */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-stone-300 transition-all space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100/80 flex items-center justify-center text-blue-600 shrink-0">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-stone-900">Browser Pixel</div>
                <div className="text-xs text-stone-500 font-medium">window.fbq Client SDK</div>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                enabled && isConnected
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : isConnected
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-stone-100 text-stone-600 border-stone-200"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  enabled && isConnected
                    ? "bg-emerald-500 animate-pulse"
                    : isConnected
                    ? "bg-amber-500"
                    : "bg-stone-400"
                }`}
              />
              {enabled && isConnected ? "Active in DOM" : isConnected ? "Tracking Paused" : "Not Configured"}
            </span>
          </div>

          <div className="pt-3 border-t border-stone-100 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-500 font-medium">Head Script</span>
              <span className="font-mono text-stone-700 bg-stone-50 border border-stone-200/70 px-2 py-0.5 rounded text-[11px] font-medium">
                Injected with &lt;noscript&gt;
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500 font-medium">Last Browser Event</span>
              {lastBrowserEvent ? (
                <span className="font-semibold text-stone-800 flex items-center gap-1.5">
                  <span className="font-mono text-blue-700 bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 rounded text-[11px]">
                    {lastBrowserEvent.name}
                  </span>
                  <span className="font-normal text-stone-400 font-mono text-[11px]">
                    {new Date(lastBrowserEvent.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </span>
              ) : (
                <span className="text-stone-400 italic">No events recorded</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500 font-medium">Telemetry State</span>
              <span className="text-stone-700 font-medium text-[11px]">
                {enabled && isConnected ? "Receiving window events" : "Data collection halted"}
              </span>
            </div>
          </div>
        </div>

        {/* Server Conversions API (CAPI) Status */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-stone-300 transition-all space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shrink-0">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-stone-900">Conversions API</div>
                <div className="text-xs text-stone-500 font-medium">Graph API v22.0</div>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                !enabled
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : settings?.statuses?.conversionsApi?.state === "connected"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : settings?.statuses?.conversionsApi?.state === "error"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : settings?.statuses?.conversionsApi?.state === "test-required"
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-stone-100 text-stone-600 border-stone-200"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  !enabled
                    ? "bg-amber-500"
                    : settings?.statuses?.conversionsApi?.state === "connected"
                    ? "bg-emerald-500 animate-pulse"
                    : settings?.statuses?.conversionsApi?.state === "error"
                    ? "bg-rose-500"
                    : "bg-amber-500"
                }`}
              />
              {!enabled ? "Tracking Paused" : (settings?.statuses?.conversionsApi?.label || (settings?.hasCapiAccessToken ? "Test Required" : "Token Required"))}
            </span>
          </div>

          <div className="pt-3 border-t border-stone-100 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-500 font-medium">Access Token</span>
              {settings?.hasCapiAccessToken ? (
                <code className="text-[11px] font-mono text-stone-800 font-semibold bg-stone-50 border border-stone-200/70 px-2 py-0.5 rounded">
                  {settings.maskedCapiAccessToken}
                </code>
              ) : (
                <span className="text-[11px] text-amber-800 font-semibold bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded">
                  Token Required in CAPI tab
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500 font-medium">Last Server Event</span>
              {lastServerEvent ? (
                <span className="font-semibold text-stone-800 flex items-center gap-1.5">
                  <span className="font-mono text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.5 rounded text-[11px]">
                    {lastServerEvent.name}
                  </span>
                  <span className="font-normal text-stone-400 font-mono text-[11px]">
                    {new Date(lastServerEvent.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </span>
              ) : (
                <span className="text-stone-400 italic">No server events recorded</span>
              )}
            </div>
            {deliveryStats && (deliveryStats.queued > 0 || deliveryStats.retrying > 0) ? (
              <div className="flex items-center justify-between">
                <span className="text-amber-700 font-medium">Queue Backlog</span>
                <span className="font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                  {deliveryStats.queued} queued, {deliveryStats.retrying} retrying
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-stone-500 font-medium">Pipeline Mode</span>
                <span className="text-stone-700 font-medium text-[11px]">Durable Mongo Queue &amp; Retry</span>
              </div>
            )}
          </div>
        </div>

        {/* Event Deduplication Status */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-stone-300 transition-all space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600 shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-stone-900">Deduplication Engine</div>
                <div className="text-xs text-stone-500 font-medium">Deterministic 48h Merge Engine</div>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                settings?.statuses?.deduplication?.state === "connected"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : settings?.statuses?.deduplication?.state === "test-required"
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-stone-100 text-stone-600 border-stone-200"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  settings?.statuses?.deduplication?.state === "connected"
                    ? "bg-emerald-500 animate-pulse"
                    : settings?.statuses?.deduplication?.state === "test-required"
                    ? "bg-amber-500"
                    : "bg-stone-400"
                }`}
              />
              {settings?.statuses?.deduplication?.label || "Protected"}
            </span>
          </div>

          <div className="pt-3 border-t border-stone-100 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-500 font-medium">Shared Key</span>
              <code className="text-[11px] font-mono text-stone-800 font-semibold bg-stone-50 border border-stone-200/70 px-2 py-0.5 rounded">
                event_id: order_&#123;id&#125;
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500 font-medium">Paired Telemetry</span>
              <span className="font-mono text-stone-800 bg-stone-50 border border-stone-200/70 px-2 py-0.5 rounded text-[11px]">
                {dedupStats ? `${dedupStats.pairedCount} deduplicated pairs` : "Tracking active"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500 font-medium">Idempotency Guard</span>
              <span className="font-mono text-stone-700 bg-stone-50 border border-stone-200/70 px-2 py-0.5 rounded text-[11px]">
                sessionStorage + DB Lock
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. Event Overview Metrics (Executive KPI Dashboard) ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-stone-100">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">
              Standard Conversion Event Metrics
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Real-time conversion volume verified by persistent store ledger and server-side Conversions API pipeline.
            </p>
          </div>

          {/* Date range filter */}
          <div className="flex items-center gap-2 text-xs">
            <Clock className="h-3.5 w-3.5 text-stone-400" />
            <span className="text-stone-500 font-medium">Time Window:</span>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value as "all" | "24h" | "today")}
              className="rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-1.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-200 cursor-pointer shadow-2xs"
            >
              <option value="all">All Recorded</option>
              <option value="24h">Last 24 Hours</option>
              <option value="today">Today Only</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 py-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-stone-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* Total Events */}
            <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs hover:shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between min-h-[115px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-stone-500" />
                  <span>Total Events</span>
                </span>
                <span className="text-[11px] font-mono font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                  All
                </span>
              </div>
              <div className="my-1.5">
                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
                  {eventMetrics.total.toLocaleString()}
                </div>
                <div className="text-[11px] text-stone-400 mt-0.5">
                  Verified in ledger
                </div>
              </div>
            </div>

            {/* PageView */}
            <div className={`rounded-2xl border p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-h-[115px] ${trackPageView ? "border-stone-200/90 bg-white hover:border-blue-300" : "border-stone-200 bg-stone-50/60 opacity-80"}`}>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-stone-800 flex items-center gap-1.5 truncate">
                  <Eye className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span>PageView</span>
                </span>
                {trackPageView ? (
                  eventMetrics.total > 0 && (
                    <span className="text-[11px] font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100/60 shrink-0">
                      {Math.round((eventMetrics.PageView / eventMetrics.total) * 100)}%
                    </span>
                  )
                ) : (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                    Silenced
                  </span>
                )}
              </div>
              <div className="my-1.5">
                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
                  {eventMetrics.PageView.toLocaleString()}
                </div>
                <div className="text-[11px] text-stone-400 mt-0.5">
                  {trackPageView ? (eventMetrics.PageView === 1 ? "1 page visit" : `${eventMetrics.PageView} page visits`) : "Trigger paused in settings"}
                </div>
              </div>
            </div>

            {/* ViewContent */}
            <div className={`rounded-2xl border p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-h-[115px] ${trackViewContent ? "border-stone-200/90 bg-white hover:border-purple-300" : "border-stone-200 bg-stone-50/60 opacity-80"}`}>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-stone-800 flex items-center gap-1.5 truncate">
                  <Sparkles className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                  <span>ViewContent</span>
                </span>
                {trackViewContent ? (
                  eventMetrics.total > 0 && (
                    <span className="text-[11px] font-mono font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100/60 shrink-0">
                      {Math.round((eventMetrics.ViewContent / eventMetrics.total) * 100)}%
                    </span>
                  )
                ) : (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                    Silenced
                  </span>
                )}
              </div>
              <div className="my-1.5">
                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
                  {eventMetrics.ViewContent.toLocaleString()}
                </div>
                <div className="text-[11px] text-stone-400 mt-0.5">
                  {trackViewContent ? (eventMetrics.ViewContent === 1 ? "1 product view" : `${eventMetrics.ViewContent} product views`) : "Trigger paused in settings"}
                </div>
              </div>
            </div>

            {/* AddToCart */}
            <div className={`rounded-2xl border p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-h-[115px] ${trackAddToCart ? "border-stone-200/90 bg-white hover:border-amber-300" : "border-stone-200 bg-stone-50/60 opacity-80"}`}>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-stone-800 flex items-center gap-1.5 truncate">
                  <ShoppingBag className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span>AddToCart</span>
                </span>
                {trackAddToCart ? (
                  eventMetrics.total > 0 && (
                    <span className="text-[11px] font-mono font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100/60 shrink-0">
                      {Math.round((eventMetrics.AddToCart / eventMetrics.total) * 100)}%
                    </span>
                  )
                ) : (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                    Silenced
                  </span>
                )}
              </div>
              <div className="my-1.5">
                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
                  {eventMetrics.AddToCart.toLocaleString()}
                </div>
                <div className="text-[11px] text-stone-400 mt-0.5">
                  {trackAddToCart ? (eventMetrics.AddToCart === 1 ? "1 cart action" : `${eventMetrics.AddToCart} cart actions`) : "Trigger paused in settings"}
                </div>
              </div>
            </div>

            {/* InitiateCheckout */}
            <div className={`rounded-2xl border p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-h-[115px] ${trackInitiateCheckout ? "border-stone-200/90 bg-white hover:border-indigo-300" : "border-stone-200 bg-stone-50/60 opacity-80"}`}>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-stone-800 flex items-center gap-1.5 truncate">
                  <ShoppingCart className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span>Checkout</span>
                </span>
                {trackInitiateCheckout ? (
                  eventMetrics.total > 0 && (
                    <span className="text-[11px] font-mono font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100/60 shrink-0">
                      {Math.round((eventMetrics.InitiateCheckout / eventMetrics.total) * 100)}%
                    </span>
                  )
                ) : (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                    Silenced
                  </span>
                )}
              </div>
              <div className="my-1.5">
                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
                  {eventMetrics.InitiateCheckout.toLocaleString()}
                </div>
                <div className="text-[11px] text-stone-400 mt-0.5">
                  {trackInitiateCheckout ? (eventMetrics.InitiateCheckout === 1 ? "1 checkout step" : `${eventMetrics.InitiateCheckout} checkouts`) : "Trigger paused in settings"}
                </div>
              </div>
            </div>

            {/* Purchase */}
            <div className={`rounded-2xl border p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-h-[115px] ${trackPurchase ? "border-stone-200/90 bg-white hover:border-emerald-300" : "border-stone-200 bg-stone-50/60 opacity-80"}`}>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5 truncate">
                  <CreditCard className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Purchase</span>
                </span>
                {trackPurchase ? (
                  eventMetrics.total > 0 && (
                    <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/60 shrink-0">
                      {Math.round((eventMetrics.Purchase / eventMetrics.total) * 100)}%
                    </span>
                  )
                ) : (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                    Silenced
                  </span>
                )}
              </div>
              <div className="my-1.5">
                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-700">
                  {eventMetrics.Purchase.toLocaleString()}
                </div>
                <div className="text-[11px] text-stone-400 mt-0.5">
                  {trackPurchase ? (eventMetrics.Purchase === 1 ? "1 verified order" : `${eventMetrics.Purchase} orders`) : "Trigger paused in settings"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 7. Sub-Tabs Navigation (Clean & High-Contrast) ── */}
      <div className="flex items-center border-b border-stone-200 gap-6 sm:gap-8 text-xs font-bold overflow-x-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
        <button
          type="button"
          onClick={() => setActiveTab("activity")}
          className={`flex items-center gap-2 pb-3 border-b-2 transition cursor-pointer ${
            activeTab === "activity"
              ? "border-stone-900 text-stone-900"
              : "border-transparent text-stone-400 hover:text-stone-700"
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>Activity Stream &amp; Logs</span>
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-mono text-stone-700">
            {filteredEvents.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("diagnostics")}
          className={`flex items-center gap-2 pb-3 border-b-2 transition cursor-pointer ${
            activeTab === "diagnostics"
              ? "border-stone-900 text-stone-900"
              : "border-transparent text-stone-400 hover:text-stone-700"
          }`}
        >
          <FlaskConical className="h-4 w-4" />
          <span>Testing &amp; Diagnostics Playground</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 pb-3 border-b-2 transition cursor-pointer ${
            activeTab === "settings"
              ? "border-stone-900 text-stone-900"
              : "border-transparent text-stone-400 hover:text-stone-700"
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Dataset Configuration</span>
        </button>
      </div>

      {/* ── 8. Tab 1: Event Activity Stream & Table (Linear/Stripe Quality) ── */}
      {activeTab === "activity" && (
        <div className="space-y-4">
          {/* Table Toolbar & Filters */}
          <div className="rounded-xl border border-stone-200/90 bg-white p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Filter by Event ID, Order #, or URL..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg border border-stone-200 bg-stone-50/60 pl-8 pr-3 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearActivity}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition cursor-pointer shadow-2xs"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Clear Stream</span>
                </button>
              </div>
            </div>

            {/* Quick Filter Selectors */}
            <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-stone-100 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 font-semibold">Event:</span>
                <select
                  value={filterEvent}
                  onChange={(e) => {
                    setFilterEvent(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-medium text-stone-700 focus:outline-none cursor-pointer"
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
                <span className="text-stone-500 font-semibold">Source:</span>
                <select
                  value={filterSource}
                  onChange={(e) => {
                    setFilterSource(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-medium text-stone-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Sources</option>
                  <option value="browser">Browser Pixel</option>
                  <option value="server">Server CAPI</option>
                  <option value="test_simulator">Test Simulator</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 font-semibold">Delivery Status:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-medium text-stone-700 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="accepted">Meta Accepted (HTTP 200)</option>
                  <option value="queued">Queued in Ledger</option>
                  <option value="processing">Processing</option>
                  <option value="retrying">Retrying</option>
                  <option value="failed">Delivery Failed</option>
                  <option value="dispatched">Browser Dispatched</option>
                </select>
              </div>

              {(searchQuery || filterEvent !== "ALL" || filterSource !== "ALL" || filterStatus !== "ALL" || filterDate !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setFilterEvent("ALL");
                    setFilterSource("ALL");
                    setFilterStatus("ALL");
                    setFilterDate("all");
                    setCurrentPage(1);
                  }}
                  className="text-stone-500 hover:text-stone-900 font-bold ml-auto cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Activity Table */}
          <div className="rounded-xl border border-stone-200/90 bg-white shadow-xs overflow-hidden">
            {paginatedEvents.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mx-auto">
                  <Activity className="h-6 w-6" />
                </div>
                <div className="text-sm font-bold text-stone-800">No Conversion Events Recorded</div>
                <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                  {events.length === 0
                    ? "No conversion events logged yet. Open your store in Test Mode or trigger a sample event in the Testing tab."
                    : "No events match the active search and filter criteria. Reset filters to view all entries."}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("diagnostics")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800 transition cursor-pointer"
                >
                  <FlaskConical className="h-3.5 w-3.5" />
                  <span>Open Testing Playground</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50/75 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Event Name</th>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4">Deduplication Key (Event ID)</th>
                      <th className="py-3 px-4">Received Time</th>
                      <th className="py-3 px-4">Delivery Status</th>
                      <th className="py-3 px-4 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {paginatedEvents.map((ev) => {
                      const isExpanded = expandedEventId === ev.id;
                      const dateObj = new Date(ev.timestamp);
                      const displayTime = dateObj.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      });
                      const fullIso = dateObj.toLocaleString();

                      const effectiveStatus =
                        ev.status || (ev.source === "server" ? "delivered" : "dispatched");

                      return (
                        <tr
                          key={ev.id}
                          className={`transition ${isExpanded ? "bg-stone-50/90" : "hover:bg-stone-50/50"}`}
                        >
                          {/* Event Name */}
                          <td className="py-3 px-4 font-semibold text-stone-900">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-bold text-[11px] border ${
                                ev.name === "Purchase"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : ev.name === "AddToCart"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : ev.name === "InitiateCheckout"
                                  ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                                  : ev.name === "ViewContent"
                                  ? "bg-purple-50 text-purple-800 border-purple-200"
                                  : "bg-blue-50 text-blue-800 border-blue-200"
                              }`}
                            >
                              {ev.name}
                            </span>
                          </td>

                          {/* Source */}
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-stone-700">
                              {ev.source === "server" ? (
                                <>
                                  <Server className="h-3.5 w-3.5 text-stone-500" />
                                  <span>Server CAPI</span>
                                </>
                              ) : ev.source === "test_simulator" ? (
                                <>
                                  <FlaskConical className="h-3.5 w-3.5 text-stone-500" />
                                  <span>Simulator</span>
                                </>
                              ) : (
                                <>
                                  <Globe className="h-3.5 w-3.5 text-stone-500" />
                                  <span>Browser</span>
                                </>
                              )}
                            </span>
                          </td>

                          {/* Event ID */}
                          <td className="py-3 px-4 font-mono text-[11px] text-stone-600">
                            {ev.eventId ? (
                              <div className="inline-flex items-center gap-1.5">
                                <span className="font-bold text-stone-900 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200/60">
                                  {ev.eventId}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyEventId(ev.eventId!)}
                                  className="text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer rounded hover:bg-stone-100"
                                  title="Copy Event ID"
                                >
                                  {copiedEventId === ev.eventId ? (
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-stone-400 italic">None</span>
                            )}
                          </td>

                          {/* Received Time */}
                          <td className="py-3 px-4 text-stone-600 font-mono text-[11px]" title={fullIso}>
                            <span suppressHydrationWarning>{displayTime}</span>
                          </td>

                          {/* Delivery Status */}
                          <td className="py-3 px-4">
                            {effectiveStatus === "accepted" || effectiveStatus === "delivered" ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-800 border border-emerald-500/20"
                                title={ev.fbtraceId ? `fbtrace_id: ${ev.fbtraceId}` : "Confirmed by Meta"}
                              >
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                <span>Meta Accepted</span>
                              </span>
                            ) : effectiveStatus === "queued" ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200"
                                title="Queued in durable MongoDB ledger"
                              >
                                <Clock className="h-3 w-3 text-blue-500" />
                                <span>Queued</span>
                              </span>
                            ) : effectiveStatus === "processing" ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                                title="Processing delivery"
                              >
                                <RefreshCw className="h-3 w-3 text-indigo-500 animate-spin" />
                                <span>Processing</span>
                              </span>
                            ) : effectiveStatus === "retrying" ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                                title={ev.error || "Scheduled for backoff retry"}
                              >
                                <Clock className="h-3 w-3 text-amber-600" />
                                <span>Retrying ({ev.attemptCount || 1}/5)</span>
                              </span>
                            ) : effectiveStatus === "failed" ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-rose-500/10 text-rose-800 border border-rose-500/20"
                                title={ev.error || "Delivery rejected"}
                              >
                                <AlertCircle className="h-3 w-3 text-rose-600" />
                                <span>Delivery Failed</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                                <span>Dispatched</span>
                              </span>
                            )}
                          </td>

                          {/* Expand details */}
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold text-stone-700 hover:bg-stone-200/70 transition cursor-pointer"
                            >
                              <span>{isExpanded ? "Close" : "Inspect"}</span>
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5 text-stone-400" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3.5 border-t border-stone-200 bg-stone-50/70 flex items-center justify-between text-xs text-stone-600">
                <div className="flex items-center gap-3">
                  <div>
                    Showing{" "}
                    <span className="font-bold text-stone-800">
                      {(currentPage - 1) * itemsPerPage + 1}–
                      {Math.min(currentPage * itemsPerPage, filteredEvents.length)}
                    </span>{" "}
                    of <span className="font-bold text-stone-800">{filteredEvents.length}</span> events
                  </div>

                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded-md border border-stone-200 bg-white px-2 py-0.5 text-[11px] font-bold text-stone-700"
                  >
                    <option value={10}>10 / page</option>
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="rounded-md border border-stone-200 bg-white px-2.5 py-1 font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="px-2 font-mono text-[11px]">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-md border border-stone-200 bg-white px-2.5 py-1 font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Deep Inspection Drawer (Clean & Executive) */}
          {expandedEventId && (
            (() => {
              const activeEv = events.find((e) => e.id === expandedEventId);
              if (!activeEv) return null;

              const hasCurrencyBdt = activeEv.parameters?.currency === "BDT";
              const hasValue = activeEv.parameters?.value !== undefined;
              const hasContentIds = Array.isArray(activeEv.parameters?.content_ids);
              const hasEventId = Boolean(activeEv.eventId);

              return (
                <div className="rounded-xl border border-stone-300 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-stone-100 text-stone-700">
                        <FileJson className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                          Telemetry Inspection: {activeEv.name}
                        </h4>
                        <p className="text-[11px] text-stone-400 font-mono">ID: {activeEv.id}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeEv.source === "server" && (activeEv.status === "failed" || activeEv.status === "retrying") && (
                        <button
                          type="button"
                          onClick={() => handleManualRetry(activeEv.id, activeEv.eventId)}
                          disabled={retryingLogId === activeEv.id}
                          className="inline-flex items-center gap-1 rounded-md bg-stone-900 text-white px-2.5 py-1 text-xs font-semibold hover:bg-stone-800 disabled:opacity-50 cursor-pointer shadow-2xs"
                        >
                          <RefreshCw className={`h-3 w-3 ${retryingLogId === activeEv.id ? "animate-spin" : ""}`} />
                          <span>Retry Delivery</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopyPayloadJson(activeEv.id, activeEv)}
                        className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2.5 py-1 text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
                      >
                        {copiedPayloadId === activeEv.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span>Copied JSON</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy Payload</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedEventId(null)}
                        className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Inspection Sub-Tabs */}
                  <div className="flex border-b border-stone-100 gap-4 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setInspectionTab("payload")}
                      className={`pb-1.5 border-b-2 transition cursor-pointer ${
                        inspectionTab === "payload"
                          ? "border-stone-900 text-stone-900"
                          : "border-transparent text-stone-400 hover:text-stone-700"
                      }`}
                    >
                      Formatted JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectionTab("validation")}
                      className={`pb-1.5 border-b-2 transition cursor-pointer ${
                        inspectionTab === "validation"
                          ? "border-stone-900 text-stone-900"
                          : "border-transparent text-stone-400 hover:text-stone-700"
                      }`}
                    >
                      Validation &amp; Schema Health
                    </button>
                  </div>

                  {inspectionTab === "payload" && (
                    <div className="rounded-lg border border-stone-200 bg-stone-950 p-4 text-stone-100 font-mono text-xs overflow-x-auto shadow-inner">
                      <pre suppressHydrationWarning>
                        {JSON.stringify(
                          {
                            event_name: activeEv.name,
                            event_time: activeEv.timestamp,
                            event_source_url: activeEv.url,
                            event_id: activeEv.eventId,
                            source: activeEv.source,
                            status: activeEv.status,
                            custom_data: activeEv.parameters,
                            ...(activeEv.testEventCode ? { test_event_code: activeEv.testEventCode } : {}),
                            ...(activeEv.fbtraceId ? { fbtrace_id: activeEv.fbtraceId } : {}),
                            ...(activeEv.error ? { error: activeEv.error } : {}),
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  )}

                  {inspectionTab === "validation" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-lg border border-stone-200/70 p-3 space-y-1.5 bg-stone-50/50">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-700">Deduplication Key (event_id)</span>
                          {hasEventId ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Valid
                            </span>
                          ) : (
                            <span className="text-stone-400 font-medium">Not Required for {activeEv.name}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-500">
                          {hasEventId
                            ? `Key '${activeEv.eventId}' enables Meta to deduplicate browser and server entries.`
                            : "Standard traffic events (PageView) don't require order-scoped deduplication keys."}
                        </p>
                      </div>

                      <div className="rounded-lg border border-stone-200/70 p-3 space-y-1.5 bg-stone-50/50">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-700">Currency Standard</span>
                          {hasCurrencyBdt ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> BDT Compliant
                            </span>
                          ) : (
                            <span className="text-stone-400 font-medium">N/A</span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-500">
                          {hasCurrencyBdt
                            ? "All monetary amounts are strictly formatted for Bangladesh Taka (BDT)."
                            : "Event payload does not contain financial values."}
                        </p>
                      </div>

                      <div className="rounded-lg border border-stone-200/70 p-3 space-y-1.5 bg-stone-50/50">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-700">Monetary Value (value)</span>
                          {hasValue ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Present ({String(activeEv.parameters?.value)} BDT)
                            </span>
                          ) : (
                            <span className="text-stone-400 font-medium">N/A</span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-500">
                          Required for ROAS reporting and Meta value-based ad bidding algorithms.
                        </p>
                      </div>

                      <div className="rounded-lg border border-stone-200/70 p-3 space-y-1.5 bg-stone-50/50">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-700">Content IDs (Catalog Matching)</span>
                          {hasContentIds ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Valid Array
                            </span>
                          ) : (
                            <span className="text-stone-400 font-medium">N/A</span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-500">
                          Matches products with your Meta Commerce Catalog for Dynamic Retargeting Ads.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* ── 9. Tab 2: Testing & Diagnostics Playground ── */}
      {activeTab === "diagnostics" && (
        <div className="space-y-6">
          {/* CAPI Live Connection Diagnostic */}
          <div className="rounded-xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-stone-700" />
                  <h3 className="text-sm font-bold text-stone-900">
                    Server Conversions API (CAPI) Live Verification
                  </h3>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Transmit an authenticated diagnostic ping directly to Meta Graph API v20.0 to verify token permissions.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestCapiConnection}
                disabled={testingCapi}
                className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-stone-800 transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${testingCapi ? "animate-spin" : ""}`} />
                <span>{testingCapi ? "Testing Gateway..." : "Test CAPI Connection Live"}</span>
              </button>
            </div>

            {capiTestResult && (
              <div
                className={`rounded-lg p-4 border text-xs space-y-1.5 ${
                  capiTestResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-2">
                    {capiTestResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-600" />
                    )}
                    <span>{capiTestResult.message}</span>
                  </div>
                  {capiTestResult.timestamp && (
                    <span className="text-[11px] font-mono opacity-60">{capiTestResult.timestamp}</span>
                  )}
                </div>
                {capiTestResult.fbtraceId && (
                  <p className="font-mono text-[11px] opacity-80 pt-1 border-t border-current/10">
                    Meta Graph Trace ID (fbtrace_id): {capiTestResult.fbtraceId}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Interactive Event Dispatch Playground */}
          <div className="rounded-xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-stone-700" />
                <h3 className="text-sm font-bold text-stone-900">Interactive Event Dispatcher</h3>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Trigger real standard e-commerce events with verified BDT payloads to test tracking pipelines.
              </p>
            </div>

            {/* Event Selection & Mode Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-stone-50/70 border border-stone-200/70 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-stone-700">Select Standard Event:</label>
                <select
                  value={selectedSimulatorEvent}
                  onChange={(e) => setSelectedSimulatorEvent(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400 cursor-pointer"
                >
                  <option value="PageView">PageView (Storefront Visit)</option>
                  <option value="ViewContent">ViewContent (Product View)</option>
                  <option value="AddToCart">AddToCart (Cart Addition)</option>
                  <option value="InitiateCheckout">InitiateCheckout (Checkout Load)</option>
                  <option value="Purchase">Purchase (Order Verified)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-stone-700">Dispatch Pipeline:</label>
                <select
                  value={simulatorMode}
                  onChange={(e) => setSimulatorMode(e.target.value as "both" | "browser" | "server")}
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400 cursor-pointer"
                >
                  <option value="both">Both (Browser Pixel + Server CAPI with Paired ID)</option>
                  <option value="browser">Browser Pixel Only (window.fbq)</option>
                  <option value="server">Server CAPI Only (Direct Graph API)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleRunSimulator}
                  disabled={Boolean(simulatingEvent)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2 font-bold text-white hover:bg-stone-800 transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Zap className={`h-4 w-4 ${simulatingEvent ? "animate-pulse text-amber-400" : ""}`} />
                  <span>{simulatingEvent ? "Dispatching..." : `Trigger ${selectedSimulatorEvent}`}</span>
                </button>
              </div>
            </div>

            {/* Live Playground Logs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-stone-700 font-bold">
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Dispatcher Execution Log</span>
                </div>
                {simulatorLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSimulatorLogs([])}
                    className="text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    Clear Logs
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-950 p-3.5 font-mono text-[11px] text-stone-300 min-h-[120px] max-h-[220px] overflow-y-auto space-y-1 shadow-inner">
                {simulatorLogs.length === 0 ? (
                  <div className="text-stone-500 italic py-8 text-center">
                    No simulation events fired during this session. Select an event above and click &quot;Trigger&quot;.
                  </div>
                ) : (
                  simulatorLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`flex items-start gap-2 ${
                        log.type === "success"
                          ? "text-emerald-400"
                          : log.type === "error"
                          ? "text-rose-400"
                          : "text-stone-300"
                      }`}
                    >
                      <span className="text-stone-500 select-none">[{log.time}]</span>
                      <span className="flex-1">{log.text}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Deduplication Architecture Inspector */}
          <div className="rounded-xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <CheckCheck className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-stone-900">
                  Browser &amp; Server Deduplication Architecture
                </h3>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                How ANGKON pairs client-side pixel events with server Conversions API to achieve 100% conversion accuracy.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
              <div className="rounded-xl border border-stone-200/70 bg-stone-50/60 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-stone-800">
                  <div className="h-6 w-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center text-[11px]">
                    1
                  </div>
                  <span>Browser Dispatch</span>
                </div>
                <p className="text-stone-600 text-[11px] leading-relaxed">
                  Checkout confirmation executes <code className="font-mono font-bold text-stone-800">fbq(&apos;track&apos;, &apos;Purchase&apos;, payload, &#123; eventID &#125;)</code>.
                  SessionStorage prevents duplicates on refresh.
                </p>
              </div>

              <div className="rounded-xl border border-stone-200/70 bg-stone-50/60 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-stone-800">
                  <div className="h-6 w-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px]">
                    2
                  </div>
                  <span>Server CAPI Dispatch</span>
                </div>
                <p className="text-stone-600 text-[11px] leading-relaxed">
                  Upon verified order creation, backend sends payload with identical <code className="font-mono font-bold text-stone-800">event_id: order_12345</code> directly to Graph API.
                </p>
              </div>

              <div className="rounded-xl border border-stone-200/70 bg-stone-50/60 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-stone-800">
                  <div className="h-6 w-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center text-[11px]">
                    3
                  </div>
                  <span>Meta 48h Merge</span>
                </div>
                <p className="text-stone-600 text-[11px] leading-relaxed">
                  Meta merges both events using identical <code className="font-mono font-bold text-stone-800">event_name</code> + <code className="font-mono font-bold text-stone-800">event_id</code> into a single conversion.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 10. Tab 3: Dataset Settings (Polished Form) ── */}
      {activeTab === "settings" && (
        <form onSubmit={handleSaveSettings} className="rounded-xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100">
            <div>
              <h3 className="text-base font-bold text-stone-900">Dataset Configuration</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Manage your Meta Pixel / Dataset ID and tracking behavior.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs font-bold text-stone-800 block">Master Tracking</span>
                <span className="text-[11px] text-stone-500 block">
                  {togglingMaster
                    ? "Saving state..."
                    : enabled
                    ? "Storefront & CAPI Active"
                    : "Tracking Paused"}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                disabled={togglingMaster || saving}
                onClick={() => handleToggleMasterTracking(!enabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 disabled:opacity-50 ${
                  enabled ? "bg-emerald-600" : "bg-stone-300"
                }`}
                title={enabled ? "Click to pause tracking" : "Click to enable tracking"}
              >
                <span className="sr-only">Toggle Master Tracking</span>
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* Meta Dataset ID */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-stone-800">
                  Meta Pixel / Dataset ID <span className="text-rose-500">*</span>
                </label>
                {isConnected ? (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded">
                    Connected
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-stone-500 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded">
                    Disconnected
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={pixelId}
                  onChange={(e) => setPixelId(e.target.value)}
                  placeholder="Enter 10 to 25 digit numeric ID (or click Clear/Disconnect)"
                  className="w-full rounded-lg border border-stone-200 bg-stone-50/70 pl-3 pr-16 py-2 font-mono text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
                {pixelId && (
                  <button
                    type="button"
                    onClick={() => setPixelId("")}
                    className="absolute right-2 top-1.5 px-2 py-0.5 text-[11px] font-bold text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 rounded transition cursor-pointer"
                    title="Clear field"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-[11px] text-stone-500">
                Found in Meta Events Manager &gt; Dataset Settings. Leave blank or click Disconnect to remove tracking.
              </p>
            </div>

            {/* Test Event Code */}
            <div className="space-y-1.5">
              <label className="font-bold text-stone-800">Meta Test Event Code (Optional)</label>
              <input
                type="text"
                value={testEventCode}
                onChange={(e) => setTestEventCode(e.target.value.toUpperCase())}
                placeholder="e.g. TEST12345"
                className="w-full rounded-lg border border-stone-200 bg-stone-50/70 px-3 py-2 font-mono text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
              <p className="text-[11px] text-stone-500">
                Found in Meta Events Manager &gt; Test Events tab. Leave blank in production.
              </p>
            </div>
          </div>

          {/* Standard Event Suppression Toggles */}
          <div className="space-y-3 pt-4 border-t border-stone-100">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                Standard Event Triggers (Granular Suppression)
              </h4>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Disable specific event triggers if you wish to silence individual conversion stages. Unchecked events receive zero data across browser and server.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <label className={`flex items-start gap-2.5 p-3 rounded-lg border transition-all cursor-pointer ${trackPageView ? "border-stone-200 bg-stone-50/40 hover:bg-stone-50" : "border-stone-200 bg-stone-100/60 opacity-75"}`}>
                <input
                  type="checkbox"
                  checked={trackPageView}
                  onChange={(e) => setTrackPageView(e.target.checked)}
                  className="rounded border-stone-300 text-stone-900 focus:ring-0 mt-0.5"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">PageView</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${trackPageView ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-amber-800 bg-amber-50 border-amber-200"}`}>
                      {trackPageView ? "Active" : "Silenced"}
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-500 block leading-tight">
                    {trackPageView ? "Global site traffic and route navigation" : "Suppressed: No pageview data received"}
                  </span>
                </div>
              </label>

              <label className={`flex items-start gap-2.5 p-3 rounded-lg border transition-all cursor-pointer ${trackViewContent ? "border-stone-200 bg-stone-50/40 hover:bg-stone-50" : "border-stone-200 bg-stone-100/60 opacity-75"}`}>
                <input
                  type="checkbox"
                  checked={trackViewContent}
                  onChange={(e) => setTrackViewContent(e.target.checked)}
                  className="rounded border-stone-300 text-stone-900 focus:ring-0 mt-0.5"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">ViewContent</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${trackViewContent ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-amber-800 bg-amber-50 border-amber-200"}`}>
                      {trackViewContent ? "Active" : "Silenced"}
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-500 block leading-tight">
                    {trackViewContent ? "Product details page opens (/products/[slug])" : "Suppressed: No view content data received"}
                  </span>
                </div>
              </label>

              <label className={`flex items-start gap-2.5 p-3 rounded-lg border transition-all cursor-pointer ${trackAddToCart ? "border-stone-200 bg-stone-50/40 hover:bg-stone-50" : "border-stone-200 bg-stone-100/60 opacity-75"}`}>
                <input
                  type="checkbox"
                  checked={trackAddToCart}
                  onChange={(e) => setTrackAddToCart(e.target.checked)}
                  className="rounded border-stone-300 text-stone-900 focus:ring-0 mt-0.5"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">AddToCart</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${trackAddToCart ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-amber-800 bg-amber-50 border-amber-200"}`}>
                      {trackAddToCart ? "Active" : "Silenced"}
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-500 block leading-tight">
                    {trackAddToCart ? "Cart additions with product IDs & price" : "Suppressed: No add-to-cart data received"}
                  </span>
                </div>
              </label>

              <label className={`flex items-start gap-2.5 p-3 rounded-lg border transition-all cursor-pointer ${trackInitiateCheckout ? "border-stone-200 bg-stone-50/40 hover:bg-stone-50" : "border-stone-200 bg-stone-100/60 opacity-75"}`}>
                <input
                  type="checkbox"
                  checked={trackInitiateCheckout}
                  onChange={(e) => setTrackInitiateCheckout(e.target.checked)}
                  className="rounded border-stone-300 text-stone-900 focus:ring-0 mt-0.5"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">InitiateCheckout</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${trackInitiateCheckout ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-amber-800 bg-amber-50 border-amber-200"}`}>
                      {trackInitiateCheckout ? "Active" : "Silenced"}
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-500 block leading-tight">
                    {trackInitiateCheckout ? "Checkout screen load with subtotal value" : "Suppressed: No checkout start data received"}
                  </span>
                </div>
              </label>

              <label className={`flex items-start gap-2.5 p-3 rounded-lg border transition-all cursor-pointer ${trackPurchase ? "border-stone-200 bg-stone-50/40 hover:bg-stone-50" : "border-stone-200 bg-stone-100/60 opacity-75"}`}>
                <input
                  type="checkbox"
                  checked={trackPurchase}
                  onChange={(e) => setTrackPurchase(e.target.checked)}
                  className="rounded border-stone-300 text-stone-900 focus:ring-0 mt-0.5"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">Purchase</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${trackPurchase ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-amber-800 bg-amber-50 border-amber-200"}`}>
                      {trackPurchase ? "Active" : "Silenced"}
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-500 block leading-tight">
                    {trackPurchase ? "Cash on Delivery & SSLCommerz order completion" : "Suppressed: No purchase data received"}
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              {isConnected ? (
                <button
                  type="button"
                  disabled={saving || togglingMaster}
                  onClick={handleDisconnectDataset}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 px-3.5 py-2 rounded-lg transition cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                  <span>Disconnect Dataset</span>
                </button>
              ) : (
                <span className="text-[11px] text-stone-400">
                  Enter a valid Meta Dataset ID and click Save Settings to begin tracking.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {settings?.updatedAt && (
                <span className="text-[11px] text-stone-500 font-medium mr-1">
                  Last saved: {new Date(settings.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
              <button
                type="submit"
                disabled={saving || togglingMaster}
                className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-stone-800 transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{saving ? "Saving Changes..." : "Save Settings"}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
