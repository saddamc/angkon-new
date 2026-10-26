"use client";

import React from "react";
import { X } from "lucide-react";

interface ImagePreviewModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  imageAlt?: string;
  currentIndex: number;
  totalImages: number;
  onClose: () => void;
  onOpenCrop: () => void;
}

export function ImagePreviewModal({
  isOpen,
  imageSrc,
  imageAlt = "Product Image",
  currentIndex,
  totalImages,
  onClose,
  onOpenCrop,
}: ImagePreviewModalProps) {
  if (!isOpen || !imageSrc) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b pb-3 mb-3">
          <div>
            <h4 className="text-[14px] font-bold text-gray-900">
              Customer Details Page Preview
            </h4>
            <p className="text-[11px] text-gray-500">
              This is exactly how this photo looks on the product page
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Simulated 3:4 Product Details Frame */}
        <div className="relative aspect-[3/4] w-full max-w-[320px] mx-auto overflow-hidden rounded-xl border border-gray-200 bg-[#f8f9fa] shadow-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={imageAlt}
            className="h-full w-full object-contain object-center"
          />
          <div className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium text-white shadow backdrop-blur-xs">
            3:4 Full View
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between pt-2 border-t text-[11px]">
          <span className="text-gray-500">
            Photo {currentIndex + 1} of {totalImages}
          </span>
          <button
            type="button"
            onClick={onOpenCrop}
            className="rounded-lg bg-purple-600 px-3 py-1.5 font-bold text-white hover:bg-purple-700 transition"
          >
            Adjust / Crop This Photo
          </button>
        </div>
      </div>
    </div>
  );
}
