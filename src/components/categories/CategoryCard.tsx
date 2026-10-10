import Link from "next/link";
import Image from "next/image";
import type { WooCategory } from "@/types/product";
import { categoryDisplayName, DEFAULT_CATEGORY_EMOJI } from "@/utils/category-display";
import { getCategoryImage } from "@/config/category-images";

export function CategoryCard({ category, href }: { category: WooCategory; href: string }) {
  const imageUrl = getCategoryImage(category);
  const name = categoryDisplayName(category.name);
  const count = typeof category.count === "number" ? category.count : 0;
  const countLabel = `${count} ${count === 1 ? "PRODUCT" : "PRODUCTS"}`;

  return (
    <Link
      href={href}
      className="group relative block w-full bg-white text-center"
    >
      {/* 1. Category Image (Square 1:1 matching live store exactly) */}
      <div className="relative aspect-square w-full overflow-hidden bg-neutral-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={category.image?.alt || category.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-100">
            <span className="text-4xl">{DEFAULT_CATEGORY_EMOJI}</span>
          </div>
        )}

        {/* 2. White Overlay Banner (Matches Gorur Ghash Astra .woocommerce-loop-category__title) */}
        <div className="absolute left-3 right-3 sm:left-4 sm:right-4 bottom-4 sm:bottom-6 bg-[rgba(255,255,255,0.88)] group-hover:bg-white text-center py-2 sm:py-2.5 px-2 transition-colors duration-200 pointer-events-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <h2 className="text-[12px] sm:text-[13px] font-bold uppercase tracking-wider text-black leading-tight line-clamp-1">
            {name}
          </h2>
          {count > 0 && (
            <span className="block text-[10px] sm:text-[11px] font-normal uppercase tracking-wider text-black/50 mt-0.5 leading-tight">
              {countLabel}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

