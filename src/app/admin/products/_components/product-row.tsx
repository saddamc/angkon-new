"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Pencil, Copy, Check, MoreVertical } from "lucide-react";
import {
  type WCProductRaw,
  getBuyPrice,
  getDeliveryFees,
} from "../_types/products.types";
import type { AdminProductsHookReturn } from "../_hooks/use-admin-products";

function ProductTableThumb({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-stone-100 text-[#530911] text-xs font-bold">
        {name.charAt(0)}
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={name}
      width={56}
      height={56}
      className="object-cover w-full h-full"
      onError={() => setFailed(true)}
    />
  );
}

interface ProductRowProps {
  product: WCProductRaw;
  idx: number;
  state: AdminProductsHookReturn;
}

export function ProductRow({ product, idx, state }: ProductRowProps) {
  const {
    selectedIds,
    toggleSelect,
    copyToClipboard,
    copiedKey,
    toggleMenu,
  } = state;

  const isSelected = selectedIds.has(product.id);
  const thumb = product.images?.[0]?.src;
  const fees = getDeliveryFees(product);

  return (
    <div
      key={product.id}
      className={`grid grid-cols-[40px_45px_64px_1fr_120px_115px_80px_80px_90px_130px_95px_65px] items-center gap-3 px-5 py-3.5 hover:bg-purple-50/40 transition ${
        isSelected ? "bg-purple-50/70" : ""
      }`}
    >
      {/* Checkbox */}
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleSelect(product.id)}
          className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
        />
      </div>

      {/* SL */}
      <span className="text-[11px] font-bold text-gray-400">{idx + 1}</span>

      {/* Image */}
      <div className="h-14 w-14 rounded-xl overflow-hidden bg-purple-50/50 flex-shrink-0 border border-purple-100 relative">
        <ProductTableThumb src={thumb} name={product.name} />
      </div>

      {/* Name & Categories */}
      <div className="min-w-0 pr-2">
        <Link
          href={`/admin/products/${encodeURIComponent(product.slug || String(product.id))}/edit`}
          className="text-[13px] font-semibold text-gray-800 hover:text-purple-600 transition truncate block"
          title={product.name}
        >
          {product.name}
        </Link>
        {product.categories && product.categories.length > 0 && (
          <p className="text-[11px] text-gray-400 truncate mt-0.5">
            {product.categories.map((c) => c.name).join(", ")}
          </p>
        )}
      </div>

      {/* SKU */}
      <div>
        <div className="inline-flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200/80">
          <span
            className="text-[11px] text-gray-700 font-mono font-medium truncate max-w-[70px]"
            title={product.sku || undefined}
          >
            {product.sku || "—"}
          </span>
          {product.sku && (
            <button
              type="button"
              onClick={() => copyToClipboard(product.sku, `col-sku-${product.id}`)}
              title="Copy SKU"
              className="p-0.5 rounded text-gray-400 hover:text-purple-600 transition cursor-pointer"
            >
              {copiedKey === `col-sku-${product.id}` ? (
                <Check className="h-3 w-3 text-emerald-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Price */}
      <div>
        <span className="text-[13px] font-bold text-gray-900">
          ৳{Number(product.price || 0).toLocaleString()}
        </span>
        {product.on_sale && product.regular_price && (
          <span className="block text-[10px] text-gray-400 line-through">
            ৳{Number(product.regular_price).toLocaleString()}
          </span>
        )}
        {getBuyPrice(product) > 0 && (
          <span className="block text-[10.5px] text-purple-700 font-medium">
            Cost: ৳{getBuyPrice(product).toLocaleString()}
          </span>
        )}
      </div>

      {/* Quantity */}
      <div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-50 text-gray-600 border border-gray-200">
          {product.manage_stock ? product.stock_quantity ?? "0" : "∞ In Stock"}
        </span>
      </div>

      {/* Status */}
      <div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
            product.status === "publish"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : product.status === "draft"
              ? "bg-gray-100 text-gray-600 border border-gray-200"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}
        >
          {product.status === "publish"
            ? "Active"
            : product.status === "draft"
            ? "Draft"
            : product.status}
        </span>
      </div>

      {/* Added On */}
      <div>
        <span className="text-[11px] text-gray-500 whitespace-nowrap">
          {product.date_created
            ? new Date(product.date_created).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "—"}
        </span>
      </div>

      {/* Delivery */}
      <div>
        <div className="space-y-0.5">
          <p className="text-[11px] text-gray-600 leading-tight">
            Inside:{" "}
            <span className="font-semibold text-purple-700">
              {fees.inside === null ? "Store rate" : fees.inside === 0 ? "Free" : `${fees.inside} TK`}
            </span>
          </p>
          <p className="text-[11px] text-gray-600 leading-tight">
            Outside:{" "}
            <span className="font-semibold text-purple-700">
              {fees.outside === null ? "Store rate" : fees.outside === 0 ? "Free" : `${fees.outside} TK`}
            </span>
          </p>
        </div>
      </div>

      {/* Update Button */}
      <div className="flex justify-center">
        <Link
          href={`/admin/products/${encodeURIComponent(product.slug || String(product.id))}/edit`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white text-[12px] font-semibold transition border border-purple-200/70 shadow-sm"
          title="Edit Product"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span>Edit</span>
        </Link>
      </div>

      {/* Action Menu Toggle */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={(e) => toggleMenu(product.id, e.currentTarget)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition cursor-pointer"
          title="More options"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
