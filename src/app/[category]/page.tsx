import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryTree, findCategoryPath } from "@/lib/woocommerce/categories";
import { getProductsByCategorySlug } from "@/lib/woocommerce/products";
import { CategoryBreadcrumb } from "@/components/categories/CategoryBreadcrumb";
import { CategoryHero } from "@/components/categories/CategoryHero";
import { SubcategoryNavigation } from "@/components/categories/SubcategoryNavigation";
import { CategoryGrid } from "@/components/categories/CategoryGrid";
import { categoryDisplayName } from "@/utils/category-display";

const RESERVED_SLUGS = new Set([
  "products",
  "cart",
  "checkout",
  "search",
  "admin",
  "api",
  "category",
  "about",
  "contact",
  "shipping",
  "returns",
  "terms",
  "privacy",
  "sale",
  "policies",
]);

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseSort(sort: string): { orderby: "date" | "price" | "title"; order: "asc" | "desc" } {
  const [orderby, order] = sort.split("-");
  const validOrderby = ["date", "price", "title"].includes(orderby) ? (orderby as "date" | "price" | "title") : "date";
  const validOrder = order === "asc" ? "asc" : "desc";
  return { orderby: validOrderby, order: validOrder };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  if (RESERVED_SLUGS.has(slug)) return {};

  const tree = await getCategoryTree();
  const path = findCategoryPath(tree, slug);
  if (!path) return { title: "Category not found" };

  const node = path[path.length - 1];
  const name = categoryDisplayName(node.name);
  return {
    title: `${name} | ANGKON`,
    description: node.description || `Shop ${name} at ANGKON.`,
    ...(node.image?.src ? { openGraph: { images: [node.image.src] } } : {}),
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category: slug } = await params;
  if (RESERVED_SLUGS.has(slug)) notFound();

  const sp = await searchParams;
  const tree = await getCategoryTree();
  const path = findCategoryPath(tree, slug);
  if (!path) notFound();

  const node = path[path.length - 1];
  const page = Number(sp.page) > 0 ? Number(sp.page) : 1;
  const sort = typeof sp.sort === "string" ? sp.sort : "date-desc";
  const { orderby, order } = parseSort(sort);

  const { products, total, totalPages } = await getProductsByCategorySlug(slug, {
    page,
    perPage: 24,
    orderby,
    order,
  });

  return (
    <div className="container mx-auto max-w-[1500px] space-y-6 px-4 py-8 lg:px-8">
      <CategoryBreadcrumb path={path} />
      <CategoryHero category={node} productCount={total} />
      {node.children.length > 0 && (
        <SubcategoryNavigation subcategories={node.children} parentSlug={slug} />
      )}
      <CategoryGrid
        products={products}
        total={total}
        page={page}
        totalPages={totalPages}
        sort={sort}
        baseHref={`/${slug}`}
      />
    </div>
  );
}
