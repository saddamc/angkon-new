import type { CategoryNode } from "@/types/woocommerce";
import { CategoryCard } from "@/components/categories/CategoryCard";

const PREFERRED_ORDER: Record<string, string[]> = {
  women: [
    "co-rd-set",
    "ethnic",
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
    "polos-men",
    "polos",
    "tank-tops-men",
    "tank-top",
    "shirt-men",
    "shirt",
    "tshirt",
    "pants",
    "hoodie-blanket",
    "overcoat-men",
    "overcoat",
    "turtleneck",
    "hoodie-men",
    "hoodie",
    "jacket-men",
    "jacket",
  ],
};

export function SubcategoryNavigation({
  subcategories,
  parentSlug,
}: {
  subcategories: CategoryNode[];
  parentSlug: string;
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

  return (
    <div className="mb-12">
      <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-7">
        {sorted.map((sub) => (
          <CategoryCard key={sub.id} category={sub} href={`/${parentSlug}/${sub.slug}`} />
        ))}
      </div>
    </div>
  );
}

