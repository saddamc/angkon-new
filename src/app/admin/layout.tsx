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
  BarChart3,
  FolderOpen,
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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout, authFetch } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  // Fetch real pending order count from WooCommerce
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
    fetch("/api/admin/login")
      .then((res) => {
        if (!res.ok) {
          window.location.href = "/admin";
        }
      })
      .catch(() => {
        window.location.href = "/admin";
      });
  }, [pathname]);

  useEffect(() => {
    if (pathname === "/admin") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- polling / reset on route change
    void fetchPendingCount();
    // Refresh every 60 seconds
    const timer = setInterval(() => void fetchPendingCount(), 60_000);
    return () => clearInterval(timer);
  }, [fetchPendingCount, pathname]);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- polling / reset on route change
    setProfileMenuOpen(false);
  }, [pathname]);

  // Login page renders without sidebar.
  if (pathname === "/admin") return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-[#f0f0f8] font-sans">
      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-purple-100 shadow-[2px_0_20px_rgba(123,97,255,0.06)] transition-all duration-300 ease-in-out
          ${sidebarExpanded ? "w-[220px]" : "w-[78px]"}
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Sign out — at the TOP */}
        <button
          onClick={logout}
          className="flex items-center gap-3 h-[56px] px-4 border-b border-purple-50 text-[13px] text-gray-400 hover:text-red-500 hover:bg-red-50/50 transition group flex-shrink-0"
        >
          <LogOut className="h-[18px] w-[18px] flex-shrink-0 group-hover:text-red-500" />
          <span
            className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${
              sidebarExpanded ? "w-auto opacity-100" : "w-0 opacity-0"
            }`}
          >
            Sign Out
          </span>
        </button>

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
                className={`group relative flex items-center gap-3 rounded-xl py-2.5 px-3 text-[13px] font-medium transition-all duration-200 ${
                  active
                    ? "bg-purple-600 text-white shadow-md shadow-purple-200"
                    : "text-gray-500 hover:bg-purple-50 hover:text-purple-600"
                }`}
              >
                <Icon
                  className={`h-[20px] w-[20px] flex-shrink-0 ${
                    active
                      ? "text-white"
                      : "text-gray-400 group-hover:text-purple-500"
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
                {/* Tooltip for collapsed state */}
                {!sidebarExpanded && (
                  <div className="absolute left-full ml-3 hidden group-hover:flex items-center z-[100]">
                    <div className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-white shadow-lg whitespace-nowrap">
                      {label}
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logo/Brand — at the BOTTOM */}
        <div className="flex items-center gap-3 h-[68px] px-4 border-t border-purple-50 flex-shrink-0">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-purple-500 shadow-md">
            <ShoppingCart className="h-5 w-5 text-white" />
          </div>
          <div
            className={`overflow-hidden transition-all duration-300 ${
              sidebarExpanded ? "w-auto opacity-100" : "w-0 opacity-0"
            }`}
          >
            <p className="text-[13px] font-bold text-purple-700 whitespace-nowrap">
              ANGKON
            </p>
            <p className="text-[10px] text-gray-400 whitespace-nowrap">
              Admin Panel
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main Content ─────────────────────────────────── */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarExpanded ? "lg:ml-[220px]" : "lg:ml-[78px]"
        }`}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 h-[68px] bg-white/80 backdrop-blur-lg border-b border-purple-100 flex items-center px-5 gap-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-purple-50 text-gray-500"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Page title */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[13px] text-gray-400">
              <LayoutDashboard className="h-4 w-4 text-purple-500" />
              <span className="text-purple-600 font-bold text-lg">
                Dashboard
              </span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Notifications — shows real pending order count */}
            <Link
              href="/admin/orders?status=pending"
              className="relative p-2.5 rounded-xl bg-purple-50 text-purple-500 hover:bg-purple-100 transition"
              title={`${pendingCount} pending orders`}
            >
              <Bell className="h-[18px] w-[18px]" />
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-0.5 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </Link>

            {/* Profile dropdown */}
            <div
              ref={profileMenuRef}
              className="relative flex items-center pl-3 border-l border-purple-100"
            >
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-purple-50"
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
              >
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                  NB
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-[12px] font-semibold text-gray-700">
                    ANGKON
                  </p>
                  <p className="text-[10px] text-gray-400">Admin</p>
                </div>
                <ChevronRight
                  className={`h-3.5 w-3.5 text-gray-400 hidden sm:block transition-transform ${
                    profileMenuOpen ? "rotate-90" : "rotate-0"
                  }`}
                />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] z-40 w-48 rounded-xl border border-purple-100 bg-white p-1.5 shadow-[0_12px_28px_rgba(31,41,55,0.16)]">
                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-red-600 transition hover:bg-red-50"
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
              className="ml-2 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 p-5 lg:p-7 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
