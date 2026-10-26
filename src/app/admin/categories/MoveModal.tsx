"use client";

import React, { useState } from "react";
import { X, AlertCircle, ArrowRightLeft, Loader2 } from "lucide-react";
import type { WCCategory } from "./types";
import { catName, descendantIdSet, siblingsOf } from "./category-tree-utils";
import { ParentCategoryPicker } from "./ParentCategoryPicker";
import { PositionPicker } from "./PositionPicker";

interface MoveModalProps {
  cat: WCCategory;
  flat: WCCategory[];
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onClose: () => void;
  onDone: () => Promise<void>;
  showToast: (msg: string, ok?: boolean) => void;
}

export function MoveModal({
  cat,
  flat,
  authFetch,
  onClose,
  onDone,
  showToast,
}: MoveModalProps) {
  const banned = descendantIdSet(flat, cat.id);
  const parentOptions = flat.filter((c) => c.id !== cat.id && !banned.has(c.id));
  const [parent, setParent] = useState(cat.parent);
  const [index, setIndex] = useState(() => {
    const ordered = flat
      .filter((c) => c.parent === cat.parent)
      .sort((a, b) => a.menu_order - b.menu_order);
    return Math.max(0, ordered.findIndex((c) => c.id === cat.id));
  });
  const [moveProducts, setMoveProducts] = useState(false);
  const [productTarget, setProductTarget] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const positionSiblings = siblingsOf(flat, parent, cat.id);
  const productTargets = flat.filter((c) => c.id !== cat.id);

  const submit = async () => {
    if (parent !== 0 && !parentOptions.some((c) => c.id === parent)) {
      setError("Choose a valid parent category");
      return;
    }
    if (moveProducts && !productTarget) {
      setError("Choose a category to move products into");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const relocateRes = await authFetch("/api/admin/categories/relocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, parent, index }),
      });
      if (!relocateRes.ok) {
        const data = await relocateRes.json().catch(() => ({}));
        throw new Error(data.error || data.message || "Failed to move category");
      }
      if (moveProducts && productTarget) {
        const prodRes = await authFetch("/api/admin/categories/move-products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from: cat.id, to: productTarget }),
        });
        if (!prodRes.ok)
          throw new Error("Category moved, but products could not be reassigned");
        const result = await prodRes.json();
        showToast(`Moved category and ${result.moved ?? 0} products`);
      } else {
        showToast("Category moved");
      }
      await onDone();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Move failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-[18px] font-black text-gray-900">
              Move “{catName(cat)}”
            </h2>
            <p className="text-[13px] text-gray-500 mt-0.5">
              Change parent, list position, or reassign products.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-[13px] font-medium text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
              Place under
            </label>
            <ParentCategoryPicker
              value={parent}
              options={parentOptions}
              allCats={flat}
              allowRoot
              onChange={(id) => {
                setParent(id);
                setIndex(siblingsOf(flat, id, cat.id).length);
              }}
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-1.5">
              Position in that list
            </label>
            <PositionPicker
              siblings={positionSiblings}
              value={index}
              onChange={setIndex}
            />
          </div>
          {(cat.direct_count ?? cat.count) > 0 && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={moveProducts}
                  onChange={(e) => setMoveProducts(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-[13px] text-gray-700">
                  Also move the <b>{cat.direct_count ?? cat.count} products</b> listed
                  directly in this category to another category
                </span>
              </label>
              {moveProducts && (
                <ParentCategoryPicker
                  value={productTarget}
                  options={productTargets}
                  allCats={flat}
                  onChange={setProductTarget}
                />
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-[14px] font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 text-[14px] font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition disabled:opacity-60 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRightLeft className="h-4 w-4" />
            )}
            Save move
          </button>
        </div>
      </div>
    </div>
  );
}
