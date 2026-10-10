"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { getProducts } from "@/services/products.service";
import type { WooProduct } from "@/types/product";
import { ProductCard } from "@/components/product/product-card";
import { useCartStore } from "@/store/cart-store";

// Pairs of 2-Column Banner Cards matching Gorur Ghash Homepage exactly
const BANNER_PAIRS = [
  // Pair 1: Men & Women
  [
    {
      title: "Men",
      href: "/men",
      image: "/banners/men-banner.png",
      alt: "Men Collection",
    },
    {
      title: "Women",
      href: "/women",
      image: "/banners/women-banner.png",
      alt: "Women Collection",
    },
  ],
  // Pair 2: Half-sleeves & Full-Sleeves
  [
    {
      title: "Half Sleeves",
      href: "/cubans",
      image: "/banners/half-sleeves.png",
      alt: "Half Sleeves Shirts",
    },
    {
      title: "Full Sleeves",
      href: "/oversized-full-sleeves",
      image: "/banners/full-sleeves.png",
      alt: "Full Sleeves Shirts",
    },
  ],
  // Pair 3: Pants & Tees
  [
    {
      title: "Pants",
      href: "/pants",
      image: "/banners/pants.png",
      alt: "Pants & Trousers",
    },
    {
      title: "Tees",
      href: "/t-shirt",
      image: "/banners/tees.png",
      alt: "T-Shirts & Drop Tees",
    },
  ],
  // Pair 4: Polos & Tops
  [
    {
      title: "Polos",
      href: "/polos",
      image: "/banners/polos.png",
      alt: "Polos & Knits",
    },
    {
      title: "Tops",
      href: "/tops",
      image: "/banners/tops.png",
      alt: "Women Tops & Kimonos",
    },
  ],
  // Pair 5: Accessories & Gift Card / Sale
  [
    {
      title: "Accessories",
      href: "/accessories",
      image: "/banners/accessories.png",
      alt: "Accessories",
    },
    {
      title: "Gift Card & Sale",
      href: "/sale",
      image: "/banners/gift-card.png",
      alt: "Gift Card & On Sale",
    },
  ],
];


export default function HomePage() {
  const [products, setProducts] = useState<WooProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const openCart = useCartStore((s) => s.openCart);
  const itemCount = useCartStore((s) => s.itemCount());

  useEffect(() => {
    getProducts({ perPage: 24 })
      .then((data) => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch((err) => console.error("Failed to fetch products:", err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Floating cart shortcut (bottom left matching Gorur Ghash screenshot) */}
      <button
        onClick={openCart}
        className="group fixed bottom-6 left-3 sm:left-4 z-40 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white text-black border border-neutral-300 shadow-2xl transition-all hover:scale-110"
        aria-label="Open cart"
      >
        <ShoppingBag className="h-5 w-5 text-black transition group-hover:scale-105" />
        {itemCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#ffd800] text-[10px] font-black text-black shadow">
            {itemCount}
          </span>
        )}
      </button>

      {/* ── 1. Top Hero Banner (Mighto Activewear - Full Width Edge to Edge) ── */}
      <section className="w-full overflow-hidden">
        <Link
          href="/mighto"
          className="group relative block w-full aspect-[2560/942] overflow-hidden bg-neutral-100"
        >
          <Image
            src="/banners/mighto-home-banner.png"
            alt="Mighto Performance Activewear"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.01]"
          />
        </Link>
      </section>

      {/* ── 2. Pairs of 2-Column Banner Cards (Full Width Grid Edge to Edge matching Gorur Ghash e-con-full) ── */}
      <section className="w-full px-2 sm:px-3 md:px-4 py-3 sm:py-4 space-y-2 sm:space-y-3">
        {BANNER_PAIRS.map((pair, pIdx) => (
          <div key={pIdx} className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
            {pair.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group relative block w-full aspect-[1700/700] overflow-hidden bg-neutral-100 shadow-sm transition hover:opacity-95"
              >
                <Image
                  src={item.image}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </Link>
            ))}
          </div>
        ))}
      </section>

      {/* ── 3. Yellow Cash On Delivery Band (Full Width Edge to Edge) ── */}
      <section className="w-full bg-[#ffd800] py-4 sm:py-6 text-center text-black my-2 sm:my-3">
        <div className="w-full px-4 text-center">
          <h2 className="font-heading italic text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-black tracking-tight">
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
                  className="animate-pulse bg-white p-0"
                >
                  <div className="mb-2 aspect-square rounded-none bg-neutral-100" />
                  <div className="mb-1 h-3 w-3/4 rounded bg-neutral-100" />
                  <div className="mb-1 h-2.5 w-1/3 rounded bg-neutral-100" />
                  <div className="mb-2 h-3 w-1/2 rounded bg-neutral-100" />
                  <div className="h-6 w-24 rounded-full bg-neutral-100" />
                </div>
              ))
            : products.slice(0, 16).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
        </div>
      </section>

      {/* ── 5. SSLCOMMERZ Payment Partner Strip (Seamless matching Gorur Ghash) ── */}
      <section className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10 bg-white">
        <div className="w-full max-w-[1400px] mx-auto text-center">
          <div className="relative w-full aspect-[1200/110] sm:aspect-[1300/90] overflow-hidden">
            <Image
              src="/banners/sslcommerz.png"
              alt="SSLCOMMERZ Payment Partners — bKash, Nagad, Rocket, VISA, Mastercard, Amex"
              fill
              sizes="(max-width: 1400px) 100vw, 1400px"
              className="object-contain"
            />
          </div>
        </div>
      </section>

    </div>
  );
}
