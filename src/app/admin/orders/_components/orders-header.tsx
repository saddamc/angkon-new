"use client";

import Link from "next/link";
import { AlertCircle, RefreshCw, Settings2, ShoppingCart, Truck, Wallet } from "lucide-react";
import type { AdminOrdersHookReturn } from "../_hooks/use-admin-orders";
import { COURIER_PROVIDER_LIST } from "@/server/courier/tracking";

interface OrdersHeaderProps {
  state?: AdminOrdersHookReturn;
}

function formatSyncTime(iso?: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-BD", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

export function OrdersHeader({ state }: OrdersHeaderProps) {
  const steadfastBalance = state?.courierOverview?.balances?.steadfast;
  const balance = steadfastBalance?.balance ?? null;
  const balanceError = steadfastBalance?.error ?? null;
  const lastSyncAt = steadfastBalance?.lastSyncedAt ?? null;
  const isConfigured =
    steadfastBalance?.configured ?? state?.courierProviders?.steadfast?.configured ?? false;
  const providers = state?.courierProviders;
  const refreshing = state?.refreshingBalance ?? false;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-sm border border-purple-100/80">
          <ShoppingCart className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Order Management</h1>
          <p className="text-[12.5px] text-gray-500">
            Manage orders, payments and deliveries in one place.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Steadfast Account Balance Widget */}
        {isConfigured ? (
          balance !== null ? (
            <div
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[12px] font-bold shadow-xs ${
                steadfastBalance?.isMock || steadfastBalance?.simulated
                  ? "border-amber-300 bg-amber-50/90 text-amber-900"
                  : "border-emerald-200 bg-emerald-50/90 text-emerald-800"
              }`}
              title={
                steadfastBalance?.isMock || steadfastBalance?.simulated
                  ? "Simulated courier balance in development / test mode. This is NOT real merchant financial data."
                  : "Merchant ledger balance reported by Steadfast. This is not a guarantee of immediately withdrawable funds. It does not independently determine shipment eligibility."
              }
            >
              <Wallet
                className={`h-3.5 w-3.5 shrink-0 ${
                  steadfastBalance?.isMock || steadfastBalance?.simulated
                    ? "text-amber-600"
                    : "text-emerald-600"
                }`}
              />
              <span>
                {steadfastBalance?.isMock || steadfastBalance?.simulated
                  ? `Steadfast Balance (Simulated / Dev): ৳${balance.toLocaleString("en-BD")}`
                  : `Steadfast Account Balance: ৳${balance.toLocaleString("en-BD")}`}
              </span>
              {(steadfastBalance?.isMock || steadfastBalance?.simulated) && (
                <span className="rounded bg-amber-200 px-1 py-0.5 text-[9.5px] font-extrabold uppercase text-amber-900">
                  MOCK
                </span>
              )}
              {lastSyncAt && (
                <span
                  className={`hidden md:inline font-normal text-[10.5px] ${
                    steadfastBalance?.isMock || steadfastBalance?.simulated
                      ? "text-amber-700"
                      : "text-emerald-600"
                  }`}
                >
                  (Synced {formatSyncTime(lastSyncAt)})
                </span>
              )}
              <button
                type="button"
                onClick={() => void state?.loadCourierOverview?.(true)}
                disabled={refreshing}
                title="Refresh Steadfast account balance"
                className={`ml-0.5 rounded p-0.5 transition cursor-pointer disabled:opacity-50 ${
                  steadfastBalance?.isMock || steadfastBalance?.simulated
                    ? "text-amber-800 hover:bg-amber-200/50"
                    : "text-emerald-700 hover:bg-emerald-200/50"
                }`}
              >
                <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          ) : (
            <div
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-1.5 text-[11.5px] font-semibold text-amber-800 shadow-xs"
              title={balanceError ? `${balanceError}. Merchant ledger balance is not a guarantee of immediately withdrawable funds; bookings are not blocked.` : "Merchant ledger balance reported by Steadfast. This is not a guarantee of immediately withdrawable funds. It does not independently determine shipment eligibility."}
            >
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span className="truncate max-w-[200px]">
                Steadfast Account Balance: {balanceError ? "Sync issue" : "Unavailable"}
              </span>
              <button
                type="button"
                onClick={() => void state?.loadCourierOverview?.(true)}
                disabled={refreshing}
                title="Retry balance sync"
                className="ml-0.5 rounded p-0.5 text-amber-800 hover:bg-amber-200/50 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          )
        ) : null}

        {providers && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-purple-100 bg-white px-2.5 py-1.5 shadow-xs">
            <Truck className="h-3.5 w-3.5 text-purple-500" />
            {COURIER_PROVIDER_LIST.map((p) => {
              const status = providers[p.id as keyof typeof providers];
              const active = p.supported && Boolean(status?.configured) && status?.enabled !== false;
              return (
                <span
                  key={p.id}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    !p.supported
                      ? "bg-slate-100 text-slate-400"
                      : active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                  }`}
                  title={
                    !p.supported
                      ? p.disabledReason || `${p.label} disabled`
                      : active
                        ? `${p.label} API configured & enabled`
                        : `${p.label} needs .env credentials or is disabled`
                  }
                >
                  {p.shortLabel}
                  {!p.supported ? " (Soon)" : ""}
                </span>
              );
            })}
          </div>
        )}

        <Link
          href="/admin/settings?tab=courier"
          className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-purple-700 transition hover:bg-purple-50 shadow-xs"
          title="Configure courier integrations, delivery charges & COD rules"
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Courier Settings</span>
        </Link>
      </div>
    </div>
  );
}
