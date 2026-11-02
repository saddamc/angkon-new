"use client";

import { useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  HelpCircle,
  ExternalLink,
  X,
  ChevronDown,
  Info,
  ShieldCheck,
  Calculator,
  Database,
  AlertTriangle,
} from "lucide-react";
import {
  METRIC_DEFINITIONS,
  type MetricDefinition,
} from "@/lib/meta/metric-definitions";

export interface InfoPopoverProps {
  title?: string;
  description?: string;
  metricKey?: string;
  metaSource?: {
    label: string;
    url?: string;
    steps?: string[];
  };
  businessImpact?: string;
  whyNeeded?: string;
  calculation?: string;
  dataSource?: string;
  limitations?: string;
  actionableTip?: string;
  align?: "left" | "right";
  iconSize?: "xs" | "sm" | "md";
  triggerClassName?: string;
  badge?: string;
  children?: ReactNode;
}

export function InfoPopover({
  title: propTitle,
  description: propDescription,
  metricKey,
  metaSource: propMetaSource,
  businessImpact: propBusinessImpact,
  whyNeeded: propWhyNeeded,
  calculation: propCalculation,
  dataSource: propDataSource,
  limitations: propLimitations,
  actionableTip,
  iconSize = "sm",
  triggerClassName = "",
  badge: propBadge,
  children,
}: InfoPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 360,
  });

  // Pull from centralized definitions if metricKey is provided
  const def: MetricDefinition | undefined = metricKey
    ? METRIC_DEFINITIONS[metricKey]
    : undefined;

  const title = propTitle || def?.label || "Information";
  const meaning = propDescription || def?.meaning || def?.shortDescription || "";
  const whyItMatters = propBusinessImpact || propWhyNeeded || def?.whyItMatters || "";
  const calculation = propCalculation || def?.calculation || "";
  const dataSource = propDataSource || def?.dataSource || "";
  const limitations = propLimitations || def?.limitations || "";
  const metaSource = propMetaSource || def?.metaSource;
  const docUrl = def?.documentationUrl || metaSource?.url;
  const badge = propBadge || def?.badge;

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popoverWidth = Math.min(360, viewportWidth - 32);

    // Calculate optimal left clamped inside viewport boundaries
    let left = rect.left;
    if (left + popoverWidth > viewportWidth - 16) {
      left = viewportWidth - popoverWidth - 16;
    }
    if (left < 16) {
      left = 16;
    }

    // Calculate optimal top (flip above trigger if not enough space below)
    const estimatedHeight = 320;
    let top = rect.bottom + 8;
    if (top + estimatedHeight > viewportHeight - 16 && rect.top - estimatedHeight > 16) {
      top = rect.top - estimatedHeight - 8;
    }

    setCoords({
      top: Math.round(top),
      left: Math.round(left),
      width: popoverWidth,
    });
  }, []);

  // Update position on open, window resize, or scroll
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, { passive: true });
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Close on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
        setShowTechnicalDetails(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        setShowTechnicalDetails(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const iconDimensions =
    iconSize === "xs"
      ? "h-3 w-3"
      : iconSize === "md"
      ? "h-4 w-4"
      : "h-3.5 w-3.5";

  const hasTechnicalDetails = Boolean(
    calculation || dataSource || limitations || actionableTip || (metaSource?.steps && metaSource.steps.length > 0)
  );

  const popoverContent = isOpen && mounted ? (
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="false"
      style={{
        position: "fixed",
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        width: `${coords.width}px`,
        zIndex: 99999,
      }}
      className="rounded-2xl border border-slate-200/90 bg-white p-4 text-slate-900 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150 font-sans text-xs select-text"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── 1. Popover Header ── */}
      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="text-xs font-bold text-slate-900 leading-tight">
              {title}
            </h4>
            {badge && (
              <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[9.5px] font-bold text-[#1877F2] border border-blue-200/80">
                {badge}
              </span>
            )}
          </div>
          {def?.shortDescription && (
            <p className="text-[10.5px] text-slate-500 font-medium leading-snug">
              {def.shortDescription}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setShowTechnicalDetails(false);
          }}
          className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-lg transition cursor-pointer shrink-0"
          aria-label="Close details"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── 2. The 5 Standard Enterprise Sections ── */}
      <div className="mt-2.5 space-y-2.5">
        {/* Section 1: Meaning */}
        {meaning && (
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Info className="h-2.5 w-2.5 text-blue-500" />
              <span>What it means</span>
            </span>
            <p className="text-[11.5px] text-slate-700 leading-relaxed">
              {meaning}
            </p>
          </div>
        )}

        {/* Section 2: Why it matters */}
        {whyItMatters && (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-700 leading-relaxed space-y-0.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-600" />
              <span>Why it matters</span>
            </div>
            <p>{whyItMatters}</p>
          </div>
        )}

        {/* Collapsible Technical Details (Calculation, Data Source, Limitations) */}
        {hasTechnicalDetails && (
          <div className="pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowTechnicalDetails((prev) => !prev)}
              className="w-full flex items-center justify-between py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
            >
              <span>{showTechnicalDetails ? "Hide calculation & data source" : "View calculation, source & limitations"}</span>
              <ChevronDown className={`h-3 w-3 transition-transform text-slate-400 ${showTechnicalDetails ? "rotate-180" : ""}`} />
            </button>

            {showTechnicalDetails && (
              <div className="mt-2 space-y-2.5 text-[11px] text-slate-600 bg-blue-50/40 p-2.5 rounded-xl border border-blue-100 animate-in fade-in-50 duration-150">
                {/* Section 3: How it is calculated */}
                {calculation && (
                  <div className="space-y-0.5">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1">
                      <Calculator className="h-2.5 w-2.5 text-blue-600" />
                      <span>Calculation formula</span>
                    </span>
                    <p className="text-slate-800 font-mono text-[10.5px] bg-white/80 p-1.5 rounded-lg border border-blue-100/80">
                      {calculation}
                    </p>
                  </div>
                )}

                {/* Section 4: Data Source */}
                {dataSource && (
                  <div className="space-y-0.5">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1">
                      <Database className="h-2.5 w-2.5 text-blue-600" />
                      <span>Source of data</span>
                    </span>
                    <p className="text-slate-700 text-[10.5px]">
                      {dataSource}
                    </p>
                  </div>
                )}

                {/* Section 5: Limitations */}
                {limitations && (
                  <div className="space-y-0.5">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                      <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
                      <span>Important limitations</span>
                    </span>
                    <p className="text-slate-700 text-[10.5px]">
                      {limitations}
                    </p>
                  </div>
                )}

                {/* Integration Steps */}
                {metaSource?.steps && metaSource.steps.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-blue-100">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600">
                      Verification steps
                    </span>
                    <ol className="list-decimal list-inside space-y-0.5 text-slate-700 text-[10.5px]">
                      {metaSource.steps.map((step, idx) => (
                        <li key={idx} className="leading-snug">{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Actionable Tip */}
                {actionableTip && (
                  <div className="pt-1 text-[10.5px] text-slate-700 border-t border-blue-100/80">
                    <strong className="text-[#1877F2]">Tip: </strong>{actionableTip}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 3. Footer with External Documentation Link ── */}
        {(docUrl || metaSource?.url) && (
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium truncate max-w-[200px]" title={metaSource?.label || "Documentation"}>
              {metaSource?.label?.split("→")[0]?.trim() || "Meta Documentation"}
            </span>
            <a
              href={docUrl || metaSource?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1877F2] hover:text-[#166FE5] font-semibold hover:underline inline-flex items-center gap-1 shrink-0 ml-2"
            >
              <span>Learn in Meta</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      {children ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className={triggerClassName}
          aria-expanded={isOpen}
          aria-label={`Learn more about ${title}`}
        >
          {children}
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className={`inline-flex items-center justify-center rounded-full p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-help ${triggerClassName}`}
          aria-expanded={isOpen}
          aria-label={`Learn more about ${title}`}
          title={`Learn more about ${title}`}
        >
          <HelpCircle className={iconDimensions} />
        </button>
      )}

      {mounted && typeof document !== "undefined" && popoverContent
        ? createPortal(popoverContent, document.body)
        : null}
    </div>
  );
}

/**
 * MetricHelpPopover
 *
 * Dedicated shortcut component for rendering contextual help based on metric keys
 * from METRIC_DEFINITIONS.
 *
 * Example: `<MetricHelpPopover metricKey="blended-roas" />`
 */
export function MetricHelpPopover({
  metricKey,
  iconSize = "sm",
  triggerClassName = "",
}: {
  metricKey: string;
  iconSize?: "xs" | "sm" | "md";
  triggerClassName?: string;
}) {
  return (
    <InfoPopover
      metricKey={metricKey}
      iconSize={iconSize}
      triggerClassName={triggerClassName}
    />
  );
}
