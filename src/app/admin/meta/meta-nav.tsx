"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Layers,
  ShoppingBag,
  Globe,
  ExternalLink,
  Copy,
  Check,
  BarChart3,
  AlertTriangle,
  ChevronDown,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Info,
  Plus,
  BookOpen,
  Settings,
  DatabaseBackup,
} from "lucide-react";
import { MetaAssetLocatorModal } from "@/components/admin/meta/meta-asset-locator-modal";
import {
  useState,
  useEffect,
  useContext,
  createContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

// ── Types ─────────────────────────────────────────────────────────────
export interface MetaNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  exact?: boolean;
}

export interface MetaNavGroup {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  collapsible?: boolean;
  items: MetaNavItem[];
}

// ── Centralized Color Gradient Tokens (Calibrated Meta Business Suite) ──
export const META_SIDEBAR_GRADIENT =
  "linear-gradient(180deg, #F5EDF8 0%, #EAE8F6 48%, #DFEBF8 100%)";

export const META_CANVAS_GRADIENT =
  "radial-gradient(ellipse 80% 50% at 12% -5%, rgba(210, 226, 252, 0.75) 0%, transparent 65%), radial-gradient(ellipse 70% 45% at 88% -5%, rgba(236, 220, 250, 0.65) 0%, transparent 60%), linear-gradient(115deg, #E6ECF8 0%, #F0EAF8 48%, #DFEAF7 100%)";

// ── 1. Navigation Structure (Exact specification) ─────────────────────
// - Overview
// - Events & Tracking: Events Manager, Conversions API
// - Marketing: Ads & Attribution
// - Commerce & Assets: Catalog Feed, Domain Verification
export const META_NAV_GROUPS: MetaNavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    collapsible: false,
    items: [
      {
        href: "/admin/meta",
        label: "Overview",
        icon: Layers,
        exact: true,
      },
    ],
  },
  {
    id: "events-tracking",
    label: "Events & Tracking",
    icon: Activity,
    collapsible: true,
    items: [
      {
        href: "/admin/meta/events",
        label: "Events Manager",
        icon: Activity,
      },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: BarChart3,
    collapsible: true,
    items: [
      {
        href: "/admin/meta/ads",
        label: "Ads & Attribution",
        icon: BarChart3,
      },
    ],
  },
  {
    id: "commerce-assets",
    label: "Commerce & Assets",
    icon: ShoppingBag,
    collapsible: true,
    items: [
      {
        href: "/admin/meta/catalog",
        label: "Catalog Feed",
        icon: ShoppingBag,
      },
      {
        href: "/admin/meta/domain-verification",
        label: "Domain Verification",
        icon: Globe,
      },
    ],
  },
  {
    id: "data-group",
    label: "Data",
    icon: DatabaseBackup,
    collapsible: true,
    items: [
      {
        href: "/admin/meta/backup",
        label: "Backup & Restore",
        icon: DatabaseBackup,
      },
    ],
  },
  {
    id: "settings-group",
    label: "Settings",
    icon: Settings,
    collapsible: true,
    items: [
      {
        href: "/admin/meta/settings",
        label: "Meta Suite Settings",
        icon: Settings,
      },
    ],
  },
];

// Preserved for backward compatibility
export const META_NAV_TABS = META_NAV_GROUPS.flatMap((group) =>
  group.items.map((item) => ({
    href: item.href,
    label: item.label,
    description: group.label,
    icon: item.icon,
    exact: item.exact,
  }))
);

