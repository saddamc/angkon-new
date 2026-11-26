"use client";

import React, { useState, useMemo } from "react";
import {
  MessageSquare,
  MessageSquarePlus,
  Send,
  Lock,
  Tag,
  Copy,
  Check,
  History,
  Clock,
  ArrowRight,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Banknote,
  Truck,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Filter,
  User,
  Bot,
} from "lucide-react";
import type { OrderDetailsPayload, OrderRefundRecord } from "../_types/orders.types";
import { formatBDT } from "../_types/orders.types";

export interface OrderActivityViewProps {
  order: OrderDetailsPayload["order"];
  timeline: OrderDetailsPayload["timeline"];
  refunds?: OrderRefundRecord[];
  busy?: boolean;
  onAddNote: (text: string) => Promise<boolean>;
  isDrawer?: boolean;
}

type ActivityCategory = "all" | "notes" | "status" | "payment" | "shipment" | "audit";

const QUICK_TAGS = [
  { label: "Customer Confirmed", tag: "[Customer Confirmed] " },
  { label: "Address Verified", tag: "[Address Verified] " },
  { label: "Urgent Dispatch", tag: "[Urgent Dispatch] " },
  { label: "COD Agreement", tag: "[COD Agreement] " },
  { label: "Unreachable / Switched Off", tag: "[Customer Unreachable] " },
];

