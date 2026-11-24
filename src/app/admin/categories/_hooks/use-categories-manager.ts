"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { WCCategory, CategoryTree, FormData } from "../types";
import {
  catName,
  slugify,
  buildTree,
  sortedChildrenOf,
  parentsWithChildrenIds,
  ancestorIdsOf,
  descendantIdSet,
  subtreeList,
  getStatus,
} from "../category-tree-utils";

/* ─── Client Cache for Instant Tab Switching ──────────────────────── */
let cachedFlatCategories: WCCategory[] | null = null;
let cachedTreeCategories: CategoryTree[] | null = null;

export type DropTarget = { id: number; pos: "before" | "after" | "inside" } | { id: "root" } | null;

export function useCategoriesManager() {
  const { authFetch } = useAuth();
  const [flat, setFlat] = useState<WCCategory[]>(cachedFlatCategories || []);
  const [tree, setTree] = useState<CategoryTree[]>(cachedTreeCategories || []);
  const [loading, setLoading] = useState(!cachedFlatCategories);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [studio, setStudio] = useState<{ mode: "add" | "edit"; initial: FormData & { id?: number } } | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [mobileTab, setMobileTab] = useState<"explorer" | "studio">("explorer");
  const [moveCat, setMoveCat] = useState<WCCategory | null>(null);
  const [deleteCat, setDeleteCat] = useState<WCCategory | null>(null);
  const [createModal, setCreateModal] = useState<{
    isOpen: boolean;
    initialType?: "main" | "sub";
    initialParentId?: number;
  } | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [processing, setProcessing] = useState<{
    label: string;
    detail?: string;
    blocking?: boolean;
  } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "main" | "sub">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());
  const [activeMenuCatId, setActiveMenuCatId] = useState<number | null>(null);

  // Drag & Drop
  const [dragId, setDragId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const dndEnabled = !search.trim() && filterType === "all" && filterStatus === "all";

  useEffect(() => {
    const handleGlobalClick = () => {
      if (activeMenuCatId !== null) setActiveMenuCatId(null);
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [activeMenuCatId]);

  const toggleCollapse = (id: number) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setCollapsedIds(new Set());
  const collapseAll = () => setCollapsedIds(new Set(parentsWithChildrenIds(flat)));

  const showToast = useCallback((msg: string, ok = true) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, ok });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3500);
  }, []);

  const flatRef = useRef<WCCategory[]>(flat);
  useEffect(() => {
    flatRef.current = flat;
  }, [flat]);

  const selectedCatIdRef = useRef<number | null>(null);
  const initialSelectedRef = useRef(false);

  const selectForStudio = useCallback((cat: WCCategory, allCats?: WCCategory[]) => {
    selectedCatIdRef.current = cat.id;
    setSelectedCatId(cat.id);
    const list = allCats || flatRef.current;
    const ordered = list.filter((c) => c.parent === cat.parent).sort((a, b) => (a.menu_order ?? 0) - (b.menu_order ?? 0));
    const sortOrder = Math.max(0, ordered.findIndex((c) => c.id === cat.id));
    const iconMeta = cat.meta_data?.find((m) => m.key === "_angkon_icon" || m.key === "_plainstitch_icon")?.value;
    const bgMeta = cat.meta_data?.find((m) => m.key === "_angkon_bgTheme" || m.key === "_plainstitch_bgTheme")?.value;
    setStudio({
      mode: "edit",
      initial: {
        id: cat.id,
        type: cat.parent === 0 ? "main" : "sub",
        name: cat.name,
        slug: cat.slug,
        description: cat.description || "",
        parent: cat.parent,
        linkedParents: Array.isArray(cat.linked_parents) ? cat.linked_parents : [],
        sortOrder,
        isActive: getStatus(cat),
        imageUrl: cat.image?.src ?? "",
        imageAlt: cat.image?.alt ?? "",
        imageId: cat.image?.id ?? null,
        icon: typeof iconMeta === "string" ? iconMeta : "",
        bgTheme: typeof bgMeta === "string" ? bgMeta : "blue",
      },
    });
    setMobileTab("studio");
  }, []);

  const load = useCallback(
    async (soft = false) => {
      if (!cachedFlatCategories && !soft) setLoading(true);
      try {
        const res = await authFetch("/api/admin/categories");
        if (res.status === 401) {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = "/admin";
          return;
        }
        const data: WCCategory[] = await res.json();
        if (Array.isArray(data)) {
          cachedFlatCategories = data;
          const built = buildTree(data);
          cachedTreeCategories = built;
          flatRef.current = data;
          setFlat(data);
          setTree(built);
          if (!initialSelectedRef.current) setCollapsedIds(new Set(parentsWithChildrenIds(data)));

          const currentSelectedId = selectedCatIdRef.current;
          if (currentSelectedId) {
            const fresh = data.find((c) => c.id === currentSelectedId);
            if (fresh) {
              selectForStudio(fresh, data);
            }
          } else if (!initialSelectedRef.current && data.length > 0) {
            const first = data.find((c) => c.parent === 0) || data[0];
            if (first) {
              selectForStudio(first, data);
            }
          }
          initialSelectedRef.current = true;
        }
      } finally {
        setLoading(false);
      }
    },
    [authFetch, selectForStudio]
  );

  useEffect(() => {
    void load(Boolean(cachedFlatCategories));
  }, [load]);

  // Auto-expand ancestors when search matches nested categories
  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q || flat.length === 0) return;
    const toExpand = new Set<number>();
    flat.forEach((c) => {
      const nameMatch = catName(c).toLowerCase().includes(q);
      const slugMatch = c.slug.toLowerCase().includes(q);
      if (nameMatch || slugMatch) {
        ancestorIdsOf(flat, c.id).forEach((id) => toExpand.add(id));
      }
    });
    if (toExpand.size === 0) return;
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      toExpand.forEach((id) => next.delete(id));
      return next;
    });
  }, [search, flat]);

  const handleSave = async (data: FormData & { id?: number }) => {
    setProcessing({
      label: data.id ? "Updating category..." : "Creating category...",
      detail: data.stagedFile
        ? "Uploading image & saving category"
        : "Saving category details",
      blocking: false,
    });
    const parent = data.type === "main" ? 0 : data.parent;
    let finalImageUrl = data.imageUrl || "";
    let finalImageId =
      data.imageId && Number.isFinite(Number(data.imageId)) ? Number(data.imageId) : null;
    let finalImageAlt = data.imageAlt || data.name;
    let newlyUploadedUrl: string | null = null;

    if (data.stagedFile) {
      const list = flatRef.current;
      const catSlugClean = (data.slug.trim() || slugify(data.name) || "CATEGORY")
        .toUpperCase()
        .replace(/[^A-Z0-9_\s-]/g, "")
        .replace(/[\s-]+/g, "_");

      let folder = `ANGKON/CATEGORIES/${catSlugClean}`;
      if (data.type === "sub" && parent) {
        const ancestors = ancestorIdsOf(list, parent).reverse();
        const ancestorSlugs = [...ancestors, parent]
          .map((id) => list.find((c) => c.id === id)?.slug || list.find((c) => c.id === id)?.name)
          .filter(Boolean) as string[];
        const ancestorParts = ancestorSlugs.map((s) =>
          s.toUpperCase().replace(/[^A-Z0-9_\s-]/g, "").replace(/[\s-]+/g, "_")
        );
        folder = ["ANGKON", "CATEGORIES", ...ancestorParts, catSlugClean].join("/");
      }

      const fd = new globalThis.FormData();
      fd.append("image", data.stagedFile);
      fd.append("folder", folder);
      fd.append("uploadType", "category");
      if (data.type === "sub" && parent) {
        const parentCat = list.find((c) => c.id === parent);
        fd.append("category", parentCat?.slug || parentCat?.name || "PARENT");
        fd.append("subcategory", data.slug.trim() || data.name);
      } else {
        fd.append("category", data.slug.trim() || data.name);
      }

      const uploadRes = await authFetch("/api/admin/upload", { method: "POST", body: fd });
      if (!uploadRes.ok) {
        const d = await uploadRes.json().catch(() => ({}));
        if (uploadRes.status === 413) throw new Error("The image is too large for the server. Please choose a smaller image.");
        if (uploadRes.status === 401) throw new Error("Your admin session expired. Please log in again.");
        if (uploadRes.status === 503) throw new Error("Image storage isn't set up on this server: add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in the hosting environment variables, then redeploy.");
        throw new Error(d.error || `Upload failed (${uploadRes.status})`);
      }
      const uploadData = await uploadRes.json();
      finalImageUrl = uploadData.url || "";
      finalImageId = uploadData.id && Number.isFinite(Number(uploadData.id)) ? Number(uploadData.id) : null;
      finalImageAlt = uploadData.alt || data.imageAlt || data.name;
      newlyUploadedUrl = finalImageUrl || null;
    }

    const payload = {
      name: data.name.trim(),
      slug: data.slug.trim() || slugify(data.name),
      description: data.description,
      parent,
      linked_parents: data.linkedParents || [],
      menu_order: data.sortOrder,
      imageUrl: finalImageUrl,
      imageId: finalImageId,
      imageAlt: finalImageAlt,
      icon: data.icon || "",
      bgTheme: data.bgTheme || "blue",
      meta_data: [
        { key: "_is_active", value: String(data.isActive) },
        { key: "ps_category_image", value: finalImageUrl },
        { key: "angkon_category_image", value: finalImageUrl },
        { key: "_angkon_icon", value: data.icon },
        { key: "_angkon_bgTheme", value: data.bgTheme },
      ],
      image: finalImageUrl
        ? {
            id: finalImageId && finalImageId > 0 ? finalImageId : Date.now(),
            src: finalImageUrl,
            alt: finalImageAlt,
          }
        : null,
    };

    let categoryId = data.id;
    try {
      if (data.id) {
        const res = await authFetch(`/api/admin/categories/${data.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || err.error || "Failed to update category");
        }
      } else {
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
        categoryId = created.id;
      }
    } catch (saveErr) {
      if (newlyUploadedUrl) {
        void authFetch("/api/admin/upload", {
          method: "DELETE",
          body: JSON.stringify({ url: newlyUploadedUrl, id: finalImageId }),
        }).catch(() => {});
      }
      setProcessing(null);
      throw saveErr;
    }

    try {
      if (categoryId) {
        const relocateRes = await authFetch("/api/admin/categories/relocate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: categoryId, parent, index: data.sortOrder }),
        });
        if (!relocateRes.ok) throw new Error("Saved, but could not update list position");
      }

      showToast(data.id ? "Category updated successfully!" : "Category created successfully!");
      if (categoryId) {
        selectedCatIdRef.current = categoryId;
        setSelectedCatId(categoryId);
      }
      await load(true);
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = (e: React.MouseEvent, cat: WCCategory) => {
    e.stopPropagation();
    if (cat.slug === "uncategorized") {
      showToast("The default Uncategorized category cannot be deleted.", false);
      return;
    }
    setDeleteCat(cat);
  };

  const confirmDelete = async (
    options: { mode: "shift" | "delete_products"; targetCategoryId?: number } = {
      mode: "delete_products",
    }
  ) => {
    if (!deleteCat) return;
    setDeleting(deleteCat.id);
    setProcessing({
      label:
        options.mode === "shift"
          ? `Shifting products & deleting “${catName(deleteCat)}”...`
          : `Deleting “${catName(deleteCat)}”...`,
      detail: "Updating store & removing unused media",
      blocking: true,
    });
    try {
      const params = new URLSearchParams({
        id: String(deleteCat.id),
        mode: options.mode,
        delete_cloudinary: "true",
      });
      if (options.mode === "shift" && options.targetCategoryId) {
        params.set("target_category_id", String(options.targetCategoryId));
      }
      const res = await authFetch(`/api/admin/categories?${params.toString()}`, {
        method: "DELETE",
      });
      if (res.status === 401) {
        showToast("Your admin session expired. Please log in again.", false);
        setDeleteCat(null);
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/admin";
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || data.message || "Failed to delete category", false);
        return;
      }
      const details: string[] = [];
      if (data.shiftedProducts) {
        details.push(`shifted ${data.shiftedProducts} product${data.shiftedProducts === 1 ? "" : "s"}`);
      } else if (data.deletedProducts) {
        details.push(`removed ${data.deletedProducts} product${data.deletedProducts === 1 ? "" : "s"}`);
      }
      if (data.cloudinaryAssetsDeleted) {
        details.push(`${data.cloudinaryAssetsDeleted} image${data.cloudinaryAssetsDeleted === 1 ? "" : "s"} removed`);
      }
      const extra = details.length > 0 ? ` (${details.join(", ")})` : "";
      showToast(`“${catName(deleteCat)}” deleted${extra}`);
      if (selectedCatIdRef.current === deleteCat.id) {
        selectedCatIdRef.current = null;
        setSelectedCatId(null);
        setStudio(null);
      }
      setDeleteCat(null);
      await load(true);
    } finally {
      setDeleting(null);
      setProcessing(null);
    }
  };

  const filteredTree = useMemo(() => {
    let result = tree;
    if (filterType === "main") result = result.filter((c) => c.parent === 0);
    if (filterType === "sub") {
      const allSubs = flat.filter((c) => c.parent !== 0);
      return allSubs.map((s) => ({ ...s, children: [] })) as CategoryTree[];
    }

    const deepFilter = (nodes: CategoryTree[]): CategoryTree[] => {
      return nodes.reduce((acc, node) => {
        const matchesSearch =
          search === "" ||
          catName(node).toLowerCase().includes(search.toLowerCase()) ||
          node.slug.toLowerCase().includes(search.toLowerCase());
        const nodeActive = getStatus(node);
        const matchesStatus =
          filterStatus === "all" || (filterStatus === "active" ? nodeActive : !nodeActive);

        const filteredChildren = deepFilter(node.children as CategoryTree[]);

        if ((matchesSearch && matchesStatus) || filteredChildren.length > 0) {
          acc.push({ ...node, children: filteredChildren });
        }
        return acc;
      }, [] as CategoryTree[]);
    };

    return deepFilter(result);
  }, [tree, flat, search, filterType, filterStatus]);

  const endDrag = () => {
    setDragId(null);
    setDropTarget(null);
  };

  const handleDragStart = (e: React.DragEvent, cat: WCCategory) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(cat.id));
    setDragId(cat.id);
  };

  const isInvalidDrop = (targetId: number) =>
    dragId === null || targetId === dragId || descendantIdSet(flatRef.current, dragId).has(targetId);

  const handleRowDragOver = (e: React.DragEvent, cat: WCCategory) => {
    if (dragId === null) return;
    if (isInvalidDrop(cat.id)) {
      e.dataTransfer.dropEffect = "none";
      if (dropTarget) setDropTarget(null);
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    const pos: "before" | "after" | "inside" =
      ratio < 0.28 ? "before" : ratio > 0.72 ? "after" : "inside";
    setDropTarget((prev) =>
      prev && "pos" in prev && prev.id === cat.id && prev.pos === pos ? prev : { id: cat.id, pos }
    );
  };

  const handleRootDragOver = (e: React.DragEvent) => {
    if (dragId === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget((prev) => (prev && "id" in prev && prev.id === "root" ? prev : { id: "root" }));
  };

  const performMove = async (
    draggedId: number,
    newParent: number,
    beforeSiblingId: number | null,
    afterSiblingId: number | null
  ) => {
    const all = flatRef.current;
    const dragged = all.find((c) => c.id === draggedId);
    if (!dragged) return;
    if (newParent === draggedId || descendantIdSet(all, draggedId).has(newParent)) {
      showToast("A category can't be placed inside itself or its own sub-category.", false);
      return;
    }

    const siblings = sortedChildrenOf(all, newParent).filter((c) => c.id !== draggedId);
    let insertAt = siblings.length;
    if (beforeSiblingId !== null)
      insertAt = Math.max(0, siblings.findIndex((c) => c.id === beforeSiblingId));
    else if (afterSiblingId !== null)
      insertAt = siblings.findIndex((c) => c.id === afterSiblingId) + 1;
    siblings.splice(insertAt, 0, dragged);

    const items = siblings.map((c, i) => ({ id: c.id, menu_order: i, parent: newParent }));
    const unchanged =
      dragged.parent === newParent &&
      items.every(
        (it) => (all.find((c) => c.id === it.id)?.menu_order ?? -1) === it.menu_order
      );
    if (unchanged) return;

    const orderById = new Map(items.map((it) => [it.id, it.menu_order]));
    const optimistic = all.map((c) =>
      orderById.has(c.id) ? { ...c, parent: newParent, menu_order: orderById.get(c.id)! } : c
    );
    flatRef.current = optimistic;
    cachedFlatCategories = optimistic;
    setFlat(optimistic);
    setTree(buildTree(optimistic));
    if (newParent) {
      setCollapsedIds((prev) => {
        const next = new Set(prev);
        next.delete(newParent);
        return next;
      });
    }

    setProcessing({
      label:
        dragged.parent === newParent
          ? `Reordering “${catName(dragged)}”...`
          : `Moving “${catName(dragged)}”...`,
      detail: "Updating category hierarchy",
      blocking: false,
    });
    try {
      const res = await authFetch("/api/admin/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (res.status === 401) {
        showToast("Your admin session expired. Please log in again.", false);
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/admin";
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Could not save the new position");
      }
      const parentName = newParent
        ? catName(all.find((c) => c.id === newParent) || { name: "category" })
        : "Main categories";
      showToast(
        dragged.parent === newParent
          ? "Order saved"
          : `Moved “${catName(dragged)}” to ${parentName}`
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save the move", false);
    } finally {
      setProcessing(null);
    }
    await load(true);
  };

  const handleDrop = (e: React.DragEvent, cat: WCCategory) => {
    e.preventDefault();
    const target = dropTarget;
    const id = dragId;
    endDrag();
    if (
      id === null ||
      !target ||
      !("pos" in target) ||
      target.id !== cat.id ||
      isInvalidDrop(cat.id)
    )
      return;
    if (target.pos === "inside") void performMove(id, cat.id, null, null);
    else if (target.pos === "before") void performMove(id, cat.parent, cat.id, null);
    else void performMove(id, cat.parent, null, cat.id);
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const id = dragId;
    endDrag();
    if (id !== null) void performMove(id, 0, null, null);
  };

  const openAdd = () => {
    setCreateModal({
      isOpen: true,
      initialType: "main",
      initialParentId: 0,
    });
  };

  const openAddUnder = (parentId: number) => {
    setCreateModal({
      isOpen: true,
      initialType: "sub",
      initialParentId: parentId,
    });
  };

  const openEdit = (cat: WCCategory) => {
    selectForStudio(cat);
  };

  const activeCount = flat.filter((c) => getStatus(c)).length;
  const mainCount = flat.filter((c) => c.parent === 0).length;
  const subCount = flat.length - mainCount;

  return {
    flat,
    tree,
    loading,
    deleting,
    studio,
    setStudio,
    selectedCatId,
    setSelectedCatId,
    mobileTab,
    setMobileTab,
    moveCat,
    setMoveCat,
    deleteCat,
    setDeleteCat,
    createModal,
    setCreateModal,
    toast,
    setToast,
    processing,
    setProcessing,
    search,
    setSearch,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    collapsedIds,
    activeMenuCatId,
    setActiveMenuCatId,
    dragId,
    dropTarget,
    setDropTarget,
    dndEnabled,
    filteredTree,
    activeCount,
    mainCount,
    subCount,
    selectedCatIdRef,
    authFetch,
    toggleCollapse,
    expandAll,
    collapseAll,
    showToast,
    selectForStudio,
    load,
    handleSave,
    handleDelete,
    confirmDelete,
    endDrag,
    handleDragStart,
    handleRowDragOver,
    handleRootDragOver,
    handleDrop,
    handleRootDrop,
    openAdd,
    openAddUnder,
    openEdit,
  };
}

export type CategoriesManagerHookReturn = ReturnType<typeof useCategoriesManager>;
