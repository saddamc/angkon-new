import Link from "next/link";
import Image from "next/image";
import type { WooCategory } from "@/types/product";
import { categoryDisplayName, DEFAULT_CATEGORY_EMOJI } from "@/utils/category-display";

export function CategoryCard({ category, href }: { category: WooCategory; href: string }) {
  return (
    <Link
      href={href}
      className="group block text-left bg-white transition-all"
    >
      {/* 1. Category Image (Square 1:1 matching live store exactly) */}
      <div className="relative aspect-square w-full overflow-hidden rounded-none bg-neutral-100">
        {category.image?.src ? (
          <Image
            src={category.image.src}
            alt={category.image.alt || category.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-100">
            <span className="text-4xl">{DEFAULT_CATEGORY_EMOJI}</span>
          </div>
        )}
      </div>

      {/* 2. Subcategory Information: Title & Product Count */}
      <div className="pt-2.5 pb-1 text-left">
        <h3 className="text-[13px] sm:text-[13.5px] font-bold text-black transition-colors group-hover:text-neutral-600 flex items-baseline gap-1.5 flex-wrap">
          <span>{categoryDisplayName(category.name)}</span>
          {typeof category.count === "number" && category.count > 0 && (
            <span className="text-[11px] sm:text-[11.5px] font-normal text-neutral-500">
              ({category.count} {category.count === 1 ? "Product" : "Products"})
            </span>
          )}
        </h3>
      </div>
    </Link>
  );
}
