"use client";

import { useState } from "react";
import {
  X,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Share2,
  Globe,
  Server,
  PlayCircle,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react";

export interface DrawerMatchKey {
  identifier: string;
  label: string;
  coverage: number | null;
}

export interface DrawerDiagnostic {
  name: string;
  description: string;
  solution: string;
  percentage: number | null;
}

export interface DrawerEventData {
  id: string;
  name: string;
  displayName: string;
  funnelStep: number;
  status: "active" | "inactive" | "test_required";
  emqScore: number | null;
  emqQuality: string;
  localCount: number;
  metaCount: string | number;
  lastReceived: string;
  integration: string;
  browserPct: number;
  serverPct: number;
  dedupRate?: number;
  description: string;
  freshness?: string | null;
  matchKeys?: DrawerMatchKey[];
  diagnostics?: DrawerDiagnostic[];
  missingIpCount?: number;
  missingUserAgentCount?: number;
  missingCustomerInfoCount?: number;
  deliveryProblemsCount?: number;
  samplePayload?: Record<string, unknown> | null;
}

interface EventDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  event: DrawerEventData | null;
  onSimulate?: (eventName: string) => Promise<void>;
  simulating?: boolean;
}

type DrawerTab = "overview" | "emq" | "integrations" | "diagnostics";

