"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { getProducts } from "@/services/products.service";
import type { WooProduct, WooCategory } from "@/types/product";
import { ProductCard } from "@/components/product/product-card";
import { useCartStore } from "@/store/cart-store";
import { useMounted } from "@/hooks/use-mounted";
import { getCategoryImage } from "@/config/category-images";
import REAL_CATEGORIES from "@/data/real-categories.json";

const EXCLUDED_GRID_SLUGS = new Set(["mighto", "kids", "unisex"]);

function filterHomepageCategories(cats: WooCategory[]): WooCategory[] {
  const seen = new Set<string>();
  return cats
    .filter((c) => (!c.parent || c.parent === 0) && !EXCLUDED_GRID_SLUGS.has((c.slug || "").toLowerCase()))
    .filter((c) => {
      const key = (c.slug || "").toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (a.menu_order ?? 0) - (b.menu_order ?? 0));
}

// Initial root categories fallback to prevent SSR layout shift
const initialRootCats: WooCategory[] = filterHomepageCategories(
  REAL_CATEGORIES as unknown as WooCategory[]
);

export default function HomePage() {
  const [products, setProducts] = useState<WooProduct[]>([]);
  const [categories, setCategories] = useState<WooCategory[]>(initialRootCats);
  const [isLoading, setIsLoading] = useState(true);
  const openCart = useCartStore((s) => s.openCart);
  const mounted = useMounted();
  const itemCount = useCartStore((s) => s.itemCount());

  useEffect(() => {
    // 1. Fetch live products
    getProducts({ perPage: 24 })
      .then((data) => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch((err) => console.error("Failed to fetch products:", err))
      .finally(() => setIsLoading(false));

    // 2. Fetch live categories synced with Admin Panel
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const roots = filterHomepageCategories(data);
          if (roots.length > 0) {
            setCategories(roots);
          }
        }
      })
      .catch((err) => console.error("Failed to fetch categories:", err));
  }, []);

  // Dynamically pair categories into 2-column banner cards matching Admin Panel order
  const bannerPairs = useMemo(() => {
    const pairs: Array<Array<{ title: string; href: string; image: string; alt: string }>> = [];
    for (let i = 0; i < categories.length; i += 2) {
      const pair = [
        {
          title: categories[i].name,
          href: `/product-category/${categories[i].slug}`,
          image: getCategoryImage(categories[i]),
          alt: `${categories[i].name} Collection`,
        },
      ];
      if (i + 1 < categories.length) {
        pair.push({
          title: categories[i + 1].name,
          href: `/product-category/${categories[i + 1].slug}`,
          image: getCategoryImage(categories[i + 1]),
          alt: `${categories[i + 1].name} Collection`,
        });
      }
      pairs.push(pair);
    }
    return pairs;
  }, [categories]);

  return (
    <div className="min-h-screen bg-[#400604] text-white">
      {/* Floating cart shortcut */}
      <button
        onClick={openCart}
        className="group fixed bottom-6 left-3 sm:left-4 z-40 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-[#400604] text-white border border-[#E1B76F]/40 shadow-2xl transition-all hover:scale-110 cursor-pointer"
        aria-label="Open cart"
      >
        <ShoppingBag className="h-5 w-5 text-white transition group-hover:scale-105" />
        {mounted && itemCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#E1B76F] text-[10px] font-black text-[#400604] shadow">
            {itemCount}
          </span>
        )}
      </button>

      {/* ── 1. Top Hero Banner (Mighto Activewear - Full Width Edge to Edge) ── */}
      <section className="w-full overflow-hidden">
        <Link
          href="/mighto"
          className="group relative block w-full aspect-[2560/942] overflow-hidden bg-[#340402]"
        >
          <Image
            src="/banners/mighto-home-banner.webp"
            alt="Mighto Performance Activewear"
            fill
            priority
            loading="eager"
            sizes="100vw"
            className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.01]"
          />
        </Link>
      </section>

      {/* ── 2. Pairs of 2-Column Banner Cards (Full Width Grid Edge to Edge - Dynamic from Admin Panel) ── */}
      <section className="w-full px-2 sm:px-3 md:px-4 py-3 sm:py-4 space-y-2 sm:space-y-3">
        {bannerPairs.map((pair, pIdx) => (
          <div
            key={pIdx}
            className={`grid gap-2 sm:gap-3 ${
              pair.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
            }`}
          >
            {pair.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group relative block w-full aspect-[1700/700] overflow-hidden bg-[#340402] border border-[#E1B76F]/15 shadow-sm transition hover:opacity-95"
              >
                <Image
                  src={item.image}
                  alt={item.alt}
                  fill
                  priority={pIdx < 2}
                  loading={pIdx < 2 ? "eager" : "lazy"}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </Link>
            ))}
          </div>
        ))}
      </section>

      {/* ── 3. Luxury Cash On Delivery Band (Full Width Edge to Edge) ── */}
      <section className="w-full bg-[#300302] border-y border-[#E1B76F]/30 py-4 sm:py-6 text-center text-white my-2 sm:my-3 shadow-inner">
        <div className="w-full px-4 text-center">
          <h2 className="font-heading italic text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Cash on Delivery in all 64 Districts
          </h2>
        </div>
      </section>

      {/* ── 4. Products: 8-Column WooCommerce Loop Grid (Full Width Edge to Edge) ── */}
      <section className="w-full px-2 sm:px-3 md:px-4 lg:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 md:gap-x-5 gap-y-8 sm:gap-y-10 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8">
          {isLoading
            ? Array.from({ length: 16 }).map((_, idx) => (
                <div
                  key={idx}
                  className="animate-pulse bg-transparent p-0"
                >
                  <div className="mb-2 aspect-[3/4] rounded-none bg-[#340402] border border-[#E1B76F]/10" />
                  <div className="mb-1 h-3 w-3/4 rounded bg-[#340402]" />
                  <div className="mb-1 h-2.5 w-1/3 rounded bg-[#340402]" />
                  <div className="mb-2 h-3 w-1/2 rounded bg-[#340402]" />
                  <div className="h-6 w-24 rounded-full bg-[#340402]" />
                </div>
              ))
            : products.slice(0, 16).map((product, index) => (
                <ProductCard key={product.id} product={product} eager={index < 4} />
              ))}
        </div>
      </section>

      {/* ── 5. SSLCOMMERZ Payment Partner Strip ── */}
      <section className="w-full bg-[#300302] border-t border-[#E1B76F]/20 py-6 sm:py-8 md:py-10">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6">
          <div className="p-3 sm:p-4 rounded-xl bg-white/5 border border-[#E1B76F]/15">
            <Image
              src="/banners/sslcommerz.png"
              alt="Pay With SSLCOMMERZ — VISA, Mastercard, AMEX, bKash, Nagad, Rocket, DBBL Nexus, Upay"
              width={5011}
              height={587}
              sizes="(max-width: 1440px) 100vw, 1440px"
              className="w-full h-auto object-contain mx-auto brightness-95"
            />
          </div>
        </div>
      </section>

    </div>
  );
}
