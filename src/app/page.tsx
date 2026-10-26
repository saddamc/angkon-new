import Link from "next/link";
import Image from "next/image";
import { getDbProducts, getAllDbProducts } from "@/lib/db/products";
import { getDbCategories } from "@/lib/db/categories";
import type { WooProduct, WooCategory } from "@/types/product";
import { ProductCard } from "@/components/product/product-card";
import { FloatingCartButton } from "@/components/home/floating-cart-button";
import { getCategoryImage } from "@/config/category-images";
import REAL_CATEGORIES from "@/data/real-categories.json";

// 5-minute Incremental Static Regeneration (sub-50ms instant initial page loads)
export const revalidate = 300;

const EXCLUDED_GRID_SLUGS = new Set(["uncategorized", "kids", "unisex"]);

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

export default async function HomePage() {
  const [dbCats, dbProducts] = await Promise.all([
    getDbCategories().catch(() => REAL_CATEGORIES as unknown as WooCategory[]),
    getDbProducts({ perPage: 24 }).catch(() => getAllDbProducts()),
  ]);

  const categories = filterHomepageCategories(
    dbCats && dbCats.length > 0 ? dbCats : (REAL_CATEGORIES as unknown as WooCategory[])
  );
  const products: WooProduct[] = Array.isArray(dbProducts) && dbProducts.length > 0 ? dbProducts : [];

  // Dynamically pair categories into 2-column banner cards matching Admin Panel order
  const bannerPairs: Array<Array<{ title: string; href: string; image: string; alt: string }>> = [];
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
    bannerPairs.push(pair);
  }

  return (
    <div className="min-h-screen bg-[#400604] text-white">
      {/* Floating cart shortcut */}
      <FloatingCartButton />

      {/* ── 1. Top Hero Banner (ANGKON House of Modern Heritage - Full Width Edge to Edge) ── */}
      <section className="w-full overflow-hidden">
        <Link
          href="/products"
          className="group block w-full overflow-hidden bg-[#340402]"
        >
          <Image
            src="/banners/HERO1.webp"
            alt="ANGKON — House of Modern Heritage"
            width={1920}
            height={917}
            priority
            loading="eager"
            quality={95}
            sizes="100vw"
            className="w-full h-auto block transition-transform duration-700 group-hover:scale-[1.008] [image-rendering:-webkit-optimize-contrast]"
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
            {pair.map((item) => {
              const hasBakedText = typeof item.image === "string" && item.image.startsWith("/banners/");
              return (
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
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                  {/* Dynamic Admin Upload Overlay */}
                  {!hasBakedText && (
                    <div className="absolute inset-0 flex items-center justify-start pl-6 sm:pl-10 md:pl-14 pointer-events-none z-10">
                      <span className="font-heading font-black text-xl sm:text-2xl md:text-3xl lg:text-4xl text-white uppercase tracking-[0.22em] drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                        {item.title}
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}
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
          {products.slice(0, 16).map((product, index) => (
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
