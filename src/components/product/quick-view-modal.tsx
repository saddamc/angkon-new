"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, ShoppingBag, Check, ArrowRight } from "lucide-react";
import type { WooProduct } from "@/types/product";
import { formatPrice, getDisplayPrice } from "@/utils/price";
import { useCartStore } from "@/store/cart-store";
import { decodeEntities } from "@/utils/html";

interface QuickViewModalProps {
  product: WooProduct;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes?.[0] || "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const addItem = useCartStore((s) => s.addItem);

  if (!isOpen) return null;

  const pricing = getDisplayPrice(product.regular_price || product.price, product.sale_price);
  const inStock = product.stock_status === "instock";
  const discountPct = pricing.hasSale ? Math.round((1 - pricing.current / pricing.regular) * 100) : 0;
  const primaryImage = product.images[selectedImage]?.src || product.images[0]?.src || "/placeholder.png";

  const insideFee = parseInt(product.meta_data?.slice().reverse().find((m) => m.key === "_delivery_inside")?.value || "60");
  const outsideFee = parseInt(product.meta_data?.slice().reverse().find((m) => m.key === "_delivery_outside")?.value || "100");

  const handleAddToCart = () => {
    if (!inStock) return;
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0]?.src || primaryImage,
      price: pricing.current,
      size: selectedSize || product.sizes?.[0] || "",
      quantity,
      shippingClassId: product.shipping_class_id ?? 0,
      deliveryInside: insideFee,
      deliveryOutside: outsideFee,
    });
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl text-black max-h-[90vh] flex flex-col md:flex-row">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-black hover:bg-neutral-200 transition"
          aria-label="Close Quick View"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Left: Images */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-neutral-100 bg-neutral-50">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-white border border-neutral-200">
            <Image
              src={primaryImage}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            {discountPct > 0 && (
              <span className="absolute left-3 top-3 rounded-full bg-black px-2.5 py-1 text-[11px] font-black uppercase text-[#ffd800]">
                -{discountPct}%
              </span>
            )}
          </div>

          {/* Thumbnail row */}
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {product.images.slice(0, 5).map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border transition ${
                    selectedImage === i ? "border-black ring-1 ring-black" : "border-neutral-200 opacity-60 hover:opacity-100"
                  }`}
                >
                  <Image src={img.src} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info & Actions */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto">
          <div>
            {product.categories?.[0] && (
              <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
                {product.categories[0].name}
              </span>
            )}
            <h2 className="mt-1 font-heading text-xl sm:text-2xl font-bold text-black leading-tight">
              {decodeEntities(product.name)}
            </h2>

            {/* Price */}
            <div className="mt-3 flex items-baseline gap-3">
              <span className="font-heading text-2xl font-black text-black">
                {formatPrice(pricing.current)}
              </span>
              {pricing.hasSale && (
                <span className="text-sm text-neutral-400 line-through">
                  {formatPrice(pricing.regular)}
                </span>
              )}
            </div>

            {/* Stock indicator */}
            <div className="mt-2 text-xs">
              {inStock ? (
                <span className="text-emerald-600 font-semibold">● In Stock — Ready to dispatch</span>
              ) : (
                <span className="text-red-500 font-semibold">● Sold Out</span>
              )}
            </div>

            {/* Size selection */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="mt-6">
                <span className="block text-[12px] font-bold uppercase tracking-wider text-neutral-700 mb-2">
                  Select Size: <strong className="text-black">{selectedSize}</strong>
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`h-9 min-w-[36px] rounded-lg px-3 text-xs font-bold uppercase transition ${
                        selectedSize === size
                          ? "border border-black bg-black text-white shadow-sm"
                          : "border border-neutral-300 bg-white text-neutral-700 hover:border-black hover:text-black"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mt-6 flex items-center gap-3">
              <span className="text-[12px] font-bold uppercase tracking-wider text-neutral-700">
                Qty:
              </span>
              <div className="flex items-center rounded-lg border border-neutral-200 bg-neutral-50">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-1 text-sm font-bold text-neutral-700 hover:text-black"
                >
                  -
                </button>
                <span className="px-3 py-1 text-xs font-bold text-black">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-3 py-1 text-sm font-bold text-neutral-700 hover:text-black"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {/* Add to Cart button */}
            <button
              type="button"
              disabled={!inStock}
              onClick={handleAddToCart}
              className={`w-full flex items-center justify-center gap-2 rounded-full py-3 text-sm font-bold uppercase tracking-wider transition-all shadow-sm ${
                added
                  ? "bg-black text-[#ffd800]"
                  : "bg-[#ffd800] text-black hover:bg-[#fed700]"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {added ? (
                <>
                  <Check className="w-4 h-4" /> Added to Cart
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" /> Select options
                </>
              )}
            </button>

            {/* View Full Product link */}
            <Link
              href={`/products/${product.slug}`}
              onClick={onClose}
              className="flex items-center justify-center gap-1.5 py-1 text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-black transition"
            >
              View Full Details <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
