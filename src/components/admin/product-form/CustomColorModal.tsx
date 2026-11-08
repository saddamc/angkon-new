"use client";

import React, { useState, useEffect } from "react";
import { Palette, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  cleanColorName,
  validateColorName,
  validateHexColor,
  registerCustomColor,
  resolveColorStyle,
} from "./color-swatches";

export interface CustomColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (colorName: string, hexCode?: string) => void;
  existingColors: string[];
  initialColorName?: string;
}

export function CustomColorModal({
  isOpen,
  onClose,
  onSave,
  existingColors,
  initialColorName = "",
}: CustomColorModalProps) {
  const [name, setName] = useState(initialColorName);
  const [hexCode, setHexCode] = useState("");
  const [nameError, setNameError] = useState("");
  const [hexError, setHexError] = useState("");
  const [pickerHex, setPickerHex] = useState("#8B1E3F");

  // Reset or initialize state when modal opens or initialColorName changes
  useEffect(() => {
    if (isOpen) {
      setName(initialColorName);
      setHexCode("");
      setNameError("");
      setHexError("");
      setPickerHex("#8B1E3F");
    }
  }, [isOpen, initialColorName]);

  // Synchronize picker with hex input when typed
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (val && !val.startsWith("#") && !val.startsWith(" ")) {
      val = "#" + val;
    }
    setHexCode(val);
    if (hexError) setHexError("");

    const cleanHex = val.trim();
    if (validateHexColor(cleanHex)) {
      if (cleanHex.length === 4) {
        // Expand 3-digit hex to 6-digit for native input: #abc -> #aabbcc
        const expanded = `#${cleanHex[1]}${cleanHex[1]}${cleanHex[2]}${cleanHex[2]}${cleanHex[3]}${cleanHex[3]}`;
        setPickerHex(expanded);
      } else {
        setPickerHex(cleanHex);
      }
    }
  };

  // Synchronize hex text when color picker changes
  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.value.toUpperCase();
    setPickerHex(chosen);
    setHexCode(chosen);
    if (hexError) setHexError("");
  };

  const handleSave = () => {
    const trimmedName = name.trim();

    // 1. Validate required color name
    if (!trimmedName) {
      setNameError("Color name is required");
      return;
    }

    const nameValidation = validateColorName(trimmedName);
    if (!nameValidation.valid) {
      setNameError(nameValidation.error || "Color name is invalid");
      return;
    }

    const clean = cleanColorName(trimmedName);

    // 2. Validate HEX format only if provided
    const trimmedHex = hexCode.trim();
    if (trimmedHex) {
      if (!validateHexColor(trimmedHex)) {
        setHexError("Invalid HEX format. Use #RGB or #RRGGBB (e.g. #8B1E3F)");
        return;
      }
    }

    // 3. Check duplicate names using existing canonical color rules
    const isAlreadySelected = existingColors.some(
      (c) => c.toLowerCase() === clean.toLowerCase()
    );
    if (isAlreadySelected) {
      setNameError(`Color "${clean}" is already added to this product`);
      return;
    }

    // 4. If HEX code is provided, register custom color in memory registry
    if (trimmedHex) {
      registerCustomColor(clean, trimmedHex);
    }

    // 5. Save and add to selected product colors
    onSave(clean, trimmedHex || undefined);
    onClose();
  };

  // Preview swatch color calculation:
  // - If hex is explicitly provided and valid, use it.
  // - If hex is omitted, resolve against canonical dictionary or default neutral stone.
  const previewBg = (() => {
    const trimmedHex = hexCode.trim();
    if (trimmedHex && validateHexColor(trimmedHex)) {
      return trimmedHex;
    }
    if (name.trim()) {
      const resolved = resolveColorStyle(name.trim());
      if (resolved.bg && resolved.bg.startsWith("#")) {
        return resolved.bg;
      }
    }
    return "#e7e5e4"; // Application neutral/default preview
  })();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[425px] p-6 bg-white rounded-2xl border border-stone-200 shadow-2xl">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-purple-50 border border-purple-200/70 flex items-center justify-center text-purple-700 shrink-0">
              <Palette className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-gray-900 tracking-tight">
                Add Custom Color
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-500">
                Create a new color for your product.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Color Name Field (Required) */}
          <div className="space-y-1.5">
            <label
              htmlFor="custom-color-name-input"
              className="block text-xs font-bold text-stone-800"
            >
              Color Name <span className="text-red-500">*</span>
            </label>
            <input
              id="custom-color-name-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSave();
                }
              }}
              placeholder="Enter color name (e.g. Wine Red)"
              className={`w-full h-10 rounded-xl border px-3.5 text-xs text-stone-800 placeholder-stone-400 bg-white transition focus:outline-none focus:ring-2 ${
                nameError
                  ? "border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20"
                  : "border-stone-200 focus:border-purple-500 focus:ring-purple-100"
              }`}
              autoFocus
            />
            {nameError && (
              <p className="text-[11px] font-semibold text-red-600 flex items-center gap-1">
                {nameError}
              </p>
            )}
          </div>

          {/* Color Code Field (Optional) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="custom-color-hex-input"
                className="block text-xs font-bold text-stone-800"
              >
                Color Code <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              {hexCode && (
                <button
                  type="button"
                  onClick={() => {
                    setHexCode("");
                    setPickerHex("#8B1E3F");
                    if (hexError) setHexError("");
                  }}
                  className="text-[11px] font-medium text-stone-400 hover:text-red-600 transition cursor-pointer"
                >
                  Clear HEX
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Small color preview swatch: clicking swatch opens color picker */}
              <label
                className="relative flex items-center justify-center w-10 h-10 rounded-xl border border-stone-200 bg-white hover:border-purple-300 transition shrink-0 cursor-pointer shadow-2xs group"
                title="Click swatch to open color picker"
              >
                <span
                  className="h-5 w-5 rounded-full border border-stone-300 shadow-2xs group-hover:scale-105 transition-transform"
                  style={{ backgroundColor: previewBg }}
                />
                <input
                  type="color"
                  value={pickerHex}
                  onChange={handlePickerChange}
                  className="sr-only"
                  aria-label="Color picker inside modal"
                />
              </label>

              {/* HEX text input */}
              <div className="relative flex-1">
                <input
                  id="custom-color-hex-input"
                  type="text"
                  value={hexCode}
                  onChange={handleHexInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSave();
                    }
                  }}
                  placeholder="#8B1E3F"
                  maxLength={7}
                  className={`w-full h-10 rounded-xl border px-3.5 font-mono text-xs text-stone-800 placeholder-stone-400 bg-white transition uppercase focus:outline-none focus:ring-2 ${
                    hexError
                      ? "border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50/20"
                      : "border-stone-200 focus:border-purple-500 focus:ring-purple-100"
                  }`}
                />
              </div>
            </div>

            {hexError ? (
              <p className="text-[11px] font-semibold text-red-600">
                {hexError}
              </p>
            ) : (
              <p className="text-[11px] text-stone-400">
                Optional. Leave blank to use default neutral swatch preview.
              </p>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="h-9 px-4 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSave();
              }}
              className="h-9 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              Save Color
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
