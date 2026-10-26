"use client";

import React, { useRef, useState } from "react";
import {
  ImageIcon,
  UploadCloud,
  Sparkles,
  Upload,
  GripVertical,
  ArrowLeft,
  ArrowRight,
  Trash,
  Eye,
  Crop,
  Check,
} from "lucide-react";
import type { ImageItem, PendingUpload } from "./types";

interface ProductImageManagerProps {
  images: ImageItem[];
  pendingUploads: PendingUpload[];
  uploading: boolean;
  maxImages?: number;
  onFilesSelected: (files: FileList | File[]) => void;
  onMoveImage: (index: number, direction: "left" | "right") => void;
  onRemoveImage: (index: number) => void;
  onReorderImages: (sourceIndex: number, targetIndex: number) => void;
  onPreviewImage: (index: number) => void;
  onCropImage: (index: number) => void;
  onRemovePending: (id: string) => void;
}

export function ProductImageManager({
  images,
  pendingUploads,
  uploading,
  maxImages = 6,
  onFilesSelected,
  onMoveImage,
  onRemoveImage,
  onReorderImages,
  onPreviewImage,
  onCropImage,
  onRemovePending,
}: ProductImageManagerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [dragOverImageIndex, setDragOverImageIndex] = useState<number | null>(null);

  // File dropzone handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOverDropzone(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOverDropzone(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOverDropzone(false);
  };

  const handleDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverDropzone(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  // Thumbnail reorder handlers
  const handleImageDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedImageIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (draggedImageIndex !== null && draggedImageIndex !== index) {
      setDragOverImageIndex(index);
    }
  };

  const handleImageDragLeave = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverImageIndex === index) {
      setDragOverImageIndex(null);
    }
  };

  const handleImageDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedImageIndex !== null && draggedImageIndex !== targetIndex) {
      onReorderImages(draggedImageIndex, targetIndex);
    }
    setDraggedImageIndex(null);
    setDragOverImageIndex(null);
  };

  const handleImageDragEnd = () => {
    setDraggedImageIndex(null);
    setDragOverImageIndex(null);
  };

  const activePendingCount = pendingUploads.filter((u) => u.phase !== "error").length;
  const isAtLimit = images.length + activePendingCount >= maxImages;

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropFiles}
      className={`relative bg-white rounded-2xl border transition-all duration-200 p-5 shadow-sm ${
        isDragOverDropzone
          ? "border-purple-500 ring-4 ring-purple-100 bg-purple-50/20"
          : "border-purple-100/60"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-purple-600" />
          <h3 className="text-[14px] font-bold text-gray-800">
            Product Images &amp; Drag &amp; Drop Studio
          </h3>
        </div>
        <span
          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
            isAtLimit
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-purple-50 text-purple-700 border-purple-200/60"
          }`}
        >
          {images.length}
          {pendingUploads.some(
            (u) => u.phase === "uploading" || u.phase === "processing"
          )
            ? ` +${
                pendingUploads.filter(
                  (u) => u.phase === "uploading" || u.phase === "processing"
                ).length
              }`
            : ""}{" "}
          / {maxImages}{" "}
          {images.length >= maxImages
            ? "(Max Limit Reached)"
            : uploading
            ? "Uploading…"
            : "Photos"}
        </span>
      </div>

      {/* Active Drag-Over Banner */}
      {isDragOverDropzone && (
        <div className="my-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 p-3 text-center text-[12px] font-bold text-white border border-purple-300/40 shadow-md animate-pulse flex items-center justify-center gap-2">
          <UploadCloud className="h-4 w-4 animate-bounce" />
          <span>Drop images now to automatically convert to WebP &amp; upload!</span>
        </div>
      )}

      {/* Guidelines Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-stone-50 border border-stone-200/80 px-3.5 py-2.5 text-xs text-stone-600">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 font-bold text-stone-800">
            <Sparkles className="h-3.5 w-3.5 text-purple-600" />
            Photo #1 is Cover Photo
          </span>
          <span className="text-stone-300">•</span>
          <span>3:4 Portrait (1200 × 1600 px)</span>
          <span className="text-stone-300">•</span>
          <span>Auto-converts to WebP</span>
        </div>
        <span className="text-[11px] font-semibold text-stone-400">
          Drag photos to reorder
        </span>
      </div>

      {/* Empty State Dropzone */}
      {images.length === 0 && pendingUploads.length === 0 ? (
        <div
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
            isDragOverDropzone
              ? "border-purple-500 bg-purple-50/70 ring-4 ring-purple-100 scale-[1.01]"
              : "border-stone-300 bg-stone-50/60 hover:border-purple-500 hover:bg-purple-50/30"
          }`}
        >
          <div
            className={`h-14 w-14 rounded-2xl flex items-center justify-center transition shadow-sm ${
              isDragOverDropzone
                ? "bg-purple-600 text-white scale-110"
                : "bg-white text-purple-600 border border-stone-200"
            }`}
          >
            <UploadCloud className="h-7 w-7" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-stone-800">
              {isDragOverDropzone
                ? "Release your mouse to upload!"
                : "Drag & drop product photos here, or click to browse"}
            </p>
            <p className="text-[12px] text-stone-500 mt-1">
              Upload up to {maxImages} photos · Recommended 3:4 portrait (1200 × 1600 px) · JPG, PNG, WEBP
            </p>
          </div>
          <button
            type="button"
            className="mt-1 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-purple-700 shadow-md shadow-purple-200 transition cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            Select Images From Computer
          </button>
        </div>
      ) : null}

      {/* Images List (3:4 Aspect Ratio Cards with Drag Reorder) */}
      {images.length > 0 || pendingUploads.length > 0 ? (
        <div className="flex flex-wrap gap-3.5">
          {images.map((img, i) => {
            const isBeingDragged = draggedImageIndex === i;
            const isDropTarget = dragOverImageIndex === i;
            return (
              <div
                key={`${img.wpId ?? img.src}-${i}`}
                draggable={true}
                onDragStart={(e) => handleImageDragStart(e, i)}
                onDragOver={(e) => handleImageDragOver(e, i)}
                onDragLeave={(e) => handleImageDragLeave(e, i)}
                onDrop={(e) => handleImageDrop(e, i)}
                onDragEnd={handleImageDragEnd}
                className={`relative w-28 aspect-[3/4] rounded-xl overflow-hidden border-2 bg-[#f8f9fa] shadow-2xs group transition-all duration-150 select-none cursor-grab active:cursor-grabbing ${
                  isBeingDragged
                    ? "opacity-30 scale-95 ring-2 ring-purple-600 border-purple-600"
                    : isDropTarget
                    ? "ring-2 ring-purple-600 border-purple-600 scale-105 shadow-md"
                    : "border-stone-200 hover:border-purple-400"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={img.alt}
                  className="h-full w-full object-contain object-center pointer-events-none"
                />

                {/* Position / Cover Badge */}
                <span
                  className={`absolute top-1 left-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold shadow-xs ${
                    i === 0
                      ? "bg-purple-600 text-white border border-purple-400/40"
                      : "bg-black/60 text-white backdrop-blur-xs"
                  }`}
                >
                  {i === 0 ? "Cover" : `#${i + 1}`}
                </span>

                {/* Drag Grip Handle */}
                <div
                  className="absolute top-1 right-1 h-5 w-5 rounded bg-black/50 text-white/80 hover:text-white flex items-center justify-center backdrop-blur-xs opacity-75 group-hover:opacity-100 transition"
                  title="Drag this card to rearrange photo order"
                >
                  <GripVertical className="h-3.5 w-3.5" />
                </div>

                {/* Hover Actions Overlay */}
                <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex flex-col justify-between p-1.5 transition duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={() => onMoveImage(i, "left")}
                          className="h-5 w-5 rounded bg-white/20 text-white hover:bg-white/40 flex items-center justify-center transition cursor-pointer"
                          title="Move left"
                        >
                          <ArrowLeft className="h-3 w-3" />
                        </button>
                      )}
                      {i < images.length - 1 && (
                        <button
                          type="button"
                          onClick={() => onMoveImage(i, "right")}
                          className="h-5 w-5 rounded bg-white/20 text-white hover:bg-white/40 flex items-center justify-center transition cursor-pointer"
                          title="Move right"
                        >
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveImage(i)}
                      className="h-5 w-5 rounded bg-red-500/90 text-white hover:bg-red-600 flex items-center justify-center transition cursor-pointer"
                      title="Remove image"
                    >
                      <Trash className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => onPreviewImage(i)}
                      className="w-full rounded bg-white/20 py-1 text-[10px] font-semibold text-white hover:bg-white/30 flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <Eye className="h-3 w-3" /> Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => onCropImage(i)}
                      className="w-full rounded bg-purple-600 py-1 text-[10px] font-semibold text-white hover:bg-purple-700 flex items-center justify-center gap-1 transition shadow-sm cursor-pointer"
                    >
                      <Crop className="h-3 w-3" /> Crop / Fit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* In-progress / failed uploads */}
          {pendingUploads.map((item) => (
            <div
              key={item.id}
              className={`relative w-28 aspect-[3/4] rounded-xl overflow-hidden border-2 bg-[#f8f9fa] shadow-sm ${
                item.phase === "error" ? "border-red-300" : "border-purple-300"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.previewUrl}
                alt={item.name}
                className="h-full w-full object-cover object-center opacity-50"
              />
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/40 to-black/10 p-2">
                {item.phase === "error" ? (
                  <>
                    <p className="text-[9px] font-bold text-red-200 leading-tight line-clamp-2 mb-1.5">
                      {item.error || "Upload failed"}
                    </p>
                    <button
                      type="button"
                      onClick={() => onRemovePending(item.id)}
                      className="w-full rounded bg-red-500/90 py-1 text-[10px] font-bold text-white hover:bg-red-600 transition"
                    >
                      Dismiss
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold text-white/90 truncate pr-1">
                        {item.phase === "processing" ? "Saving…" : "Uploading"}
                      </span>
                      <span className="text-[10px] font-black text-white tabular-nums">
                        {item.progress}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/25 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-[width] duration-150 ease-out ${
                          item.phase === "processing"
                            ? "bg-purple-300 animate-pulse"
                            : "bg-purple-500"
                        }`}
                        style={{ width: `${Math.max(item.progress, 2)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[8px] text-white/60 truncate">{item.name}</p>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Upload / Dropzone Card for adding more photos */}
          {!isAtLimit ? (
            <div
              onClick={() => fileRef.current?.click()}
              className={`w-28 aspect-[3/4] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition cursor-pointer text-center p-2 ${
                isDragOverDropzone
                  ? "border-purple-500 bg-purple-50/80 ring-2 ring-purple-200 scale-105"
                  : "border-stone-300 bg-stone-50/50 hover:border-purple-500 hover:bg-purple-50/30 text-stone-500 hover:text-purple-600"
              }`}
            >
              <div className="h-8 w-8 rounded-full bg-white shadow-xs flex items-center justify-center text-purple-600 border border-stone-200">
                <UploadCloud className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-bold text-stone-700">Add Photo</span>
              <span className="text-[9px] text-stone-400">Drag &amp; Drop or Click</span>
            </div>
          ) : images.length >= maxImages ? (
            <div className="w-28 aspect-[3/4] rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 flex flex-col items-center justify-center gap-1 text-stone-400 p-2 text-center select-none">
              <Check className="h-5 w-5 text-emerald-500" />
              <span className="text-[11px] font-bold text-stone-700">Max Limit</span>
              <span className="text-[9px] text-stone-400 leading-tight">
                {maxImages}/{maxImages} photos added
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Batch progress */}
      {uploading && pendingUploads.length > 0 && (
        <div className="mt-3 rounded-xl border border-purple-100 bg-purple-50/30 px-3.5 py-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-purple-700">
              Uploading {pendingUploads.filter((u) => u.phase !== "error").length} photo
              {pendingUploads.filter((u) => u.phase !== "error").length !== 1 ? "s" : ""}…
            </span>
            <span className="text-[11px] font-black text-purple-700 tabular-nums">
              {Math.round(
                pendingUploads
                  .filter((u) => u.phase !== "error")
                  .reduce((sum, u) => sum + u.progress, 0) /
                  Math.max(1, activePendingCount)
              )}
              % overall
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-[width] duration-200 ease-out"
              style={{
                width: `${Math.round(
                  pendingUploads
                    .filter((u) => u.phase !== "error")
                    .reduce((sum, u) => sum + u.progress, 0) /
                    Math.max(1, activePendingCount)
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        disabled={images.length >= maxImages}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(e.target.files);
            // Reset input so same file can be chosen again if needed
            e.target.value = "";
          }
        }}
      />
    </div>
  );
}
