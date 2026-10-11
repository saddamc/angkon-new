import type { Metadata } from "next";
import { getProducts } from "@/services/products.service";
import { getAllCategories } from "@/lib/woocommerce/categories";
import type { WooProduct } from "@/types/product";
import { ProductsShell } from "@/components/product/products-shell";
import { PageHeader } from "@/components/sections/page-header";

const COLLECTION_PILLS = [
  { label: "Men", href: "/product-category/men" },
  { label: "Women", href: "/product-category/women" },
  { label: "Pants", href: "/pants" },
  { label: "Tees", href: "/t-shirt" },
  { label: "Polos", href: "/polos" },
  { label: "Accessories", href: "/accessories" },
  { label: "Sale", href: "/sale" },
];

export const metadata: Metadata = {
  title: "All Products — ANGKON",
  description: "Browse the full ANGKON collection.",
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
