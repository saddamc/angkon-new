import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryTree, findCategoryPath } from "@/lib/woocommerce/categories";
import { getProductsByCategorySlug } from "@/lib/woocommerce/products";
import { CategoryBreadcrumb } from "@/components/categories/CategoryBreadcrumb";
import { CategoryHero } from "@/components/categories/CategoryHero";
import { SubcategoryNavigation } from "@/components/categories/SubcategoryNavigation";
import { CategoryGrid } from "@/components/categories/CategoryGrid";
import { categoryDisplayName } from "@/utils/category-display";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseSort(sort: string): { orderby: "date" | "price" | "title"; order: "asc" | "desc" } {
  const [orderby, order] = sort.split("-");
  const validOrderby = ["date", "price", "title"].includes(orderby) ? (orderby as "date" | "price" | "title") : "date";
  const validOrder = order === "asc" ? "asc" : "desc";
  return { orderby: validOrderby, order: validOrder };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!slug || slug.length === 0) return {};

  const currentSlug = slug[slug.length - 1];
  const tree = await getCategoryTree();
  const path = findCategoryPath(tree, currentSlug);
  if (!path) return { title: "Category not found" };

  const node = path[path.length - 1];
  const name = categoryDisplayName(node.name);
  return {
    title: `${name} | ANGKON`,
    description: node.description || `Shop ${name} at ANGKON.`,
    ...(node.image?.src ? { openGraph: { images: [node.image.src] } } : {}),
  };
}

export default async function ProductCategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  if (!slug || slug.length === 0) notFound();

  const currentSlug = slug[slug.length - 1];
  const parentSlug = slug[0];
  const sp = await searchParams;

  const tree = await getCategoryTree();
  const path = findCategoryPath(tree, currentSlug);
  if (!path) notFound();

  const node = path[path.length - 1];
  const page = Number(sp.page) > 0 ? Number(sp.page) : 1;
  const sort = typeof sp.sort === "string" ? sp.sort : "date-desc";
  const { orderby, order } = parseSort(sort);

  const { products, total, totalPages } = await getProductsByCategorySlug(currentSlug, {
    page,
    perPage: 24,
    orderby,
    order,
  });

  const hasSubcategories = node.children.length > 0;
  const showSubcategories = hasSubcategories && page === 1;
  const currentPathString = `/product-category/${slug.join("/")}`;

  return (
    <div className="min-h-screen bg-white text-[#333333]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-5 lg:px-6 pt-4 sm:pt-6 pb-12">
        <div className="mb-2 sm:mb-2.5">
          <CategoryBreadcrumb path={path} basePrefix="/product-category" />
        </div>
        <div className="mb-5 sm:mb-6">
          <CategoryHero category={node} productCount={total} />
        </div>
        {showSubcategories ? (
          <SubcategoryNavigation
            subcategories={node.children}
            parentSlug={currentSlug}
            basePrefix="/product-category"
          />
        ) : (
          <CategoryGrid
            products={products}
            total={total}
            page={page}
            totalPages={totalPages}
            sort={sort}
            baseHref={currentPathString}
          />
        )}
      </div>
    </div>
  );
}
