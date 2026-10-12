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

  return (
    <div className="relative w-full rounded-sm overflow-hidden bg-[#340402] border border-[#E1B76F]/25 shadow-lg aspect-[16/9] sm:aspect-[21/9] md:aspect-[28/8] min-h-[175px] sm:min-h-[220px] md:min-h-[260px] max-h-[380px] flex items-end">
      {/* Background Hero Banner Image */}
      <Image
        src={heroImage}
        alt={`${name} Banner`}
        fill
        priority
        loading="eager"
        sizes="(max-width: 1440px) 100vw, 1440px"
        className="object-cover object-[center_top] sm:object-center transition-transform duration-700 hover:scale-[1.01]"
      />

      {/* Luxury multi-stage dark gradient overlays for crystal-clear readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#260302] via-[#260302]/70 sm:via-[#260302]/45 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#260302]/90 via-[#260302]/40 to-transparent" />
      <div className="absolute inset-0 border border-[#E1B76F]/20 pointer-events-none" />

      {/* Hero Content Layer */}
      <div className="relative z-10 w-full p-3.5 sm:p-6 md:p-8 flex flex-col justify-end">
        {/* Luxury Gold Eyebrow Badge */}
        <div className="mb-2 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E1B76F]/20 border border-[#E1B76F]/40 text-[#E1B76F] text-[10px] sm:text-xs font-bold tracking-widest uppercase">
            ANGKON LUXURY
          </span>
          {productCount !== undefined && (
            <span className="text-white/80 text-xs font-medium tracking-wide">
              • {productCount} {productCount === 1 ? "Product" : "Products"} Available
            </span>
          )}
        </div>

        {/* Category Title */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-heading font-black tracking-tight text-white uppercase leading-tight drop-shadow-md">
          {name}
        </h1>

        {/* Category Description */}
        {description && (
          <p className="mt-1.5 sm:mt-2 max-w-2xl text-xs sm:text-sm text-white/90 leading-relaxed line-clamp-2 sm:line-clamp-3 drop-shadow">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}


