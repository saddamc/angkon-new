"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import {
  X, FolderOpen, Layers, Check, Loader2, AlertCircle,
  UploadCloud, Search, ChevronDown, Sparkles,
  EyeOff, Hash, CornerDownRight, CheckCircle2
} from "lucide-react";
import { decodeHtmlCharCodes } from "@/utils/category-display";


export interface WCCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  linked_parents?: number[];
  description: string;
  count: number;
  direct_count?: number;
  menu_order: number;
  meta_data?: { id?: number; key: string; value: unknown }[];
  image?: { id?: number; src: string; alt?: string } | null;
  is_linked?: boolean;
}

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: "main" | "sub";
  initialParentId?: number;
  flat: WCCategory[];
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onCreated: (newCatId: number) => Promise<void>;
  showToast: (msg: string, ok?: boolean) => void;
}

function catName(cat: { name?: string }): string {
  return decodeHtmlCharCodes(cat.name || "");
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");
}

async function convertImageToWebP(file: File, maxDimension = 1600, quality = 0.90): Promise<File> {
  // If not an image (or SVG/GIF where animations or vectors should be preserved), return as-is
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }

  try {
    let sourceWidth = 0;
    let sourceHeight = 0;
    let imageSource: ImageBitmap | HTMLImageElement;

    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(file);
      sourceWidth = bitmap.width;
      sourceHeight = bitmap.height;
      imageSource = bitmap;
    } else {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });
      URL.revokeObjectURL(url);
      sourceWidth = img.naturalWidth || img.width;
      sourceHeight = img.naturalHeight || img.height;
      imageSource = img;
    }

    const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
    const targetWidth = Math.round(sourceWidth * scale);
    const targetHeight = Math.round(sourceHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      if ("close" in imageSource && typeof imageSource.close === "function") imageSource.close();
      return file;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imageSource, 0, 0, targetWidth, targetHeight);

    if ("close" in imageSource && typeof imageSource.close === "function") {
      imageSource.close();
    }

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality)
    );

    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "category";
    return new File([blob], `${baseName}.webp`, { type: "image/webp" });
  } catch (err) {
    console.warn("Client WebP conversion failed, falling back to original file:", err);
    return file;
  }
}




