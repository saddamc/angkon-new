import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCategoryTree, findCategoryPath } from "@/lib/woocommerce/categories";
import { getProductsByCategorySlug } from "@/lib/woocommerce/products";
import { CategoryBreadcrumb } from "@/components/categories/CategoryBreadcrumb";
import { CategoryHero } from "@/components/categories/CategoryHero";
import { SubcategoryNavigation } from "@/components/categories/SubcategoryNavigation";
import { CategoryGrid } from "@/components/categories/CategoryGrid";
import { CategorySidebar } from "@/components/categories/CategorySidebar";
import { categoryDisplayName } from "@/utils/category-display";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseSort(sort: string): { orderby: "date" | "price" | "popularity" | "title"; order: "asc" | "desc" } {
  if (sort === "popularity") {
    return { orderby: "popularity", order: "desc" };
  }
  if (sort === "price-asc" || sort === "price") {
    return { orderby: "price", order: "asc" };
  }
  if (sort === "price-desc") {
    return { orderby: "price", order: "desc" };
  }
  return { orderby: "date", order: "desc" };
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

  // If accessed via a partial slug path (e.g. /product-category/polos instead of /product-category/men/polos), redirect to canonical
  const canonicalPathSegments = path.map((node) => node.slug).join("/");
  if (slug.join("/") !== canonicalPathSegments) {
    const qParams = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      if (typeof value === "string") qParams.set(key, value);
      else if (Array.isArray(value)) value.forEach((v) => qParams.append(key, v));
    }
    const queryString = qParams.toString() ? `?${qParams.toString()}` : "";
    redirect(`/product-category/${canonicalPathSegments}${queryString}`);
  }

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
    <div className="min-h-screen bg-[#400604] text-[#E1B76F]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-5 lg:px-6 pt-4 sm:pt-6 pb-12">
        <div className="lg:grid lg:grid-cols-[250px_1fr] xl:grid-cols-[270px_1fr] lg:gap-8 xl:gap-10">
          
          {/* Desktop Left Sidebar: Search + Recently Viewed Products */}
          <aside className="hidden lg:block border-r border-[#E1B76F]/20 pr-6 xl:pr-8">
            <CategorySidebar />
          </aside>

          {/* Main Category Content Area */}
          <main className="min-w-0">
            <div className="mb-2 sm:mb-2.5">
              <CategoryBreadcrumb path={path} basePrefix="/product-category" />
            </div>
            <div className="mb-5 sm:mb-6">
              <CategoryHero category={node} productCount={total} />
            </div>
            {showSubcategories && (
              <div className="mb-8 sm:mb-10">
                <SubcategoryNavigation
                  subcategories={node.children}
                  parentSlug={slug.join("/")}
                  basePrefix="/product-category"
                />
              </div>
            )}

            <CategoryGrid
              products={products}
              total={total}
              page={page}
              totalPages={totalPages}
              sort={sort}
              baseHref={currentPathString}
            />

            {/* Mobile / Small Screen: Sidebar placed UNDER Category */}
            <div className="lg:hidden mt-10 sm:mt-12 pt-8 sm:pt-10 border-t border-[#E1B76F]/20">
              <CategorySidebar isMobile />
            </div>
          </main>

        </div>
      </div>
    </div>
  );
}
