"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { WooProduct } from "@/types/product";
import { ProductCard } from "@/components/product/product-card";

const CARD_COUNT = 10;

function NewArrivalSkeletonCard() {
  return (
    <div className="min-w-[240px] max-w-[240px] snap-start bg-[#4a0705] border border-[#5c0f0d] rounded-[12px] p-4">
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

export function NewArrivalsSection({
  products,
  isLoading = false,
}: {
  products: WooProduct[];
  isLoading?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const visibleProducts = products.slice(0, CARD_COUNT);
  const showSkeleton = isLoading || visibleProducts.length === 0;

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const update = () => {
      const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
      setCanScrollLeft(scroller.scrollLeft > 2);
      setCanScrollRight(scroller.scrollLeft < maxScrollLeft - 2);
    };

    update();
    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      scroller.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [visibleProducts.length, showSkeleton]);

  const scrollByAmount = (direction: "left" | "right") => {
    if (!scrollerRef.current) return;
    const amount = Math.min(scrollerRef.current.clientWidth * 0.85, 980);
    scrollerRef.current.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section className="bg-[#400604] py-12">
      <div className="container mx-auto px-4 lg:px-8 max-w-[1400px]">
        {/* Header (Section header style) */}
        <div className="mb-8 flex items-end justify-between border-b border-[#5c0f0d] pb-4">
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-[#cbb18a]">
              FRESH RELEASE <span className="text-[#E1B76F]">●</span>
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-[#E1B76F]">
              New Drops
            </h2>
          </div>
          <Link
            href="/products"
            className="flex items-center gap-1.5 rounded-[12px] border border-[#E1B76F] px-4 py-2 text-[12px] font-bold uppercase tracking-wider text-[#E1B76F] transition hover:bg-[#E1B76F] hover:text-[#400604]"
          >
            View All <ArrowRight className="h-3.5 w-3.5 text-[#E1B76F]" />
          </Link>
        </div>

        {/* Carousel */}
        <div className="relative group/scroller">
          <div
            ref={scrollerRef}
            className="-mx-2 flex snap-x snap-mandatory gap-5 overflow-x-auto px-2 pb-4 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {showSkeleton
              ? Array.from({ length: CARD_COUNT }).map((_, i) => (
                  <NewArrivalSkeletonCard key={`new-arrival-skeleton-${i}`} />
                ))
              : visibleProducts.map((product) => (
                  <div key={product.id} className="snap-start min-w-[240px] max-w-[240px] sm:min-w-[260px] sm:max-w-[260px] shrink-0">
                    <ProductCard product={product} />
                  </div>
                ))}
          </div>

          {/* Navigation buttons */}
          <div className="absolute inset-y-0 -left-4 flex items-center">
            <button
              type="button"
              onClick={() => scrollByAmount("left")}
              disabled={!canScrollLeft}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-[#2b0403] text-[#E1B76F] shadow-lg border border-[#5c0f0d] hover:bg-[#E1B76F] hover:text-[#400604] transition disabled:opacity-0"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>
          <div className="absolute inset-y-0 -right-4 flex items-center">
            <button
              type="button"
              onClick={() => scrollByAmount("right")}
              disabled={!canScrollRight}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-[#2b0403] text-[#E1B76F] shadow-lg border border-[#5c0f0d] hover:bg-[#E1B76F] hover:text-[#400604] transition disabled:opacity-0"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
