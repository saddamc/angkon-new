"use client";

import { useState, useRef, useEffect } from "react";
import { HelpCircle, Check, Info, Calculator, Database, AlertTriangle, ShieldCheck } from "lucide-react";
import { METRIC_DEFINITIONS, type MetricDefinition } from "@/lib/meta/metric-definitions";

export interface MetricHelpInfo {
  title?: string;
  definition?: string;
  meaning?: string;
  dataSource?: string;
  businessImpact?: string;
  calculation?: string;
  limitations?: string;
  actionableTip?: string;
}

export type MetricColorTheme = "sky" | "blue" | "purple" | "emerald" | "amber" | "rose" | "indigo" | "stone";

interface MetricToggleCardProps {
  id: string;
  label: string;
  value: string | number;
  subValue?: string;
  checked?: boolean;
  onToggle?: (id: string, nextChecked: boolean) => void;
  color?: MetricColorTheme;
  metricKey?: string;
  help?: MetricHelpInfo;
  disabled?: boolean;
  className?: string;
}

const COLOR_MAP: Record<
  MetricColorTheme,
  {
    bgActive: string;
    borderActive: string;
    checkboxActive: string;
    textValue: string;
    indicator: string;
  }
> = {
  sky: {
    bgActive: "bg-sky-50/70 border-sky-400 shadow-sky-100",
    borderActive: "border-[#70C5F7]",
    checkboxActive: "bg-[#70C5F7] border-[#70C5F7] text-white",
    textValue: "text-sky-950",
    indicator: "bg-[#70C5F7]",
  },
  blue: {
    bgActive: "bg-blue-50/70 border-blue-400 shadow-blue-100",
    borderActive: "border-blue-500",
    checkboxActive: "bg-blue-600 border-blue-600 text-white",
    textValue: "text-blue-900",
    indicator: "bg-blue-600",
  },
  purple: {
    bgActive: "bg-purple-50/70 border-purple-400 shadow-purple-100",
    borderActive: "border-purple-500",
    checkboxActive: "bg-purple-600 border-purple-600 text-white",
    textValue: "text-purple-900",
    indicator: "bg-purple-600",
  },
  emerald: {
    bgActive: "bg-emerald-50/70 border-emerald-400 shadow-emerald-100",
    borderActive: "border-emerald-500",
    checkboxActive: "bg-emerald-600 border-emerald-600 text-white",
    textValue: "text-emerald-900",
    indicator: "bg-emerald-600",
  },
  amber: {
    bgActive: "bg-amber-50/70 border-amber-400 shadow-amber-100",
    borderActive: "border-amber-500",
    checkboxActive: "bg-amber-600 border-amber-600 text-white",
    textValue: "text-amber-900",
    indicator: "bg-amber-600",
  },
  rose: {
    bgActive: "bg-rose-50/70 border-rose-400 shadow-rose-100",
    borderActive: "border-rose-500",
    checkboxActive: "bg-rose-600 border-rose-600 text-white",
    textValue: "text-rose-900",
    indicator: "bg-rose-600",
  },
  indigo: {
    bgActive: "bg-indigo-50/70 border-indigo-400 shadow-indigo-100",
    borderActive: "border-indigo-500",
    checkboxActive: "bg-indigo-600 border-indigo-600 text-white",
    textValue: "text-indigo-900",
    indicator: "bg-indigo-600",
  },
  stone: {
    bgActive: "bg-stone-100/80 border-stone-400 shadow-stone-100",
    borderActive: "border-stone-500",
    checkboxActive: "bg-stone-800 border-stone-800 text-white",
    textValue: "text-stone-900",
    indicator: "bg-stone-800",
  },
};

