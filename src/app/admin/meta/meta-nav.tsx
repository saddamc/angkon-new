"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Layers,
  ShoppingBag,
  Globe,
  Server,
  ExternalLink,
  PlayCircle,
  Copy,
  Check,
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

export const META_NAV_TABS = [
  {
    href: "/admin/meta",
    label: "Overview",
    description: "Suite Health & KPIs",
    icon: Layers,
    exact: true,
  },
  {
    href: "/admin/meta/pixel",
    label: "Events Manager",
    description: "Browser & Server Stream",
    icon: Activity,
  },
  {
    href: "/admin/meta/conversions-api",
    label: "Conversions API",
    description: "Server CAPI Gateway",
    icon: Server,
  },
  {
    href: "/admin/meta/ads",
    label: "Ads & Attribution",
    description: "Spend & Real ROAS Audit",
    icon: BarChart3,
  },
  {
    href: "/admin/meta/catalog",
    label: "Catalog Feed",
    description: "Dynamic Ads XML Feed",
    icon: ShoppingBag,
  },
  {
    href: "/admin/meta/domain-verification",
    label: "Domain Verification",
    description: "DNS & AEM Priority",
    icon: Globe,
  },
];

export function MetaNavigationHeader({
  pixelId = "",
  testEventCode = "",
}: {
  pixelId?: string;
  testEventCode?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const isTabActive = (tab: (typeof META_NAV_TABS)[number]) =>
    tab.exact
      ? pathname === tab.href
      : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

  const activeTab = META_NAV_TABS.find(isTabActive) || META_NAV_TABS[0];

  const handleCopyId = () => {
    if (!pixelId) return;
    void navigator.clipboard.writeText(pixelId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const launchTestUrl = `/?test_event_code=${encodeURIComponent(testEventCode || "TEST_DEBUG")}`;
  const isConnected = Boolean(pixelId && pixelId.trim().length >= 8);

  return (
    <header className="space-y-4">
      {/* ── Top Executive Meta Suite Banner ── */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-6 shadow-xs transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* Left: Suite Identity & Status */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Activity className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                  Meta Business &amp; Marketing Suite
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200/70 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                  <ShieldCheck className="h-3 w-3 text-blue-600" />
                  Official API v22.0
                </span>
                {testEventCode && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 animate-pulse">
                    <AlertTriangle className="h-3 w-3 text-amber-600" />
                    Test Mode: {testEventCode}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                <span className="inline-flex items-center gap-1.5 font-medium text-stone-700">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                    }`}
                  />
                  Maison ANGKON Dataset
                </span>
                <span className="text-stone-300">•</span>
                <span className="font-mono text-stone-600 inline-flex items-center gap-1 bg-stone-50 border border-stone-200/60 px-2 py-0.5 rounded-md">
                  {isConnected ? `ID: ${pixelId}` : "Not Configured (Disabled)"}
                  {isConnected && (
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="p-0.5 hover:text-stone-900 transition rounded hover:bg-stone-200/50 cursor-pointer"
                      title="Copy Dataset ID"
                      aria-label="Copy Dataset ID"
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3 text-stone-400" />
                      )}
                    </button>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Global Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={
                isConnected
                  ? `https://adsmanager.facebook.com/events_manager2/list/dataset/${pixelId}`
                  : "https://adsmanager.facebook.com/events_manager2"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-2xs transition hover:bg-stone-50 hover:border-stone-300 cursor-pointer"
            >
              <span>Meta Events Manager</span>
              <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
            </a>

            <a
              href={launchTestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-blue-700 active:scale-[0.98] cursor-pointer"
            >
              <PlayCircle className="h-3.5 w-3.5" />
              <span>Launch Store in Test Mode</span>
            </a>
          </div>
        </div>
      </div>

      {/* ── Meta Suite Sub-Routes: one row on large desktops, 3×2 on tablets, selector on mobile ── */}
      <div className="relative min-w-0 border-b border-stone-200/80">
        <nav
          aria-label="Meta Suite sections"
          className="hidden min-w-0 grid-cols-3 gap-1 pb-px md:grid xl:flex xl:items-center xl:gap-1.5"
        >
          {META_NAV_TABS.map((tab) => {
            const isActive = isTabActive(tab);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                title={tab.description}
                aria-current={isActive ? "page" : undefined}
                className={`group relative inline-flex min-w-0 items-center justify-center gap-2 rounded-t-xl px-2.5 py-2.5 text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 xl:justify-start xl:px-3.5 ${
                  isActive
                    ? "-mb-[1px] border-b-2 border-blue-600 bg-blue-50/70 font-bold text-blue-600"
                    : "-mb-[1px] border-b-2 border-transparent font-medium text-stone-600 hover:bg-stone-50/80 hover:text-stone-900"
                }`}
              >
                <Icon
                  aria-hidden="true"
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive ? "text-blue-600" : "text-stone-400 group-hover:text-stone-600"
                  }`}
                />
                <span className="truncate">{tab.label}</span>
                <span className="sr-only"> — {tab.description}</span>
              </Link>
            );
          })}
        </nav>

        <div className="py-2 md:hidden">
          <label
            htmlFor="meta-suite-route"
            className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-stone-500"
          >
            Meta Suite section
          </label>
          <div className="relative">
            <select
              id="meta-suite-route"
              aria-label="Choose a Meta Suite section"
              value={activeTab.href}
              onChange={(event) => router.push(event.target.value)}
              className="w-full appearance-none rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 pr-10 text-sm font-semibold text-stone-800 shadow-2xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            >
              {META_NAV_TABS.map((tab) => (
                <option key={tab.href} value={tab.href}>
                  {tab.label}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
