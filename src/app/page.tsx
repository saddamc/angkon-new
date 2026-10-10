"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Clock,
  MapPin,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Zap,
} from "lucide-react";
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

const PILLARS = [
  { icon: Truck, title: "Swift Delivery", text: "2–3 days inside Dhaka, 3–5 days outside" },
  { icon: ShieldCheck, title: "Cash on Delivery", text: "Pay at your doorstep in all 64 districts" },
  { icon: RefreshCw, title: "7-Day Exchange", text: "Hassle-free size swaps nationwide" },
  { icon: MapPin, title: "Visit Showroom", text: "Niketan, Gulshan — open daily" },
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
    <div className="min-h-screen bg-[#400604] text-[#E1B76F]">
      {/* Floating cart shortcut (left corner matching Gorur Ghash screenshot) */}
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

      {/* ── 1. Top Hero Banner (Mighto Activewear - Full Width) ── */}
      <section className="w-full">
        <Link
          href="/mighto"
          className="group relative block w-full aspect-[2560/942] max-h-[540px] overflow-hidden bg-[#2b0403] border-b border-[#5c0f0d]"
        >
          <Image
            src="/banners/mighto-home-banner.png"
            alt="Mighto Performance Activewear"
            fill
            priority
            className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.01]"
          />
        </Link>
      </section>

      {/* ── 2. Pairs of 2-Column Banner Cards (Men/Women, Half/Full Sleeves, Pants/Tees, Polos/Tops, Accessories/Gift Card) ── */}
      <section className="w-full px-2 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">
        {BANNER_PAIRS.map((pair, pIdx) => (
          <div key={pIdx} className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 max-w-[1700px] mx-auto">
            {pair.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group relative block w-full aspect-[1700/700] overflow-hidden rounded-xl sm:rounded-2xl border border-[#5c0f0d] bg-[#2b0403] shadow-lg transition-transform duration-300 hover:scale-[1.01] hover:border-[#E1B76F]"
              >
                <Image
                  src={item.image}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
              </Link>
            ))}
          </div>
        ))}
      </section>

      {/* ── 3. Yellow Cash On Delivery Band (Exact Gorur Ghash Styling) ── */}
      <section className="w-full bg-[#ffd800] py-5 sm:py-6 text-center text-black border-y border-[#e6c600] shadow-sm my-4">
        <div className="container mx-auto px-4">
          <h2 className="font-heading italic text-2xl sm:text-4xl lg:text-5xl font-black text-black tracking-tight">
            Cash on Delivery in all 64 Districts
          </h2>
        </div>
      </section>

      {/* ── 4. Products: 8-Column WooCommerce Loop Grid (24 Products) ── */}
      <section className="w-full max-w-[1750px] mx-auto px-2 sm:px-4 py-8 sm:py-12">
        <div className="mb-6 flex items-end justify-between border-b border-[#5c0f0d] pb-3 px-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#cbb18a]">Catalog</span>
            <h2 className="font-heading text-2xl sm:text-3xl font-black uppercase tracking-wide text-[#E1B76F]">
              New &amp; Trending
            </h2>
          </div>
          <Link
            href="/products"
            className="text-xs font-bold uppercase text-[#E1B76F] underline underline-offset-4 hover:text-white"
          >
            View all 310+ &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {isLoading
            ? Array.from({ length: 16 }).map((_, idx) => (
                <div
                  key={idx}
                  className="animate-pulse rounded-xl border border-[#5c0f0d] bg-[#4a0705] p-2"
                >
                  <div className="mb-2 aspect-square rounded-lg bg-[#2b0403]" />
                  <div className="mb-1.5 h-3.5 w-3/4 rounded bg-[#2b0403]" />
                  <div className="h-3.5 w-1/2 rounded bg-[#2b0403]" />
                </div>
              ))
            : products.slice(0, 24).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
        </div>
      </section>

      {/* ── 5. SSLCOMMERZ Payment Partner Strip (Exact Image Banner) ── */}
      <section className="w-full border-t border-[#5c0f0d] bg-[#2b0403] py-8 px-4">
        <div className="max-w-[1200px] mx-auto text-center space-y-4">
          <div className="relative w-full max-w-[900px] mx-auto aspect-[1000/120] sm:aspect-[1200/100] overflow-hidden rounded-xl bg-white p-2 shadow-xl border border-gray-200">
            <Image
              src="/banners/sslcommerz.png"
              alt="SSLCOMMERZ Payment Partners — bKash, Nagad, Rocket, VISA, Mastercard, Amex"
              fill
              className="object-contain p-2"
            />
          </div>
        </div>
      </section>

      {/* ── 6. Trust Pillars & Showroom Center ── */}
      <section className="border-t border-[#5c0f0d] bg-[#240302] py-12 px-4 sm:px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-10">
            {PILLARS.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-[#5c0f0d] bg-[#400604]/70 p-4 text-center shadow-lg"
              >
                <div className="mx-auto mb-2.5 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-[#5c0f0d] bg-[#2b0403]">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-[#E1B76F]" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-white">{title}</h3>
                <p className="mt-1 text-[11px] sm:text-xs leading-snug text-[#cbb18a]">{text}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto max-w-3xl rounded-3xl border-2 border-[#E1B76F]/40 bg-gradient-to-r from-[#2b0403] via-[#4a0705] to-[#2b0403] p-6 text-center shadow-2xl sm:p-8">
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#E1B76F]">
              <MapPin className="h-3.5 w-3.5" /> Flagship Experience Center
            </p>
            <h3 className="mt-2 font-heading text-xl font-black uppercase tracking-wide text-[#E1B76F] sm:text-3xl">
              HOUSE OF MODERN HERITAGE
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[#f5ebd8] font-serif">
              H-93, (Ground floor), Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-[#cbb18a]">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[#E1B76F]" /> Open daily 10:00 AM – 10:00 PM
              </span>
              <a
                href="https://wa.me/8801338668899"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-bold text-[#E1B76F] underline decoration-[#E1B76F]/50 underline-offset-4 hover:text-white"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp +880 1338-668899
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
