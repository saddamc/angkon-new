import type { CategoryNode } from "@/types/woocommerce";
import { categoryDisplayName, decodeHtmlCharCodes } from "@/utils/category-display";

export function CategoryHero({
  category,
}: {
  category: CategoryNode;
  productCount?: number;
}) {
  const name = categoryDisplayName(category.name);
  const description = decodeHtmlCharCodes(category.description);

  return (
    <div>
      <h1 className="text-[34px] sm:text-[42px] md:text-[46px] font-heading font-black tracking-tight text-[#E1B76F] leading-none uppercase">
        {name}
      </h1>
      {description && (
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#f0d29d]">
          {description}
        </p>
      )}
    </div>
  );
}

