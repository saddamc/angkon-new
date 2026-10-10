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
      <h1 className="text-[34px] sm:text-[42px] md:text-[46px] font-light tracking-tight text-[#333333] leading-none">
        {name}
      </h1>
      {description && (
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#666666]">
          {description}
        </p>
      )}
    </div>
  );
}

