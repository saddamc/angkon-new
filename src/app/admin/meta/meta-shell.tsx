"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  MetaNavProvider,
  MetaSuiteSidebar,
  useMetaNav,
  META_SIDEBAR_GRADIENT,
  META_CANVAS_GRADIENT,
} from "./meta-nav";

// Re-export centralized CSS gradient tokens matching Meta Business Suite
export { META_SIDEBAR_GRADIENT, META_CANVAS_GRADIENT };

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
          className="fixed inset-0 z-50 lg:hidden flex"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
            onClick={closeMobile}
            aria-hidden="true"
          />

          {/* Slide-out Sidebar Drawer */}
          <div
            className="relative z-50 flex h-full max-w-[280px] w-full flex-col shadow-2xl animate-in slide-in-from-left duration-200"
            style={{
              background: META_SIDEBAR_GRADIENT,
            }}
          >
            <MetaSuiteSidebar isDrawer onClose={closeMobile} />
          </div>
        </div>
      )}

      {/* ── Main Content Area: expands dynamically when sidebar collapses ── */}
      <div
        id="meta-canvas-scroll"
        className={`flex-1 min-w-0 h-full overflow-y-auto ${
          isEventsPage ? "p-2 sm:p-3 lg:p-4" : "p-4 sm:p-6 lg:p-8"
        }`}
        style={{
          background: META_CANVAS_GRADIENT,
          backgroundAttachment: "fixed",
          backgroundColor: "#DFEAF7",
        }}
      >
        <div className={`w-full ${isEventsPage ? "w-full" : "max-w-7xl mx-auto"}`}>{children}</div>
      </div>
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
