"use client";

import Image from "next/image";
import {
  Pencil,
  Trash2,
  ChevronRight,
  Loader2,
  FolderOpen,
  GripVertical,
  ArrowRightLeft,
  Sparkles,
  ExternalLink,
  MoreVertical,
  Plus,
} from "lucide-react";
import type { CategoryTree } from "../types";
import { catName, getStatus } from "../category-tree-utils";
import { isIconUrl } from "../icon-presets";
import type { CategoriesManagerHookReturn } from "../_hooks/use-categories-manager";

interface CategoryRowProps {
  cat: CategoryTree;
  depth?: number;
  index?: number;
  state: CategoriesManagerHookReturn;
}

export function CategoryRow({ cat, depth = 0, state }: CategoryRowProps) {
  const {
    flat,
    collapsedIds,
    toggleCollapse,
    selectedCatId,
    activeMenuCatId,
    setActiveMenuCatId,
    dndEnabled,
    dragId,
    dropTarget,
    handleDragStart,
    handleRowDragOver,
    handleDrop,
    endDrag,
    openEdit,
    openAddUnder,
    setMoveCat,
    handleDelete,
    deleting,
  } = state;

  const active = getStatus(cat);
  const hasChildren = cat.children.length > 0;
  const isCollapsed = collapsedIds.has(cat.id);
  const childCount = cat.children.length;
  const isSelected = selectedCatId === cat.id;
  const isMenuOpen = activeMenuCatId === cat.id;

  const linkedParentNames =
    Array.isArray(cat.linked_parents) && cat.linked_parents.length > 0
      ? cat.linked_parents
          .filter((pid) => pid !== cat.parent)
          .map((pid) => catName(flat.find((p) => p.id === pid) || { name: `#${pid}` }))
          .filter(Boolean)
      : [];

  return (
    <div
      key={`${cat.id}-${depth}-${cat.is_linked ? "linked" : "direct"}`}
      className={isMenuOpen ? "relative z-30" : "relative"}
    >
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
              className="flex h-6 w-6 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition cursor-pointer"
              aria-label={isCollapsed ? "Expand subcategories" : "Collapse subcategories"}
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              <ChevronRight
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  isCollapsed ? "" : "rotate-90"
                }`}
              />
            </button>
          ) : (
            <span className="w-6" />
          )}
        </div>

        {/* Thumbnail / Category Icon */}
        <div className="relative shrink-0 flex items-center justify-center">
          {cat.image?.src ? (
            <div
              className={`relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xs ${
                depth === 0 ? "h-10 w-10 sm:h-11 sm:w-11" : "h-8 w-8 sm:h-9 sm:w-9"
              }`}
            >
              {/* CSS-sized thumbnail: `fill` avoids width/height props fighting
                  the responsive classes (Next warns when only one axis changes). */}
              <Image
                src={cat.image.src}
                alt={catName(cat)}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
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
            const iconMeta = cat.meta_data?.find(
              (m) => m.key === "_angkon_icon" || m.key === "_plainstitch_icon"
            )?.value;
            if (iconMeta && typeof iconMeta === "string" && iconMeta.trim() !== "") {
              const isUrl = isIconUrl(iconMeta);
              return (
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full shadow-2xs border border-gray-100 text-[11px] leading-none p-[2px] z-10 flex items-center justify-center overflow-hidden">
                  {isUrl ? (
                    <Image
                      src={iconMeta}
                      alt=""
                      width={12}
                      height={12}
                      className="h-3 w-3 object-contain"
                    />
                  ) : (
                    iconMeta
                  )}
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
            className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-[12px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-600 hover:text-white border border-purple-200/60 transition shadow-2xs cursor-pointer"
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
              className={`p-1.5 rounded-xl transition cursor-pointer ${
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
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-[12px] font-semibold text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition cursor-pointer"
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
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-[12px] font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                >
                  <ArrowRightLeft className="h-4 w-4 text-gray-500" />
                  <span>Move / Relocate</span>
                </button>
                <a
                  href={`/product-category/${cat.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setActiveMenuCatId(null)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-[12px] font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
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
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-[12px] font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-50 cursor-pointer"
                >
                  {deleting === cat.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-red-500" />
                  )}
                  <span>Delete Category</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {hasChildren &&
        !isCollapsed &&
        cat.children.map((child, i) => (
          <CategoryRow
            key={`${child.id}-${depth + 1}`}
            cat={child as CategoryTree}
            depth={depth + 1}
            index={i}
            state={state}
          />
        ))}
    </div>
  );
}
