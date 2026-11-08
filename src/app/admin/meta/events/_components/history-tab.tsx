import {
  Trash2,
  ChevronDown,
  Search,
  Copy,
  Check,
} from "lucide-react";
import type { PixelEventRecord } from "@/server/pixel-settings";

interface HistoryTabProps {
  events: PixelEventRecord[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterEvent: string;
  setFilterEvent: (ev: string) => void;
  filterSource: string;
  setFilterSource: (src: string) => void;
  filterStatus: string;
  setFilterStatus: (st: string) => void;
  currentPage: number;
  setCurrentPage: (p: number | ((prev: number) => number)) => void;
  itemsPerPage: number;
  paginatedEvents: PixelEventRecord[];
  filteredEvents: PixelEventRecord[];
  expandedEventId: string | null;
  setExpandedEventId: (id: string | null) => void;
  copiedPayloadId: string | null;
  onCopyPayload: (id: string, text: string) => void;
  onClearEventLogs: () => void;
}

export function HistoryTab({
  events,
  searchQuery,
  setSearchQuery,
  filterEvent,
  setFilterEvent,
  filterSource,
  setFilterSource,
  filterStatus,
  setFilterStatus,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  paginatedEvents,
  filteredEvents,
  expandedEventId,
  setExpandedEventId,
  copiedPayloadId,
  onCopyPayload,
  onClearEventLogs,
}: HistoryTabProps) {
  return (
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
            onClick={onClearEventLogs}
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
                        onClick={() => onCopyPayload(ev.id, JSON.stringify(ev, null, 2))}
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
  );
}
