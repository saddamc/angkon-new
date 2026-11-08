"use client";

import Link from "next/link";
import {
  Pencil,
  CopyPlus,
  Eye,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { getProductPageUrl } from "@/utils/product-url";
import type { AdminProductsHookReturn } from "../_hooks/use-admin-products";

interface ProductsModalsProps {
  state: AdminProductsHookReturn;
}

export function ProductsModals({ state }: ProductsModalsProps) {
  const {
    actionMenu,
    setActionMenu,
    menuPos,
    setMenuPos,
    products,
    duplicating,
    handleDuplicate,
    copyToClipboard,
    copiedKey,
    openDeleteSingle,
    deleteTarget,
    setDeleteTarget,
    isDeleting,
    confirmDelete,
    toast,
    setToast,
  } = state;

  return (
    <>
      {/* ── Fixed Action Dropdown Menu ──────────────────── */}
      {actionMenu !== null && menuPos !== null && (() => {
        const product = products.find((p) => p.id === actionMenu);
        if (!product) return null;
        return (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => {
                setActionMenu(null);
                setMenuPos(null);
              }}
            />
            <div
              style={{ top: `${menuPos.top}px`, right: `${menuPos.right}px` }}
              className="fixed z-50 w-52 bg-white rounded-2xl shadow-xl border border-stone-200 py-1.5 text-[13px] animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-3 py-1.5 border-b border-stone-100">
                <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Product Options</p>
                <p className="text-[12px] font-semibold text-stone-800 truncate">{product.name}</p>
              </div>

              <div className="py-1 border-b border-gray-100">
                <Link
                  href={`/admin/products/${encodeURIComponent(product.slug || String(product.id))}/edit`}
                  onClick={() => {
                    setActionMenu(null);
                    setMenuPos(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition"
                >
                  <Pencil className="h-4 w-4 text-gray-400" />
                  <span>Edit Product</span>
                </Link>

                <button
                  type="button"
                  disabled={duplicating === product.id}
                  onClick={() => void handleDuplicate(product)}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition text-left disabled:opacity-50 cursor-pointer"
                >
                  {duplicating === product.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                  ) : (
                    <CopyPlus className="h-4 w-4 text-gray-400" />
                  )}
                  <span>{duplicating === product.id ? "Duplicating…" : "Duplicate as Draft"}</span>
                </button>

                <a
                  href={getProductPageUrl(product.slug || product.name, { fromName: !product.slug })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition"
                >
                  <Eye className="h-4 w-4 text-gray-400" />
                  <span>View on Store</span>
                  <ExternalLink className="h-3 w-3 text-gray-400 ml-auto" />
                </a>
              </div>

              <div className="py-1 border-b border-stone-100">
                {product.sku && (
                  <button
                    type="button"
                    onClick={() => void copyToClipboard(product.sku, `sku-${product.id}`)}
                    className="w-full flex items-center justify-between px-4 py-2 text-stone-700 hover:bg-stone-50 transition text-left cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <Copy className="h-4 w-4 text-stone-400" />
                      <span>Copy SKU</span>
                    </span>
                    {copiedKey === `sku-${product.id}` && (
                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Copied!
                      </span>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const url = getProductPageUrl(product.slug || product.name, { fromName: !product.slug });
                    void copyToClipboard(url, `url-${product.id}`);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 text-stone-700 hover:bg-stone-50 transition text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Copy className="h-4 w-4 text-stone-400" />
                    <span>Copy Link</span>
                  </span>
                  {copiedKey === `url-${product.id}` && (
                    <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Copied!
                    </span>
                  )}
                </button>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => openDeleteSingle(product.id, product.name)}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-rose-600 hover:bg-rose-50 transition text-left font-medium cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 text-rose-500" />
                  <span>Delete Product</span>
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── Bulk / Single Delete Confirmation Modal ───────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center flex-shrink-0 text-rose-600 border border-rose-100">
                <Trash2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-900">
                  {deleteTarget.ids.length === 1
                    ? "Delete Product?"
                    : `Delete ${deleteTarget.ids.length} Products?`}
                </h3>
                <p className="text-[13px] text-stone-500 leading-relaxed">
                  {deleteTarget.ids.length === 1
                    ? `Are you sure you want to permanently delete "${deleteTarget.names[0]}"?`
                    : `Are you sure you want to permanently delete ${deleteTarget.ids.length} selected products?`}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-amber-50/80 border border-amber-200/80 p-3.5 flex items-start gap-3 text-amber-800">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-[12px] leading-relaxed">
                <p className="font-bold text-amber-900">Remove from Database</p>
                <p className="text-amber-700 mt-0.5">
                  This action cannot be undone.{" "}
                  {deleteTarget.ids.length === 1 ? "The product" : "The selected products"} will be
                  permanently removed from the database.
                </p>
              </div>
            </div>

            {deleteTarget.ids.length > 1 && (
              <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-stone-50 rounded-xl border border-stone-200 text-[12px] text-stone-700">
                {deleteTarget.names.map((name, i) => (
                  <div key={i} className="flex items-center gap-2 truncate">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                    <span className="truncate">{name}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-[13px] font-semibold transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void confirmDelete()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Deleting…</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>
                      {deleteTarget.ids.length === 1
                        ? "Delete Product"
                        : `Delete ${deleteTarget.ids.length} Products`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ────────────────────────────── */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-2xl text-[13px] font-bold text-white transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${
            toast.ok
              ? "bg-emerald-600 shadow-emerald-500/20"
              : "bg-rose-600 shadow-rose-500/20"
          }`}
        >
          {toast.ok ? (
            <Check className="h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
          )}
          <span>{toast.msg}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 p-1 rounded-lg hover:bg-white/20 transition text-white/80 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
