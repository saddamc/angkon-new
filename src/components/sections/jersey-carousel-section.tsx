"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { WooProduct } from "@/types/product";
import { ProductCard } from "@/components/product/product-card";

function SkeletonCard() {
  return (
    <div className="min-w-[200px] max-w-[200px] snap-start bg-white border border-gray-100 rounded-md p-4">
      <div className="relative mb-3 aspect-square overflow-hidden bg-[#eef2f7]">
        <div className="absolute inset-y-0 -left-1/2 w-1/2 animate-[shimmer_1.6s_linear_infinite] bg-gradient-to-r from-transparent via-white/85 to-transparent" />
      </div>
      <div className="relative mb-2 h-4 overflow-hidden rounded-sm bg-[#eef2f7]">
        <div className="absolute inset-y-0 -left-1/2 w-1/2 animate-[shimmer_1.6s_linear_infinite] bg-gradient-to-r from-transparent via-white/85 to-transparent" />
      </div>
      <div className="relative h-4 w-16 overflow-hidden rounded-sm bg-[#eef2f7]">
        <div className="absolute inset-y-0 -left-1/2 w-1/2 animate-[shimmer_1.6s_linear_infinite] bg-gradient-to-r from-transparent via-white/85 to-transparent" />
      </div>
    </div>
  );
}

export function JerseyCarouselSection({ products, isLoading = false }: { products: WooProduct[]; isLoading?: boolean }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const visibleProducts = products.slice(0, 10);
  const showSkeleton = isLoading || visibleProducts.length === 0;

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const updateButtonState = () => {
      const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
      const currentScroll = scroller.scrollLeft;

      setCanScrollLeft(currentScroll > 2);
      setCanScrollRight(currentScroll < maxScrollLeft - 2);
    };

    updateButtonState();
    scroller.addEventListener("scroll", updateButtonState, { passive: true });
    window.addEventListener("resize", updateButtonState);

    return () => {
      scroller.removeEventListener("scroll", updateButtonState);
      window.removeEventListener("resize", updateButtonState);
    };
  }, [visibleProducts.length, showSkeleton]);

  const scrollByAmount = (direction: "left" | "right") => {
    if (!scrollerRef.current) return;
    const amount = Math.min(scrollerRef.current.clientWidth * 0.85, 980);
    scrollerRef.current.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section className="bg-white py-6">
      <div className="container mx-auto px-4 lg:px-8 max-w-[1500px]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-gray-800 flex items-center gap-2">
            <span className="text-orange-500 font-bold">⚡ Flash Sale</span>
          </h2>
          <Link
            href="/products"
            className="text-[13px] font-medium text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
          >
            See More →
          </Link>
        </div>

        <div className="relative group/scroller">
          <div
            ref={scrollerRef}
            className="-mx-2 flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {showSkeleton
              ? Array.from({ length: 10 }).map((_, index) => <SkeletonCard key={`jersey-skeleton-${index}`} />)
              : visibleProducts.map((product) => (
                  <div key={product.id} className="snap-start min-w-[220px] max-w-[220px] shrink-0">
                    <ProductCard product={product} />
                  </div>
                ))}
          </div>

          {/* Navigation buttons overlay */}
          <div className="absolute inset-y-0 -left-5 flex items-center">
            <button
              type="button"
              onClick={() => scrollByAmount("left")}
              disabled={!canScrollLeft}
              className="h-10 w-10 flex items-center justify-center rounded-md bg-white text-gray-700 shadow-md border border-gray-200 hover:bg-gray-50 hover:text-blue-600 transition disabled:opacity-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>
          <div className="absolute inset-y-0 -right-5 flex items-center">
            <button
              type="button"
              onClick={() => scrollByAmount("right")}
              disabled={!canScrollRight}
              className="h-10 w-10 flex items-center justify-center rounded-md bg-white text-gray-700 shadow-md border border-gray-200 hover:bg-gray-50 hover:text-blue-600 transition disabled:opacity-0"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
