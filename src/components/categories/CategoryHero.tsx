import Image from "next/image";
import type { CategoryNode } from "@/types/woocommerce";
import { categoryDisplayName, decodeHtmlCharCodes } from "@/utils/category-display";
import { getCategoryImage } from "@/config/category-images";

export function CategoryHero({
  category,
  productCount,
}: {
  category: CategoryNode;
  productCount?: number;
}) {
  const name = categoryDisplayName(category.name);
  const description = decodeHtmlCharCodes(category.description);
  const heroImage = getCategoryImage(category);
  const hasBakedText = typeof heroImage === "string" && heroImage.startsWith("/banners/");

  return (
    <div className="relative w-full rounded-sm overflow-hidden bg-[#340402] border border-[#E1B76F]/25 shadow-lg aspect-[16/9] sm:aspect-[21/9] md:aspect-[28/8] min-h-[175px] sm:min-h-[220px] md:min-h-[260px] max-h-[380px] flex items-end">
      {/* Background Hero Banner Image - completely unblurred edge-to-edge */}
      <Image
        src={heroImage}
        alt={`${name} Banner`}
        fill
        priority
        sizes="(max-width: 1440px) 100vw, 1440px"
        className="object-cover object-[center_top] sm:object-center transition-transform duration-700 hover:scale-[1.01]"
      />

      {/* Subtle border outline */}
      <div className="absolute inset-0 border border-[#E1B76F]/20 pointer-events-none" />

      {/* Hero Content Layer */}
      <div className="relative z-10 w-full p-3.5 sm:p-6 md:p-8 flex flex-col justify-end">
        {/* Luxury Gold Eyebrow Badge */}
        <div className="mb-2 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E1B76F]/20 border border-[#E1B76F]/40 text-[#E1B76F] text-[10px] sm:text-xs font-bold tracking-widest uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            ANGKON LUXURY
          </span>
          {productCount !== undefined && (
            <span className="text-white text-xs font-medium tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              • {productCount} {productCount === 1 ? "Product" : "Products"} Available
            </span>
          )}
        </div>

        {/* Category Title: when image has baked text, keep accessible sr-only; when admin uploads custom image, render with localized drop shadow & zero blur */}
        {hasBakedText ? (
          <h1 className="sr-only">{name}</h1>
        ) : (
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-heading font-black tracking-tight text-white uppercase leading-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
            {name}
          </h1>
        )}

        {/* Category Description */}
        {description && (
          <p className="mt-1.5 sm:mt-2 max-w-2xl text-xs sm:text-sm text-white font-medium leading-relaxed line-clamp-2 sm:line-clamp-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}


