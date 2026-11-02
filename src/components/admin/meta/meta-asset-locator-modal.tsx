"use client";

import { useState } from "react";
import {
  X,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Activity,
  BarChart3,
  ShoppingBag,
  Globe,
  KeyRound,
  Info,
  CheckCircle2,
} from "lucide-react";

export interface MetaAssetGuide {
  id: string;
  name: string;
  metaSection: string;
  directUrl: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  steps: string[];
  permissions?: string[];
  whyNeeded: string;
  whatItDoes: string;
  example: string;
}

export const META_ASSET_GUIDES: MetaAssetGuide[] = [
  {
    id: "pixel_id",
    name: "Pixel / Dataset ID",
    metaSection: "Events Manager → Data Sources",
    directUrl: "https://business.facebook.com/events_manager2",
    icon: Activity,
    badge: "Browser & Server Telemetry",
    steps: [
      "Open Meta Events Manager using the link below.",
      "Select your Business Account / Portfolio in the top-left dropdown.",
      "Under 'Data Sources', click on your Dataset name (e.g. 'ANGKON Official').",
      "Click the 'Settings' tab on the sub-navigation bar.",
      "Locate the 'Dataset ID' section and copy the numeric ID (e.g. 1547844079878207).",
    ],
    whyNeeded: "Essential for matching website visitors with their Facebook/Instagram profiles.",
    whatItDoes:
      "Fires browser Pixel and server CAPI events (PageView, ViewContent, AddToCart, Purchase) to power Advantage+ Campaign optimization.",
    example: "1547844079878207",
  },
  {
    id: "capi_token",
    name: "Conversions API (CAPI) Access Token",
    metaSection: "Events Manager → Settings → Conversions API",
    directUrl: "https://business.facebook.com/events_manager2",
    icon: ShieldCheck,
    badge: "Server-Side Tracking",
    steps: [
      "Open Meta Events Manager → Select your Dataset.",
      "Navigate to the 'Settings' tab.",
      "Scroll down to the 'Conversions API' section.",
      "Under 'Set up manually', click the blue 'Generate access token' link.",
      "Copy the generated token string (starts with 'EAAG...') and paste it into ANGKON Events Manager.",
    ],
    permissions: ["ads_read", "conversions_api"],
    whyNeeded:
      "Bypasses iOS 14.5+ ATT privacy blocks, ad blockers, and cookie loss for 100% purchase attribution.",
    whatItDoes:
      "Dispatches cryptographically paired server-side events directly to Meta Graph API v22.0 with deduplicated event IDs.",
    example: "EAAG... (Stored encrypted with AES-256-GCM)",
  },
  {
    id: "marketing_token",
    name: "Marketing API Token (System User)",
    metaSection: "Business Settings → Users → System Users",
    directUrl: "https://business.facebook.com/settings/system-users",
    icon: KeyRound,
    badge: "Ad Reporting & ROAS Sync",
    steps: [
      "Open Meta Business Settings → Click 'Users' → 'System Users'.",
      "Click 'Add' to create a System User named 'ANGKON Syncer' with role 'Employee' or 'Admin'.",
      "Click 'Assign Assets' → Select your Ad Account → Enable 'Manage campaigns' or 'View performance'.",
      "Click 'Generate New Token' → Select your Meta App.",
      "Check permission checkboxes: 'ads_read' and 'read_insights'.",
      "Set Token Expiration to 'Never' (Permanent System User Token) and copy.",
    ],
    permissions: ["ads_read", "read_insights"],
    whyNeeded:
      "Enables automated background synchronization of daily ad spend, impressions, clicks, and ROAS.",
    whatItDoes:
      "Pulls exact campaign, ad set, and ad telemetry every 2 hours without requiring manual user log-in.",
    example: "EAAG... (Decoupled from Pixel/CAPI tokens)",
  },
  {
    id: "ad_account_id",
    name: "Meta Ad Account ID",
    metaSection: "Meta Ads Manager → Account Dropdown",
    directUrl: "https://adsmanager.facebook.com",
    icon: BarChart3,
    badge: "Campaign Management",
    steps: [
      "Open Meta Ads Manager using the link below.",
      "Look at the top account selector dropdown (or your browser URL).",
      "Copy the Ad Account ID (e.g. 'act_1646756900434912' or '1646756900434912').",
      "Paste into ANGKON Ads & Attribution settings.",
    ],
    whyNeeded: "Tells ANGKON which specific advertising account to ingest data and spend from.",
    whatItDoes:
      "Links your store orders with ad campaign IDs for first-party Dual-Ledger ROAS calculation.",
    example: "act_1646756900434912",
  },
  {
    id: "catalog_id",
    name: "Meta Catalog ID & Product Feed",
    metaSection: "Commerce Manager → Assets → Catalogs",
    directUrl: "https://business.facebook.com/commerce_manager",
    icon: ShoppingBag,
    badge: "Dynamic Product Ads (DPA)",
    steps: [
      "Open Meta Commerce Manager using the link below.",
      "Select your Catalog asset (or click 'Add Catalog' if you don't have one).",
      "Click 'Catalog' on the left menu → Click 'Settings' at the bottom.",
      "Under 'Catalog information', copy your numeric 'Catalog ID'.",
      "In ANGKON Catalog Manager, copy your Scheduled Feed URL and register it inside Meta as a daily scheduled XML data feed.",
    ],
    permissions: ["catalog_management"],
    whyNeeded:
      "Keeps Facebook Shop, Instagram Shop, and Advantage+ Catalog Dynamic Ads synced with inventory.",
    whatItDoes:
      "Exports all 16 eligible ANGKON products with real-time BDT prices, stock availability, and high-res images.",
    example: "123456789012345",
  },
  {
    id: "domain_verification",
    name: "Domain Verification (Brand Safety)",
    metaSection: "Business Settings → Brand Safety → Domains",
    directUrl: "https://business.facebook.com/settings/owned-domains",
    icon: Globe,
    badge: "Aggregated Event Measurement",
    steps: [
      "Open Meta Business Settings → 'Brand Safety and Suitability' → 'Domains'.",
      "Click 'Add' → 'Create a new domain' → Enter 'angkon.net'.",
      "Choose 'Update the DNS TXT record with your domain registrar' (or HTML meta-tag).",
      "Copy the verification TXT record (e.g. facebook-domain-verification=...) into ANGKON Domain Verification.",
      "Click 'Verify Domain' inside Meta Business Settings.",
    ],
    whyNeeded:
      "Meta requires verified domains to prioritize the 8 core conversion events for iOS 14.5+ users.",
    whatItDoes:
      "Locks your domain ownership to your Business Portfolio, preventing rogue ad accounts from running ads for your brand.",
    example: "facebook-domain-verification=xxxxxxxxxxxx",
  },
];

