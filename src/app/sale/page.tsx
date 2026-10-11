import type { Metadata } from "next";
import Image from "next/image";
import { getProducts } from "@/services/products.service";
import REAL_PRODUCTS from "@/data/real-products.json";
import { ProductCard } from "@/components/product/product-card";
import type { WooProduct } from "@/types/product";

export const metadata: Metadata = {
  title: "On Sale — ANGKON",
  description: "Special promotional discounts and clearance prices across ANGKON collections.",
};

export const revalidate = 300;

export default async function SalePage() {
  let saleProducts: WooProduct[] = [];
  try {
    const fetched = await getProducts({ onSale: true, perPage: 100 });
    if (Array.isArray(fetched) && fetched.length > 0) {
      saleProducts = fetched;
    } else {
      saleProducts = (REAL_PRODUCTS as unknown as WooProduct[]).filter(
        (p) =>
          p.on_sale ||
          (p.regular_price && parseFloat(p.regular_price) > parseFloat(p.price)) ||
          (p.sale_price && parseFloat(p.sale_price) < parseFloat(p.regular_price || p.price))
      );
    }
  } catch {
    saleProducts = (REAL_PRODUCTS as unknown as WooProduct[]).filter(
      (p) =>
        p.on_sale ||
        (p.regular_price && parseFloat(p.regular_price) > parseFloat(p.price)) ||
        (p.sale_price && parseFloat(p.sale_price) < parseFloat(p.regular_price || p.price))
    );
  }

  return (
    <div className="min-h-screen bg-[#400604] text-white">
      {/* ── 1. Authentic ON SALE Header Banner ── */}
      <section className="w-full">
        <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 pt-4 sm:pt-6 md:pt-8 pb-4 sm:pb-6">
          <div className="relative w-full aspect-[1980/600] overflow-hidden">
            <Image
              src="/banners/on-sale-header.png"
              alt="On Sale"
              fill
              priority
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="object-contain object-center"
            />
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
