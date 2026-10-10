import Link from "next/link";
import Image from "next/image";
import type { WooCategory } from "@/types/product";
import { categoryDisplayName, DEFAULT_CATEGORY_EMOJI } from "@/utils/category-display";

export function CategoryCard({ category, href }: { category: WooCategory; href: string }) {
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-[12px] border border-[#5c0f0d] bg-[#2b0403] aspect-[4/5] shadow-lg transition-all duration-300 hover:border-[#E1B76F] hover:shadow-2xl"
    >
      {/* Background Category Image */}
      <div className="absolute inset-0 bg-[#2b0403]">
        {category.image?.src ? (
          <Image
            src={category.image.src}
            alt={category.image.alt || category.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#400604] to-[#2b0403]">
            <span className="text-4xl">{DEFAULT_CATEGORY_EMOJI}</span>
          </div>
        )}
      </div>

      {/* Subtle overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

      {/* Frosted White / Gold Banner Pill at Bottom (Gorur Ghash authentic layout) */}
      <div className="absolute bottom-4 left-3 right-3 z-10 flex flex-col items-center justify-center rounded-[8px] bg-white/90 py-2.5 px-3 text-center backdrop-blur-md transition-all duration-300 group-hover:bg-[#E1B76F] shadow-md">
        <p className="font-heading text-[11px] sm:text-[12px] font-black uppercase tracking-wider text-black group-hover:text-[#400604] leading-tight">
          {categoryDisplayName(category.name)}
        </p>
        {typeof category.count === "number" && category.count > 0 && (
          <p className="mt-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-700 group-hover:text-[#400604]/80">
            {category.count} {category.count === 1 ? "Product" : "Products"}
          </p>
        )}
      </div>
    </Link>
  );
}
