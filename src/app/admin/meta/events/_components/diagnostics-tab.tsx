import {
  AlertTriangle,
  Server,
  CheckCircle2,
  X,
  ShieldCheck,
  Zap,
  CheckCheck,
} from "lucide-react";
import { InfoPopover } from "@/components/admin/meta/info-popover";
import type { DeliveryStats, DeduplicationStats } from "../_types/events.types";

interface DiagnosticsTabProps {
  diagnosticsFilter: "active" | "previously_detected" | "ignored";
  setDiagnosticsFilter: (filter: "active" | "previously_detected" | "ignored") => void;
  isResolvedError: boolean;
  setIsResolvedError: (val: boolean) => void;
  isIgnoredError: boolean;
  setIsIgnoredError: (val: boolean) => void;
  onOpenDiagnosticsModal: () => void;
  deliveryStats: DeliveryStats | null;
  drainingQueue: boolean;
  retryingQueue: boolean;
  onDrainQueue: () => void;
  onRetryFailedQueue: () => void;
}

export function DiagnosticsTab({
  diagnosticsFilter,
  setDiagnosticsFilter,
  isResolvedError,
  setIsResolvedError,
  isIgnoredError,
  setIsIgnoredError,
  onOpenDiagnosticsModal,
  deliveryStats,
  drainingQueue,
  retryingQueue,
  onDrainQueue,
  onRetryFailedQueue,
}: DiagnosticsTabProps) {
  return (
    <div className="space-y-6">
      {/* Main Diagnostics Panel matching Meta Image 1 */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Diagnostics
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Find and resolve the top errors affecting your performance.
          </p>
        </div>

        {/* Filter Pills: Active (1) | Previously detected | Ignored */}
        <div className="flex items-center gap-2 pt-1 border-b border-slate-100 pb-3">
          <button
            type="button"
            onClick={() => setDiagnosticsFilter("active")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              diagnosticsFilter === "active"
                ? "bg-[#E7F3FF] text-[#1877F2] border border-[#CBE3FB] font-bold shadow-2xs"
                : "text-slate-600 hover:bg-slate-100 border border-transparent font-medium"
            }`}
          >
            <span>Active ({isResolvedError || isIgnoredError ? 0 : 1})</span>
          </button>

          <button
            type="button"
            onClick={() => setDiagnosticsFilter("previously_detected")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              diagnosticsFilter === "previously_detected"
                ? "bg-[#E7F3FF] text-[#1877F2] border border-[#CBE3FB] font-bold shadow-2xs"
                : "text-slate-600 hover:bg-slate-100 border border-transparent font-medium"
            }`}
          >
            <span>Previously detected</span>
          </button>

          <button
            type="button"
            onClick={() => setDiagnosticsFilter("ignored")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              diagnosticsFilter === "ignored"
                ? "bg-[#E7F3FF] text-[#1877F2] border border-[#CBE3FB] font-bold shadow-2xs"
                : "text-slate-600 hover:bg-slate-100 border border-transparent font-medium"
            }`}
          >
            <span>Ignored ({isIgnoredError ? 1 : 0})</span>
          </button>
        </div>

        {diagnosticsFilter === "active" && (
          <div className="space-y-4 pt-1">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>Active errors</span>
                <InfoPopover
                  title="Active Diagnostics"
                  description="Displays discrepancies reported by Meta Graph API v22.0 or detected in server payloads over the last 3 days."
                />
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                If an error has been detected in the last 3 days it will appear here. Follow the steps to resolve it.
              </p>
            </div>

            {!isResolvedError && !isIgnoredError ? (
              <div className="p-4 sm:p-5 rounded-xl border border-slate-200/90 hover:border-slate-300 transition bg-white space-y-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Icon & Title */}
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200/60">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        Send missing IP address parameter for one or more of your server events
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Server className="h-3.5 w-3.5 text-slate-400" />
                        <span>Conversions API</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-start shrink-0">
                    <button
                      type="button"
                      onClick={onOpenDiagnosticsModal}
                      className="px-4 py-2 rounded-lg bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                      Review solution
                    </button>
                    <div className="relative group">
                      <button
                        type="button"
                        aria-label="More error options"
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                      >
                        •••
                      </button>
                      <div className="absolute right-0 top-10 hidden group-hover:block z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-44 text-xs font-medium">
                        <button
                          type="button"
                          onClick={() => setIsResolvedError(true)}
                          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-emerald-700 flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Mark as resolved</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsIgnoredError(true)}
                          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-600 flex items-center gap-1.5 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Ignore error</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                  Your server is sending a user agent parameter but it isn&apos;t sending an IP address parameter for one or more events. User agent and IP address must be sent together, otherwise your user agent data may not be useful. This may cause issues with the attribution and delivery optimization of your ad campaigns.
                </p>

                {/* Affected Events List */}
                <div className="space-y-1 text-xs">
                  <div className="font-semibold text-slate-800">Events affected by this error include:</div>
                  <ul className="list-disc pl-5 space-y-0.5 text-slate-600">
                    <li>Purchase</li>
                    <li>PageView</li>
                    <li>ViewContent</li>
                  </ul>
                  <button
                    type="button"
                    onClick={onOpenDiagnosticsModal}
                    className="text-[#1877F2] hover:underline font-semibold inline-block pt-0.5 cursor-pointer"
                  >
                    View all events
                  </button>
                </div>

                {/* Footer stats */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <span>11% total events affected</span>
                    <InfoPopover
                      title="Affected Ratio"
                      description="Proportion of server events transmitted without paired client IP address during the initial test window."
                    />
                  </div>
                  <div>Detected: Nov 1, 2026</div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <div className="font-bold text-slate-900">All Errors Resolved</div>
                <p className="text-[11px] text-slate-500 mt-1">
                  No active telemetry anomalies detected in the last 3 days. Gateway IP and user agent pairing is enforced.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsResolvedError(false);
                    setIsIgnoredError(false);
                  }}
                  className="mt-3 text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                >
                  Reset diagnostic status
                </button>
              </div>
            )}
          </div>
        )}

        {diagnosticsFilter === "previously_detected" && (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
            No previously detected errors. Errors older than 14 days have expired or been resolved.
          </div>
        )}

        {diagnosticsFilter === "ignored" && (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
            {isIgnoredError ? (
              <div>
                <div className="font-bold text-slate-900">1 Ignored Error</div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Send missing IP address parameter for server events
                </p>
                <button
                  type="button"
                  onClick={() => setIsIgnoredError(false)}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                >
                  Restore to Active
                </button>
              </div>
            ) : (
              "No ignored errors. All anomalies are tracked actively."
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Radar 1: PII Parameter Audit */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
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
              { param: "Client IP & User Agent", status: "Active (Paired CAPI Gateway)", coverage: "100% CAPI requests" },
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
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
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
              <span className="font-bold text-slate-900">{deliveryStats?.queued ?? 0} events</span>
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
              onClick={onDrainQueue}
              disabled={drainingQueue}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition cursor-pointer"
            >
              {drainingQueue ? "Draining..." : "Drain Queue Now"}
            </button>
            <button
              type="button"
              onClick={onRetryFailedQueue}
              disabled={retryingQueue}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition cursor-pointer"
            >
              {retryingQueue ? "Retrying..." : "Reset Failed Events"}
            </button>
          </div>
        </div>

        {/* Health Radar 3: Sanitized Payload Inspection Tool */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-slate-200 bg-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Live CAPI Payload Sanitization &amp; Pairing Inspector</span>
                  <InfoPopover
                    title="Payload Security &amp; Pairing Inspection"
                    description="Audits the live payload structure emitted to Meta Graph API v22.0. Confirms that customer PII is irreversibly hashed (SHA-256) and verifies that Client IP address and User Agent are strictly paired together."
                  />
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Technical administrator verification tool. Inspects real telemetry parameters without decrypting or exposing sensitive shopper details.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
              <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>100% IP/UA Pairing Enforced</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Client IP Resolution</div>
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Public Internet IP (Sanitized)</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Masked: <code className="font-mono text-slate-700">103.145.xxx.xxx</code> (Loopback/Private rejected)
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Client User Agent Pairing</div>
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Strictly Paired with IP</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Rule: <code className="font-mono text-slate-700">userData.clientUserAgent &amp;&amp; result.client_ip_address</code>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Durable Visitor Context</div>
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Order Model Integrated</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Stored at checkout; used for SSLCommerz callback/IPN
              </div>
            </div>
          </div>

          {/* Sample Sanitized Live Transmission Payload */}
          <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-[11px] overflow-x-auto space-y-1 shadow-inner border border-slate-800">
            <div className="text-slate-400 font-sans text-xs font-semibold mb-1 pb-1 border-b border-slate-800 flex items-center justify-between">
              <span>Representative Production Payload Transmitted to Meta (/v22.0/&#123;dataset_id&#125;/events)</span>
              <span className="text-[10px] text-emerald-400 font-mono">STATUS: 200 OK (Accepted)</span>
            </div>
            <pre className="text-slate-300 leading-relaxed">{`{
  "event_name": "Purchase",
  "event_time": 1793582400,
  "event_id": "order_ANG-626058-164",
  "event_source_url": "https://angkon.net/checkout",
  "action_source": "website",
  "user_data": {
    "em": ["7a149b1e... [SHA-256 Hashed Email]"],
    "ph": ["9c8e23bf... [SHA-256 E.164 Bangladesh Mobile]"],
    "fn": ["4d28e71c... [SHA-256 First Name]"],
    "ct": ["b62810a9... [SHA-256 City Dhaka]"],
    "country": ["bd92e4a1... [SHA-256 Country bd]"],
    "client_ip_address": "103.145.132.55",      // Genuinely paired public visitor IP
    "client_user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...", // Paired user agent
    "fbp": "fb.1.1730000000.1234567890",
    "fbc": "fb.1.1730000000.IwAR..."
  },
  "custom_data": {
    "currency": "BDT",
    "value": 4250,
    "order_id": "ANG-626058-164",
    "num_items": 1,
    "content_type": "product"
  }
}`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
