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
    <div className="mb-10">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-black">
        Shop by Subcategory
      </h2>
      <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 md:gap-x-5 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
        {subcategories.map((sub) => (
          <CategoryCard key={sub.id} category={sub} href={`/${parentSlug}/${sub.slug}`} />
        ))}
      </div>
    </div>
  );
}
