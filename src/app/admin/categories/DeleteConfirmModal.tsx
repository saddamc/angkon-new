"use client";

import React from "react";
import { Loader2, Trash2 } from "lucide-react";
import type { WCCategory } from "./types";
import { catName } from "./category-tree-utils";

interface DeleteConfirmModalProps {
  cat: WCCategory;
  subCount: number;
  productCount: number;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}

export function DeleteConfirmModal({
  cat,
  subCount,
  productCount,
  onClose,
  onConfirm,
  deleting,
}: DeleteConfirmModalProps) {
  const hasProducts = productCount > 0;
  const hasSubs = subCount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-red-100 bg-red-50">
          <h2 className="text-[18px] font-black text-red-700">Delete “{catName(cat)}”?</h2>
          <p className="text-[13px] text-red-600/80 mt-1">This cannot be undone.</p>
        </div>
        <div className="p-6 space-y-4 text-[14px] text-gray-700">
          <ul className="space-y-2 text-[13px]">
            <li className="flex justify-between border-b border-gray-100 pb-2">
              <span>Subcategories</span>
              <b>{hasSubs ? subCount : "None"}</b>
            </li>
            <li className="flex justify-between border-b border-gray-100 pb-2">
              <span>Products in this tree</span>
              <b>{productCount}</b>
            </li>
          </ul>
          {hasSubs && (
            <p className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-[13px] text-amber-800">
              All subcategories under this category will also be deleted.
            </p>
          )}
          {hasProducts ? (
            <p className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-[13px] font-semibold text-red-700">
              Warning: all {productCount} product{productCount === 1 ? "" : "s"} in this category
              {hasSubs ? " and its subcategories" : ""} will be permanently removed from the store.
            </p>
          ) : (
            <p className="text-[13px] text-gray-500">
              There are no products in this category. Only the category will be deleted.
            </p>
          )}
          <p className="text-[12px] text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-center gap-2">
            <span>🗑️</span>
            <span>Attached category image will also be automatically removed.</span>
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-5 py-2.5 text-[14px] font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex items-center gap-2 px-6 py-2.5 text-[14px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition disabled:opacity-60 cursor-pointer"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {hasProducts ? "Delete category & products" : "Delete category"}
          </button>
        </div>
      </div>
    </div>
  );
}
