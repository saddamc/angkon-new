"use client";

import { useState } from "react";
import { X, Ruler, Check, Info } from "lucide-react";

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
    guide: "Measure straight across the bust from armpit to armpit.",
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
    guide: "Measure straight across the fullest part of the hip line.",
  },
  {
    area: "DAMAN",
    s: "24",
    m: "26",
    l: "27.5",
    xl: "29",
    guide: "Measure straight across the bottom opening / hemline sweep of the kameez.",
  },
  {
    area: "LENGTH",
    s: "37",
    m: "37/38",
    l: "38/39",
    xl: "40",
    guide: "Measure straight from the highest shoulder point down to the bottom hem.",
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

/* ── Native Silhouette Component (Matches Brand Heritage Colors) ── */
function GarmentSilhouette() {
  return (
    <div className="flex flex-col items-center justify-between h-full bg-[#400604] p-4 text-[#E1B76F] rounded-l-xl border-r border-[#E1B76F]/20">
      <div className="w-full flex justify-center py-2">
        <svg
          viewBox="0 0 160 320"
          className="w-28 sm:w-32 h-auto max-h-[300px] text-[#E1B76F] fill-[#E1B76F] drop-shadow-md"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Kameez / Kurti Dress Silhouette */}
          <path d="M 50 15 C 60 25, 100 25, 110 15 L 128 22 L 142 55 L 126 62 L 122 42 L 122 105 C 114 125, 126 185, 134 210 L 26 210 C 34 185, 46 125, 38 105 L 38 42 L 34 62 L 18 55 L 32 22 Z" />
          {/* Trouser Pants Silhouette */}
          <path d="M 46 216 L 114 216 L 112 300 L 92 300 L 80 238 L 68 300 L 48 300 Z" />
        </svg>
      </div>

      {/* Brand Monogram */}
      <div className="text-center pt-2 border-t border-[#E1B76F]/30 w-full">
        <span className="font-heading tracking-[0.25em] text-[11px] font-bold uppercase text-[#E1B76F]">
          ANGKON
        </span>
        <p className="text-[9px] tracking-wider uppercase text-[#E1B76F]/80">
          Ethnic Bangladeshi Fashion
        </p>
      </div>
    </div>
  );
}

