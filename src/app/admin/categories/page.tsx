"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Plus, Pencil, Trash2, RefreshCw, ChevronRight, ChevronLeft, X, Loader2,
  FolderOpen, Tag, ImageIcon, Check, AlertCircle, UploadCloud,
  Search, Filter, GripVertical, CheckCircle2, XCircle, SearchX, ChevronDown, ChevronUp,
  ArrowRightLeft, Sparkles, ExternalLink, ArrowLeft, Layers, MoreVertical
} from "lucide-react";
import { decodeHtmlCharCodes } from "@/utils/category-display";
import { CreateCategoryModal } from "./CreateCategoryModal";


import type { WCCategory, CategoryTree, FormData } from "./types";
import { EMPTY_FORM } from "./types";
import {
  catName,
  slugify,
  buildTree,
  sortedChildrenOf,
  parentsWithChildrenIds,
  ancestorIdsOf,
  directChildren,
  categoryPath,
  subtreeList,
  descendantIdSet,
  siblingsOf,
  getStatus,
} from "./category-tree-utils";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { MoveModal } from "./MoveModal";
import { DetailsDrawer } from "./DetailsDrawer";
import { CategoryStudio } from "./CategoryStudio";
import { isIconUrl } from "./icon-presets";

/* ─── Client Cache for Instant Tab Switching ──────────────────────── */
let cachedFlatCategories: WCCategory[] | null = null;
let cachedTreeCategories: CategoryTree[] | null = null;

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function AdminCategoriesPage() {
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

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all"|"main"|"sub">("all");
  const [filterStatus, setFilterStatus] = useState<"all"|"active"|"inactive">("all");

  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());
  const [activeMenuCatId, setActiveMenuCatId] = useState<number | null>(null);

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

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const flatRef = useRef<WCCategory[]>(flat);
  flatRef.current = flat;

  const selectedCatIdRef = useRef<number | null>(null);
  const initialSelectedRef = useRef(false);

  const selectForStudio = useCallback((cat: WCCategory, allCats?: WCCategory[]) => {
    selectedCatIdRef.current = cat.id;
    setSelectedCatId(cat.id);
    const list = allCats || flatRef.current;
    const ordered = list.filter((c) => c.parent === cat.parent).sort((a, b) => (a.menu_order ?? 0) - (b.menu_order ?? 0));
    const sortOrder = Math.max(0, ordered.findIndex((c) => c.id === cat.id));
    const iconMeta = cat.meta_data?.find(m => (m.key === "_angkon_icon" || m.key === "_plainstitch_icon"))?.value;
    const bgMeta = cat.meta_data?.find(m => (m.key === "_angkon_bgTheme" || m.key === "_plainstitch_bgTheme"))?.value;
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

  const load = useCallback(async (soft = false) => {
    if (!cachedFlatCategories && !soft) setLoading(true);
    try {
      const res = await authFetch("/api/admin/categories");
      if (res.status === 401) {
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

        // If studio is open on a category, refresh its data in the studio
        const currentSelectedId = selectedCatIdRef.current;
        if (currentSelectedId) {
          const fresh = data.find((c) => c.id === currentSelectedId);
          if (fresh) {
            selectForStudio(fresh, data);
          }
        } else if (!initialSelectedRef.current && data.length > 0) {
          // Auto-select first main category ONLY on initial load
          const first = data.find((c) => c.parent === 0) || data[0];
          if (first) {
            selectForStudio(first, data);
          }
        }
        initialSelectedRef.current = true;
      }
    } finally { setLoading(false); }
  }, [authFetch, selectForStudio]);

  useEffect(() => {
    void load(Boolean(cachedFlatCategories));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const parent = data.type === "main" ? 0 : data.parent;
    const payload = {
      name: data.name.trim(),
      slug: data.slug.trim() || slugify(data.name),
      description: data.description,
      parent,
      linked_parents: data.linkedParents || [],
      menu_order: data.sortOrder,
      imageUrl: data.imageUrl || "",
      imageId: data.imageId && Number.isFinite(Number(data.imageId)) ? Number(data.imageId) : null,
      imageAlt: data.imageAlt || data.name,
      icon: data.icon || "",
      bgTheme: data.bgTheme || "blue",
      meta_data: [
        { key: "_is_active", value: String(data.isActive) },
        { key: "ps_category_image", value: data.imageUrl || "" },
        { key: "angkon_category_image", value: data.imageUrl || "" },
        { key: "_angkon_icon", value: data.icon },
        { key: "_angkon_bgTheme", value: data.bgTheme },
      ],
      image: data.imageUrl
        ? {
            id: data.imageId && Number.isFinite(Number(data.imageId)) && Number(data.imageId) > 0 ? Number(data.imageId) : Date.now(),
            src: data.imageUrl,
            alt: data.imageAlt || data.name,
          }
        : null,
    };

    let categoryId = data.id;
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
  };

  const handleDelete = (e: React.MouseEvent, cat: WCCategory) => {
    e.stopPropagation();
    if (cat.slug === "uncategorized") {
      showToast("The default Uncategorized category cannot be deleted.", false);
      return;
    }
    setDeleteCat(cat);
  };

  const confirmDelete = async () => {
    if (!deleteCat) return;
    setDeleting(deleteCat.id);
    try {
      const res = await authFetch(`/api/admin/categories?id=${deleteCat.id}&delete_products=true`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || data.message || "Failed to delete category", false);
        return;
      }
      const extra = data.deletedProducts ? ` and ${data.deletedProducts} product${data.deletedProducts === 1 ? "" : "s"}` : "";
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
    }
  };

  // Filter Logic
  const filteredTree = useMemo(() => {
    let result = tree;
    if (filterType === "main") result = result.filter(c => c.parent === 0);
    if (filterType === "sub") {
      const allSubs = flat.filter(c => c.parent !== 0);
      return allSubs.map(s => ({ ...s, children: [] })) as CategoryTree[];
    }

    const deepFilter = (nodes: CategoryTree[]): CategoryTree[] => {
      return nodes.reduce((acc, node) => {
        const matchesSearch = search === "" || catName(node).toLowerCase().includes(search.toLowerCase()) || node.slug.toLowerCase().includes(search.toLowerCase());
        const nodeActive = getStatus(node);
        const matchesStatus = filterStatus === "all" || (filterStatus === "active" ? nodeActive : !nodeActive);

        const filteredChildren = deepFilter(node.children as CategoryTree[]);

        if ((matchesSearch && matchesStatus) || filteredChildren.length > 0) {
          acc.push({ ...node, children: filteredChildren });
        }
        return acc;
      }, [] as CategoryTree[]);
    };

    return deepFilter(result);
  }, [tree, flat, search, filterType, filterStatus]);

  /* ── Drag & Drop (reorder, nest under another category, or move back to Main) ── */
  type DropTarget = { id: number; pos: "before" | "after" | "inside" } | { id: "root" } | null;
  const [dragId, setDragId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const dndEnabled = !search.trim() && filterType === "all" && filterStatus === "all";

  const endDrag = () => {
    setDragId(null);
    setDropTarget(null);
  };

  const handleDragStart = (e: React.DragEvent, cat: WCCategory) => {
    e.dataTransfer.effectAllowed = "move";
    // Firefox only starts a drag when some data is set.
    e.dataTransfer.setData("text/plain", String(cat.id));
    setDragId(cat.id);
  };

  /** A category can't be dropped onto itself or anything inside it. */
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
    const pos: "before" | "after" | "inside" = ratio < 0.28 ? "before" : ratio > 0.72 ? "after" : "inside";
    setDropTarget((prev) =>
      prev && "pos" in prev && prev.id === cat.id && prev.pos === pos ? prev : { id: cat.id, pos },
    );
  };

  const handleRootDragOver = (e: React.DragEvent) => {
    if (dragId === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget((prev) => (prev && "id" in prev && prev.id === "root" ? prev : { id: "root" }));
  };

  /** Persist a move: put `dragged` under `newParent` at `position`, renumbering that sibling list. */
  const performMove = async (draggedId: number, newParent: number, beforeSiblingId: number | null, afterSiblingId: number | null) => {
    const all = flatRef.current;
    const dragged = all.find((c) => c.id === draggedId);
    if (!dragged) return;
    if (newParent === draggedId || descendantIdSet(all, draggedId).has(newParent)) {
      showToast("A category can't be placed inside itself or its own sub-category.", false);
      return;
    }

    const siblings = sortedChildrenOf(all, newParent).filter((c) => c.id !== draggedId);
    let insertAt = siblings.length;
    if (beforeSiblingId !== null) insertAt = Math.max(0, siblings.findIndex((c) => c.id === beforeSiblingId));
    else if (afterSiblingId !== null) insertAt = siblings.findIndex((c) => c.id === afterSiblingId) + 1;
    siblings.splice(insertAt, 0, dragged);

    const items = siblings.map((c, i) => ({ id: c.id, menu_order: i, parent: newParent }));
    const unchanged =
      dragged.parent === newParent && items.every((it) => (all.find((c) => c.id === it.id)?.menu_order ?? -1) === it.menu_order);
    if (unchanged) return;

    // Optimistic update so the tree reflects the move immediately.
    const orderById = new Map(items.map((it) => [it.id, it.menu_order]));
    const optimistic = all.map((c) =>
      orderById.has(c.id) ? { ...c, parent: newParent, menu_order: orderById.get(c.id)! } : c,
    );
    flatRef.current = optimistic;
    cachedFlatCategories = optimistic;
    setFlat(optimistic);
    setTree(buildTree(optimistic));
    if (newParent) setCollapsedIds((prev) => { const next = new Set(prev); next.delete(newParent); return next; });

    try {
      const res = await authFetch("/api/admin/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Could not save the new position");
      }
      const parentName = newParent ? catName(all.find((c) => c.id === newParent) || { name: "category" }) : "Main categories";
      showToast(dragged.parent === newParent ? "Order saved" : `Moved “${catName(dragged)}” to ${parentName}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save the move", false);
    }
    await load(true); // re-sync with the database (also reverts the optimistic change on failure)
  };

  const handleDrop = (e: React.DragEvent, cat: WCCategory) => {
    e.preventDefault();
    const target = dropTarget;
    const id = dragId;
    endDrag();
    if (id === null || !target || !("pos" in target) || target.id !== cat.id || isInvalidDrop(cat.id)) return;
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

  const moveCategory = async (catId: number, parentId: number, direction: "up" | "down") => {
    const siblings = sortedChildrenOf(flatRef.current, parentId);
    const curIdx = siblings.findIndex((c) => c.id === catId);
    if (curIdx === -1) return;
    const targetIdx = direction === "up" ? curIdx - 1 : curIdx + 1;
    if (targetIdx < 0 || targetIdx >= siblings.length) return;
    const neighbour = siblings[targetIdx];
    await performMove(catId, parentId, direction === "up" ? neighbour.id : null, direction === "down" ? neighbour.id : null);
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

  const renderRow = (cat: CategoryTree, depth = 0, index: number) => {
    const active = getStatus(cat);
    const hasChildren = cat.children.length > 0;
    const isCollapsed = collapsedIds.has(cat.id);
    const childCount = cat.children.length;
    const isSelected = selectedCatId === cat.id;
    const isMenuOpen = activeMenuCatId === cat.id;

    const linkedParentNames = Array.isArray(cat.linked_parents) && cat.linked_parents.length > 0
      ? cat.linked_parents
          .map((pid) => catName(flat.find((p) => p.id === pid) || { name: `#${pid}` }))
          .filter(Boolean)
      : [];

    return (
      <div key={`${cat.id}-${depth}-${cat.is_linked ? 'linked' : 'direct'}`} className={isMenuOpen ? "relative z-30" : "relative"}>
        <div
          draggable={dndEnabled && !cat.is_linked}
          onDragStart={(e) => handleDragStart(e, cat)}
          onDragOver={(e) => handleRowDragOver(e, cat)}
          onDrop={(e) => handleDrop(e, cat)}
          onDragEnd={endDrag}
          onClick={() => openEdit(cat)}
          className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-100 transition cursor-pointer group select-none ${
            dragId === cat.id ? "opacity-40" : ""
          } ${
            dropTarget && "pos" in dropTarget && dropTarget.id === cat.id
              ? dropTarget.pos === "before"
                ? "shadow-[inset_0_3px_0_0_#9333ea]"
                : dropTarget.pos === "after"
                ? "shadow-[inset_0_-3px_0_0_#9333ea]"
                : "bg-purple-100/80 ring-2 ring-inset ring-purple-600/50"
              : ""
          } ${
            isSelected
              ? "bg-purple-50/80 border-l-4 border-l-purple-600 shadow-2xs"
              : cat.is_linked
              ? "bg-purple-50/30 hover:bg-purple-50/60"
              : depth > 0
              ? "bg-slate-50/40 hover:bg-purple-50/30"
              : "bg-white hover:bg-gray-50/90"
          }`}
        >
          {/* Drag Handle + Expand + Tree Indentation Guide */}
          <div
            className="flex items-center gap-1 shrink-0"
            style={{ paddingLeft: `${Math.min(depth * 20, 60)}px` }}
          >
            {/* Visual branch guide for subcategories */}
            {depth > 0 && (
              <span className="w-2.5 h-4 border-l-2 border-b-2 border-gray-200 rounded-bl-sm -ml-2 mr-1 inline-block" />
            )}

            {/* Drag Grip */}
            <div
              className={`w-4 text-gray-300 transition flex items-center justify-center ${
                cat.is_linked ? "opacity-20 cursor-not-allowed" : "cursor-grab hover:text-gray-700"
              }`}
              title={
                cat.is_linked
                  ? "Cross-listed category"
                  : dndEnabled
                  ? "Drag to reorder, or drop onto another category to nest"
                  : "Clear search and filters to drag"
              }
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>

            {/* Expand / Collapse Chevron */}
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCollapse(cat.id);
                }}
                className="flex h-6 w-6 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition"
                aria-label={isCollapsed ? "Expand subcategories" : "Collapse subcategories"}
                title={isCollapsed ? "Expand" : "Collapse"}
              >
                <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-200 ${isCollapsed ? "" : "rotate-90"}`} />
              </button>
            ) : (
              <span className="w-6" />
            )}
          </div>

          {/* Thumbnail / Category Icon */}
          <div className="relative shrink-0 flex items-center justify-center">
            {cat.image?.src ? (
              <img
                src={cat.image.src}
                alt={catName(cat)}
                className={`rounded-xl object-cover border border-gray-200 shadow-2xs bg-white ${
                  depth === 0 ? "h-10 w-10 sm:h-11 sm:w-11" : "h-8 w-8 sm:h-9 sm:w-9"
                }`}
              />
            ) : (
              <div
                className={`rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200/60 ${
                  depth === 0 ? "h-10 w-10 sm:h-11 sm:w-11" : "h-8 w-8 sm:h-9 sm:w-9"
                }`}
              >
                <FolderOpen className="h-4 w-4" />
              </div>
            )}
            {(() => {
              const iconMeta = cat.meta_data?.find((m) => m.key === "_angkon_icon" || m.key === "_plainstitch_icon")?.value;
              if (iconMeta && typeof iconMeta === "string" && iconMeta.trim() !== "") {
                const isUrl = isIconUrl(iconMeta);
                return (
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full shadow-2xs border border-gray-100 text-[11px] leading-none p-[2px] z-10 flex items-center justify-center overflow-hidden">
                    {isUrl ? <img src={iconMeta} alt="" className="h-3 w-3 object-contain" /> : iconMeta}
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* Category Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`font-bold truncate ${
                  depth === 0 ? "text-[14px] text-gray-900" : "text-[13px] text-gray-800"
                }`}
              >
                {catName(cat)}
              </span>

              {cat.is_linked ? (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded-md shrink-0"
                  title="Cross-listed under this collection (primary parent remains unchanged)"
                >
                  <Sparkles className="h-2.5 w-2.5 text-amber-700" />
                  Cross-listed
                </span>
              ) : depth === 0 ? (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-gray-100 text-gray-600 shrink-0">
                  Root
                </span>
              ) : (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 uppercase tracking-wide shrink-0">
                  Sub
                </span>
              )}

              {hasChildren && (
                <span className="text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200/70 px-1.5 py-0.2 rounded-md shrink-0">
                  {childCount} {childCount === 1 ? "sub" : "subs"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <span className="text-[11px] text-gray-400 font-mono truncate">/{cat.slug}</span>
              {!cat.is_linked && linkedParentNames.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100/90 text-amber-900 border border-amber-200/80 shrink-0">
                  <Sparkles className="h-2.5 w-2.5 text-amber-700 shrink-0" />
                  Also under: {linkedParentNames.join(", ")}
                </span>
              )}
            </div>
          </div>

          {/* Item count */}
          <div className="shrink-0 text-center hidden md:block">
            <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
              {cat.count} items
            </span>
          </div>

          {/* Storefront Status Badge */}
          <div className="shrink-0 hidden sm:flex items-center">
            {active ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                Hidden
              </span>
            )}
          </div>

          {/* Primary Action: Clear Edit Button */}
          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => openEdit(cat)}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-[12px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-600 hover:text-white border border-purple-200/60 transition shadow-2xs"
              title="Edit in Studio"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </button>

            {/* Secondary Actions: Accessible Three-Dot Overflow Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveMenuCatId(isMenuOpen ? null : cat.id)}
                className={`p-1.5 rounded-xl transition ${
                  isMenuOpen
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-gray-400 hover:text-gray-800 hover:bg-gray-100"
                }`}
                title="More actions"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {isMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuCatId(null);
                      openAddUnder(cat.id);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-[12px] font-semibold text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition"
                  >
                    <Plus className="h-4 w-4 text-purple-600" />
                    <span>Add Subcategory</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuCatId(null);
                      setMoveCat(cat);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-[12px] font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    <ArrowRightLeft className="h-4 w-4 text-gray-500" />
                    <span>Move / Relocate</span>
                  </button>
                  <a
                    href={`/product-category/${cat.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setActiveMenuCatId(null)}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-[12px] font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    <ExternalLink className="h-4 w-4 text-gray-500" />
                    <span>View on Storefront</span>
                  </a>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    type="button"
                    onClick={(e) => {
                      setActiveMenuCatId(null);
                      handleDelete(e, cat);
                    }}
                    disabled={deleting === cat.id}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-[12px] font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                  >
                    {deleting === cat.id ? <Loader2 className="h-4 w-4 animate-spin text-red-600" /> : <Trash2 className="h-4 w-4 text-red-500" />}
                    <span>Delete Category</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {hasChildren && !isCollapsed && cat.children.map((child, i) => renderRow(child as CategoryTree, depth + 1, i))}
      </div>
    );
  };

  const activeCount = flat.filter(c => getStatus(c)).length;
  const mainCount = flat.filter(c => c.parent === 0).length;
  const subCount = flat.length - mainCount;

  return (
    <div className="w-full max-w-[1920px] mx-auto min-h-screen space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-xl text-[14px] font-bold text-white transition-all ${toast.ok ? "bg-emerald-600" : "bg-red-500"}`}>
          {toast.ok ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {toast.msg}
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200/60 shadow-2xs">
              In-Page Category Studio
            </span>
            <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
              {flat.length} total categories
            </span>
          </div>
          <h1 className="text-[26px] sm:text-[28px] font-black text-gray-900 tracking-tight">Categories & Hierarchy</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Manage main collections, nested sub-categories, and cross-listed categories directly in-page.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[13px] font-bold text-gray-700 transition shadow-2xs"
            title="Refresh categories from database"
          >
            <RefreshCw className={`h-4 w-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-[13px] font-bold text-white transition shadow-md shadow-purple-200"
          >
            <Plus className="h-4 w-4" /> Add Category
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-purple-100/60 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Categories</p>
          <p className="text-[24px] font-black text-gray-900">{flat.length}</p>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-purple-100/60 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Main Categories</p>
          <p className="text-[24px] font-black text-gray-900">{mainCount}</p>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-purple-100/60 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Subcategories</p>
          <p className="text-[24px] font-black text-gray-900">{subCount}</p>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-purple-100/60 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Active Storefront</p>
          <p className="text-[24px] font-black text-emerald-600">{activeCount}</p>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden bg-gray-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setMobileTab("explorer")}
          className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition ${
            mobileTab === "explorer" ? "bg-white text-purple-600 shadow-xs" : "text-gray-500"
          }`}
        >
          Categories List ({flat.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("studio")}
          className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition ${
            mobileTab === "studio" ? "bg-white text-purple-600 shadow-xs" : "text-gray-500"
          }`}
        >
          In-Page Studio {studio ? `(${studio.mode === "add" ? "Create" : "Editing"})` : ""}
        </button>
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 items-start">
        {/* Left Column: Explorer Tree (5 cols) */}
        <div className={`lg:col-span-5 ${mobileTab === "studio" ? "hidden lg:block" : "block"}`}>
          {/* Toolbar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-purple-100/60 shadow-sm mb-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100 transition bg-gray-50/50 focus:bg-white"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 justify-between flex-wrap">
              <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                <button
                  type="button"
                  onClick={expandAll}
                  className="px-2 py-1 rounded text-[11px] font-bold text-gray-600 hover:bg-white hover:text-gray-900 transition"
                  title="Expand all"
                >
                  Expand
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="px-2 py-1 rounded text-[11px] font-bold text-gray-600 hover:bg-white hover:text-gray-900 transition"
                  title="Collapse all"
                >
                  Collapse
                </button>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as "all" | "main" | "sub")}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-[11px] font-bold text-gray-700 outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="main">Main Only</option>
                  <option value="sub">Subs Only</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "inactive")}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-[11px] font-bold text-gray-700 outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tree Card */}
          <div className="bg-white rounded-2xl border border-purple-100/60 shadow-sm">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-purple-50/70 border-b border-purple-100/50 text-[11px] font-bold uppercase tracking-wider text-purple-600 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <span>Category Hierarchy</span>
                <span className="text-[10px] font-mono text-purple-400">({filteredTree.length} roots)</span>
              </div>
              <div className="hidden sm:block">Storefront Status & Actions</div>
              <div className="sm:hidden">Actions</div>
            </div>

            {loading ? (
              <div className="flex flex-col divide-y divide-gray-100">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                    <div className="h-7 w-7 rounded-lg bg-gray-100" />
                    <div className="h-9 w-9 rounded-xl bg-gray-100" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-32 rounded bg-gray-100" />
                      <div className="h-2.5 w-20 rounded bg-gray-50" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredTree.length === 0 ? (
              <div className="py-16 text-center px-4">
                <SearchX className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-[14px] font-bold text-gray-800">No categories found</p>
                <p className="text-[12px] text-gray-400 max-w-xs mx-auto mt-0.5">
                  Try clearing your search query or filters.
                </p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-gray-100/80">
                {filteredTree.map((cat, i) => renderRow(cat, 0, i))}
                {dndEnabled && dragId !== null && (
                  <div
                    onDragOver={handleRootDragOver}
                    onDrop={handleRootDrop}
                    onDragLeave={() => setDropTarget((prev) => (prev && "id" in prev && prev.id === "root" ? null : prev))}
                    className={`m-3 rounded-xl border-2 border-dashed px-4 py-4 text-center text-[12px] font-bold transition ${
                      dropTarget && "id" in dropTarget && dropTarget.id === "root"
                        ? "border-purple-600 bg-purple-50 text-purple-700"
                        : "border-gray-300 text-gray-400"
                    }`}
                  >
                    Drop here to make it a Main category
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: In-Page Category Studio (7 cols, sticky) */}
        <div className={`lg:col-span-7 ${mobileTab === "explorer" ? "hidden lg:block" : "block"}`}>
          {studio ? (
            <CategoryStudio
              mode={studio.mode}
              initial={studio.initial}
              flat={flat}
              onSave={handleSave}
              onClose={() => {
                setStudio(null);
                selectedCatIdRef.current = null;
                setSelectedCatId(null);
                setMobileTab("explorer");
              }}
              onEditChild={(c) => openEdit(c)}
              onAddChild={(parentId) => openAddUnder(parentId)}
              onReload={() => load(true)}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-purple-100/60 shadow-sm p-8 text-center flex flex-col items-center justify-center min-h-[460px]">
              <div className="h-16 w-16 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mb-4 shadow-sm">
                <FolderOpen className="h-8 w-8" />
              </div>
              <h3 className="text-[17px] font-black text-gray-900 mb-1">In-Page Category Studio</h3>
              <p className="text-[13px] text-gray-500 max-w-md mb-6 leading-relaxed">
                Select any category from the explorer on the left to edit it in-page, manage its subcategories, or configure multi-parent cross-listing.
              </p>
              <button
                type="button"
                onClick={openAdd}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-[13px] font-bold text-white shadow-md shadow-purple-200 transition"
              >
                <Plus className="h-4 w-4" /> Create New Category
              </button>
            </div>
          )}
        </div>
      </div>

      {deleteCat && (
        <DeleteConfirmModal
          cat={deleteCat}
          subCount={subtreeList(flat, deleteCat.id).length - 1}
          productCount={deleteCat.count || 0}
          deleting={deleting === deleteCat.id}
          onClose={() => { if (deleting !== deleteCat.id) setDeleteCat(null); }}
          onConfirm={() => void confirmDelete()}
        />
      )}
      {moveCat && (
        <MoveModal
          cat={moveCat}
          flat={flat}
          authFetch={authFetch}
          onClose={() => setMoveCat(null)}
          onDone={load}
          showToast={showToast}
        />
      )}
      {createModal?.isOpen && (
        <CreateCategoryModal
          isOpen={createModal.isOpen}
          initialType={createModal.initialType || "main"}
          initialParentId={createModal.initialParentId || 0}
          flat={flat}
          authFetch={authFetch}
          onClose={() => setCreateModal(null)}
          onCreated={async (newId) => {
            selectedCatIdRef.current = newId;
            setSelectedCatId(newId);
            await load(true);
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}
