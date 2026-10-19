"use client";

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { X, Ruler, Check, Info, Sparkles } from "lucide-react";
import {
  getProductSizeChart,
  isMultiSectionSizeChart,
  MultiSectionSizeChart,
  SizeChartData,
} from "@/utils/size-chart";

export type MeasurementUnit = "in" | "cm";

export interface SizeMeasurementRow {
  area: string;
  s: string;
  m: string;
  l: string;
  xl: string;
  guide: string;
}

export const READY_TO_WEAR_SIZE_DATA: SizeMeasurementRow[] = [
  {
    area: "SHOULDER",
    s: "14",
    m: "14.5",
    l: "15",
    xl: "15.5",
    guide: "Measure across from one shoulder seam to the other across the back.",
  },
  {
    area: "CHEST",
    s: "19",
    m: "21",
    l: "23",
    xl: "25",
    guide: "Measure straight across the bust from armpit to armpit (flat measurement).",
  },
  {
    area: "WAIST",
    s: "18",
    m: "20",
    l: "22",
    xl: "24",
    guide: "Measure straight across the narrowest natural waistline of the kameez.",
  },
  {
    area: "HIP",
    s: "21",
    m: "23",
    l: "24.5",
    xl: "26",
    guide: "Measure straight across the fullest part of the hip line / chaak start.",
  },
  {
    area: "DAMAN",
    s: "24",
    m: "26",
    l: "27.5",
    xl: "29",
    guide: "Measure straight across the bottom opening / hemline flare sweep of the kameez.",
  },
  {
    area: "LENGTH",
    s: "37",
    m: "37/38",
    l: "38/39",
    xl: "40",
    guide: "Measure straight from the highest shoulder point down to the bottom hemline.",
  },
  {
    area: "TROUSER",
    s: "38",
    m: "38/39",
    l: "39",
    xl: "40",
    guide: "Measure along the outseam from waistband down to bottom ankle hem.",
  },
];

/**
 * Accurate conversion utility: 1 inch = 2.54 cm
 * Formats single values or ranges like "37/38" cleanly.
 */
export function formatMeasurement(value: string, unit: MeasurementUnit): string {
  if (!value || value === "-") return "-";
  const trimmed = value.trim();

  // If value is non-numeric text (e.g. "According to Design" or "Same as shirt size")
  if (isNaN(Number(trimmed)) && !trimmed.includes("/")) {
    return trimmed;
  }

  if (unit === "in") {
    return `${trimmed}″`;
  }

  // Handle ranges like "37/38"
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/").map((part) => {
      const num = parseFloat(part.trim());
      if (isNaN(num)) return part;
      const cm = num * 2.54;
      const rounded = Math.round(cm * 10) / 10;
      return rounded.toString();
    });
    return `${parts.join("/")} cm`;
  }

  const num = parseFloat(trimmed);
  if (isNaN(num)) return trimmed;
  const cm = num * 2.54;
  const rounded = Math.round(cm * 10) / 10;
  return `${rounded} cm`;
}

/* ── Native Garment Silhouette Component (Angkon Heritage Gold on Burgundy) ── */
function GarmentSilhouette() {
  return (
    <div className="flex flex-col items-center justify-between h-full bg-[#340402] p-4 text-white rounded-xl border border-[#E1B76F]/20 shadow-inner">
      <div className="w-full flex flex-col items-center py-2">
        <svg
          viewBox="0 0 160 320"
          className="w-28 sm:w-32 h-auto max-h-[280px] text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Kameez / Kurti Dress Silhouette */}
          <path
            d="M 50 15 C 60 25, 100 25, 110 15 L 128 22 L 142 55 L 126 62 L 122 42 L 122 105 C 114 125, 126 185, 134 210 L 26 210 C 34 185, 46 125, 38 105 L 38 42 L 34 62 L 18 55 L 32 22 Z"
            fill="currentColor"
            fillOpacity="0.88"
          />
          {/* Subtle Accent Belt / Waistline Indicator */}
          <line x1="38" y1="108" x2="122" y2="108" stroke="#400604" strokeWidth="2" strokeDasharray="3,2" />
          {/* Daman Indicator Line */}
          <line x1="26" y1="209" x2="134" y2="209" stroke="#400604" strokeWidth="2.5" />
          {/* Trouser Pants Silhouette */}
          <path
            d="M 46 216 L 114 216 L 112 300 L 92 300 L 80 238 L 68 300 L 48 300 Z"
            fill="currentColor"
            fillOpacity="0.8"
          />
        </svg>

        <span className="text-[10px] tracking-widest uppercase font-semibold text-white/70 mt-2">
          Kameez & Trouser
        </span>
      </div>

      {/* Brand Monogram */}
      <div className="text-center pt-3 border-t border-[#E1B76F]/25 w-full">
        <span className="font-heading tracking-[0.25em] text-[11px] font-bold uppercase text-white">
          ANGKON
        </span>
        <p className="text-[9px] tracking-wider uppercase text-white/70">
          Royal Heritage
        </p>
      </div>
    </div>
  );
}

