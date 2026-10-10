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

// 8 Category Poster Tiles exactly matching Gorur Ghash homepage structure
const CATEGORY_TILES = [
  {
    title: "Half Sleeves",
    subtitle: "Cubans & Resort Shirts",
    href: "/cubans",
    image: "https://gorurghash.com/wp-content/uploads/2024/10/DSC1346-copy.jpg",
  },
  {
    title: "Full Sleeves",
    subtitle: "Oversized & Structured",
    href: "/oversized-full-sleeves",
    image: "https://gorurghash.com/wp-content/uploads/2026/05/DSC0480-copy.jpg",
  },
  {
    title: "Pants",
    subtitle: "Gurkha & Tailored Chinos",
    href: "/pants",
    image: "https://gorurghash.com/wp-content/uploads/2025/08/DSC0221-copy.jpg",
  },
  {
    title: "Tees",
    subtitle: "Drop Shoulder & Heavy Cotton",
    href: "/t-shirt",
    image: "https://gorurghash.com/wp-content/uploads/2026/03/DSC9555-copy.jpg",
  },
  {
    title: "Polos",
    subtitle: "Textured & Knit Collars",
    href: "/polos",
    image: "https://gorurghash.com/wp-content/uploads/2026/03/DSC0099-copy.jpg",
  },
  {
    title: "Tops",
    subtitle: "Flowy, Kimonos & Crops",
    href: "/tops",
    image: "https://gorurghash.com/wp-content/uploads/2025/09/DSC5062-copy.jpg",
  },
  {
    title: "Accessories",
    subtitle: "Caps, Tote Bags & Jewelry",
    href: "/accessories",
    image: "https://gorurghash.com/wp-content/uploads/2024/09/2.jpg",
  },
  {
    title: "On Sale",
    subtitle: "Up to 50% Off Markdowns",
    href: "/sale",
    image: "/banners/sale-home-banner.png",
  },
];

