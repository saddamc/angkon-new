import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCategoryTree, findCategoryPath, findCategoryPathBySlugs } from "@/lib/woocommerce/categories";
import { getProductsByCategorySlug } from "@/lib/woocommerce/products";
import { CategoryBreadcrumb } from "@/components/categories/CategoryBreadcrumb";
import { CategoryHero } from "@/components/categories/CategoryHero";
import { SubcategoryNavigation } from "@/components/categories/SubcategoryNavigation";
import { CategoryGrid } from "@/components/categories/CategoryGrid";
import { CategorySidebar } from "@/components/categories/CategorySidebar";
import { categoryDisplayName } from "@/utils/category-display";

export const revalidate = 300; // 5-minute ISR cache at the edge for instant loads

export async function generateStaticParams() {
  try {
    const tree = await getCategoryTree();
    const paths: { slug: string[] }[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function collectPaths(nodes: any[], parentSlugs: string[] = []) {
      for (const node of nodes) {
        const current = [...parentSlugs, node.slug];
        paths.push({ slug: current });
        if (Array.isArray(node.children) && node.children.length > 0) {
          collectPaths(node.children, current);
        }
      }
    }

    collectPaths(tree);
    return paths;
  } catch (err) {
    console.warn("generateStaticParams failed:", err);
    return [];
  }
}

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

const SLUG_ALIASES: Record<string, string> = {
  ethnic: "ethnic-wear",
  cubans: "half-sleeves",
  "oversized-full-sleeves": "full-sleeves",
  "t-shirts-men": "tees",
  "men-pants": "pants",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!slug || slug.length === 0) return {};

  const currentSlug = slug[slug.length - 1];
  const lookupSlug = SLUG_ALIASES[currentSlug] || currentSlug;
  const tree = await getCategoryTree();
  const mappedSlugs = slug.map((s) => SLUG_ALIASES[s] || s);
  const path = findCategoryPathBySlugs(tree, mappedSlugs) || findCategoryPath(tree, lookupSlug);
  if (!path) return { title: "Category not found" };

  const node = path[path.length - 1];
  const name = categoryDisplayName(node.name);
  const canonicalPathSegments = path.map((n) => n.slug).join("/");

  // Targeted commercial intent titles and descriptions for Bangladesh market
  let seoTitle = `${name} | ANGKON`;
  let seoDescription =
    node.description ||
    `Shop authentic ${name} at ANGKON. Premium ethnic fashion in Bangladesh with Cash on Delivery across all 64 districts.`;

  const normalizedSlug = node.slug.toLowerCase();
  if (normalizedSlug === "ethnic-wear" || lookupSlug === "ethnic-wear") {
    seoTitle = "Three-Piece Dresses & Luxury Embroidered Suits for Women | ANGKON BD";
    seoDescription =
      "Shop designer three-piece dresses and luxury embroidered suits for women in Bangladesh. Curated collections with Cash on Delivery across all 64 districts.";
  } else if (normalizedSlug === "women") {
    seoTitle = "Women's Ethnic Wear & Designer Outfits in Bangladesh | ANGKON";
    seoDescription =
      "Explore premium women's clothing at ANGKON. From exquisite embroidered three-piece ensembles to luxury festive attire, discover sophisticated fashion crafted for every occasion.";
  } else if (normalizedSlug === "men") {
    seoTitle = "Men's Ethnic Wear & Modern Heritage Attire in Bangladesh | ANGKON";
    seoDescription =
      "Shop contemporary ethnic wear for men in Bangladesh. Premium fabrics, precision tailoring, and heritage styles designed for sophistication.";
  } else if (normalizedSlug === "accessories") {
    seoTitle = "Women's & Men's Fashion Accessories in Bangladesh | ANGKON";
    seoDescription =
      "Complete your look with handcrafted luxury accessories at ANGKON. Premium caps, jewelry, and fashion essentials delivered nationwide.";
  } else if (normalizedSlug.includes("tawakkal")) {
    seoTitle = "Tawakkal Wada Collection — Luxury 3-Piece Embroidered Suits | ANGKON";
    seoDescription =
      "Shop the authentic Tawakkal Wada 3-piece collection in Bangladesh. Features premium embroidered long kameez, printed trousers, and coordinated gradient dupattas at BDT 7,990.";
  } else if (normalizedSlug.includes("guzel") || normalizedSlug.includes("dastaan")) {
    seoTitle = "Güzel Dastaan Designer Embroidered Suits | ANGKON";
    seoDescription =
      "Discover the Güzel Dastaan collection at ANGKON: luxury embroidered 3-piece suits featuring intricate zari needlework, pearl embellishments, and designer borders.";
  } else if (normalizedSlug.includes("aiman")) {
    seoTitle = "Aiman Aisha Festive Embroidered Suits & Gararas | ANGKON";
    seoDescription =
      "Shop Aiman Aisha luxury festive collections at ANGKON. Exquisite pastel floral embroidery, pearl detailing, and statement garara silhouettes with nationwide COD.";
  } else if (normalizedSlug.includes("safa")) {
    seoTitle = "Safa-Marwa Luxury Embroidered 3-Piece Suits | ANGKON";
    seoDescription =
      "Explore Safa-Marwa designer 3-piece suits at ANGKON. Striking contrast floral embroidery and delicate lace details tailored for festive celebrations.";
  }

  return {
    title: {
      absolute: seoTitle,
    },
    description: seoDescription,
    alternates: {
      canonical: `/product-category/${canonicalPathSegments}`,
    },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      url: `/product-category/${canonicalPathSegments}`,
      ...(node.image?.src ? { images: [node.image.src] } : {}),
    },
  };
}

export default async function ProductCategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  if (!slug || slug.length === 0) notFound();

  const currentSlug = slug[slug.length - 1];
  const sp = await searchParams;

  const tree = await getCategoryTree();
  const lookupSlug = SLUG_ALIASES[currentSlug] || currentSlug;
  const mappedSlugs = slug.map((s) => SLUG_ALIASES[s] || s);
  const path = findCategoryPathBySlugs(tree, mappedSlugs) || findCategoryPath(tree, lookupSlug);
  if (!path) notFound();

  // If accessed via a legacy or partial slug path, redirect to canonical
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

  const { products, total, totalPages } = await getProductsByCategorySlug(node.slug, {
    page,
    perPage: 24,
    orderby,
    order,
  });

  const hasSubcategories = node.children.length > 0;
  const showSubcategories = hasSubcategories && page === 1;
  const currentPathString = `/product-category/${slug.join("/")}`;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.angkon.net",
      },
      ...path.map((item, idx) => ({
        "@type": "ListItem",
        position: idx + 2,
        name: categoryDisplayName(item.name),
        item: `https://www.angkon.net/product-category/${path.slice(0, idx + 1).map((p) => p.slug).join("/")}`,
      })),
    ],
  };

  return (
    <div className="min-h-screen bg-[#400604] text-white">
      {/* Category Breadcrumb Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
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
