import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCategoryTree, findCategoryPath } from "@/lib/woocommerce/categories";
import { getProductsByCategorySlug } from "@/lib/woocommerce/products";
import { CategoryBreadcrumb } from "@/components/categories/CategoryBreadcrumb";
import { CategoryHero } from "@/components/categories/CategoryHero";
import { SubcategoryNavigation } from "@/components/categories/SubcategoryNavigation";
import { CategoryGrid } from "@/components/categories/CategoryGrid";
import { categoryDisplayName } from "@/utils/category-display";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ category: string; subcategory: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseSort(sort: string): { orderby: "date" | "price" | "title"; order: "asc" | "desc" } {
  const [orderby, order] = sort.split("-");
  const validOrderby = ["date", "price", "title"].includes(orderby) ? (orderby as "date" | "price" | "title") : "date";
  const validOrder = order === "asc" ? "asc" : "desc";
  return { orderby: validOrderby, order: validOrder };
}

async function resolvePath(category: string, subcategory: string) {
  const tree = await getCategoryTree();
  const path = findCategoryPath(tree, subcategory);
  if (!path || path.length < 2) return null;

  const resolvedParentSlug = path[path.length - 2].slug;
  if (resolvedParentSlug !== category) {
    redirect(`/${resolvedParentSlug}/${subcategory}`);
  }
  return path;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, subcategory } = await params;
  const path = await resolvePath(category, subcategory);
  if (!path) return { title: "Category not found" };

  const node = path[path.length - 1];
  const name = categoryDisplayName(node.name);
  return {
    title: `${name} | ANGKON`,
    description: node.description || `Shop ${name} at ANGKON.`,
    ...(node.image?.src ? { openGraph: { images: [node.image.src] } } : {}),
  };
}

export default async function SubcategoryPage({ params, searchParams }: Props) {
  const { category, subcategory } = await params;
  const path = await resolvePath(category, subcategory);
  if (!path) notFound();

  const sp = await searchParams;
  const node = path[path.length - 1];
  const page = Number(sp.page) > 0 ? Number(sp.page) : 1;
  const sort = typeof sp.sort === "string" ? sp.sort : "date-desc";
  const { orderby, order } = parseSort(sort);

  const { products, total, totalPages } = await getProductsByCategorySlug(subcategory, {
    page,
    perPage: 24,
    orderby,
    order,
  });

  const hasSubcategories = node.children.length > 0;
  const showSubcategories = hasSubcategories && page === 1;

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="container mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:py-8 lg:px-8">
        <CategoryBreadcrumb path={path} />
        <CategoryHero category={node} productCount={total} />
        {showSubcategories ? (
          <SubcategoryNavigation subcategories={node.children} parentSlug={`${category}/${subcategory}`} />
        ) : (
          <CategoryGrid
            products={products}
            total={total}
            page={page}
            totalPages={totalPages}
            sort={sort}
            baseHref={`/${category}/${subcategory}`}
          />
        )}
      </div>
    </div>
  );
}