// ── Path Match Helpers ────────────────────────────────────────────────
export function isRouteActive(pathname: string, item: MetaNavItem): boolean {
  if (item.exact) {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function getActiveGroup(pathname: string): MetaNavGroup | undefined {
  return META_NAV_GROUPS.find((group) =>
    group.items.some((item) => isRouteActive(pathname, item))
  );
}

export function getActiveItem(pathname: string): MetaNavItem {
  for (const group of META_NAV_GROUPS) {
    const item = group.items.find((i) => isRouteActive(pathname, i));
    if (item) return item;
  }
  return META_NAV_GROUPS[0].items[0];
}

// ── Meta Loop Brand Icon ──────────────────────────────────────────────
function _MetaLoopIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.1 21.5c-1.7-2.6-3.7-5.7-5.9-8.5-2.5-3.1-4.9-4.8-7.7-4.8-4.2 0-6.5 3.3-6.5 8 0 5.4 3.3 9.8 8.1 9.8 2.9 0 5.2-1.7 7.4-4.5zm-5.4-3.7c1.4 2.1 2.9 4.3 4.3 6.3-1.8 2-3.6 3.1-5.6 3.1-3.7 0-6-3.4-6-7.8 0-3.6 1.7-6.1 4.7-6.1 2.1 0 4 1.5 5.9 3.8zm14.8-9.6c-2.8 0-5.2 1.7-7.7 4.8-2.2 2.8-4.2 5.9-5.9 8.5 2.2 2.8 4.5 4.5 7.4 4.5 4.8 0 8.1-4.4 8.1-9.8 0-4.7-2.3-8-6.5-8h-1.4zm-1.4 17.8c-2 0-3.8-1.1-5.6-3.1 1.4-2 2.9-4.2 4.3-6.3 1.9-2.3 3.8-3.8 5.9-3.8 3 0 4.7 2.5 4.7 6.1 0 4.4-2.3 7.8-6 7.8h-3.3z" />
    </svg>
  );
}

// ── Context for Meta Marketing Navigation ──────────────────────────────
interface MetaNavContextValue {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleCollapse: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  openMobile: () => void;
  closeMobile: () => void;
  expandedGroups: Record<string, boolean>;
  toggleGroup: (groupId: string) => void;
  activeItem: MetaNavItem;
  activeGroup?: MetaNavGroup;
  pixelId?: string;
  testEventCode?: string;
  setMetaSettings: (settings: { pixelId?: string; testEventCode?: string }) => void;
}

const MetaNavContext = createContext<MetaNavContextValue | null>(null);

const STORAGE_COLLAPSED_KEY = "angkon_meta_nav_collapsed";
const STORAGE_GROUPS_KEY = "angkon_meta_groups_state";

