"use client";

import React, { useState } from "react";
import { Crop, X, Check, Loader2 } from "lucide-react";
import type { CropMode, CropAlign } from "./crop-utils";

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  imageAlt?: string;
  processingCrop: boolean;
  onClose: () => void;
  onApply: (mode: CropMode, align: CropAlign) => void | Promise<void>;
}

export function ImageCropModal({
  isOpen,
  imageSrc,
  imageAlt = "Product Image",
  processingCrop,
  onClose,
  onApply,
}: ImageCropModalProps) {
  const [cropMode, setCropMode] = useState<CropMode>("3:4");
  const [cropAlign, setCropAlign] = useState<CropAlign>("top");

  if (!isOpen || !imageSrc) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs"
      onClick={() => !processingCrop && onClose()}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div>
            <h4 className="text-[15px] font-bold text-gray-900 flex items-center gap-1.5">
              <Crop className="h-4 w-4 text-purple-600" />
              Crop &amp; Frame for Product Details Page
            </h4>
            <p className="text-[11px] text-gray-500">
              Adjust framing so the garment displays with full visibility
            </p>
          </div>
          <button
            type="button"
            disabled={processingCrop}
            onClick={onClose}
            className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Options */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Framing Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCropMode("3:4")}
                className={`rounded-xl border p-2 text-center text-[12px] font-bold transition ${
                  cropMode === "3:4"
                    ? "border-purple-600 bg-purple-50 text-purple-700 shadow-xs ring-1 ring-purple-500"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                3:4 Portrait
                <span className="block text-[10px] font-normal text-gray-400 mt-0.5">
                  Recommended
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCropMode("fit")}
                className={`rounded-xl border p-2 text-center text-[12px] font-bold transition ${
                  cropMode === "fit"
                    ? "border-purple-600 bg-purple-50 text-purple-700 shadow-xs ring-1 ring-purple-500"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                Fit Full Photo
                <span className="block text-[10px] font-normal text-gray-400 mt-0.5">
                  No Crop (Soft Edge)
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCropMode("1:1")}
                className={`rounded-xl border p-2 text-center text-[12px] font-bold transition ${
                  cropMode === "1:1"
                    ? "border-purple-600 bg-purple-50 text-purple-700 shadow-xs ring-1 ring-purple-500"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                1:1 Square
                <span className="block text-[10px] font-normal text-gray-400 mt-0.5">
                  Square crop
                </span>
              </button>
            </div>
          </div>

          {/* Alignment options when cropping */}
          {cropMode !== "fit" && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Crop Alignment (Focus Area)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCropAlign("top")}
                  className={`rounded-xl border p-2 text-[11px] font-bold transition ${
                    cropAlign === "top"
                      ? "border-purple-600 bg-purple-50 text-purple-700 shadow-xs"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  Top (Collar &amp; Neck)
                </button>
                <button
                  type="button"
                  onClick={() => setCropAlign("center")}
                  className={`rounded-xl border p-2 text-[11px] font-bold transition ${
                    cropAlign === "center"
                      ? "border-purple-600 bg-purple-50 text-purple-700 shadow-xs"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  Center (Balanced)
                </button>
                <button
                  type="button"
                  onClick={() => setCropAlign("bottom")}
                  className={`rounded-xl border p-2 text-[11px] font-bold transition ${
                    cropAlign === "bottom"
                      ? "border-purple-600 bg-purple-50 text-purple-700 shadow-xs"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  Bottom
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Visual Preview Box */}
        <div className="relative aspect-[3/4] w-full max-w-[260px] mx-auto overflow-hidden rounded-xl border border-gray-200 bg-[#f8f9fa] shadow-inner mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={imageAlt}
            className={`h-full w-full ${
              cropMode === "fit"
                ? "object-contain"
                : cropAlign === "top"
                ? "object-cover object-top"
                : cropAlign === "bottom"
                ? "object-cover object-bottom"
                : "object-cover object-center"
            }`}
          />
          <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold text-white shadow backdrop-blur-xs">
            {cropMode === "fit"
              ? "Fit (Contain)"
              : `3:4 (${cropAlign.toUpperCase()})`}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t">
          <button
            type="button"
            disabled={processingCrop}
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={processingCrop}
            onClick={() => onApply(cropMode, cropAlign)}
            className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-[12px] font-bold text-white shadow-sm hover:bg-purple-700 transition disabled:opacity-50"
          >
            {processingCrop ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing &amp; Uploading…</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Apply &amp; Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
