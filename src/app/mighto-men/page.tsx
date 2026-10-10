import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import REAL_PRODUCTS from "@/data/real-products.json";
import { ProductCard } from "@/components/product/product-card";
import type { WooProduct } from "@/types/product";

export const metadata: Metadata = {
  title: "Mighto Men — Performance Activewear | ANGKON",
  description: "Men's gym apparel, compression tees, breathable shorts, and training joggers.",
};

export default function MightoMenPage() {
  const allProducts = REAL_PRODUCTS as unknown as WooProduct[];
  const menProducts = allProducts.filter((p) => {
    const text = (p.name + " " + (p.description || "")).toLowerCase();
    const isMen = text.includes("men") || text.includes("boy") || text.includes("male");
    const isWomenOnly = text.includes("women") && !text.includes("men");
    return (isMen || !isWomenOnly) && (
      text.includes("pant") ||
      text.includes("tee") ||
      text.includes("shirt") ||
      text.includes("hoodie") ||
      text.includes("jogger")
    );
  }).slice(0, 24);

  return (
    <div className="min-h-screen bg-[#400604] text-[#E1B76F]">
      <div className="border-b border-[#5c0f0d] bg-[#2b0403] py-10 px-4 text-center">
        <div className="container mx-auto max-w-[1000px]">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#cbb18a]">
            Mighto Division
          </span>
          <h1 className="mt-2 font-heading text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#E1B76F]">
            Mighto Men
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-[#f5ebd8] max-w-xl mx-auto">
            High-tensile cotton, stretch utility pants, breathable drop-shoulder tees engineered for physical performance.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-[1500px] px-4 py-10 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-xs sm:text-sm text-[#cbb18a]">
            Showing <strong className="text-[#E1B76F]">{menProducts.length}</strong> styles
          </span>
          <Link
            href="/mighto"
            className="text-xs font-bold text-[#E1B76F] underline underline-offset-4 hover:text-white"
          >
            &larr; Back to Mighto Home
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {menProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
