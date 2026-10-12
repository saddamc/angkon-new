import type { Metadata } from "next";
import Image from "next/image";
import { getProducts } from "@/services/products.service";
import REAL_PRODUCTS from "@/data/real-products.json";
import { ProductCard } from "@/components/product/product-card";
import type { WooProduct } from "@/types/product";
import { getShippingSettings } from "@/server/shipping";

export const metadata: Metadata = {
  title: "On Sale — ANGKON",
  description: "Special promotional discounts and clearance prices across ANGKON collections.",
};

export const dynamic = "force-dynamic";

export default async function SalePage() {
  const [shippingSettings, fetchedProducts] = await Promise.all([
    getShippingSettings().catch(() => null),
    getProducts({ onSale: true, perPage: 100 }).catch(() => [] as WooProduct[]),
  ]);

  const threshold = Number(shippingSettings?.freeDeliveryThreshold) || 0;
  const thresholdText =
    threshold > 0 ? `TK ${threshold.toLocaleString()}` : "ALL ORDERS";

  let saleProducts: WooProduct[] = Array.isArray(fetchedProducts) ? fetchedProducts : [];

  // If no products are currently marked with discount, showcase latest updated catalog products
  if (saleProducts.length === 0) {
    try {
      saleProducts = await getProducts({ perPage: 24, orderby: "date", order: "desc" });
    } catch {
      saleProducts = (REAL_PRODUCTS as unknown as WooProduct[]).slice(0, 24);
    }
  }

  // Guarantee products are sorted by last updated date (newest first)
  saleProducts.sort((a, b) => {
    const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : a.id);
    const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : b.id);
    return timeB - timeA;
  });

  return (
    <div className="min-h-screen bg-[#400604] text-white">
      {/* ── 1. Authentic ON SALE Header Banner with Live Admin Threshold ── */}
      <section className="w-full">
        <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 pt-4 sm:pt-6 md:pt-8 pb-4 sm:pb-6">
          <div className="relative w-full aspect-[1980/600] overflow-hidden select-none">
            <Image
              src="/banners/on-sale-header.png?v=5"
              alt="On Sale"
              fill
              priority
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="object-contain object-center"
            />
            {/* Dynamic Free Shipping Threshold directly synced with Admin Settings */}
            <div className="absolute top-[56.67%] left-[1.1%] w-[97.8%] h-[13.17%] flex items-center justify-center pointer-events-none px-2 sm:px-4">
              <span
                className="font-serif font-bold uppercase text-[#F5D79B] text-center tracking-[0.06em] sm:tracking-[0.08em] whitespace-nowrap overflow-hidden text-ellipsis"
                style={{
                  fontSize: "clamp(7px, 1.15vw, 19px)",
                }}
              >
                • CASH ON DELIVERY NATIONWIDE (64 DISTRICTS) • FREE SHIPPING OVER {thresholdText} •
              </span>
            </div>
          </div>

          {/* Mobile readable announcement strip for small screens */}
          <div className="mt-2.5 sm:hidden rounded-xl border border-[#E1B76F]/30 bg-[#2A0302] py-2 px-3 text-center shadow-sm">
            <p className="text-[11px] font-serif font-bold uppercase text-[#F5D79B] tracking-wide">
              Free Shipping Over {thresholdText}
            </p>
            <p className="text-[9px] text-[#E1B76F]/75 uppercase tracking-wider mt-0.5">
              • Cash on Delivery Nationwide (64 Districts) •
            </p>
          </div>
        </div>
      </section>

      {/* ── 2. On Sale Products Grid (4 columns desktop, 2 columns mobile) ── */}
      <section className="w-full pb-16 sm:pb-20">
        <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6">
          {saleProducts.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-base text-white/90">No products are currently on sale.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 md:gap-x-5 gap-y-8 sm:gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
              {saleProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} eager={index < 4} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
