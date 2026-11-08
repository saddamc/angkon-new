import Link from "next/link";
import {
  Share2,
  ChevronDown,
  Key,
  Check,
  Smartphone,
  Settings,
  Plus,
  CheckCircle2,
  Copy,
  Calendar,
  BookOpen,
  RefreshCw,
  Activity,
  PlayCircle,
  Sparkles,
  FileJson,
} from "lucide-react";
import type { EventsTabType } from "../_types/events.types";

interface EventsWorkspaceHeaderProps {
  selectedDataset: "angkon_pixel" | "angkon_catalog";
  setSelectedDataset: (d: "angkon_pixel" | "angkon_catalog") => void;
  isDatasetMenuOpen: boolean;
  setIsDatasetMenuOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  pixelId: string;
  copiedDatasetId: boolean;
  onCopyDatasetId: () => void;
  datePreset: "today" | "7d" | "28d" | "month" | "year";
  setDatePreset: (p: "today" | "7d" | "28d" | "month" | "year") => void;
  datePresetLabel: string;
  isDateMenuOpen: boolean;
  setIsDateMenuOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  setChartPeriod: (p: "today" | "7d" | "30d" | "month" | "year") => void;
  onOpenGuide: () => void;
  syncStatus: "synchronizing" | "up_to_date" | "stale" | "failed" | "permission_required" | "unavailable";
  isSyncing: boolean;
  loading: boolean;
  lastSyncedAt: Date | null;
  nowMs: number;
  onManualSync: () => void;
  onOpenConnectModal: () => void;
  activeTab: EventsTabType;
  isTelemetryTab: boolean;
  onTabChange: (tab: EventsTabType) => void;
  isResolvedError: boolean;
  isIgnoredError: boolean;
}

export function EventsWorkspaceHeader({
  selectedDataset,
  setSelectedDataset,
  isDatasetMenuOpen,
  setIsDatasetMenuOpen,
  pixelId,
  copiedDatasetId,
  onCopyDatasetId,
  datePreset,
  setDatePreset,
  datePresetLabel,
  isDateMenuOpen,
  setIsDateMenuOpen,
  setChartPeriod,
  onOpenGuide,
  syncStatus,
  isSyncing,
  loading,
  lastSyncedAt,
  nowMs,
  onManualSync,
  onOpenConnectModal,
  activeTab,
  isTelemetryTab,
  onTabChange,
  isResolvedError,
  isIgnoredError,
}: EventsWorkspaceHeaderProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5">
      {/* Top Row: Dataset Identifier, Business Dropdown, Date Selector & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Dataset Identity with Edit Pencil & Dropdown Switcher */}
        <div className="flex items-center gap-3">
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
                          onOpenConnectModal();
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
                onClick={onCopyDatasetId}
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

        {/* Right: Business Account, Date Range, Asset Guide & Green Create Button */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Business Account Pill */}
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
            onClick={onOpenGuide}
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
              onClick={onManualSync}
              disabled={isSyncing}
              className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition cursor-pointer ml-1"
              title="Trigger immediate server-side synchronization with Meta Graph API v22.0"
              aria-label="Refresh Meta synchronization"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>

          {/* Meta Green "Create +" Button */}
          <button
            type="button"
            onClick={onOpenConnectModal}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#008060] hover:bg-[#006e52] text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <span>Create</span>
            <Plus className="h-3.5 w-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* 6 Main Workspace Tabs directly underneath */}
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
              onClick={() => onTabChange(tab.id as EventsTabType)}
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
  );
}
