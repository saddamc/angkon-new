"use client";

import React, { Fragment } from "react";
import { Info } from "lucide-react";
import {
  type MultiSectionSizeChart,
  type MeasurementUnit,
  GARMENT_PRESETS,
  formatMeasurement,
} from "@/utils/size-chart";
import { PRESET_ICONS } from "./types";

interface LivePreviewCardProps {
  chart: MultiSectionSizeChart;
  unit?: MeasurementUnit;
  onUnitChange?: (unit: MeasurementUnit) => void;
  onSelectSize?: (size: string) => void;
  selectedSize?: string;
}

export function LivePreviewCard({
  chart,
  unit = "in",
  onUnitChange,
  onSelectSize,
  selectedSize,
}: LivePreviewCardProps) {
  const preset =
    GARMENT_PRESETS[chart.preset || "suit"] || GARMENT_PRESETS.suit;

  return (
    <div className="space-y-4 text-white">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-[#E1B76F]/25 pb-3">
        <div>
          <h4 className="text-base sm:text-lg font-serif font-black tracking-wide text-white">
            Garment Size Guide
          </h4>
          <p className="text-[11px] font-bold tracking-wider text-[#E1B76F] uppercase mt-0.5">
            {preset.label}
          </p>
        </div>

        {onUnitChange ? (
          <div className="inline-flex rounded-lg border border-[#E1B76F]/30 bg-[#340402] p-0.5">
            <button
              type="button"
              onClick={() => onUnitChange("in")}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                unit === "in"
                  ? "bg-[#E1B76F] text-[#400604] font-black"
                  : "text-white/70"
              }`}
            >
              Inches
            </button>
            <button
              type="button"
              onClick={() => onUnitChange("cm")}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                unit === "cm"
                  ? "bg-[#E1B76F] text-[#400604] font-black"
                  : "text-white/70"
              }`}
            >
              CM
            </button>
          </div>
        ) : (
          <span className="inline-block px-2.5 py-1 rounded-full border border-[#E1B76F]/40 bg-[#340402] text-[#E1B76F] text-[10px] font-bold tracking-widest uppercase">
            Unit: {unit === "in" ? "Inches" : "CM"}
          </span>
        )}
      </div>

      {/* Main Content Layout (Silhouette Left + Measurement Table Right) */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch">
        {/* Silhouette Column */}
        <div className="sm:w-28 shrink-0 flex flex-col items-center justify-center p-3 rounded-xl bg-[#340402] border border-[#E1B76F]/20 text-center">
          <svg
            viewBox="0 0 160 320"
            className="w-20 sm:w-22 h-auto max-h-[190px] text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Kameez / Kurti Dress Silhouette */}
            <path
              d="M 50 15 C 60 25, 100 25, 110 15 L 128 22 L 142 55 L 126 62 L 122 42 L 122 105 C 114 125, 126 185, 134 210 L 26 210 C 34 185, 46 125, 38 105 L 38 42 L 34 62 L 18 55 L 32 22 Z"
              fill="currentColor"
              fillOpacity="0.88"
            />
            <line
              x1="38"
              y1="108"
              x2="122"
              y2="108"
              stroke="#400604"
              strokeWidth="2"
              strokeDasharray="3,2"
            />
            <line
              x1="26"
              y1="209"
              x2="134"
              y2="209"
              stroke="#400604"
              strokeWidth="2.5"
            />
            {/* Trouser Pants Silhouette */}
            <path
              d="M 46 216 L 114 216 L 112 300 L 92 300 L 80 238 L 68 300 L 48 300 Z"
              fill="currentColor"
              fillOpacity="0.8"
            />
          </svg>

          <div className="mt-2 text-center pt-2 border-t border-[#E1B76F]/20 w-full">
            <span className="block font-serif tracking-[0.2em] text-[9px] font-black uppercase text-[#E1B76F]">
              ANGKON
            </span>
            <span className="block text-[8px] tracking-wider uppercase text-white/70">
              ROYAL HERITAGE
            </span>
          </div>
        </div>

        {/* Measurement Table */}
        <div className="flex-1 overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse min-w-[260px]">
            <thead>
              <tr className="border-b border-[#E1B76F]/25 text-white/90">
                <th className="py-2.5 px-2.5 font-bold text-[11px] uppercase tracking-wider sticky left-0 bg-[#280302] z-10">
                  Measurement
                </th>
                {chart.sizes.map((s) => {
                  const isSelected =
                    selectedSize?.toUpperCase().trim() ===
                    s.toUpperCase().trim();
                  return (
                    <th key={s} className="py-2 px-2 text-center">
                      <div className="font-black text-sm uppercase tracking-wide text-white">
                        {s}
                      </div>
                      {onSelectSize ? (
                        <button
                          type="button"
                          onClick={() => onSelectSize(s)}
                          className={`mt-1 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                            isSelected
                              ? "bg-[#E1B76F] text-[#400604] font-black"
                              : "bg-white/10 text-white/90 hover:bg-[#E1B76F] hover:text-[#400604]"
                          }`}
                        >
                          {isSelected ? "✓ Selected" : "Choose size ▾"}
                        </button>
                      ) : (
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold text-white/60 bg-white/5 border border-white/10">
                          Choose size ▾
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1B76F]/10 text-white/90 font-medium">
              {chart.sections
                .filter((sec) => sec.enabled !== false)
                .map((sec) => {
                  const icon =
                    PRESET_ICONS[sec.icon || ""] ||
                    PRESET_ICONS[sec.id] ||
                    "👔";
                  return (
                    <Fragment key={`section-group-${sec.id}`}>
                      {/* Section Title Header Row */}
                      <tr className="bg-[#400604] border-t border-b border-[#E1B76F]/30">
                        <td
                          colSpan={chart.sizes.length + 1}
                          className="py-1.5 px-2.5 font-black text-[10px] tracking-widest uppercase text-[#E1B76F]"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{icon}</span>
                            <span>{sec.title}</span>
                          </div>
                        </td>
                      </tr>

                      {/* Section Field Rows */}
                      {sec.rows
                        .filter((r) => r.visible !== false)
                        .map((row, rIdx) => (
                          <tr
                            key={row.id}
                            className={`hover:bg-[#400604]/50 transition ${
                              rIdx % 2 === 0 ? "bg-[#2f0403]" : "bg-[#240201]"
                            }`}
                          >
                            <td className="py-2 px-2.5 font-bold text-[11px] text-white/95 sticky left-0 bg-inherit z-10 border-r border-[#E1B76F]/15 whitespace-nowrap">
                              {row.area}
                            </td>

                            {chart.sizes.map((s) => {
                              const rawVal = row.values?.[s] || "-";
                              return (
                                <td
                                  key={s}
                                  className="py-2 px-2 text-center text-xs font-semibold border-r border-[#E1B76F]/10 last:border-r-0"
                                >
                                  {formatMeasurement(rawVal, unit)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                    </Fragment>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footnote Notice */}
      <div className="flex items-center gap-1.5 pt-2 text-[10px] text-white/80 leading-snug">
        <Info className="h-3.5 w-3.5 text-[#E1B76F] shrink-0" />
        <span>
          Measurements are in {unit === "in" ? "inches" : "centimeters"}. Allow 0.5 – 1 inch variation due to manual measurement.
        </span>
      </div>

      {/* Signature Bottom Line */}
      <div className="text-center pt-2 border-t border-[#E1B76F]/20">
        <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-[#E1B76F]/70">
          ANGKON • ROYAL HERITAGE
        </span>
      </div>
    </div>
  );
}
