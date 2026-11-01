"use client";

import { useEffect, type ReactNode } from "react";
import {
  MetaNavProvider,
  MetaSuiteSidebar,
  useMetaNav,
} from "./meta-nav";

function MetaSuiteLayoutInner({ children }: { children: ReactNode }) {
  const { isMobileOpen, closeMobile } = useMetaNav();

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
    <div className="relative flex flex-col lg:flex-row h-full w-full bg-[#f8fafc] text-stone-900 font-sans antialiased overflow-hidden">
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
          <div className="relative z-50 flex h-full max-w-[280px] w-full flex-col bg-[#f0f4f9] shadow-2xl animate-in slide-in-from-left duration-200">
            <MetaSuiteSidebar isDrawer onClose={closeMobile} />
          </div>
        </div>
      )}

      {/* ── Main Content Area: expands dynamically when sidebar collapses ── */}
      <div className="flex-1 min-w-0 h-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="w-full max-w-7xl mx-auto">{children}</div>
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
