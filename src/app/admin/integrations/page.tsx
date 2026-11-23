"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Database,
  Image as ImageIcon,
  Loader2,
  Lock,
  Mail,
  Megaphone,
  RefreshCw,
  Settings2,
  Truck,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type IntegrationState = "connected" | "sandbox" | "live" | "not-configured" | "disabled";

interface IntegrationCard {
  id: string;
  name: string;
  category: string;
  description: string;
  state: IntegrationState;
  detail: string;
  href: string | null;
  actionLabel: string | null;
  restricted?: boolean;
}

const ICONS: Record<string, typeof CreditCard> = {
  sslcommerz: CreditCard,
  cod: Wallet,
  steadfast: Truck,
  pathao: Truck,
  redx: Truck,
  "meta-pixel": Megaphone,
  "meta-capi": Megaphone,
  "meta-suite": Megaphone,
  email: Mail,
  cloudinary: ImageIcon,
  mongodb: Database,
  cron: RefreshCw,
};

const STATE_STYLE: Record<IntegrationState, { label: string; cls: string }> = {
  connected: {
    label: "Connected",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  live: { label: "Live", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  sandbox: { label: "Sandbox", cls: "border-amber-200 bg-amber-50 text-amber-800" },
  "not-configured": {
    label: "Not configured",
    cls: "border-rose-200 bg-rose-50 text-rose-700",
  },
  disabled: { label: "Disabled", cls: "border-stone-200 bg-stone-100 text-stone-500" },
};

const CATEGORY_ORDER = ["Payments", "Courier", "Marketing", "Messaging", "Media", "Platform"];

export default function AdminIntegrationsPage() {
  const { authFetch } = useAuth();
  const [integrations, setIntegrations] = useState<IntegrationCard[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    connected: number;
    sandbox: number;
    needsAttention: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await authFetch("/api/admin/integrations/status");
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Could not load integration status.");
        return;
      }
      setIntegrations(Array.isArray(data.integrations) ? data.integrations : []);
      setSummary(data.summary || null);
      setError(null);
    } catch {
      setError("Connection error while loading integrations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, IntegrationCard[]>();
    for (const item of integrations) {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    }
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
      category: c,
      items: map.get(c) || [],
    }));
  }, [integrations]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-100/80 bg-purple-50 text-purple-600 shadow-sm">
            <Settings2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Integrations</h1>
            <p className="text-[12.5px] text-gray-500">
              Connection health for payments, couriers, marketing and platform services.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200/90 bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-600 transition hover:border-purple-300 hover:text-purple-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            { label: "Integrations", value: summary.total, tone: "bg-purple-100 text-purple-600" },
            { label: "Connected", value: summary.connected, tone: "bg-emerald-100 text-emerald-600" },
            { label: "Sandbox", value: summary.sandbox, tone: "bg-amber-100 text-amber-700" },
            { label: "Needs attention", value: summary.needsAttention, tone: "bg-rose-100 text-rose-600" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-stone-200/90 bg-white p-3.5 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-gray-500">{s.label}</p>
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${s.tone}`}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="mt-1 text-[18px] font-bold tabular-nums text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl border border-stone-200 bg-white" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] font-semibold text-rose-700">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => (
            <section key={group.category}>
              <h2 className="mb-2 px-0.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-gray-400">
                {group.category}
              </h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.items.map((item) => {
                  const Icon = ICONS[item.id] || Settings2;
                  const state = STATE_STYLE[item.state];
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs transition hover:border-purple-200 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[12.5px] font-bold text-gray-800">
                              {item.name}
                            </p>
                            <p className="text-[10px] text-gray-400">{group.category}</p>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[9.5px] font-bold ${state.cls}`}
                        >
                          {state.label}
                        </span>
                      </div>

                      <p className="mt-2.5 text-[11px] leading-relaxed text-gray-500">
                        {item.description}
                      </p>

                      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                        <p
                          className={`truncate text-[10.5px] font-semibold ${
                            item.state === "not-configured" ? "text-rose-600" : "text-gray-500"
                          }`}
                          title={item.detail}
                        >
                          {item.detail}
                        </p>
                        {item.restricted ? (
                          <span
                            className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold text-stone-400"
                            title="Super administrator access required"
                          >
                            <Lock className="h-3 w-3" />
                            Super admin only
                          </span>
                        ) : item.href && item.actionLabel ? (
                          <Link
                            href={item.href}
                            className="shrink-0 text-[10.5px] font-bold text-purple-700 hover:underline"
                          >
                            {item.actionLabel}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[10.5px] text-gray-400">
        <Loader2 className="h-3 w-3" />
        Status reflects server environment configuration. Secret values are never exposed here.
      </p>
    </div>
  );
}
