"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight,
  BarChart3,
  FolderOpen,
  PanelLeft,
  Volume2,
  VolumeX,
  Activity,
  CreditCard,
  Truck,
  Store,
  PlugZap,
  ShieldCheck,
  Settings2,
  UserRound,
  Clock,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from "lucide-react";
import {
  isSoundEnabled,
  setSoundEnabled,
  playOrderAlertSound,
  sendDesktopNotification,
  requestDesktopNotificationPermission,
} from "@/lib/sound-alert";

const isMetaEnabled = process.env.NEXT_PUBLIC_DISABLE_META_ROUTES !== "true";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const MAIN_NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderOpen },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
];

const OPERATIONS_NAV: NavItem[] = [
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/couriers", label: "Couriers", icon: Truck },
  // Marketing is strictly Super Admin tooling — it lives with the other
  // operations items rather than in the main navigation group.
  ...(isMetaEnabled
    ? [{ href: "/admin/meta", label: "Marketing", icon: Activity }]
    : []),
];

const SETTINGS_NAV: NavItem[] = [
  { href: "/admin/settings", label: "Settings", icon: Store },
  { href: "/admin/integrations", label: "Integrations", icon: PlugZap },
  { href: "/admin/users", label: "Users & Access", icon: ShieldCheck },
];

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "", items: MAIN_NAV },
  { label: "Operations", items: OPERATIONS_NAV },
  { label: "Settings", items: SETTINGS_NAV },
];

const NAV: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/** Initials shown in the sidebar profile avatar. */
function initialsOf(name?: string | null): string {
  const initials = String(name || "")
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return initials || "AD";
}

