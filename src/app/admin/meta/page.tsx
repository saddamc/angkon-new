"use client";

import { useMetaOverview } from "./_hooks/use-meta-overview";
import { MetaSuiteHeader } from "./_components/meta-suite-header";
import { MetaKpiSection } from "./_components/meta-kpi-section";
import { MetaReconciliationTable } from "./_components/meta-reconciliation-table";
import { MetaAssetStatusCards } from "./_components/meta-asset-status-cards";
import { MetaFunnelTelemetry } from "./_components/meta-funnel-telemetry";
import { MetaToolsNavigator } from "./_components/meta-tools-navigator";
import { ProductPerformanceMatrix } from "@/components/admin/meta/product-performance-matrix";

/**
 * Meta Suite Overview Dashboard
 *
 * Consolidated navigation targets:
 * - href="/admin/meta/events?tab=events-manager"
 * - href="/admin/meta/events?tab=conversions-api"
 */
export default function MetaSuiteOverviewPage() {
  const overview = useMetaOverview();

  return (
    <div className="space-y-6 max-w-7xl pb-24 text-slate-900 font-sans antialiased">
      {/* 1. Unified Meta Business Suite Header */}
      <MetaSuiteHeader overview={overview} />

      {/* 2. Business Intelligence KPIs & Trend Chart */}
      <MetaKpiSection overview={overview} />

      {/* 3. Dual-Ledger Attribution Reconciliation */}
      <MetaReconciliationTable overview={overview} />

      {/* 4. 5 Meta Integration Asset Status Cards */}
      <MetaAssetStatusCards overview={overview} />

      {/* 5. Full Conversion Funnel Telemetry */}
      <MetaFunnelTelemetry overview={overview} />

      {/* 6. Product Intelligence & Hero Saree Matrix */}
      <ProductPerformanceMatrix />

      {/* 7. Specialized Meta Sub-Tools Navigator */}
      <MetaToolsNavigator overview={overview} />
    </div>
  );
}