export function MetricToggleCard({
  id,
  label,
  value,
  subValue,
  checked = false,
  onToggle,
  color = "blue",
  metricKey,
  help: propHelp,
  disabled = false,
  className = "",
}: MetricToggleCardProps) {
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const colors = COLOR_MAP[color];

  // Resolve 5-part definition from METRIC_DEFINITIONS or propHelp
  const def: MetricDefinition | undefined = metricKey ? METRIC_DEFINITIONS[metricKey] : undefined;

  const title = propHelp?.title || def?.label || label;
  const meaning = propHelp?.meaning || propHelp?.definition || def?.meaning || def?.shortDescription || "";
  const whyItMatters = propHelp?.businessImpact || def?.whyItMatters || "";
  const calculation = propHelp?.calculation || def?.calculation || "";
  const dataSource = propHelp?.dataSource || def?.dataSource || "";
  const limitations = propHelp?.limitations || def?.limitations || "";
  const actionableTip = propHelp?.actionableTip;

  const hasHelp = Boolean(def || propHelp);

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    if (!showPopover) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPopover(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showPopover]);

  const handleCardClick = (e: React.MouseEvent) => {
    // If clicking directly on or inside the help button, don't toggle
    if ((e.target as HTMLElement).closest("[data-help-trigger]")) {
      return;
    }
    if (!disabled && onToggle) {
      onToggle(id, !checked);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`relative group rounded-xl border p-3.5 sm:p-4 transition-all duration-150 select-none cursor-pointer ${
        checked
          ? `${colors.bgActive} border-2 shadow-xs`
          : "bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs"
      } ${disabled ? "opacity-60 cursor-not-allowed" : ""} ${className}`}
    >
      {/* Top color indicator line when active */}
      {checked && (
        <div
          className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl ${colors.indicator}`}
          aria-hidden="true"
        />
      )}

      {/* Header: Checkbox + Label + (?) Help Trigger */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <label className="flex items-center gap-2 cursor-pointer min-w-0">
          <div
            className={`h-4 w-4 rounded-[4px] border flex items-center justify-center transition ${
              checked
                ? colors.checkboxActive
                : "border-slate-300 bg-white group-hover:border-slate-400"
            }`}
          >
            {checked && <Check className="h-3 w-3 stroke-[3]" />}
          </div>
          <span
            className={`text-xs font-semibold truncate ${
              checked ? "text-slate-900" : "text-slate-600"
            }`}
          >
            {label}
          </span>
        </label>

        {/* Question Mark Help Icon */}
        {hasHelp && (
          <div className="relative" ref={popoverRef} data-help-trigger>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowPopover((prev) => !prev);
              }}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-100 transition cursor-help"
              title={`Learn more about ${label}`}
              aria-label={`Learn more about ${label}`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>

            {/* Contextual Popover (5 Explicit Enterprise Sections) */}
            {showPopover && (
              <div
                role="dialog"
                className="absolute right-0 top-full mt-2 w-72 sm:w-80 p-3.5 rounded-2xl bg-white text-slate-900 text-xs shadow-2xl border border-slate-200/90 z-50 animate-in fade-in-0 zoom-in-95 duration-150 space-y-2 select-text"
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span className="font-bold text-slate-900 text-xs">{title}</span>
                  </div>
                  {def?.badge && (
                    <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {def.badge}
                    </span>
                  )}
                </div>

                {/* Section 1: Meaning */}
                {meaning && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      What it means
                    </span>
                    <p className="text-slate-600 leading-relaxed text-[11px]">{meaning}</p>
                  </div>
                )}

                {/* Section 2: Why it matters */}
                {whyItMatters && (
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-700 leading-relaxed">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-0.5">
                      <ShieldCheck className="h-2.5 w-2.5 text-emerald-600" />
                      <span>Why it matters</span>
                    </div>
                    <p>{whyItMatters}</p>
                  </div>
                )}

                {/* Section 3: Calculation formula */}
                {calculation && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5 flex items-center gap-1">
                      <Calculator className="h-2.5 w-2.5 text-blue-600" />
                      <span>Calculation</span>
                    </span>
                    <p className="text-slate-800 font-mono text-[10.5px] bg-blue-50/50 p-1.5 rounded-lg border border-blue-100">
                      {calculation}
                    </p>
                  </div>
                )}

                {/* Section 4: Data Source */}
                {dataSource && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5 flex items-center gap-1">
                      <Database className="h-2.5 w-2.5 text-blue-600" />
                      <span>Data Source</span>
                    </span>
                    <p className="text-slate-600 text-[10.5px] leading-snug">
                      {dataSource}
                    </p>
                  </div>
                )}

                {/* Section 5: Limitations */}
                {limitations && (
                  <div className="pt-1 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-0.5 flex items-center gap-1">
                      <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
                      <span>Limitations</span>
                    </span>
                    <p className="text-slate-600 text-[10.5px] leading-snug">
                      {limitations}
                    </p>
                  </div>
                )}

                {/* Optimization Tip */}
                {actionableTip && (
                  <div className="pt-1 text-[10.5px] text-slate-600 border-t border-slate-100">
                    <strong className="text-blue-600">Tip: </strong>{actionableTip}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="flex items-baseline justify-between gap-2">
        <div
          className={`text-xl sm:text-2xl font-bold tracking-tight font-mono ${
            checked ? colors.textValue : "text-slate-800"
          }`}
        >
          {value}
        </div>
      </div>

      {/* Optional Sub-value / Trend */}
      {subValue && (
        <div className="text-[11px] text-slate-500 mt-1 truncate">{subValue}</div>
      )}
    </div>
  );
}
