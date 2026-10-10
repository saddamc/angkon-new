import type { CategoryNode } from "@/types/woocommerce";
import { categoryDisplayName, decodeHtmlCharCodes } from "@/utils/category-display";
import { PageHeader } from "@/components/sections/page-header";

export function CategoryHero({
  category,
  productCount,
}: {
  category: CategoryNode;
  productCount: number;
}) {
  const description = decodeHtmlCharCodes(category.description);

  return (
    <PageHeader
      eyebrow="Collection"
      title={categoryDisplayName(category.name)}
      descriptionHtml={description || undefined}
      meta={`${productCount} ${productCount === 1 ? "product" : "products"}`}
    />
  );
}
