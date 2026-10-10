"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle, ChevronRight, CreditCard, Lock, Package, ShoppingBag, Truck } from "lucide-react";
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
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "sslcommerz">("cod");

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

    const isInsideDhaka =
      watchedDistrict.trim().toLowerCase() === "dhaka" ||
      watchedDistrict.trim().toLowerCase() === "dhaka city";
    if (subtotal >= 3000) {
      setShippingFee(0);
      return;
    }
    const fee = items.reduce((max, item) => {
      const itemFee = isInsideDhaka ? (item.deliveryInside ?? 60) : (item.deliveryOutside ?? 100);
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
          city: data.district,
          paymentMethod,
          items: items.map((item) => ({
            productId: item.productId,
            name: item.name,
            size: item.size,
            quantity: item.quantity,
            price: item.price,
          })),
          productIds: items.map((item) => item.productId),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setSubmitError(result.error || "Failed to submit order. Please try again.");
        return;
      }

      setOrderId(result.orderId);
      if (typeof result.shippingFee === "number") setConfirmedShippingFee(result.shippingFee);
      setSubmitted(true);
      clearCart();
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-white text-black">
        <div className="container mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle className="h-10 w-10" />
          </div>
          <h1 className="font-heading text-3xl font-black uppercase text-black">Order Confirmed!</h1>
          <p className="mt-3 text-base text-neutral-600">
            Thank you for your order.{" "}
            {orderId && <span className="font-bold text-black">Order #{orderId}</span>}{" "}
            has been placed successfully.
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Payment method: <strong className="text-black uppercase">{paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment (SSLCOMMERZ)"}</strong>
          </p>
          <p className="mt-2 text-sm text-neutral-500">We will contact you shortly to confirm delivery details.</p>
          {confirmedShippingFee !== null && (
            <p className="mt-2 text-sm text-neutral-700">
              Shipping charge:{" "}
              <span className="font-bold text-black">
                {confirmedShippingFee === 0 ? "Free" : formatPrice(confirmedShippingFee)}
              </span>
            </p>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-full bg-[#ffd800] px-8 py-3.5 text-sm font-bold text-black transition hover:bg-black hover:text-white"
            >
              <ShoppingBag className="h-4 w-4" />
              Continue Shopping
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-8 py-3.5 text-sm font-bold text-black transition hover:bg-neutral-100"
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
      <div className="min-h-screen bg-white text-black">
        <div className="container mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-20 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h2 className="font-heading text-2xl font-black uppercase text-black">Your bag is empty</h2>
          <p className="mt-2 text-sm text-neutral-500">Add products to your cart before checking out.</p>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#ffd800] px-8 py-3.5 text-sm font-bold text-black transition hover:bg-black hover:text-white"
          >
            Shop Now
          </Link>
        </div>
      </div>
    );
  }

  // ── Main checkout ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white text-black">
      {/* Breadcrumb */}
      <div className="border-b border-neutral-100 bg-[#fafafa]">
        <div className="container mx-auto max-w-[1300px] flex h-12 items-center gap-2 px-4 text-xs text-[#7a7a7a]">
          <Link href="/" className="transition hover:text-black">Home</Link>
          <ChevronRight className="h-3 w-3 opacity-60" />
          <Link href="/cart" className="transition hover:text-black">Bag</Link>
          <ChevronRight className="h-3 w-3 opacity-60" />
          <span className="font-semibold text-black">Checkout</span>
        </div>
      </div>

      <div className="container mx-auto max-w-[1300px] px-4 py-10 md:py-14">
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-black uppercase text-black md:text-3xl">Checkout</h1>
          <p className="mt-1 text-sm text-neutral-500">Complete your order with Cash on Delivery or SSLCOMMERZ Online Payment.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px]">
          {/* ── Left: Form ── */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* 1. Contact info */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 flex items-center gap-2.5 text-base font-bold text-black">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-[11px] font-bold text-white">1</span>
                Contact Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-700">Full Name *</label>
                  <input
                    placeholder="e.g. Shakib Ahmed"
                    className={`h-11 w-full rounded-xl border bg-neutral-50 px-4 text-sm text-black outline-none transition placeholder:text-neutral-400 focus:border-black focus:bg-white ${errors.fullName ? "border-red-400 bg-red-50" : "border-neutral-200"}`}
                    {...register("fullName", { required: "Full name is required" })}
                  />
                  {errors.fullName && <p className="mt-1.5 text-xs text-red-500">{errors.fullName.message}</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-700">Email *</label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      className={`h-11 w-full rounded-xl border bg-neutral-50 px-4 text-sm text-black outline-none transition placeholder:text-neutral-400 focus:border-black focus:bg-white ${errors.email ? "border-red-400 bg-red-50" : "border-neutral-200"}`}
                      {...register("email", {
                        required: "Email is required",
                        pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email" },
                      })}
                    />
                    {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-700">Phone *</label>
                    <input
                      placeholder="01XXXXXXXXX"
                      className={`h-11 w-full rounded-xl border bg-neutral-50 px-4 text-sm text-black outline-none transition placeholder:text-neutral-400 focus:border-black focus:bg-white ${errors.phone ? "border-red-400 bg-red-50" : "border-neutral-200"}`}
                      {...register("phone", { required: "Phone is required" })}
                    />
                    {errors.phone && <p className="mt-1.5 text-xs text-red-500">{errors.phone.message}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Shipping address */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 flex items-center gap-2.5 text-base font-bold text-black">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-[11px] font-bold text-white">2</span>
                Shipping Address
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-700">Street Address *</label>
                  <textarea
                    rows={2}
                    placeholder="House no, road, area, landmark…"
                    className={`w-full resize-none rounded-xl border bg-neutral-50 px-4 py-3 text-sm text-black outline-none transition placeholder:text-neutral-400 focus:border-black focus:bg-white ${errors.address ? "border-red-400 bg-red-50" : "border-neutral-200"}`}
                    {...register("address", { required: "Address is required" })}
                  />
                  {errors.address && <p className="mt-1.5 text-xs text-red-500">{errors.address.message}</p>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-700">District *</label>
                    <div className="relative">
                      <select
                        className={`h-11 w-full appearance-none rounded-xl border bg-neutral-50 px-4 pr-9 text-sm text-black outline-none transition focus:border-black focus:bg-white ${errors.district ? "border-red-400 bg-red-50" : "border-neutral-200"}`}
                        defaultValue=""
                        {...register("district", { required: "District is required" })}
                      >
                        <option value="" disabled className="text-neutral-400">Select district…</option>
                        {DIVISIONS.map((div) => (
                          <optgroup key={div.name} label={`── ${div.name} Division`} className="font-bold text-black">
                            {div.districts.map((d) => (
                              <option key={d} value={d} className="text-black">{d}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {errors.district && <p className="mt-1.5 text-xs text-red-500">{errors.district.message}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-700">Postal Code</label>
                    <input
                      placeholder="1200"
                      className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm text-black outline-none transition placeholder:text-neutral-400 focus:border-black focus:bg-white"
                      {...register("postalCode")}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Payment Method */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 flex items-center gap-2.5 text-base font-bold text-black">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-[11px] font-bold text-white">3</span>
                Payment Method
              </h2>
              <div className="space-y-3">
                {/* Option 1: Cash on Delivery */}
                <label
                  onClick={() => setPaymentMethod("cod")}
                  className={`flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition ${
                    paymentMethod === "cod"
                      ? "border-black bg-neutral-50 ring-1 ring-black"
                      : "border-neutral-200 bg-white hover:border-neutral-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_choice"
                    value="cod"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                    className="mt-1 h-4 w-4 accent-black"
                  />
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ffd800] text-black">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-black">Cash on Delivery (COD)</p>
                      <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-bold uppercase text-neutral-800">Popular</span>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-600">Pay cash upon delivery across all 64 districts in Bangladesh.</p>
                  </div>
                </label>

                {/* Option 2: Online Payment via SSLCOMMERZ */}
                <label
                  onClick={() => setPaymentMethod("sslcommerz")}
                  className={`flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition ${
                    paymentMethod === "sslcommerz"
                      ? "border-black bg-neutral-50 ring-1 ring-black"
                      : "border-neutral-200 bg-white hover:border-neutral-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_choice"
                    value="sslcommerz"
                    checked={paymentMethod === "sslcommerz"}
                    onChange={() => setPaymentMethod("sslcommerz")}
                    className="mt-1 h-4 w-4 accent-black"
                  />
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[#ffd800]">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-black">Online Payment (SSLCOMMERZ)</p>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">Secure</span>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-600">
                      Pay instantly with bKash, Nagad, Rocket, VISA, Mastercard, Amex, or Net Banking.
                    </p>
                    {/* Visual provider chips */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {["bKash", "Nagad", "Rocket", "VISA", "Mastercard", "Amex"].map((brand) => (
                        <span key={brand} className="inline-flex items-center rounded border border-neutral-200 bg-white px-2 py-0.5 text-[10.5px] font-semibold text-neutral-700 shadow-2xs">
                          {brand}
                        </span>
                      ))}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Error message */}
            {submitError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {submitError}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting || shippingFee === null}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#ffd800] py-4 text-sm font-bold text-black shadow-md transition hover:bg-black hover:text-white active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Lock className="h-4 w-4" />
              {isSubmitting ? "Placing Order…" : `Place Order · ${formatPrice(subtotal + SHIPPING_FEE)}`}
            </button>

            <p className="text-center text-xs text-neutral-500">
              By placing your order you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>

          {/* ── Right: Order Summary ── */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            {/* Items Card */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="text-base font-bold text-black">Order Summary</h3>
                <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="max-h-72 space-y-3.5 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.size}`} className="flex gap-3">
                    <div className="relative h-16 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                      {item.image && (
                        <Image src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <p className="line-clamp-2 text-[13px] font-normal leading-snug text-neutral-900">{item.name}</p>
                      <div className="flex items-center justify-between">
                        <span className="rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">
                          {item.size} × {item.quantity}
                        </span>
                        <span className="text-[13px] font-bold text-black">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-black">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" />
                    Shipping
                  </span>
                  {shippingFee === null ? (
                    <span className="h-4 w-16 animate-pulse rounded bg-neutral-100" />
                  ) : shippingFee === 0 ? (
                    <span className="font-bold text-emerald-600">Free</span>
                  ) : (
                    <span className="font-semibold text-black">{formatPrice(shippingFee)}</span>
                  )}
                </div>
                <div className="border-t border-neutral-100 pt-3">
                  <div className="flex justify-between text-base font-bold text-black">
                    <span>Total</span>
                    <span>{formatPrice(subtotal + SHIPPING_FEE)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-700">
                <Lock className="h-3.5 w-3.5 text-black" />
                SSL 256-bit Secure
              </div>
              <div className="h-4 w-px bg-neutral-200" />
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-700">
                <Truck className="h-3.5 w-3.5 text-black" />
                64 Districts COD
              </div>
              <div className="h-4 w-px bg-neutral-200" />
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-700">
                <CheckCircle className="h-3.5 w-3.5 text-black" />
                100% Authentic
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