function formatDateTime(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function getRelativeTime(v?: string | null): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const now = Date.now();
  const diffSec = Math.floor((now - d.getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

function getInitials(name?: string | null): string {
  if (!name) return "AD";
  const clean = name.replace(/@.*$/, "").replace(/[^a-zA-Z0-9 ]/g, " ").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (name[0] || "A").toUpperCase();
}

function getStatusBadgeStyle(status: string) {
  const s = status.toLowerCase();
  switch (s) {
    case "confirmed":
      return "bg-sky-50 text-sky-800 border-sky-200";
    case "processing":
      return "bg-blue-50 text-blue-800 border-blue-200";
    case "ready_to_ship":
    case "ready to ship":
      return "bg-purple-50 text-purple-800 border-purple-200";
    case "shipped":
      return "bg-indigo-50 text-indigo-800 border-indigo-200";
    case "delivered":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "cancelled":
      return "bg-rose-50 text-rose-800 border-rose-200";
    case "returned":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "pending":
    default:
      return "bg-amber-50 text-amber-800 border-amber-200";
  }
}

function parseNoteTag(text: string): { tag: string | null; cleanText: string } {
  const match = text.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (match) {
    return { tag: match[1], cleanText: match[2] };
  }
  return { tag: null, cleanText: text };
}

export function OrderActivityView({
  order,
  timeline,
  refunds = [],
  busy = false,
  onAddNote,
  isDrawer = false,
}: OrderActivityViewProps) {
  const [noteInput, setNoteInput] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ActivityCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedDiffs, setExpandedDiffs] = useState<Record<string, boolean>>({});

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleToggleDiff = (id: string) => {
    setExpandedDiffs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleApplyTag = (tagString: string) => {
    if (noteInput.startsWith(tagString)) return;
    setNoteInput((prev) => {
      const stripped = prev.replace(/^\[[^\]]+\]\s*/, "");
      return `${tagString}${stripped}`;
    });
  };

  const handleSubmitNote = async () => {
    const trimmed = noteInput.trim();
    if (!trimmed || addingNote || busy) return;
    setAddingNote(true);
    try {
      const success = await onAddNote(trimmed);
      if (success) {
        setNoteInput("");
      }
    } finally {
      setAddingNote(false);
    }
  };

  // Filter counts matching actual timeline events
  const counts = useMemo(() => {
    const total = timeline.length;
    let notesCount = 0;
    let statusCount = 0;
    let paymentCount = 0;
    let shipmentCount = 0;
    let auditCount = 0;

    for (const ev of timeline) {
      if (ev.category === "note") notesCount++;
      else if (ev.category === "order") statusCount++;
      else if (ev.category === "payment") paymentCount++;
      else if (ev.category === "shipment") shipmentCount++;
      else if (ev.category === "audit") auditCount++;
    }

    return { total, notesCount, statusCount, paymentCount, shipmentCount, auditCount };
  }, [timeline]);

  // Filtered timeline items
  const filteredEvents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return timeline.filter((ev) => {
      // Category filter
      if (activeCategory === "notes" && ev.category !== "note") return false;
      if (activeCategory === "status" && ev.category !== "order") return false;
      if (activeCategory === "payment" && ev.category !== "payment") return false;
      if (activeCategory === "shipment" && ev.category !== "shipment") return false;
      if (activeCategory === "audit" && ev.category !== "audit") return false;

      // Search query
      if (q) {
        const matchesTitle = ev.title.toLowerCase().includes(q);
        const matchesDesc = ev.description.toLowerCase().includes(q);
        const matchesActor = ev.actor.toLowerCase().includes(q);
        const matchesNote = ev.note ? ev.note.toLowerCase().includes(q) : false;
        const matchesAction = ev.action ? ev.action.toLowerCase().includes(q) : false;
        return matchesTitle || matchesDesc || matchesActor || matchesNote || matchesAction;
      }

      return true;
    });
  }, [timeline, activeCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. ACTIVITY KPI SUMMARY PILL BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-xl border border-stone-200/80 bg-white p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Total Events
            </span>
            <History className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-1.5 text-xl font-extrabold text-stone-900 tabular-nums">
            {counts.total}
          </p>
          <span className="text-[10.5px] text-stone-400">Recorded history</span>
        </div>

        <div className="rounded-xl border border-stone-200/80 bg-white p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Team Notes
            </span>
            <MessageSquare className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-1.5 text-xl font-extrabold text-purple-900 tabular-nums">
            {counts.notesCount}
          </p>
          <span className="text-[10.5px] text-stone-400">Staff communications</span>
        </div>

        <div className="rounded-xl border border-stone-200/80 bg-white p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Status Changes
            </span>
            <CheckCircle2 className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-1.5 text-xl font-extrabold text-sky-900 tabular-nums">
            {counts.statusCount}
          </p>
          <span className="text-[10.5px] text-stone-400">Lifecycle milestones</span>
        </div>

        <div className="rounded-xl border border-stone-200/80 bg-white p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Payments & Scans
            </span>
            <Truck className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-1.5 text-xl font-extrabold text-indigo-900 tabular-nums">
            {counts.paymentCount + counts.shipmentCount}
          </p>
          <span className="text-[10.5px] text-stone-400">Gateway & Courier</span>
        </div>
      </div>

      {/* 1.5 REFUND SUMMARY (when refunds exist) */}
      {refunds.length > 0 && (
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/30 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-rose-900 uppercase tracking-wider">
              <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
              Refunds ({refunds.length})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {refunds.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-[11.5px] flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="font-mono font-bold text-gray-900 truncate">{r.refundId}</p>
                  <p className="text-[10.5px] text-gray-500 truncate">
                    {r.refundChannel === "manual_offline" ? "Manual Offline" : "SSLCOMMERZ"} · {r.reason}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-900">{formatBDT(r.amount)}</p>
                  <span className="text-[10px] font-bold uppercase text-purple-700">{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. ADMIN NOTES WORKSPACE */}
      <div className="rounded-2xl border border-purple-100 bg-linear-to-b from-purple-50/30 via-white to-white p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
              <MessageSquarePlus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-stone-900">Internal Team Notes</h3>
              <p className="text-[11px] text-stone-500">
                Visible only to staff. Appended to immutable order audit log.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100/80 px-2.5 py-0.5 text-[10.5px] font-semibold text-purple-800">
            <Lock className="h-3 w-3" /> Staff Only
          </span>
        </div>

        {/* Note Composer */}
        <div className="space-y-2.5">
          <div className="relative rounded-xl border border-stone-200 bg-white shadow-2xs focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
            <textarea
              rows={isDrawer ? 2 : 3}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void handleSubmitNote();
                }
              }}
              placeholder="Write an internal note, phone call verification, dispatch instruction..."
              className="w-full resize-none bg-transparent px-3.5 py-2.5 text-[12.5px] text-stone-900 outline-none placeholder:text-stone-400"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 bg-stone-50/50 px-3 py-2 rounded-b-xl">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-stone-400 flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Quick Tags:
                </span>
                {QUICK_TAGS.map((qt) => (
                  <button
                    key={qt.label}
                    type="button"
                    onClick={() => handleApplyTag(qt.tag)}
                    className="rounded-md border border-stone-200 bg-white px-2 py-0.5 text-[10.5px] font-medium text-stone-700 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 transition-colors cursor-pointer"
                  >
                    {qt.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <span className="hidden sm:inline text-[10.5px] text-stone-400">
                  Ctrl + Enter to send
                </span>
                <button
                  type="button"
                  disabled={!noteInput.trim() || addingNote || busy}
                  onClick={() => void handleSubmitNote()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-[12px] font-bold text-white shadow-xs hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {addingNote ? (
                    <>
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="h-3 w-3" />
                      Post Note
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Existing Notes Feed */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-400">
            <span>Recent Notes ({order.adminNotes?.length || 0})</span>
          </div>

          {(!order.adminNotes || order.adminNotes.length === 0) ? (
            <div className="rounded-xl border border-dashed border-stone-200 p-5 text-center bg-stone-50/50">
              <p className="text-[12px] font-medium text-stone-600">No internal notes yet</p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Notes written here are timestamped with staff attribution and never visible to customers.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {[...order.adminNotes].reverse().map((n) => {
                const { tag, cleanText } = parseNoteTag(n.text);
                const isCodFallback =
                  n.text.toLowerCase().includes("[cod fallback]") ||
                  n.text.toLowerCase().includes("cod fallback");

                return (
                  <div
                    key={n.id}
                    className={`group relative rounded-xl border p-3 text-[12px] transition-all ${
                      isCodFallback
                        ? "border-amber-200 bg-amber-50/60"
                        : "border-purple-100 bg-purple-50/30 hover:bg-purple-50/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold ${
                            isCodFallback
                              ? "bg-amber-200 text-amber-800"
                              : "bg-purple-200 text-purple-800"
                          }`}
                        >
                          {getInitials(n.actor)}
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-stone-900">{n.actor}</span>
                            <span className="text-[10.5px] text-stone-400">·</span>
                            <span
                              className="text-[10.5px] text-stone-500"
                              title={formatDateTime(n.at)}
                            >
                              {getRelativeTime(n.at) || formatDateTime(n.at)}
                            </span>
                            {tag && (
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  isCodFallback
                                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                                    : "bg-purple-100 text-purple-800 border border-purple-200"
                                }`}
                              >
                                {tag}
                              </span>
                            )}
                          </div>
                          <p className="text-stone-800 break-words whitespace-pre-wrap leading-relaxed">
                            {cleanText}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleCopy(n.id, n.text)}
                        title="Copy note text"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-white transition-opacity cursor-pointer"
                      >
                        {copiedId === n.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. TIMELINE AUDIT HUB & FILTER BAR */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-4">
        {/* Hub Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <h3 className="flex items-center gap-2 text-[13px] font-bold text-stone-900">
              <History className="h-4 w-4 text-purple-600" />
              Order Status History & Audit Log
            </h3>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Chronological log of customer events, payment webhooks, status updates and courier telemetry.
            </p>
          </div>
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10.5px] font-medium text-stone-600">
            Immutable Audit Trail ({counts.total} events)
          </span>
        </div>

        {/* Filter Capsules & Search Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
                activeCategory === "all"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              All ({counts.total})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("notes")}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
                activeCategory === "notes"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              <MessageSquare className="h-3 w-3" />
              Notes ({counts.notesCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("status")}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
                activeCategory === "status"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              Status ({counts.statusCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("payment")}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
                activeCategory === "payment"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              <Banknote className="h-3 w-3" />
              Payments ({counts.paymentCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("shipment")}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
                activeCategory === "shipment"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              <Truck className="h-3 w-3" />
              Shipment ({counts.shipmentCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("audit")}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
                activeCategory === "audit"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              <ShieldCheck className="h-3 w-3" />
              Audits ({counts.auditCount})
            </button>
          </div>

          {/* Search box */}
          <div className="relative min-w-[200px] sm:w-60">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search timeline..."
              className="w-full rounded-lg border border-stone-200 bg-stone-50/50 py-1.5 pl-8 pr-7 text-[11.5px] text-stone-900 outline-none focus:border-purple-400 focus:bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 p-0.5 text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* 4. CONNECTED VERTICAL TIMELINE STREAM */}
        {filteredEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-200 p-8 text-center bg-stone-50/50 space-y-2">
            <Filter className="mx-auto h-6 w-6 text-stone-400" />
            <p className="text-[13px] font-bold text-stone-700">No events found</p>
            <p className="text-[11.5px] text-stone-400">
              No activity matching the current filter or search criteria.
            </p>
            {(activeCategory !== "all" || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setActiveCategory("all");
                  setSearchQuery("");
                }}
                className="mt-2 inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-[11.5px] font-bold text-purple-700 hover:bg-purple-50 cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-200">
            {filteredEvents.map((ev) => {
              const meta = ev.metadata;
              const metaBefore = (meta?.before as Record<string, unknown> | null | undefined) || null;
              const metaAfter = (meta?.after as Record<string, unknown> | null | undefined) || null;
              const hasDiff = Boolean(metaBefore || metaAfter);

              const isOrder = ev.category === "order";
              const isPayment = ev.category === "payment";
              const isShipment = ev.category === "shipment";
              const isNote = ev.category === "note";
              const _isAudit = ev.category === "audit";

              const isReopen =
                ev.title.toLowerCase().includes("reopen") ||
                ev.description.toLowerCase().includes("reopen");
              const isCancelled =
                ev.title.toLowerCase().includes("cancel") ||
                (ev.toStatus && ev.toStatus.toLowerCase() === "cancelled");
              const isCodFallback =
                ev.action === "order.payment.cod_fallback" ||
                ev.title.toLowerCase().includes("cash on delivery");

              const nodeColor = isReopen
                ? "bg-emerald-500 text-white ring-4 ring-emerald-50"
                : isCancelled
                ? "bg-rose-500 text-white ring-4 ring-rose-50"
                : isPayment
                ? "bg-amber-500 text-white ring-4 ring-amber-50"
                : isShipment
                ? "bg-indigo-500 text-white ring-4 ring-indigo-50"
                : isNote
                ? "bg-purple-500 text-white ring-4 ring-purple-50"
                : isOrder
                ? "bg-sky-600 text-white ring-4 ring-sky-50"
                : "bg-stone-500 text-white ring-4 ring-stone-100";

              const NodeIcon = isReopen
                ? RotateCcw
                : isCancelled
                ? AlertCircle
                : isPayment
                ? Banknote
                : isShipment
                ? Truck
                : isNote
                ? MessageSquare
                : isOrder
                ? CheckCircle2
                : ShieldCheck;

              return (
                <div key={ev.id} className="relative group">
                  {/* Timeline Node Icon */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-1.5 flex h-6 w-6 items-center justify-center rounded-full transition-transform group-hover:scale-110 shadow-xs ${nodeColor}`}
                  >
                    <NodeIcon className="h-3 w-3" />
                  </div>

                  {/* Card Body */}
                  <div
                    className={`rounded-xl border p-3.5 sm:p-4 transition-all ${
                      isReopen
                        ? "border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/50"
                        : isCancelled
                        ? "border-rose-200 bg-rose-50/30 hover:bg-rose-50/50"
                        : isCodFallback
                        ? "border-amber-200 bg-amber-50/40 hover:bg-amber-50/60"
                        : isPayment
                        ? "border-amber-100 bg-amber-50/20 hover:bg-amber-50/40"
                        : isShipment
                        ? "border-indigo-100 bg-indigo-50/20 hover:bg-indigo-50/40"
                        : isNote
                        ? "border-purple-100 bg-purple-50/30 hover:bg-purple-50/50"
                        : "border-stone-200/80 bg-white hover:border-stone-300"
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider ${
                            isReopen
                              ? "bg-emerald-100 text-emerald-800"
                              : isCancelled
                              ? "bg-rose-100 text-rose-800"
                              : isPayment
                              ? "bg-amber-100 text-amber-800"
                              : isShipment
                              ? "bg-indigo-100 text-indigo-800"
                              : isNote
                              ? "bg-purple-100 text-purple-800"
                              : "bg-stone-100 text-stone-700"
                          }`}
                        >
                          {ev.category}
                        </span>

                        {(Boolean(meta?.isMock) || ev.title.includes("[SIMULATED")) && (
                          <span className="rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-amber-800">
                            TEST / SIMULATED
                          </span>
                        )}

                        <h4 className="text-[12.5px] font-bold text-stone-900 capitalize">
                          {ev.title.replace(/\[SIMULATED \/ TEST\]\s*/i, "").replace(/\[SIMULATED\]\s*/i, "")}
                        </h4>

                        {isReopen && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9.5px] font-bold text-emerald-800">
                            Reopened Order
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10.5px] text-stone-400 flex items-center gap-1"
                          title={formatDateTime(ev.at)}
                        >
                          <Clock className="h-3 w-3" />
                          <span className="font-medium text-stone-600">
                            {getRelativeTime(ev.at)}
                          </span>
                          <span className="hidden sm:inline">({formatDateTime(ev.at)})</span>
                        </span>
                      </div>
                    </div>

                    {/* Visual Status Transition Badges (e.g. [Pending] ──→ [Confirmed]) */}
                    {ev.fromStatus && ev.toStatus && ev.fromStatus !== ev.toStatus && (
                      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${getStatusBadgeStyle(
                            ev.fromStatus
                          )}`}
                        >
                          {ev.fromStatus.replace(/_/g, " ")}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${getStatusBadgeStyle(
                            ev.toStatus
                          )}`}
                        >
                          {ev.toStatus.replace(/_/g, " ")}
                        </span>
                      </div>
                    )}

                    {/* Specialized COD Fallback Details Card */}
                    {isCodFallback && meta && (
                      <div className="mt-2.5 rounded-lg border border-amber-200/80 bg-white p-3 space-y-2 text-[11.5px]">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="rounded-md bg-amber-50/70 p-2">
                            <span className="text-[10px] uppercase font-bold text-amber-700">
                              Payment Method
                            </span>
                            <p className="font-extrabold text-stone-900 mt-0.5">
                              Cash on Delivery (COD)
                            </p>
                          </div>
                          <div className="rounded-md bg-amber-50/70 p-2">
                            <span className="text-[10px] uppercase font-bold text-amber-700">
                              Collectible Amount
                            </span>
                            <p className="font-extrabold text-amber-900 mt-0.5">
                              {metaAfter && "expectedCodAmount" in metaAfter
                                ? formatBDT(Number(metaAfter.expectedCodAmount))
                                : "—"}
                            </p>
                          </div>
                          <div className="rounded-md bg-amber-50/70 p-2">
                            <span className="text-[10px] uppercase font-bold text-amber-700">
                              Customer Agreed
                            </span>
                            <p className="font-extrabold text-emerald-700 mt-0.5 flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" /> Explicitly Confirmed
                            </p>
                          </div>
                        </div>

                        {ev.note && (
                          <div className="text-stone-700 pt-1">
                            <span className="font-bold text-stone-900">Admin Reason:</span> &ldquo;
                            {ev.note}&rdquo;
                          </div>
                        )}
                      </div>
                    )}

                    {/* Standard Description or Note */}
                    {ev.description && !isCodFallback && (
                      <p className="mt-1.5 text-[11.5px] text-stone-700 break-words leading-relaxed">
                        {ev.description}
                      </p>
                    )}

                    {/* If note attached to a status transition (e.g. cancellation / return reason) */}
                    {ev.note && !isCodFallback && ev.category === "order" && (
                      <div className="mt-2 rounded-md bg-stone-50 border border-stone-200/80 px-2.5 py-1.5 text-[11px] text-stone-700">
                        <span className="font-bold text-stone-900">Recorded Reason:</span> &ldquo;
                        {ev.note}&rdquo;
                      </div>
                    )}

                    {/* Expandable Technical Forensic Log (Diff) */}
                    {hasDiff && (
                      <div className="mt-2.5">
                        <button
                          type="button"
                          onClick={() => handleToggleDiff(ev.id)}
                          className="inline-flex items-center gap-1 text-[10.5px] font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
                        >
                          {expandedDiffs[ev.id] ? (
                            <>
                              <ChevronUp className="h-3 w-3" /> Hide Forensic Audit Diff
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3" /> View Forensic Audit Diff
                            </>
                          )}
                        </button>

                        {expandedDiffs[ev.id] && (
                          <div className="mt-2 rounded-lg border border-stone-200 bg-stone-900 p-3 text-[10.5px] text-stone-200 font-mono overflow-x-auto">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <span className="text-stone-400 font-bold uppercase text-[9.5px]">
                                  Before
                                </span>
                                <pre className="mt-1 text-amber-300">
                                  {JSON.stringify(metaBefore || {}, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <span className="text-stone-400 font-bold uppercase text-[9.5px]">
                                  After
                                </span>
                                <pre className="mt-1 text-emerald-300">
                                  {JSON.stringify(metaAfter || {}, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer Row: Actor Attribution */}
                    <div className="mt-2.5 flex items-center justify-between border-t border-stone-100 pt-2 text-[10.5px] text-stone-400">
                      <div className="flex items-center gap-1.5">
                        {ev.actor.includes("@") || ev.actor === "admin" ? (
                          <User className="h-3 w-3 text-stone-500" />
                        ) : (
                          <Bot className="h-3 w-3 text-stone-500" />
                        )}
                        <span>
                          Actor:{" "}
                          <strong className="text-stone-700 font-semibold">{ev.actor}</strong>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleCopy(ev.id, ev.id)}
                        title="Copy Event ID"
                        className="text-[9.5px] text-stone-400 hover:text-stone-600 cursor-pointer font-mono"
                      >
                        {copiedId === ev.id ? "Copied ID" : `#${ev.id.slice(-8)}`}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
