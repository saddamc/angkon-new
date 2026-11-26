"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Lock,
  Package,
  RefreshCw,
  Settings2,
  Truck,
  Wallet,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface CourierOverview {
  providers?: {
    steadfast?: {
      configured?: boolean;
      enabled?: boolean;
      label?: string;
      mode?: "live" | "mock";
      isMock?: boolean;
      liveBookingEnabled?: boolean;
      reason?: string | null;
    };
    pathao?: { configured?: boolean; enabled?: boolean; supported?: boolean; disabledReason?: string };
  };
  balances?: {
    steadfast?: {
      balance: number | null;
      error: string | null;
      lastSyncedAt: string | null;
      configured: boolean;
      isMock?: boolean;
      simulated?: boolean;
    };
  };
  diagnostics?: {
    lastSyncAt: string | null;
    health: "healthy" | "degraded" | "critical" | string;
    stats24h?: { totalCalls: number; errorCount: number; successCount: number };
  };
  webhooks?: { steadfast?: boolean };
}

interface CourierSummary {
  stats: {
    total: number;
    pending: number;
    inTransit: number;
    delivered: number;
    failed: number;
    last7d: number;
    codInFlight: number;
  };
  shipments: {
    id: string;
    orderNumber: string;
    provider: string;
    status: string;
    consignmentId: string;
    trackingCode: string;
    mode: string;
    isMock: boolean;
    codAmount: number;
    createdAt: string;
    lastSyncedAt: string | null;
  }[];
}

function fmtBdt(n: number) {
  return `৳${Math.round(n).toLocaleString("en-BD")}`;
}

function statusTone(status: string) {
  const s = status.toLowerCase();
  if (s === "delivered") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["in_transit", "out_for_delivery", "picked_up"].includes(s))
    return "border-indigo-200 bg-indigo-50 text-indigo-700";
  if (["pending", "created", "pickup_pending"].includes(s))
    return "border-amber-200 bg-amber-50 text-amber-800";
  if (["failed", "cancelled", "booking_failed"].includes(s))
    return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-stone-200 bg-stone-50 text-stone-600";
}