const SIZE_LABELS: Record<string, { label: string; sub: string }> = {
  XS: { label: "X-Small", sub: "XS" },
  S: { label: "Small", sub: "S" },
  M: { label: "Medium", sub: "M" },
  L: { label: "Large", sub: "L" },
  XL: { label: "X-Large", sub: "XL" },
  XXL: { label: "2X-Large", sub: "XXL" },
  "3XL": { label: "3X-Large", sub: "3XL" },
};

export interface ReadyToWearSizeGuideProps {
  product?: {
    id?: number;
    name?: string;
    slug?: string;
    meta_data?: Array<{ key: string; value?: unknown }>;
  } | null;
  customChart?: MultiSectionSizeChart | SizeChartData | null;
  selectedSize?: string;
  onSelectSize?: (size: string) => void;
}

export function ReadyToWearSizeGuideContent({
  product,
  customChart,
  selectedSize,
  onSelectSize,
}: ReadyToWearSizeGuideProps) {
  const [activeTab, setActiveTab] = useState<"table" | "guide">("table");
  const [unit, setUnit] = useState<MeasurementUnit>("in");

  const resolvedChart = useMemo(() => {
    return customChart ?? (product ? getProductSizeChart(product) : null);
  }, [customChart, product]);

  const isSectioned = isMultiSectionSizeChart(resolvedChart);

  const sizes = useMemo(() => {
    if (isSectioned) {
      return resolvedChart.sizes.map((k) => ({
        key: k,
        label: SIZE_LABELS[k.toUpperCase()]?.label || k,
        sub: k,
      }));
    }
    return [
      { key: "S", label: "Small", sub: "S" },
      { key: "M", label: "Medium", sub: "M" },
      { key: "L", label: "Large", sub: "L" },
      { key: "XL", label: "XL", sub: "XL" },
    ];
  }, [isSectioned, resolvedChart]);

  const normalizedSelectedSize = selectedSize?.toUpperCase().trim();

  return (
    <div className="space-y-5 text-white">
      {/* ── Header Banner & Controls ── */}
      <div className="rounded-xl border border-[#E1B76F]/30 bg-[#340402] p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#400604] px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase text-white border border-[#E1B76F]/40">
                <Sparkles className="h-3 w-3 text-white" />
                Angkon Heritage
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
                {isSectioned ? "Custom Ensemble Size Chart" : "Ready-to-Wear (Stitched)"}
              </span>
            </div>
            <h3 id="size-guide-modal-title" className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {isSectioned && product?.name ? product.name : "Ready-to-Wear Size Guide"}
            </h3>
            <p className="mt-1 text-xs sm:text-[13px] text-white/90 leading-relaxed max-w-xl">
              {isSectioned
                ? "Accurate measurements for Shirt, Maxi & Trouser (laid flat). All measurements shown in inches or centimeters."
                : "Standard garment measurements for Stitched Kurti, 2-Piece, and 3-Piece Pakistani & Bangladeshi suits."}
            </p>
          </div>

          {/* Unit Toggle & View Tabs */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center shrink-0">
            {/* Unit Toggle: Inches vs Centimeters */}
            <div
              className="inline-flex items-center rounded-lg border border-[#E1B76F]/30 bg-[#260302] p-1 shadow-inner"
              role="radiogroup"
              aria-label="Measurement units"
            >
              <button
                type="button"
                role="radio"
                aria-checked={unit === "in"}
                onClick={() => setUnit("in")}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  unit === "in"
                    ? "bg-[#E1B76F] text-[#400604] shadow font-extrabold"
                    : "text-white/70 hover:text-[#E1B76F]"
                }`}
              >
                Inches (in)
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={unit === "cm"}
                onClick={() => setUnit("cm")}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  unit === "cm"
                    ? "bg-[#E1B76F] text-[#400604] shadow font-extrabold"
                    : "text-white/70 hover:text-[#E1B76F]"
                }`}
              >
                Centimeters (cm)
              </button>
            </div>

            {/* Tab Switcher: Table vs Guide */}
            <div className="inline-flex items-center rounded-lg border border-[#E1B76F]/30 bg-[#260302] p-1">
              <button
                type="button"
                onClick={() => setActiveTab("table")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  activeTab === "table"
                    ? "bg-[#400604] text-white shadow-sm border border-[#E1B76F]/50 font-bold"
                    : "text-white/70 hover:text-[#E1B76F]"
                }`}
              >
                Size Table
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("guide")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  activeTab === "guide"
                    ? "bg-[#400604] text-white shadow-sm border border-[#E1B76F]/50 font-bold"
                    : "text-white/70 hover:text-[#E1B76F]"
                }`}
              >
                How to Measure
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── VIEW 1: SIZE CHART TABLE WITH INTEGRATED SILHOUETTE ── */}
      {activeTab === "table" && (
        <div className="space-y-3.5">
          {/* Mobile Horizontal Scroll Hint */}
          <div className="flex items-center justify-between text-[11px] text-white/80 md:hidden px-1">
            <span className="flex items-center gap-1">
              <Info className="h-3.5 w-3.5 text-white" />
              Swipe horizontally to see all size columns
            </span>
            <span className="font-semibold uppercase tracking-wider text-white">
              Unit: {unit === "in" ? "Inches" : "CM"}
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#E1B76F]/30 shadow-md flex flex-col md:flex-row bg-[#2b0403]">
            {/* Left Column: Silhouette Graphic (Desktop & Tablet) */}
            <div className="hidden lg:flex lg:w-44 shrink-0 p-3 bg-[#400604]/40 border-r border-[#E1B76F]/20">
              <GarmentSilhouette />
            </div>

            {/* Right Column: Measurement Table with Horizontal Scroll */}
            <div className="flex-1 overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-sm border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-[#E1B76F]/25 bg-[#400604] text-white">
                    <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider sticky left-0 z-10 bg-[#400604] shadow-[1px_0_4px_rgba(0,0,0,0.3)]">
                      Area ({unit === "in" ? "Inches" : "cm"})
                    </th>
                    {sizes.map((s) => {
                      const isSelected = normalizedSelectedSize === s.key;
                      return (
                        <th
                          key={s.key}
                          className={`py-3.5 px-3 text-center transition-all ${
                            isSelected
                              ? "bg-[#E1B76F]/20 text-white font-black border-x border-[#E1B76F]/40"
                              : "text-white"
                          }`}
                        >
                          <div className="text-[11px] font-semibold tracking-wider uppercase opacity-80">
                            {s.label}
                          </div>
                          <div className="text-base font-black tracking-wide mt-0.5">
                            {s.sub}
                          </div>
                          {onSelectSize && (
                            <button
                              type="button"
                              onClick={() => onSelectSize(s.key)}
                              className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition cursor-pointer ${
                                isSelected
                                  ? "bg-[#E1B76F] text-[#400604] shadow font-extrabold ring-1 ring-[#E1B76F]"
                                  : "bg-white/10 text-white hover:bg-[#E1B76F] hover:text-[#400604]"
                              }`}
                              aria-pressed={isSelected}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="h-3 w-3 stroke-[3]" /> Selected
                                </>
                              ) : (
                                "Select"
                              )}
                            </button>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1B76F]/15 font-medium text-white/90">
                  {isSectioned ? (
                    resolvedChart.sections.map((section) => (
                      <Fragment key={section.title}>
                        {/* Section Header Row */}
                        <tr className="bg-[#400604] border-t-2 border-b border-[#E1B76F]/30">
                          <td
                            colSpan={sizes.length + 1}
                            className="py-2.5 px-4 font-black text-xs sm:text-sm tracking-widest uppercase text-[#E1B76F] shadow-inner"
                          >
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-[#E1B76F]" />
                              <span>{section.title}</span>
                            </div>
                          </td>
                        </tr>

                        {/* Section Rows */}
                        {section.rows.map((row, rowIdx) => (
                          <tr
                            key={`${section.title}-${row.number ?? row.area}`}
                            className={`transition-colors hover:bg-[#400604]/80 ${
                              rowIdx % 2 === 0 ? "bg-[#340402]" : "bg-[#280302]"
                            }`}
                          >
                            <td className="py-3 px-4 font-bold text-xs tracking-wider text-white border-r border-[#E1B76F]/15 sticky left-0 z-10 bg-inherit shadow-[1px_0_4px_rgba(0,0,0,0.3)] whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {row.number ? (
                                  <span className="inline-block w-4 text-white/50 text-[11px] font-mono">
                                    {row.number}
                                  </span>
                                ) : null}
                                <span>{row.area}</span>
                              </div>
                            </td>

                            {row.colSpanText ? (
                              <td
                                colSpan={sizes.length}
                                className="py-3 px-4 text-center text-xs sm:text-sm font-semibold tracking-wide italic text-[#E1B76F] bg-[#400604]/50 border-r border-[#E1B76F]/15"
                              >
                                {row.colSpanText}
                              </td>
                            ) : (
                              sizes.map((s) => {
                                const isSelected = normalizedSelectedSize === s.key;
                                const val = row.values?.[s.key] ?? "-";
                                return (
                                  <td
                                    key={s.key}
                                    className={`py-3 px-3 text-center text-sm font-semibold border-r border-[#E1B76F]/15 transition-colors ${
                                      isSelected
                                        ? "bg-[#E1B76F]/20 text-white font-bold border-x border-[#E1B76F]/40"
                                        : ""
                                    }`}
                                  >
                                    {formatMeasurement(val, unit)}
                                  </td>
                                );
                              })
                            )}
                          </tr>
                        ))}
                      </Fragment>
                    ))
                  ) : (
                    READY_TO_WEAR_SIZE_DATA.map((row, idx) => (
                      <tr
                        key={row.area}
                        className={`transition-colors hover:bg-[#400604]/80 ${
                          idx % 2 === 0 ? "bg-[#340402]" : "bg-[#280302]"
                        }`}
                      >
                        {/* Area label */}
                        <td className="py-3 px-4 font-bold text-xs tracking-wider text-white border-r border-[#E1B76F]/15 sticky left-0 z-10 bg-inherit shadow-[1px_0_4px_rgba(0,0,0,0.3)]">
                          <div className="flex flex-col">
                            <span>{row.area}</span>
                          </div>
                        </td>

                        {/* Small */}
                        <td
                          className={`py-3 px-3 text-center text-sm font-semibold border-r border-[#E1B76F]/15 transition-colors ${
                            normalizedSelectedSize === "S"
                              ? "bg-[#E1B76F]/20 text-white font-bold border-x border-[#E1B76F]/40"
                              : ""
                          }`}
                        >
                          {formatMeasurement(row.s, unit)}
                        </td>

                        {/* Medium */}
                        <td
                          className={`py-3 px-3 text-center text-sm font-semibold border-r border-[#E1B76F]/15 transition-colors ${
                            normalizedSelectedSize === "M"
                              ? "bg-[#E1B76F]/20 text-white font-bold border-x border-[#E1B76F]/40"
                              : ""
                          }`}
                        >
                          {formatMeasurement(row.m, unit)}
                        </td>

                        {/* Large */}
                        <td
                          className={`py-3 px-3 text-center text-sm font-semibold border-r border-[#E1B76F]/15 transition-colors ${
                            normalizedSelectedSize === "L"
                              ? "bg-[#E1B76F]/20 text-white font-bold border-x border-[#E1B76F]/40"
                              : ""
                          }`}
                        >
                          {formatMeasurement(row.l, unit)}
                        </td>

                        {/* XL */}
                        <td
                          className={`py-3 px-3 text-center text-sm font-semibold transition-colors ${
                            normalizedSelectedSize === "XL"
                              ? "bg-[#E1B76F]/20 text-white font-bold border-x border-[#E1B76F]/40"
                              : ""
                          }`}
                        >
                          {formatMeasurement(row.xl, unit)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table Footer Reassurance */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs text-white/75 pt-1 px-1">
            <p className="flex items-center gap-1.5 leading-relaxed">
              <Info className="h-3.5 w-3.5 text-white shrink-0" />
              <span>
                Measurements reflect the actual stitched garment laid flat. We recommend choosing a size that allows 1–2 inches of ease over your body measurements.
              </span>
            </p>
            <span className="font-semibold text-white tracking-wide shrink-0">
              Angkon • Luxury RTW
            </span>
          </div>
        </div>
      )}

      {/* ── VIEW 2: HOW TO MEASURE GUIDE ── */}
      {activeTab === "guide" && (
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {isSectioned ? (
              resolvedChart.sections.flatMap((section) =>
                section.rows
                  .filter((r) => r.guide)
                  .map((item) => (
                    <div
                      key={`${section.title}-${item.number ?? item.area}`}
                      className="flex items-start gap-3 rounded-xl border border-[#E1B76F]/25 bg-[#340402] p-3.5 shadow-sm transition hover:border-[#E1B76F]/40"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#400604] text-xs font-extrabold text-[#E1B76F] border border-[#E1B76F]/40 shadow-xs">
                        {item.number ? item.number : item.area.slice(0, 2)}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#400604] text-[#E1B76F]/90 border border-[#E1B76F]/20">
                            {section.title}
                          </span>
                          <h4 className="text-sm font-bold text-white tracking-wide">
                            {item.area}
                          </h4>
                        </div>
                        <p className="mt-1 text-xs text-white/90 leading-relaxed">
                          {item.guide}
                        </p>
                      </div>
                    </div>
                  ))
              )
            ) : (
              READY_TO_WEAR_SIZE_DATA.map((item) => (
                <div
                  key={item.area}
                  className="flex items-start gap-3 rounded-xl border border-[#E1B76F]/25 bg-[#340402] p-3.5 shadow-sm transition hover:border-[#E1B76F]/40"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#400604] text-xs font-extrabold text-white border border-[#E1B76F]/40 shadow-xs">
                    {item.area.slice(0, 2)}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-wide">
                      {item.area}
                    </h4>
                    <p className="mt-1 text-xs text-white/90 leading-relaxed">
                      {item.guide}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="rounded-xl border border-[#E1B76F]/20 bg-[#260302] p-4 text-xs text-white/90 flex items-start gap-3">
            <Info className="h-4 w-4 text-white shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-white block font-bold">Pro Sizing Advice:</strong>
              <p className="leading-relaxed">
                For a flattering fit in Pakistani and Bangladeshi ready-to-wear ensembles, compare these measurements against a well-fitting kameez or kurta you already own. If your bust or hip measurement falls between two sizes, order the larger size.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReadyToWearSizeGuideModal({
  isOpen,
  onClose,
  product,
  customChart,
  selectedSize,
  onSelectSize,
}: {
  isOpen: boolean;
  onClose: () => void;
  product?: {
    id?: number;
    name?: string;
    slug?: string;
    meta_data?: Array<{ key: string; value?: unknown }>;
  } | null;
  customChart?: MultiSectionSizeChart | SizeChartData | null;
  selectedSize?: string;
  onSelectSize?: (size: string) => void;
}) {
  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="size-guide-modal-title"
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog (Desktop) / Full Drawer (Mobile) */}
      <div className="relative z-10 w-full sm:max-w-3xl max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-[#E1B76F]/35 bg-[#400604] shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-white overflow-hidden">
        
        {/* Mobile Drag Handle */}
        <div className="w-full flex justify-center pt-2 pb-1 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-[#E1B76F]/30" />
        </div>

        {/* Modal Top Header Bar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#E1B76F]/20 shrink-0">
          <div className="flex items-center gap-2">
            <Ruler className="h-5 w-5 text-white" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Garment Size Guide
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-[#340402] text-white border border-[#E1B76F]/40 hover:bg-[#E1B76F] hover:text-[#400604] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E1B76F]"
            aria-label="Close size guide"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <ReadyToWearSizeGuideContent
            product={product}
            customChart={customChart}
            selectedSize={selectedSize}
            onSelectSize={(size) => {
              if (onSelectSize) onSelectSize(size);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}

export const SIZE_CHART_ROWS = [
  { size: "S", shoulder: "14", chest: "19", waist: "18", hip: "21", daman: "24", length: "37", trouser: "38" },
  { size: "M", shoulder: "14.5", chest: "21", waist: "20", hip: "23", daman: "26", length: "37/38", trouser: "38/39" },
  { size: "L", shoulder: "15", chest: "23", waist: "22", hip: "24.5", daman: "27.5", length: "38/39", trouser: "39" },
  { size: "XL", shoulder: "15.5", chest: "25", waist: "24", hip: "26", daman: "29", length: "40", trouser: "40" },
];

export function ReadyToWearSizeGuideMiniTable({
  selectedSize,
  onOpenModal,
  onSelectSize,
}: {
  selectedSize?: string;
  onOpenModal?: () => void;
  onSelectSize?: (size: string) => void;
}) {
  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-[#E1B76F]/25 bg-[#340402] shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#400604] border-b border-[#E1B76F]/30 text-white">
        <div className="flex items-center gap-1.5">
          <Ruler className="h-4 w-4 text-white" />
          <span className="text-xs font-bold text-white uppercase tracking-wide">
            Ready-to-Wear Size Reference (in inches)
          </span>
        </div>
        {onOpenModal && (
          <button
            type="button"
            onClick={onOpenModal}
            className="text-xs font-semibold text-[#E1B76F] hover:text-[#f3cb87] underline underline-offset-2 transition cursor-pointer"
          >
            Full Guide ↗
          </button>
        )}
      </div>

      {/* Responsive table */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-xs text-center border-collapse min-w-[420px]">
          <thead>
            <tr className="bg-[#400604]/90 text-white font-semibold border-b border-[#E1B76F]/20">
              <th className="py-2.5 px-3 text-left font-bold text-white w-16">Size</th>
              <th className="py-2.5 px-2">Shoulder</th>
              <th className="py-2.5 px-2">Chest</th>
              <th className="py-2.5 px-2">Waist</th>
              <th className="py-2.5 px-2">Hip</th>
              <th className="py-2.5 px-2">Daman</th>
              <th className="py-2.5 px-2">Length</th>
              <th className="py-2.5 px-2">Trouser</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1B76F]/15 font-medium text-white/90 bg-[#340402]">
            {SIZE_CHART_ROWS.map((row) => {
              const isSelected = selectedSize?.toUpperCase().trim() === row.size;
              return (
                <tr
                  key={row.size}
                  onClick={() => onSelectSize && onSelectSize(row.size)}
                  className={`transition-colors cursor-pointer hover:bg-[#400604] ${
                    isSelected ? "bg-[#E1B76F]/20 font-bold text-white" : ""
                  }`}
                  title={`Click to select size ${row.size}`}
                >
                  <td className={`py-2 px-3 text-left font-bold text-white border-r border-[#E1B76F]/15 ${isSelected ? "bg-[#E1B76F]/25 text-white" : "bg-[#2b0403]"}`}>
                    <div className="flex items-center gap-1.5">
                      <span>{row.size}</span>
                      {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-[#E1B76F] inline-block" />}
                    </div>
                  </td>
                  <td className="py-2 px-2">{row.shoulder}″</td>
                  <td className="py-2 px-2">{row.chest}″</td>
                  <td className="py-2 px-2">{row.waist}″</td>
                  <td className="py-2 px-2">{row.hip}″</td>
                  <td className="py-2 px-2">{row.daman}″</td>
                  <td className="py-2 px-2">{row.length}″</td>
                  <td className="py-2 px-2">{row.trouser}″</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
