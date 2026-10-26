"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { COMMON_SIZES } from "./types";

interface ManageSizesModalProps {
  isOpen: boolean;
  activeSizes: string[];
  onAddSize: (size: string) => void;
  onRemoveSize: (size: string) => void;
  onClose: () => void;
}

export function ManageSizesModal({
  isOpen,
  activeSizes,
  onAddSize,
  onRemoveSize,
  onClose,
}: ManageSizesModalProps) {
  const [customSizeInput, setCustomSizeInput] = useState("");

  if (!isOpen) return null;

  const handleAddCustom = () => {
    if (!customSizeInput.trim()) return;
    onAddSize(customSizeInput.trim());
    setCustomSizeInput("");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
    >
      <div className="w-full max-w-md bg-white rounded-2xl border border-purple-100 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Manage Size Columns
            </h3>
            <p className="text-[11px] text-stone-500">
              Configure which sizes appear as columns in the measurement tables
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Currently Active Sizes */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
            Active Size Columns ({activeSizes.length})
          </label>
          <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-purple-50/40 border border-purple-100 min-h-[46px]">
            {activeSizes.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-600 text-white text-xs font-bold shadow-2xs"
              >
                <span>{s}</span>
                <button
                  type="button"
                  onClick={() => onRemoveSize(s)}
                  className="text-white/70 hover:text-white transition cursor-pointer"
                  title={`Remove ${s}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Quick Presets of Common Sizes */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
            Add Standard Sizes
          </label>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_SIZES.filter((s) => !activeSizes.includes(s)).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onAddSize(s)}
                className="px-2.5 py-1 rounded-lg border border-stone-200 bg-white hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 text-xs font-semibold text-stone-700 transition cursor-pointer"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Size Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
            Add Custom Size
          </label>
          <div className="flex gap-2">
            <input
              value={customSizeInput}
              onChange={(e) => setCustomSizeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCustom();
              }}
              placeholder="e.g. 50, Free Size, 2-3Y..."
              className="flex-1 rounded-xl border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200"
            />
            <button
              type="button"
              onClick={handleAddCustom}
              disabled={!customSizeInput.trim()}
              className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold disabled:opacity-40 shadow-xs cursor-pointer"
            >
              Add
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-stone-200">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
