import type { Metadata } from "next";
import { getProducts } from "@/services/products.service";
import { getAllCategories } from "@/lib/woocommerce/categories";
import type { WooProduct } from "@/types/product";
import { ProductsShell } from "@/components/product/products-shell";
import { PageHeader } from "@/components/sections/page-header";

const COLLECTION_PILLS = [
  { label: "Women", href: "/product-category/women" },
  { label: "Ethnic Wear", href: "/product-category/women/ethnic-wear" },
  { label: "Tawakkal Wada", href: "/product-category/women/ethnic-wear/tawakkal-wada" },
  { label: "Güzel", href: "/product-category/women/ethnic-wear/guzel" },
  { label: "Aiman Aisha", href: "/product-category/women/ethnic-wear/aiman-aisha" },
  { label: "Safa-Marwa", href: "/product-category/women/ethnic-wear/safa-marwa" },
  { label: "Sale", href: "/sale" },
];

export const metadata: Metadata = {
  title: {
    absolute: "Women's Dresses & Premium Three-Piece Suits Online | ANGKON",
  },
  description:
    "Browse ANGKON's curated collection of women's dresses and luxury 3-piece embroidered suits. Handcrafted fabrics, modern heritage aesthetics, and fast doorstep delivery across Bangladesh.",
  alternates: {
    canonical: "/products",
  },
};

// Cached and refreshed every 5 minutes instead of rendering on every request.
export const revalidate = 300;

/** The listing only needs card fields; drop the heavy ones before sending to the browser. */
function toListProduct(p: WooProduct): WooProduct {
  return { ...p, description: "", images: p.images.slice(0, 2) };
}

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([
    getProducts({ perPage: 100 }),
    getAllCategories(),
  ]);

  return (
    <div className="container mx-auto max-w-[1500px] space-y-8 px-4 py-8 lg:px-8">
      <PageHeader
        eyebrow="Shop"
        title="All products"
        description="Everything in the ANGKON collection — filter by category, price and availability."
        meta={`${products.length} products`}
        pills={COLLECTION_PILLS}
      />
      <ProductsShell products={products.map(toListProduct)} categories={categories} />
    </div>
  );
}