interface MetaAssetLocatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAssetId?: string;
}

export function MetaAssetLocatorModal({
  isOpen,
  onClose,
  defaultAssetId = "pixel_id",
}: MetaAssetLocatorModalProps) {
  const [selectedAssetId, setSelectedAssetId] = useState(defaultAssetId);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentGuide =
    META_ASSET_GUIDES.find((g) => g.id === selectedAssetId) || META_ASSET_GUIDES[0];

  const handleCopy = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="asset-locator-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 fade-in-0 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <h2 id="asset-locator-title" className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Meta Asset Locator &amp; Setup Guide
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Exact step-by-step instructions and deep links to find all Meta IDs and Access Tokens.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body: Left Asset Selector + Right Step Guide */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Left Sidebar: Asset List */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/50 p-3 space-y-1 overflow-y-auto shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 block">
              Meta Platform Assets
            </span>
            {META_ASSET_GUIDES.map((guide) => {
              const Icon = guide.icon;
              const isSelected = guide.id === selectedAssetId;
              return (
                <button
                  key={guide.id}
                  type="button"
                  onClick={() => setSelectedAssetId(guide.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-medium transition cursor-pointer ${
                    isSelected
                      ? "bg-white text-blue-900 shadow-xs border border-blue-200 font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isSelected ? "text-blue-600" : "text-slate-400"
                    }`}
                  />
                  <div className="min-w-0 flex-1 truncate">
                    <div className="truncate">{guide.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{guide.badge}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Area: Step-by-Step Instructions */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-5">
            {/* Asset Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-blue-50/70 border border-blue-200/80">
              <div>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded mb-1">
                  {currentGuide.metaSection}
                </span>
                <h3 className="text-base font-bold text-slate-900">{currentGuide.name}</h3>
                <p className="text-xs text-slate-600 mt-1">{currentGuide.whatItDoes}</p>
              </div>

              <a
                href={currentGuide.directUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition shrink-0 cursor-pointer"
              >
                <span>Open in Meta</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            {/* Why Needed & Impact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Why is this needed?
                </span>
                <p className="text-slate-700 leading-relaxed">{currentGuide.whyNeeded}</p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Required Permissions
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {currentGuide.permissions && currentGuide.permissions.length > 0 ? (
                    currentGuide.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="font-mono text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200"
                      >
                        {perm}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 text-[11px]">No special API scope needed</span>
                  )}
                </div>
              </div>
            </div>

            {/* Step by step checklist */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <span>How to find this in Meta Business Manager:</span>
              </h4>

              <ol className="space-y-2.5">
                {currentGuide.steps.map((step, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-200/90 bg-white text-xs text-slate-700"
                  >
                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Format Example */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Expected Format
                </span>
                <span className="font-mono text-slate-800 font-semibold truncate block">
                  {currentGuide.example}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(currentGuide.directUrl)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg transition shrink-0 cursor-pointer"
              >
                {copiedText === currentGuide.directUrl ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600" />
                    <span>Copied URL</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 text-slate-400" />
                    <span>Copy Deep-Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Official Meta Graph API v22.0 compliant guidelines</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
