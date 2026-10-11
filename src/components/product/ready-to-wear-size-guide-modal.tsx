"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Ruler, Check, ZoomIn, Info } from "lucide-react";

export interface SizeMeasurementRow {
  area: string;
  s: string;
  m: string;
  l: string;
  xl: string;
  guide: string;
}

export const TAWAKKAL_SIZE_DATA: SizeMeasurementRow[] = [
  { area: "SHOULDER", s: "14", m: "14.5", l: "15", xl: "15.5", guide: "Measure across from one shoulder seam to the other across the back." },
  { area: "CHEST", s: "19", m: "21", l: "23", xl: "25", guide: "Measure straight across the bust from armpit to armpit." },
  { area: "WAIST", s: "18", m: "20", l: "22", xl: "24", guide: "Measure across the narrowest natural waistline of the kameez." },
  { area: "HIP", s: "21", m: "23", l: "24.5", xl: "26", guide: "Measure across the fullest part of the hip line." },
  { area: "DAMAN", s: "24", m: "26", l: "27.5", xl: "29", guide: "Measure across the bottom opening / hemline sweep of the kameez." },
  { area: "LENGTH", s: "37", m: "37/38", l: "38/39", xl: "40", guide: "Measure straight from the highest shoulder point down to the bottom hem." },
  { area: "TROUSER", s: "38", m: "38/39", l: "39", xl: "40", guide: "Measure along the outseam from waistband to bottom ankle hem." },
];

export const TAWAKKAL_SIZE_CHART_IMAGE = "/size-charts/tawakkal-ready-to-wear-size-chart.png";

