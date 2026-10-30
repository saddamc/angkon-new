"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  X, Plus, FolderOpen, Layers, Check, Loader2, AlertCircle,
  UploadCloud, Search, ChevronDown, Lock, Unlock, Sparkles,
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
      const img = new Image();
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


const LUXURY_PRESETS = [
  { name: "Half Sleeves", src: "/banners/half-sleeves.webp" },
  { name: "Full Sleeves", src: "/banners/full-sleeves.webp" },
  { name: "Tees", src: "/banners/tees.webp" },
  { name: "Polo", src: "/banners/polos.webp" },
  { name: "Pants", src: "/banners/pants.webp" },
  { name: "Tops", src: "/banners/tops.webp" },
  { name: "Men Banner", src: "/banners/men-banner.webp" },
  { name: "Women Banner", src: "/banners/women-banner.webp" },
  { name: "Accessories", src: "/banners/accessories.webp" },
  { name: "Ethnic Wear", src: "/banners/ethnic-wear.webp" },
];

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
  const [slug, setSlug] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);
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
      setSlug("");
      setAutoSlug(true);
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

  // Update slug automatically when name changes
  const handleNameChange = (val: string) => {
    setName(val);
    if (autoSlug) {
      setSlug(slugify(val));
    }
    if (!imageAlt || imageAlt === name) {
      setImageAlt(val);
    }
  };

  // Recalculate sort order when parent or type changes
  const handleTypeChange = (newType: "main" | "sub") => {
    setType(newType);
    const newParent = newType === "main" ? 0 : (parent || flat.find((c) => c.parent === 0)?.id || 0);
    setParent(newParent);
    const count = flat.filter((c) => c.parent === newParent).length;
    setSortOrder(count);
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

      const catSlugClean = (slug || slugify(name) || "category")
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
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Category name is required.");
      nameInputRef.current?.focus();
      return;
    }

    if (type === "sub" && (!parent || parent === 0)) {
      setError("Please select a valid parent category for this subcategory.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const finalParent = type === "main" ? 0 : Number(parent);
      const finalSlug = slug.trim() || slugify(trimmedName);

      const payload = {
        name: trimmedName,
        slug: finalSlug,
        description: description.trim(),
        parent: finalParent,
        linked_parents: linkedParents,
        menu_order: sortOrder,
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
        setSlug("");
        setAutoSlug(true);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-purple-100 bg-gradient-to-r from-purple-50/50 via-white to-purple-50/20 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
              {type === "sub" ? <Layers className="h-5 w-5" /> : <FolderOpen className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/60 shadow-2xs">
                  {type === "sub" ? "Subcategory" : "Main Category"}
                </span>
                {type === "sub" && selectedParentCategory && (
                  <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CornerDownRight className="h-3 w-3 text-gray-400" />
                    under {catName(selectedParentCategory)}
                  </span>
                )}
              </div>
              <h2 className="text-[18px] sm:text-[20px] font-black text-gray-900 tracking-tight mt-0.5">
                {type === "sub" ? "Create New Subcategory" : "Create New Main Category"}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleClose()}
            className="h-9 w-9 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition shadow-2xs"
            title="Close (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-gray-900">
          {error && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-red-50 border border-red-200/80 px-4 py-3 text-[13px] font-semibold text-red-700 shadow-2xs animate-in slide-in-from-top-1">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Category Type Selector */}
          <div>
            <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">
              Category Classification *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleTypeChange("main")}
                className={`p-3.5 rounded-2xl border-2 text-left flex items-start gap-3 transition cursor-pointer ${
                  type === "main"
                    ? "border-purple-600 bg-purple-50/50 ring-2 ring-purple-100 shadow-xs"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                }`}
              >
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    type === "main" ? "bg-purple-600 text-white shadow-xs" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  <FolderOpen className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-[13px] font-black ${type === "main" ? "text-gray-900" : "text-gray-700"}`}>
                      Main Category
                    </p>
                    {type === "main" && <Check className="h-4 w-4 text-purple-600" />}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                    Root storefront collection (e.g., Men, Women, Accessories).
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange("sub")}
                className={`p-3.5 rounded-2xl border-2 text-left flex items-start gap-3 transition cursor-pointer ${
                  type === "sub"
                    ? "border-purple-600 bg-purple-50/50 ring-2 ring-purple-100 shadow-xs"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                }`}
              >
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    type === "sub" ? "bg-purple-600 text-white shadow-xs" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  <Layers className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-[13px] font-black ${type === "sub" ? "text-gray-900" : "text-gray-700"}`}>
                      Subcategory
                    </p>
                    {type === "sub" && <Check className="h-4 w-4 text-purple-600" />}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                    Nested child collection (e.g., Half Sleeves, Tees, Pants).
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Parent Category Picker (Visible when Subcategory) */}
          {type === "sub" && (
            <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-black text-gray-700 uppercase tracking-widest">
                  Parent Category *
                </label>
                <span className="text-[11px] font-bold text-gray-500">
                  Subcategory will live under this collection
                </span>
              </div>

              <div className="relative" ref={parentDropdownRef}>
                <button
                  type="button"
                  onClick={() => setParentDropdownOpen((prev) => !prev)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition shadow-2xs text-left"
                >
                  {selectedParentCategory ? (
                    <>
                      {selectedParentCategory.image?.src ? (
                        <img
                          src={selectedParentCategory.image.src}
                          alt=""
                          className="h-8 w-8 rounded-lg object-cover border border-gray-200 shrink-0"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold text-xs">
                          <FolderOpen className="h-4 w-4" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-black text-gray-900 truncate">
                          {catName(selectedParentCategory)}
                        </p>
                        <p className="text-[11px] text-gray-400 font-mono truncate">
                          /{selectedParentCategory.slug} · {selectedParentCategory.count} products
                        </p>
                      </div>
                    </>
                  ) : (
                    <span className="flex-1 text-[13px] font-semibold text-gray-400">
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
                    <div className="p-2.5 border-b border-gray-100 bg-gray-50">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Search parent categories..."
                          value={parentSearch}
                          onChange={(e) => setParentSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-[12px] bg-white outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100"
                        />
                      </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto divide-y divide-gray-50 p-1">
                      {filteredParentOptions.length === 0 ? (
                        <p className="p-4 text-center text-xs text-gray-400">No matching categories found</p>
                      ) : (
                        filteredParentOptions.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleParentChange(cat.id)}
                            className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition ${
                              parent === cat.id ? "bg-purple-50 text-purple-700" : "hover:bg-gray-50 text-gray-800"
                            }`}
                          >
                            {cat.image?.src ? (
                              <img src={cat.image.src} alt="" className="h-6 w-6 rounded-md object-cover shrink-0" />
                            ) : (
                              <FolderOpen className="h-4 w-4 text-gray-400 shrink-0" />
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
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-purple-600" />
                    Also display under additional categories (Cross-listing)
                  </span>
                  <button
                    type="button"
                    onClick={() => setCrossDropdownOpen((prev) => !prev)}
                    className="text-[11px] font-bold text-purple-600 hover:underline"
                  >
                    + Add Cross-Parent
                  </button>
                </div>

                {linkedParents.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {linkedParents.map((pid) => {
                      const pCat = flat.find((c) => c.id === pid);
                      return (
                        <span
                          key={pid}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-[11px] font-bold text-purple-800 shadow-2xs"
                        >
                          {pCat ? catName(pCat) : `#${pid}`}
                          <button
                            type="button"
                            onClick={() => setLinkedParents((prev) => prev.filter((id) => id !== pid))}
                            className="hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-500">
                    No extra parent categories linked. Products will only appear under {selectedParentCategory ? catName(selectedParentCategory) : "primary parent"}.
                  </p>
                )}

                {crossDropdownOpen && (
                  <div
                    ref={crossDropdownRef}
                    className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-2 max-h-40 overflow-y-auto space-y-1"
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
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                        >
                          <span>{catName(c)}</span>
                          <span className="text-[10px] text-gray-400 font-mono">/{c.slug}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Name & Slug */}
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                Category Name *
              </label>
              <input
                ref={nameInputRef}
                type="text"
                placeholder={type === "sub" ? "e.g. Half Sleeves, Polos, Denim Pants" : "e.g. Men, Women, Accessories"}
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-[14px] font-bold text-gray-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition shadow-2xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest">
                  URL Slug
                </label>
                <button
                  type="button"
                  onClick={() => setAutoSlug((prev) => !prev)}
                  className="flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-purple-600 transition"
                  title={autoSlug ? "Unlock to customize slug manually" : "Lock to auto-generate from category name"}
                >
                  {autoSlug ? <Lock className="h-3 w-3 text-emerald-600" /> : <Unlock className="h-3 w-3 text-amber-600" />}
                  <span>{autoSlug ? "Auto-synced with name" : "Custom slug mode"}</span>
                </button>
              </div>

              <div className="flex items-center rounded-2xl border border-gray-200 bg-gray-50/50 overflow-hidden focus-within:border-purple-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-purple-100 transition shadow-2xs">
                <span className="px-3.5 py-2.5 text-[12px] font-mono font-medium text-gray-400 bg-gray-100/70 border-r border-gray-200 shrink-0">
                  {type === "sub" && selectedParentCategory ? `/${selectedParentCategory.slug}/` : "/"}
                </span>
                <input
                  type="text"
                  placeholder="category-slug"
                  value={slug}
                  disabled={autoSlug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className="flex-1 px-3 py-2.5 text-[13px] font-mono text-gray-800 bg-transparent outline-none disabled:text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* 4. Visual Cover Banner / Image */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest">
                Category Cover Banner
              </label>
              <span className="text-[11px] font-bold text-gray-400">
                1700 × 700 px recommended for luxury display
              </span>
            </div>

            {imageUrl ? (
              <div className="relative rounded-2xl border border-gray-200 overflow-hidden bg-gray-50 shadow-xs group">
                <img
                  src={imageUrl}
                  alt={imageAlt || name}
                  className="w-full h-36 object-cover object-center"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-white text-gray-900 text-xs font-bold shadow-md hover:bg-gray-100 transition"
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
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold shadow-md hover:bg-red-700 transition"
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
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                  dragActive ? "border-purple-600 bg-purple-50/40" : "border-gray-200 hover:border-purple-400 bg-gray-50/50 hover:bg-purple-50/20"
                }`}
              >
                <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 mb-2">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin text-purple-600" /> : <UploadCloud className="h-5 w-5" />}
                </div>
                <p className="text-[13px] font-bold text-gray-800">
                  {uploading ? "Uploading banner (WebP)..." : "Click to upload banner or drag & drop"}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
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

            {/* Quick Luxury Presets Selector */}
            <div>
              <p className="text-[11px] font-bold text-gray-400 mb-1.5">Or choose a pre-made luxury banner:</p>
              <div className="flex flex-wrap gap-1.5">
                {LUXURY_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setImageUrl(preset.src);
                      setImageAlt(preset.name);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition shadow-2xs ${
                      imageUrl === preset.src
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:bg-purple-50/30"
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Storefront Visibility & Ordering */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-gray-50/70 border border-gray-100">
            <div>
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                Storefront Status
              </label>
              <button
                type="button"
                onClick={() => setIsActive((prev) => !prev)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition ${
                  isActive
                    ? "bg-white border-emerald-300 shadow-2xs"
                    : "bg-gray-100 border-gray-200 text-gray-500"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isActive ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-[12px] font-bold text-gray-900">
                    {isActive ? "Active (Visible)" : "Draft (Hidden)"}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {isActive ? "Live in Store" : "Hidden"}
                </span>
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                Menu Order / Position
              </label>
              <div className="flex items-center rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-2xs">
                <Hash className="h-3.5 w-3.5 text-gray-400 mr-2" />
                <input
                  type="number"
                  min="0"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                  className="w-full text-[13px] font-bold text-gray-900 outline-none"
                />
              </div>
            </div>
          </div>

          {/* 6. Expandable SEO & Description */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="text-[12px] font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1.5 transition"
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
              />
              <span>{showAdvanced ? "Hide SEO & Description" : "+ Add Description / SEO Subtitle"}</span>
            </button>

            {showAdvanced && (
              <div className="mt-2.5 space-y-3 p-4 rounded-2xl bg-gray-50 border border-gray-100 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    Category Description / Subtitle
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Short description displayed on category pages and used for search engines..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 text-[12px] text-gray-800 bg-white outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-t border-purple-100 bg-purple-50/20 shrink-0">
          <div className="text-[11px] text-gray-400 font-mono hidden sm:block">
            Path: <span className="text-gray-700 font-bold">{type === "sub" && selectedParentCategory ? `${catName(selectedParentCategory)} > ` : ""}{name || "New Category"}</span>
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => void handleClose()}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[13px] font-bold text-gray-700 transition shadow-2xs"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => void handleSubmit(true)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-[13px] font-bold text-purple-700 transition shadow-2xs disabled:opacity-60"
              title="Save this category and immediately start another without closing (Ctrl+Enter)"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span>Save & Add Another</span>
            </button>

            <button
              type="button"
              onClick={() => void handleSubmit(false)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-[13px] font-bold text-white transition shadow-md shadow-purple-200 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span>{type === "sub" ? "Create Subcategory" : "Create Category"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