export function MetaNavProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [metaSettings, setMetaSettings] = useState<{
    pixelId?: string;
    testEventCode?: string;
  }>({});

  // Initialize group state with all collapsible groups open by default
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    overview: true,
    "events-tracking": true,
    marketing: true,
    "commerce-assets": true,
  });

  // Restore saved collapse and group state from localStorage on mount
  useEffect(() => {
    try {
      const savedCollapsed = localStorage.getItem(STORAGE_COLLAPSED_KEY);
      if (savedCollapsed !== null) {
        setIsCollapsed(savedCollapsed === "1");
      }
      const savedGroups = localStorage.getItem(STORAGE_GROUPS_KEY);
      if (savedGroups) {
        const parsed = JSON.parse(savedGroups);
        if (typeof parsed === "object" && parsed !== null) {
          setExpandedGroups((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }, []);

  // Detect active route and guarantee its parent group is kept expanded
  const activeGroup = useMemo(() => getActiveGroup(pathname), [pathname]);
  const activeItem = useMemo(() => getActiveItem(pathname), [pathname]);

  useEffect(() => {
    if (activeGroup && activeGroup.id) {
      setExpandedGroups((prev) => {
        if (!prev[activeGroup.id]) {
          const next = { ...prev, [activeGroup.id]: true };
          try {
            localStorage.setItem(STORAGE_GROUPS_KEY, JSON.stringify(next));
          } catch {
            // Ignore
          }
          return next;
        }
        return prev;
      });
    }
  }, [activeGroup]);

  // Close mobile drawer on route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try {
        localStorage.setItem(STORAGE_GROUPS_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const openMobile = useCallback(() => setIsMobileOpen(true), []);
  const closeMobile = useCallback(() => setIsMobileOpen(false), []);

  const value = useMemo(
    () => ({
      isCollapsed,
      setIsCollapsed,
      toggleCollapse,
      isMobileOpen,
      setIsMobileOpen,
      openMobile,
      closeMobile,
      expandedGroups,
      toggleGroup,
      activeItem,
      activeGroup,
      pixelId: metaSettings.pixelId,
      testEventCode: metaSettings.testEventCode,
      setMetaSettings,
    }),
    [
      isCollapsed,
      toggleCollapse,
      isMobileOpen,
      openMobile,
      closeMobile,
      expandedGroups,
      toggleGroup,
      activeItem,
      activeGroup,
      metaSettings,
    ]
  );

  return <MetaNavContext.Provider value={value}>{children}</MetaNavContext.Provider>;
}

export function useMetaNav() {
  const context = useContext(MetaNavContext);
  if (!context) {
    throw new Error("useMetaNav must be used within a MetaNavProvider");
  }
  return context;
}

// ── Sidebar Component (Meta Business Suite Style) ──────────────────────
// Background: #f0f4f9 (soft ice-blue slate matching Image 1)
// Active Item: #243342 (dark navy slate pill matching Image 1 & 2)
export function MetaSuiteSidebar({
  isDrawer = false,
  onClose,
}: {
  isDrawer?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { isCollapsed, toggleCollapse, expandedGroups, toggleGroup } = useMetaNav();

  // If in drawer mode, always render expanded width
  const collapsed = isDrawer ? false : isCollapsed;

  return (
    <aside
      aria-label="Meta Marketing Suite Navigation"
      style={{
        background: META_SIDEBAR_GRADIENT,
      }}
      className={`relative flex flex-col shrink-0 border-r border-[#dbe2ea] text-slate-800 transition-all duration-300 ease-in-out select-none ${
        isDrawer
          ? "w-[260px] h-full shadow-2xl z-50 overflow-y-auto"
          : collapsed
          ? "w-[68px] h-full overflow-visible"
          : "w-[250px] h-full"
      }`}
    >
      {/* ── Mobile Drawer Close Button ── */}
      {isDrawer && (
        <div className="flex items-center justify-end px-3 pt-3 pb-1 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-[#1c2a38]/8 transition cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Navigation Items List ── */}
      <nav
        aria-label="Meta Marketing Suite routes"
        className={`flex-1 min-h-0 p-2.5 pt-3 space-y-2 ${
          collapsed ? "overflow-visible" : "overflow-y-auto overflow-x-hidden"
        }`}
      >
        {META_NAV_GROUPS.map((group) => {
          const isGroupExpanded = expandedGroups[group.id] ?? true;
          const GroupIcon = group.icon;

          // Standalone top-level item (e.g. Overview: single entry with icon)
          if (!group.collapsible) {
            const item = group.items[0];
            const isActive = isRouteActive(pathname, item);
            const Icon = item.icon;

            return (
              <div key={group.id} className="space-y-0.5">
                {!collapsed ? (
                  <Link
                    href={item.href}
                    onClick={onClose}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      isActive
                        ? "bg-[#243342] text-white font-semibold shadow-xs"
                        : "text-slate-800 hover:bg-[#1c2a38]/8 hover:text-slate-900 font-medium"
                    }`}
                  >
                    <Icon
                      aria-hidden="true"
                      className={`shrink-0 h-4 w-4 transition-colors ${
                        isActive ? "text-white" : "text-slate-600"
                      }`}
                    />
                    <span className="truncate font-semibold">{item.label}</span>
                  </Link>
                ) : (
                  <div className="relative group">
                    <Link
                      href={item.href}
                      onClick={onClose}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex items-center justify-center h-9 w-9 mx-auto rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        isActive
                          ? "bg-[#243342] text-white font-semibold shadow-xs"
                          : "text-slate-500 hover:bg-[#1c2a38]/8 hover:text-slate-800"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </Link>
                    <div
                      role="tooltip"
                      className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-[100] pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150"
                    >
                      <div className="relative rounded-lg bg-[#1c2a38] px-3 py-1.5 text-xs font-semibold text-white shadow-xl whitespace-nowrap border border-slate-700/80 flex items-center gap-2">
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-[#1c2a38]" />
                        <span>{item.label}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Collapsible Group (Events & Tracking, Marketing, Commerce & Assets)
          return (
            <div key={group.id} className="space-y-0.5">
              {/* Group Header */}
              {!collapsed ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-2.5 py-2 text-[13px] font-bold text-slate-800 hover:bg-[#1c2a38]/8 rounded-lg transition cursor-pointer"
                  aria-expanded={isGroupExpanded}
                >
                  <span className="flex items-center gap-2.5">
                    {GroupIcon && <GroupIcon className="h-4 w-4 text-slate-600 shrink-0" />}
                    <span className="text-[13px] font-bold text-slate-800">{group.label}</span>
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 shrink-0 ${
                      isGroupExpanded ? "rotate-180" : "rotate-0"
                    }`}
                    aria-hidden="true"
                  />
                </button>
              ) : (
                /* Collapsed divider between groups */
                <div className="my-1.5 mx-auto w-6 border-t border-slate-300/60" />
              )}

              {/* Group Child Items */}
              {!collapsed && isGroupExpanded && (
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = isRouteActive(pathname, item);

                    return (
                      <li key={item.href} className="relative">
                        <Link
                          href={item.href}
                          onClick={onClose}
                          aria-current={isActive ? "page" : undefined}
                          className={`flex items-center rounded-lg pl-9 pr-3 py-1.5 text-[13px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                            isActive
                              ? "bg-[#243342] text-white font-semibold shadow-xs"
                              : "text-slate-700 hover:bg-[#1c2a38]/8 hover:text-slate-900 font-normal"
                          }`}
                        >
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Collapsed Items with Icons & Tooltips */}
              {collapsed && (
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = isRouteActive(pathname, item);
                    const Icon = item.icon;

                    return (
                      <li key={item.href} className="relative group">
                        <Link
                          href={item.href}
                          onClick={onClose}
                          aria-current={isActive ? "page" : undefined}
                          className={`flex items-center justify-center h-9 w-9 mx-auto rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                            isActive
                              ? "bg-[#243342] text-white font-semibold shadow-xs"
                              : "text-slate-500 hover:bg-[#1c2a38]/8 hover:text-slate-800"
                          }`}
                        >
                          <Icon
                            aria-hidden="true"
                            className={`shrink-0 h-4 w-4 ${
                              isActive ? "text-white" : "text-slate-500 group-hover:text-slate-800"
                            }`}
                          />
                        </Link>

                        {/* Professional Hover Tooltip in Collapsed Mode */}
                        <div
                          role="tooltip"
                          className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-[100] pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150"
                        >
                          <div className="relative rounded-lg bg-[#1c2a38] px-3 py-1.5 text-xs font-semibold text-white shadow-xl whitespace-nowrap border border-slate-700/80 flex items-center gap-2">
                            <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-[#1c2a38]" />
                            <span>{item.label}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              • {group.label}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Footer / Collapse Trigger ── */}
      <div className="shrink-0 p-2.5 border-t border-[#dbe2ea]/80 flex items-center justify-end">
        {!collapsed ? (
          <button
            type="button"
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition cursor-pointer"
            title="Collapse sidebar (68px)"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        ) : (
          <div className="w-full flex justify-center group relative">
            <button
              type="button"
              onClick={toggleCollapse}
              className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition cursor-pointer"
              title="Expand sidebar (250px)"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-[100] pointer-events-none">
              <div className="rounded-md bg-[#1c2a38] text-white px-2.5 py-1 text-xs font-medium shadow-lg whitespace-nowrap border border-slate-700/80">
                Expand sidebar
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

// ── 5. Contextual Top Navigation Header ──────────────────────────────
// Authentic Meta Business Suite top bar: Title, Info Tooltip, Asset Locator Guide & Actions.
export function MetaNavigationHeader({
  pixelId = "",
  testEventCode = "",
}: {
  pixelId?: string;
  testEventCode?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const { openMobile, activeItem } = useMetaNav();

  const handleCopyId = () => {
    if (!pixelId) return;
    void navigator.clipboard.writeText(pixelId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isConnected = Boolean(pixelId && pixelId.trim().length >= 8);

  return (
    <>
      <header className="shrink-0 bg-white border border-slate-200/90 rounded-2xl px-4 sm:px-6 py-3.5 mb-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Left: Mobile Drawer Trigger + Active Route Title + Info Tooltip */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openMobile}
              className="lg:hidden inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Open Meta Suite navigation"
              aria-label="Open Meta Suite navigation"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {activeItem.label}
              </h1>

              {/* Info Icon with Tooltip */}
              <div className="group relative">
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-700 transition cursor-help p-0.5 rounded-full"
                  aria-label="Route Information"
                >
                  <Info className="h-4 w-4" />
                </button>
                <div
                  role="tooltip"
                  className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-[100] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 w-72 p-3 rounded-xl bg-slate-900 text-white text-[11px] leading-relaxed shadow-2xl border border-slate-700/80"
                >
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-slate-900" />
                  <p className="font-bold text-slate-100 mb-0.5">{activeItem.label}</p>
                  <p className="text-slate-300">
                    {activeItem.label === "Overview"
                      ? "Meta Business Suite ecosystem telemetry, asset health, and conversion funnel analytics."
                      : activeItem.label === "Events Manager"
                      ? "Manage Meta Datasets, browser Pixel SDK, and live customer conversion event telemetry."
                      : activeItem.label === "Conversions API"
                      ? "Monitor server-side Graph API v22.0 delivery, deduplication ledger, and background retry queue."
                      : activeItem.label === "Ads & Attribution"
                      ? "Synchronize Meta Ad accounts, campaign performance metrics, and multi-touch ROAS attribution."
                      : activeItem.label === "Catalog Feed"
                      ? "Manage Facebook Product Catalog XML feed synchronization and product taxonomy compliance."
                      : "Verify domain ownership and Aggregated Event Measurement (AEM) protocols for angkon.net."}
                  </p>
                </div>
              </div>

              {testEventCode && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  <AlertTriangle className="h-3 w-3 text-amber-600" />
                  Test: {testEventCode}
                </span>
              )}
            </div>
          </div>

          {/* Right: Asset Locator Guide + Dataset ID Pill + External Links */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Meta Asset Locator & Setup Guide Launcher */}
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-blue-200 bg-blue-50/90 hover:bg-blue-100 text-blue-800 text-xs font-semibold transition cursor-pointer shadow-2xs"
              title="Where to find all IDs and tokens in Facebook Business Manager"
            >
              <BookOpen className="h-3.5 w-3.5 text-blue-600" />
              <span className="hidden sm:inline">Meta Asset Guide</span>
              <span className="sm:hidden">Guide</span>
            </button>

            {/* Connected Dataset Pill */}
            {isConnected && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl font-mono">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-500 font-sans text-[11px]">ID:</span>
                <span>{pixelId}</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-0.5 hover:text-slate-900 transition rounded hover:bg-slate-200/60 cursor-pointer"
                  title="Copy Dataset ID"
                  aria-label="Copy Dataset ID"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <Copy className="h-3 w-3 text-slate-400" />
                  )}
                </button>
              </div>
            )}

            {/* External Link to Meta Business Suite */}
            <a
              href={
                isConnected
                  ? `https://eventsmanager.facebook.com/events_manager2/list/dataset/${pixelId}`
                  : "https://business.facebook.com"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition cursor-pointer"
              title="Open in Meta Business Suite"
            >
              <span>Meta Suite</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </a>

            {/* Primary Meta Action Button */}
            <a
              href={
                isConnected
                  ? `https://eventsmanager.facebook.com/events_manager2/list/dataset/${pixelId}`
                  : "https://business.facebook.com"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-[#1877f2] hover:bg-[#166fe5] text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Event</span>
            </a>
          </div>
        </div>
      </header>

      {/* Global Meta Asset Locator Modal */}
      <MetaAssetLocatorModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </>
  );
}
