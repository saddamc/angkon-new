"use client";

import React, { useEffect } from "react";
import { FolderOpen, X, Plus, Pencil } from "lucide-react";
import type { WCCategory } from "./types";
import { catName, categoryPath, directChildren, getStatus } from "./category-tree-utils";

interface NestedSubListProps {
  flat: WCCategory[];
  parentId: number;
  depth?: number;
  onEdit: (c: WCCategory) => void;
}

export function NestedSubList({
  flat,
  parentId,
  depth = 0,
  onEdit,
}: NestedSubListProps) {
  const kids = directChildren(flat, parentId);
  if (kids.length === 0) return null;
  return (
    <ul
      className={
        depth === 0
          ? "space-y-2"
          : "mt-2 space-y-2 border-l border-gray-200 pl-3"
      }
    >
      {kids.map((sub) => {
        const nestedCount = flat.filter((c) => c.parent === sub.id).length;
        return (
          <li key={sub.id}>
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50/70">
              <div className="flex items-center gap-3 min-w-0">
                {sub.image?.src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sub.image.src}
                    alt=""
                    className="h-8 w-8 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="h-8 w-8 bg-gray-200 rounded-lg flex items-center justify-center shrink-0">
                    <FolderOpen className="h-3 w-3 text-gray-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-gray-900 truncate">
                    {catName(sub)}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">
                    /{sub.slug} · {sub.count} products
                    {nestedCount > 0 ? ` · ${nestedCount} sub` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onEdit(sub)}
                className="shrink-0 text-purple-600 hover:text-purple-800 text-[12px] font-bold px-2 cursor-pointer"
              >
                Edit
              </button>
            </div>
            <NestedSubList
              flat={flat}
              parentId={sub.id}
              depth={depth + 1}
              onEdit={onEdit}
            />
          </li>
        );
      })}
    </ul>
  );
}

interface DetailsDrawerProps {
  cat: WCCategory;
  flat: WCCategory[];
  onClose: () => void;
  onEdit: (c: WCCategory) => void;
  onAddChild: (parentId: number) => void;
}

export function DetailsDrawer({
  cat,
  flat,
  onClose,
  onEdit,
  onAddChild,
}: DetailsDrawerProps) {
  const active = getStatus(cat);
  const directSubs = directChildren(flat, cat.id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-[18px] font-black text-gray-900">
            Category Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col items-center text-center mb-8">
            {cat.image?.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cat.image.src}
                alt={catName(cat)}
                className="h-28 w-28 object-cover rounded-2xl border border-gray-200 shadow-sm mb-4"
              />
            ) : (
              <div className="h-28 w-28 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <FolderOpen className="h-10 w-10 text-gray-400" />
              </div>
            )}
            <h3 className="text-[22px] font-black text-gray-900">
              {catName(cat)}
            </h3>
            <p className="text-[13px] text-gray-500 font-mono mt-1">
              /{cat.slug}
            </p>
            {cat.parent !== 0 && (
              <p className="text-[12px] text-gray-400 mt-1">
                {categoryPath(flat, cat.id)}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3">
              <span
                className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg ${
                  active
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {active ? "Active" : "Inactive"}
              </span>
              <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 rounded-lg">
                {cat.parent === 0 ? "Main Category" : "Sub Category"}
              </span>
            </div>
          </div>
          <div className="space-y-4 mb-8">
            <div className="flex justify-between py-3 border-b border-gray-50">
              <span className="text-[13px] font-bold text-gray-500">
                Products
              </span>
              <span className="text-[14px] font-semibold text-gray-900">
                {cat.count} items
              </span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-50">
              <span className="text-[13px] font-bold text-gray-500">
                Sort Order
              </span>
              <span className="text-[14px] font-semibold text-gray-900">
                {cat.menu_order}
              </span>
            </div>
            {cat.description && (
              <div className="py-3 border-b border-gray-50">
                <span className="block text-[13px] font-bold text-gray-500 mb-1">
                  Description
                </span>
                <p className="text-[14px] text-gray-800 leading-relaxed">
                  {cat.description}
                </p>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h4 className="text-[15px] font-black text-gray-900">
                Subcategories ({directSubs.length})
              </h4>
              <button
                type="button"
                onClick={() => onAddChild(cat.id)}
                className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-purple-700 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add sub
              </button>
            </div>
            {directSubs.length > 0 ? (
              <NestedSubList
                flat={flat}
                parentId={cat.id}
                onEdit={(c) => {
                  onClose();
                  onEdit(c);
                }}
              />
            ) : (
              <p className="text-[13px] text-gray-500">
                No subcategories yet.
              </p>
            )}
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(cat);
            }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-xl text-[14px] font-bold hover:bg-gray-800 transition cursor-pointer"
          >
            <Pencil className="h-4 w-4" /> Edit Category
          </button>
        </div>
      </div>
    </div>
  );
}