export function CreateCategoryModal({
  isOpen,
  onClose,
  initialType = "main",
  initialParentId = 0,
  flat,
  authFetch,
  onCreated,
  showToast,
}: CreateCategoryModalProps) {
  const [type, setType] = useState<"main" | "sub">(initialType);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [parent, setParent] = useState<number>(initialParentId);
  const [linkedParents, setLinkedParents] = useState<number[]>([]);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageId, setImageId] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [parentSearch, setParentSearch] = useState("");
  const [parentDropdownOpen, setParentDropdownOpen] = useState(false);
  const [crossDropdownOpen, setCrossDropdownOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const parentDropdownRef = useRef<HTMLDivElement>(null);
  const crossDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Session uploaded images tracking for automatic Cloudinary cleanup if modal is dismissed
  const sessionUploadedRef = useRef<Array<{ id: number | null; url: string }>>([]);
  const isSavedRef = useRef(false);

  const handleClose = async () => {
    if (!isSavedRef.current && sessionUploadedRef.current.length > 0) {
      const toDelete = [...sessionUploadedRef.current];
      sessionUploadedRef.current = [];
      try {
        await authFetch("/api/admin/upload", {
          method: "DELETE",
          body: JSON.stringify({ items: toDelete }),
        });
      } catch {
        // ignore
      }
    }
    onClose();
  };

  // Sync state whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      isSavedRef.current = false;
      sessionUploadedRef.current = [];
      const targetType = initialParentId ? "sub" : initialType;
      setType(targetType);
      setParent(initialParentId);
      setName("");
      setNameError("");
      setLinkedParents([]);
      setDescription("");
      setImageUrl("");
      setImageAlt("");
      setImageId(null);
      setIsActive(true);
      setError("");

      // Calculate initial sort order based on siblings
      const targetP = targetType === "main" ? 0 : initialParentId;
      const count = flat.filter((c) => c.parent === targetP).length;
      setSortOrder(count);

      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen, initialType, initialParentId, flat]);

  // Keep the image alt text in step with the name until the user overrides it.
  const handleNameChange = (val: string) => {
    setName(val);
    if (nameError) setNameError("");
    if (!imageAlt || imageAlt === name) {
      setImageAlt(val);
    }
  };

  const handleParentChange = (newParentId: number) => {
    setParent(newParentId);
    setParentDropdownOpen(false);
    const count = flat.filter((c) => c.parent === newParentId).length;
    setSortOrder(count);
  };

  // Image Upload handler
  const uploadFile = async (file: File) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const prepared = await convertImageToWebP(file);
      if (prepared.size > 8 * 1024 * 1024) {
        throw new Error("Image exceeds 8MB. Please choose a smaller photo.");
      }

      const catSlugClean = (slugify(name) || "category")
        .toUpperCase()
        .replace(/[^A-Z0-9_\s-]/g, "")
        .replace(/[\s-]+/g, "_");
      let folder = `ANGKON/CATEGORIES/${catSlugClean}`;
      if (type === "sub" && parent) {
        const parentCat = flat.find((c) => c.id === parent);
        const pSlug = (parentCat?.slug || "parent")
          .toUpperCase()
          .replace(/[^A-Z0-9_\s-]/g, "")
          .replace(/[\s-]+/g, "_");
        folder = `ANGKON/CATEGORIES/${pSlug}/${catSlugClean}`;
      }

      const fd = new FormData();
      fd.append("image", prepared);
      fd.append("folder", folder);
      fd.append("uploadType", "category");
      fd.append("category", type === "sub" && parent ? (flat.find((c) => c.id === parent)?.slug || "parent") : catSlugClean);
      if (type === "sub") {
        fd.append("subcategory", catSlugClean);
      }

      const res = await authFetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Upload failed (${res.status})`);
      }
      const data = await res.json();
      setImageUrl(data.url);
      const numericId = data.id && Number.isFinite(Number(data.id)) ? Number(data.id) : null;
      setImageId(numericId);
      sessionUploadedRef.current.push({ id: numericId, url: data.url });
      if (!imageAlt) setImageAlt(name.trim());
      showToast("Cover image uploaded in WebP format successfully!");
    } catch (err: unknown) {
      const e = err as { message?: string } | undefined;
      setError(e?.message || "Failed to upload image.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
  };

  // Form Submission
  const handleSubmit = async (addAnother: boolean = false) => {
    if (saving) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Category name is required.");
      setError("");
      nameInputRef.current?.focus();
      return;
    }

    // Prevent duplicate names among siblings of the same parent. Different
    // parents may legitimately reuse a name (e.g. "Sale" under two branches).
    const finalParentForCheck = type === "main" ? 0 : Number(parent);
    const duplicate = flat.some(
      (c) =>
        (c.parent ?? 0) === finalParentForCheck &&
        catName(c).trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      setNameError(`A category named "${trimmedName}" already exists here.`);
      setError("");
      nameInputRef.current?.focus();
      return;
    }

    if (type === "sub" && (!parent || parent === 0)) {
      setError("Please select a valid parent category for this subcategory.");
      return;
    }

    setNameError("");
    setSaving(true);
    setError("");

    try {
      const finalParent = type === "main" ? 0 : Number(parent);

      const payload = {
        name: trimmedName,
        description: description.trim(),
        parent: finalParent,
        linked_parents: linkedParents,
        menu_order: Math.max(0, Math.floor(Number(sortOrder) || 0)),
        imageUrl: imageUrl.trim(),
        imageId: imageId && Number.isFinite(Number(imageId)) ? Number(imageId) : null,
        imageAlt: imageAlt.trim() || trimmedName,
        icon: "",
        bgTheme: "blue",
        meta_data: [
          { key: "_is_active", value: String(isActive) },
          { key: "ps_category_image", value: imageUrl.trim() },
          { key: "angkon_category_image", value: imageUrl.trim() },
          { key: "_angkon_icon", value: "" },
          { key: "_angkon_bgTheme", value: "blue" },
        ],
        image: imageUrl.trim()
          ? {
              id: imageId && Number.isFinite(Number(imageId)) && Number(imageId) > 0 ? Number(imageId) : Date.now(),
              src: imageUrl.trim(),
              alt: imageAlt.trim() || trimmedName,
            }
          : null,
      };

      const res = await authFetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.details || err.message || err.error || "Failed to create category");
      }

      const created = await res.json();
      const newCatId = created.id;

      // Update position order via relocate endpoint
      if (newCatId) {
        await authFetch("/api/admin/categories/relocate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: newCatId, parent: finalParent, index: sortOrder }),
        }).catch(() => {});
      }

      await onCreated(newCatId);
      showToast(
        type === "sub"
          ? `Subcategory "${trimmedName}" created successfully!`
          : `Category "${trimmedName}" created successfully!`
      );

      isSavedRef.current = true;
      sessionUploadedRef.current = [];

      if (addAnother) {
        // Reset form but keep parent selected for rapid sequential entry
        isSavedRef.current = false;
        setName("");
        setNameError("");
        setImageUrl("");
        setImageAlt("");
        setImageId(null);
        setDescription("");
        setSortOrder((prev) => prev + 1);
        setTimeout(() => nameInputRef.current?.focus(), 100);
      } else {
        onClose();
      }
    } catch (err: unknown) {
      const e = err as { message?: string } | undefined;
      setError(e?.message || "Failed to create category. Please check your network and try again.");
    } finally {
      setSaving(false);
    }
  };

  // Handle ESC and click outside dropdowns
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (parentDropdownOpen) setParentDropdownOpen(false);
        else if (crossDropdownOpen) setCrossDropdownOpen(false);
        else void handleClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void handleSubmit(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (parentDropdownRef.current && !parentDropdownRef.current.contains(e.target as Node)) {
        setParentDropdownOpen(false);
      }
      if (crossDropdownRef.current && !crossDropdownRef.current.contains(e.target as Node)) {
        setCrossDropdownOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, parentDropdownOpen, crossDropdownOpen, onClose]);

  const selectedParentCategory = useMemo(() => {
    return flat.find((c) => c.id === parent) || null;
  }, [flat, parent]);

  const filteredParentOptions = useMemo(() => {
    const q = parentSearch.toLowerCase();
    return flat
      .filter((c) => c.parent === 0 || !c.parent) // Prioritize main categories as parents
      .filter((c) => catName(c).toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
  }, [flat, parentSearch]);

  const crossListOptions = useMemo(() => {
    return flat.filter((c) => c.id !== parent);
  }, [flat, parent]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-category-title"
        className="flex w-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl animate-in zoom-in-95 duration-200"
        style={{
          maxWidth: "min(620px, calc(100vw - 32px))",
          maxHeight: "min(680px, calc(100dvh - 32px))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-purple-100 bg-gradient-to-r from-purple-50/50 via-white to-purple-50/20 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-purple-100 bg-purple-50 text-purple-600 shadow-2xs">
              {type === "sub" ? <Layers className="h-4.5 w-4.5" /> : <FolderOpen className="h-4.5 w-4.5" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="rounded-md border border-purple-200/60 bg-purple-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-purple-700 shadow-2xs">
                  {type === "sub" ? "Subcategory" : "Main Category"}
                </span>
                {type === "sub" && selectedParentCategory && (
                  <span className="flex max-w-[180px] items-center gap-1 truncate rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                    <CornerDownRight className="h-3 w-3 shrink-0 text-gray-400" />
                    under {catName(selectedParentCategory)}
                  </span>
                )}
              </div>
              <h2
                id="create-category-title"
                className="mt-0.5 text-[16px] font-black tracking-tight text-gray-900 sm:text-[17px]"
              >
                {type === "sub" ? "Create New Subcategory" : "Create New Main Category"}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleClose()}
            aria-label="Close dialog"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 shadow-2xs transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40 cursor-pointer"
            title="Close (Esc)"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 text-gray-900">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200/80 px-3.5 py-2.5 text-[12px] font-semibold text-red-700 shadow-2xs animate-in slide-in-from-top-1">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Category Cover Banner / Image (TOP) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest">
                Category Cover Banner
              </label>
              <span className="text-[10px] font-bold text-gray-400">
                1700 × 700 px recommended
              </span>
            </div>

            {imageUrl ? (
              <div className="relative rounded-xl border border-gray-200 overflow-hidden bg-gray-50 shadow-xs group">
                <Image
                  src={imageUrl}
                  alt={imageAlt || name}
                  width={600}
                  height={112}
                  className="h-24 w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-white text-gray-900 text-[11px] font-bold shadow-md hover:bg-gray-100 transition cursor-pointer"
                  >
                    Change Image
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const toDeleteUrl = imageUrl;
                      const toDeleteId = imageId;
                      setImageUrl("");
                      setImageId(null);
                      if (toDeleteUrl) {
                        sessionUploadedRef.current = sessionUploadedRef.current.filter(
                          (item) => item.url !== toDeleteUrl
                        );
                        void authFetch("/api/admin/upload", {
                          method: "DELETE",
                          body: JSON.stringify({ url: toDeleteUrl, id: toDeleteId }),
                        }).catch(() => {});
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[11px] font-bold shadow-md hover:bg-red-700 transition cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) void uploadFile(f);
                }}
                className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                  dragActive ? "border-purple-600 bg-purple-50/40" : "border-gray-200 hover:border-purple-400 bg-gray-50/50 hover:bg-purple-50/20"
                }`}
              >
                <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 mb-1">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin text-purple-600" /> : <UploadCloud className="h-4 w-4" />}
                </div>
                <p className="text-[12px] font-bold text-gray-800">
                  {uploading ? "Uploading banner (WebP)..." : "Click to upload banner or drag & drop"}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Any image format · Auto-converted to optimized WebP
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {/* 2. Category Name (slug is generated by the server) */}
          <div className="min-w-0">
            <label
              htmlFor="category-name"
              className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-700"
            >
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              id="category-name"
              ref={nameInputRef}
              type="text"
              required
              aria-required="true"
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? "category-name-error" : undefined}
              placeholder={type === "sub" ? "e.g. Polos, Denim Pants" : "e.g. Men, Women, Accessories"}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={`h-11 w-full rounded-xl border px-3.5 text-[13px] font-bold text-gray-900 shadow-2xs outline-none transition focus:ring-2 ${
                nameError
                  ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                  : "border-gray-200 focus:border-purple-400 focus:ring-purple-100"
              }`}
            />
            {nameError ? (
              <p
                id="category-name-error"
                role="alert"
                className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-red-600"
              >
                <AlertCircle className="h-3 w-3 shrink-0" />
                {nameError}
              </p>
            ) : (
              <p className="mt-1 text-[10.5px] text-gray-400">
                The storefront URL is generated automatically from this name.
              </p>
            )}
          </div>

          {/* 3. Parent Category Picker (Visible ONLY when Subcategory) */}
          {type === "sub" && (
            <div className="p-3.5 rounded-2xl bg-purple-50/40 border border-purple-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-[10.5px] font-black text-gray-700 uppercase tracking-widest">
                  Parent Category *
                </label>
                <span className="text-[10.5px] font-bold text-gray-500">
                  Subcategory will live under this collection
                </span>
              </div>

              <div className="relative" ref={parentDropdownRef}>
                <button
                  type="button"
                  onClick={() => setParentDropdownOpen((prev) => !prev)}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition shadow-2xs text-left cursor-pointer"
                >
                  {selectedParentCategory ? (
                    <>
                      {selectedParentCategory.image?.src ? (
                        <Image
                          src={selectedParentCategory.image.src}
                          alt=""
                          width={28}
                          height={28}
                          className="h-7 w-7 rounded-lg object-cover border border-gray-200 shrink-0"
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold text-xs">
                          <FolderOpen className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-black text-gray-900 truncate">
                          {catName(selectedParentCategory)}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono truncate">
                          /{selectedParentCategory.slug} · {selectedParentCategory.count} products
                        </p>
                      </div>
                    </>
                  ) : (
                    <span className="flex-1 text-[12px] font-semibold text-gray-400">
                      — Select Parent Category —
                    </span>
                  )}
                  <ChevronDown
                    className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${
                      parentDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {parentDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in duration-150">
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Search parent categories..."
                          value={parentSearch}
                          onChange={(e) => setParentSearch(e.target.value)}
                          className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-gray-200 text-[11.5px] bg-white outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100"
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-gray-50 p-1">
                      {filteredParentOptions.length === 0 ? (
                        <p className="p-3 text-center text-xs text-gray-400">No matching categories found</p>
                      ) : (
                        filteredParentOptions.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleParentChange(cat.id)}
                            className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition cursor-pointer ${
                              parent === cat.id ? "bg-purple-50 text-purple-700" : "hover:bg-gray-50 text-gray-800"
                            }`}
                          >
                            {cat.image?.src ? (
                              <Image src={cat.image.src} alt="" width={22} height={22} className="h-5.5 w-5.5 rounded-md object-cover shrink-0" />
                            ) : (
                              <FolderOpen className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-bold truncate">{catName(cat)}</p>
                              <p className="text-[10px] text-gray-400 font-mono truncate">/{cat.slug}</p>
                            </div>
                            {parent === cat.id && <Check className="h-3.5 w-3.5 text-purple-600 shrink-0" />}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Multi-Parent Cross-Listing Option */}
              <div className="pt-2 border-t border-purple-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10.5px] font-bold text-gray-700 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-purple-600" />
                    Cross-listing (Optional)
                  </span>
                  <button
                    type="button"
                    onClick={() => setCrossDropdownOpen((prev) => !prev)}
                    className="text-[10.5px] font-bold text-purple-600 hover:underline cursor-pointer"
                  >
                    + Add Parent
                  </button>
                </div>

                {linkedParents.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {linkedParents.map((pid) => {
                      const pCat = flat.find((c) => c.id === pid);
                      return (
                        <span
                          key={pid}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white border border-purple-200 text-[10.5px] font-bold text-purple-800 shadow-2xs"
                        >
                          {pCat ? catName(pCat) : `#${pid}`}
                          <button
                            type="button"
                            onClick={() => setLinkedParents((prev) => prev.filter((id) => id !== pid))}
                            className="hover:text-red-600 cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ) : null}

                {crossDropdownOpen && (
                  <div
                    ref={crossDropdownRef}
                    className="mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 max-h-36 overflow-y-auto space-y-0.5"
                  >
                    {crossListOptions
                      .filter((c) => !linkedParents.includes(c.id))
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setLinkedParents((prev) => [...prev, c.id]);
                            setCrossDropdownOpen(false);
                          }}
                          className="w-full text-left px-2 py-1 rounded-lg text-[11px] font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-between cursor-pointer"
                        >
                          <span>{catName(c)}</span>
                          <span className="text-[9.5px] text-gray-400 font-mono">/{c.slug}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. Storefront visibility & Display Order */}
          <div className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50/70 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
                Storefront Status
              </p>
              <p className="mt-0.5 text-[10.5px] text-gray-400">
                {isActive ? "Visible to shoppers in menus." : "Hidden from shoppers (draft)."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5" title="Display Order: lower numbers appear earlier">
                <Hash className="h-3.5 w-3.5 text-gray-400" />
                <input
                  id="category-display-order"
                  type="number"
                  min={0}
                  step={1}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                  className="h-8 w-14 rounded-lg border border-gray-200 bg-white px-1.5 text-center text-xs font-bold text-gray-800 outline-none focus:border-purple-400"
                  title="Menu display order"
                />
              </div>

              <div
                role="radiogroup"
                aria-label="Storefront status"
                className="inline-flex shrink-0 rounded-xl border border-gray-200 bg-white p-0.5 shadow-2xs"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setIsActive(true)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] px-3 py-1 text-[11px] font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={!isActive}
                  onClick={() => setIsActive(false)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] px-3 py-1 text-[11px] font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/40 ${
                    !isActive
                      ? "bg-gray-800 text-white shadow-2xs"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <EyeOff className="h-3 w-3" />
                  Draft
                </button>
              </div>
            </div>
          </div>

          {/* 5. Optional description / SEO subtitle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              aria-expanded={showAdvanced}
              aria-controls="category-seo"
              className="flex cursor-pointer items-center gap-1.5 rounded text-[11px] font-bold text-gray-500 transition hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40"
            >
              <ChevronDown
                className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
              />
              <span>Description / SEO subtitle</span>
              <span className="font-medium text-gray-400">(optional)</span>
            </button>

            {showAdvanced && (
              <div
                id="category-seo"
                className="mt-2 space-y-1.5 rounded-xl border border-gray-100 bg-gray-50 p-3 animate-in fade-in duration-150"
              >
                <label htmlFor="category-description" className="sr-only">
                  Description / SEO subtitle
                </label>
                <textarea
                  id="category-description"
                  rows={3}
                  placeholder="Short description displayed on the category page and used for search engines…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full resize-y rounded-xl border border-gray-200 bg-white p-2.5 text-[11.5px] text-gray-800 outline-none transition focus:border-purple-400 focus:ring-1 focus:ring-purple-100"
                />
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex shrink-0 flex-col gap-2 border-t border-purple-100 bg-purple-50/20 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="hidden max-w-[220px] truncate font-mono text-[10.5px] text-gray-400 sm:block">
            Path:{" "}
            <span className="font-bold text-gray-700">
              {type === "sub" && selectedParentCategory
                ? `${catName(selectedParentCategory)} > `
                : ""}
              {name || "New Category"}
            </span>
          </p>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => void handleClose()}
              disabled={saving}
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-[12px] font-bold text-gray-700 shadow-2xs transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/40 disabled:opacity-60 sm:w-auto cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => void handleSubmit(true)}
              disabled={saving}
              className="w-full rounded-xl px-3 py-2 text-[11.5px] font-semibold text-purple-700 transition hover:bg-purple-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40 disabled:opacity-50 sm:w-auto cursor-pointer"
              title="Create this category and immediately start another (Ctrl+Enter)"
            >
              Save &amp; add another
            </button>

            <button
              type="button"
              onClick={() => void handleSubmit(false)}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-[12px] font-bold text-white shadow-md shadow-purple-200 transition hover:bg-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating…</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>{type === "sub" ? "Create Subcategory" : "Create Category"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
