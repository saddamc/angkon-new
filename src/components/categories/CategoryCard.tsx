import Link from "next/link";
import Image from "next/image";
import type { WooCategory } from "@/types/product";
import { categoryDisplayName, DEFAULT_CATEGORY_EMOJI } from "@/utils/category-display";
import { getCategoryImage } from "@/config/category-images";

export function CategoryCard({
  category,
  href,
  priority = false,
}: {
  category: WooCategory;
  href: string;
  priority?: boolean;
}) {
  const imageUrl = getCategoryImage(category);
  const name = categoryDisplayName(category.name);
  const count = typeof category.count === "number" ? category.count : 0;
  const countLabel = `${count} ${count === 1 ? "PRODUCT" : "PRODUCTS"}`;

  return (
    <Link
      href={href}
      className="group relative block w-full bg-transparent text-center"
    >
      {/* 1. Category Image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#340402] border border-[#E1B76F]/20">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={category.image?.alt || category.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#340402]">
            <span className="text-4xl">{DEFAULT_CATEGORY_EMOJI}</span>
          </div>
        )}

        {/* 2. Brand Overlay Banner */}
        <div className="absolute left-3 right-3 sm:left-4 sm:right-4 bottom-4 sm:bottom-5 rounded-lg bg-[#400604]/90 group-hover:bg-[#400604] border border-[#E1B76F]/30 backdrop-blur-sm text-center py-2 px-2 transition-colors duration-200 pointer-events-none shadow-md">
          <h2 className="text-[12px] sm:text-[13px] font-bold uppercase tracking-wider text-[#E1B76F] leading-snug line-clamp-1">
            {name}
          </h2>
          {count > 0 && (
            <span className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[#f0d29d]/70 mt-0.5 leading-snug">
              {countLabel}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