export function ReadyToWearSizeGuideContent({
  selectedSize,
  onSelectSize,
}: {
  selectedSize?: string;
  onSelectSize?: (size: string) => void;
}) {
  const [activeView, setActiveView] = useState<"table" | "image" | "measuring">("table");
  const [imageZoomed, setImageZoomed] = useState(false);

  const sizes = [
    { key: "S", label: "SMALL", sub: "S" },
    { key: "M", label: "MEDIUM", sub: "M" },
    { key: "L", label: "LARGE", sub: "L" },
    { key: "XL", label: "XL", sub: "XL" },
  ];

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center rounded-full bg-black px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase text-[#ffd800]">
                Official Tawakkal
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Towakkal Fabrics
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-neutral-900">
              Ready-to-Wear Size Guide (in inches)
            </h3>
            <p className="mt-1 text-xs sm:text-[13px] text-neutral-600 leading-relaxed max-w-2xl">
              This chart applies to all the ready to wear products of Tawakkal Fabrics including Kurti, 2 Piece Stitched and 3 Piece Stitched Dresses.
            </p>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center rounded-lg border border-neutral-200 bg-white p-1 self-start sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => setActiveView("table")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                activeView === "table"
                  ? "bg-black text-white shadow-sm"
                  : "text-neutral-600 hover:text-black"
              }`}
            >
              Interactive Table
            </button>
            <button
              type="button"
              onClick={() => setActiveView("image")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                activeView === "image"
                  ? "bg-black text-white shadow-sm"
                  : "text-neutral-600 hover:text-black"
              }`}
            >
              Official Poster
            </button>
            <button
              type="button"
              onClick={() => setActiveView("measuring")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                activeView === "measuring"
                  ? "bg-black text-white shadow-sm"
                  : "text-neutral-600 hover:text-black"
              }`}
            >
              How to Measure
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: INTERACTIVE TABLE */}
      {activeView === "table" && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-neutral-200 shadow-sm">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-[#0f172a] text-white">
                  <th className="py-3.5 px-4 font-bold text-[13px] tracking-wider uppercase w-44">
                    Measurement (Inches)
                  </th>
                  {sizes.map((s) => {
                    const isSelected = selectedSize?.toUpperCase() === s.key;
                    return (
                      <th
                        key={s.key}
                        className={`py-3.5 px-3 text-center transition-colors ${
                          isSelected ? "bg-black/60 text-[#ffd800]" : "text-white"
                        }`}
                      >
                        <div className="text-[11px] font-medium tracking-wider opacity-80 uppercase">
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
                                ? "bg-[#ffd800] text-black shadow"
                                : "bg-white/15 text-white hover:bg-white hover:text-black"
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
              <tbody className="divide-y divide-neutral-200 bg-white text-neutral-800">
                {TAWAKKAL_SIZE_DATA.map((row, idx) => (
                  <tr
                    key={row.area}
                    className={`transition-colors hover:bg-neutral-50 ${
                      idx % 2 === 0 ? "bg-white" : "bg-neutral-50/50"
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-[13px] text-neutral-900 border-r border-neutral-100">
                      <div className="flex items-center gap-1.5">
                        <span>{row.area}</span>
                        <span className="text-[11px] font-normal text-neutral-400">″</span>
                      </div>
                    </td>
                    <td
                      className={`py-3 px-3 text-center font-semibold text-sm border-r border-neutral-100 ${
                        selectedSize?.toUpperCase() === "S"
                          ? "bg-[#ffd800]/15 font-bold text-black"
                          : ""
                      }`}
                    >
                      {row.s}″
                    </td>
                    <td
                      className={`py-3 px-3 text-center font-semibold text-sm border-r border-neutral-100 ${
                        selectedSize?.toUpperCase() === "M"
                          ? "bg-[#ffd800]/15 font-bold text-black"
                          : ""
                      }`}
                    >
                      {row.m}″
                    </td>
                    <td
                      className={`py-3 px-3 text-center font-semibold text-sm border-r border-neutral-100 ${
                        selectedSize?.toUpperCase() === "L"
                          ? "bg-[#ffd800]/15 font-bold text-black"
                          : ""
                      }`}
                    >
                      {row.l}″
                    </td>
                    <td
                      className={`py-3 px-3 text-center font-semibold text-sm ${
                        selectedSize?.toUpperCase() === "XL"
                          ? "bg-[#ffd800]/15 font-bold text-black"
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

          {/* Table Footer Notes */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-neutral-500 pt-1">
            <p className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
              <span>* All sizes are measured in inches. Size may vary slightly due to fabric cut and design.</span>
            </p>
            <span className="font-mono text-[11px] text-neutral-400">
              www.towakkalfabrics.co
            </span>
          </div>

          {/* Official Chart Graphic Card (Directly visible in guide) */}
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:p-5 mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                  Official Manufacturer Size Chart Image
                </span>
                <span className="text-[11px] text-neutral-400">Towakkal Fabrics</span>
              </div>
              <button
                type="button"
                onClick={() => setImageZoomed(!imageZoomed)}
                className="text-xs font-semibold text-neutral-800 hover:text-black underline transition cursor-pointer"
              >
                {imageZoomed ? "Standard View" : "Enlarge Image"}
              </button>
            </div>
            <div
              className={`relative w-full overflow-hidden rounded-lg bg-white border border-neutral-200 cursor-pointer transition-all ${
                imageZoomed ? "aspect-[4/3] sm:aspect-[16/10]" : "aspect-[16/9] max-h-[360px]"
              }`}
              onClick={() => setImageZoomed(!imageZoomed)}
              title="Click to toggle full size view"
            >
              <Image
                src={TAWAKKAL_SIZE_CHART_IMAGE}
                alt="Tawakkal Official Ready-to-Wear Size Chart"
                fill
                className="object-contain p-2"
                sizes="(max-width: 768px) 100vw, 800px"
              />
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: OFFICIAL GRAPHIC POSTER */}
      {activeView === "image" && (
        <div className="space-y-3">
          <div
            className={`relative w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 cursor-pointer transition ${
              imageZoomed ? "max-h-none" : "max-h-[580px]"
            }`}
            onClick={() => setImageZoomed(!imageZoomed)}
            title="Click to toggle full size view"
          >
            <div className="relative w-full aspect-[4/3] sm:aspect-[16/10]">
              <Image
                src={TAWAKKAL_SIZE_CHART_IMAGE}
                alt="Tawakkal Official Ready-to-Wear Size Chart"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 800px"
                priority
              />
            </div>
            <button
              type="button"
              className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur shadow hover:bg-black transition"
            >
              <ZoomIn className="h-3.5 w-3.5" />
              {imageZoomed ? "Standard View" : "Enlarge Chart"}
            </button>
          </div>
          <p className="text-center text-xs text-neutral-500">
            Official manufacturer graphic published by Tawakkal Fabrics (towakkalfabrics.co).
          </p>
        </div>
      )}

      {/* VIEW 3: HOW TO MEASURE GUIDE */}
      {activeView === "measuring" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {TAWAKKAL_SIZE_DATA.map((item) => (
            <div
              key={item.area}
              className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-3.5"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-xs font-bold text-neutral-800">
                {item.area.slice(0, 2)}
              </span>
              <div>
                <h4 className="text-sm font-bold text-neutral-900">{item.area}</h4>
                <p className="mt-0.5 text-xs text-neutral-600 leading-relaxed">
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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-black">
        {/* Top Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 hover:text-black transition cursor-pointer"
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
