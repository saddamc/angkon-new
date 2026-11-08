"use client";

import Link from "next/link";
import { Activity, Server, TrendingUp, ShoppingBag, ArrowRight } from "lucide-react";
import type { MetaOverviewState } from "../_types/meta-overview.types";

interface MetaToolsNavigatorProps {
  overview: MetaOverviewState;
}

export function MetaToolsNavigator({ overview }: MetaToolsNavigatorProps) {
  const { totalCapturedEvents } = overview;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
        Meta Suite Modules &amp; Documentation
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tool 1: Events Manager */}
        <div className="rounded-2xl border border-slate-200/90 border-t-2 border-t-blue-500 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 hover:shadow-sm transition">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Events Manager</h4>
                  <span className="text-[11px] text-slate-500">Live Telemetry &amp; Diagnostics</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                {totalCapturedEvents.toLocaleString()} Events
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pt-1">
              Inspect raw event payloads, browser vs server deduplication status, error codes, and run live interactive test simulations.
            </p>
          </div>
          <div className="pt-4 mt-3 border-t border-slate-100">
            <Link
              href="/admin/meta/events?tab=events-manager"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
            >
              <span>Open Events Manager</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Tool 2: Conversions API */}
        <div className="rounded-2xl border border-slate-200/90 border-t-2 border-t-indigo-500 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 hover:shadow-sm transition">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                  <Server className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Conversions API (CAPI) Gateway</h4>
                  <span className="text-[11px] text-slate-500">Server-Side Tracking</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                SHA-256 Active
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pt-1">
              Bypass ad-blockers and iOS privacy restrictions with server-to-server sync. Includes SHA-256 customer data hashing and token encryption.
            </p>
          </div>
          <div className="pt-4 mt-3 border-t border-slate-100">
            <Link
              href="/admin/meta/events?tab=conversions-api"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              <span>Configure CAPI Gateway</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Tool 3: Ads & Attribution */}
        <div className="rounded-2xl border border-slate-200/90 border-t-2 border-t-amber-500 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-amber-300 hover:shadow-sm transition">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Ads &amp; Attribution Audit</h4>
                  <span className="text-[11px] text-slate-500">Marketing API &amp; ROAS</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 font-mono">
                USD Billed
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pt-1">
              Connect your Meta Ad Account to compare platform-attributed revenue against actual realized store cash, net of cancellations and refunds.
            </p>
          </div>
          <div className="pt-4 mt-3 border-t border-slate-100">
            <Link
              href="/admin/meta/ads"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900"
            >
              <span>Audit Attribution &amp; Spend</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Tool 4: Catalog & Domain */}
        <div className="rounded-2xl border border-slate-200/90 border-t-2 border-t-purple-500 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-purple-300 hover:shadow-sm transition">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Catalog Feed &amp; Domain Priority</h4>
                  <span className="text-[11px] text-slate-500">Commerce &amp; AEM Setup</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 font-mono">
                16 Products
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pt-1">
              Access your live XML product feed for Facebook &amp; Instagram Shops, verify your domain with Meta, and configure 8-event AEM priority.
            </p>
          </div>
          <div className="pt-4 mt-3 border-t border-slate-100 flex items-center gap-4">
            <Link
              href="/admin/meta/catalog"
              className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-800"
            >
              <span>Catalog Feed</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href="/admin/meta/domain-verification"
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-800"
            >
              <span>Domain Verification</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