const PILLARS = [
  { icon: Truck, title: "Swift Delivery", text: "2–3 days inside Dhaka, 3–5 days outside" },
  { icon: ShieldCheck, title: "Cash on Delivery", text: "Pay at your doorstep in all 64 districts" },
  { icon: RefreshCw, title: "7-Day Exchange", text: "Hassle-free size swaps nationwide" },
  { icon: MapPin, title: "Visit the Showroom", text: "Niketan, Gulshan — open daily" },
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
      {/* Floating cart shortcut (left corner matching Gorur Ghash) */}
      <button
        onClick={openCart}
        className="group fixed bottom-6 left-3 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-[#5c0f0d] bg-black text-[#E1B76F] shadow-2xl transition-all hover:scale-110 sm:left-6 sm:h-12 sm:w-12"
        aria-label="Open cart"
      >
        <ShoppingBag className="h-5 w-5 transition group-hover:text-white" />
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#E1B76F] text-[10px] font-black text-[#400604]">
          {itemCount}
        </span>
      </button>

      {/* ── 1. Top Hero Banner (Mighto Activewear - Full Width matching Gorur Ghash) ── */}
      <section className="w-full">
        <Link
          href="/mighto"
          className="group relative block w-full aspect-[2560/942] max-h-[520px] overflow-hidden bg-[#2b0403] border-b border-[#5c0f0d]"
        >
          <Image
            src="/banners/mighto-home-banner.png"
            alt="Mighto Performance Activewear"
            fill
            priority
            className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-8 flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-xl bg-[#E1B76F] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-[#400604] shadow-2xl transition group-hover:bg-white group-hover:text-black">
              <Zap className="h-3.5 w-3.5 fill-current" />
              Explore Mighto Collection &rarr;
            </span>
          </div>
        </Link>
      </section>

      {/* ── 2. Two-Column Gender Split: MEN & WOMEN matching Gorur Ghash ── */}
      <section className="container mx-auto max-w-[1400px] px-4 pt-6 sm:pt-8 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {/* Men Poster */}
          <Link
            href="/men"
            className="group relative block aspect-square sm:aspect-[4/3] w-full overflow-hidden rounded-2xl border-2 border-[#5c0f0d] bg-[#2b0403] shadow-2xl transition hover:border-[#E1B76F]"
          >
            <Image
              src="/banners/mighto-men-card.png"
              alt="Men Apparel Collection"
              fill
              className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2b0403]/90 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#cbb18a] block">
                Contemporary Cuts
              </span>
              <h3 className="font-heading text-3xl sm:text-4xl font-black uppercase text-[#E1B76F] group-hover:text-white transition">
                Men
              </h3>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#E1B76F] px-4 py-1 text-xs font-black uppercase text-[#400604] group-hover:bg-white transition">
                Shop Men &rarr;
              </span>
            </div>
          </Link>

          {/* Women Poster */}
          <Link
            href="/women"
            className="group relative block aspect-square sm:aspect-[4/3] w-full overflow-hidden rounded-2xl border-2 border-[#5c0f0d] bg-[#2b0403] shadow-2xl transition hover:border-[#E1B76F]"
          >
            <Image
              src="/banners/mighto-women-card.png"
              alt="Women Apparel Collection"
              fill
              className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2b0403]/90 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#cbb18a] block">
                Heritage Silhouettes
              </span>
              <h3 className="font-heading text-3xl sm:text-4xl font-black uppercase text-[#E1B76F] group-hover:text-white transition">
                Women
              </h3>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#E1B76F] px-4 py-1 text-xs font-black uppercase text-[#400604] group-hover:bg-white transition">
                Shop Women &rarr;
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* ── 3. Eight Category Poster Tiles (4 cols x 2 rows) matching Gorur Ghash ── */}
      <section className="container mx-auto max-w-[1400px] px-4 py-10 lg:px-8">
        <div className="mb-6 flex items-end justify-between border-b border-[#5c0f0d] pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#cbb18a]">
              Signature Categories
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-black uppercase tracking-wide text-[#E1B76F]">
              Shop By Category
            </h2>
          </div>
          <Link
            href="/products"
            className="text-xs font-bold uppercase text-[#E1B76F] underline underline-offset-4 hover:text-white"
          >
            All Products &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 lg:gap-5">
          {CATEGORY_TILES.map((cat) => (
            <Link
              key={cat.title}
              href={cat.href}
              className="group relative block aspect-[4/5] overflow-hidden rounded-2xl border border-[#5c0f0d] bg-[#2b0403] shadow-xl transition-all duration-300 hover:border-[#E1B76F] hover:shadow-2xl"
            >
              <Image
                src={cat.image}
                alt={cat.title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 25vw"
                className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              
              {/* Bottom Frosted Title Pill matching Gorur Ghash */}
              <div className="absolute bottom-3 left-3 right-3 text-center">
                <div className="rounded-xl border border-[#E1B76F]/40 bg-[#400604]/80 py-2.5 px-3 backdrop-blur-md transition group-hover:border-[#E1B76F] group-hover:bg-[#400604]">
                  <h3 className="font-heading text-sm sm:text-base font-black uppercase text-[#E1B76F] tracking-wide group-hover:text-white transition">
                    {cat.title}
                  </h3>
                  <p className="text-[10px] text-[#cbb18a] truncate mt-0.5">
                    {cat.subtitle}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 4. Yellow Cash On Delivery Band matching Gorur Ghash ── */}
      <section className="bg-[#E1B76F] py-8 text-center text-[#400604] border-y-2 border-[#cbb18a] shadow-inner">
        <div className="container mx-auto max-w-[1200px] px-4">
          <h2 className="font-heading text-2xl sm:text-4xl font-black uppercase tracking-tight text-[#400604]">
            Cash on delivery in all 64 districts!
          </h2>
          <p className="mt-2 text-xs sm:text-sm font-bold text-[#400604]/90 tracking-wide">
            Inside Dhaka ৳60 (2–3 days) · Outside Dhaka ৳100 (3–5 days) · Hassle-free 7-day exchange
          </p>
        </div>
      </section>

      {/* ── 5. Products: Multi-column 8-column layout matching Gorur Ghash ── */}
      <section className="container mx-auto max-w-[1500px] px-3 py-12 lg:px-8">
        <div className="mb-8 flex items-end justify-between border-b border-[#5c0f0d] pb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#cbb18a]">Catalog</p>
            <h2 className="font-heading text-2xl sm:text-4xl font-black uppercase tracking-wide text-[#E1B76F]">
              New &amp; Trending
            </h2>
          </div>
          <Link
            href="/products"
            className="flex items-center gap-1.5 rounded-full border border-[#E1B76F] px-4 py-2 text-xs font-bold uppercase tracking-wider transition hover:bg-[#E1B76F] hover:text-[#400604]"
          >
            View all 310+ <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {isLoading
            ? Array.from({ length: 16 }).map((_, idx) => (
                <div
                  key={idx}
                  className="animate-pulse rounded-xl border border-[#5c0f0d] bg-[#4a0705] p-2.5"
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

      {/* ── 6. SSLCOMMERZ Payment Partner Strip matching Gorur Ghash ── */}
      <section className="border-t border-[#5c0f0d] bg-[#2b0403] py-8 px-4">
        <div className="container mx-auto max-w-[1200px] text-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#cbb18a] block mb-3">
            Secure Payment Channels & Verified Gateway
          </span>
          <div className="inline-flex flex-wrap items-center justify-center gap-3 sm:gap-4 rounded-2xl border border-[#5c0f0d] bg-[#400604] p-4 sm:p-5 shadow-xl">
            <span className="rounded-lg bg-[#D82A6B] px-3.5 py-1.5 font-black text-white text-xs tracking-wider shadow">bKash</span>
            <span className="rounded-lg bg-[#E83C24] px-3.5 py-1.5 font-black text-white text-xs tracking-wider shadow">Nagad</span>
            <span className="rounded-lg bg-[#7C2D8A] px-3.5 py-1.5 font-black text-white text-xs tracking-wider shadow">Rocket</span>
            <span className="rounded-lg bg-white px-3.5 py-1.5 font-black text-[#1A1F71] text-xs tracking-wider shadow">VISA</span>
            <span className="rounded-lg bg-white px-3.5 py-1.5 font-black text-[#EB001B] text-xs tracking-wider shadow">Mastercard</span>
            <span className="rounded-lg bg-[#0070BA] px-3.5 py-1.5 font-black text-white text-xs tracking-wider shadow">Amex</span>
            <span className="rounded-lg bg-[#27AE60] px-3.5 py-1.5 font-black text-white text-xs tracking-wider shadow">Cash On Delivery</span>
          </div>
        </div>
      </section>

      {/* ── 7. Trust Pillars + Showroom Center ── */}
      <section className="border-t border-[#5c0f0d] bg-[#240302] py-14">
        <div className="container mx-auto max-w-[1400px] px-4 lg:px-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {PILLARS.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-[#5c0f0d] bg-[#400604]/70 p-5 text-center shadow-lg"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#5c0f0d] bg-[#2b0403]">
                  <Icon className="h-5 w-5 text-[#E1B76F]" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-white">{title}</h3>
                <p className="mt-1 text-xs leading-snug text-[#cbb18a]">{text}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-12 max-w-3xl rounded-3xl border-2 border-[#E1B76F]/40 bg-gradient-to-r from-[#2b0403] via-[#4a0705] to-[#2b0403] p-6 text-center shadow-2xl sm:p-8">
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
