"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Palette, X, Search, Check, Plus } from "lucide-react";
import {
  resolveColorStyle,
  cleanColorName,
  hexToNearestColorName,
  searchFashionColors,
  validateColorName,
  validateHexColor,
  registerCustomColor,
  FASHION_COLOR_LIST,
} from "./color-swatches";

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
  const [customPickerColor, setCustomPickerColor] = useState("#530911");

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const candidateColorName = useMemo(() => {
    const raw = colorSearch.trim();
    if (!raw) return "";
    return cleanColorName(raw);
  }, [colorSearch]);

  const hasExactCanonicalMatch = useMemo(() => {
    if (!candidateColorName) return false;
    return FASHION_COLOR_LIST.some(
      (c) => c.name.toLowerCase() === candidateColorName.toLowerCase()
    );
  }, [candidateColorName]);

  const candidateAlreadySelected = useMemo(() => {
    if (!candidateColorName) return false;
    return selectedColors.some(
      (c) => c.toLowerCase() === candidateColorName.toLowerCase()
    );
  }, [candidateColorName, selectedColors]);

  const matchingColors = useMemo(() => {
    return searchFashionColors(colorSearch, 12);
  }, [colorSearch]);

  const handleAddCandidate = () => {
    if (!candidateColorName || candidateAlreadySelected) return;
    const validation = validateColorName(candidateColorName);
    if (!validation.valid) return;
    registerCustomColor(candidateColorName, customPickerColor);
    onAddCustomColor(candidateColorName);
    setColorSearch("");
  };

  const handleSpectrumPick = (hexValue: string) => {
    if (!validateHexColor(hexValue)) return;
    setCustomPickerColor(hexValue);
    const nearest = hexToNearestColorName(hexValue);
    onAddCustomColor(nearest.name);
  };

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
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200/80 bg-stone-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-purple-50 border border-purple-200/70 flex items-center justify-center text-purple-700">
              <Palette className="h-4 w-4" />
            </div>
            <div>
              <h3 id="color-modal-title" className="text-sm font-bold text-gray-900">
                Select Colors by Name
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
        <div className="p-5 overflow-y-auto space-y-3.5">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={colorSearch}
              onChange={(e) => setColorSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (candidateColorName && !candidateAlreadySelected) {
                    handleAddCandidate();
                  }
                }
              }}
              placeholder="Search or enter color name..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50 pl-10 pr-9 py-2.5 text-xs text-stone-800 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition"
              autoFocus
            />
            {colorSearch.trim() && (
              <button
                type="button"
                onClick={() => setColorSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Add Custom Color Name Option */}
          {candidateColorName && !hasExactCanonicalMatch && !candidateAlreadySelected && (
            <div
              role="button"
              onClick={handleAddCandidate}
              className="flex items-center justify-between p-3 rounded-xl bg-purple-50/50 hover:bg-purple-100/70 border border-purple-200 text-xs font-semibold text-purple-900 transition cursor-pointer select-none"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="h-4 w-4 rounded-full border border-stone-300 shrink-0"
                  style={{ backgroundColor: customPickerColor }}
                />
                <span className="truncate">
                  + Create &ldquo;{candidateColorName}&rdquo; as a custom color
                </span>
              </div>
              <span className="text-xs font-bold text-purple-600 shrink-0">
                + Add
              </span>
            </div>
          )}

          {/* Currently Selected Strip in Modal */}
          {selectedColors.length > 0 && (
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-700">
                  Selected Product Colors ({selectedColors.length})
                </span>
                <button
                  type="button"
                  onClick={onClearColors}
                  className="text-xs font-semibold text-stone-400 hover:text-red-600 transition cursor-pointer"
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
                      className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl text-xs font-semibold border border-stone-200/90 bg-white text-stone-800 shadow-2xs"
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-full shrink-0 border border-stone-300"
                        style={{ backgroundColor: style.bg }}
                      />
                      <span>{c}</span>
                      <button
                        type="button"
                        onClick={() => onToggleColor(c)}
                        className="h-4 w-4 rounded flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title={`Remove ${c}`}
                        aria-label={`Remove ${c}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matching Colors Grid */}
          <div className="space-y-1.5">
            {matchingColors.map((item) => {
              const isSelected = selectedColors.some(
                (x) => x.toLowerCase() === item.name.toLowerCase()
              );
              return (
                <div
                  key={item.name}
                  onClick={() => {
                    if (!isSelected) {
                      onToggleColor(item.name);
                    }
                  }}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition select-none ${
                    isSelected
                      ? "bg-stone-50 text-stone-400 cursor-default"
                      : "hover:bg-purple-50 text-stone-800 cursor-pointer border border-transparent hover:border-purple-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="h-4 w-4 rounded-full border border-stone-300 shrink-0"
                      style={{ backgroundColor: item.hex }}
                    />
                    <span className="font-medium text-stone-900 truncate">
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Added</span>
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-purple-600">
                        + Add
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {matchingColors.length === 0 && !candidateColorName && (
              <div className="px-4 py-6 text-xs text-stone-400 text-center">
                No matching colors found
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-stone-200/80 bg-stone-50/50">
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
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
