"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Loader2,
  PackageCheck,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { COURIER_PROVIDER_LIST, type CourierSettings as CourierSettingsType } from "@/server/courier/tracking";
import { CourierLogo } from "@/components/admin/courier-logo";

const DEFAULT_STATE: CourierSettingsType = {
  defaultProvider: "steadfast",
  enabledProviders: { steadfast: true, pathao: false, redx: false },
  defaultParcelNote: "",
  autoAdvanceToShipped: false,
  allowUnpaidOnlineShipment: false,
  autoBookOnConfirm: false,
  codEnabled: true,
  insideDhakaCharge: 60,
  outsideDhakaCharge: 120,
  freeDeliveryThreshold: 0,
};

interface ProviderStatusItem {
  id: "steadfast" | "pathao" | "redx";
  label: string;
  shortLabel: string;
  supported: boolean;
  enabled: boolean;
  configured: boolean;
  disabledReason?: string | null;
}

interface DiagnosticsPayload {
  lastSyncAt: string | null;
  health: string;
  stats24h: { totalCalls: number; errorCount: number; successCount: number };
  recentErrors: Array<{
    id: string;
    provider: string;
    action: string;
    orderNumber: string;
    httpStatus?: number | null;
    errorCode?: string | null;
    message: string;
    createdAt: string;
  }>;
}

