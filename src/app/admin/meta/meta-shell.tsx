"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Layers,
  Activity,
  BarChart3,
  ShoppingBag,
  MoreHorizontal,
} from "lucide-react";
import {
  MetaNavProvider,
  MetaSuiteSidebar,
  useMetaNav,
  isRouteActive,
  META_SIDEBAR_GRADIENT,
  META_CANVAS_GRADIENT,
} from "./meta-nav";

// Re-export centralized CSS gradient tokens matching Meta Business Suite
export { META_SIDEBAR_GRADIENT, META_CANVAS_GRADIENT };

// ── Primary routes shown in the mobile bottom tab bar (4 primary + "More") ──
const BOTTOM_TABS = [
  { href: "/admin/meta", label: "Overview", icon: Layers, exact: true },
  { href: "/admin/meta/events", label: "Events", icon: Activity, exact: false },
  { href: "/admin/meta/ads", label: "Ads", icon: BarChart3, exact: false },
  { href: "/admin/meta/catalog", label: "Catalog", icon: ShoppingBag, exact: false },
] as const;

// ── Mobile bottom tab bar ──
function MetaMobileBottomBar() {
  const pathname = usePathname();
  const { openMobile, isMobileOpen } = useMetaNav();

  // "More" is highlighted when the active route is not one of the 4 primary tabs
  const isPrimaryTabActive = BOTTOM_TABS.some((t) =>
    t.exact ? pathname === t.href : pathname.startsWith(t.href)
  );

  // If the full mobile drawer is open, hide the bottom bar so it never causes a double layer
  if (isMobileOpen) return null;

  return (
    <nav
      aria-label="Meta Marketing mobile navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 shadow-[0_-4px_24px_rgba(30,41,59,0.10)]"
      style={{ background: META_SIDEBAR_GRADIENT }}
    >
      <div className="flex items-stretch h-16">
        {BOTTOM_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.exact
            ? pathname === tab.href
            : isRouteActive(pathname, { href: tab.href, label: tab.label, icon: Icon });
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold tracking-wide transition-colors select-none ${
                active ? "text-blue-700" : "text-slate-500 hover:text-slate-800"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={`h-5 w-5 transition-colors ${
                  active ? "text-blue-700" : "text-slate-400"
                }`}
                aria-hidden="true"
              />
              <span>{tab.label}</span>
            </Link>
          );
        })}

        {/* "More" — opens the full sidebar drawer */}
        <button
          type="button"
          onClick={openMobile}
          aria-label="More Meta Marketing routes"
          aria-expanded={isMobileOpen}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold tracking-wide transition-colors select-none cursor-pointer ${
            !isPrimaryTabActive ? "text-blue-700" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <MoreHorizontal
            className={`h-5 w-5 ${!isPrimaryTabActive ? "text-blue-700" : "text-slate-400"}`}
            aria-hidden="true"
          />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}

function MetaSuiteLayoutInner({ children }: { children: ReactNode }) {
  const { isMobileOpen, closeMobile } = useMetaNav();
  const pathname = usePathname();
  const isEventsPage = pathname?.startsWith("/admin/meta/events");

  // Close mobile drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileOpen) {
        closeMobile();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileOpen, closeMobile]);

  // Lock body scroll when mobile drawer is open to prevent double scroll/layer effect
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  return (
    <div
      className="relative flex flex-col lg:flex-row h-full w-full text-slate-900 font-sans antialiased overflow-hidden"
      style={{
        background: META_CANVAS_GRADIENT,
      }}
    >
      {/* ── Desktop Persistent Sidebar (Expandable: 250px / Collapsible: 68px) ── */}
      <div className="hidden lg:flex shrink-0 h-full z-20">
        <MetaSuiteSidebar />
      </div>

      {/* ── Mobile & Tablet Drawer with Accessible Backdrop ── */}
      {isMobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Meta Marketing Suite Navigation Menu"
          className="fixed inset-0 z-50 lg:hidden"
        >
          {/* Full-screen backdrop — tapping it closes the drawer */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity animate-in fade-in-0 duration-200"
            onClick={closeMobile}
            aria-hidden="true"
          />

          {/* Slide-out drawer: single clean surface, fills 280px with no outer padding or duplicate background */}
          <div className="relative z-10 flex h-full w-[280px] max-w-[85vw] shadow-2xl animate-in slide-in-from-left duration-200">
            <MetaSuiteSidebar isDrawer onClose={closeMobile} />
          </div>
        </div>
      )}

      {/* ── Main Content Area ── */}
      {/* pb-20 on mobile so content clears the fixed bottom tab bar */}
      <div
        id="meta-canvas-scroll"
        className={`flex-1 min-w-0 h-full overflow-y-auto ${
          isEventsPage ? "p-2 sm:p-3 lg:p-4" : "p-4 sm:p-6 lg:p-8"
        } pb-20 lg:pb-8`}
        style={{
          background: META_CANVAS_GRADIENT,
          backgroundAttachment: "fixed",
          backgroundColor: "#DFEAF7",
        }}
      >
        <div className={`w-full ${isEventsPage ? "w-full" : "max-w-7xl mx-auto"}`}>
          {children}
        </div>
      </div>

      {/* ── Mobile Bottom Tab Bar (hidden on lg+) ── */}
      <MetaMobileBottomBar />
    </div>
  );
}

export function MetaSuiteShell({ children }: { children: ReactNode }) {
  return (
    <MetaNavProvider>
      <MetaSuiteLayoutInner>{children}</MetaSuiteLayoutInner>
    </MetaNavProvider>
  );
}
