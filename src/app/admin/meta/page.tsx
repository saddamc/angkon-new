"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  ShoppingBag,
  Globe,
  Server,
  ArrowRight,
  TrendingUp,
  Eye,
  ShoppingCart,
  CreditCard,
  Sparkles,
  RefreshCw,
  PlayCircle,
} from "lucide-react";
import { MetaNavigationHeader } from "./meta-nav";
import type { PublicAdminPixelSettings } from "@/server/pixel-settings";

export default function MetaSuiteOverviewPage() {
  const [settings, setSettings] = useState<PublicAdminPixelSettings | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [catalogCount, setCatalogCount] = useState<number | null>(null);
  const [domainVerified, setDomainVerified] = useState<boolean | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [sRes, eRes, cRes, dRes] = await Promise.allSettled([
        fetch("/api/admin/settings/pixel"),
        fetch("/api/admin/pixel/events"),
        fetch("/api/meta/catalog?format=json"),
        fetch("/api/admin/meta/domain-verification/check"),
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
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    Promise.allSettled([
      fetch("/api/admin/settings/pixel"),
      fetch("/api/admin/pixel/events"),
      fetch("/api/meta/catalog?format=json"),
      fetch("/api/admin/meta/domain-verification/check"),
    ]).then(([sRes, eRes, cRes, dRes]) => {
      if (ignore) return;
      if (sRes.status === "fulfilled" && sRes.value.ok) {
        void sRes.value.json().then((s) => !ignore && setSettings(s));
      }
      if (eRes.status === "fulfilled" && eRes.value.ok) {
        void eRes.value.json().then((e) => !ignore && setStats(e.stats || {}));
      }
      if (cRes.status === "fulfilled" && cRes.value.ok) {
        void cRes.value
          .json()
          .then((c) => !ignore && setCatalogCount(typeof c.total === "number" ? c.total : 0));
      }
      if (dRes.status === "fulfilled" && dRes.value.ok) {
        void dRes.value
          .json()
          .then((d) => !ignore && setDomainVerified(Boolean(d.verified)));
      }
    });

    return () => {
      ignore = true;
    };
  }, []);

  const pixelId = settings?.pixelId ?? "";
  const isPixelEnabled = Boolean(pixelId && settings?.enabled);
  const isCapiActive = Boolean(settings?.hasCapiAccessToken);
  const isAdsActive = Boolean(settings?.hasMarketingApiAccessToken);

  const pixelStatus = settings?.statuses?.browserPixel;
  const capiStatus = settings?.statuses?.conversionsApi;
  const adsStatus = settings?.statuses?.adAccount;

  // Live funnel counts (zero fallback, never fake)
  const countPageView = stats.PageView || 0;
  const countViewContent = stats.ViewContent || 0;
  const countAddToCart = stats.AddToCart || 0;
  const countInitiateCheckout = stats.InitiateCheckout || 0;
  const countPurchase = stats.Purchase || 0;
  const totalCapturedEvents = Object.values(stats).reduce((a, b) => a + b, 0);

  // Conversion calculations
  const viewToCartRate = countViewContent > 0 ? ((countAddToCart / countViewContent) * 100).toFixed(1) : "0.0";
  const cartToPurchaseRate = countAddToCart > 0 ? ((countPurchase / countAddToCart) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6 max-w-7xl pb-24 text-stone-900 font-sans antialiased">
      {/* ── 1. Unified Meta Header ── */}
      <MetaNavigationHeader pixelId={pixelId} testEventCode={settings?.testEventCode} />

      {/* ── 2. Top Overview Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <span>Meta Ecosystem Telemetry</span>
            <span className="text-xs font-normal text-stone-500">
              (Live Status Across 5 Advertising Assets)
            </span>
          </h2>
          <p className="text-xs text-stone-500">
            Real-time synchronization across browser tracking, server Conversions API, catalog sync, and attribution audits.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchData()}
          disabled={refreshing}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-50 hover:border-stone-300 transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-stone-500 ${refreshing ? "animate-spin" : ""}`} />
          <span>{refreshing ? "Refreshing..." : "Refresh Live Data"}</span>
        </button>
      </div>

      {/* ── 3. 5 Meta Integration Asset Status Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* Asset 1: Browser Pixel */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-stone-300 transition">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Browser Pixel
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  pixelStatus?.state === "connected"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : pixelStatus?.state === "test-required" || pixelStatus?.state === "configured"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-stone-100 text-stone-600 border border-stone-200"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    pixelStatus?.state === "connected"
                      ? "bg-emerald-500 animate-pulse"
                      : pixelStatus?.state === "test-required"
                      ? "bg-amber-500"
                      : "bg-stone-400"
                  }`}
                />
                {pixelStatus?.label ? pixelStatus.label.toUpperCase() : (isPixelEnabled ? "TEST REQ" : "DISABLED")}
              </span>
            </div>

            <div>
              <div className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-blue-600" />
                <span>Client SDK</span>
              </div>
              <p className="text-[11px] text-stone-500 mt-1 leading-snug">
                {pixelStatus?.detail || (isPixelEnabled ? "Logging events on storefront" : "Configure Dataset ID to enable")}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 mt-3 flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-stone-700">
              {stats.total ?? totalCapturedEvents} events
            </span>
            <Link
              href="/admin/meta/pixel"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
            >
              <span>Manage</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Asset 2: Conversions API */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-stone-300 transition">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Server CAPI
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  capiStatus?.state === "connected"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : capiStatus?.state === "test-required" || capiStatus?.state === "configured"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : capiStatus?.state === "error"
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-stone-100 text-stone-600 border border-stone-200"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    capiStatus?.state === "connected"
                      ? "bg-emerald-500 animate-pulse"
                      : capiStatus?.state === "test-required"
                      ? "bg-amber-500"
                      : "bg-stone-400"
                  }`}
                />
                {capiStatus?.label ? capiStatus.label.toUpperCase() : (isCapiActive ? "TEST REQ" : "UNSET")}
              </span>
            </div>

            <div>
              <div className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <Server className="h-4 w-4 text-indigo-600" />
                <span>Graph API Gateway</span>
              </div>
              <p className="text-[11px] text-stone-500 mt-1 leading-snug">
                {capiStatus?.detail || (isCapiActive ? "Direct server-to-server dispatch" : "Requires Graph API CAPI token")}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 mt-3 flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-stone-700">
              {isCapiActive ? "SHA-256 Enabled" : "Not Configured"}
            </span>
            <Link
              href="/admin/meta/conversions-api"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
            >
              <span>Gateway</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Asset 3: Ad Attribution */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-stone-300 transition">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Marketing API
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  adsStatus?.state === "connected"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : adsStatus?.state === "test-required" || adsStatus?.state === "configured"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-stone-100 text-stone-600 border border-stone-200"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    adsStatus?.state === "connected"
                      ? "bg-emerald-500 animate-pulse"
                      : adsStatus?.state === "test-required"
                      ? "bg-amber-500"
                      : "bg-stone-400"
                  }`}
                />
                {adsStatus?.label ? adsStatus.label.toUpperCase() : (isAdsActive ? "AUTH REQ" : "SETUP REQ")}
              </span>
            </div>

            <div>
              <div className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-amber-600" />
                <span>Ads &amp; Attribution</span>
              </div>
              <p className="text-[11px] text-stone-500 mt-1 leading-snug">
                {adsStatus?.detail || (isAdsActive ? "Ad spend vs realized revenue" : "Connect Ad Account for insights")}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 mt-3 flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-stone-700">
              {isAdsActive ? settings?.adAccountId || "Linked" : "No Ad Account"}
            </span>
            <Link
              href="/admin/meta/ads"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900"
            >
              <span>Audit</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Asset 4: Catalog */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-stone-300 transition">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Commerce Catalog
              </span>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
                LIVE XML
              </span>
            </div>

            <div>
              <div className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4 text-purple-600" />
                <span>Product Feed</span>
              </div>
              <p className="text-[11px] text-stone-500 mt-1 leading-snug">
                Dynamic Product Ads RSS 2.0 feed
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 mt-3 flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-stone-700">
              {catalogCount !== null ? `${catalogCount} products` : "Syncing..."}
            </span>
            <Link
              href="/admin/meta/catalog"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-800"
            >
              <span>Feed URL</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Asset 5: Domain Verification */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-stone-300 transition">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Domain &amp; AEM
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  domainVerified === true
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    domainVerified === true ? "bg-emerald-500" : "bg-amber-400"
                  }`}
                />
                {domainVerified === true ? "VERIFIED" : "CHECK PENDING"}
              </span>
            </div>

            <div>
              <div className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-emerald-600" />
                <span>angkon.com.bd</span>
              </div>
              <p className="text-[11px] text-stone-500 mt-1 leading-snug">
                {domainVerified === true
                  ? "Meta DNS TXT / Meta tag verified"
                  : "Meta tag injected into <head>"}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 mt-3 flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-stone-700">
              8-Event AEM
            </span>
            <Link
              href="/admin/meta/domain-verification"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-800"
            >
              <span>Verify</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── 4. Genuine Funnel Telemetry Breakdown ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-stone-100">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <span>Full E-Commerce Conversion Funnel Telemetry</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Live aggregated counts for core conversion steps logged in your local telemetry database.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="font-mono text-stone-500">
              Total Recorded: <strong className="text-stone-900">{totalCapturedEvents}</strong>
            </span>
          </div>
        </div>

        {totalCapturedEvents === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 p-8 text-center space-y-3">
            <div className="h-10 w-10 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-800">No telemetry events recorded yet</p>
              <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
                Browse the storefront or launch in test mode to fire PageView, ViewContent, AddToCart, InitiateCheckout, and Purchase events.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/admin/meta/pixel"
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                <span>Open Events Manager &amp; Simulator</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Step 1: PageView */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
              <div className="flex items-center justify-between text-blue-800 text-xs font-bold mb-1">
                <span>1. PageView</span>
                <Eye className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-stone-900">{countPageView}</div>
              <div className="text-[11px] text-stone-500 mt-0.5">Top-of-Funnel Visits</div>
              <div className="text-[10px] font-bold text-blue-700 mt-2">100% Traffic Base</div>
            </div>

            {/* Step 2: ViewContent */}
            <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4">
              <div className="flex items-center justify-between text-purple-800 text-xs font-bold mb-1">
                <span>2. ViewContent</span>
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              </div>
              <div className="text-2xl font-black text-stone-900">{countViewContent}</div>
              <div className="text-[11px] text-stone-500 mt-0.5">Product Details Viewed</div>
              <div className="text-[10px] font-bold text-purple-700 mt-2">DPA Catalog Signal</div>
            </div>

            {/* Step 3: AddToCart */}
            <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
              <div className="flex items-center justify-between text-amber-800 text-xs font-bold mb-1">
                <span>3. AddToCart</span>
                <ShoppingBag className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-stone-900">{countAddToCart}</div>
              <div className="text-[11px] text-stone-500 mt-0.5">Cart Additions</div>
              <div className="text-[10px] font-bold text-amber-700 mt-2">
                {viewToCartRate}% View-to-Cart
              </div>
            </div>

            {/* Step 4: InitiateCheckout */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
              <div className="flex items-center justify-between text-indigo-800 text-xs font-bold mb-1">
                <span>4. Checkout</span>
                <ShoppingCart className="h-3.5 w-3.5 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-stone-900">{countInitiateCheckout}</div>
              <div className="text-[11px] text-stone-500 mt-0.5">Initiate Checkout</div>
              <div className="text-[10px] font-bold text-indigo-700 mt-2">Funnel Mid-Stage</div>
            </div>

            {/* Step 5: Purchase */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
              <div className="flex items-center justify-between text-emerald-800 text-xs font-bold mb-1">
                <span>5. Purchase</span>
                <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700">{countPurchase}</div>
              <div className="text-[11px] text-stone-500 mt-0.5">Confirmed Orders</div>
              <div className="text-[10px] font-bold text-emerald-700 mt-2">
                {cartToPurchaseRate}% Cart-to-Buy
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 5. Specialized Meta Sub-Tools Navigator ── */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
          Meta Suite Modules &amp; Documentation
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tool 1: Events Manager */}
          <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 transition">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900">Events Manager</h4>
                  <span className="text-[11px] text-stone-500">Live Telemetry &amp; Diagnostics</span>
                </div>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed pt-1">
                Inspect raw event payloads, browser vs server deduplication status, error codes, and run live interactive test simulations.
              </p>
            </div>
            <div className="pt-4 mt-2 border-t border-stone-100">
              <Link
                href="/admin/meta/pixel"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                <span>Open Events Manager</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Tool 2: Conversions API */}
          <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                  <Server className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900">Conversions API (CAPI) Gateway</h4>
                  <span className="text-[11px] text-stone-500">Server-Side Tracking</span>
                </div>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed pt-1">
                Bypass ad-blockers and iOS privacy restrictions with server-to-server sync. Includes SHA-256 customer data hashing and token encryption.
              </p>
            </div>
            <div className="pt-4 mt-2 border-t border-stone-100">
              <Link
                href="/admin/meta/conversions-api"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                <span>Configure CAPI Gateway</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Tool 3: Ads & Attribution */}
          <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-amber-300 transition">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900">Ads &amp; Attribution Audit</h4>
                  <span className="text-[11px] text-stone-500">Marketing API &amp; ROAS</span>
                </div>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed pt-1">
                Connect your Meta Ad Account to compare platform-attributed revenue against actual realized store cash, net of cancellations and refunds.
              </p>
            </div>
            <div className="pt-4 mt-2 border-t border-stone-100">
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
          <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-purple-300 transition">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900">Catalog Feed &amp; Domain Priority</h4>
                  <span className="text-[11px] text-stone-500">Commerce &amp; AEM Setup</span>
                </div>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed pt-1">
                Access your live XML product feed for Facebook &amp; Instagram Shops, verify your domain with Meta, and configure 8-event AEM priority.
              </p>
            </div>
            <div className="pt-4 mt-2 border-t border-stone-100 flex items-center gap-4">
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
    </div>
  );
}
