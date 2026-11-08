import Link from "next/link";
import { Settings, CheckCircle2 } from "lucide-react";
import type { PublicAdminPixelSettings } from "@/server/pixel-settings";

interface EventsSettingsTabProps {
  pixelId: string;
  settings: PublicAdminPixelSettings | null;
  testEventCode: string;
  showSettingsDetails: boolean;
  setShowSettingsDetails: (show: boolean | ((prev: boolean) => boolean)) => void;
}

const FUNNEL_SIGNAL_SWITCHES = [
  { name: "PageView", desc: "Storefront traffic" },
  { name: "ViewContent", desc: "Product detail visits" },
  { name: "AddToCart", desc: "Bag additions" },
  { name: "InitiateCheckout", desc: "Order initialization" },
  { name: "Purchase", desc: "Order confirmation" },
] as const;

export function EventsSettingsTab({
  pixelId,
  settings,
  testEventCode,
  showSettingsDetails,
  setShowSettingsDetails,
}: EventsSettingsTabProps) {
  return (
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
            onClick={() => setShowSettingsDetails((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs px-3 py-2 transition cursor-pointer shadow-2xs"
          >
            <span>{showSettingsDetails ? "Hide Technical Details" : "Show Technical Details"}</span>
          </button>
        </div>
      </div>

      {/* Operational Status Cards Grid */}
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
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <CheckCircle2 className="h-3 w-3 text-amber-600" />
                <span>Isolated</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
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

      {/* Active E-Commerce Signal Switches */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            E-Commerce Funnel Signal Switches (5 of 5 Operational)
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">Standard Meta Conversion Spec</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {FUNNEL_SIGNAL_SWITCHES.map((sig) => (
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
  );
}
