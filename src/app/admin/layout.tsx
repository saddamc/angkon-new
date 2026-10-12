"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  ChevronLeft,
  BarChart3,
  FolderOpen,
  PanelLeft,
} from "lucide-react";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderOpen },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const SIDEBAR_KEY = "angkon-admin-sidebar-expanded";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout, authFetch } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Desktop: icon-only by default; click toggle for full labels
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

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

  // Fetch real pending order count from MongoDB-backed /api/admin/orders
  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await authFetch(
        "/api/admin/orders?per_page=1&status=pending"
      );
      if (res.ok) {
        const data = await res.json();
        setPendingCount(data.total ?? 0);
      }
    } catch {
      // ignore
    }
  }, [authFetch]);

  useEffect(() => {
    if (pathname === "/admin") return;
    void fetchPendingCount();
    // Refresh every 60 seconds
    const timer = setInterval(() => void fetchPendingCount(), 60_000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPendingCount]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    setProfileMenuOpen(false);
  }, [pathname]);

  // Login page renders without sidebar
  if (pathname === "/admin") return <>{children}</>;

  // Determine current page title
  const currentNav = NAV.find((item) => pathname.startsWith(item.href));
  const pageTitle = currentNav ? currentNav.label : "Admin";
  const PageIcon = currentNav ? currentNav.icon : LayoutDashboard;

  return (
    <div className="flex min-h-screen bg-[#FDFBF7] font-sans antialiased text-[#1A0302]">
      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-[#E1B76F]/20 shadow-[2px_0_24px_rgba(64,6,4,0.04)] transition-all duration-300 ease-in-out
          ${sidebarExpanded ? "w-[230px]" : "w-[78px]"}
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Brand header */}
        <div className="flex items-center gap-3 h-[70px] px-3.5 border-b border-[#E1B76F]/15 flex-shrink-0">
          <button
            type="button"
            onClick={toggleSidebarExpanded}
            className={`hidden lg:flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#400604] to-[#250302] text-[#E1B76F] shadow-sm hover:scale-105 transition-transform duration-200 ${
              sidebarExpanded ? "" : "mx-auto"
            }`}
            title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            <span className="font-serif font-black text-sm tracking-wider">AK</span>
          </button>
          <div className="lg:hidden flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#400604] to-[#250302] text-[#E1B76F] shadow-sm">
            <span className="font-serif font-black text-sm tracking-wider">AK</span>
          </div>
          {sidebarExpanded && (
            <>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="text-[14px] font-serif font-bold tracking-widest text-[#400604] whitespace-nowrap">
                  ANGKON
                </p>
                <p className="text-[10px] uppercase font-bold tracking-widest text-[#E1B76F] whitespace-nowrap">
                  Executive Suite
                </p>
              </div>
              <button
                type="button"
                onClick={toggleSidebarExpanded}
                className="hidden lg:flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-[#400604]/5 hover:text-[#400604] transition"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                title={label}
                className={`group relative flex items-center gap-3.5 rounded-xl py-2.5 px-3.5 text-[13px] font-medium transition-all duration-200 ${
                  active
                    ? "bg-[#400604] text-white shadow-md shadow-[#400604]/20"
                    : "text-stone-600 hover:bg-[#400604]/5 hover:text-[#400604]"
                }`}
              >
                <Icon
                  className={`h-[19px] w-[19px] flex-shrink-0 transition-colors ${
                    active
                      ? "text-[#E1B76F]"
                      : "text-stone-400 group-hover:text-[#400604]"
                  }`}
                />
                <span
                  className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${
                    sidebarExpanded
                      ? "w-auto opacity-100"
                      : "w-0 opacity-0"
                  }`}
                >
                  {label}
                </span>
                {/* Tooltip when collapsed on desktop */}
                {!sidebarExpanded && (
                  <div className="absolute left-full ml-3 hidden group-hover:flex items-center z-[100] pointer-events-none">
                    <div className="rounded-lg bg-[#1A0302] border border-[#E1B76F]/30 px-3 py-1.5 text-xs font-medium text-[#E1B76F] shadow-xl whitespace-nowrap">
                      {label}
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Collapse Footer Button */}
        <div className="hidden lg:flex items-center justify-center h-12 border-t border-[#E1B76F]/15 flex-shrink-0 px-2">
          {sidebarExpanded ? (
            <button
              type="button"
              onClick={toggleSidebarExpanded}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-[11px] font-medium text-stone-400 hover:bg-[#400604]/5 hover:text-[#400604] transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Collapse Menu</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleSidebarExpanded}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 hover:bg-[#400604]/5 hover:text-[#400604] transition"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
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
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarExpanded ? "lg:ml-[230px]" : "lg:ml-[78px]"
        }`}
      >
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-[70px] bg-white/90 backdrop-blur-md border-b border-[#E1B76F]/20 flex items-center px-6 gap-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-stone-100 text-stone-600"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Desktop sidebar toggle shortcut */}
          <button
            type="button"
            onClick={toggleSidebarExpanded}
            className="hidden lg:flex p-2 rounded-lg hover:bg-[#400604]/5 text-stone-500 hover:text-[#400604] transition"
            title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            <PanelLeft className="h-5 w-5" />
          </button>

          {/* Page title display */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 text-[13px] text-stone-400">
              <PageIcon className="h-4 w-4 text-[#E1B76F]" />
              <span className="text-[#400604] font-serif font-bold text-lg tracking-wide">
                {pageTitle}
              </span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-4">
            {/* Notifications — shows real pending order count */}
            <Link
              href="/admin/orders?status=pending"
              className="relative p-2.5 rounded-xl bg-stone-100 hover:bg-[#400604]/10 text-stone-600 hover:text-[#400604] transition"
              title={`${pendingCount} pending orders`}
            >
              <Bell className="h-[18px] w-[18px]" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-[#400604] text-[9px] font-bold text-[#E1B76F] border border-[#E1B76F]/40 flex items-center justify-center shadow-sm">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </Link>

            {/* Profile Dropdown */}
            <div
              ref={profileMenuRef}
              className="relative flex items-center pl-3 border-l border-stone-200"
            >
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-stone-100"
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
              >
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#400604] to-[#1A0302] border border-[#E1B76F]/30 flex items-center justify-center text-[#E1B76F] text-xs font-serif font-bold shadow-sm">
                  AK
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-[12px] font-bold text-[#1A0302]">
                    ANGKON
                  </p>
                  <p className="text-[10px] uppercase font-semibold tracking-wider text-[#E1B76F]">Administrator</p>
                </div>
                <ChevronRight
                  className={`h-3.5 w-3.5 text-stone-400 hidden sm:block transition-transform duration-200 ${
                    profileMenuOpen ? "rotate-90" : "rotate-0"
                  }`}
                />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-48 rounded-xl border border-[#E1B76F]/30 bg-white p-1.5 shadow-xl">
                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-rose-600 transition hover:bg-rose-50"
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
              className="ml-2 lg:hidden text-stone-500"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </header>

        {/* Content Body */}
        <main className="flex-1 p-5 lg:p-7 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
