import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Dumbbell, Flame, Zap, ArrowRight, ShieldCheck } from "lucide-react";
import REAL_PRODUCTS from "@/data/real-products.json";
import { ProductCard } from "@/components/product/product-card";
import type { WooProduct } from "@/types/product";

export const metadata: Metadata = {
  title: "MIGHTO Performance Activewear — ANGKON",
  description: "High-performance gym wear, yoga pants, compression tees, and breathable athleisure built for motion.",
};

export default function MightoPage() {
  const allProducts = REAL_PRODUCTS as unknown as WooProduct[];
  // Activewear products (t-shirts, pants, yoga pants, sportswear)
  const mightoProducts = allProducts.filter((p) => {
    const text = (p.name + " " + (p.description || "")).toLowerCase();
    return (
      text.includes("mighto") ||
      text.includes("gym") ||
      text.includes("yoga") ||
      text.includes("active") ||
      text.includes("tee") ||
      text.includes("drop") ||
      text.includes("pant")
    );
  }).slice(0, 16);

  return (
    <div className="min-h-screen bg-[#400604] text-[#E1B76F]">
      {/* Mighto Top Hero Banner */}
      <div className="relative w-full aspect-[2560/942] max-h-[500px] overflow-hidden bg-[#2b0403] border-b border-[#5c0f0d]">
        <Image
          src="/banners/mighto-home-banner.png"
          alt="Mighto Performance Activewear"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#400604] via-transparent to-black/30" />
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center w-full px-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E1B76F] bg-[#400604]/90 px-4 py-1 text-xs font-black uppercase tracking-widest text-[#E1B76F] backdrop-blur-sm shadow-xl">
            <Zap className="h-3.5 w-3.5 fill-[#E1B76F]" />
            Engineered For Movement
          </span>
        </div>
      </div>

      {/* Main Cutout Split Tiles: MEN & WOMEN */}
      <div className="container mx-auto max-w-[1400px] px-4 py-12 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="font-heading text-3xl sm:text-5xl font-black uppercase text-[#E1B76F] tracking-tight">
            Choose Your Division
          </h2>
          <p className="mt-2 text-sm text-[#cbb18a]">
            Performance silhouettes tailored for high-mobility training, rest days, and urban lifestyle.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
          {/* MIGHTO MEN */}
          <Link
            href="/mighto-men"
            className="group relative block overflow-hidden rounded-2xl border-2 border-[#5c0f0d] bg-[#2b0403] shadow-2xl transition hover:border-[#E1B76F]"
          >
            <div className="relative aspect-square w-full overflow-hidden bg-[#1f0302]">
              <Image
                src="/banners/mighto-men-card.png"
                alt="Mighto Men Collection"
                fill
                className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="p-6 text-center border-t border-[#5c0f0d] bg-[#2b0403]">
              <span className="text-xs font-bold uppercase tracking-widest text-[#cbb18a] block">Division</span>
              <h3 className="font-heading text-2xl sm:text-3xl font-black uppercase text-[#E1B76F] mt-1">
                Mighto Men
              </h3>
              <p className="text-xs text-[#f5ebd8] mt-2">
                Heavyweight drop tees, breathable gym shorts, and moisture-wicking joggers.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#E1B76F] px-6 py-2.5 text-xs font-black uppercase text-[#400604] transition group-hover:bg-[#f3cb87]">
                Shop Men <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </Link>

          {/* MIGHTO WOMEN */}
          <Link
            href="/mighto-women"
            className="group relative block overflow-hidden rounded-2xl border-2 border-[#5c0f0d] bg-[#2b0403] shadow-2xl transition hover:border-[#E1B76F]"
          >
            <div className="relative aspect-square w-full overflow-hidden bg-[#1f0302]">
              <Image
                src="/banners/mighto-women-card.png"
                alt="Mighto Women Collection"
                fill
                className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="p-6 text-center border-t border-[#5c0f0d] bg-[#2b0403]">
              <span className="text-xs font-bold uppercase tracking-widest text-[#cbb18a] block">Division</span>
              <h3 className="font-heading text-2xl sm:text-3xl font-black uppercase text-[#E1B76F] mt-1">
                Mighto Women
              </h3>
              <p className="text-xs text-[#f5ebd8] mt-2">
                High-rise sculpt yoga pants, seamless sports crops, and ribbed studio layers.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#E1B76F] px-6 py-2.5 text-xs font-black uppercase text-[#400604] transition group-hover:bg-[#f3cb87]">
                Shop Women <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </Link>
        </div>

        {/* Motivational Strips */}
        <div className="mt-12 space-y-6">
          <div className="relative w-full aspect-[2560/676] overflow-hidden rounded-2xl border border-[#5c0f0d] bg-[#2b0403] shadow-xl">
            <Image
              src="/banners/mighto-strip-1.png"
              alt="Mighto Performance Series"
              fill
              className="object-cover"
            />
          </div>
          <div className="relative w-full aspect-[2560/676] overflow-hidden rounded-2xl border border-[#5c0f0d] bg-[#2b0403] shadow-xl">
            <Image
              src="/banners/mighto-strip-2.png"
              alt="Mighto Athletic Movement"
              fill
              className="object-cover"
            />
          </div>
        </div>

        {/* Featured Mighto Products Grid */}
        <div className="mt-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#5c0f0d] pb-4 mb-8 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#cbb18a]">Activewear Catalog</span>
              <h3 className="font-heading text-2xl sm:text-4xl font-black uppercase text-[#E1B76F]">
                Featured Training Drops
              </h3>
            </div>
            <Link
              href="/products"
              className="text-xs font-bold uppercase text-[#E1B76F] underline underline-offset-4 hover:text-white"
            >
              Browse Complete Catalog &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {mightoProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
