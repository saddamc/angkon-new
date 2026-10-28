"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { useState } from "react";

const META_NAV_TABS = [
  {
    href: "/admin/meta",
    label: "Meta Suite Overview",
    icon: Layers,
    exact: true,
    badge: "Hub",
  },
  {
    href: "/admin/meta/pixel",
    label: "Pixel & Events Manager",
    icon: Activity,
    badge: "Active",
  },
  {
    href: "/admin/meta/catalog",
    label: "Commerce Catalog Feed",
    icon: ShoppingBag,
    badge: "Dynamic Ads",
  },
  {
    href: "/admin/meta/domain-verification",
    label: "Domain & AEM Priority",
    icon: Globe,
    badge: "iOS 14.5+",
  },
  {
    href: "/admin/meta/conversions-api",
    label: "Conversions API (CAPI)",
    icon: Server,
    badge: "Server-Side",
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
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    if (!pixelId) return;
    void navigator.clipboard.writeText(pixelId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const launchTestUrl = `/?test_event_code=${encodeURIComponent(testEventCode || "TEST_DEBUG")}`;

  return (
    <div className="space-y-4">
      {/* ── Top Meta Suite Banner ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Meta Business &amp; Marketing Suite</h1>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
                Official SDK v2.0
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-[13px] text-stone-500">
              <span className="flex items-center gap-1.5 font-medium text-stone-700">
                <span
                  className={`h-2 w-2 rounded-full ${
                    pixelId ? "bg-emerald-500 animate-pulse" : "bg-stone-400"
                  }`}
                />
                Maison ANGKON Dataset
              </span>
              <span>•</span>
              <span className="font-mono text-stone-600 flex items-center gap-1">
                {pixelId ? `ID: ${pixelId}` : "Not Configured (Disabled)"}
                {pixelId && (
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="p-1 hover:text-stone-900 transition"
                    title="Copy Pixel Dataset ID"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Global Action Header Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`https://adsmanager.facebook.com/events_manager2/list/dataset/${pixelId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50 hover:border-stone-300"
          >
            <span>Facebook Ads Manager</span>
            <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
          </a>

          <a
            href={launchTestUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <PlayCircle className="h-4 w-4" />
            <span>Launch Store in Test Mode</span>
          </a>
        </div>
      </div>

      {/* ── Meta Suite Sub-Routes Tab Bar ── */}
      <div className="flex border-b border-stone-200 gap-1 overflow-x-auto pb-px">
        {META_NAV_TABS.map((tab) => {
          const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                isActive
                  ? "border-blue-600 text-blue-600 bg-blue-50/40 rounded-t-lg"
                  : "border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-50"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  isActive ? "bg-blue-100 text-blue-800" : "bg-stone-100 text-stone-500"
                }`}
              >
                {tab.badge}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
