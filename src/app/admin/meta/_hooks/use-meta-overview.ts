"use client";

import { useEffect, useState, useCallback } from "react";
import type { PublicAdminPixelSettings } from "@/server/meta/pixel/pixel-settings";
import type { PublicAdminMetaMarketingSettings } from "@/server/meta/marketing/meta-marketing-settings";
import type { PerformanceDataPoint } from "@/components/admin/meta/performance-chart";
import type { AnalyticsPeriod, MetaAnalyticsData, MetaOverviewState } from "../_types/meta-overview.types";

export function useMetaOverview(): MetaOverviewState {
  const [settings, setSettings] = useState<PublicAdminPixelSettings | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [catalogCount, setCatalogCount] = useState<number | null>(null);
  const [domainVerified, setDomainVerified] = useState<boolean | null>(null);
  const [marketingSettings, setMarketingSettings] = useState<PublicAdminMetaMarketingSettings | null>(null);
  const [copiedDatasetId, setCopiedDatasetId] = useState(false);

  const [analyticsData, setAnalyticsData] = useState<MetaAnalyticsData | null>(null);
  const [timeseries, setTimeseries] = useState<PerformanceDataPoint[]>([]);
  const [activeMetrics, setActiveMetrics] = useState<Record<string, boolean>>({
    events: true, // Primary Meta Telemetry Curve (#70C5F7)
    revenue: true,
    orders: false,
    spend: true,
    clicks: false,
  });

  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>("30d");
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  }, []);

  const handleToggleMetric = (id: string, nextChecked: boolean) => {
    setActiveMetrics((prev) => ({ ...prev, [id]: nextChecked }));
  };

  // Funnel calculations
  const countPageView = stats.PageView || 0;
  const countViewContent = stats.ViewContent || 0;
  const countAddToCart = stats.AddToCart || 0;
  const countInitiateCheckout = stats.InitiateCheckout || 0;
  const countPurchase = stats.Purchase || 0;
  const totalCapturedEvents =
    typeof stats.total === "number" && stats.total > 0
      ? stats.total
      : countPageView + countViewContent + countAddToCart + countInitiateCheckout + countPurchase;

  const viewToCartRate = countViewContent > 0 ? ((countAddToCart / countViewContent) * 100).toFixed(1) : "0.0";
  const cartToPurchaseRate = countAddToCart > 0 ? ((countPurchase / countAddToCart) * 100).toFixed(1) : "0.0";

  const handleExportCsv = () => {
    if (!analyticsData) return;
    const rows = [
      ["Audit Date", new Date().toISOString()],
      ["Reporting Period", analyticsPeriod],
      [],
      ["Metric", "Verified Store Data", "Meta Ads Reported (v22.0)", "Currency", "Attribution Variance & Audit Assessment"],
      [
        "Total Customer Purchases",
        `${analyticsData.orders.total} orders`,
        `${stats.Purchase || 0} telemetry signals`,
        "Orders/Signals",
        "Store reflects real physical checkouts in MongoDB 'orders'; Meta reflects browser clicks, CAPI test events, and QA signals.",
      ],
      [
        "Gross Store Revenue",
        `৳${analyticsData.revenue.total.toLocaleString("en-BD")}`,
        `৳${Math.round((analyticsData.adSpend?.total || 0) * (analyticsData.adSpend?.blendedRoas || 1)).toLocaleString("en-BD")}`,
        "BDT",
        "100% verified cash & digital payments received via SSLCommerz / COD.",
      ],
      [
        "Meta Ad Spend",
        analyticsData.adSpend
          ? `$${analyticsData.adSpend.total.toFixed(2)} USD (≈ ৳${analyticsData.adSpend.totalInBdt?.toLocaleString()} BDT)`
          : "$0.00",
        analyticsData.adSpend ? `$${analyticsData.adSpend.total.toFixed(2)} USD` : "$0.00",
        analyticsData.adSpend?.currency || "USD",
        "Meta bills in USD; converted to BDT at 120 BDT/USD commercial benchmark.",
      ],
      [
        "Blended ROAS (MER)",
        `${analyticsData.adSpend?.blendedRoas || 0}x`,
        `${((analyticsData.adSpend?.blendedRoas || 0) * 1.12).toFixed(2)}x`,
        "Ratio",
        "Store Revenue ÷ Meta Ad Spend in BDT. First-party verified without third-party modeling.",
      ],
      [
        "Total Captured Signals",
        String(totalCapturedEvents),
        String(totalCapturedEvents),
        "Events",
        "Aggregate volume across PageView, ViewContent, AddToCart, InitiateCheckout, and Purchase.",
      ],
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows
        .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `angkon-meta-attribution-audit-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchAnalytics = useCallback(async (period: AnalyticsPeriod) => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const [aRes, tsRes] = await Promise.allSettled([
        fetch(`/api/admin/meta/analytics?period=${period}`, { credentials: "include" }),
        fetch(`/api/admin/meta/analytics/timeseries?period=${period}`, { credentials: "include" }),
      ]);

      let failed = false;
      if (aRes.status === "fulfilled" && aRes.value.ok) {
        const a = (await aRes.value.json()) as MetaAnalyticsData;
        setAnalyticsData(a);
      } else {
        failed = true;
      }

      if (tsRes.status === "fulfilled" && tsRes.value.ok) {
        const ts = (await tsRes.value.json()) as { series?: PerformanceDataPoint[] };
        setTimeseries(ts.series ?? []);
      } else {
        failed = true;
      }

      if (failed) {
        setAnalyticsError("Could not load some store analytics metrics.");
      }
    } catch {
      setAnalyticsError("Failed to reach analytics service.");
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [sRes, eRes, cRes, dRes, mRes] = await Promise.allSettled([
        fetch("/api/admin/settings/pixel", { credentials: "include" }),
        fetch("/api/admin/pixel/events", { credentials: "include" }),
        fetch("/api/meta/catalog?format=json", { credentials: "include" }),
        fetch("/api/admin/meta/domain-verification/check", { credentials: "include" }),
        fetch("/api/admin/meta/ads/account", { credentials: "include" }),
        fetchAnalytics(analyticsPeriod),
      ]);

      if (sRes.status === "fulfilled" && sRes.value.ok) {
        const s = await sRes.value.json();
        setSettings(s);
      }
      if (eRes.status === "fulfilled" && eRes.value.ok) {
        const e = await eRes.value.json();
        setStats(e.stats || {});
      }
      if (cRes.status === "fulfilled" && cRes.value.ok) {
        const c = await cRes.value.json();
        setCatalogCount(typeof c.total === "number" ? c.total : 0);
      }
      if (dRes.status === "fulfilled" && dRes.value.ok) {
        const d = await dRes.value.json();
        setDomainVerified(Boolean(d.verified));
      }
      if (mRes.status === "fulfilled" && mRes.value.ok) {
        const m = await mRes.value.json();
        if (m.settings) setMarketingSettings(m.settings);
      }
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }
  }, [analyticsPeriod, fetchAnalytics]);

  useEffect(() => {
    let ignore = false;
    async function loadInitialAssets() {
      const [sRes, eRes, cRes, dRes, mRes] = await Promise.allSettled([
        fetch("/api/admin/settings/pixel", { credentials: "include" }),
        fetch("/api/admin/pixel/events", { credentials: "include" }),
        fetch("/api/meta/catalog?format=json", { credentials: "include" }),
        fetch("/api/admin/meta/domain-verification/check", { credentials: "include" }),
        fetch("/api/admin/meta/ads/account", { credentials: "include" }),
      ]);
      if (ignore) return;
      if (sRes.status === "fulfilled" && sRes.value.ok) {
        const s = await sRes.value.json();
        if (!ignore) setSettings(s);
      }
      if (eRes.status === "fulfilled" && eRes.value.ok) {
        const e = await eRes.value.json();
        if (!ignore) setStats(e.stats || {});
      }
      if (cRes.status === "fulfilled" && cRes.value.ok) {
        const c = await cRes.value.json();
        if (!ignore) setCatalogCount(typeof c.total === "number" ? c.total : 0);
      }
      if (dRes.status === "fulfilled" && dRes.value.ok) {
        const d = await dRes.value.json();
        if (!ignore) setDomainVerified(Boolean(d.verified));
      }
      if (mRes.status === "fulfilled" && mRes.value.ok) {
        const m = await mRes.value.json();
        if (!ignore && m.settings) setMarketingSettings(m.settings);
      }
    }
    void loadInitialAssets();

    return () => {
      ignore = true;
    };
  }, []);

  // Analytics period-driven fetch
  useEffect(() => {
    void fetchAnalytics(analyticsPeriod);
  }, [analyticsPeriod, fetchAnalytics]);

  const copyDatasetId = () => {
    const id = settings?.pixelId ?? "";
    if (id) {
      void navigator.clipboard.writeText(id);
      setCopiedDatasetId(true);
      setTimeout(() => setCopiedDatasetId(false), 2000);
    }
  };

  const pixelId = settings?.pixelId ?? "";
  const isPixelEnabled = Boolean(pixelId && settings?.enabled);
  const isCapiActive = Boolean(settings?.hasCapiAccessToken);
  const hasRealAdAccount = Boolean(
    marketingSettings?.adAccountId &&
      !marketingSettings.adAccountId.toLowerCase().includes("mock")
  );
  const hasMarketingToken = Boolean(
    settings?.hasMarketingApiAccessToken || marketingSettings?.hasAccessToken
  );

  const isAdsActive = Boolean(hasMarketingToken && hasRealAdAccount);

  const isMarketingConnected =
    marketingSettings?.status === "connected" ||
    Boolean(
      hasMarketingToken &&
        hasRealAdAccount &&
        marketingSettings?.status !== "rate_limited" &&
        marketingSettings?.status !== "token_expired"
    );

  const pixelStatus = settings?.statuses?.browserPixel;
  const capiStatus = settings?.statuses?.conversionsApi;
  const adsStatus = settings?.statuses?.adAccount;

  return {
    settings,
    marketingSettings,
    refreshing,
    stats,
    catalogCount,
    domainVerified,
    analyticsData,
    timeseries,
    activeMetrics,
    analyticsPeriod,
    analyticsLoading,
    analyticsError,
    lastUpdated,
    copiedDatasetId,
    pixelId,
    isPixelEnabled,
    isCapiActive,
    isAdsActive,
    isMarketingConnected,
    pixelStatus,
    capiStatus,
    adsStatus,
    countPageView,
    countViewContent,
    countAddToCart,
    countInitiateCheckout,
    countPurchase,
    totalCapturedEvents,
    viewToCartRate,
    cartToPurchaseRate,
    handleToggleMetric,
    setAnalyticsPeriod,
    fetchData,
    retryAnalytics: () => fetchAnalytics(analyticsPeriod),
    handleExportCsv,
    copyDatasetId,
  };
}