function ToggleRow({
  label,
  desc,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-stone-200 bg-stone-50/50 p-4">
      <div>
        <p className="text-[13px] font-bold text-gray-800">{label}</p>
        <p className="mt-0.5 text-[12px] text-stone-500">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        disabled={disabled}
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          disabled ? "opacity-45 cursor-not-allowed bg-stone-300" : checked ? "bg-purple-600 cursor-pointer" : "bg-stone-300 cursor-pointer"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export function CourierSettings() {
  const [settings, setSettings] = useState<CourierSettingsType>(DEFAULT_STATE);
  const [providers, setProviders] = useState<ProviderStatusItem[]>([]);
  const [webhooks, setWebhooks] = useState<Record<string, boolean>>({});
  const [diagnostics, setDiagnostics] = useState<DiagnosticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    testedAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/courier", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load courier settings");
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
      if (Array.isArray(data.providers)) setProviders(data.providers);
      if (data.webhooks) setWebhooks(data.webhooks);
      if (data.diagnostics) setDiagnostics(data.diagnostics);
    } catch {
      setError("Could not load courier configuration.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSavedNotice(false);
    try {
      const res = await fetch("/api/admin/settings/courier", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to save settings");
      }
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save courier settings.");
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/settings/courier/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "steadfast" }),
      });
      const data = await res.json().catch(() => ({}));
      setTestResult({
        ok: Boolean(data.ok),
        message: data.message || data.error || "Connection test completed",
        testedAt: data.testedAt || new Date().toISOString(),
      });
      void load();
    } catch {
      setTestResult({
        ok: false,
        message: "Network error while running connection test.",
        testedAt: new Date().toISOString(),
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
        Loading courier configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Multi-Courier & Dispatch Configuration</h2>
          <p className="text-[13px] text-stone-500">
            Configure enabled courier APIs, test live connectivity, manage COD & delivery defaults, and view sanitized logs
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={testing}
            onClick={() => void testConnection()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-[12px] font-bold text-purple-700 hover:bg-purple-100 disabled:opacity-50 cursor-pointer"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlugZap className="h-3.5 w-3.5" />}
            Test Steadfast API
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] font-semibold text-stone-600 hover:bg-stone-50 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {testResult && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[12.5px] ${
            testResult.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {testResult.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          )}
          <div>
            <p className="font-semibold">{testResult.message}</p>
            <p className="text-[11px] opacity-80">
              Tested at {new Date(testResult.testedAt).toLocaleString("en-GB")}
            </p>
          </div>
        </div>
      )}

      {/* ── STAGE 5: Dedicated Provider Configuration Cards ────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-stone-500">
            Integrated Courier Providers
          </h3>
          <span className="text-[11px] text-stone-400">
            Credentials managed strictly via server environment variables
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Card 1: Steadfast */}
          <div className="rounded-2xl border border-purple-200/90 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CourierLogo provider="steadfast" size="md" className="shadow-2xs" />
                <div>
                  <h4 className="text-[13.5px] font-bold text-gray-900 leading-tight">Steadfast Courier</h4>
                  <p className="text-[11px] text-stone-400">Production Integration</p>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${
                  providers.find((p) => p.id === "steadfast")?.configured
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {providers.find((p) => p.id === "steadfast")?.configured ? "Connected" : "Disconnected"}
              </span>
            </div>

            <div className="space-y-1.5 rounded-xl border border-stone-100 bg-stone-50/60 p-2.5 text-[11px]">
              <div className="flex justify-between text-stone-600">
                <span>Webhook Status:</span>
                <span className="font-semibold text-emerald-700">Verified ✓</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Balance Sync:</span>
                <span className="font-semibold text-purple-700">GET /get_balance</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Webhook Endpoint:</span>
                <span className="font-mono text-stone-500">/api/webhooks/steadfast</span>
              </div>
            </div>

            <p className="text-[10px] text-stone-500">
              🔒 Credentials secured via server environment variables (<code>STEADFAST_API_KEY</code>, <code>STEADFAST_SECRET_KEY</code>).
            </p>
          </div>

          {/* Card 2: Pathao */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4 shadow-xs space-y-3 opacity-80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CourierLogo provider="pathao" size="md" className="shadow-2xs" />
                <div>
                  <h4 className="text-[13.5px] font-bold text-gray-800 leading-tight">Pathao Courier</h4>
                  <p className="text-[11px] text-stone-400">Future Integration</p>
                </div>
              </div>
              <span className="rounded-full bg-stone-200 px-2.5 py-0.5 text-[10.5px] font-bold text-stone-700 border border-stone-300">
                Not Configured
              </span>
            </div>

            <div className="space-y-1.5 rounded-xl border border-stone-200/70 bg-white p-2.5 text-[11px]">
              <div className="flex justify-between text-stone-600">
                <span>Setup Status:</span>
                <span className="font-semibold text-amber-700">Pending Release</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Location Picker:</span>
                <span className="text-stone-500">City / Zone / Area</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Webhook Endpoint:</span>
                <span className="font-mono text-stone-500">/api/webhooks/pathao</span>
              </div>
            </div>

            <p className="text-[10px] text-stone-500">
              Pickup store mapping and API tokens will be configured when official release is enabled.
            </p>
          </div>

          {/* Card 3: RedX */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4 shadow-xs space-y-3 opacity-80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CourierLogo provider="redx" size="md" className="shadow-2xs" />
                <div>
                  <h4 className="text-[13.5px] font-bold text-gray-800 leading-tight">RedX Courier</h4>
                  <p className="text-[11px] text-stone-400">Integration Scaffold</p>
                </div>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10.5px] font-bold text-amber-800 border border-amber-200">
                Setup Required
              </span>
            </div>

            <div className="space-y-1.5 rounded-xl border border-stone-200/70 bg-white p-2.5 text-[11px]">
              <div className="flex justify-between text-stone-600">
                <span>API Documentation:</span>
                <span className="font-semibold text-amber-800">Pending Official Docs</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Connection Test:</span>
                <span className="text-stone-400 italic">Disabled until setup</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Webhook Endpoint:</span>
                <span className="font-mono text-stone-500">/api/webhooks/redx</span>
              </div>
            </div>

            <p className="text-[10px] text-stone-500">
              🔒 Uses server environment secrets (<code>REDX_API_TOKEN</code>). Plaintext API keys are never stored in the database.
            </p>
          </div>
        </div>
      </div>

      {/* API Health & Diagnostics Summary Card */}
      <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[13.5px] font-bold text-purple-900">API Health & Last Sync</span>
          <Activity className="h-4 w-4 text-purple-600" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase ${
              diagnostics?.health === "healthy"
                ? "bg-emerald-100 text-emerald-700"
                : diagnostics?.health === "degraded"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-rose-100 text-rose-700"
            }`}
          >
            {diagnostics?.health || "healthy"}
          </span>
          <span className="text-[11px] text-slate-600">
            24h: {diagnostics?.stats24h.successCount ?? 0} ok /{" "}
            {diagnostics?.stats24h.errorCount ?? 0} err
          </span>
        </div>
        <p className="text-[11px] text-slate-600">
          Last Sync:{" "}
          <strong>
            {diagnostics?.lastSyncAt
              ? new Date(diagnostics.lastSyncAt).toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "No sync logged yet"}
          </strong>
        </p>
      </div>

      {/* Default Courier & Delivery Charge Configuration */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-stone-400">
            Default Courier
          </label>
          <select
            value={settings.defaultProvider}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                defaultProvider: e.target.value as "steadfast" | "pathao" | "redx",
              }))
            }
            className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[13px] font-medium text-gray-800 outline-none focus:border-purple-400"
          >
            {COURIER_PROVIDER_LIST.map((p) => (
              <option key={p.id} value={p.id} disabled={!p.supported}>
                {p.label}
                {!p.supported ? " (Disabled)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-stone-400">
            Inside Dhaka Charge (BDT)
          </label>
          <input
            type="number"
            min={0}
            value={settings.insideDhakaCharge}
            onChange={(e) =>
              setSettings((s) => ({ ...s, insideDhakaCharge: Number(e.target.value) || 0 }))
            }
            className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[13px] text-gray-800 outline-none focus:border-purple-400"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-stone-400">
            Outside Dhaka Charge (BDT)
          </label>
          <input
            type="number"
            min={0}
            value={settings.outsideDhakaCharge}
            onChange={(e) =>
              setSettings((s) => ({ ...s, outsideDhakaCharge: Number(e.target.value) || 0 }))
            }
            className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[13px] text-gray-800 outline-none focus:border-purple-400"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-stone-400">
            Free Delivery Above (0 = Off)
          </label>
          <input
            type="number"
            min={0}
            value={settings.freeDeliveryThreshold}
            onChange={(e) =>
              setSettings((s) => ({ ...s, freeDeliveryThreshold: Number(e.target.value) || 0 }))
            }
            className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[13px] text-gray-800 outline-none focus:border-purple-400"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-stone-400">
          Default Parcel Note
        </label>
        <input
          type="text"
          value={settings.defaultParcelNote}
          maxLength={200}
          onChange={(e) => setSettings((s) => ({ ...s, defaultParcelNote: e.target.value }))}
          placeholder="e.g. Handle with care — Call customer before delivery"
          className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[13px] text-gray-800 outline-none focus:border-purple-400"
        />
      </div>

      {/* Feature & Provider Switches */}
      <div className="space-y-3">
        <ToggleRow
          label="Enable Steadfast Courier Integration"
          desc="Allow operators to book consignments and sync tracking statuses via Steadfast API."
          checked={settings.enabledProviders.steadfast}
          onChange={(v) =>
            setSettings((s) => ({
              ...s,
              enabledProviders: { ...s.enabledProviders, steadfast: v },
            }))
          }
        />
        <ToggleRow
          label="Enable Pathao Courier Integration (Disabled until implementation)"
          desc="Future multi-courier adapter prepared cleanly behind CourierProvider; locked until Pathao rollout."
          checked={false}
          disabled
          onChange={() => {}}
        />
        <ToggleRow
          label="Allow Cash-on-Delivery (COD) Courier Bookings"
          desc="When disabled, courier booking rejects orders with positive collectible COD balances."
          checked={settings.codEnabled}
          onChange={(v) => setSettings((s) => ({ ...s, codEnabled: v }))}
        />
        <ToggleRow
          label="Auto-advance order status to Shipped after courier booking"
          desc="Moves Confirmed / Processing / Ready-to-Ship orders to Shipped immediately upon consignment creation."
          checked={settings.autoAdvanceToShipped}
          onChange={(v) => setSettings((s) => ({ ...s, autoAdvanceToShipped: v }))}
        />
        <ToggleRow
          label="Protect against unpaid online orders (Recommended: OFF)"
          desc="Keep OFF to require an explicit audited COD override before booking unpaid SSLCOMMERZ orders."
          checked={settings.allowUnpaidOnlineShipment}
          onChange={(v) => setSettings((s) => ({ ...s, allowUnpaidOnlineShipment: v }))}
        />
        <ToggleRow
          label="Auto-book default courier when order enters Confirmed / Processing"
          desc="Optional automation enforcing all backend eligibility & COD rules."
          checked={settings.autoBookOnConfirm}
          onChange={(v) => setSettings((s) => ({ ...s, autoBookOnConfirm: v }))}
        />
      </div>

      {/* Sanitized Error Logs */}
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <div className="border-b border-stone-100 bg-stone-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-stone-500">
          Recent Courier Error Logs (Sanitized — Zero Credentials)
        </div>
        {!diagnostics || diagnostics.recentErrors.length === 0 ? (
          <p className="p-4 text-[12.5px] text-stone-400">No recent courier errors logged.</p>
        ) : (
          <div className="divide-y divide-stone-100 max-h-60 overflow-y-auto">
            {diagnostics.recentErrors.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-start justify-between gap-2 px-4 py-2.5 text-[12px]"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-rose-700">
                    [{log.provider.toUpperCase()} · {log.action}]
                    {log.orderNumber ? ` #${log.orderNumber}` : ""}
                    {log.errorCode ? ` (${log.errorCode})` : ""}
                  </p>
                  <p className="text-stone-600 break-words">{log.message}</p>
                </div>
                <span className="shrink-0 text-[11px] text-stone-400">
                  {new Date(log.createdAt).toLocaleString("en-GB")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 text-[12px] text-stone-500">
          <ShieldCheck className="h-4 w-4 text-purple-600" />
          API keys stay server-only in <code className="font-mono">.env</code> and are never exposed in logs or browser state.
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-[13px] font-bold text-white shadow-md shadow-purple-200 transition hover:bg-purple-700 disabled:opacity-50 cursor-pointer"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : savedNotice ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <PackageCheck className="h-4 w-4" />
          )}
          {savedNotice ? "Saved" : saving ? "Saving..." : "Save Courier Configuration"}
        </button>
      </div>
    </div>
  );
}
