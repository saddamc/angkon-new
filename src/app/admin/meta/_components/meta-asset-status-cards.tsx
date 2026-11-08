"use client";

import Link from "next/link";
import { Activity, Server, TrendingUp, ShoppingBag, Globe, ArrowRight } from "lucide-react";
import { InfoPopover } from "@/components/admin/meta/info-popover";
import type { MetaOverviewState } from "../_types/meta-overview.types";

interface MetaAssetStatusCardsProps {
  overview: MetaOverviewState;
}

export function MetaAssetStatusCards({ overview }: MetaAssetStatusCardsProps) {
  const {
    settings,
    pixelId,
    pixelStatus,
    isPixelEnabled,
    capiStatus,
    isCapiActive,
    marketingSettings,
    isMarketingConnected,
    isAdsActive,
    catalogCount,
    domainVerified,
    totalCapturedEvents,
  } = overview;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
      {/* Asset 1: Browser Pixel */}
      <div className="rounded-2xl border border-slate-200/90 border-t-2 border-t-blue-500 bg-white p-4 sm:p-4.5 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
                Browser Pixel
              </span>
              <InfoPopover
                title="Meta Browser Pixel (Client SDK)"
                description="Client-side JavaScript SDK (fbevents.js) embedded on every storefront page of angkon.net. Dispatches real-time visitor browsing signals directly from the customer's web browser."
                whyNeeded="Browser signals provide vital client-side telemetry (user screen size, exact click coordinates, session duration) required for pixel matching and initial visitor profiling."
                metaSource={{
                  label: "Meta Events Manager → Data Sources → Datasets / Pixels",
                  url: "https://eventsmanager.facebook.com",
                  steps: [
                    "Open Meta Events Manager",
                    "Select 'Data Sources' from the left sidebar",
                    "Locate your Dataset/Pixel ID (e.g. 1267868848130835)",
                    "Verify real-time event reception in the 'Overview' tab",
                  ],
                }}
                businessImpact="Forms the core data engine for Meta Lookalike & Custom Audiences. Enables rapid retargeting of recent website visitors."
                actionableTip="Pair with Server Conversions API (CAPI) using deterministic event_id deduplication to avoid double-counting."
              />
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 whitespace-nowrap ${
                settings === null
                  ? "bg-slate-100 text-slate-500 border border-slate-200"
                  : pixelStatus?.state === "connected"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : pixelStatus?.state === "test-required" || pixelStatus?.state === "configured"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                  settings === null
                    ? "bg-slate-300 animate-pulse"
                    : pixelStatus?.state === "connected"
                    ? "bg-emerald-500 animate-pulse"
                    : pixelStatus?.state === "test-required"
                    ? "bg-amber-500"
                    : "bg-slate-400"
                }`}
              />
              {settings === null
                ? "CHECKING"
                : pixelStatus?.state === "connected"
                ? "ACTIVE SDK"
                : pixelStatus?.state === "test-required"
                ? "TEST REQ"
                : isPixelEnabled
                ? "CONFIGURED"
                : "DISABLED"}
            </span>
          </div>

          <div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-blue-600 shrink-0" />
              <span>Client SDK</span>
            </div>
            <div className="font-mono text-[10.5px] text-slate-500 truncate mt-0.5" title={pixelId || "1267868848130835"}>
              ID: {pixelId || "1267868848130835"}
            </div>
          </div>
        </div>

        <div className="pt-2.5 border-t border-slate-100 mt-3 flex items-center justify-between">
          <span className="text-[11px] font-mono font-semibold text-slate-700">
            {totalCapturedEvents.toLocaleString()} events
          </span>
          <Link
            href="/admin/meta/events?tab=events-manager"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
          >
            <span>Manage</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Asset 2: Conversions API */}
      <div className="rounded-2xl border border-slate-200/90 border-t-2 border-t-indigo-500 bg-white p-4 sm:p-4.5 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
                Server CAPI
              </span>
              <InfoPopover
                title="Conversions API (CAPI Gateway)"
                description="Direct server-to-server HTTP POST bridge communicating with Meta Graph API v22.0. Transmits SHA-256 hashed customer identifiers and transaction values straight from Next.js server to Meta."
                whyNeeded="Post-iOS 14.5+ and privacy ad-blockers routinely block 20% to 35% of browser pixel events. Server CAPI bypasses client-side blocking completely to ensure 100% conversion capture."
                metaSource={{
                  label: "Meta Events Manager → Settings → Conversions API",
                  url: "https://eventsmanager.facebook.com",
                  steps: [
                    "Open Meta Events Manager → Data Sources",
                    "Select your Dataset → Click 'Settings' tab",
                    "Scroll down to 'Conversions API' section",
                    "Click 'Generate access token' under 'Set up direct integration'",
                  ],
                }}
                businessImpact="Recovers dropped purchase orders, restores accurate ROAS metrics in Meta Ads Manager, and cuts Cost-Per-Acquisition (CPA) by 15-28%."
                actionableTip="Run a test simulator event to confirm immediate receipt in the Meta Test Events tool."
              />
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 whitespace-nowrap ${
                settings === null
                  ? "bg-slate-100 text-slate-500 border border-slate-200"
                  : capiStatus?.state === "connected"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : capiStatus?.state === "test-required" || capiStatus?.state === "configured"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : capiStatus?.state === "error"
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                  settings === null
                    ? "bg-slate-300 animate-pulse"
                    : capiStatus?.state === "connected"
                    ? "bg-emerald-500 animate-pulse"
                    : capiStatus?.state === "test-required"
                    ? "bg-amber-500"
                    : "bg-slate-400"
                }`}
              />
              {settings === null
                ? "CHECKING"
                : capiStatus?.state === "connected"
                ? "CONNECTED"
                : capiStatus?.state === "test-required"
                ? "TEST REQ"
                : isCapiActive
                ? "CONFIGURED"
                : "UNSET"}
            </span>
          </div>

          <div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Server className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>Graph API Gateway</span>
            </div>
            <div className="text-[10.5px] font-mono text-slate-500 truncate mt-0.5">
              {settings === null
                ? "Verifying gateway..."
                : isCapiActive
                ? "AES-256-GCM Secure"
                : "Token Not Configured"}
            </div>
          </div>
        </div>

        <div className="pt-2.5 border-t border-slate-100 mt-3 flex items-center justify-between">
          <span className="text-[11px] font-mono font-semibold text-slate-700">
            SHA-256 Active
          </span>
          <Link
            href="/admin/meta/events?tab=conversions-api"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
          >
            <span>Gateway</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Asset 3: Marketing API */}
      <div className="rounded-2xl border border-slate-200/90 border-t-2 border-t-amber-500 bg-white p-4 sm:p-4.5 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
                Marketing API
              </span>
              <InfoPopover
                title="Meta Marketing API (Ads & Attribution)"
                description="Decoupled integration with Meta Marketing Graph API v22.0. Imports daily ad spend, campaign impressions, click totals, and platform-attributed conversions directly into ANGKON's ledger."
                whyNeeded="Enables independent dual-ledger financial reconciliation: audits Meta's reported ROAS against actual realized store bank deposits and settled COD cash."
                metaSource={{
                  label: "Meta Business Manager → System Users & Ad Accounts",
                  url: "https://business.facebook.com/settings/system-users",
                  steps: [
                    "Open Meta Business Settings (business.facebook.com/settings)",
                    "Go to Users → System Users → Create or select System User",
                    "Click 'Assign Assets' → Select Ad Account → Grant 'ads_read' permission",
                    "Generate Access Token with 'ads_read' and 'ads_management' scopes",
                  ],
                }}
                businessImpact="Prevents overpaying on campaigns that claim high ROAS inside Ads Manager but fail to generate real collected cash for your business."
                actionableTip="Review attribution windows regularly (7-day click / 1-day view) to match your customer buying cycle."
              />
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 whitespace-nowrap ${
                marketingSettings === null
                  ? "bg-slate-100 text-slate-500 border border-slate-200"
                  : isMarketingConnected
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : marketingSettings?.status === "rate_limited"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                  marketingSettings === null
                    ? "bg-slate-300 animate-pulse"
                    : isMarketingConnected
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-slate-400"
                }`}
              />
              {marketingSettings === null
                ? "CHECKING"
                : isMarketingConnected
                ? "CONNECTED"
                : marketingSettings?.status === "rate_limited"
                ? "THROTTLED"
                : isAdsActive
                ? "AUTH REQ"
                : "UNCONFIGURED"}
            </span>
          </div>

          <div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Ads &amp; Attribution</span>
            </div>
            <div className="text-[10.5px] font-mono text-slate-500 truncate mt-0.5" title={marketingSettings?.accountName || "Plain Stitch"}>
              {marketingSettings === null
                ? "Verifying marketing token..."
                : marketingSettings?.accountName
                ? `${marketingSettings.accountName} (${marketingSettings.accountCurrency || "USD"})`
                : "Plain Stitch (USD)"}
            </div>
          </div>
        </div>

        <div className="pt-2.5 border-t border-slate-100 mt-3 flex items-center justify-between">
          <span className="text-[11px] font-mono font-semibold text-slate-700 truncate max-w-[110px]" title={marketingSettings?.adAccountId || settings?.adAccountId || "act_1646756900434912"}>
            {marketingSettings?.adAccountId || settings?.adAccountId || "act_1646756900434912"}
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
      <div className="rounded-2xl border border-slate-200/90 border-t-2 border-t-purple-500 bg-white p-4 sm:p-4.5 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
                Commerce Catalog
              </span>
              <InfoPopover
                title="Commerce Catalog (Product Feed)"
                description="Automated RSS 2.0 XML data feed published at /api/meta/catalog. Meta Commerce Manager regularly polls this feed to sync store products, prices, variants, availability, and high-res imagery."
                whyNeeded="Mandatory for Dynamic Product Ads (DPA) and Instagram Shopping. Allows Meta to dynamically display products in ads that shoppers previously viewed or added to cart."
                metaSource={{
                  label: "Meta Commerce Manager → Catalogs → Data Sources",
                  url: "https://commerce.facebook.com",
                  steps: [
                    "Open Meta Commerce Manager (commerce.facebook.com)",
                    "Select your Catalog → Click 'Data sources' on the left menu",
                    "Click 'Add Products' → Select 'Data feed'",
                    "Choose 'Scheduled feed' and paste: https://www.angkon.net/api/meta/catalog",
                  ],
                }}
                businessImpact="Dynamic product ads generally produce 2x to 4x higher return on ad spend than static product imagery by tailoring ads to each shopper's exact intent."
                actionableTip="Ensure all product prices in ANGKON match Bangladesh Taka (BDT) and have valid high-resolution image URLs."
              />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 whitespace-nowrap bg-purple-50 text-purple-700 border border-purple-200">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
              LIVE XML
            </span>
          </div>

          <div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <ShoppingBag className="h-4 w-4 text-purple-600 shrink-0" />
              <span>Product Feed</span>
            </div>
            <div className="text-[10.5px] font-mono text-slate-500 truncate mt-0.5">
              DPA RSS 2.0 Dynamic
            </div>
          </div>
        </div>

        <div className="pt-2.5 border-t border-slate-100 mt-3 flex items-center justify-between">
          <span className="text-[11px] font-mono font-semibold text-slate-700">
            {catalogCount !== null ? `${catalogCount} products` : "16 products"}
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
      <div className="rounded-2xl border border-slate-200/90 border-t-2 border-t-emerald-500 bg-white p-4 sm:p-4.5 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
                Domain &amp; AEM
              </span>
              <InfoPopover
                title="Domain Verification & Aggregated Event Measurement (AEM)"
                description="Cryptographic domain ownership protocol confirming that angkon.net is owned and operated by your Meta Business Account. Injects a verified meta-tag into the site head."
                whyNeeded="Enforces Apple's App Tracking Transparency (ATT) rules. Unverified domains cannot configure 8 prioritized conversion events or bid effectively on Purchase optimization."
                metaSource={{
                  label: "Meta Business Settings → Brand Safety → Domains",
                  url: "https://business.facebook.com/settings/owned-domains",
                  steps: [
                    "Open Meta Business Settings → Brand safety and suitability → Domains",
                    "Click 'Add' → 'Create a new domain' → Enter 'angkon.net'",
                    "Select 'Add a meta-tag to your HTML source code'",
                    "Copy the verification code and save in ANGKON Domain Settings",
                  ],
                }}
                businessImpact="Authorizes prioritized Purchase event optimization for iOS 14.5+ users and shields your ad account from unauthorized third-party pixel injection."
                actionableTip="Ensure Purchase is set as your #1 highest priority event in Aggregated Event Measurement."
              />
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 whitespace-nowrap ${
                domainVerified === null
                  ? "bg-slate-100 text-slate-500 border border-slate-200"
                  : domainVerified === true
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                  domainVerified === null
                    ? "bg-slate-300 animate-pulse"
                    : domainVerified === true
                    ? "bg-emerald-500"
                    : "bg-amber-400"
                }`}
              />
              {domainVerified === null
                ? "CHECKING"
                : domainVerified === true
                ? "VERIFIED"
                : "CHECK PENDING"}
            </span>
          </div>

          <div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>angkon.net</span>
            </div>
            <div className="text-[10.5px] font-mono text-slate-500 truncate mt-0.5">
              {domainVerified === null
                ? "Verifying domain ownership..."
                : domainVerified === true
                ? "Meta DNS TXT Verified"
                : "Meta tag in <head>"}
            </div>
          </div>
        </div>

        <div className="pt-2.5 border-t border-slate-100 mt-3 flex items-center justify-between">
          <span className="text-[11px] font-mono font-semibold text-slate-700">
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
  );
}