export function EventDetailDrawer({
  isOpen,
  onClose,
  event,
  onSimulate,
  simulating = false,
}: EventDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>("overview");
  const [copiedPayload, setCopiedPayload] = useState(false);

  if (!isOpen || !event) return null;

  const handleCopyPayload = () => {
    if (!event.samplePayload) return;
    void navigator.clipboard.writeText(JSON.stringify(event.samplePayload, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const scoreBadgeColor =
    event.emqScore !== null
      ? event.emqScore >= 8.0
        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
        : event.emqScore >= 6.0
        ? "bg-blue-50 text-blue-700 border-blue-300"
        : "bg-amber-50 text-amber-700 border-amber-300"
      : "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${event.displayName} Event Details`}
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in-0 duration-200"
    >
      {/* Backdrop click to dismiss */}
      <div className="fixed inset-0 -z-10" onClick={onClose} aria-hidden="true" />

      {/* Slide-out drawer content */}
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden">
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-8 w-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
              {event.funnelStep}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {event.displayName}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
                {event.name === "TestEvent" && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                    Test Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                event_name: &quot;{event.name}&quot;
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 px-6 gap-2 text-xs font-semibold bg-white overflow-x-auto scrollbar-none">
          {[
            { id: "overview", label: "Overview", icon: Activity },
            { id: "emq", label: "Event Match Quality", icon: Sparkles },
            { id: "integrations", label: "Integrations & Deduplication", icon: Share2 },
            { id: "diagnostics", label: "Diagnostics", icon: AlertTriangle },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as DrawerTab)}
                className={`flex items-center gap-2 py-3 px-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "border-blue-600 text-blue-600 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          {/* ══════════════════════════════════════════════════════
              TAB 1: OVERVIEW
             ══════════════════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Event Summary Card */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Funnel Description
                  </span>
                  <span className="text-[10px] text-slate-400">Step {event.funnelStep} of 5</span>
                </div>
                <p className="text-slate-700 text-xs leading-relaxed">
                  {event.description}
                </p>
              </div>

              {/* KPI Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">ANGKON Store</span>
                  <div className="text-base font-bold text-slate-900 mt-1 font-mono">
                    {event.localCount.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">Recorded</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Meta Reported</span>
                  <div className="text-base font-bold text-blue-700 mt-1 font-mono">
                    {event.metaCount}
                  </div>
                  <span className="text-[10px] text-slate-400">28-day attributed</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">EMQ Score</span>
                  <div className="mt-1">
                    <span className={`inline-block font-bold text-xs px-2 py-0.5 rounded border ${scoreBadgeColor}`}>
                      {event.emqScore !== null ? `${event.emqScore.toFixed(1)}/10` : "Not available"}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">{event.emqQuality}</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Last Received</span>
                  <div className="text-xs font-bold text-slate-900 mt-1 truncate">
                    {event.lastReceived}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold">Live Pipeline</span>
                </div>
              </div>

              {/* Simulator Action */}
              {onSimulate && (
                <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/60 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Verify Live Delivery</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Dispatches a real-time test {event.displayName} event to Meta Graph API v22.0.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onSimulate(event.name)}
                    disabled={simulating}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
                  >
                    {simulating ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-3.5 w-3.5" />
                        <span>Simulate {event.displayName}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              TAB 2: EVENT MATCH QUALITY (EMQ)
             ══════════════════════════════════════════════════════ */}
          {activeTab === "emq" && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Meta Event Match Quality (EMQ)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Official score directly queried from Meta Dataset Quality API.
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-block font-extrabold text-sm px-3 py-1 rounded-xl border ${scoreBadgeColor}`}>
                    {event.emqScore !== null ? `${event.emqScore.toFixed(1)} / 10` : "Not available"}
                  </span>
                  <div className="text-[10px] text-slate-500 font-semibold mt-1">
                    {event.emqQuality}
                  </div>
                </div>
              </div>

              {/* Match Keys Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Customer Match Parameters Coverage
                  </h4>
                  {event.freshness && (
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      Freshness: {event.freshness}
                    </span>
                  )}
                </div>

                {event.matchKeys && event.matchKeys.length > 0 ? (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Parameter</th>
                          <th className="py-2.5 px-3">Key</th>
                          <th className="py-2.5 px-3">Meta Coverage</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {event.matchKeys.map((mk) => {
                          const pct = mk.coverage !== null ? Math.round(mk.coverage * 100) : null;
                          return (
                            <tr key={mk.identifier} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-semibold text-slate-800">{mk.label}</td>
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{mk.identifier}</td>
                              <td className="py-2 px-3">
                                {pct !== null ? (
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${pct >= 70 ? "bg-emerald-500" : pct >= 30 ? "bg-blue-500" : "bg-amber-500"}`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <span className="font-semibold text-[11px]">{pct}%</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">Not reported</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {pct !== null && pct > 0 ? (
                                  <span className="text-emerald-600 font-semibold text-[11px]">Active</span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Optional</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-center">
                    Match key coverage data is currently not available from Meta for this event.
                  </div>
                )}
              </div>

              {/* Meta Recommendations */}
              {event.diagnostics && event.diagnostics.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Meta-Reported Recommendations
                  </h4>
                  {event.diagnostics.map((diag, i) => (
                    <div key={i} className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-900 text-xs">{diag.name}</span>
                        {diag.percentage !== null && (
                          <span className="text-[10px] text-amber-800 font-semibold">
                            {Math.round(diag.percentage * 100)}% affected
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600">{diag.description}</p>
                      {diag.solution && (
                        <div className="pt-1 text-[11px] text-blue-700 font-medium">
                          <strong>Fix:</strong> {diag.solution}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              TAB 3: INTEGRATIONS & DEDUPLICATION
             ══════════════════════════════════════════════════════ */}
          {activeTab === "integrations" && (
            <div className="space-y-6">
              {/* Channel Split */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                  <span>Channel Delivery Balance</span>
                  <span>{event.browserPct}% Browser · {event.serverPct}% Server</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden flex shadow-inner">
                  <div className="bg-[#70C5F7] h-full" style={{ width: `${event.browserPct}%` }} title="Browser Pixel" />
                  <div className="bg-purple-600 h-full" style={{ width: `${event.serverPct}%` }} title="Conversions API" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#70C5F7]" />
                    Browser Pixel SDK
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-purple-600" />
                    Conversions API Gateway
                  </span>
                </div>
              </div>

              {/* Deduplication Guarantee */}
              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <h4 className="font-bold text-emerald-950 text-xs">Event Deduplication Invariant</h4>
                </div>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  Every storefront browser event and CAPI server dispatch share an identical <strong>event_id</strong> and <strong>event_name</strong>. Meta deduplicates dual hits within 48 hours to prevent double-counting conversions.
                </p>
                <div className="pt-2 flex items-center justify-between text-[11px] text-emerald-800 font-semibold border-t border-emerald-200/80">
                  <span>Deduplication Success Rate</span>
                  <span>{event.dedupRate !== undefined ? `${event.dedupRate}% Deduplicated` : "Not measured"}</span>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              TAB 4: DIAGNOSTICS & PAYLOAD HEALTH
             ══════════════════════════════════════════════════════ */}
          {activeTab === "diagnostics" && (
            <div className="space-y-6">
              {/* Diagnostic Checklist */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Data Quality Invariants & Diagnostics
                </h4>

                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <div>
                      <div className="font-semibold text-slate-900">Client IP & User-Agent Pairing</div>
                      <div className="text-[11px] text-slate-500">
                        {event.missingIpCount && event.missingIpCount > 0
                          ? `${event.missingIpCount} events missing valid IP address`
                          : "100% paired with valid client IP and user agent headers"}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Compliant
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <div>
                      <div className="font-semibold text-slate-900">Customer PII SHA-256 Hashing</div>
                      <div className="text-[11px] text-slate-500">
                        Email, phone, and names are hashed on server before dispatch
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Encrypted
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <div>
                      <div className="font-semibold text-slate-900">Currency & Value Compliance</div>
                      <div className="text-[11px] text-slate-500">
                        Formatted with ISO currency code &quot;BDT&quot; and numeric values
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Valid
                  </span>
                </div>
              </div>

              {/* Sample Payload Inspector (Sanitized) */}
              {event.samplePayload && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Sanitized Dispatched Payload Sample
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPayload}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                    >
                      {copiedPayload ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy JSON</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-xl font-mono text-[10.5px] leading-relaxed overflow-x-auto max-h-56">
                    {JSON.stringify(event.samplePayload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            ANGKON Telemetry · Meta Graph API v22.0
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
