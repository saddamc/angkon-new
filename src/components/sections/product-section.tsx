"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { WooProduct } from "@/types/product";
import { ProductCard } from "@/components/product/product-card";

export function ProductSection({
  title,
  subtitle,
  products,
  href,
}: {
  title: string;
  subtitle?: string;
  products: WooProduct[];
  href?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const showSkeleton = products.length === 0;

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
  }, [products.length, showSkeleton]);

  const scrollByAmount = (direction: "left" | "right") => {
    if (!scrollerRef.current) return;
    const amount = Math.min(scrollerRef.current.clientWidth * 0.85, 980);
    scrollerRef.current.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section className="bg-transparent py-6">
      <div className="container mx-auto px-4 lg:px-8 max-w-[1500px]">
        {/* Main Category Highlight Title (Optional) */}
        {subtitle && (
          <div className="text-center mb-8">
            <h2 className="font-heading text-2xl font-bold uppercase text-white flex items-center justify-center gap-4">
              <span className="h-[2px] w-12 bg-[#5c0f0d] hidden sm:block"></span>
              {title}
              <span className="h-[2px] w-12 bg-[#5c0f0d] hidden sm:block"></span>
            </h2>
            <p className="text-[13px] text-white/70 mt-2">{subtitle}</p>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          {!subtitle ? (
            <h2 className="font-heading text-[17px] font-bold uppercase text-white">
              {title}
            </h2>
          ) : (
            <h3 className="font-heading text-[15px] font-bold uppercase text-white">{title}</h3>
          )}
          {href && (
            <Link
              href={href}
              className="text-[13px] font-semibold text-white hover:text-[#f3cb87] transition flex items-center gap-1"
            >
              See More →
            </Link>
          )}
        </div>

        <div className="relative group/scroller">
          <div
            ref={scrollerRef}
            className="-mx-2 flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {showSkeleton
              ? Array.from({ length: 10 }).map((_, index) => (
                  <div key={index} className="min-w-[220px] max-w-[220px] snap-start bg-[#4a0705] border border-[#5c0f0d] rounded-2xl p-4">
                    <div className="relative mb-3 aspect-[3/4] overflow-hidden bg-[#2b0403] rounded-xl animate-pulse"></div>
                  </div>
                ))
              : products.map((product, index) => (
                  <div key={product.id} className="snap-start min-w-[220px] max-w-[220px] shrink-0">
                    <ProductCard product={product} eager={index < 4} />
                  </div>
                ))}
          </div>

          {/* Navigation buttons overlay */}
          <div className="absolute inset-y-0 -left-5 flex items-center">
            <button
              type="button"
              onClick={() => scrollByAmount("left")}
              disabled={!canScrollLeft}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-[#2b0403] text-white shadow-lg border border-[#5c0f0d] hover:bg-[#4a0705] hover:text-[#f3cb87] transition disabled:opacity-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>
          <div className="absolute inset-y-0 -right-5 flex items-center">
            <button
              type="button"
              onClick={() => scrollByAmount("right")}
              disabled={!canScrollRight}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-[#2b0403] text-white shadow-lg border border-[#5c0f0d] hover:bg-[#4a0705] hover:text-[#f3cb87] transition disabled:opacity-0"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
