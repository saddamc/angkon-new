"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { FASHION_CATEGORIES } from "@/data/categories";
import { useEffect, useState, useRef } from "react";

interface LiveCategory {
  id: number;
  slug: string;
  name: string;
  count: number;
  image?: { src: string } | null;
}

export function HeroSection() {
  const [liveCategories, setLiveCategories] = useState<LiveCategory[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data: LiveCategory[]) => {
        if (Array.isArray(data)) setLiveCategories(data);
      })
      .catch(() => {});
  }, []);

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
  }, [liveCategories]);

  const scrollByAmount = (direction: "left" | "right") => {
    if (!scrollerRef.current) return;
    const scroller = scrollerRef.current;
    const amount = 300; // scroll amount

    if (direction === "left") {
      scroller.scrollTo({ left: scroller.scrollLeft - amount, behavior: "smooth" });
    } else {
      scroller.scrollTo({ left: scroller.scrollLeft + amount, behavior: "smooth" });
    }
  };

  // Merge static config (for curated images/icons) with live WooCommerce data
  const cards = FASHION_CATEGORIES.map((cat) => {
    const live = liveCategories.find((l) => l.slug === cat.slug);
    const image = live?.image?.src || cat.image;
    const count = live?.count ?? null;
    return { ...cat, image, count };
  });

  return (
    <section className="bg-[#400604] py-8 relative group/hero">
      <div className="container mx-auto px-4 lg:px-8 max-w-[1500px]">
        {/* Carousel Container */}
        <div className="relative">
          <div
            ref={scrollerRef}
            className="flex gap-5 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory"
          >
            {cards.map((cat, idx) => (
              <Link
                key={cat.slug}
                href={`/${cat.slug}`}
                className="group relative overflow-hidden rounded-2xl bg-[#2b0403] border border-[#5c0f0d] aspect-[4/5] w-[260px] lg:w-[280px] shrink-0 flex flex-col justify-end shadow-lg hover:shadow-2xl hover:border-[#E1B76F]/60 transition-all duration-500 snap-start"
              >
                {/* Background Image */}
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  priority={idx < 4}
                />

                {/* Gradient overlay */}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-[#2b0403]/95 via-[#400604]/40 to-transparent transition-opacity duration-300 group-hover:from-[#1e0302]/95"
                />

                {/* Sale badge */}
                {cat.slug === "sale" && (
                  <span className="absolute top-4 left-4 z-10 bg-[#E1B76F] text-[#400604] text-[12px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow">
                    SALE 🔥
                  </span>
                )}
                {cat.slug === "new-arrivals" && (
                  <span className="absolute top-4 left-4 z-10 bg-[#2b0403] border border-[#5c0f0d] text-[#E1B76F] text-[12px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow">
                    NEW DROP
                  </span>
                )}

                {/* Content */}
                <div className="relative z-10 p-5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-2xl">{cat.icon}</span>
                    <h2 className="text-[#E1B76F] font-heading font-black text-[22px] leading-tight">{cat.name}</h2>
                  </div>
                  {cat.count !== null && cat.count > 0 && (
                    <p className="text-[#cbb18a] text-[13px] mb-3">{cat.count} items</p>
                  )}
                  <div className="flex items-center gap-1.5 text-[14px] font-bold text-[#E1B76F] group-hover:text-white transition-colors">
                    Shop Collection <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Navigation Arrows */}
          {canScrollLeft && (
            <button
              type="button"
              aria-label="Scroll left"
              onClick={() => scrollByAmount("left")}
              className="absolute -left-1 lg:left-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#2b0403] border border-[#5c0f0d] text-[#E1B76F] shadow-lg flex items-center justify-center pointer-events-auto hover:bg-[#E1B76F] hover:text-[#400604] active:scale-95 transition-all duration-200 z-20 opacity-100 lg:opacity-0 lg:group-hover/hero:opacity-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {canScrollRight && (
            <button
              type="button"
              aria-label="Scroll right"
              onClick={() => scrollByAmount("right")}
              className="absolute -right-1 lg:right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#2b0403] border border-[#5c0f0d] text-[#E1B76F] shadow-lg flex items-center justify-center pointer-events-auto hover:bg-[#E1B76F] hover:text-[#400604] active:scale-95 transition-all duration-200 z-20 opacity-100 lg:opacity-0 lg:group-hover/hero:opacity-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}