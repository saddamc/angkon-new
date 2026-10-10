"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle, ChevronRight, Lock, Package, ShoppingBag, Truck } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { formatPrice } from "@/utils/price";
import { DIVISIONS } from "@/data/bangladesh-districts";

interface CheckoutFormValues {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  district: string;
  postalCode: string;
}

export default function CheckoutPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [shippingFee, setShippingFee] = useState<number | null>(null);
  const [confirmedShippingFee, setConfirmedShippingFee] = useState<number | null>(null);
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.subtotal());
  const clearCart = useCartStore((state) => state.clearCart);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>();

  const watchedDistrict = watch("district");

  // Calculate delivery fee synchronously based on the items in the cart
  useEffect(() => {
    if (!watchedDistrict) {
      setShippingFee(0);
      return;
    }
    if (items.length === 0) {
      setShippingFee(0);
      return;
    }

    const isInsideDhaka = watchedDistrict.trim().toLowerCase() === "dhaka" || watchedDistrict.trim().toLowerCase() === "dhaka city";
    if (subtotal >= 3000) {
      setShippingFee(0);
      return;
    }
    const fee = items.reduce((max, item) => {
      const itemFee = isInsideDhaka ? (item.deliveryInside ?? 70) : (item.deliveryOutside ?? 130);
      return Math.max(max, itemFee);
    }, 0);
    
    setShippingFee(fee);
  }, [watchedDistrict, items, subtotal]);

  const SHIPPING_FEE = shippingFee ?? 0;

  const onSubmit = async (data: CheckoutFormValues) => {
    setSubmitError(null);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          city: data.district, // map district → city for billing
          items: items.map((item) => ({
            productId: item.productId,
            name: item.name,
            size: item.size,
            quantity: item.quantity,
            price: item.price,
          })),
          // Server uses these to recalculate shipping fresh from WP
          productIds: items.map((item) => item.productId),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setSubmitError(result.error || "Failed to submit order. Please try again.");
        return;
      }

      setOrderId(result.orderId);
      if (typeof result.shippingFee === 'number') setConfirmedShippingFee(result.shippingFee);
      setSubmitted(true);
      clearCart();
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#400604]">
        <div className="container flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[#5c0f0d] bg-[#2b0403]">
            <CheckCircle className="h-10 w-10 text-[#E1B76F]" />
          </div>
          <h1 className="font-heading text-3xl font-black uppercase text-[#E1B76F]">Order Confirmed!</h1>
          <p className="mt-3 text-base text-[#cbb18a]">
            Thank you for your order.{" "}
            {orderId && <span className="font-bold text-[#E1B76F]">Order #{orderId}</span>}{" "}
            has been placed successfully.
          </p>
          <p className="mt-2 text-sm text-[#cbb18a]/80">We will contact you shortly to confirm delivery details.</p>
          {confirmedShippingFee !== null && (
            <p className="mt-2 text-sm text-[#cbb18a]">
              Shipping charge:{" "}
              <span className="font-semibold text-[#E1B76F]">
                {confirmedShippingFee === 0 ? "Free" : formatPrice(confirmedShippingFee)}
              </span>
            </p>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-[12px] bg-[#E1B76F] px-8 py-3.5 text-sm font-bold text-[#400604] transition hover:bg-[#f3cb87]"
            >
              <ShoppingBag className="h-4 w-4" />
              Continue Shopping
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-[12px] border border-[#5c0f0d] bg-[#4a0705] px-8 py-3.5 text-sm font-bold text-[#E1B76F] transition hover:bg-[#2b0403]"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty cart guard ────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#400604]">
        <div className="container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[#5c0f0d] bg-[#2b0403]">
            <ShoppingBag className="h-8 w-8 text-[#cbb18a]" />
          </div>
          <h2 className="font-heading text-2xl font-black uppercase text-[#E1B76F]">Your cart is empty</h2>
          <p className="mt-2 text-sm text-[#cbb18a]">Add products to your cart before checking out.</p>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center gap-2 rounded-[12px] bg-[#E1B76F] px-8 py-3.5 text-sm font-bold text-[#400604] transition hover:bg-[#f3cb87]"
          >
            Shop Now
          </Link>
        </div>
      </div>
    );
  }

  // ── Main checkout ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#400604]">
      {/* Breadcrumb */}
      <div className="border-b border-[#5c0f0d] bg-[#2b0403]/80 backdrop-blur">
        <div className="container flex h-12 items-center gap-2 text-xs text-[#cbb18a]">
          <Link href="/" className="transition hover:text-[#E1B76F]">Home</Link>
          <ChevronRight className="h-3 w-3 opacity-60" />
          <Link href="/cart" className="transition hover:text-[#E1B76F]">Cart</Link>
          <ChevronRight className="h-3 w-3 opacity-60" />
          <span className="font-semibold text-[#E1B76F]">Checkout</span>
        </div>
      </div>

      <div className="container py-10 md:py-14">
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-black uppercase text-[#E1B76F] md:text-3xl">Checkout</h1>
          <p className="mt-1 text-sm text-[#cbb18a]">Complete your order — it only takes a minute.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
          {/* ── Left: Form ── */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* Contact info */}
            <div className="rounded-2xl border border-[#5c0f0d] bg-[#4a0705] p-6 shadow-xl">
              <h2 className="mb-5 flex items-center gap-2.5 text-base font-bold text-[#E1B76F]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E1B76F] text-[11px] font-bold text-[#400604]">1</span>
                Contact Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#cbb18a]">Full Name *</label>
                  <input
                    placeholder="e.g. Rahim Uddin"
                    className={`h-11 w-full rounded-xl border bg-[#2b0403] px-4 text-sm text-[#E1B76F] outline-none transition placeholder:text-[#cbb18a]/40 focus:border-[#E1B76F] focus:ring-1 focus:ring-[#E1B76F] ${errors.fullName ? "border-red-400 bg-red-950/30" : "border-[#5c0f0d]"}`}
                    {...register("fullName", { required: "Full name is required" })}
                  />
                  {errors.fullName && <p className="mt-1.5 text-xs text-red-400">{errors.fullName.message}</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#cbb18a]">Email *</label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      className={`h-11 w-full rounded-xl border bg-[#2b0403] px-4 text-sm text-[#E1B76F] outline-none transition placeholder:text-[#cbb18a]/40 focus:border-[#E1B76F] focus:ring-1 focus:ring-[#E1B76F] ${errors.email ? "border-red-400 bg-red-950/30" : "border-[#5c0f0d]"}`}
                      {...register("email", {
                        required: "Email is required",
                        pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email" },
                      })}
                    />
                    {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#cbb18a]">Phone *</label>
                    <input
                      placeholder="01XXXXXXXXX"
                      className={`h-11 w-full rounded-xl border bg-[#2b0403] px-4 text-sm text-[#E1B76F] outline-none transition placeholder:text-[#cbb18a]/40 focus:border-[#E1B76F] focus:ring-1 focus:ring-[#E1B76F] ${errors.phone ? "border-red-400 bg-red-950/30" : "border-[#5c0f0d]"}`}
                      {...register("phone", { required: "Phone is required" })}
                    />
                    {errors.phone && <p className="mt-1.5 text-xs text-red-400">{errors.phone.message}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping address */}
            <div className="rounded-2xl border border-[#5c0f0d] bg-[#4a0705] p-6 shadow-xl">
              <h2 className="mb-5 flex items-center gap-2.5 text-base font-bold text-[#E1B76F]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E1B76F] text-[11px] font-bold text-[#400604]">2</span>
                Shipping Address
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#cbb18a]">Street Address *</label>
                  <textarea
                    rows={2}
                    placeholder="House no, road, area…"
                    className={`w-full resize-none rounded-xl border bg-[#2b0403] px-4 py-3 text-sm text-[#E1B76F] outline-none transition placeholder:text-[#cbb18a]/40 focus:border-[#E1B76F] focus:ring-1 focus:ring-[#E1B76F] ${errors.address ? "border-red-400 bg-red-950/30" : "border-[#5c0f0d]"}`}
                    {...register("address", { required: "Address is required" })}
                  />
                  {errors.address && <p className="mt-1.5 text-xs text-red-400">{errors.address.message}</p>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#cbb18a]">District *</label>
                    <div className="relative">
                      <select
                        className={`h-11 w-full appearance-none rounded-xl border bg-[#2b0403] px-4 pr-9 text-sm text-[#E1B76F] outline-none transition focus:border-[#E1B76F] focus:ring-1 focus:ring-[#E1B76F] ${errors.district ? "border-red-400 bg-red-950/30" : "border-[#5c0f0d]"}`}
                        defaultValue=""
                        {...register("district", { required: "District is required" })}
                      >
                        <option value="" disabled className="bg-[#2b0403] text-[#cbb18a]">Select district…</option>
                        {DIVISIONS.map((div) => (
                          <optgroup key={div.name} label={`── ${div.name} Division`} className="bg-[#2b0403] font-bold text-[#E1B76F]">
                            {div.districts.map((d) => (
                              <option key={d} value={d} className="bg-[#2b0403] text-[#E1B76F]">{d}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#cbb18a]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                    {errors.district && <p className="mt-1.5 text-xs text-red-400">{errors.district.message}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#cbb18a]">Postal Code</label>
                    <input
                      placeholder="1200"
                      className="h-11 w-full rounded-xl border border-[#5c0f0d] bg-[#2b0403] px-4 text-sm text-[#E1B76F] outline-none transition placeholder:text-[#cbb18a]/40 focus:border-[#E1B76F] focus:ring-1 focus:ring-[#E1B76F]"
                      {...register("postalCode")}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="rounded-2xl border border-[#5c0f0d] bg-[#4a0705] p-6 shadow-xl">
              <h2 className="mb-5 flex items-center gap-2.5 text-base font-bold text-[#E1B76F]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E1B76F] text-[11px] font-bold text-[#400604]">3</span>
                Payment Method
              </h2>
              <div className="flex items-center gap-3 rounded-xl border border-[#5c0f0d] bg-[#2b0403] px-4 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#5c0f0d] bg-[#4a0705]">
                  <Truck className="h-4 w-4 text-[#E1B76F]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#E1B76F]">Cash on Delivery</p>
                  <p className="text-xs text-[#cbb18a]">Pay when your order arrives</p>
                </div>
                <div className="ml-auto h-4 w-4 rounded-full border-2 border-[#E1B76F] bg-[#E1B76F]" />
              </div>
            </div>

            {/* Error */}
            {submitError && (
              <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                {submitError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || shippingFee === null}
              className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#E1B76F] py-4 text-sm font-bold text-[#400604] shadow-lg transition hover:bg-[#f3cb87] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Lock className="h-4 w-4" />
              {isSubmitting ? "Placing Order…" : `Place Order · ${formatPrice(subtotal + SHIPPING_FEE)}`}
            </button>

            <p className="text-center text-xs text-[#cbb18a]/70">
              By placing your order you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>

          {/* ── Right: Order Summary ── */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            {/* Items */}
            <div className="rounded-2xl border border-[#5c0f0d] bg-[#4a0705] p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-[#E1B76F]">Order Summary</h3>
                <span className="rounded-full border border-[#5c0f0d] bg-[#2b0403] px-2.5 py-1 text-xs font-semibold text-[#cbb18a]">
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="max-h-72 space-y-4 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.size}`} className="flex gap-3">
                    <div className="relative h-16 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-[#5c0f0d] bg-[#2b0403]">
                      {item.image && (
                        <Image src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <p className="line-clamp-2 text-[13px] leading-snug text-[#E1B76F]">{item.name}</p>
                      <div className="flex items-center justify-between">
                        <span className="rounded-md border border-[#5c0f0d]/50 bg-[#2b0403] px-2 py-0.5 text-[11px] font-semibold text-[#cbb18a]">
                          {item.size} × {item.quantity}
                        </span>
                        <span className="text-[13px] font-semibold text-[#E1B76F]">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-5 shadow-xl">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-[#cbb18a]">
                  <span>Subtotal</span>
                  <span className="font-medium text-[#E1B76F]">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#cbb18a]">
                  <span className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" />
                    Shipping
                  </span>
                  {shippingFee === null ? (
                    <span className="h-4 w-16 animate-pulse rounded bg-[#400604]" />
                  ) : shippingFee === 0 ? (
                    <span className="font-semibold text-emerald-400">Free</span>
                  ) : (
                    <span className="font-medium text-[#E1B76F]">{formatPrice(shippingFee)}</span>
                  )}
                </div>
                <div className="border-t border-[#5c0f0d] pt-3">
                  <div className="flex justify-between text-base font-bold text-[#E1B76F]">
                    <span>Total</span>
                    <span>{formatPrice(subtotal + SHIPPING_FEE)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 rounded-xl border border-[#5c0f0d] bg-[#4a0705] px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11px] text-[#cbb18a]">
                <Lock className="h-3.5 w-3.5 text-[#E1B76F]" />
                Secure Checkout
              </div>
              <div className="h-4 w-px bg-[#5c0f0d]" />
              <div className="flex items-center gap-1.5 text-[11px] text-[#cbb18a]">
                <Truck className="h-3.5 w-3.5 text-[#E1B76F]" />
                Free Returns
              </div>
              <div className="h-4 w-px bg-[#5c0f0d]" />
              <div className="flex items-center gap-1.5 text-[11px] text-[#cbb18a]">
                <CheckCircle className="h-3.5 w-3.5 text-[#E1B76F]" />
                Authentic
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
