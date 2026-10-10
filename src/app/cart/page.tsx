"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Trash2, ShoppingBag, ArrowRight } from "lucide-react";
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
    // Baseline inside-Dhaka fee before district is entered at checkout
    const fee = items.reduce((max, item) => Math.max(max, item.deliveryInside ?? 60), 0);
    setShippingFee(fee);
  }, [items, subtotal]);

  if (items.length === 0) {
    return (
      <section className="container mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h1 className="font-heading text-3xl font-black uppercase text-black">Your Bag is Empty</h1>
        <p className="mt-2 text-sm text-neutral-500">Discover our collection and return to checkout when you are ready.</p>
        <Link
          href="/products"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#ffd800] px-8 py-3.5 text-sm font-bold text-black transition hover:bg-black hover:text-white"
        >
          Browse Collections <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black py-10 md:py-14">
      <div className="container mx-auto max-w-[1300px] px-4">
        <h1 className="font-heading text-3xl sm:text-4xl font-black text-black uppercase">Shopping Bag</h1>
        <p className="mt-1 text-sm text-neutral-500">Review your selected items before proceeding to checkout.</p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Cart items list */}
          <div className="space-y-4">
            {items.map((item) => (
              <article
                key={`${item.productId}-${item.size}`}
                className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-4 sm:grid-cols-[110px_1fr] shadow-2xs"
              >
                <div className="relative aspect-square overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50">
                  <Image src={item.image} alt={item.name} fill className="object-cover" sizes="120px" />
                </div>
                <div className="space-y-3 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-base text-black">{item.name}</h2>
                      <span className="inline-block mt-1 rounded bg-neutral-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                        Size: {item.size}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId, item.size)}
                      className="rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-red-500"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-100">
                    <QuantitySelector
                      value={item.quantity}
                      onChange={(quantity) => updateQuantity(item.productId, item.size, quantity)}
                    />
                    <p className="font-bold text-base text-black">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Sidebar Summary */}
          <aside className="h-fit rounded-2xl border border-neutral-200 bg-neutral-50/60 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-black border-b border-neutral-200 pb-3">Order Summary</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between text-neutral-600">
                <span>Subtotal</span>
                <span className="font-bold text-black">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-600">
                <span>Estimated Shipping</span>
                {shippingFee === null ? (
                  <span className="h-4 w-14 animate-pulse rounded bg-neutral-200" />
                ) : shippingFee === 0 ? (
                  <span className="text-emerald-600 font-bold">Free</span>
                ) : (
                  <span className="font-semibold text-black">{formatPrice(shippingFee)}</span>
                )}
              </div>
              {subtotal < 3000 ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800">
                  Add <strong>{formatPrice(3000 - subtotal)}</strong> more to get <strong>FREE Delivery</strong>!
                </div>
              ) : (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 font-medium">
                  🎉 You unlocked Free Delivery!
                </div>
              )}
              <div className="border-t border-neutral-200 pt-3 text-base font-bold text-black">
                <div className="flex items-center justify-between">
                  <span>Estimated Total</span>
                  <span>{formatPrice(subtotal + (shippingFee ?? 0))}</span>
                </div>
              </div>
            </div>
            <Link
              href="/checkout"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#ffd800] py-3.5 text-sm font-bold text-black transition hover:bg-black hover:text-white shadow-sm"
            >
              Proceed to Checkout <ArrowRight className="h-4 w-4" />
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
