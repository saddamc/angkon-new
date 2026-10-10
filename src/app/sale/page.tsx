import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import REAL_PRODUCTS from "@/data/real-products.json";
import { ProductCard } from "@/components/product/product-card";
import type { WooProduct } from "@/types/product";
import { Flame, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "On Sale — Limited Time Markdowns | ANGKON",
  description: "Special promotional discounts and clearance prices across ANGKON heritage collections.",
};

export const dynamic = "force-dynamic";

export default function SalePage() {
  const allProducts = REAL_PRODUCTS as unknown as WooProduct[];
  const saleProducts = allProducts.filter(
    (p) => p.on_sale || (p.regular_price && parseFloat(p.regular_price) > parseFloat(p.price))
  );

  return (
    <div className="min-h-screen bg-[#400604] text-[#E1B76F]">
      {/* On Sale Top Graphic Header matching Gorur Ghash */}
      <div className="relative w-full aspect-[1980/600] max-h-[380px] overflow-hidden bg-[#2b0403] border-b border-[#5c0f0d]">
        <Image
          src="/banners/sale-web-header.png"
          alt="ON SALE Promotional Markdowns"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#400604] via-transparent to-black/20" />
      </div>

      {/* Sale Info Bar */}
      <div className="border-b border-[#5c0f0d] bg-[#2b0403] py-6 px-4">
        <div className="container mx-auto max-w-[1500px] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E1B76F] text-[#400604]">
              <Flame className="h-5 w-5 fill-[#400604]" />
            </span>
            <div>
              <h1 className="font-heading text-xl sm:text-2xl font-black uppercase text-[#E1B76F]">
                Active Promotional Markdowns
              </h1>
              <p className="text-xs text-[#cbb18a]">
                Original heritage garments at clearance prices • Cash on Delivery nationwide
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="rounded-full border border-[#E1B76F]/40 bg-[#400604] px-3.5 py-1 text-[#f5ebd8]">
              {saleProducts.length} Items on Sale
            </span>
            <Link
              href="/products"
              className="text-[#E1B76F] underline underline-offset-4 hover:text-white"
            >
              Browse Full Catalog &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto max-w-[1500px] px-4 py-10 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {saleProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
