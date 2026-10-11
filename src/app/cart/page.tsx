"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { QuantitySelector } from "@/components/product/quantity-selector";
import { useCartStore } from "@/store/cart-store";
import { formatPrice } from "@/utils/price";

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const subtotal = useCartStore((state) => state.subtotal());
  // Baseline inside-Dhaka fee before the district is entered at checkout
  const shippingFee = useMemo(() => {
    if (items.length === 0 || subtotal >= 3000) return 0;
    return items.reduce((max, item) => Math.max(max, item.deliveryInside ?? 60), 0);
  }, [items, subtotal]);

  if (items.length === 0) {
    return (
      <section className="container mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#340402] border border-[#E1B76F]/20 text-[#E1B76F]">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h1 className="font-heading text-3xl font-black uppercase text-[#E1B76F]">Your Bag is Empty</h1>
        <p className="mt-2 text-sm text-[#f0d29d]">Discover our collection and return to checkout when you are ready.</p>
        <Link
          href="/products"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#400604] border border-[#E1B76F]/50 px-8 py-3.5 text-sm font-bold text-[#E1B76F] transition hover:bg-[#520805]"
        >
          Browse Collections <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-[#400604] text-[#E1B76F] py-10 md:py-14">
      <div className="container mx-auto max-w-[1300px] px-4">
        <h1 className="font-heading text-3xl sm:text-4xl font-black text-[#E1B76F] uppercase">Shopping Bag</h1>
        <p className="mt-1 text-sm text-[#f0d29d]">Review your selected items before proceeding to checkout.</p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Cart items list */}
          <div className="space-y-4">
            {items.map((item) => (
              <article
                key={`${item.productId}-${item.size}`}
                className="grid gap-4 rounded-2xl border border-[#E1B76F]/25 bg-[#340402] p-4 sm:grid-cols-[110px_1fr] shadow-2xs"
              >
                <div className="relative aspect-square overflow-hidden rounded-xl border border-[#E1B76F]/20 bg-[#2d0302]">
                  <Image src={item.image} alt={item.name} fill className="object-cover" sizes="120px" />
                </div>
                <div className="space-y-3 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-base text-[#E1B76F]">{item.name}</h2>
                      <span className="inline-block mt-1 rounded bg-[#2d0302] border border-[#E1B76F]/30 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#E1B76F]">
                        Size: {item.size}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId, item.size)}
                      className="rounded-full p-1.5 text-[#E1B76F]/60 transition hover:bg-[#400604] hover:text-red-400"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E1B76F]/20">
                    <QuantitySelector
                      value={item.quantity}
                      onChange={(quantity) => updateQuantity(item.productId, item.size, quantity)}
                    />
                    <p className="font-bold text-base text-[#E1B76F]">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Sidebar Summary */}
          <aside className="h-fit rounded-2xl border border-[#E1B76F]/25 bg-[#340402] p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[#E1B76F] border-b border-[#E1B76F]/20 pb-3">Order Summary</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between text-[#E1B76F]/70">
                <span>Subtotal</span>
                <span className="font-bold text-[#E1B76F]">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-[#E1B76F]/70">
                <span>Estimated Shipping</span>
                {shippingFee === null ? (
                  <span className="h-4 w-14 animate-pulse rounded bg-[#2d0302]" />
                ) : shippingFee === 0 ? (
                  <span className="text-[#E1B76F] font-bold">Free</span>
                ) : (
                  <span className="font-semibold text-[#E1B76F]">{formatPrice(shippingFee)}</span>
                )}
              </div>
              {subtotal < 3000 ? (
                <div className="rounded-lg bg-[#2d0302] border border-[#E1B76F]/30 p-2.5 text-xs text-[#f0d29d]">
                  Add <strong>{formatPrice(3000 - subtotal)}</strong> more to get <strong>FREE Delivery</strong>!
                </div>
              ) : (
                <div className="rounded-lg bg-[#2d0302] border border-emerald-500/40 p-2.5 text-xs text-emerald-300 font-medium">
                  🎉 You unlocked Free Delivery!
                </div>
              )}
              <div className="border-t border-[#E1B76F]/20 pt-3 text-base font-bold text-[#E1B76F]">
                <div className="flex items-center justify-between">
                  <span>Estimated Total</span>
                  <span>{formatPrice(subtotal + (shippingFee ?? 0))}</span>
                </div>
              </div>
            </div>
            <Link
              href="/checkout"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#400604] border border-[#E1B76F]/50 py-3.5 text-sm font-bold text-[#E1B76F] transition hover:bg-[#520805] shadow-sm"
            >
              Proceed to Checkout <ArrowRight className="h-4 w-4" />
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
