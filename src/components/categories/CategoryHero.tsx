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
    <div className="pt-1 pb-2">
      <h1 className="text-4xl sm:text-[48px] font-light tracking-tight text-[#222222] leading-tight">
        {name}
      </h1>
      {description && (
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-600">
          {description}
        </p>
      )}
    </div>
  );
}