export default function AdminCouriersPage() {
  const { authFetch } = useAuth();
  const [overview, setOverview] = useState<CourierOverview | null>(null);
  const [summary, setSummary] = useState<CourierSummary | null>(null);
  const [role, setRole] = useState<string>("admin");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(
    async (manual = false) => {
      if (manual) setRefreshing(true);
      try {
        const [oRes, sRes, meRes] = await Promise.all([
          authFetch("/api/admin/couriers/overview"),
          authFetch("/api/admin/couriers/summary"),
          authFetch("/api/admin/login"),
        ]);
        if (oRes.ok) setOverview(await oRes.json());
        if (sRes.ok) setSummary(await sRes.json());
        if (meRes.ok) {
          const me = await meRes.json();
          setRole(me?.role || "admin");
        }
        if (!oRes.ok && !sRes.ok) setError("Courier data is unavailable right now.");
        else setError(null);
      } catch {
        setError("Connection error while loading courier data.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authFetch]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const steadfast = overview?.providers?.steadfast;
  const balance = overview?.balances?.steadfast;
  const balanceIsSimulated = Boolean(balance?.isMock || balance?.simulated);
  const isLive = steadfast?.mode === "live" && !steadfast?.isMock;

  const syncAll = async () => {
    setSyncing(true);
    setNotice(null);
    try {
      const res = await authFetch("/api/admin/shipments/sync", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setNotice(data?.error || "Courier sync failed.");
        return;
      }
      setNotice(
        `Synced ${data?.synced ?? 0} consignment${data?.synced === 1 ? "" : "s"}` +
          (data?.changed ? ` · ${data.changed} updated` : "") +
          (data?.failed ? ` · ${data.failed} failed` : "")
      );
      await load();
    } catch {
      setNotice("Connection error while syncing consignments.");
    } finally {
      setSyncing(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setNotice(null);
    try {
      const res = await authFetch("/api/admin/settings/courier/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "steadfast" }),
      });
      const data = await res.json().catch(() => null);
      setNotice(
        res.ok && data?.ok
          ? `Steadfast connection OK${typeof data?.balance === "number" ? ` · balance ${fmtBdt(data.balance)}` : ""}`
          : data?.error || "Steadfast connection test failed."
      );
      await load();
    } catch {
      setNotice("Connection error while testing Steadfast.");
    } finally {
      setTesting(false);
    }
  };

  const refreshShipment = async (id: string) => {
    try {
      const res = await authFetch(`/api/admin/shipments/${id}/refresh`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setNotice(data?.error || "Could not refresh that consignment.");
        return;
      }
      await load();
    } catch {
      setNotice("Connection error while refreshing the consignment.");
    }
  };

  const stats = summary?.stats;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-100/80 bg-purple-50 text-purple-600 shadow-sm">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Couriers</h1>
            <p className="text-[12.5px] text-gray-500">
              Provider health, consignments and delivery operations in one place.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200/90 bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-600 transition hover:border-purple-300 hover:text-purple-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/admin/settings?tab=general"
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200/90 bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-600 transition hover:border-purple-300 hover:text-purple-700"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Settings
          </Link>
          {role === "superadmin" ? (
            <Link
              href="/admin/settings?tab=courier"
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-1.5 text-[12px] font-bold text-white shadow-sm shadow-purple-200 transition hover:bg-purple-700"
            >
              <Truck className="h-3.5 w-3.5" />
              Courier settings
            </Link>
          ) : (
            <span
              title="Super administrator access required"
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-100 px-3 py-1.5 text-[12px] font-semibold text-stone-400"
            >
              <Lock className="h-3.5 w-3.5" />
              Courier settings
            </span>
          )}
        </div>
      </div>

      {/* Mode banner */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-2.5 text-[11.5px] font-semibold ${
          isLive
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        <span className="flex items-center gap-1.5">
          {isLive ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          {isLive
            ? "Live mode — bookings create real Steadfast parcels."
            : steadfast?.reason ||
              "Mock / sandbox mode — bookings are simulated and no real parcels are created."}
        </span>
        <span className="text-[10.5px] font-bold uppercase tracking-wide">
          {steadfast?.configured ? (isLive ? "LIVE" : "SANDBOX") : "NOT CONFIGURED"}
        </span>
      </div>

      {notice && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-[11.5px] font-semibold text-purple-800">
          {notice}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] font-semibold text-rose-700">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-stone-200 bg-white" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Consignments", value: stats?.total ?? 0, icon: Package, tone: "bg-purple-100 text-purple-600" },
            { label: "Pending pickup", value: stats?.pending ?? 0, icon: Truck, tone: "bg-amber-100 text-amber-700" },
            { label: "In transit", value: stats?.inTransit ?? 0, icon: Truck, tone: "bg-indigo-100 text-indigo-600" },
            { label: "Delivered", value: stats?.delivered ?? 0, icon: CheckCircle2, tone: "bg-emerald-100 text-emerald-600" },
            { label: "Failed", value: stats?.failed ?? 0, icon: XCircle, tone: "bg-rose-100 text-rose-600" },
            { label: "COD in transit", value: fmtBdt(stats?.codInFlight ?? 0), icon: Wallet, tone: "bg-stone-100 text-stone-600" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-2xl border border-stone-200/90 bg-white p-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <p className="text-[10.5px] font-semibold text-gray-500">{s.label}</p>
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${s.tone}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="mt-1 text-[17px] font-bold tabular-nums text-gray-900">
                  {typeof s.value === "number" ? s.value.toLocaleString("en-BD") : s.value}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Providers */}
        <div className="space-y-3 xl:col-span-1">
          <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Truck className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[12.5px] font-bold text-gray-800">Steadfast</p>
                  <p className="text-[10px] text-gray-400">Primary courier</p>
                </div>
              </div>
              <span
                className={`rounded-full border px-2 py-0.5 text-[9.5px] font-bold ${
                  steadfast?.configured
                    ? isLive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {steadfast?.configured ? (isLive ? "Live" : "Sandbox") : "Not configured"}
              </span>
            </div>

            <dl className="mt-3 space-y-2 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-gray-500">Account balance</dt>
                <dd className="font-bold tabular-nums text-gray-800">
                  {balanceIsSimulated
                    ? "Test mode — not real"
                    : balance?.balance != null
                      ? fmtBdt(balance.balance)
                      : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-gray-500">Webhook secret</dt>
                <dd className="font-semibold text-gray-700">
                  {overview?.webhooks?.steadfast ? "Configured" : "Missing"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-gray-500">API health (24h)</dt>
                <dd className="font-semibold capitalize text-gray-700">
                  {overview?.diagnostics?.health || "—"} · {overview?.diagnostics?.stats24h?.errorCount ?? 0} errors
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-gray-500">Last sync</dt>
                <dd className="font-semibold text-gray-700">
                  {overview?.diagnostics?.lastSyncAt
                    ? new Date(overview.diagnostics.lastSyncAt).toLocaleString("en-BD", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </dd>
              </div>
            </dl>

            <div className="mt-3 flex flex-wrap gap-2">
              {role === "superadmin" && (
                <button
                  type="button"
                  onClick={() => void testConnection()}
                  disabled={testing}
                  className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-white px-2.5 py-1.5 text-[10.5px] font-bold text-purple-700 hover:bg-purple-50 disabled:opacity-50"
                >
                  {testing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Test connection
                </button>
              )}
              <button
                type="button"
                onClick={() => void syncAll()}
                disabled={syncing}
                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[10.5px] font-bold text-gray-600 hover:bg-stone-50 disabled:opacity-50"
              >
                {syncing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Sync active
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-stone-400">
                  <Truck className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[12px] font-bold text-gray-700">Pathao</p>
                  <p className="text-[10px] text-gray-400">Secondary courier</p>
                </div>
              </div>
              <span className="rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[9.5px] font-bold text-stone-500">
                Soon
              </span>
            </div>
            <p className="mt-2 text-[10.5px] text-gray-400">
              {overview?.providers?.pathao?.disabledReason || "Planned for a future release."}
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-stone-400">
                  <Truck className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[12px] font-bold text-gray-700">RedX</p>
                  <p className="text-[10px] text-gray-400">Secondary courier</p>
                </div>
              </div>
              <span className="rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[9.5px] font-bold text-stone-500">
                Soon
              </span>
            </div>
            <p className="mt-2 text-[10.5px] text-gray-400">Planned for a future release.</p>
          </div>
        </div>

        {/* Recent consignments */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs xl:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[13px] font-bold text-gray-800">Recent consignments</h2>
              <p className="text-[10.5px] text-gray-400">Latest courier bookings across all orders.</p>
            </div>
            <Link href="/admin/orders" className="text-[11px] font-bold text-purple-700 hover:underline">
              All orders
            </Link>
          </div>

          {loading ? (
            <div className="mt-3 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-11 animate-pulse rounded-xl bg-purple-50/50" />
              ))}
            </div>
          ) : (summary?.shipments?.length ?? 0) === 0 ? (
            <p className="py-10 text-center text-[12px] text-gray-400">
              No consignments yet. Book one from the Orders table.
            </p>
          ) : (
            <div className="mt-2 divide-y divide-stone-200/60">
              {summary!.shipments.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-2 py-2">
                  <Link
                    href={`/admin/orders?search=${encodeURIComponent(s.orderNumber)}`}
                    className="w-[132px] shrink-0 truncate font-mono text-[11.5px] font-bold text-purple-700 hover:underline"
                  >
                    #{s.orderNumber}
                  </Link>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[9.5px] font-bold capitalize ${statusTone(
                      s.status
                    )}`}
                  >
                    {s.status.replace(/_/g, " ")}
                  </span>
                  {s.isMock && (
                    <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[8.5px] font-bold text-stone-500">
                      TEST
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-gray-500">
                    {s.consignmentId || s.trackingCode || "—"}
                  </span>
                  <span className="text-[10px] tabular-nums text-gray-400">
                    {new Date(s.createdAt).toLocaleDateString("en-BD", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  {(s.consignmentId || s.trackingCode) && (
                    <button
                      type="button"
                      onClick={() => void refreshShipment(s.id)}
                      className="rounded-md p-1 text-gray-400 hover:bg-stone-100 hover:text-purple-700"
                      title="Refresh this consignment"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </button>
                  )}
                  <a
                    href={`https://portal.packzy.com/tracking?consignment_id=${encodeURIComponent(
                      s.consignmentId || s.trackingCode
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md p-1 text-gray-400 hover:bg-stone-100 hover:text-purple-700"
                    title="Open Steadfast tracking"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
