import Link from "next/link";
import {
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Globe,
  Eye,
  ShoppingCart,
  CreditCard,
  ShoppingBag,
  RefreshCw,
  PlayCircle,
  Server,
} from "lucide-react";
import type { PixelEventRecord } from "@/server/pixel-settings";
import type { RecentTestDispatch } from "../_types/events.types";

interface TestEventsTabProps {
  testEventCode: string;
  simulating: boolean;
  simulatedEvent: string | null;
  recentTestDispatches: RecentTestDispatch[];
  testEvents: PixelEventRecord[];
  onSimulateEvent: (eventName: string) => void;
  onOpenGuideForTestCode: () => void;
}

const FUNNEL_SIMULATION_EVENTS = [
  { name: "PageView", desc: "Test visitor page load", icon: Globe },
  { name: "ViewContent", desc: "Test saree product view", icon: Eye },
  { name: "AddToCart", desc: "Test cart addition event", icon: ShoppingCart },
  { name: "InitiateCheckout", desc: "Test checkout drawer opening", icon: CreditCard },
  { name: "Purchase", desc: "Test confirmed sale event", icon: ShoppingBag },
] as const;

export function TestEventsTab({
  testEventCode,
  simulating,
  simulatedEvent,
  recentTestDispatches,
  testEvents,
  onSimulateEvent,
  onOpenGuideForTestCode,
}: TestEventsTabProps) {
  return (
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
          onClick={onOpenGuideForTestCode}
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

      {/* Operational Test Code Status Card */}
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
          {FUNNEL_SIMULATION_EVENTS.map((ev) => {
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
                  onClick={() => onSimulateEvent(ev.name)}
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
  );
}
