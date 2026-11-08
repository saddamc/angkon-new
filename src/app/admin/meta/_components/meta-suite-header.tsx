"use client";

import { Download, RefreshCw, Copy, Check } from "lucide-react";
import { InfoPopover } from "@/components/admin/meta/info-popover";
import type { MetaOverviewState } from "../_types/meta-overview.types";

interface MetaSuiteHeaderProps {
  overview: MetaOverviewState;
}

export function MetaSuiteHeader({ overview }: MetaSuiteHeaderProps) {
  const {
    pixelId,
    copiedDatasetId,
    copyDatasetId,
    marketingSettings,
    lastUpdated,
    handleExportCsv,
    analyticsData,
    fetchData,
    refreshing,
  } = overview;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
            {/* Meta Infinite Loop Icon */}
            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16.994 3.003c-2.31 0-4.32 1.35-5.32 3.32-1-1.97-3.01-3.32-5.32-3.32C2.84 3.003 0 5.843 0 9.183c0 4.19 4.31 7.78 10.97 13.82.4.36.93.36 1.33 0C18.96 16.963 23.27 13.373 23.27 9.183c0-3.34-2.84-6.18-6.276-6.18zm-5.32 17.65C5.464 15.113 1.94 11.963 1.94 9.183c0-2.34 1.89-4.24 4.33-4.24 2.06 0 3.86 1.41 4.38 3.42h1.96c.52-2.01 2.32-3.42 4.38-4.24 2.44 0 4.33 1.9 4.33 4.24 0 2.78-3.524 5.93-9.734 11.47z" />
            </svg>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Meta Business Suite Overview
              </h1>
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                5 Advertising Assets
              </span>
              <InfoPopover
                title="Meta Business Suite Overview"
                description="Unified command center for ANGKON's complete Meta advertising and commerce ecosystem. Provides real-time synchronization and health telemetry across Storefront Browser Pixel (Client SDK), Server Conversions API (CAPI Gateway), Meta Marketing API (Ad Spend & Attribution), Dynamic Product Catalog Feed (RSS 2.0 XML), and Domain Verification (Aggregated Event Measurement)."
                whyNeeded="Guarantees zero lost attribution across iOS 14.5+ and privacy filters, validates 100% catalog inventory synchronization for Dynamic Product Ads, and performs dual-ledger audits comparing Meta reported ROAS against actual realized store bank/COD cash."
                metaSource={{
                  label: "Meta Business Suite",
                  url: "https://business.facebook.com",
                  steps: [
                    "Open Meta Business Suite (business.facebook.com)",
                    "Manage all assets across Facebook Page, Instagram Account, Datasets, Catalogs, and Ad Accounts in one centralized location",
                  ],
                }}
                businessImpact="Directly increases return on ad spend (ROAS) by preventing budget waste on over-attributed campaigns, while empowering Advantage+ algorithms with accurate conversion data."
                actionableTip="Ensure all 5 assets show green 'Connected' or 'Live' badges for optimum advertising health."
                align="left"
                iconSize="sm"
              />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time synchronization across browser tracking, server Conversions API, catalog sync, and attribution audits.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Connected Dataset ID pill */}
          {pixelId && (
            <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl font-mono shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-400 font-sans text-[10.5px]">Dataset:</span>
              <span className="font-semibold">{pixelId}</span>
              <button
                type="button"
                onClick={copyDatasetId}
                className="p-0.5 hover:text-slate-900 transition rounded hover:bg-slate-200/60 cursor-pointer"
                title="Copy Dataset ID"
              >
                {copiedDatasetId ? (
                  <Check className="h-3 w-3 text-emerald-600" />
                ) : (
                  <Copy className="h-3 w-3 text-slate-400" />
                )}
              </button>
            </div>
          )}

          {/* Business Account Pill (Plain Stitch) */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 shadow-2xs">
            <span className="h-4 w-4 rounded-md bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[10px]">
              P
            </span>
            <span className="font-semibold text-slate-900 truncate max-w-[100px]">
              {marketingSettings?.accountName || "Plain Stitch"}
            </span>
          </div>

          {lastUpdated && (
            <div className="text-[11px] text-slate-400 font-mono hidden md:flex items-center gap-1 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Updated: {lastUpdated}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!analyticsData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer disabled:opacity-50"
            title="Export Dual-Ledger Audit to CSV"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => void fetchData()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Refreshing..." : "Refresh Live Data"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
