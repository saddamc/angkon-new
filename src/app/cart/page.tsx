"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trash2, ShoppingBag, ArrowRight, Tag, Loader2, CheckCircle2, X } from "lucide-react";
import { QuantitySelector } from "@/components/product/quantity-selector";
import { useCartStore } from "@/store/cart-store";
import { formatPrice } from "@/utils/price";
import { useShippingQuote } from "@/hooks/use-shipping-quote";

interface AppliedPromo {
  code: string;
  discount: number;
  description?: string;
}

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const subtotal = useCartStore((state) => state.subtotal());

  // Promo code state
  const [enablePromo, setEnablePromo] = useState(true);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);

  // Sync config and restore applied promo from localStorage
  useEffect(() => {
    fetch("/api/checkout/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (cfg && typeof cfg.enablePromoCodes === "boolean") {
          setEnablePromo(cfg.enablePromoCodes);
        }
      })
      .catch(() => {});

    try {
      const stored = localStorage.getItem("angkon_applied_promo");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.code) {
          setPromoInput(parsed.code);
          fetch("/api/promo/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: parsed.code, subtotal }),
          })
            .then((r) => r.json())
            .then((data) => {
              if (data?.valid) {
                setAppliedPromo({
                  code: data.code,
                  discount: Number(data.discount) || 0,
                  description: data.description,
                });
                setPromoMessage(data.message || `Promo code ${data.code} applied!`);
              } else {
                localStorage.removeItem("angkon_applied_promo");
                setAppliedPromo(null);
              }
            })
            .catch(() => {});
        }
      }
    } catch {
      /* ignore */
    }
  }, [subtotal]);

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = promoInput.trim().toUpperCase();
    if (!clean) return;
    setPromoLoading(true);
    setPromoError(null);
    setPromoMessage(null);
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: clean, subtotal }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.valid) {
        setAppliedPromo(null);
        try {
          localStorage.removeItem("angkon_applied_promo");
        } catch {
          /* ignore */
        }
        setPromoError(data.error || "Invalid or expired promo code.");
        return;
      }
      const item: AppliedPromo = {
        code: data.code,
        discount: Number(data.discount) || 0,
        description: data.description,
      };
      setAppliedPromo(item);
      setPromoMessage(data.message || `Promo code ${data.code} applied!`);
      try {
        localStorage.setItem("angkon_applied_promo", JSON.stringify(item));
      } catch {
        /* ignore */
      }
    } catch {
      setPromoError("Could not validate promo code. Please check your connection.");
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoMessage(null);
    setPromoError(null);
    try {
      localStorage.removeItem("angkon_applied_promo");
    } catch {
      /* ignore */
    }
  };

  const discountAmount = appliedPromo?.discount ?? 0;
  // Delivery depends on the district, which is chosen at checkout — so it isn't added here.
  // The quote is only used to tell the customer how close they are to free delivery.
  const { quote, loading: quoteLoading } = useShippingQuote(items, "", "", discountAmount);
  const estimatedTotal = Math.max(0, subtotal - discountAmount);

  if (items.length === 0) {
    return (
      <section className="container mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#340402] border border-[#E1B76F]/20 text-white">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h1 className="font-heading text-3xl font-black uppercase text-white">Your Bag is Empty</h1>
        <p className="mt-2 text-sm text-white/90">Discover our collection and return to checkout when you are ready.</p>
        <Link
          href="/products"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#400604] border border-[#E1B76F]/50 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-[#520805]"
        >
          Browse Collections <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-[#400604] text-white py-10 md:py-14">
      <div className="container mx-auto max-w-[1300px] px-4">
        <h1 className="font-heading text-3xl sm:text-4xl font-black text-white uppercase">Shopping Bag</h1>
        <p className="mt-1 text-sm text-white/90">Review your selected items before proceeding to checkout.</p>

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
                      <h2 className="font-semibold text-base text-white">{item.name}</h2>
                      <span className="inline-block mt-1 rounded bg-[#2d0302] border border-[#E1B76F]/30 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                        Size: {item.size}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId, item.size)}
                      className="rounded-full p-1.5 text-white/60 transition hover:bg-[#400604] hover:text-red-400"
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
                    <p className="font-bold text-base text-white">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Sidebar Summary */}
          <aside className="h-fit rounded-2xl border border-[#E1B76F]/25 bg-[#340402] p-6 shadow-sm">
            <h3 className="text-lg font-bold text-white border-b border-[#E1B76F]/20 pb-3">Order Summary</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between text-white/70">
                <span>Subtotal</span>
                <span className="font-bold text-white">{formatPrice(subtotal)}</span>
              </div>

              {appliedPromo && (
                <div className="flex items-center justify-between text-emerald-300 font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-emerald-400" /> Promo ({appliedPromo.code})
                    </span>
                    <button
                      type="button"
                      onClick={handleRemovePromo}
                      className="inline-flex items-center justify-center h-4 w-4 rounded-full text-white/50 hover:text-red-300 hover:bg-white/10 transition cursor-pointer"
                      title="Remove promo code"
                      aria-label="Remove promo code"
                    >
                      <X className="h-3 w-3 stroke-[2.5]" />
                    </button>
                  </div>
                  <span className="font-bold text-emerald-300">-{formatPrice(discountAmount)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-white/70">
                <span>Shipping</span>
                {quote?.freeByThreshold ? (
                  <span className="text-white font-bold">Free</span>
                ) : quoteLoading && !quote ? (
                  <span className="h-4 w-14 animate-pulse rounded bg-[#2d0302]" />
                ) : (
                  <span className="text-white/60">Calculated at checkout</span>
                )}
              </div>

              {quote && !quote.freeByThreshold && (
                <p className="text-xs text-white/60">Delivery fee depends on your district and is shown at checkout.</p>
              )}

              {quote?.amountToFreeDelivery != null && (
                <div className="rounded-lg bg-[#2d0302] border border-[#E1B76F]/30 p-2.5 text-xs text-white/90">
                  Add <strong>{formatPrice(quote.amountToFreeDelivery)}</strong> more to get <strong>FREE Delivery</strong>!
                </div>
              )}

              {quote?.freeByThreshold && (
                <div className="rounded-lg bg-[#2d0302] border border-emerald-500/40 p-2.5 text-xs text-emerald-300 font-medium">
                  🎉 You unlocked Free Delivery!
                </div>
              )}

              {/* Promo Code Input Box (if enabled by admin and no promo currently applied) */}
              {enablePromo && !appliedPromo && (
                <div className="pt-2 border-t border-[#E1B76F]/15">
                  <form onSubmit={handleApplyPromo} className="space-y-1.5">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
                        <input
                          type="text"
                          placeholder="Promo code (e.g. ANGKON10)"
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                          className="w-full rounded-xl border border-[#E1B76F]/30 bg-[#2d0302] pl-8 pr-3 py-2 text-xs font-mono font-bold uppercase tracking-wider text-white placeholder:text-white/40 focus:border-[#E1B76F] focus:outline-none"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={promoLoading || !promoInput.trim()}
                        className="rounded-xl border border-[#E1B76F]/50 bg-[#400604] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#520805] disabled:opacity-40"
                      >
                        {promoLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#E1B76F]" />
                        ) : (
                          "Apply"
                        )}
                      </button>
                    </div>
                    {promoError && (
                      <p className="text-[11.5px] text-red-300 font-medium">{promoError}</p>
                    )}
                  </form>
                </div>
              )}

              <div className="border-t border-[#E1B76F]/20 pt-3 text-base font-bold text-white">
                <div className="flex items-center justify-between">
                  <span>Total (excl. delivery)</span>
                  <span>{formatPrice(estimatedTotal)}</span>
                </div>
              </div>
            </div>

            <Link
              href="/checkout"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#400604] border border-[#E1B76F]/50 py-3.5 text-sm font-bold text-white transition hover:bg-[#520805] shadow-sm"
            >
              Proceed to Checkout <ArrowRight className="h-4 w-4" />
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
