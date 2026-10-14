import type { CategoryNode } from "@/types/woocommerce";
import { CategoryCard } from "@/components/categories/CategoryCard";

const PREFERRED_ORDER: Record<string, string[]> = {
  women: [
    "ethnic",
    "tawakkal",
    "co-rd-set",
    "polos-women",
    "skirts",
    "womens-shirt",
    "tshirt",
    "tank-top",
    "tops",
    "pants",
    "turtleneck",
    "hoodie-women",
    "hoodie-blanket",
    "overcoat-women",
    "jacket-women",
    "kimonos",
  ],
  men: [
    "polos",
    "tank-tops",
    "mens-shirt",
    "t-shirts-men",
    "men-pants",
    "blanket-hoodies",
    "overcoat",
    "turtleneck-men",
    "hoodie-men",
    "jacket-men",
  ],
};

export function SubcategoryNavigation({
  subcategories,
  parentSlug,
  basePrefix = "",
}: {
  subcategories: CategoryNode[];
  parentSlug: string;
  basePrefix?: string;
}) {
  if (subcategories.length === 0) return null;

  const baseParent = parentSlug.split("/")[0].toLowerCase();
  const orderList = PREFERRED_ORDER[baseParent];

  const sorted = [...subcategories].sort((a, b) => {
    if (orderList) {
      const idxA = orderList.indexOf(a.slug);
      const idxB = orderList.indexOf(b.slug);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
    }
    return a.name.localeCompare(b.name);
  });

  const prefix = basePrefix ? basePrefix : "";

  return (
    <div className="mb-8 sm:mb-12">
      <div className="grid grid-cols-2 gap-x-3.5 sm:gap-x-5 md:gap-x-6 gap-y-4 sm:gap-y-6 md:grid-cols-3 lg:grid-cols-4">
        {sorted.map((sub, idx) => (
          <CategoryCard
            key={sub.id}
            category={sub}
            href={`${prefix}/${parentSlug}/${sub.slug}`}
            priority={idx < 8}
          />
        ))}
      </div>
    </div>
  );
}

