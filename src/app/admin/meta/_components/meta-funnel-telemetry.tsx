"use client";

import Link from "next/link";
import { Activity, PlayCircle } from "lucide-react";
import { InfoPopover } from "@/components/admin/meta/info-popover";
import type { MetaOverviewState } from "../_types/meta-overview.types";

interface MetaFunnelTelemetryProps {
  overview: MetaOverviewState;
}

export function MetaFunnelTelemetry({ overview }: MetaFunnelTelemetryProps) {
  const {
    totalCapturedEvents,
    countPageView,
    countViewContent,
    countAddToCart,
    countInitiateCheckout,
    countPurchase,
    viewToCartRate,
    cartToPurchaseRate,
  } = overview;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600" />
            <span>Full E-Commerce Conversion Funnel Telemetry</span>
            <InfoPopover
              title="E-Commerce Conversion Funnel Telemetry"
              description="Real-time multi-stage telemetry pipeline capturing the complete shopper journey from top-of-funnel discovery to bottom-of-funnel purchase on angkon.net. Logged concurrently to your local database and dispatched via Browser Pixel + Server CAPI."
              whyNeeded="Meta's machine learning requires high-fidelity event volume at every funnel stage to calibrate target CPA, predict customer purchase probability, and power Advantage+ catalog retargeting."
              metaSource={{
                label: "Meta Events Manager → Data Sources → Overview",
                url: "https://eventsmanager.facebook.com",
                steps: [
                  "Open Meta Events Manager",
                  "Select Dataset → View real-time event distribution graph",
                  "Verify event volume drop-off ratios between ViewContent and Purchase",
                ],
              }}
              businessImpact="Maximizes return on ad spend (ROAS) and powers retargeting sequences tailored to where the customer dropped off."
              actionableTip="Aim for a ViewContent-to-AddToCart rate above 8% and Cart-to-Purchase rate above 20%."
              align="left"
              iconSize="sm"
            />
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Live aggregated counts matching Meta Events Manager (Dual Channel: Browser SDK + Server CAPI).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200/70 font-semibold font-mono text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
            Total Logged: <strong>{totalCapturedEvents.toLocaleString()}</strong> events
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium text-[11px]">
            28-Day Rolling Window
          </span>
        </div>
      </div>

      {totalCapturedEvents === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-3">
          <div className="h-10 w-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">No telemetry events recorded yet</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Browse the storefront or launch in test mode to fire PageView, ViewContent, AddToCart, InitiateCheckout, and Purchase events.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/admin/meta/events?tab=diagnostics"
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
          <div className="rounded-xl border border-blue-200/80 bg-gradient-to-b from-blue-50/60 to-white p-4 flex flex-col justify-between shadow-2xs hover:border-blue-300 transition">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-blue-900">1. PageView</span>
                  <InfoPopover
                    title="1. PageView Event"
                    description="Fired immediately on storefront page load across desktop and mobile devices. Registers raw visit traffic, URL path, and referral source."
                    whyNeeded="Provides the baseline traffic denominator for your funnel conversion rates and captures initial visitor attribution tags (fbp, fbc)."
                    metaSource={{
                      label: "Events Manager → Overview → PageView Event",
                      url: "https://eventsmanager.facebook.com",
                    }}
                    businessImpact="Enables wide-net retargeting of all store visitors within custom 30, 60, or 180-day retention windows."
                    actionableTip="Ensure PageView triggers without delay on the initial root layout render."
                    align="left"
                    iconSize="xs"
                  />
                </div>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100/80 text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Active
                </span>
              </div>

              <div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {countPageView.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">Top-of-Funnel Visits</div>
              </div>

              {/* Funnel Retention Bar */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] font-semibold text-blue-700">
                  <span>Funnel Baseline</span>
                  <span>100%</span>
                </div>
                <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full w-full" />
                </div>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
              <span className="font-semibold text-slate-600">EMQ: 6.1/10</span>
              <span className="text-slate-400">Multiple</span>
            </div>
          </div>

          {/* Step 2: ViewContent */}
          <div className="rounded-xl border border-purple-200/80 bg-gradient-to-b from-purple-50/60 to-white p-4 flex flex-col justify-between shadow-2xs hover:border-purple-300 transition">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-purple-900">2. ViewContent</span>
                  <InfoPopover
                    title="2. ViewContent Event"
                    description="Fired whenever a customer views a specific product details page. Passes product SKU/ID, title, category, and price in BDT."
                    whyNeeded="Directly pairs storefront shopper browsing with your Meta Commerce Catalog items for Dynamic Product Ads (DPA)."
                    metaSource={{
                      label: "Events Manager → Test Events → ViewContent",
                      url: "https://eventsmanager.facebook.com",
                    }}
                    businessImpact="Powers Advantage+ Catalog Ads: Meta automatically re-engages shoppers on Facebook/Instagram showing the exact sarees or jewelry they browsed."
                    actionableTip="Ensure content_ids sent match the product IDs in your /api/meta/catalog RSS feed."
                    align="left"
                    iconSize="xs"
                  />
                </div>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100/80 text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Active
                </span>
              </div>

              <div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {countViewContent.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">Product Details Viewed</div>
              </div>

              {/* Funnel Retention Bar */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] font-semibold text-purple-700">
                  <span>Visitor Retention</span>
                  <span>{countPageView > 0 ? ((countViewContent / countPageView) * 100).toFixed(1) : 0}%</span>
                </div>
                <div className="h-1.5 w-full bg-purple-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, countPageView > 0 ? (countViewContent / countPageView) * 100 : 0)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
              <span className="font-semibold text-slate-600">EMQ: 6.1/10</span>
              <span className="text-purple-700 font-semibold">DPA Signal</span>
            </div>
          </div>

          {/* Step 3: AddToCart */}
          <div className="rounded-xl border border-amber-200/80 bg-gradient-to-b from-amber-50/60 to-white p-4 flex flex-col justify-between shadow-2xs hover:border-amber-300 transition">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-amber-900">3. AddToCart</span>
                  <InfoPopover
                    title="3. AddToCart Event"
                    description="Fired whenever an item is added to the customer's cart, carrying product ID, quantity, and item monetary value."
                    whyNeeded="Crucial high-intent shopping signal. Allows you to identify cart abandonment before the final checkout step."
                    metaSource={{
                      label: "Events Manager → Overview → AddToCart",
                      url: "https://eventsmanager.facebook.com",
                    }}
                    businessImpact="Create high-ROI Abandoned Cart retargeting campaigns on Instagram and Facebook with special promo codes or urgency messaging."
                    actionableTip="Monitor ViewContent-to-AddToCart drop-off to test product pricing, gallery photos, and size/color selector clarity."
                    align="left"
                    iconSize="xs"
                  />
                </div>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100/80 text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Active
                </span>
              </div>

              <div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {countAddToCart.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">Cart Additions</div>
              </div>

              {/* Funnel Retention Bar */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] font-semibold text-amber-700">
                  <span>View-to-Cart</span>
                  <span>{viewToCartRate}%</span>
                </div>
                <div className="h-1.5 w-full bg-amber-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, parseFloat(viewToCartRate))}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
              <span className="font-semibold text-slate-600">EMQ: 4.4/10</span>
              <span className="text-slate-400">Multiple</span>
            </div>
          </div>

          {/* Step 4: InitiateCheckout */}
          <div className="rounded-xl border border-indigo-200/80 bg-gradient-to-b from-indigo-50/60 to-white p-4 flex flex-col justify-between shadow-2xs hover:border-indigo-300 transition">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-indigo-900">4. InitiateCheckout</span>
                  <InfoPopover
                    title="4. InitiateCheckout Event"
                    description="Fired when the customer opens the checkout drawer or begins filling in their recipient name, delivery address, and payment method."
                    whyNeeded="Measures deep funnel intent right before payment. Highlights any friction in address selection or delivery options."
                    metaSource={{
                      label: "Events Manager → Overview → InitiateCheckout",
                      url: "https://eventsmanager.facebook.com",
                    }}
                    businessImpact="Identifies high-value shoppers who were one step away from purchasing, enabling timely WhatsApp/SMS/Meta retargeting."
                    actionableTip="Ensure both browser and server CAPI fire identical event_id values to prevent duplicate checkout counts."
                    align="right"
                    iconSize="xs"
                  />
                </div>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100/80 text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Active
                </span>
              </div>

              <div>
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  {countInitiateCheckout.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">Checkout Initiated</div>
              </div>

              {/* Funnel Retention Bar */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] font-semibold text-indigo-700">
                  <span>Cart-to-Checkout</span>
                  <span>{countAddToCart > 0 ? ((countInitiateCheckout / countAddToCart) * 100).toFixed(1) : 0}%</span>
                </div>
                <div className="h-1.5 w-full bg-indigo-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, countAddToCart > 0 ? (countInitiateCheckout / countAddToCart) * 100 : 0)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
              <span className="font-semibold text-slate-600">EMQ: 6.7/10</span>
              <span className="text-slate-400">Multiple</span>
            </div>
          </div>

          {/* Step 5: Purchase */}
          <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/60 to-white p-4 flex flex-col justify-between shadow-2xs hover:border-emerald-300 transition">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-emerald-900">5. Purchase</span>
                  <InfoPopover
                    title="5. Purchase Event"
                    description="Fired upon confirmed order placement (SSLCommerz payment success or verified Cash on Delivery order creation). Dispatches order ID, revenue, currency, and hashed customer credentials."
                    whyNeeded="The single most valuable conversion signal. Trains Meta's Advantage+ algorithm to locate high-propensity buyers."
                    metaSource={{
                      label: "Events Manager → Overview → Purchase",
                      url: "https://eventsmanager.facebook.com",
                    }}
                    businessImpact="Directly fuels campaign ROAS bidding. Always dispatched from Next.js server via CAPI upon order confirmation to capture 100% of sales even if user exits before redirect."
                    actionableTip="Prioritize Purchase as the #1 event in your Aggregated Event Measurement (AEM) configuration."
                    align="right"
                    iconSize="xs"
                  />
                </div>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100/80 text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Active
                </span>
              </div>

              <div>
                <div className="text-2xl font-black text-emerald-700 tracking-tight">
                  {countPurchase.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">Confirmed Orders</div>
              </div>

              {/* Funnel Retention Bar */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] font-semibold text-emerald-700">
                  <span>Cart-to-Buy</span>
                  <span>{cartToPurchaseRate}%</span>
                </div>
                <div className="h-1.5 w-full bg-emerald-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, parseFloat(cartToPurchaseRate))}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
              <span className="font-semibold text-slate-600">EMQ: 7.3/10</span>
              <span className="text-emerald-700 font-bold">2 ad sets</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
