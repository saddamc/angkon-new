"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  CheckCircle,
  ChevronRight,
  CreditCard,
  Lock,
  ShoppingBag,
  Truck,
  ArrowRight,
  Tag,
  User,
  AlertCircle,
} from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { formatPrice } from "@/utils/price";
import { DIVISIONS } from "@/data/bangladesh-districts";

interface CheckoutFormValues {
  name: string;
  streetAddress: string;
  apartment?: string;
  city: string;
  district: string;
  postcode?: string;
  phone: string;
  email: string;
  orderNotes?: string;
}

export default function CheckoutPage() {
  const [mounted, setMounted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [shippingFee, setShippingFee] = useState<number>(60);
  const [confirmedShippingFee, setConfirmedShippingFee] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "sslcommerz">("cod");

  // Accordion toggles for top notice bars (matches WooCommerce layout in screenshot)
  const [showLogin, setShowLogin] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);

  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.subtotal());
  const clearCart = useCartStore((state) => state.clearCart);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>();

  const watchedDistrict = watch("district");

  // Calculate delivery fee synchronously based on chosen district & cart items
  useEffect(() => {
    if (subtotal >= 3000) {
      setShippingFee(0);
      return;
    }
    if (!watchedDistrict) {
      setShippingFee(60);
      return;
    }

    const isInsideDhaka =
      watchedDistrict.trim().toLowerCase() === "dhaka" ||
      watchedDistrict.trim().toLowerCase() === "dhaka city";

    const fee = items.reduce((max, item) => {
      const itemFee = isInsideDhaka ? (item.deliveryInside ?? 60) : (item.deliveryOutside ?? 100);
      return Math.max(max, itemFee);
    }, isInsideDhaka ? 60 : 100);

    setShippingFee(fee);
  }, [watchedDistrict, items, subtotal]);

  const SHIPPING_FEE = shippingFee;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    if (couponCode.trim().toUpperCase() === "ANGKON" || couponCode.trim().toUpperCase() === "WELCOME10") {
      setCouponApplied(true);
      setCouponMessage("Coupon applied successfully!");
    } else {
      setCouponMessage("Invalid coupon code. Please try another.");
    }
  };

  const onSubmit = async (data: CheckoutFormValues) => {
    setSubmitError(null);
    try {
      const fullAddress = data.apartment ? `${data.streetAddress}, ${data.apartment}` : data.streetAddress;
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: data.name,
          address: fullAddress,
          city: data.city || data.district,
          district: data.district,
          postalCode: data.postcode || "",
          phone: data.phone,
          email: data.email,
          orderNotes: data.orderNotes || "",
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

  // ── 1. Hydration loading skeleton ──────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#400604] text-[#E1B76F]">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="h-5 w-36 rounded bg-[#340402] animate-pulse mb-6" />
          <div className="h-12 w-full rounded bg-[#340402] animate-pulse mb-4" />
          <div className="h-12 w-full rounded bg-[#340402] animate-pulse mb-10" />
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10">
            <div className="h-[500px] rounded-xl bg-[#340402] animate-pulse" />
            <div className="h-[400px] rounded-xl bg-[#340402] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ── 2. Order Success Screen ────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#400604] text-[#E1B76F]">
        <div className="container mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#340402] border border-[#E1B76F]/30 text-[#E1B76F] shadow-lg">
            <CheckCircle className="h-10 w-10 text-[#E1B76F]" />
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black uppercase text-[#E1B76F] tracking-wide">
            Order Confirmed!
          </h1>
          <p className="mt-3 text-base text-[#f0d29d]">
            Thank you for shopping with <strong className="text-[#E1B76F]">ANGKON</strong>.{" "}
            {orderId && <span className="font-bold text-[#E1B76F]">Order #{orderId}</span>}{" "}
            has been placed successfully.
          </p>
          <div className="mt-4 rounded-xl border border-[#E1B76F]/25 bg-[#340402] p-5 text-left w-full space-y-2 text-sm text-[#f0d29d]">
            <p>
              <span className="text-[#E1B76F]/70">Payment method:</span>{" "}
              <strong className="text-[#E1B76F] uppercase">
                {paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment (SSLCOMMERZ)"}
              </strong>
            </p>
            {confirmedShippingFee !== null && (
              <p>
                <span className="text-[#E1B76F]/70">Shipment fee:</span>{" "}
                <strong className="text-[#E1B76F]">
                  {confirmedShippingFee === 0 ? "Free" : formatPrice(confirmedShippingFee)}
                </strong>
              </p>
            )}
            <p className="text-xs text-[#E1B76F]/70 pt-2 border-t border-[#E1B76F]/15">
              Our support team will contact you shortly to verify delivery details.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#E1B76F] px-8 py-3.5 text-sm font-bold text-[#400604] transition hover:bg-[#f3cb87] shadow-md"
            >
              <ShoppingBag className="h-4 w-4" />
              Continue Shopping
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#E1B76F]/40 bg-[#340402] px-8 py-3.5 text-sm font-bold text-[#E1B76F] transition hover:bg-[#520805]"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── 3. Empty Bag Screen ────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#400604] text-[#E1B76F]">
        {/* Top Breadcrumb */}
        <div className="border-b border-[#E1B76F]/20 bg-[#340402]">
          <div className="mx-auto max-w-[1240px] flex h-11 items-center gap-2 px-4 sm:px-6 lg:px-8 text-xs text-[#E1B76F]/70">
            <Link href="/" className="transition hover:text-white">Home</Link>
            <ChevronRight className="h-3 w-3 opacity-60" />
            <Link href="/cart" className="transition hover:text-white">Bag</Link>
            <ChevronRight className="h-3 w-3 opacity-60" />
            <span className="font-semibold text-[#E1B76F]">Checkout</span>
          </div>
        </div>

        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-10 md:py-16">
          <h1 className="font-heading text-3xl font-black uppercase text-[#E1B76F] tracking-wide mb-6">
            Checkout
          </h1>

          {/* WooCommerce notice format from checkout-2.png */}
          <div className="rounded-xl border border-[#E1B76F]/30 bg-[#340402] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#400604] border border-[#E1B76F]/40 text-[#E1B76F]">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#E1B76F]">Your cart is currently empty.</h2>
                <p className="text-sm text-[#f0d29d] mt-1">
                  Checkout is not available whilst your cart is empty.
                </p>
              </div>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#E1B76F] px-8 py-3 text-sm font-bold text-[#400604] transition hover:bg-[#f3cb87] shadow-md shrink-0"
            >
              Return to shop <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── 4. Main Checkout Flow (Matches user's exact uploaded image media_1791707266338_f9a5afd9.png) ──
  return (
    <div className="min-h-screen bg-[#400604] text-[#E1B76F]">
      {/* Top Breadcrumb */}
      <div className="border-b border-[#E1B76F]/20 bg-[#340402]">
        <div className="mx-auto max-w-[1240px] flex h-11 items-center gap-2 px-4 sm:px-6 lg:px-8 text-xs text-[#E1B76F]/70">
          <Link href="/" className="transition hover:text-white">Home</Link>
          <ChevronRight className="h-3 w-3 opacity-60" />
          <Link href="/cart" className="transition hover:text-white">Bag</Link>
          <ChevronRight className="h-3 w-3 opacity-60" />
          <span className="font-semibold text-[#E1B76F]">Checkout</span>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-8 md:py-12">

        {/* ── Top Notice 1: Returning customer? Click here to login ── */}
        <div className="mb-4">
          <div className="border-t-2 border-[#E1B76F] border-b border-[#E1B76F]/20 bg-[#340402] px-4 py-3.5 text-sm text-[#f0d29d] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-[#E1B76F] text-base leading-none">▢</span>
              <span>
                Returning customer?{" "}
                <button
                  type="button"
                  onClick={() => setShowLogin((v) => !v)}
                  className="text-[#E1B76F] underline underline-offset-2 hover:text-white transition font-medium cursor-pointer"
                >
                  Click here to login
                </button>
              </span>
            </div>
          </div>

          {/* Expandable login box */}
          {showLogin && (
            <div className="mt-2 p-5 rounded-xl border border-[#E1B76F]/25 bg-[#2d0302] animate-in fade-in slide-in-from-top-1 duration-150">
              <p className="text-xs text-[#f0d29d] mb-4">
                If you have shopped with us before, please enter your details below. If you are a new customer, please proceed to the Billing section.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 max-w-lg mb-3">
                <input
                  type="text"
                  placeholder="Username or email *"
                  className="h-10 rounded-lg border border-[#E1B76F]/30 bg-[#340402] px-3 text-xs text-[#E1B76F] outline-none placeholder:text-[#E1B76F]/40 focus:border-[#E1B76F]"
                />
                <input
                  type="password"
                  placeholder="Password *"
                  className="h-10 rounded-lg border border-[#E1B76F]/30 bg-[#340402] px-3 text-xs text-[#E1B76F] outline-none placeholder:text-[#E1B76F]/40 focus:border-[#E1B76F]"
                />
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="rounded-lg bg-[#E1B76F] text-[#400604] px-5 py-2 text-xs font-bold uppercase hover:bg-[#f3cb87] transition cursor-pointer"
                >
                  Login
                </button>
                <Link href="/my-account" className="text-xs text-[#E1B76F] hover:underline">
                  Lost your password?
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── Top Notice 2: Have a coupon? Click here to enter your code ── */}
        <div className="mb-6">
          <div className="border-t-2 border-[#E1B76F] border-b border-[#E1B76F]/20 bg-[#340402] px-4 py-3.5 text-sm text-[#f0d29d] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-[#E1B76F] text-base leading-none">▢</span>
              <span>
                Have a coupon?{" "}
                <button
                  type="button"
                  onClick={() => setShowCoupon((v) => !v)}
                  className="text-[#E1B76F] underline underline-offset-2 hover:text-white transition font-medium cursor-pointer"
                >
                  Click here to enter your code
                </button>
              </span>
            </div>
          </div>

          {/* Expandable coupon input */}
          {showCoupon && (
            <form onSubmit={handleApplyCoupon} className="mt-2 p-5 rounded-xl border border-[#E1B76F]/25 bg-[#2d0302] animate-in fade-in slide-in-from-top-1 duration-150">
              <p className="text-xs text-[#f0d29d] mb-3">If you have a coupon code, please apply it below.</p>
              <div className="flex flex-col sm:flex-row items-stretch gap-2.5 max-w-md">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Coupon code"
                  className="h-10 flex-1 rounded-lg border border-[#E1B76F]/30 bg-[#340402] px-3 text-xs text-[#E1B76F] outline-none placeholder:text-[#E1B76F]/40 focus:border-[#E1B76F] uppercase"
                />
                <button
                  type="submit"
                  className="h-10 rounded-lg bg-[#E1B76F] text-[#400604] px-5 text-xs font-bold uppercase hover:bg-[#f3cb87] transition cursor-pointer"
                >
                  Apply coupon
                </button>
              </div>
              {couponMessage && (
                <p className={`mt-2 text-xs font-medium ${couponApplied ? "text-emerald-400" : "text-amber-300"}`}>
                  {couponMessage}
                </p>
              )}
            </form>
          )}
        </div>

        {/* ── Social Login Row (from screenshot) ── */}
        <div className="mb-8">
          <p className="text-xs sm:text-sm text-[#f0d29d] mb-2.5">Login with your Facebook or Google account</p>
          <div className="flex items-center gap-2">
            {/* Facebook button */}
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded bg-[#1877F2] text-white hover:opacity-90 transition cursor-pointer shadow-sm"
              aria-label="Login with Facebook"
            >
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </button>
            {/* Google button */}
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded border border-[#E1B76F]/30 bg-white hover:bg-gray-50 transition cursor-pointer shadow-sm"
              aria-label="Login with Google"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.25 21.31 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.6H1.26C.46 8.2.01 10.04.01 12c0 1.96.45 3.8 1.25 5.4l4.02-3.13z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.69 1.26 6.6l4.02 3.13c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Main Form + Your Order 2-Column Grid ── */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] xl:grid-cols-[1.15fr_0.85fr]">

            {/* ── Left Column: Billing details ── */}
            <div>
              <div className="border-b border-[#E1B76F]/20 pb-2 mb-6">
                <h2 className="text-xl sm:text-2xl font-heading font-bold text-[#E1B76F]">
                  Billing details
                </h2>
              </div>

              <div className="space-y-4">
                {/* Name * */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#E1B76F]">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    placeholder=""
                    className={`h-11 w-full rounded-md border bg-[#2d0302] px-3.5 text-sm text-[#E1B76F] outline-none transition placeholder:text-[#E1B76F]/40 focus:border-[#E1B76F] ${
                      errors.name ? "border-red-400 bg-red-950/20" : "border-[#E1B76F]/30"
                    }`}
                    {...register("name", { required: "Name is required" })}
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
                </div>

                {/* Country / Region */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#E1B76F]">
                    Country / Region <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      disabled
                      defaultValue="BD"
                      className="h-11 w-full appearance-none rounded-md border border-[#E1B76F]/30 bg-[#2d0302] px-3.5 pr-9 text-sm text-[#E1B76F] outline-none cursor-not-allowed opacity-90"
                    >
                      <option value="BD">Bangladesh</option>
                    </select>
                    <svg
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#E1B76F]/60"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Street address * */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-semibold text-[#E1B76F]">
                    Street address <span className="text-red-400">*</span>
                  </label>
                  <input
                    placeholder="House number and street name"
                    className={`h-11 w-full rounded-md border bg-[#2d0302] px-3.5 text-sm text-[#E1B76F] outline-none transition placeholder:text-[#E1B76F]/40 focus:border-[#E1B76F] ${
                      errors.streetAddress ? "border-red-400 bg-red-950/20" : "border-[#E1B76F]/30"
                    }`}
                    {...register("streetAddress", { required: "Street address is required" })}
                  />
                  {errors.streetAddress && (
                    <p className="text-xs text-red-400">{errors.streetAddress.message}</p>
                  )}
                  <input
                    placeholder="Apartment, suite, unit, etc. (optional)"
                    className="h-11 w-full rounded-md border border-[#E1B76F]/30 bg-[#2d0302] px-3.5 text-sm text-[#E1B76F] outline-none transition placeholder:text-[#E1B76F]/40 focus:border-[#E1B76F]"
                    {...register("apartment")}
                  />
                </div>

                {/* Town / City * */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#E1B76F]">
                    Town / City <span className="text-red-400">*</span>
                  </label>
                  <input
                    placeholder=""
                    className={`h-11 w-full rounded-md border bg-[#2d0302] px-3.5 text-sm text-[#E1B76F] outline-none transition placeholder:text-[#E1B76F]/40 focus:border-[#E1B76F] ${
                      errors.city ? "border-red-400 bg-red-950/20" : "border-[#E1B76F]/30"
                    }`}
                    {...register("city", { required: "Town / City is required" })}
                  />
                  {errors.city && <p className="mt-1 text-xs text-red-400">{errors.city.message}</p>}
                </div>

                {/* District * */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#E1B76F]">
                    District <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      className={`h-11 w-full appearance-none rounded-md border bg-[#2d0302] px-3.5 pr-9 text-sm text-[#E1B76F] outline-none transition focus:border-[#E1B76F] ${
                        errors.district ? "border-red-400 bg-red-950/20" : "border-[#E1B76F]/30"
                      }`}
                      defaultValue=""
                      {...register("district", { required: "District is required" })}
                    >
                      <option value="" disabled className="text-[#E1B76F]/40 bg-[#2d0302]">
                        Select an option…
                      </option>
                      {DIVISIONS.map((div) => (
                        <optgroup
                          key={div.name}
                          label={`── ${div.name} Division`}
                          className="font-bold text-[#E1B76F] bg-[#340402]"
                        >
                          {div.districts.map((d) => (
                            <option key={d} value={d} className="text-[#E1B76F] bg-[#2d0302]">
                              {d}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <svg
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#E1B76F]/60"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {errors.district && <p className="mt-1 text-xs text-red-400">{errors.district.message}</p>}
                </div>

                {/* Postcode / ZIP (optional) */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#E1B76F]">
                    Postcode / ZIP (optional)
                  </label>
                  <input
                    placeholder="1234"
                    className="h-11 w-full rounded-md border border-[#E1B76F]/30 bg-[#2d0302] px-3.5 text-sm text-[#E1B76F] outline-none transition placeholder:text-[#E1B76F]/40 focus:border-[#E1B76F]"
                    {...register("postcode")}
                  />
                </div>

                {/* Phone * */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#E1B76F]">
                    Phone <span className="text-red-400">*</span>
                  </label>
                  <input
                    placeholder="01XXXXXXXXX"
                    className={`h-11 w-full rounded-md border bg-[#2d0302] px-3.5 text-sm text-[#E1B76F] outline-none transition placeholder:text-[#E1B76F]/40 focus:border-[#E1B76F] ${
                      errors.phone ? "border-red-400 bg-red-950/20" : "border-[#E1B76F]/30"
                    }`}
                    {...register("phone", {
                      required: "Phone is required",
                      pattern: {
                        value: /^(?:\+?88)?01[3-9]\d{8}$/,
                        message: "Enter a valid Bangladeshi phone number (e.g. 017XXXXXXXX)",
                      },
                    })}
                  />
                  {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone.message}</p>}
                </div>

                {/* Email address * */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#E1B76F]">
                    Email address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder=""
                    className={`h-11 w-full rounded-md border bg-[#2d0302] px-3.5 text-sm text-[#E1B76F] outline-none transition placeholder:text-[#E1B76F]/40 focus:border-[#E1B76F] ${
                      errors.email ? "border-red-400 bg-red-950/20" : "border-[#E1B76F]/30"
                    }`}
                    {...register("email", {
                      required: "Email is required",
                      pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email address" },
                    })}
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
                </div>

                {/* Additional information */}
                <div className="pt-4 border-t border-[#E1B76F]/15">
                  <h3 className="text-base font-heading font-bold text-[#E1B76F] mb-3">
                    Additional information
                  </h3>
                  <label className="mb-1.5 block text-xs font-semibold text-[#E1B76F]">
                    Order notes (optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Notes about your order, e.g. special notes for delivery."
                    className="w-full resize-none rounded-md border border-[#E1B76F]/30 bg-[#2d0302] px-3.5 py-2.5 text-sm text-[#E1B76F] outline-none transition placeholder:text-[#E1B76F]/40 focus:border-[#E1B76F]"
                    {...register("orderNotes")}
                  />
                </div>
              </div>
            </div>

            {/* ── Right Column: "Your order" (Matches exact card from screenshot) ── */}
            <div>
              <div className="rounded-xl border border-[#E1B76F]/30 bg-[#340402] p-6 sm:p-7 shadow-sm sticky top-24">
                <h3 className="text-xl font-heading font-bold text-[#E1B76F] mb-4">
                  Your order
                </h3>

                {/* Table Header: Product | Subtotal */}
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-[#E1B76F] pb-3 border-b border-[#E1B76F]/20">
                  <span>Product</span>
                  <span>Subtotal</span>
                </div>

                {/* Product Rows */}
                <div className="divide-y divide-[#E1B76F]/15">
                  {items.map((item) => (
                    <div
                      key={`${item.productId}-${item.size}`}
                      className="flex justify-between items-start py-3.5 gap-4"
                    >
                      <div className="flex gap-3 items-center min-w-0">
                        {item.image && (
                          <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded border border-[#E1B76F]/20 bg-[#2d0302]">
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                        )}
                        <span className="text-[13px] text-[#f0d29d] font-normal leading-snug">
                          {item.name} - {item.size} <strong className="text-[#E1B76F] whitespace-nowrap">× {item.quantity}</strong>
                        </span>
                      </div>
                      <span className="text-[13px] font-semibold text-[#E1B76F] shrink-0 whitespace-nowrap">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Subtotal Row */}
                <div className="flex justify-between items-center py-3.5 border-t border-b border-[#E1B76F]/20 text-sm">
                  <span className="font-medium text-[#E1B76F]">Subtotal</span>
                  <span className="font-semibold text-[#E1B76F]">{formatPrice(subtotal)}</span>
                </div>

                {/* Shipment Row */}
                <div className="flex justify-between items-center py-3.5 border-b border-[#E1B76F]/20 text-sm">
                  <span className="font-medium text-[#E1B76F]">Shipment</span>
                  <span className="text-right text-[#f0d29d]">
                    Flat rate: <strong className="text-[#E1B76F]">{SHIPPING_FEE === 0 ? "Free" : formatPrice(SHIPPING_FEE)}</strong>
                  </span>
                </div>

                {/* Total Row */}
                <div className="flex justify-between items-center py-4 border-b border-[#E1B76F]/25 text-base font-bold text-[#E1B76F]">
                  <span>Total</span>
                  <span className="text-xl text-[#E1B76F]">{formatPrice(subtotal + SHIPPING_FEE)}</span>
                </div>

                {/* ── Payment Options (inside "Your order" card) ── */}
                <div className="pt-5 space-y-3">
                  {/* Option 1: Cash on Delivery */}
                  <label
                    onClick={() => setPaymentMethod("cod")}
                    className={`block cursor-pointer rounded-lg border p-3.5 transition ${
                      paymentMethod === "cod"
                        ? "border-[#E1B76F] bg-[#400604]/80 ring-1 ring-[#E1B76F]"
                        : "border-[#E1B76F]/20 bg-[#2d0302] hover:border-[#E1B76F]/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="payment_method"
                        value="cod"
                        checked={paymentMethod === "cod"}
                        onChange={() => setPaymentMethod("cod")}
                        className="h-4 w-4 accent-[#E1B76F]"
                      />
                      <Truck className="h-4 w-4 text-[#E1B76F]" />
                      <span className="text-sm font-bold text-[#E1B76F]">Cash on Delivery (COD)</span>
                    </div>
                    {paymentMethod === "cod" && (
                      <p className="mt-2 text-xs text-[#f0d29d] pl-6 leading-relaxed">
                        Pay with cash upon delivery to your doorstep across all 64 districts in Bangladesh.
                      </p>
                    )}
                  </label>

                  {/* Option 2: SSLCOMMERZ Online Payment */}
                  <label
                    onClick={() => setPaymentMethod("sslcommerz")}
                    className={`block cursor-pointer rounded-lg border p-3.5 transition ${
                      paymentMethod === "sslcommerz"
                        ? "border-[#E1B76F] bg-[#400604]/80 ring-1 ring-[#E1B76F]"
                        : "border-[#E1B76F]/20 bg-[#2d0302] hover:border-[#E1B76F]/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="payment_method"
                          value="sslcommerz"
                          checked={paymentMethod === "sslcommerz"}
                          onChange={() => setPaymentMethod("sslcommerz")}
                          className="h-4 w-4 accent-[#E1B76F]"
                        />
                        <CreditCard className="h-4 w-4 text-[#E1B76F]" />
                        <span className="text-sm font-bold text-[#E1B76F]">Online Payment (SSLCOMMERZ)</span>
                      </div>
                      <span className="text-[10px] bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded font-bold uppercase">
                        Instant
                      </span>
                    </div>
                    {paymentMethod === "sslcommerz" && (
                      <div className="mt-2.5 pl-6 space-y-2">
                        <p className="text-xs text-[#f0d29d] leading-relaxed">
                          Pay securely with bKash, Nagad, Rocket, VISA, Mastercard, Amex, Upay, or Internet Banking.
                        </p>
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          {["bKash", "Nagad", "Rocket", "VISA", "Mastercard", "Amex"].map((brand) => (
                            <span
                              key={brand}
                              className="rounded border border-[#E1B76F]/30 bg-[#340402] px-2 py-0.5 text-[10px] font-bold text-[#E1B76F]"
                            >
                              {brand}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </label>
                </div>

                {/* Privacy policy agreement statement */}
                <p className="mt-5 text-[11px] text-[#f0d29d]/75 leading-relaxed">
                  Your personal data will be used to process your order, support your experience throughout this website, and for other purposes described in our{" "}
                  <Link href="/privacy-policy" className="text-[#E1B76F] underline hover:text-white">
                    privacy policy
                  </Link>.
                </p>

                {/* Submission Error message */}
                {submitError && (
                  <div className="mt-4 rounded-lg border border-red-500/50 bg-red-950/40 p-3 text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Place Order Button (matches screenshot style) */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-4 rounded-xl bg-[#E1B76F] text-[#400604] py-3.5 px-6 font-bold text-sm sm:text-base uppercase tracking-wider hover:bg-[#f3cb87] transition shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Lock className="h-4 w-4 text-[#400604]" />
                  {isSubmitting ? "Processing…" : "Place order"}
                </button>
              </div>
            </div>

          </div>
        </form>

      </div>
    </div>
  );
}
