"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Palette, X, Search, Check } from "lucide-react";
import { resolveColorStyle, COLOR_OPTIONS } from "./color-swatches";

interface ProductColorModalProps {
  isOpen: boolean;
  selectedColors: string[];
  onToggleColor: (color: string) => void;
  onAddCustomColor: (color: string) => void;
  onClearColors: () => void;
  onClose: () => void;
}

export function ProductColorModal({
  isOpen,
  selectedColors,
  onToggleColor,
  onAddCustomColor,
  onClearColors,
  onClose,
}: ProductColorModalProps) {
  const [colorSearch, setColorSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const filteredColors = useMemo(() => {
    const q = colorSearch.trim().toLowerCase();
    if (!q) return COLOR_OPTIONS;
    return COLOR_OPTIONS.filter((c) => c.toLowerCase().includes(q));
  }, [colorSearch]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="color-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-stone-200 bg-white shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-purple-100 bg-purple-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600">
              <Palette className="h-4 w-4" />
            </div>
            <div>
              <h3 id="color-modal-title" className="text-sm font-bold text-gray-900">
                Select Colors
              </h3>
              <p className="text-[11px] text-stone-500">
                {selectedColors.length} {selectedColors.length === 1 ? "color" : "colors"} selected
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={colorSearch}
              onChange={(e) => setColorSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && colorSearch.trim()) {
                  e.preventDefault();
                  onAddCustomColor(colorSearch.trim());
                  setColorSearch("");
                }
              }}
              placeholder="Search color or type custom name (e.g. Sage Green)..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50 pl-10 pr-4 py-2 text-xs text-stone-800 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
              autoFocus
            />
          </div>

          {/* Add Custom Color Banner */}
          {colorSearch.trim() &&
            !selectedColors.some(
              (c) => c.toLowerCase() === colorSearch.trim().toLowerCase()
            ) && (
              <button
                type="button"
                onClick={() => {
                  onAddCustomColor(colorSearch.trim());
                  setColorSearch("");
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100/70 border border-purple-200 text-xs font-bold text-purple-900 transition cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={`h-4 w-4 rounded-full ${
                      resolveColorStyle(colorSearch.trim()).swatchBorder
                    }`}
                    style={{
                      backgroundColor: resolveColorStyle(colorSearch.trim()).bg,
                    }}
                  />
                  <span>Add custom &ldquo;{colorSearch.trim()}&rdquo;</span>
                </span>
                <span className="text-[10px] uppercase font-bold text-purple-700 bg-purple-200/60 px-2 py-0.5 rounded">
                  + Add
                </span>
              </button>
            )}

          {/* Currently Selected Strip in Modal */}
          {selectedColors.length > 0 && (
            <div className="p-3 rounded-xl bg-purple-50/40 border border-purple-100/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-stone-500">
                  Selected ({selectedColors.length})
                </span>
                <button
                  type="button"
                  onClick={onClearColors}
                  className="text-[11px] font-semibold text-stone-400 hover:text-red-600 transition cursor-pointer"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedColors.map((c) => {
                  const style = resolveColorStyle(c);
                  return (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg text-[11px] font-bold border border-purple-100 bg-white text-stone-800 shadow-2xs"
                    >
                      <span
                        className={`h-3 w-3 rounded-full shrink-0 ${style.swatchBorder}`}
                        style={{ backgroundColor: style.bg }}
                      />
                      <span>{c}</span>
                      <button
                        type="button"
                        onClick={() => onToggleColor(c)}
                        className="h-3.5 w-3.5 rounded flex items-center justify-center text-stone-400 hover:text-red-600 transition cursor-pointer"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Preset Swatches Grid */}
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-stone-500 mb-2">
              {colorSearch.trim() ? "Matching Colors" : "Popular Fashion Swatches"}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredColors.map((c: string) => {
                const isSelected = selectedColors.some(
                  (x) => x.toLowerCase() === c.toLowerCase()
                );
                const style = resolveColorStyle(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onToggleColor(c)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border text-left transition cursor-pointer select-none ${
                      isSelected
                        ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                        : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate mr-1">
                      <span
                        className={`h-3.5 w-3.5 rounded-full shrink-0 ${
                          isSelected && style.isLight
                            ? "border-2 border-stone-200 shadow-2xs"
                            : style.swatchBorder
                        }`}
                        style={{ backgroundColor: style.bg }}
                      />
                      <span className="truncate">{c}</span>
                    </span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-white stroke-[3] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-purple-100 bg-purple-50/40">
          <label
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200 bg-white hover:bg-purple-50 text-xs font-semibold text-purple-700 cursor-pointer transition shadow-2xs"
            title="Pick exact custom hex color from spectrum"
          >
            <Palette className="h-3.5 w-3.5 text-purple-600" />
            <span>Custom Hex</span>
            <input
              type="color"
              defaultValue="#ffffff"
              onChange={(e) => onAddCustomColor(e.target.value)}
              className="sr-only"
            />
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-md shadow-purple-200 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
