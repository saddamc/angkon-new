import type { Metadata } from "next";
import Link from "next/link";
import REAL_PRODUCTS from "@/data/real-products.json";
import { ProductCard } from "@/components/product/product-card";
import type { WooProduct } from "@/types/product";

export const metadata: Metadata = {
  title: "Mighto Women — Studio & Athleisure | ANGKON",
  description: "Sculpt yoga pants, active studio layers, ribbed crops, and motion bottoms for women.",
};

export default function MightoWomenPage() {
  const allProducts = REAL_PRODUCTS as unknown as WooProduct[];
  const womenProducts = allProducts.filter((p) => {
    const text = (p.name + " " + (p.description || "")).toLowerCase();
    const isWomen = text.includes("women") || text.includes("girl") || text.includes("female") || text.includes("yoga") || text.includes("sculpt") || text.includes("pant");
    return isWomen;
  }).slice(0, 24);

  return (
    <div className="min-h-screen bg-[#400604] text-[#E1B76F]">
      <div className="border-b border-[#E1B76F]/20 bg-[#340402] py-10 px-4 text-center">
        <div className="container mx-auto max-w-[1000px]">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#E1B76F]/70">
            Mighto Activewear
          </span>
          <h1 className="mt-2 font-heading text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-[#E1B76F]">
            Mighto Women
          </h1>
          <p className="mt-2.5 text-xs sm:text-sm text-[#f0d29d] max-w-xl mx-auto">
            Form-fitting sculpt yoga pants, buttery-soft ribbed training tanks, and functional studio layers.
          </p>
        </div>
      </div>

      <div className="w-full px-2 sm:px-3 md:px-4 lg:px-6 py-8 sm:py-10">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-xs sm:text-sm text-[#E1B76F]/70">
            Showing <strong className="text-[#E1B76F]">{womenProducts.length}</strong> styles
          </span>
          <Link
            href="/mighto"
            className="text-xs font-bold text-[#E1B76F] underline underline-offset-4 hover:text-white transition"
          >
            &larr; Back to Mighto Home
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 md:gap-x-5 gap-y-8 sm:gap-y-10 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8">
          {womenProducts.map((product, index) => (
            <ProductCard key={product.id} product={product} eager={index < 4} />
          ))}
        </div>
      </div>
    </div>
  );
}