const SIDEBAR_KEY = "angkon-admin-sidebar-expanded";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout, authFetch } = useAuth();
  const pathname = usePathname();
  // Reactive query access — reading window.location.search directly during
  // render was neither hydration-safe nor updated on back/forward navigation.
  const searchParams = useSearchParams();
  const isMetaRoute = pathname.startsWith("/admin/meta");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Desktop: expanded by default on standard admin routes
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  // Hover flyout state (Meta Business Suite style: expand on hover, hide on leave)
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pendingOrdersList, setPendingOrdersList] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifMenuRef = useRef<HTMLDivElement | null>(null);

  const toggleNotif = useCallback(async () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) {
      setNotifLoading(true);
      try {
        const res = await authFetch("/api/admin/orders?status=pending&per_page=5");
        if (res.ok) {
          const data = await res.json();
          setPendingOrdersList(data.orders || []);
          if (data.statusCounts?.pending !== undefined) {
            setPendingCount(data.statusCounts.pending);
          }
        }
      } catch {
        // ignore
      } finally {
        setNotifLoading(false);
      }
    }
  }, [authFetch, notifOpen]);
  const [adminUser, setAdminUser] = useState<{
    user: string;
    name: string;
    role: string;
  } | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  // Sound alert & real-time notification states
  const [soundActive, setSoundActive] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState<{
    number: string;
    total: string;
    customer: string;
  } | null>(null);
  const lastOrderIdRef = useRef<string | null>(null);
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    setSoundActive(isSoundEnabled());
    void requestDesktopNotificationPermission();
  }, []);

  // Auto-dismiss new order banner after 15 seconds
  useEffect(() => {
    if (!newOrderAlert) return;
    const t = setTimeout(() => setNewOrderAlert(null), 15_000);
    return () => clearTimeout(t);
  }, [newOrderAlert]);

  const toggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    setSoundEnabled(next);
    if (next) {
      // Test chime so the user can verify computer speaker volume immediately
      playOrderAlertSound(0.7);
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_KEY);
      if (saved === "1") setSidebarExpanded(true);
      if (saved === "0") setSidebarExpanded(false);
    } catch {
      // ignore
    }
  }, []);

  const toggleSidebarExpanded = () => {
    setSidebarExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Fetch real order status counts & detect new orders to play sound
  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await authFetch(
        "/api/admin/orders?per_page=1"
      );
      if (res.ok) {
        const data = await res.json();
        const pending = data.statusCounts?.pending ?? 0;
        setPendingCount(pending);

        const latest = data.orders?.[0];
        if (latest) {
          const latestId = String(latest.number || latest.id);
          if (isFirstLoadRef.current) {
            // Initial load: record the latest order without playing alert
            lastOrderIdRef.current = latestId;
            isFirstLoadRef.current = false;
          } else if (lastOrderIdRef.current && latestId !== lastOrderIdRef.current) {
            // NEW ORDER RECEIVED! Play sound on computer and notify
            lastOrderIdRef.current = latestId;

            if (isSoundEnabled()) {
              playOrderAlertSound(0.9);
            }

            setNewOrderAlert({
              number: latest.number || latestId,
              total: latest.total || "0",
              customer: latest.billing?.first_name || "Customer",
            });

            sendDesktopNotification({
              title: "🎉 New Order Placed!",
              body: `Order #${latest.number || latestId} (৳${Number(latest.total || 0).toLocaleString("en-BD")}) from ${latest.billing?.first_name || "Customer"}`,
              onClick: () => {
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                window.location.href = "/admin/orders?status=pending";
              },
            });
          }
        }
      }
    } catch {
      // ignore
    }
  }, [authFetch]);

  // Sidebar courier status card removed — the profile block now anchors the sidebar.
  useEffect(() => {
    if (pathname === "/admin") return;
    void fetchPendingCount();

    // Only poll when the browser tab is actively visible to prevent CPU burn and container keep-alive
    const poll = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      void fetchPendingCount();
    };

    const timer = setInterval(poll, 30_000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchPendingCount();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPendingCount]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    setProfileMenuOpen(false);
    setNotifOpen(false);
  }, [pathname]);

  // Load (and refresh) the authenticated admin identity & role permissions
  const refreshAdminIdentity = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/login", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.authenticated) {
        setAdminUser({
          user: data.user || "",
          name: data.name || "Administrator",
          role: data.role || "admin",
        });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (pathname === "/admin") return;
    void refreshAdminIdentity();
  }, [pathname, refreshAdminIdentity]);

  // The profile page broadcasts this after saving so the sidebar updates live.
  useEffect(() => {
    const onProfileUpdated = () => void refreshAdminIdentity();
    window.addEventListener("admin-profile-updated", onProfileUpdated);
    return () => window.removeEventListener("admin-profile-updated", onProfileUpdated);
  }, [refreshAdminIdentity]);

  // Login page renders without sidebar
  if (pathname === "/admin") return <>{children}</>;

  // Filter navigation by role (Meta Events Manager is strictly Super Admin only)
  const isSuperAdmin = adminUser?.role === "superadmin";
  const filteredNav = NAV.filter((item) => {
    if (item.href === "/admin/meta" || item.href === "/admin/users") {
      return isSuperAdmin;
    }
    return true;
  });
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => filteredNav.includes(item)),
  })).filter((group) => group.items.length > 0);

  // Determine current page title
  const currentNav = filteredNav.find((item) => pathname.startsWith(item.href));
  let pageTitle = currentNav ? currentNav.label : "Admin";
  let PageIcon = currentNav ? currentNav.icon : LayoutDashboard;

  if (pathname.startsWith("/admin/settings")) {
    pageTitle = "Settings & Configuration";
    PageIcon = Settings;
  } else if (pathname.startsWith("/admin/profile")) {
    pageTitle = "My Profile";
    PageIcon = UserRound;
  } else if (pathname.startsWith("/admin/integrations")) {
    pageTitle = "Integrations";
    PageIcon = PlugZap;
  } else if (pathname.startsWith("/admin/users")) {
    pageTitle = "Users & Access";
    PageIcon = ShieldCheck;
  } else if (pathname.startsWith("/admin/courier")) {
    pageTitle = "Couriers";
    PageIcon = Truck;
  }

  if (pathname.startsWith("/admin/meta")) {
    if (pathname.startsWith("/admin/meta/events")) {
      pageTitle = "Meta Events Manager";
      PageIcon = Activity;
    } else if (pathname.startsWith("/admin/meta/ads")) {
      pageTitle = "Meta Ads & Attribution";
      PageIcon = BarChart3;
    } else if (pathname.startsWith("/admin/meta/catalog")) {
      pageTitle = "Meta Catalog Feed";
      PageIcon = Package;
    } else if (pathname.startsWith("/admin/meta/domain-verification")) {
      pageTitle = "Meta Domain Verification";
      PageIcon = Activity;
    } else if (pathname.startsWith("/admin/meta/backup")) {
      pageTitle = "Meta Backup & Restore";
      PageIcon = Activity;
    } else if (pathname.startsWith("/admin/meta/settings")) {
      pageTitle = "Meta Suite Settings";
      PageIcon = Settings;
    } else {
      pageTitle = "Meta Marketing Overview";
      PageIcon = Activity;
    }
  }

  // Desktop effective expanded state:
  // On Meta routes, sidebar is in collapsed icon-rail mode by default (78px, matching user's image media_1793568009257_a97b6430.png).
  // When hovered on Meta routes, it expands over the top to 220px to show our full sidebar labels!
  // On regular admin routes, sidebar follows the user's manual toggle (sidebarExpanded).
  const isDesktopExpanded = isMetaRoute ? sidebarHovered : sidebarExpanded;
  const showSidebarContent = isDesktopExpanded || sidebarOpen;

  return (
    <div
      style={{
        ["--admin-sidebar-width" as string]: isDesktopExpanded ? "220px" : "78px",
      }}
      className="flex h-screen overflow-hidden bg-[#f0f0f8] font-sans antialiased text-gray-800"
    >
      {/* ── Main Sidebar (Responsive: full drawer on mobile, collapsible icon-rail on desktop) ── */}
      <aside
        onMouseEnter={() => {
          if (isMetaRoute) setSidebarHovered(true);
        }}
        onMouseLeave={() => {
          if (isMetaRoute) setSidebarHovered(false);
        }}
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-purple-100 shadow-[2px_0_20px_rgba(123,97,255,0.06)] transition-all duration-300 ease-in-out
          ${
            sidebarOpen
              ? "w-[260px] translate-x-0 shadow-2xl"
              : isDesktopExpanded
              ? "w-[220px] shadow-2xl -translate-x-full lg:translate-x-0"
              : "w-[78px] -translate-x-full lg:translate-x-0"
          }`}
      >
        {/* Brand header */}
        <div className="flex items-center gap-3 h-[68px] px-3.5 border-b border-purple-50 flex-shrink-0">
          <Link
            href="/admin/dashboard"
            onClick={() => setSidebarOpen(false)}
            className={`hidden lg:flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl overflow-hidden bg-[#530911] border border-stone-200/90 shadow-sm hover:scale-105 transition-all duration-200 ${
              isDesktopExpanded ? "" : "mx-auto"
            }`}
            title="Go to Dashboard"
            aria-label="Go to Dashboard"
          >
            <Image
              src="/logo.jpeg"
              alt="ANGKON"
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          </Link>
          <Link
            href="/admin/dashboard"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl overflow-hidden bg-[#530911] border border-stone-200/90 shadow-sm"
            title="Go to Dashboard"
            aria-label="Go to Dashboard"
          >
            <Image
              src="/logo.jpeg"
              alt="ANGKON"
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          </Link>
          {showSidebarContent && (
            <div className="min-w-0 flex-1 overflow-hidden flex flex-col justify-center">
              <span className="text-[14px] font-bold tracking-tight text-[#530911] leading-tight whitespace-nowrap">
                ANGKON
              </span>
            </div>
          )}
          {sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer ml-auto"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation — grouped (main / operations / settings) */}
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleGroups.map((group, groupIndex) => (
            <div
              key={group.label || "main"}
              // Group labels removed per design — keep only a light divider so
              // the sections still scan visually without header text.
              className={groupIndex > 0 ? "mt-2 border-t border-stone-100 pt-3" : ""}
            >
              <div className="space-y-1">
                {group.items.map((item) => {
                  const { href, label, icon: Icon } = item;
                  const isOrders = href === "/admin/orders";
                  const isPayments = href === "/admin/payments";
                  const isStoreSettings = href === "/admin/settings";
                  const isMeta = href === "/admin/meta";
                  const isCouriers = href === "/admin/couriers";

                  const isPaymentFilter = searchParams.has("payment_status");

                  let active = false;
                  if (isOrders) {
                    active = pathname.startsWith("/admin/orders") && !isPaymentFilter;
                  } else if (isPayments) {
                    active =
                      pathname.startsWith("/admin/payments") ||
                      (pathname.startsWith("/admin/orders") && isPaymentFilter);
                  } else if (isCouriers) {
                    active = pathname.startsWith("/admin/courier");
                  } else if (isStoreSettings) {
                    active = pathname.startsWith("/admin/settings");
                  } else if (isMeta) {
                    active = pathname.startsWith("/admin/meta") || pathname.startsWith("/admin/pixel");
                  } else if (href === "/admin/dashboard") {
                    active = pathname === "/admin/dashboard";
                  } else {
                    active = pathname.startsWith(href);
                  }

                  const showOrderBadge = isOrders && pendingCount > 0;

                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setSidebarOpen(false)}
                      title={label}
                      className={`group relative flex items-center gap-3 rounded-xl py-2.5 px-3 text-[13px] font-medium transition-all duration-200 ${
                        active
                          ? "bg-purple-600 text-white shadow-md shadow-purple-200"
                          : "text-gray-500 hover:bg-purple-50 hover:text-purple-600"
                      }`}
                    >
                      <Icon
                        className={`h-[19px] w-[19px] flex-shrink-0 transition-colors ${
                          active ? "text-white" : "text-gray-400 group-hover:text-purple-500"
                        }`}
                      />
                      <span
                        className={`flex-1 whitespace-nowrap overflow-hidden transition-all duration-300 font-medium ${
                          showSidebarContent ? "w-auto opacity-100" : "w-0 opacity-0"
                        }`}
                      >
                        {label}
                      </span>
                      {showOrderBadge && showSidebarContent && (
                        <span
                          className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9.5px] font-bold tabular-nums ${
                            active
                              ? "bg-white/25 text-white"
                              : "bg-purple-100 text-purple-700 group-hover:bg-purple-200"
                          }`}
                        >
                          {pendingCount > 99 ? "99+" : pendingCount}
                        </span>
                      )}
                      {showOrderBadge && !showSidebarContent && (
                        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
                      )}
                      {/* Tooltip when collapsed on desktop */}
                      {!showSidebarContent && (
                        <div className="absolute left-full ml-3 hidden group-hover:flex items-center z-[100] pointer-events-none">
                          <div className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-white shadow-lg whitespace-nowrap">
                            {label}
                            {showOrderBadge ? ` · ${pendingCount}` : ""}
                          </div>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Signed-in administrator profile */}
        <div className="flex-shrink-0 border-t border-purple-50 p-3">
          <Link
            href="/admin/profile"
            onClick={() => setSidebarOpen(false)}
            title={`${adminUser?.name || "Administrator"} — edit profile`}
            className={`group flex items-center gap-2.5 rounded-2xl border border-transparent p-2 transition hover:border-purple-200 hover:bg-purple-50/70 ${
              showSidebarContent ? "" : "justify-center"
            }`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-sm ${
                adminUser?.role === "superadmin"
                  ? "bg-gradient-to-br from-purple-600 via-indigo-600 to-amber-500 ring-2 ring-purple-200"
                  : "bg-gradient-to-br from-purple-500 to-purple-600"
              }`}
            >
              {initialsOf(adminUser?.name)}
            </span>
            {showSidebarContent && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-bold leading-tight text-gray-800">
                    {adminUser?.name || "Administrator"}
                  </span>
                </span>
                <Settings2 className="h-3.5 w-3.5 shrink-0 text-gray-300 transition group-hover:text-purple-600" />
              </>
            )}
          </Link>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main Content Area ───────────────────────────── */}
      <div
        className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden transition-all duration-300 ${
          isMetaRoute
            ? "lg:ml-[78px]"
            : sidebarExpanded
            ? "lg:ml-[220px]"
            : "lg:ml-[78px]"
        }`}
      >
        {/* Top Header */}
        <header
          className={`shrink-0 z-30 h-[68px] flex items-center px-6 gap-4 backdrop-blur-md transition-colors ${
            isMetaRoute
              ? "bg-white/95 border-b border-[#dbe3ee] shadow-2xs"
              : "bg-white/80 backdrop-blur-lg border-b border-purple-100"
          }`}
        >
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-purple-50 text-gray-500"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Desktop sidebar toggle shortcut */}
          <button
            type="button"
            onClick={toggleSidebarExpanded}
            className="hidden lg:flex p-2 rounded-lg hover:bg-purple-50 text-gray-500 hover:text-purple-600 transition"
            title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            <PanelLeft className="h-5 w-5" />
          </button>

          {/* Page title display */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 text-[13px] text-gray-400">
              <PageIcon className="h-4 w-4 text-purple-500" />
              <span className="text-purple-600 font-bold text-lg tracking-tight">
                {pageTitle}
              </span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            {/* Sound Alert Toggle & Test */}
            <button
              type="button"
              onClick={toggleSound}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                soundActive
                  ? "bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100"
                  : "bg-gray-100 text-gray-400 border border-transparent hover:text-gray-600"
              }`}
              title={
                soundActive
                  ? "Order sound alert is ON. Click to test chime sound or toggle mute."
                  : "Order sound alert is MUTED. Click to turn ON."
              }
              aria-label={soundActive ? "Order sound alert active" : "Order sound alert muted"}
            >
              {soundActive ? (
                <>
                  <Volume2 className="h-4 w-4 text-purple-600 animate-pulse" />
                  <span className="hidden sm:inline text-[11px] font-semibold text-purple-600">
                    Sound ON
                  </span>
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4 text-gray-400" />
                  <span className="hidden sm:inline text-[11px] font-semibold text-gray-400">
                    Sound Muted
                  </span>
                </>
              )}
            </button>

            {/* Notifications Popover — shows real pending orders on click */}
            <div ref={notifMenuRef} className="relative">
              <button
                type="button"
                onClick={toggleNotif}
                className={`relative p-2.5 rounded-xl transition cursor-pointer ${
                  notifOpen
                    ? "bg-purple-100 text-purple-700 shadow-inner"
                    : "bg-purple-50 hover:bg-purple-100 text-purple-500"
                }`}
                title={pendingCount > 0 ? `${pendingCount} pending orders` : "Notifications"}
                aria-label={`Notifications: ${pendingCount} pending orders`}
                aria-expanded={notifOpen}
              >
                <Bell className="h-[18px] w-[18px]" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center shadow-sm">
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div
                  role="dialog"
                  aria-label="Pending orders notifications"
                  className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-stone-200/90 bg-white p-3.5 shadow-2xl z-50 animate-in fade-in-0 duration-150 space-y-2.5"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                        <Clock className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-[12.5px] font-bold text-gray-900">
                        Pending Orders ({pendingCount})
                      </span>
                    </div>
                    <Link
                      href="/admin/orders?status=pending"
                      onClick={() => setNotifOpen(false)}
                      className="text-[11px] font-bold text-purple-600 hover:text-purple-700 hover:underline"
                    >
                      View All
                    </Link>
                  </div>

                  {notifLoading ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2 text-gray-400">
                      <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                      <span className="text-[11.5px] font-medium">Loading pending orders…</span>
                    </div>
                  ) : pendingOrdersList.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1.5" />
                      <p className="font-semibold text-gray-700">All caught up!</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">No pending orders awaiting review.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-72 overflow-y-auto">
                      {pendingOrdersList.map((order) => (
                        <Link
                          key={order.id || order.number}
                          href="/admin/orders?status=pending"
                          onClick={() => setNotifOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-stone-100 bg-stone-50/60 hover:bg-purple-50/70 hover:border-purple-200 transition group cursor-pointer"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-[12px] font-bold text-gray-900 group-hover:text-purple-700">
                              #{order.number} · ৳{Number(order.total || 0).toLocaleString("en-BD")}
                            </p>
                            <p className="text-[11px] text-gray-500 truncate mt-0.5">
                              {order.billing?.first_name || "Customer"} ·{" "}
                              <span className="capitalize">{order.payment_method_title || order.paymentMethod || "SSLCOMMERZ"}</span>
                            </p>
                          </div>
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Pending
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-100">
                    <Link
                      href="/admin/orders?status=pending"
                      onClick={() => setNotifOpen(false)}
                      className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[12px] font-bold transition shadow-xs cursor-pointer"
                    >
                      <span>Open Orders Table</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div
              ref={profileMenuRef}
              className="relative flex items-center pl-3 border-l border-purple-100"
            >
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-purple-50"
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
              >
                <div
                  className={`h-9 w-9 rounded-full shadow-md flex items-center justify-center text-white text-xs font-bold ${
                    adminUser?.role === "superadmin"
                      ? "bg-gradient-to-br from-purple-600 via-indigo-600 to-amber-500 ring-2 ring-purple-200"
                      : "bg-gradient-to-br from-purple-500 to-purple-600"
                  }`}
                >
                  {((adminUser?.name || "Admin")
                    .split(" ")
                    .map((w) => w[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()) || "AK"}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-[12px] font-semibold text-gray-700 leading-tight">
                    {adminUser?.name || "ANGKON"}
                  </p>
                  <p
                    className={`text-[10px] font-medium leading-tight ${
                      adminUser?.role === "superadmin"
                        ? "text-purple-600 font-bold"
                        : "text-gray-400"
                    }`}
                  >
                    {adminUser?.role === "superadmin" ? "Super Admin" : "Administrator"}
                  </p>
                </div>
                <ChevronRight
                  className={`h-3.5 w-3.5 text-gray-400 hidden sm:block transition-transform duration-200 ${
                    profileMenuOpen ? "rotate-90" : "rotate-0"
                  }`}
                />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-52 rounded-xl border border-purple-100 bg-white p-2 shadow-[0_12px_28px_rgba(31,41,55,0.16)]">
                  <div className="px-3 py-2 border-b border-purple-50 mb-1">
                    <p className="text-xs font-bold text-gray-800 truncate">
                      {adminUser?.name || "Administrator"}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {adminUser?.user || ""}
                    </p>
                    <span
                      className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        adminUser?.role === "superadmin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {adminUser?.role === "superadmin"
                        ? "Super Administrator"
                        : "Administrator"}
                    </span>
                  </div>
                  <Link
                    href="/admin/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-gray-700 transition hover:bg-purple-50 hover:text-purple-700"
                  >
                    <UserRound className="h-4 w-4" />
                    My profile
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-red-600 transition hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {sidebarOpen && (
            <button
              className="ml-2 lg:hidden text-gray-500"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </header>

        {/* Floating Real-time Order Alert Notification Banner */}
        {newOrderAlert && (
          <aside
            aria-live="assertive"
            className="fixed top-20 right-5 z-50 max-w-sm w-full bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-950 border-2 border-purple-400/50 text-white p-4 rounded-2xl shadow-[0_12px_36px_rgba(123,97,255,0.25)] animate-in slide-in-from-top-4 duration-300"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/30 text-purple-200 flex items-center justify-center shrink-0 shadow-md">
                <ShoppingCart className="h-5 w-5 text-purple-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[11px] font-bold text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    New Order Received!
                  </p>
                  <button
                    type="button"
                    onClick={() => setNewOrderAlert(null)}
                    className="text-white/60 hover:text-white text-xs p-1 cursor-pointer"
                    aria-label="Dismiss alert"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm font-bold text-white mt-1">
                  #{newOrderAlert.number} — ৳{Number(newOrderAlert.total).toLocaleString("en-BD")}
                </p>
                <p className="text-xs text-purple-200/90 mt-0.5 truncate">
                  Customer: {newOrderAlert.customer}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Link
                    href="/admin/orders?status=pending"
                    onClick={() => setNewOrderAlert(null)}
                    className="inline-flex items-center gap-1 bg-purple-500 hover:bg-purple-400 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition shadow-md shadow-purple-950/40"
                  >
                    View Order <ChevronRight className="h-3 w-3" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => playOrderAlertSound(0.9)}
                    className="text-[11px] text-purple-300 underline px-2 py-1 hover:text-white cursor-pointer"
                  >
                    Replay Sound
                  </button>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Content Body */}
        <main
          className={`flex-1 min-h-0 ${
            isMetaRoute ? "p-0 overflow-hidden flex flex-col" : "p-5 lg:p-7 overflow-y-auto"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
