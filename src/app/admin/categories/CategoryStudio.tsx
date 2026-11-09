"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import {
  ChevronLeft, FolderOpen, Loader2, Check, AlertCircle, UploadCloud,
  Sparkles, X, Search, Layers, Plus, ExternalLink, ImageIcon,
  Tag, RefreshCw, Lock, Unlock
} from "lucide-react";
import type { WCCategory, FormData } from "./types";
import { ICON_CATEGORIES } from "./types";
import {
  catName,
  slugify,
  descendantIdSet,
  directChildren,
  siblingsOf,
  ancestorIdsOf,
} from "./category-tree-utils";
import {
  MAIN_CATEGORY_PRESETS,
  SUB_CATEGORY_PRESETS,
  CURATED_ICONS,
  isIconUrl,
  convertImageToWebP,
} from "./icon-presets";
import { ParentCategoryPicker } from "./ParentCategoryPicker";
import { PositionPicker } from "./PositionPicker";

export function CategoryStudio({
  mode,
  initial,
  flat,
  onSave,
  onClose,
  onEditChild,
  onAddChild,
  onReload,
}: {
  mode: "add" | "edit";
  initial: FormData & { id?: number };
  flat: WCCategory[];
  onSave: (data: FormData & { id?: number }) => Promise<void>;
  onClose: () => void;
  onEditChild?: (cat: WCCategory) => void;
  onAddChild?: (parentId: number) => void;
  onReload?: () => Promise<void>;
}) {
  const { authFetch } = useAuth();
  const [form, setForm] = useState<FormData>({ ...initial, linkedParents: initial.linkedParents || [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // The studio sits below the page header, so bring it to the top of the
  // scroll area on open. Combined with the sticky panel + bounded height this
  // keeps the pinned footer visible without the user hunting for it.
  useEffect(() => {
    panelRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [mode]);
  const [activeTab, setActiveTab] = useState<"details" | "media" | "subcategories" | "crosslisting">("details");
  const [iconTab, setIconTab] = useState<"library" | "custom">("library");
  const [iconSearch, setIconSearch] = useState("");
  const [iconCategory, setIconCategory] = useState<string>("All");

  const [linkingChildId, setLinkingChildId] = useState<number | "">("");
  const [linkingActionLoading, setLinkingActionLoading] = useState(false);
  const [autoSlug, setAutoSlug] = useState(mode === "add");

  const hasUnsavedChanges = useMemo(() => {
    if (mode === "add") {
      return Boolean(form.name.trim() || form.imageUrl || form.description.trim());
    }
    const initLinked = (initial.linkedParents || []).slice().sort().join(",");
    const currLinked = (form.linkedParents || []).slice().sort().join(",");
    return (
      form.name !== initial.name ||
      form.slug !== initial.slug ||
      form.parent !== initial.parent ||
      form.type !== initial.type ||
      (form.description || "") !== (initial.description || "") ||
      Boolean(form.isActive) !== Boolean(initial.isActive) ||
      (form.imageUrl || "") !== (initial.imageUrl || "") ||
      (form.imageAlt || "") !== (initial.imageAlt || "") ||
      (form.icon || "") !== (initial.icon || "") ||
      (form.bgTheme || "blue") !== (initial.bgTheme || "blue") ||
      form.sortOrder !== initial.sortOrder ||
      currLinked !== initLinked
    );
  }, [form, initial, mode]);

  useEffect(() => {
    setForm({ ...initial, linkedParents: initial.linkedParents || [] });
    setError("");
    setActiveTab("details");
    setAutoSlug(mode === "add" || !initial.slug);
    isSavedRef.current = false;
    sessionUploadedRef.current = [];
  }, [initial, mode]);

  const filteredIcons = useMemo(() => {
    const q = iconSearch.trim().toLowerCase();
    return CURATED_ICONS.filter((item) => {
      const matchesCat = iconCategory === "All" || item.category === iconCategory;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [iconSearch, iconCategory]);

  const banned = initial.id ? descendantIdSet(flat, initial.id) : new Set<number>();
  const parentOptions = flat.filter((c) => c.id !== initial.id && !banned.has(c.id));
  const mainCategoryOptions = flat.filter(
    (c) => c.parent === 0 && c.id !== initial.id && (initial.id ? true : c.slug !== form.slug)
  );
  const destParent = form.type === "main" ? 0 : form.parent;
  const positionSiblings = siblingsOf(flat, destParent, initial.id);
  const categoryId = initial.id;
  const directChildCats = categoryId ? directChildren(flat, categoryId) : [];
  const crossListedChildCats = categoryId
    ? flat.filter(
        (c) =>
          c.id !== categoryId &&
          c.parent !== categoryId &&
          Array.isArray(c.linked_parents) &&
          c.linked_parents.includes(categoryId)
      )
    : [];
  const linkableCandidates = categoryId
    ? flat.filter(
        (c) =>
          c.id !== categoryId &&
          c.parent !== categoryId &&
          !(Array.isArray(c.linked_parents) && c.linked_parents.includes(categoryId)) &&
          !banned.has(c.id)
      )
    : [];

  const handleLinkExistingChild = async (childId: number) => {
    if (!initial.id || !childId) return;
    setLinkingActionLoading(true);
    try {
      const target = flat.find((c) => c.id === childId);
      if (!target) return;
      const currentLinked = Array.isArray(target.linked_parents) ? target.linked_parents : [];
      if (currentLinked.includes(initial.id)) return;
      const updatedLinked = [...currentLinked, initial.id];
      const res = await authFetch(`/api/admin/categories/${childId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linked_parents: updatedLinked }),
      });
      if (!res.ok) throw new Error("Failed to link category");
      setLinkingChildId("");
      if (onReload) await onReload();
    } catch (e: unknown) {
      const err = e as { message?: string } | undefined;
      setError(err?.message || "Failed to link category");
    } finally {
      setLinkingActionLoading(false);
    }
  };

  const handleUnlinkChild = async (childCat: WCCategory) => {
    if (!initial.id) return;
    setLinkingActionLoading(true);
    try {
      const currentLinked = Array.isArray(childCat.linked_parents) ? childCat.linked_parents : [];
      const updatedLinked = currentLinked.filter((id) => id !== initial.id);
      const res = await authFetch(`/api/admin/categories/${childCat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linked_parents: updatedLinked }),
      });
      if (!res.ok) throw new Error("Failed to unlink category");
      if (onReload) await onReload();
    } catch (e: unknown) {
      const err = e as { message?: string } | undefined;
      setError(err?.message || "Failed to unlink category");
    } finally {
      setLinkingActionLoading(false);
    }
  };

  const set = <K extends keyof FormData>(key: K, val: FormData[K]) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: autoSlug || mode === "add" || !prev.slug ? slugify(name) : prev.slug,
    }));
  };

  const sessionUploadedRef = useRef<Array<{ id: number | null; url: string }>>([]);
  const isSavedRef = useRef(false);

  const handleClose = async () => {
    // If user uploaded an image in this studio session but didn't save, clean it from Cloudinary
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.name.trim()) { setError("Category name is required"); return; }
    if (form.type === "sub" && !form.parent) { setError("Please select a parent category"); return; }
    setSaving(true);
    setError("");
    try {
      isSavedRef.current = true;
      await onSave({
        ...form,
        id: initial.id,
        linkedParents: form.linkedParents || [],
      });
    }
    catch (err: unknown) {
      isSavedRef.current = false;
      const errorObj = err as { message?: string } | undefined;
      setError(errorObj?.message || "Failed to save category");
    }
    finally { setSaving(false); }
  };

  const handleRemoveImage = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const toDeleteId = form.imageId;
    const toDeleteUrl = form.imageUrl;

    // Remove from UI form immediately
    set("imageUrl", "");
    set("imageId", null);
    set("imageAlt", "");

    // Remove from session tracking if present
    sessionUploadedRef.current = sessionUploadedRef.current.filter(
      (item) => (item.id && item.id === toDeleteId) || item.url === toDeleteUrl
    );

    // Immediately remove from Cloudinary
    if (toDeleteId || toDeleteUrl) {
      try {
        await authFetch("/api/admin/upload", {
          method: "DELETE",
          body: JSON.stringify({ id: toDeleteId, url: toDeleteUrl }),
        });
      } catch (err) {
        console.error("Failed to delete category image from Cloudinary:", err);
      }
    }
  };

  const handleUpload = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) return setError("Image is too large (15MB max).");
    if (!file.type.startsWith("image/")) return setError("Please select a valid image file.");
    setUploading(true); setError("");
    const prevId = form.imageId;
    const prevUrl = form.imageUrl;
    try {
      // Build hierarchical category folder path:
      // Main Category: ANGKON / CATEGORIES / <CATEGORY>
      // Subcategory:   ANGKON / CATEGORIES / <PARENT_CATEGORY> / <SUBCATEGORY>
      let folder = "ANGKON/CATEGORIES";
      const catSlugClean = (form.slug || slugify(form.name) || "CATEGORY")
        .toUpperCase()
        .replace(/[^A-Z0-9_\s-]/g, "")
        .replace(/[\s-]+/g, "_");

      if (form.type === "sub" && form.parent) {
        const ancestors = ancestorIdsOf(flat, form.parent).reverse();
        const ancestorSlugs = [...ancestors, form.parent]
          .map((id) => flat.find((c) => c.id === id)?.slug || flat.find((c) => c.id === id)?.name)
          .filter(Boolean) as string[];

        const ancestorParts = ancestorSlugs.map((s) =>
          s.toUpperCase().replace(/[^A-Z0-9_\s-]/g, "").replace(/[\s-]+/g, "_")
        );

        folder = ["ANGKON", "CATEGORIES", ...ancestorParts, catSlugClean].join("/");
      } else {
        folder = `ANGKON/CATEGORIES/${catSlugClean}`;
      }

      const prepared = await convertImageToWebP(file);
      if (prepared.size > 8 * 1024 * 1024) {
        throw new Error("Image is still over 8MB. Please choose a smaller image.");
      }

      const fd = new FormData();
      fd.append("image", prepared);
      fd.append("folder", folder);
      fd.append("uploadType", "category");
      if (form.type === "sub" && form.parent) {
        const parentCat = flat.find((c) => c.id === form.parent);
        fd.append("category", parentCat?.slug || parentCat?.name || "PARENT");
        fd.append("subcategory", form.slug || form.name);
      } else {
        fd.append("category", form.slug || form.name);
      }

      const res = await authFetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        const detail = Array.isArray(d.details) ? ` (${d.details.slice(0, 2).join("; ")})` : "";
        if (res.status === 413) throw new Error("The image is too large for the server. Please choose a smaller image.");
        if (res.status === 401) throw new Error("Your admin session expired. Please log in again.");
        if (res.status === 503) throw new Error("Image storage isn't set up on this server: add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in the hosting environment variables, then redeploy.");
        throw new Error((d.error || `Upload failed (${res.status})`) + detail);
      }
      const data = await res.json();
      const numericId = data.id && Number.isFinite(Number(data.id)) ? Number(data.id) : null;
      set("imageUrl", data.url);
      set("imageId", numericId);
      set("imageAlt", data.alt ?? form.name);

      // Track uploaded in session
      sessionUploadedRef.current.push({ id: numericId, url: data.url });

      // If replacing an existing image, delete the old one from Cloudinary
      if ((prevId || prevUrl) && (prevId !== data.id || prevUrl !== data.url)) {
        void authFetch("/api/admin/upload", {
          method: "DELETE",
          body: JSON.stringify({ id: prevId, url: prevUrl }),
        });
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string } | undefined;
      setError(errorObj?.message || "Upload failed");
    }
    finally { setUploading(false); }
  };

  const parentName = form.parent ? catName(flat.find((c) => c.id === form.parent) || { name: "" }) : "";

  return (
    <div
      ref={panelRef}
      className="bg-white rounded-2xl border border-gray-200/90 shadow-md sticky top-2 flex flex-col overflow-hidden max-h-[calc(100dvh-7rem)] scroll-mt-2"
    >
      {/* Studio Header (Sticky) */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 bg-white/95 backdrop-blur shrink-0 z-20">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={handleClose}
            className="lg:hidden p-1.5 -ml-1 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition shrink-0"
            title="Back to list"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200/60 flex items-center justify-center shrink-0 shadow-xs">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[15px] sm:text-[16px] font-black text-gray-900 truncate">
                {mode === "add"
                  ? form.parent
                    ? `Add Sub under “${parentName}”`
                    : "Create Category"
                  : catName(form)}
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                form.parent === 0
                  ? "bg-amber-100/70 text-amber-950 border border-amber-200"
                  : "bg-blue-50 text-blue-800 border border-blue-200"
              }`}>
                {form.parent === 0 ? "Root Collection" : "Subcategory"}
              </span>
              {hasUnsavedChanges && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />
                  Unsaved changes
                </span>
              )}
            </div>
            <p className="text-[12px] text-gray-500 font-mono truncate mt-0.5">
              /{form.slug || slugify(form.name) || "category-slug"}
            </p>
          </div>
        </div>

        {/* Actions live in the pinned footer only — no duplicate header buttons. */}
      </div>

      {/* Navigation Sub-Tabs (Sticky) */}
      <div className="flex items-center gap-1 px-4 sm:px-6 pt-2 border-b border-gray-100 bg-white shrink-0 overflow-x-auto z-10">
        <button
          type="button"
          onClick={() => setActiveTab("details")}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-bold border-b-2 transition -mb-px whitespace-nowrap ${
            activeTab === "details"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Tag className="h-3.5 w-3.5" />
          Details
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("media")}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-bold border-b-2 transition -mb-px whitespace-nowrap ${
            activeTab === "media"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          Image & Icon
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("subcategories")}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-bold border-b-2 transition -mb-px whitespace-nowrap ${
            activeTab === "subcategories"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Subcategories {directChildCats.length > 0 ? `(${directChildCats.length})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("crosslisting")}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-bold border-b-2 transition -mb-px whitespace-nowrap ${
            activeTab === "crosslisting"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Cross-listing {((form.linkedParents?.length || 0) + crossListedChildCats.length) > 0 ? `(${((form.linkedParents?.length || 0) + crossListedChildCats.length)})` : ""}
        </button>
      </div>

      {/* Form Content */}
      <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-5">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-[13px] font-medium text-red-600 mb-5">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* ─── TAB 1: DETAILS ─────────────────────────────────────────── */}
        {activeTab === "details" && (
          <div className="space-y-5">
            {/* Category Name & URL Slug (Side-by-side per user design) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category Name */}
              <div>
                <label className="block text-[12px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Men, Shirts, Half Sleeves"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[14px] text-gray-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 font-semibold shadow-2xs"
                  required
                />
              </div>

              {/* URL Slug on Right Side */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[12px] font-bold text-gray-700 uppercase tracking-wider">
                    URL Slug <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!autoSlug) {
                        set("slug", slugify(form.name));
                        setAutoSlug(true);
                      } else {
                        setAutoSlug(false);
                      }
                    }}
                    className={`text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                      autoSlug ? "text-purple-600 hover:text-purple-700" : "text-gray-400 hover:text-gray-600"
                    }`}
                    title={autoSlug ? "URL is auto-syncing with Category Name. Click to customize." : "Click to auto-sync URL with Category Name."}
                  >
                    {autoSlug ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    <span>{autoSlug ? "Auto-synced" : "Custom"}</span>
                  </button>
                </div>
                <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2 text-[13px] font-mono focus-within:border-purple-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-purple-100 transition shadow-2xs">
                  <span className="text-gray-400 text-xs shrink-0 select-none mr-0.5">/product-category/</span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => {
                      set("slug", slugify(e.target.value));
                      setAutoSlug(false);
                    }}
                    placeholder="slug"
                    className="w-full bg-transparent text-[13px] font-mono font-bold text-gray-900 outline-none"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1 truncate">
                  Storefront URL:{" "}
                  <a
                    href={`/product-category/${form.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-purple-600 hover:underline font-semibold"
                  >
                    /product-category/{form.slug || "slug"} ↗
                  </a>
                </p>
              </div>
            </div>

            {/* Parent Category & Hierarchy Placement */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4 space-y-3.5">
              <div>
                <label className="block text-[12px] font-bold text-gray-800 uppercase tracking-wider mb-1.5">
                  Hierarchy Placement
                </label>
                <div className="flex items-center rounded-xl border border-gray-200 bg-gray-100/80 p-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      set("type", "main");
                      set("parent", 0);
                      set("sortOrder", siblingsOf(flat, 0, initial.id).length);
                    }}
                    className={`flex-1 py-2 px-3 text-[13px] font-bold rounded-lg transition-all text-center cursor-pointer ${
                      form.type === "main"
                        ? "bg-white text-purple-700 shadow-xs border border-gray-200/80"
                        : "text-gray-600 hover:text-gray-900 border border-transparent"
                    }`}
                  >
                    Main Category (Root)
                  </button>

                  {/* Middle divider border */}
                  <div className="h-5 w-[1px] bg-gray-300 mx-1 shrink-0" aria-hidden="true" />

                  <button
                    type="button"
                    onClick={() => {
                      set("type", "sub");
                    }}
                    className={`flex-1 py-2 px-3 text-[13px] font-bold rounded-lg transition-all text-center cursor-pointer ${
                      form.type === "sub"
                        ? "bg-white text-purple-700 shadow-xs border border-gray-200/80"
                        : "text-gray-600 hover:text-gray-900 border border-transparent"
                    }`}
                  >
                    Subcategory (Nested)
                  </button>
                </div>
              </div>

              {form.type === "sub" ? (
                <div>
                  <label className="block text-[12px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Parent Category <span className="text-red-500">*</span>
                  </label>
                  <ParentCategoryPicker
                    value={form.parent}
                    options={parentOptions}
                    allCats={flat}
                    onChange={(id) => {
                      setForm((prev) => ({
                        ...prev,
                        parent: id,
                        sortOrder: siblingsOf(flat, id, initial.id).length,
                      }));
                    }}
                  />
                  <p className="text-[11px] text-gray-500 mt-1.5">
                    Sets the primary structural home and storefront breadcrumb. For secondary placements, use the <b>Cross-listing</b> tab.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-white rounded-xl border border-gray-200/70 text-[12px] text-gray-600">
                  <span className="font-bold text-gray-800">Root Category:</span> Appears at the top level of storefront menus and navigation.
                </div>
              )}
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 bg-white">
              <div>
                <p className="text-[13px] font-bold text-gray-900">Category Visibility</p>
                <p className="text-[11px] text-gray-500">
                  {form.isActive ? "Visible in storefront menus, search, and navigation" : "Hidden from customer storefront"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => set("isActive", !form.isActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  form.isActive ? "bg-emerald-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    form.isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[12px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Description (Storefront Header & SEO)
              </label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="Brief description for category banner and SEO meta..."
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] text-gray-700 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100"
              />
            </div>

            {/* Position / Order */}
            <div>
              <label className="block text-[12px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Display Position in Sibling List
              </label>
              <PositionPicker
                siblings={positionSiblings}
                value={form.sortOrder}
                onChange={(index) => set("sortOrder", index)}
              />
            </div>
          </div>
        )}

        {/* ─── TAB 2: IMAGE & ICON ────────────────────────────────────── */}
        {activeTab === "media" && (
          <div className="space-y-5">
            {/* Category Image */}
            <div>
              <label className="block text-[12px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Category Image (Banner / Card)
              </label>
              <div
                className={`relative border-2 border-dashed rounded-xl p-5 transition-all ${
                  dragActive ? "border-purple-600 bg-purple-50/40" : "border-gray-200 bg-gray-50/60 hover:bg-gray-100"
                }`}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0]);
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) handleUpload(e.target.files[0]);
                    e.target.value = "";
                  }}
                />
                <div className="flex flex-col items-center justify-center text-center">
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2 text-purple-600">
                      <Loader2 className="h-7 w-7 animate-spin" />
                      <span className="text-[13px] font-medium">Uploading image...</span>
                    </div>
                  ) : form.imageUrl ? (
                    <div className="relative group flex flex-col items-center">
                      <div className="relative">
                        <Image
                          src={form.imageUrl}
                          alt="Category"
                          width={128}
                          height={128}
                          className="h-32 w-32 object-cover rounded-xl border border-gray-200 shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          title="Remove image"
                          className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full cursor-pointer hover:bg-red-600 shadow-md transition"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-[12px] font-bold shadow-2xs transition flex items-center gap-1.5"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Change Image
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-[12px] font-bold transition flex items-center gap-1.5"
                        >
                          <X className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="bg-white p-2.5 rounded-full shadow-xs mb-2 text-purple-600">
                        <UploadCloud className="h-5 w-5" />
                      </div>
                      <p className="text-[13px] font-semibold text-gray-800">Drag & drop category image</p>
                      <p className="text-[12px] text-gray-500 my-1">
                        or{" "}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-purple-600 font-bold hover:underline"
                        >
                          browse files
                        </button>
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">Recommended: 1000×1000px · auto-optimized</p>
                    </>
                  )}
                </div>
              </div>

              {/* Curated Luxury Presets */}
              <div className="mt-3">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  {form.type === "main"
                    ? "Or Pick Main Category Banner Preset:"
                    : "Or Pick Subcategory Banner Preset:"}
                </p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {(form.type === "main" ? MAIN_CATEGORY_PRESETS : SUB_CATEGORY_PRESETS).map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        set("imageUrl", preset.src);
                        set("imageAlt", preset.name);
                      }}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border shrink-0 transition text-left ${
                        form.imageUrl === preset.src
                          ? "border-purple-600 bg-purple-50 ring-1 ring-purple-600"
                          : "border-gray-200 bg-gray-50/80 hover:bg-white"
                      }`}
                    >
                      <Image src={preset.src} alt="" width={28} height={28} className="h-7 w-7 rounded-lg object-cover border border-gray-200 shrink-0" />
                      <span className="text-[12px] font-bold text-gray-800">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Category Icon */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[12px] font-bold text-gray-700 uppercase tracking-wider">
                  Category Icon
                </label>
                <div className="flex bg-gray-100 p-0.5 rounded-lg text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setIconTab("library")}
                    className={`px-2.5 py-1 rounded-md transition ${
                      iconTab === "library" ? "bg-white text-purple-600 shadow-xs" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Library ({CURATED_ICONS.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setIconTab("custom")}
                    className={`px-2.5 py-1 rounded-md transition ${
                      iconTab === "custom" ? "bg-white text-purple-600 shadow-xs" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Custom Emoji
                  </button>
                </div>
              </div>

              {/* Active Icon Pill */}
              {form.icon && (
                <div className="flex items-center justify-between p-2.5 mb-2.5 bg-purple-50 border border-purple-200/60 rounded-xl">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-white border border-purple-200 flex items-center justify-center shrink-0 shadow-xs text-lg">
                      {isIconUrl(form.icon) ? (
                        <Image src={form.icon} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
                      ) : (
                        <span>{form.icon}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-gray-800 truncate">
                        {CURATED_ICONS.find((i) => i.icon === form.icon)?.label || "Selected Icon"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => set("icon", "")}
                    className="text-[11px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-md transition"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Curated Icon Grid */}
              {iconTab === "library" && (
                <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={iconSearch}
                      onChange={(e) => setIconSearch(e.target.value)}
                      placeholder="Search icons (dress, saree, bag, shoe, ring)..."
                      className="w-full pl-8 pr-7 py-1.5 text-[12px] rounded-lg border border-gray-200 outline-none bg-white focus:border-purple-400 focus:ring-1 focus:ring-purple-100"
                    />
                    {iconSearch && (
                      <button
                        type="button"
                        onClick={() => setIconSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex gap-1 overflow-x-auto pb-1 text-[11px]">
                    {ICON_CATEGORIES.map((cat) => {
                      const isSelected = iconCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setIconCategory(cat)}
                          className={`px-2 py-0.5 rounded-md whitespace-nowrap font-medium transition ${
                            isSelected
                              ? "bg-purple-600 text-white font-bold"
                              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/70"
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>

                  <div className="max-h-40 overflow-y-auto pr-1">
                    <div className="grid grid-cols-6 sm:grid-cols-7 gap-1">
                      {filteredIcons.map((item) => {
                        const isSelected = form.icon === item.icon;
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => set("icon", item.icon)}
                            title={`${item.label} (${item.category})`}
                            className={`h-9 flex items-center justify-center rounded-lg text-lg transition ${
                              isSelected
                                ? "bg-purple-600 text-white shadow-xs ring-2 ring-purple-600"
                                : "bg-white hover:bg-purple-50 border border-gray-100"
                            }`}
                          >
                            <span>{item.icon}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Emoji */}
              {iconTab === "custom" && (
                <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 space-y-2">
                  <input
                    type="text"
                    value={form.icon}
                    onChange={(e) => set("icon", e.target.value)}
                    placeholder="Type or paste any emoji (e.g. 👗, 🥻, 🧵, ✨)"
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-[14px] text-gray-800 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100 bg-white"
                  />
                  <p className="text-[11px] text-gray-500">
                    Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 font-mono text-[10px]">Win + .</kbd> on Windows to open emoji keyboard.
                  </p>
                </div>
              )}
            </div>

            {/* Background Theme */}
            <div>
              <label className="block text-[12px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Background Theme
              </label>
              <select
                value={form.bgTheme}
                onChange={(e) => set("bgTheme", e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-700 outline-none bg-white focus:border-purple-400"
              >
                <option value="slate">Slate</option>
                <option value="blue">Blue</option>
                <option value="rose">Rose</option>
                <option value="emerald">Emerald</option>
                <option value="orange">Orange</option>
                <option value="violet">Violet</option>
                <option value="pink">Pink</option>
                <option value="amber">Amber</option>
              </select>
            </div>

            {/* Live Preview */}
            <div className="pt-2">
              <label className="block text-[11px] font-bold text-gray-400 mb-2 text-center uppercase tracking-widest">
                Live Storefront Circle Preview
              </label>
              <div className="flex justify-center p-4 rounded-xl border border-gray-100 bg-gray-50/60">
                <div className="flex flex-col items-center gap-2">
                  {(() => {
                    const themeColors: Record<string, string> = {
                      slate: "#475569",
                      blue: "#2563eb",
                      rose: "#e11d48",
                      emerald: "#059669",
                      orange: "#ea580c",
                      violet: "#7c3aed",
                      pink: "#db2777",
                      amber: "#b45309",
                    };
                    const hex = themeColors[form.bgTheme] || "#2563eb";
                    const hasIcon = Boolean(form.icon && form.icon.trim() !== "");
                    const hasImg = Boolean(form.imageUrl && form.imageUrl.trim() !== "");

                    return (
                      <div
                        className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full ring-4 ring-white shadow-sm"
                        style={{
                          background: `linear-gradient(135deg, ${hex}16 0%, ${hex}32 100%)`,
                        }}
                      >
                        {hasIcon ? (
                          isIconUrl(form.icon) ? (
                            <Image src={form.icon} alt="" width={40} height={40} className="h-10 w-10 object-contain" />
                          ) : (
                            <span className="text-3xl select-none">{form.icon}</span>
                          )
                        ) : hasImg ? (
                          <Image src={form.imageUrl} alt="" width={80} height={80} className="h-full w-full object-cover select-none" />
                        ) : (
                          <span className="text-3xl select-none">👗</span>
                        )}
                      </div>
                    );
                  })()}
                  <span className="text-center text-[13px] font-bold text-gray-900 max-w-[140px] truncate">
                    {form.name || "Category"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: SUBCATEGORIES ───────────────────────────────────── */}
        {activeTab === "subcategories" && (
          <div className="space-y-6">
            {!initial.id ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
                <FolderOpen className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-[13px] font-bold text-gray-800">Save category first</p>
                <p className="text-[12px] text-gray-500 max-w-xs mx-auto mt-1">
                  Once this category is created and saved, you can add and manage direct subcategories under it.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div>
                    <h4 className="text-[13px] font-bold text-gray-900 flex items-center gap-1.5">
                      <FolderOpen className="h-4 w-4 text-purple-600" />
                      Direct Subcategories ({directChildCats.length})
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Child categories whose primary parent is {catName(form)}
                    </p>
                  </div>
                  {onAddChild && (
                    <button
                      type="button"
                      onClick={() => onAddChild(initial.id!)}
                      className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-purple-700 transition shadow-sm shadow-purple-200"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Subcategory
                    </button>
                  )}
                </div>

                {directChildCats.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
                    <FolderOpen className="h-7 w-7 text-gray-300 mx-auto mb-1.5" />
                    <p className="text-[13px] font-bold text-gray-700">No direct subcategories</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 mb-3">
                      Click &ldquo;Add Subcategory&rdquo; above to create a child category directly under {catName(form)}.
                    </p>
                    {onAddChild && (
                      <button
                        type="button"
                        onClick={() => onAddChild(initial.id!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-600 text-purple-600 hover:bg-purple-50 text-[12px] font-bold transition"
                      >
                        <Plus className="h-3.5 w-3.5" /> Create Subcategory
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {directChildCats.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/70 hover:bg-white transition shadow-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {sub.image?.src ? (
                            <Image
                              src={sub.image.src}
                              alt=""
                              width={32}
                              height={32}
                              className="h-8 w-8 rounded-lg object-cover border border-gray-100 shrink-0"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-gray-400">
                              <FolderOpen className="h-4 w-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-gray-900 truncate">{catName(sub)}</p>
                            <p className="text-[11px] text-gray-400 font-mono truncate">
                              /{sub.slug} · {sub.count} items
                            </p>
                          </div>
                        </div>
                        {onEditChild && (
                          <button
                            type="button"
                            onClick={() => onEditChild(sub)}
                            className="text-[12px] font-bold text-purple-600 hover:bg-purple-50 px-2.5 py-1 rounded-lg transition"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: CROSS-LISTING ───────────────────────────────────── */}
        {activeTab === "crosslisting" && (
          <div className="space-y-5">
            {/* Context-aware concise tip */}
            <div className="rounded-xl border border-purple-100 bg-purple-50/60 p-3 flex items-center gap-2.5 text-[12px] text-purple-900 shadow-2xs">
              <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
              <span>
                <b>Multi-Department Placement:</b> Display categories across multiple departments simultaneously without duplicating products or breaking canonical SEO URLs.
              </span>
            </div>

            {/* CASE 1: MAIN / ROOT CATEGORY */}
            {form.type === "main" ? (
              <div className="space-y-6">
                {/* 1. Collections Featured Inside This Main Category (e.g., Ethnic Wear inside Women) */}
                <div className="space-y-3">
                  <div className="pb-1 border-b border-gray-100">
                    <h4 className="text-[13px] font-bold text-gray-900 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-purple-600" />
                      Collections Featured in &ldquo;{catName(form)}&rdquo; ({crossListedChildCats.length})
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Collections from other departments that also appear in {catName(form)}&apos;s storefront navigation menu.
                    </p>
                  </div>

                  {crossListedChildCats.length === 0 ? (
                    <div className="p-4 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
                      <p className="text-[12px] font-semibold text-gray-600">No external collections featured in {catName(form)} yet</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Use the selector below to feature another collection inside {catName(form)}.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {crossListedChildCats.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl border border-purple-100 bg-purple-50/40 hover:bg-purple-50/70 transition shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {sub.image?.src ? (
                              <Image
                                src={sub.image.src}
                                alt=""
                                width={36}
                                height={36}
                                className="h-9 w-9 rounded-lg object-cover border border-purple-200 shrink-0"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 text-purple-700">
                                <Sparkles className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-[13px] font-bold text-gray-900 truncate">{catName(sub)}</p>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                                  ✨ Featured Collection
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 font-mono truncate">
                                /{sub.slug} · {sub.count} products
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {onEditChild && (
                              <button
                                type="button"
                                onClick={() => onEditChild(sub)}
                                className="text-[11px] font-bold text-purple-700 hover:bg-purple-100 px-2.5 py-1 rounded-lg transition cursor-pointer"
                              >
                                Edit
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={linkingActionLoading}
                              onClick={() => handleUnlinkChild(sub)}
                              className="text-[11px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg transition disabled:opacity-50 cursor-pointer"
                              title={`Remove from ${catName(form)}`}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Collection to This Department */}
                  {linkableCandidates.length > 0 && (
                    <div className="p-3 rounded-xl border border-purple-100 bg-gradient-to-r from-purple-50/40 to-white flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-purple-950 mb-1">
                          + Feature Another Collection in {catName(form)}
                        </label>
                        <select
                          value={linkingChildId}
                          onChange={(e) => setLinkingChildId(e.target.value ? Number(e.target.value) : "")}
                          className="w-full rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-800 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200"
                        >
                          <option value="">Choose a collection to feature in {catName(form)}...</option>
                          {linkableCandidates.map((cand) => (
                            <option key={cand.id} value={cand.id}>
                              {catName(cand)} (/{cand.slug}) — {cand.count} items
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        disabled={!linkingChildId || linkingActionLoading}
                        onClick={() => {
                          if (typeof linkingChildId === "number") {
                            void handleLinkExistingChild(linkingChildId);
                          }
                        }}
                        className="sm:self-end px-3.5 py-1.5 rounded-lg bg-purple-600 text-white text-[12px] font-bold hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm shadow-purple-200 cursor-pointer"
                      >
                        {linkingActionLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        <span>Add to {catName(form)}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Secondary Placement (Visible if this collection is also featured in another department, e.g. Ethnic Wear inside Women) */}
                {(form.linkedParents && form.linkedParents.length > 0) || initial.id === 914 ? (
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <div className="pb-1 border-b border-gray-100">
                      <h4 className="text-[13px] font-bold text-gray-900 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                        Also Feature &ldquo;{catName(form)}&rdquo; in Other Departments
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        {catName(form)} is an independent Main Category on the storefront, and can also be featured inside other department menus.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {mainCategoryOptions.filter((m) => m.id !== initial.id).map((mainCat) => {
                        const isChecked = (form.linkedParents || []).includes(mainCat.id);
                        return (
                          <label
                            key={mainCat.id}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-[13px] font-semibold cursor-pointer transition select-none ${
                              isChecked
                                ? "bg-purple-50 border-purple-300 text-purple-900 font-bold shadow-xs ring-1 ring-purple-300"
                                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const current = form.linkedParents || [];
                                const next = e.target.checked
                                  ? [...current, mainCat.id]
                                  : current.filter((id) => id !== mainCat.id);
                                set("linkedParents", next);
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="truncate">{catName(mainCat)}</span>
                            {isChecked && (
                              <span className="text-[10px] font-bold text-purple-700 ml-auto bg-purple-100 px-2 py-0.5 rounded-full">
                                Featured
                              </span>
                            )}
                            {mainCat.image?.src && !isChecked && (
                              <Image
                                src={mainCat.image.src}
                                alt=""
                                width={20}
                                height={20}
                                className="h-5 w-5 rounded-full ml-auto object-cover border border-gray-200"
                              />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              /* CASE 2: SUBCATEGORY (Only show "Also Display in Other Departments") */
              <div className="space-y-4">
                <div className="pb-1 border-b border-gray-100">
                  <h4 className="text-[13px] font-bold text-gray-900 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    Also Display &ldquo;{catName(form)}&rdquo; in Other Departments
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Primary Home: <b className="text-gray-700">{catName(flat.find((c) => c.id === form.parent) || { name: "Root" })}</b>. Select additional departments where this subcategory should also appear in menus.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {mainCategoryOptions.filter((m) => m.id !== form.parent).map((mainCat) => {
                    const isChecked = (form.linkedParents || []).includes(mainCat.id);
                    return (
                      <label
                        key={mainCat.id}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-[13px] font-semibold cursor-pointer transition select-none ${
                          isChecked
                            ? "bg-purple-50 border-purple-300 text-purple-900 font-bold shadow-xs ring-1 ring-purple-300"
                            : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const current = form.linkedParents || [];
                            const next = e.target.checked
                              ? [...current, mainCat.id]
                              : current.filter((id) => id !== mainCat.id);
                            set("linkedParents", next);
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="truncate">{catName(mainCat)}</span>
                        {isChecked && (
                          <span className="text-[10px] font-bold text-purple-700 ml-auto bg-purple-100 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                        {mainCat.image?.src && !isChecked && (
                          <Image
                            src={mainCat.image.src}
                            alt=""
                            width={20}
                            height={20}
                            className="h-5 w-5 rounded-full ml-auto object-cover border border-gray-200"
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
                {mainCategoryOptions.filter((m) => m.id !== form.parent).length === 0 && (
                  <p className="text-[12px] text-gray-400 italic">No other main departments available to link under.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pinned footer — the only place the Save/Cancel actions live */}
      <div className="sticky bottom-0 z-20 flex shrink-0 items-center justify-between gap-3 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur sm:px-6">
        <div className="min-w-0">
          {mode === "edit" && form.slug ? (
            <a
              href={`/product-category/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 truncate text-[11px] font-bold text-gray-500 transition hover:text-purple-600"
            >
              View on Storefront <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="rounded-xl px-4 py-2 text-[12px] font-bold text-gray-600 transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/40 disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={saving}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-purple-600 px-5 py-2 text-[13px] font-bold text-white shadow-md shadow-purple-200 transition hover:bg-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{mode === "add" ? "Creating…" : "Saving…"}</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>{mode === "add" ? "Create Category" : "Save Changes"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}