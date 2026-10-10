"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ShoppingBag, Heart, Check, Eye } from "lucide-react";
import type { WooProduct } from "@/types/product";
import { formatPrice, getDisplayPrice } from "@/utils/price";
import { useCartStore } from "@/store/cart-store";
import { useWishlistStore } from "@/store/wishlist-store";
import { QuickViewModal } from "@/components/product/quick-view-modal";
import { decodeEntities } from "@/utils/html";

interface ProductCardProps {
  product: WooProduct;
  eager?: boolean;
}

export function ProductCard({ product, eager = false }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const toggleWishlist = useWishlistStore((s) => s.toggleItem);
  const isWished = useWishlistStore((s) => s.isInWishlist(product.id));
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes?.[0] || "");
  const [added, setAdded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const pricing = useMemo(
    () => getDisplayPrice(product.regular_price || product.price, product.sale_price),
    [product.price, product.regular_price, product.sale_price],
  );

  const primaryImage =
    product.images[0]?.src || "https://placehold.co/800x1067/f3f4f6/999.png?text=Product";
  const hoverImage =
    product.images[1]?.src || primaryImage;

  const inStock = product.stock_status === "instock";
  const discountPct = pricing.hasSale ? Math.round((1 - pricing.current / pricing.regular) * 100) : 0;
  const insideFee = parseInt(product.meta_data?.slice().reverse().find(m => m.key === "_delivery_inside")?.value || "60");
  const outsideFee = parseInt(product.meta_data?.slice().reverse().find(m => m.key === "_delivery_outside")?.value || "100");

  const hasMultipleSizes = product.sizes && product.sizes.length > 1;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!inStock) return;
    
    if (hasMultipleSizes) {
      setQuickViewOpen(true);
      return;
    }

    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: primaryImage,
      price: pricing.current,
      size: selectedSize || product.sizes?.[0] || "",
      quantity: 1,
      shippingClassId: product.shipping_class_id ?? 0,
      deliveryInside: insideFee,
      deliveryOutside: outsideFee,
    });
    
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: primaryImage,
      price: pricing.current,
    });
  };

  const handleQuickViewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewOpen(true);
  };

  return (
    <>
      <article 
        className="group relative flex flex-col overflow-hidden rounded-[14px] border border-[#5c0f0d] bg-[#4a0705] transition-all duration-300 hover:shadow-2xl hover:border-[#E1B76F]/80"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* ── 1. Image Container (Square 1:1 matching live store) ── */}
        <div className="relative aspect-square w-full overflow-hidden bg-white/10">
          {/* Top Badges (Sale % & Sold Out) */}
          <div className="absolute left-2.5 top-2.5 z-10 flex flex-col gap-1">
            {discountPct > 0 && (
              <div className="flex items-center gap-1">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/90 border border-[#E1B76F]/60 text-[9px] font-black uppercase tracking-tight text-[#E1B76F] shadow-lg">
                  Sale!
                </span>
                <span className="rounded-md bg-[#E1B76F] px-1.5 py-0.5 text-[9px] font-black uppercase text-[#400604] shadow-md">
                  -{discountPct}%
                </span>
              </div>
            )}
            {!inStock && (
              <span className="rounded-md bg-[#2b0403]/90 border border-[#5c0f0d] px-2 py-0.5 text-[10px] font-bold uppercase text-[#E1B76F] shadow-md">
                Sold Out
              </span>
            )}
          </div>

          {/* Top-Right Action Floating Buttons (Wishlist & Quick View) */}
          <div className="absolute right-2.5 top-2.5 z-10 flex flex-col gap-1.5 opacity-90 group-hover:opacity-100">
            <button
              type="button"
              onClick={handleWishlistClick}
              className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all backdrop-blur-md shadow-md ${
                isWished
                  ? "border-[#E1B76F] bg-[#E1B76F] text-[#400604]"
                  : "border-[#5c0f0d] bg-[#400604]/80 text-[#E1B76F] hover:bg-[#E1B76F] hover:text-[#400604]"
              }`}
              title="Save to Wishlist"
              aria-label="Save to Wishlist"
            >
              <Heart className={`h-3.5 w-3.5 ${isWished ? "fill-[#400604] text-[#400604]" : ""}`} />
            </button>

            <button
              type="button"
              onClick={handleQuickViewClick}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[#5c0f0d] bg-[#400604]/80 text-[#E1B76F] hover:bg-[#E1B76F] hover:text-[#400604] transition-all backdrop-blur-md shadow-md"
              title="Quick View"
              aria-label="Quick View"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Product Image with Hover Flip */}
          <Link
            href={`/products/${product.slug}`}
            className="absolute inset-0 z-0 flex items-center justify-center bg-white"
            tabIndex={-1}
            aria-label={product.name}
          >
            <Image
              src={isHovered && product.images.length > 1 ? hoverImage : primaryImage}
              alt={decodeEntities(product.name)}
              fill
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : "auto"}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 15vw"
            />
          </Link>
        </div>

        {/* ── 2. Product Information ── */}
        <div className="flex flex-1 flex-col justify-between p-3 text-left bg-[#4a0705]">
          <div>
            {/* Product Title */}
            <Link href={`/products/${product.slug}`}>
              <h3 className="line-clamp-2 font-heading text-[12px] sm:text-[13px] font-bold leading-snug text-[#E1B76F] transition hover:text-[#f3cb87]">
                {decodeEntities(product.name)}
              </h3>
            </Link>

            {/* Category / Sub-tag */}
            {product.categories?.[0] && (
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-[#cbb18a]">
                {decodeEntities(product.categories[0].name)}
              </p>
            )}
          </div>

          <div className="mt-2">
            {/* Price (Tk in Gorur Ghash formatting) */}
            <div className="flex items-center gap-1.5 mb-2">
              <span className="font-heading text-[13px] sm:text-[14px] font-black text-[#E1B76F]">
                Tk{pricing.current.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {pricing.hasSale && (
                <span className="text-[11px] text-[#cbb18a] line-through">
                  Tk{pricing.regular.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </div>

            {/* Action Button (Bright Yellow Rounded Pill Button matching Gorur Ghash) */}
            <button
              type="button"
              disabled={!inStock}
              onClick={handleAddToCart}
              className={`w-full flex items-center justify-center gap-1 rounded-full py-1.5 px-3 text-[11px] sm:text-[12px] font-extrabold transition-all duration-200 shadow-sm ${
                added
                  ? "bg-[#2b0403] text-[#E1B76F] border border-[#E1B76F]"
                  : "bg-[#ffd800] text-black hover:bg-[#ffe500]"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {added ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Added
                </>
              ) : (
                <>Select options</>
              )}
            </button>
          </div>
        </div>
      </article>

      {/* Quick View Modal */}
      <QuickViewModal
        product={product}
        isOpen={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
      />
    </>
  );
}
