"use client";

import React from "react";
import { X } from "lucide-react";

interface AddPartModalProps {
  isOpen: boolean;
  partName: string;
  onPartNameChange: (name: string) => void;
  partIcon: string;
  onPartIconChange: (iconId: string) => void;
  onClose: () => void;
  onAdd: () => void;
}

const PART_ICON_OPTIONS = [
  { id: "shirt", label: "Shirt", icon: "👔" },
  { id: "trouser", label: "Trouser", icon: "👖" },
  { id: "panjabi", label: "Panjabi", icon: "✨" },
  { id: "salwar", label: "Salwar", icon: "🥻" },
  { id: "dupatta", label: "Dupatta", icon: "🧣" },
  { id: "waistcoat", label: "Waistcoat", icon: "🧥" },
  { id: "custom", label: "Custom", icon: "⚙️" },
];

export function AddPartModal({
  isOpen,
  partName,
  onPartNameChange,
  partIcon,
  onPartIconChange,
  onClose,
  onAdd,
}: AddPartModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
    >
      <div className="w-full max-w-md bg-white rounded-2xl border border-purple-100 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <h3 className="text-base font-bold text-gray-900">
            Add Garment Part
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
              Part Name
            </label>
            <input
              autoFocus
              value={partName}
              onChange={(e) => onPartNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onAdd();
              }}
              placeholder="e.g. Salwar, Waistcoat, Dupatta, Cape..."
              className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-xs font-medium text-stone-900 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
              Select Icon
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PART_ICON_OPTIONS.map((ic) => (
                <button
                  key={ic.id}
                  type="button"
                  onClick={() => onPartIconChange(ic.id)}
                  className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                    partIcon === ic.id
                      ? "bg-purple-600 border-purple-600 text-white shadow-xs"
                      : "border-stone-200 hover:bg-purple-50 text-stone-700"
                  }`}
                >
                  <div className="text-xl">{ic.icon}</div>
                  <div className="text-[10px] font-semibold mt-0.5">
                    {ic.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onAdd}
            disabled={!partName.trim()}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold disabled:opacity-40 shadow-xs cursor-pointer"
          >
            Create Part
          </button>
        </div>
      </div>
    </div>
  );
}
