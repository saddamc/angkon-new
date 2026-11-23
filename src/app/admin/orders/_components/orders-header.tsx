"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShoppingCart,
  Truck,
  Wallet,
  X,
} from "lucide-react";
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
  const isMockCourier = Boolean(
    steadfastBalance?.isMock || steadfastBalance?.simulated
  );
  const providers = state?.courierProviders;
  const refreshing = state?.refreshingBalance ?? false;

  const searchRef = useRef<HTMLInputElement | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const needsActionCount = state?.summary?.needsActionCount ?? 0;
  const paymentIssuesCount = state?.summary?.paymentIssuesCount ?? 0;
  const attentionCount = needsActionCount || paymentIssuesCount;
  const syncing = state?.syncingShipments ?? false;

  // Global Ctrl/Cmd+K focuses the order search.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-sm border border-purple-100/80">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Orders</h1>
            <p className="text-[12.5px] text-gray-500">
              Manage orders, payments, and deliveries in one place.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Global search (Ctrl+K) */}
          <div
            className={`relative flex items-center rounded-xl border bg-white transition ${
              searchFocused
                ? "border-purple-400 ring-2 ring-purple-100"
                : "border-stone-200/90 hover:border-purple-300"
            }`}
          >
            <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-gray-400" />
            <input
              ref={searchRef}
              value={state?.searchQuery ?? ""}
              onChange={(e) => state?.setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search order #, customer, phone, consignment…"
              aria-label="Search orders"
              className="w-[210px] bg-transparent py-1.5 pl-8 pr-16 text-[12px] text-gray-700 placeholder:text-gray-400 focus:outline-none sm:w-[260px]"
            />
            {state?.searchQuery ? (
              <button
                type="button"
                onClick={() => state?.setSearchQuery("")}
                className="absolute right-2 rounded p-0.5 text-gray-400 hover:bg-stone-100 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            ) : (
              <span className="pointer-events-none absolute right-2 rounded-md border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[9.5px] font-bold text-stone-400">
                Ctrl K
              </span>
            )}
          </div>

          {/* Attention button */}
          <button
            type="button"
            onClick={() => state?.handleFilterChange("needs_action")}
            title={
              attentionCount > 0
                ? `${attentionCount} order${attentionCount === 1 ? "" : "s"} need action`
                : "No orders need action"
            }
            aria-label={`Needs action: ${attentionCount}`}
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200/90 bg-white text-stone-600 transition hover:border-amber-300 hover:text-amber-700"
          >
            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
            {attentionCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 inline-flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                {attentionCount > 99 ? "99+" : attentionCount}
              </span>
            )}
          </button>

          {/* Sync status */}
          <button
            type="button"
            onClick={() => void state?.syncActiveShipments()}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-purple-700 transition hover:bg-purple-50 disabled:opacity-50 shadow-xs"
            title="Pull the latest delivery statuses from Steadfast — including parcels cancelled in the Steadfast portal. Do this after any change made directly at the courier."
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{syncing ? "Syncing…" : "Sync Status"}</span>
            {state?.lastCourierSyncAt && !syncing && (
              <span className="hidden font-normal text-[9.5px] text-gray-400 lg:inline">
                · {formatSyncTime(state.lastCourierSyncAt)}
              </span>
            )}
          </button>

          {/* Create order */}
          <button
            type="button"
            onClick={() => state?.setCreateOrderModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-[12px] font-bold text-white shadow-sm shadow-purple-200 transition hover:bg-purple-700"
            title="Create a manual / phone order"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Order
          </button>
        </div>
      </div>

      {/* Secondary row: balance, providers, settings */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {isConfigured ? (
          balance !== null ? (
            <div
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[11.5px] font-bold shadow-xs ${
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
                  ? "Steadfast Test Mode (no real balance)"
                  : `Steadfast Account Balance: ৳${balance.toLocaleString("en-BD")}`}
              </span>
              {lastSyncAt && (
                <span
                  className={`hidden md:inline font-normal text-[10px] ${
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
          ) : isMockCourier ? (
            <div
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-1.5 text-[11px] font-semibold text-amber-800 shadow-xs"
              title="Live Steadfast balance is intentionally not queried in mock/development mode."
            >
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>Steadfast Test Mode (live balance unavailable)</span>
            </div>
          ) : (
            <div
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-1.5 text-[11px] font-semibold text-amber-800 shadow-xs"
              title={
                balanceError
                  ? `${balanceError}. Merchant ledger balance is not a guarantee of immediately withdrawable funds; bookings are not blocked.`
                  : "Merchant ledger balance reported by Steadfast. This is not a guarantee of immediately withdrawable funds. It does not independently determine shipment eligibility."
              }
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
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200/90 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-gray-600 transition hover:border-purple-300 hover:text-purple-700 shadow-xs"
          title="Configure courier integrations, delivery charges & COD rules"
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Courier Settings</span>
        </Link>
      </div>
    </div>
  );
}