export function ReadyToWearSizeGuideContent({
  selectedSize,
  onSelectSize,
}: {
  selectedSize?: string;
  onSelectSize?: (size: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"table" | "guide">("table");

  const sizes = [
    { key: "S", label: "SMALL", sub: "S" },
    { key: "M", label: "MEDIUM", sub: "M" },
    { key: "L", label: "LARGE", sub: "L" },
    { key: "XL", label: "XL", sub: "XL" },
  ];

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="rounded-xl border border-[#E1B76F]/25 bg-[#340402] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center rounded-full bg-[#400604] px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase text-[#E1B76F] border border-[#E1B76F]/30">
                ANGKON HERITAGE
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#E1B76F]/70">
                Ready-to-Wear
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[#E1B76F]">
              Ready-to-Wear Size Guide (in inches)
            </h3>
            <p className="mt-1 text-xs sm:text-[13px] text-[#f0d29d] leading-relaxed max-w-2xl">
              This chart applies to all ready-to-wear products including Kurti, 2-Piece Stitched, and 3-Piece Stitched Dresses.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center rounded-lg border border-[#E1B76F]/30 bg-[#2b0403] p-1 self-start sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("table")}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                activeTab === "table"
                  ? "bg-[#400604] text-[#E1B76F] shadow-sm border border-[#E1B76F]/50"
                  : "text-[#E1B76F]/70 hover:text-[#E1B76F]"
              }`}
            >
              Size Chart Table
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("guide")}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                activeTab === "guide"
                  ? "bg-[#400604] text-[#E1B76F] shadow-sm border border-[#E1B76F]/50"
                  : "text-[#E1B76F]/70 hover:text-[#E1B76F]"
              }`}
            >
              How to Measure
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: SIZE CHART TABLE WITH INTEGRATED SILHOUETTE */}
      {activeTab === "table" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-[#E1B76F]/25 shadow-sm flex flex-col md:flex-row bg-[#340402]">
            {/* Left Column: Silhouette Graphic (Desktop & Tablet) */}
            <div className="hidden md:flex md:w-44 shrink-0">
              <GarmentSilhouette />
            </div>

            {/* Right Column: Measurement Table */}
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse min-w-[480px]">
                <thead>
                  <tr className="border-b border-[#E1B76F]/20 bg-[#400604] text-[#E1B76F]">
                    <th className="py-3.5 px-4 font-bold text-[13px] tracking-wider uppercase">
                      Measurement (Inches)
                    </th>
                    {sizes.map((s) => {
                      const isSelected = selectedSize?.toUpperCase() === s.key;
                      return (
                        <th
                          key={s.key}
                          className={`py-3.5 px-3 text-center transition-colors ${
                            isSelected ? "bg-black/40 text-white font-black ring-1 ring-inset ring-[#E1B76F]" : "text-[#E1B76F]"
                          }`}
                        >
                          <div className="text-[11px] font-medium tracking-wider opacity-90 uppercase">
                            {s.label}
                          </div>
                          <div className="text-base font-black tracking-wide">
                            {s.sub}
                          </div>
                          {onSelectSize && (
                            <button
                              type="button"
                              onClick={() => onSelectSize(s.key)}
                              className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition cursor-pointer ${
                                isSelected
                                  ? "bg-[#E1B76F] text-[#400604] shadow font-black"
                                  : "bg-white/15 text-[#E1B76F] hover:bg-[#E1B76F] hover:text-[#400604]"
                              }`}
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
                <tbody className="divide-y divide-[#E1B76F]/15 bg-[#340402] text-[#f0d29d]">
                  {READY_TO_WEAR_SIZE_DATA.map((row, idx) => (
                    <tr
                      key={row.area}
                      className={`transition-colors hover:bg-[#400604] ${
                        idx % 2 === 0 ? "bg-[#340402]" : "bg-[#2b0403]"
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-[13px] text-[#E1B76F] border-r border-[#E1B76F]/15">
                        <div className="flex items-center gap-1.5">
                          <span>{row.area}</span>
                          <span className="text-[11px] font-normal text-[#E1B76F]/50">″</span>
                        </div>
                      </td>
                      <td
                        className={`py-3 px-3 text-center font-semibold text-sm border-r border-[#E1B76F]/15 ${
                          selectedSize?.toUpperCase() === "S"
                            ? "bg-[#E1B76F]/20 font-bold text-[#E1B76F]"
                            : ""
                        }`}
                      >
                        {row.s}″
                      </td>
                      <td
                        className={`py-3 px-3 text-center font-semibold text-sm border-r border-[#E1B76F]/15 ${
                          selectedSize?.toUpperCase() === "M"
                            ? "bg-[#E1B76F]/20 font-bold text-[#E1B76F]"
                            : ""
                        }`}
                      >
                        {row.m}″
                      </td>
                      <td
                        className={`py-3 px-3 text-center font-semibold text-sm border-r border-[#E1B76F]/15 ${
                          selectedSize?.toUpperCase() === "L"
                            ? "bg-[#E1B76F]/20 font-bold text-[#E1B76F]"
                            : ""
                        }`}
                      >
                        {row.l}″
                      </td>
                      <td
                        className={`py-3 px-3 text-center font-semibold text-sm ${
                          selectedSize?.toUpperCase() === "XL"
                            ? "bg-[#E1B76F]/20 font-bold text-[#E1B76F]"
                            : ""
                        }`}
                      >
                        {row.xl}″
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table Footer Notes */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-[#E1B76F]/60 pt-1">
            <p className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
              <span>* All sizes are measured in inches. Size may vary slightly due to fabric cut and design.</span>
            </p>
            <span className="font-semibold text-[#E1B76F] tracking-wide">
              ANGKON — Ethnic Bangladeshi Fashion
            </span>
          </div>
        </div>
      )}

      {/* VIEW 2: HOW TO MEASURE GUIDE */}
      {activeTab === "guide" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {READY_TO_WEAR_SIZE_DATA.map((item) => (
            <div
              key={item.area}
              className="flex items-start gap-3 rounded-lg border border-[#E1B76F]/25 bg-[#340402] p-3.5 shadow-sm"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#400604] text-xs font-bold text-[#E1B76F] border border-[#E1B76F]/30">
                {item.area.slice(0, 2)}
              </span>
              <div>
                <h4 className="text-sm font-bold text-[#E1B76F]">{item.area}</h4>
                <p className="mt-0.5 text-xs text-[#f0d29d] leading-relaxed">
                  {item.guide}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReadyToWearSizeGuideModal({
  isOpen,
  onClose,
  selectedSize,
  onSelectSize,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedSize?: string;
  onSelectSize?: (size: string) => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="size-guide-modal-title"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-[#E1B76F]/30 bg-[#400604] p-5 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-[#E1B76F]">
        {/* Top Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-[#340402] text-[#E1B76F] border border-[#E1B76F]/40 hover:bg-[#E1B76F] hover:text-[#400604] transition cursor-pointer"
          aria-label="Close size guide"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Content */}
        <ReadyToWearSizeGuideContent
          selectedSize={selectedSize}
          onSelectSize={(size) => {
            if (onSelectSize) onSelectSize(size);
            onClose();
          }}
        />
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
    <div className="mb-5 overflow-hidden rounded-xl border border-[#E1B76F]/25 bg-[#340402] shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#400604] border-b border-[#E1B76F]/30 text-[#E1B76F]">
        <div className="flex items-center gap-1.5">
          <Ruler className="h-4 w-4 text-[#E1B76F]" />
          <span className="text-xs font-bold text-[#E1B76F] uppercase tracking-wide">
            Ready-to-Wear Size Guide (in inches)
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
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-center border-collapse min-w-[420px]">
          <thead>
            <tr className="bg-[#400604]/90 text-[#E1B76F] font-semibold border-b border-[#E1B76F]/20">
              <th className="py-2.5 px-3 text-left font-bold text-[#E1B76F] w-16">Size</th>
              <th className="py-2.5 px-2">Shoulder</th>
              <th className="py-2.5 px-2">Chest</th>
              <th className="py-2.5 px-2">Waist</th>
              <th className="py-2.5 px-2">Hip</th>
              <th className="py-2.5 px-2">Daman</th>
              <th className="py-2.5 px-2">Length</th>
              <th className="py-2.5 px-2">Trouser</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1B76F]/15 font-medium text-[#f0d29d] bg-[#340402]">
            {SIZE_CHART_ROWS.map((row) => {
              const isSelected = selectedSize?.toUpperCase() === row.size;
              return (
                <tr
                  key={row.size}
                  onClick={() => onSelectSize && onSelectSize(row.size)}
                  className={`transition-colors cursor-pointer hover:bg-[#400604] ${
                    isSelected ? "bg-[#E1B76F]/20 font-bold text-[#E1B76F]" : ""
                  }`}
                  title={`Click to select size ${row.size}`}
                >
                  <td className={`py-2 px-3 text-left font-bold text-[#E1B76F] border-r border-[#E1B76F]/15 ${isSelected ? "bg-[#E1B76F]/25 text-[#E1B76F]" : "bg-[#2b0403]"}`}>
                    <div className="flex items-center gap-1.5">
                      <span>{row.size}</span>
                      {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-[#E1B76F] inline-block" />}
                    </div>
                  </td>
                  <td className="py-2 px-2">{row.shoulder}</td>
                  <td className="py-2 px-2">{row.chest}</td>
                  <td className="py-2 px-2">{row.waist}</td>
                  <td className="py-2 px-2">{row.hip}</td>
                  <td className="py-2 px-2">{row.daman}</td>
                  <td className="py-2 px-2">{row.length}</td>
                  <td className="py-2 px-2">{row.trouser}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
