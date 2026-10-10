"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuantitySelector } from "@/components/product/quantity-selector";
import { useCartStore } from "@/store/cart-store";
import { formatPrice } from "@/utils/price";

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const subtotal = useCartStore((state) => state.subtotal());
  const [shippingFee, setShippingFee] = useState<number | null>(null);

  useEffect(() => {
    if (items.length === 0) {
      setShippingFee(0);
      return;
    }
    if (subtotal >= 3000) {
      setShippingFee(0);
      return;
    }
    // Since district is unknown in cart, show inside-Dhaka fee as a baseline
    const fee = items.reduce((max, item) => Math.max(max, item.deliveryInside ?? 70), 0);
    setShippingFee(fee);
  }, [items, subtotal]);

  if (items.length === 0) {
    return (
      <section className="container flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h1 className="font-heading text-4xl sm:text-5xl font-black text-[#E1B76F] uppercase">Your Bag is Empty</h1>
        <p className="mt-2 max-w-md text-sm text-[#cbb18a]">Discover our modern heritage apparel and return to checkout when you are ready.</p>
        <Link
          href="/products"
          className="mt-6 inline-flex items-center justify-center rounded-[12px] border-2 border-[#E1B76F] bg-[#E1B76F] px-8 py-3 text-sm font-bold text-[#400604] transition hover:bg-[#f3cb87] hover:border-[#f3cb87]"
        >
          Browse Collections
        </Link>
      </section>
    );
  }

  return (
    <section className="container py-10">
      <h1 className="font-heading text-4xl sm:text-5xl font-black text-[#E1B76F] uppercase">Shopping Bag</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {items.map((item) => (
            <article key={`${item.productId}-${item.size}`} className="grid gap-4 rounded-2xl border border-[#5c0f0d] bg-[#4a0705] p-4 sm:grid-cols-[110px_1fr]">
              <div className="relative aspect-square overflow-hidden rounded-xl border border-[#5c0f0d] bg-[#2b0403]">
                <Image src={item.image} alt={item.name} fill className="object-cover" sizes="120px" />
              </div>
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-[#E1B76F]">{item.name}</h2>
                    <p className="text-xs uppercase tracking-wider text-[#cbb18a]">Size {item.size}</p>
                  </div>
                  <button onClick={() => removeItem(item.productId, item.size)} className="text-[#cbb18a] transition hover:text-[#E1B76F]">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <QuantitySelector
                    value={item.quantity}
                    onChange={(quantity) => updateQuantity(item.productId, item.size, quantity)}
                  />
                  <p className="font-semibold text-[#E1B76F]">{formatPrice(item.price * item.quantity)}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="h-fit rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-5">
          <h3 className="text-lg font-bold text-[#E1B76F]">Order Summary</h3>
          <div className="mt-4 space-y-2 text-sm text-[#cbb18a]">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-[#E1B76F]">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Shipping</span>
              {shippingFee === null ? (
                <span className="h-4 w-14 animate-pulse rounded bg-[#400604]" />
              ) : shippingFee === 0 ? (
                <span className="text-emerald-400 font-bold">Free</span>
              ) : (
                <span className="font-semibold text-[#E1B76F]">{formatPrice(shippingFee)}</span>
              )}
            </div>
            <div className="border-t border-[#5c0f0d] pt-3 text-base font-bold text-[#E1B76F]">
              <div className="flex items-center justify-between">
                <span>Total</span>
                <span>{formatPrice(subtotal + (shippingFee ?? 0))}</span>
              </div>
            </div>
          </div>
          <Link
            href="/checkout"
            className="mt-6 flex w-full items-center justify-center rounded-[12px] border-2 border-[#E1B76F] bg-[#E1B76F] py-3 text-sm font-black text-[#400604] transition hover:bg-[#f3cb87] hover:border-[#f3cb87]"
          >
            Proceed to Checkout
          </Link>
        </aside>
      </div>
    </section>
  );
}
