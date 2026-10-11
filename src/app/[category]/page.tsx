import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCategoryTree, findCategoryPath } from "@/lib/woocommerce/categories";

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  if (RESERVED_SLUGS.has(slug)) return {};

  const tree = await getCategoryTree();
  const path = findCategoryPath(tree, slug);
  if (!path) return { title: "Category not found" };

  const node = path[path.length - 1];
  return {
    title: `${node.name} | ANGKON`,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category: slug } = await params;
  if (RESERVED_SLUGS.has(slug)) notFound();

  const tree = await getCategoryTree();
  const path = findCategoryPath(tree, slug);
  if (!path) notFound();

  const sp = await searchParams;
  const qParams = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") qParams.set(key, value);
    else if (Array.isArray(value)) value.forEach((v) => qParams.append(key, v));
  }
  const queryString = qParams.toString() ? `?${qParams.toString()}` : "";

  // Canonical hierarchical path under /product-category/ (e.g. /polos -> /product-category/men/polos)
  const canonicalPath = `/product-category/${path.map((node) => node.slug).join("/")}${queryString}`;
  redirect(canonicalPath);
}
