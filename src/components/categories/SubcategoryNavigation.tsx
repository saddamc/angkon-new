import type { CategoryNode } from "@/types/woocommerce";
import { CategoryCard } from "@/components/categories/CategoryCard";

export function SubcategoryNavigation({
  subcategories,
  parentSlug,
}: {
  subcategories: CategoryNode[];
  parentSlug: string;
}) {
  if (subcategories.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-[13px] font-bold uppercase tracking-widest text-[#cbb18a]">
        Shop by Subcategory
      </h2>
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 sm:gap-5">
        {subcategories.map((sub) => (
          <CategoryCard key={sub.id} category={sub} href={`/${parentSlug}/${sub.slug}`} />
        ))}
      </div>
    </div>
  );
}
