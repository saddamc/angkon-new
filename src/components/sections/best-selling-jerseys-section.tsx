"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { WooProduct } from "@/types/product";
import { ProductCard } from "@/components/product/product-card";

const CARD_COUNT = 15;

function SpeciallyForYouSkeleton() {
  return (
    <div className="bg-[#4a0705] border border-[#5c0f0d] rounded-[12px] p-4">
      <div className="relative mb-3 aspect-[3/4] overflow-hidden rounded-[8px] bg-[#2b0403]">
        <div className="absolute inset-y-0 -left-1/2 w-1/2 animate-[shimmer_1.6s_linear_infinite] bg-gradient-to-r from-transparent via-[#E1B76F]/20 to-transparent" />
      </div>
      <div className="relative mb-2 h-4 overflow-hidden rounded-sm bg-[#2b0403]">
        <div className="absolute inset-y-0 -left-1/2 w-1/2 animate-[shimmer_1.6s_linear_infinite] bg-gradient-to-r from-transparent via-[#E1B76F]/20 to-transparent" />
      </div>
      <div className="relative h-4 w-16 overflow-hidden rounded-sm bg-[#2b0403]">
        <div className="absolute inset-y-0 -left-1/2 w-1/2 animate-[shimmer_1.6s_linear_infinite] bg-gradient-to-r from-transparent via-[#E1B76F]/20 to-transparent" />
      </div>
    </div>
  );
}

export function SpeciallyForYouSection({
  products,
  isLoading = false,
}: {
  products: WooProduct[];
  isLoading?: boolean;
}) {
  const cards = products.slice(0, CARD_COUNT);
  const showSkeleton = isLoading || cards.length === 0;

  return (
    <section className="bg-[#400604] py-12">
      <div className="container mx-auto px-4 lg:px-8 max-w-[1400px]">
        {/* Section Header */}
        <div className="mb-8 flex items-end justify-between border-b border-[#5c0f0d] pb-4">
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-white/70">
              CURATED COLLECTION <span className="text-white">●</span>
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-white">
              Trending Heritage Apparel
            </h2>
          </div>
          <Link
            href="/products"
            className="flex items-center gap-1.5 rounded-[12px] border border-[#E1B76F] px-4 py-2 text-[12px] font-bold uppercase tracking-wider text-white transition hover:bg-[#E1B76F] hover:text-[#400604]"
          >
            All Products <ArrowRight className="h-3.5 w-3.5 text-white" />
          </Link>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {showSkeleton
            ? Array.from({ length: 10 }).map((_, index) => (
                <SpeciallyForYouSkeleton key={`specially-skeleton-${index}`} />
              ))
            : cards.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
        </div>
      </div>
    </section>
  );
}