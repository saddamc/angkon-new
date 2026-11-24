"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, ArrowRightLeft, Loader2, Trash2 } from "lucide-react";
import type { WCCategory } from "./types";
import { catName, descendantIdSet } from "./category-tree-utils";
import { ParentCategoryPicker } from "./ParentCategoryPicker";

interface DeleteConfirmModalProps {
  cat: WCCategory;
  flat: WCCategory[];
  subCount: number;
  productCount: number;
  onClose: () => void;
  onConfirm: (options: { mode: "shift" | "delete_products"; targetCategoryId?: number }) => void;
  deleting: boolean;
}

export function DeleteConfirmModal({
  cat,
  flat,
  subCount,
  productCount,
  onClose,
  onConfirm,
  deleting,
}: DeleteConfirmModalProps) {
  const hasProducts = productCount > 0;
  const hasSubs = subCount > 0;

  const shiftTargets = useMemo(() => {
    const excluded = descendantIdSet(flat, cat.id);
    excluded.add(cat.id);
    return flat.filter((c) => !excluded.has(c.id));
  }, [flat, cat.id]);

  const [mode, setMode] = useState<"shift" | "delete_products">(() =>
    hasProducts && shiftTargets.length > 0 ? "shift" : "delete_products"
  );
  const [targetCategoryId, setTargetCategoryId] = useState<number>(0);
  const [confirmDestructive, setConfirmDestructive] = useState(false);

  const canConfirm =
    !deleting &&
    (!hasProducts ||
      (mode === "shift" ? targetCategoryId > 0 : confirmDestructive));

  const handleConfirm = () => {
    if (!canConfirm) return;
    if (hasProducts && mode === "shift") {
      onConfirm({ mode: "shift", targetCategoryId });
      return;
    }
    onConfirm({ mode: "delete_products" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-red-100 bg-red-50 flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[18px] font-black text-red-700">Delete “{catName(cat)}”?</h2>
            <p className="text-[13px] text-red-600/80 mt-0.5">
              Choose what happens to products in this category before removing it.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4 text-[14px] text-gray-700 max-h-[75vh] overflow-y-auto">
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
            <p className="rounded-xl bg-amber-50 border border-amber-200/80 px-4 py-3 text-[13px] text-amber-800">
              All {subCount} subcategor{subCount === 1 ? "y" : "ies"} under “{catName(cat)}” will also be removed.
            </p>
          )}

          {hasProducts ? (
            <div className="space-y-3">
              {shiftTargets.length > 0 && (
                <div
                  onClick={() => !deleting && setMode("shift")}
                  className={`rounded-xl border-2 p-4 transition cursor-pointer ${
                    mode === "shift"
                      ? "border-purple-500 bg-purple-50/50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="delete-category-mode"
                      checked={mode === "shift"}
                      onChange={() => setMode("shift")}
                      disabled={deleting}
                      className="mt-1 accent-purple-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4 text-purple-600 shrink-0" />
                        <span className="text-[13px] font-bold text-gray-900">
                          Shift {productCount} product{productCount === 1 ? "" : "s"} to another category (Safe)
                        </span>
                      </div>
                      <p className="text-[12px] text-gray-500 mt-1">
                        Moves all products into the chosen category before deleting “{catName(cat)}”. Zero product images are deleted.
                      </p>
                    </div>
                  </label>

                  {mode === "shift" && (
                    <div className="mt-3 pl-7" onClick={(e) => e.stopPropagation()}>
                      <label className="block text-[12px] font-bold text-gray-700 mb-1.5">
                        Destination category
                      </label>
                      <ParentCategoryPicker
                        value={targetCategoryId}
                        options={shiftTargets}
                        allCats={flat}
                        onChange={setTargetCategoryId}
                      />
                    </div>
                  )}
                </div>
              )}

              <div
                onClick={() => !deleting && setMode("delete_products")}
                className={`rounded-xl border-2 p-4 transition cursor-pointer ${
                  mode === "delete_products"
                    ? "border-red-500 bg-red-50/60"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="delete-category-mode"
                    checked={mode === "delete_products"}
                    onChange={() => setMode("delete_products")}
                    disabled={deleting}
                    className="mt-1 accent-red-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4 text-red-600 shrink-0" />
                      <span className="text-[13px] font-bold text-red-700">
                        Permanently delete category &amp; all {productCount} product{productCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p className="text-[12px] text-red-600/85 mt-1">
                      Warning: removes all {productCount} product{productCount === 1 ? "" : "s"} from the store and permanently deletes their unshared images.
                    </p>
                  </div>
                </label>

                {mode === "delete_products" && (
                  <label
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 ml-7 flex items-start gap-2.5 rounded-lg bg-white border border-red-200 px-3 py-2.5 text-[12px] font-semibold text-red-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={confirmDestructive}
                      onChange={(e) => setConfirmDestructive(e.target.checked)}
                      disabled={deleting}
                      className="mt-0.5 accent-red-600"
                    />
                    <span>
                      I confirm permanent deletion of {productCount} product{productCount === 1 ? "" : "s"} and their images.
                    </span>
                  </label>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-gray-500">
              There are no products in this category. Only the category will be deleted.
            </p>
          )}

          <p className="text-[12px] text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-center gap-2">
            <span>🗑️</span>
            <span>Attached category banner image will also be removed automatically.</span>
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-5 py-2.5 text-[14px] font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`flex items-center gap-2 px-6 py-2.5 text-[14px] font-bold text-white rounded-xl transition disabled:opacity-50 cursor-pointer ${
              hasProducts && mode === "shift"
                ? "bg-purple-600 hover:bg-purple-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : hasProducts && mode === "shift" ? (
              <ArrowRightLeft className="h-4 w-4" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {deleting
              ? "Processing..."
              : hasProducts && mode === "shift"
              ? "Shift products & delete category"
              : hasProducts
              ? "Delete category & products"
              : "Delete category"}
          </button>
        </div>
      </div>
    </div>
  );
}
