"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import type { WooProduct } from "@/types/product";
import { getDisplayPrice } from "@/utils/price";
import { useCartStore } from "@/store/cart-store";
import { QuickViewModal } from "@/components/product/quick-view-modal";
import { decodeEntities } from "@/utils/html";

interface ProductCardProps {
  product: WooProduct;
  eager?: boolean;
}

export function ProductCard({ product, eager = false }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const pricing = useMemo(
    () => getDisplayPrice(product.regular_price || product.price, product.sale_price),
    [product.price, product.regular_price, product.sale_price],
  );

  const primaryImage =
    product.images[0]?.src || "https://placehold.co/800x800/f5f5f5/999.png?text=Product";
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
      size: product.sizes?.[0] || "",
      quantity: 1,
      shippingClassId: product.shipping_class_id ?? 0,
      deliveryInside: insideFee,
      deliveryOutside: outsideFee,
    });
    
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <>
      <article 
        className="group relative flex flex-col justify-between bg-transparent rounded-none transition-all duration-200"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* ── 1. Image Container (Square 1:1 matching live store exactly) ── */}
        <div className="relative aspect-square w-full overflow-hidden bg-[#340402] border border-[#E1B76F]/20 rounded-none shadow-sm">
          {/* Top Badges (Sale % or Sold Out) */}
          {discountPct > 0 && (
            <div className="absolute left-2 top-2 z-10">
              <span className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-[#400604] text-[9px] font-black uppercase text-[#E1B76F] border border-[#E1B76F]/40 shadow">
                Sale!
              </span>
            </div>
          )}
          {!inStock && (
            <div className="absolute left-2 top-2 z-10">
              <span className="rounded bg-[#400604]/90 border border-[#E1B76F]/30 px-2 py-0.5 text-[9px] font-bold uppercase text-[#E1B76F] shadow">
                Sold Out
              </span>
            </div>
          )}

          {/* Product Image with Hover Flip */}
          <Link
            href={`/products/${product.slug}`}
            className="absolute inset-0 z-0 flex items-center justify-center"
            tabIndex={-1}
            aria-label={product.name}
          >
            <Image
              src={primaryImage}
              alt={decodeEntities(product.name)}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 12.5vw"
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : "auto"}
              className={`object-cover transition-opacity duration-300 ${
                isHovered && product.images.length > 1 ? "opacity-0" : "opacity-100"
              }`}
            />
            {product.images.length > 1 && (
              <Image
                src={hoverImage}
                alt=""
                fill
                loading="lazy"
                className={`object-cover transition-opacity duration-300 ${
                  isHovered ? "opacity-100" : "opacity-0"
                }`}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 12.5vw"
              />
            )}
          </Link>
        </div>

        {/* ── 2. Product Information ── */}
        <div className="flex flex-1 flex-col justify-between pt-2.5 pb-1 text-left bg-transparent">
          <div>
            {/* Product Title */}
            <Link href={`/products/${product.slug}`} className="block">
              <h3 className="line-clamp-3 text-[12px] sm:text-[12.5px] font-normal leading-[1.3] text-[#E1B76F] transition-colors hover:text-white">
                {decodeEntities(product.name)}
              </h3>
            </Link>

            {/* Category Subtitle */}
            <span className="block mt-0.5 mb-1 text-[10.5px] sm:text-[11px] text-[#E1B76F]/70 font-normal line-clamp-1">
              {decodeEntities(product.categories?.[0]?.name || "Apparel")}
            </span>
          </div>

          <div className="mt-1">
            {/* Price */}
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[12.5px] sm:text-[13px] font-bold text-[#E1B76F]">
                Tk{pricing.current.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {pricing.hasSale && (
                <span className="text-[11px] text-[#E1B76F]/60 line-through font-normal">
                  Tk{pricing.regular.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </div>

            {/* Action Button: Luxury Maroon & Gold Pill Button */}
            <button
              type="button"
              disabled={!inStock}
              onClick={handleAddToCart}
              className={`inline-flex w-fit items-center justify-center rounded-full px-3.5 py-1 text-[11px] font-bold transition-colors duration-200 active:scale-95 ${
                added
                  ? "bg-[#E1B76F] text-[#400604]"
                  : "bg-[#400604] border border-[#E1B76F]/40 text-[#E1B76F] hover:bg-[#520805] hover:border-[#E1B76F]"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {added ? (
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3" /> Added
                </span>
              ) : (
                "Select options"
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
