"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
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
  UserPlus,
  LogIn,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { useShippingQuote } from "@/hooks/use-shipping-quote";
import { AuthModal, type AuthModalUser } from "@/components/checkout/auth-modal";
import { EmailVerifyDialog, requestEmailCode, type VerifiedUser } from "@/components/checkout/email-verify-dialog";
import { formatPrice } from "@/utils/price";
import { DIVISIONS } from "@/data/bangladesh-districts";
import { trackInitiateCheckout, trackPurchase } from "@/lib/fpixel";
import { playCheckoutSuccessSound } from "@/lib/sound-alert";

interface CheckoutFormValues {
  name: string;
  phone: string;
  email: string;
  streetAddress: string;
  district: string;
  city: string;
  postcode?: string;
  orderNotes?: string;
}

interface CheckoutConfig {
  requireEmailVerification: boolean;
  allowGuestCheckout?: boolean;
  enablePromoCodes?: boolean;
  user: {
    name: string;
    email: string;
    phone: string;
    emailVerified: boolean;
    address?: { address: string; city: string; district: string; postalCode?: string };
  } | null;
}

async function loadCheckoutConfig(): Promise<CheckoutConfig> {
  try {
    const res = await fetch("/api/checkout/config", { cache: "no-store" });
    if (res.ok) return (await res.json()) as CheckoutConfig;
  } catch {
    /* fall through */
  }
  return { requireEmailVerification: false, allowGuestCheckout: true, enablePromoCodes: true, user: null };
}

export default function CheckoutPage() {
  const [mounted, setMounted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [accountInfo, setAccountInfo] = useState<{
    status: "signed_in" | "created" | "existing" | "none";
    email: string;
    emailVerified: boolean;
  } | null>(null);

  // Submission & Confirmation state
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | number | null>(null);
  const [confirmedShippingFee, setConfirmedShippingFee] = useState<number | null>(null);
  const [confirmedSubtotal, setConfirmedSubtotal] = useState<number | null>(null);
  const [confirmedTotal, setConfirmedTotal] = useState<number | null>(null);
  const [confirmedDiscount, setConfirmedDiscount] = useState<number | null>(null);
  const [confirmedPromoCode, setConfirmedPromoCode] = useState<string | null>(null);
  const [confirmedCustomer, setConfirmedCustomer] = useState<{
    name: string;
    phone: string;
    address: string;
  } | null>(null);

  // Payment method: Cash on Delivery by default
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "sslcommerz">("cod");

  // Promo Code state
  const [couponCode, setCouponCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discount: number;
    description?: string;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Auth Modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<"login" | "register">("login");

  // Post-order guest account creation state
  const [postOrderPassword, setPostOrderPassword] = useState("");
  const [showPostPassword, setShowPostPassword] = useState(false);
  const [savingPostAccount, setSavingPostAccount] = useState(false);
  const [postAccountSuccess, setPostAccountSuccess] = useState(false);
  const [postAccountError, setPostAccountError] = useState<string | null>(null);

  // Cart store
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.subtotal());
  const clearCart = useCartStore((state) => state.clearCart);

  // Order submission in-flight flag
  const [placing, setPlacing] = useState(false);

  // Optional OTP verification fallback when server demands it
  const [verifyDialog, setVerifyDialog] = useState<{
    email: string;
    name: string;
    phone: string;
    resendAfter: number;
  } | null>(null);
  const pendingOrderValues = useRef<CheckoutFormValues | null>(null);

  // Checkout Config
  const [checkoutConfig, setCheckoutConfig] = useState<CheckoutConfig | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>({
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      streetAddress: "",
      district: "",
      city: "",
      postcode: "",
      orderNotes: "",
    },
  });

  const watchedDistrict = watch("district");
  const watchedCity = watch("city");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pre-fill user data when signed in
  useEffect(() => {
    let cancelled = false;
    void loadCheckoutConfig().then((cfg) => {
      if (cancelled) return;
      setCheckoutConfig(cfg);
      const u = cfg.user;
      if (!u) return;

      const fill = (field: keyof CheckoutFormValues, value?: string) => {
        if (value && !getValues(field)) setValue(field, value);
      };

      fill("name", u.name);
      fill("phone", u.phone);
      fill("email", u.email);
      fill("streetAddress", u.address?.address);
      fill("city", u.address?.city);
      fill("district", u.address?.district);
      fill("postcode", u.address?.postalCode);
    });
    return () => {
      cancelled = true;
    };
  }, [getValues, setValue]);

  // Delivery fee dynamically calculated from server
  const { quote: shippingQuote, loading: shippingLoading } = useShippingQuote(
    items,
    watchedDistrict,
    watchedCity,
    appliedPromo?.discount ?? 0,
  );
  const SHIPPING_FEE = shippingQuote?.zoneKnown ? shippingQuote.fee : 0;

  // Track InitiateCheckout on checkout mount
  useEffect(() => {
    if (items.length > 0) {
      trackInitiateCheckout({
        num_items: items.reduce((acc, i) => acc + i.quantity, 0),
        value: subtotal,
        currency: "BDT",
        content_ids: items.map((i) => i.productId),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore coupon from localStorage or Cart on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("angkon_applied_promo");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.code) {
          setCouponCode(parsed.code);
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
                setCouponMessage(data.message || `Promo code ${data.code} applied!`);
              } else {
                localStorage.removeItem("angkon_applied_promo");
              }
            })
            .catch(() => {});
        }
      }
    } catch {
      /* ignore */
    }
  }, [subtotal]);

  // Apply Coupon
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponMessage(null);
    setCouponError(null);
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.valid) {
        setAppliedPromo(null);
        localStorage.removeItem("angkon_applied_promo");
        setCouponError(data.error || "Invalid or expired promo code. Please try another.");
        return;
      }
      setAppliedPromo({
        code: data.code,
        discount: Number(data.discount) || 0,
        description: data.description,
      });
      localStorage.setItem(
        "angkon_applied_promo",
        JSON.stringify({ code: data.code, discount: data.discount, description: data.description })
      );
      setCouponMessage(data.message || `Promo code ${data.code} applied!`);
    } catch {
      setCouponError("Could not validate promo code. Please check your connection.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedPromo(null);
    setCouponCode("");
    setCouponMessage(null);
    setCouponError(null);
    try {
      localStorage.removeItem("angkon_applied_promo");
    } catch {
      /* ignore */
    }
  };

  const discountAmount = appliedPromo?.discount ?? 0;
  const FINAL_TOTAL = Math.max(0, subtotal - discountAmount) + SHIPPING_FEE;

  // Handle successful login or registration from AuthModal
  const handleAuthSuccess = (user: AuthModalUser) => {
    setCheckoutConfig((c) => ({
      requireEmailVerification: c?.requireEmailVerification ?? false,
      allowGuestCheckout: c?.allowGuestCheckout ?? true,
      enablePromoCodes: c?.enablePromoCodes ?? true,
      user: {
        name: user.name || getValues("name") || "",
        email: user.email,
        phone: user.phone || getValues("phone") || "",
        emailVerified: user.emailVerified,
        address: user.addresses?.[0]
          ? {
              address: user.addresses[0].address,
              city: user.addresses[0].city,
              district: user.addresses[0].district,
              postalCode: user.addresses[0].postalCode,
            }
          : undefined,
      },
    }));

    // Pre-populate fields if currently blank
    if (!getValues("email")) setValue("email", user.email);
    if (user.name && !getValues("name")) setValue("name", user.name);
    if (user.phone && !getValues("phone")) setValue("phone", user.phone);

    const savedAddr = user.addresses?.find((a) => a.isDefault) || user.addresses?.[0];
    if (savedAddr) {
      if (!getValues("streetAddress") && savedAddr.address) setValue("streetAddress", savedAddr.address);
      if (!getValues("city") && savedAddr.city) setValue("city", savedAddr.city);
      if (!getValues("district") && savedAddr.district) setValue("district", savedAddr.district);
      if (!getValues("postcode") && savedAddr.postalCode) setValue("postcode", savedAddr.postalCode);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      const cfg = await loadCheckoutConfig();
      setCheckoutConfig(cfg);
    }
  };

  // Submit Order
  const onSubmit = async (data: CheckoutFormValues) => {
    setPlacing(true);
    setSubmitError(null);
    try {
      const activeTestCode =
        (typeof window !== "undefined" && window.__angkon_meta_test_code) ||
        (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("test_event_code") || undefined : undefined);

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(activeTestCode ? { "x-meta-test-code": activeTestCode } : {}),
        },
        body: JSON.stringify({
          fullName: data.name,
          address: data.streetAddress,
          city: data.city || data.district,
          district: data.district,
          postalCode: data.postcode || "",
          phone: data.phone,
          email: data.email,
          orderNotes: data.orderNotes || "",
          paymentMethod,
          promoCode: appliedPromo?.code || "",
          discount: discountAmount,
          testEventCode: activeTestCode,
          items: items.map((item) => ({
            productId: item.productId,
            name: item.name,
            size: item.size,
            quantity: item.quantity,
            price: item.price,
            image: item.image,
            slug: item.slug,
          })),
          productIds: items.map((item) => item.productId),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.code === "EMAIL_VERIFICATION_REQUIRED") {
          pendingOrderValues.current = data;
          const sent = await requestEmailCode(data.email, data.name);
          setVerifyDialog({
            email: data.email,
            name: data.name,
            phone: data.phone,
            resendAfter: sent.ok ? sent.resendAfter : 60,
          });
          return;
        }
        if (result.code === "LOGIN_REQUIRED") {
          setSubmitError("Please log in or create an account to place this order.");
          setAuthModalView("login");
          setAuthModalOpen(true);
          return;
        }
        setSubmitError(result.error || "Failed to submit order. Please try again.");
        return;
      }

      setOrderId(result.orderNumber || result.orderId);
      if (result.account) setAccountInfo(result.account);
      if (typeof result.shippingFee === "number") setConfirmedShippingFee(result.shippingFee);
      if (typeof result.subtotal === "number") setConfirmedSubtotal(result.subtotal);
      if (typeof result.discount === "number") setConfirmedDiscount(result.discount);
      if (result.promoCode) setConfirmedPromoCode(result.promoCode);
      if (typeof result.total === "number") setConfirmedTotal(result.total);
      setConfirmedCustomer({
        name: data.name,
        phone: data.phone,
        address: `${data.streetAddress}, ${data.city || data.district}`,
      });

      if (result.gatewayUrl) {
        // Redirect customer to SSLCOMMERZ gateway for online card/MFS processing.
        // Purchase event will be tracked post-payment upon gateway validation, preventing false conversions.
        clearCart();
        try {
          localStorage.removeItem("angkon_applied_promo");
        } catch {
          /* ignore */
        }
        window.location.href = result.gatewayUrl;
        return;
      }

      setSubmitted(true);
      const confirmedOrderNum = result.orderNumber || result.orderId || orderId;
      trackPurchase({
        order_id: confirmedOrderNum,
        event_id: `order_${confirmedOrderNum}`,
        value: typeof result.total === "number" ? result.total : FINAL_TOTAL,
        currency: "BDT",
        num_items: items.reduce((acc, item) => acc + item.quantity, 0),
        content_ids: items.map((item) => item.productId),
        contents: items.map((item) => ({
          id: String(item.productId),
          quantity: item.quantity,
          item_price: item.price,
        })),
      });
      clearCart();
      try {
        localStorage.removeItem("angkon_applied_promo");
      } catch {
        /* ignore */
      }
      playCheckoutSuccessSound();
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setPlacing(false);
    }
  };

  // Fallback verification callback
  const handleVerifiedFallback = (user: VerifiedUser) => {
    setVerifyDialog(null);
    setCheckoutConfig((c) => ({
      requireEmailVerification: c?.requireEmailVerification ?? false,
      allowGuestCheckout: c?.allowGuestCheckout ?? true,
      enablePromoCodes: c?.enablePromoCodes ?? true,
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        emailVerified: true,
      },
    }));
    if (pendingOrderValues.current) {
      void onSubmit(pendingOrderValues.current);
    }
  };

  // Post-order guest account password save
  const handleSavePostAccountPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postOrderPassword || postOrderPassword.length < 6) {
      setPostAccountError("Password must be at least 6 characters.");
      return;
    }
    setSavingPostAccount(true);
    setPostAccountError(null);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: postOrderPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPostAccountError(data.error || "Could not save password. Please try again.");
        return;
      }
      setPostAccountSuccess(true);
    } catch {
      setPostAccountError("Network error. Please try again.");
    } finally {
      setSavingPostAccount(false);
    }
  };

  // ── 1. Hydration loading skeleton ──────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#400604] text-white">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="h-6 w-48 rounded-lg bg-[#340402] animate-pulse mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-[1.18fr_0.82fr] gap-10">
            <div className="space-y-4">
              <div className="h-32 rounded-2xl bg-[#340402] animate-pulse" />
              <div className="h-96 rounded-2xl bg-[#340402] animate-pulse" />
            </div>
            <div className="h-[480px] rounded-2xl bg-[#340402] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ── 2. Order Success Screen ────────────────────────────────────────────────
  if (submitted) {
    const isGuestOrder = !checkoutConfig?.user || accountInfo?.status === "created";
    const guestEmail = accountInfo?.email || confirmedCustomer?.phone || "your email";

    return (
      <div className="min-h-screen bg-[#400604] text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-xl text-center">
          {/* Success Icon */}
          <div className="mb-5 mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#340402] border-2 border-[#E1B76F] text-[#E1B76F] shadow-xl">
            <CheckCircle className="h-10 w-10 text-[#E1B76F]" />
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-bold uppercase tracking-wide text-white">
            Order Confirmed!
          </h1>
          <p className="mt-2 text-sm sm:text-base text-white/85">
            Thank you for shopping with <strong className="text-[#E1B76F]">ANGKON</strong>.{" "}
            {orderId && <span className="font-bold text-white">Order #{orderId}</span>} has been placed.
          </p>

          {/* Confirmed Details Card */}
          <div className="mt-6 rounded-2xl border border-[#E1B76F]/30 bg-[#2b0403] p-5 sm:p-7 text-left w-full space-y-3.5 text-sm text-white/90 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-[#E1B76F]/20">
              <span className="text-white/60 text-xs font-bold uppercase tracking-wider">Payment method</span>
              <strong className="text-white font-bold text-xs sm:text-sm">
                {paymentMethod === "cod" ? "Cash on Delivery (COD)" : "Online Payment (SSLCOMMERZ)"}
              </strong>
            </div>

            {confirmedSubtotal !== null && (
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-white/70">Items Subtotal:</span>
                <span className="text-white font-semibold">{formatPrice(confirmedSubtotal)}</span>
              </div>
            )}

            {confirmedShippingFee !== null && (
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-white/70">Delivery fee:</span>
                <strong className={confirmedShippingFee === 0 ? "text-emerald-400 font-bold" : "text-white font-semibold"}>
                  {confirmedShippingFee === 0 ? "৳0 (Free)" : formatPrice(confirmedShippingFee)}
                </strong>
              </div>
            )}

            {confirmedDiscount !== null && confirmedDiscount > 0 && (
              <div className="flex justify-between items-center text-xs sm:text-sm text-emerald-300">
                <span>Promo Discount ({confirmedPromoCode || "Applied"}):</span>
                <strong className="font-bold">-{formatPrice(confirmedDiscount)}</strong>
              </div>
            )}

            {confirmedTotal !== null && (
              <div className="flex justify-between items-center pt-3 border-t border-[#E1B76F]/20">
                <span className="font-bold text-white text-base">Total Amount:</span>
                <span className="text-xl font-bold text-[#E1B76F]">{formatPrice(confirmedTotal)}</span>
              </div>
            )}

            {confirmedCustomer && (
              <div className="pt-3 border-t border-[#E1B76F]/15 text-xs text-white/80 space-y-1">
                <p>
                  <strong className="text-white">Delivery to:</strong> {confirmedCustomer.name} (
                  <span className="text-[#E1B76F] font-semibold">{confirmedCustomer.phone}</span>)
                </p>
                <p className="text-white/70">{confirmedCustomer.address}</p>
              </div>
            )}

            <p className="text-[11px] text-white/60 pt-2 border-t border-[#E1B76F]/15">
              Our support team will contact you to confirm delivery dispatch.
            </p>
          </div>

          {/* ── Post-Order Guest Account Creation Card ── */}
          {isGuestOrder && (
            <div className="mt-5 rounded-2xl border border-[#E1B76F]/40 bg-[#1e0202] p-5 sm:p-6 text-left shadow-xl animate-in fade-in">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-[#E1B76F]" />
                <h3 className="font-bold text-white text-sm">Save your details for future orders</h3>
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                Create a password for <strong className="text-white">{guestEmail}</strong> to easily track this order and speed up future checkouts.
              </p>

              {postAccountSuccess ? (
                <div className="mt-3.5 flex items-center gap-2 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs font-semibold text-emerald-200">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Account secured! You are now logged in and can view all orders in My Account.</span>
                </div>
              ) : (
                <form onSubmit={handleSavePostAccountPassword} className="mt-3.5 space-y-2.5">
                  <div className="relative">
                    <input
                      type={showPostPassword ? "text" : "password"}
                      value={postOrderPassword}
                      onChange={(e) => setPostOrderPassword(e.target.value)}
                      placeholder="Create a password (min. 6 characters)"
                      className="h-10 w-full rounded-xl border border-[#E1B76F]/30 bg-[#2d0302] pl-3.5 pr-10 text-xs text-white placeholder:text-white/40 focus:border-[#E1B76F] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPostPassword(!showPostPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer"
                    >
                      {showPostPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {postAccountError && (
                    <p className="text-xs text-rose-300 font-medium">{postAccountError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={savingPostAccount || !postOrderPassword}
                    className="h-9 px-5 rounded-xl bg-[#E1B76F] text-[#400604] font-bold text-xs uppercase tracking-wider hover:bg-[#f3cb87] transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {savingPostAccount ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Password & Create Account"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#E1B76F] px-8 py-3 text-sm font-bold text-[#400604] hover:bg-[#f3cb87] transition shadow-md"
            >
              <ShoppingBag className="h-4 w-4" />
              Continue Shopping
            </Link>
            <Link
              href="/my-account"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#E1B76F]/40 bg-[#340402] px-8 py-3 text-sm font-bold text-white hover:bg-[#520805] transition"
            >
              View My Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── 3. Empty Bag Screen ────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#400604] text-white">
        <div className="border-b border-[#E1B76F]/20 bg-[#340402]">
          <div className="mx-auto max-w-[1240px] flex h-11 items-center gap-2 px-4 sm:px-6 lg:px-8 text-xs text-white/70">
            <Link href="/" className="transition hover:text-white">Home</Link>
            <ChevronRight className="h-3 w-3 opacity-60" />
            <Link href="/cart" className="transition hover:text-white">Bag</Link>
            <ChevronRight className="h-3 w-3 opacity-60" />
            <span className="font-semibold text-white">Checkout</span>
          </div>
        </div>

        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="font-serif text-3xl font-bold uppercase text-white tracking-wide mb-6">
            Checkout
          </h1>
          <div className="rounded-2xl border border-[#E1B76F]/30 bg-[#340402] p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#400604] border border-[#E1B76F]/40 text-white">
                <ShoppingBag className="h-7 w-7 text-[#E1B76F]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Your bag is currently empty.</h2>
                <p className="text-sm text-white/80 mt-1">
                  Add items to your bag before proceeding to checkout.
                </p>
              </div>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#E1B76F] px-8 py-3 text-sm font-bold text-[#400604] hover:bg-[#f3cb87] transition shadow-md shrink-0"
            >
              Explore Collection <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── 4. Main Checkout Flow ──────────────────────────────────────────────────
  const isLoggedIn = Boolean(checkoutConfig?.user);
  const loggedInEmail = checkoutConfig?.user?.email || "";
  const isEmailVerified = Boolean(checkoutConfig?.user?.emailVerified);

  return (
    <div className="min-h-screen bg-[#400604] text-white">
      {/* Top Breadcrumb */}
      <div className="border-b border-[#E1B76F]/20 bg-[#340402]">
        <div className="mx-auto max-w-[1240px] flex h-11 items-center gap-2 px-4 sm:px-6 lg:px-8 text-xs text-white/70">
          <Link href="/" className="transition hover:text-white">Home</Link>
          <ChevronRight className="h-3 w-3 opacity-60" />
          <Link href="/cart" className="transition hover:text-white">Bag</Link>
          <ChevronRight className="h-3 w-3 opacity-60" />
          <span className="font-semibold text-white">Checkout</span>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Header matching recommended design */}
        <div className="mb-6 pb-2 flex items-center justify-between border-b border-[#E1B76F]/20">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold uppercase tracking-wide text-white">
              Checkout
            </h1>
            <p className="mt-1 text-xs text-white/70 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#E1B76F]" />
              Secure checkout · Angkon
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-8 lg:grid-cols-[1.18fr_0.82fr] xl:grid-cols-[1.2fr_0.8fr] items-start">

            {/* ── LEFT COLUMN: Form Steps ── */}
            <div className="space-y-6">

              {/* ── CARD: Your account (Optional) — Exact match to screenshot ── */}
              <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#2b0403] p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                    Your account
                  </h2>
                  <span className="text-[11px] font-semibold text-white/50">
                    {isLoggedIn ? "Authenticated" : "Optional"}
                  </span>
                </div>

                {isLoggedIn ? (
                  /* Signed In State */
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-[#400604] border border-[#E1B76F]/40 flex items-center justify-center text-[#E1B76F]">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-white/70">Logged in as</p>
                        <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                          {loggedInEmail}
                          {isEmailVerified && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-bold text-emerald-300">
                              <CheckCircle className="h-3 w-3 text-emerald-400" />
                              Verified
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="text-xs text-[#E1B76F] hover:underline font-semibold cursor-pointer text-left sm:text-right"
                    >
                      Switch account / Log out
                    </button>
                  </div>
                ) : (
                  /* Guest State with Side-by-side Log in & Create account cards */
                  <div>
                    <p className="text-xs text-white/80 mb-3.5">
                      Already have an account?
                    </p>
                    <div className="grid grid-cols-2 gap-3 mb-2.5">
                      {/* Log in Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthModalView("login");
                          setAuthModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 h-11 rounded-xl border border-[#E1B76F]/30 bg-[#340402] hover:border-[#E1B76F] hover:bg-[#400604] text-xs font-bold text-white transition cursor-pointer shadow-2xs group"
                      >
                        <LogIn className="h-3.5 w-3.5 text-[#E1B76F] group-hover:translate-x-0.5 transition" />
                        <span>Log in</span>
                      </button>

                      {/* Create account Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthModalView("register");
                          setAuthModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 h-11 rounded-xl border border-[#E1B76F]/30 bg-[#340402] hover:border-[#E1B76F] hover:bg-[#400604] text-xs font-bold text-white transition cursor-pointer shadow-2xs group"
                      >
                        <UserPlus className="h-3.5 w-3.5 text-[#E1B76F] group-hover:scale-110 transition" />
                        <span>Create account</span>
                      </button>
                    </div>
                    <p className="text-[11.5px] text-white/50 leading-relaxed">
                      Or continue as a guest without creating an account.
                    </p>
                  </div>
                )}
              </div>

              {/* ── CARD: 1. Delivery details ── */}
              <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#2b0403] p-5 sm:p-6 shadow-sm space-y-4">
                <div className="border-b border-[#E1B76F]/20 pb-2 mb-2">
                  <h2 className="text-base font-serif font-bold text-white">
                    1. Delivery details
                  </h2>
                </div>

                {/* Name & Phone */}
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-white">
                      Full name <span className="text-[#E1B76F]">*</span>
                    </label>
                    <input
                      placeholder="Enter your name"
                      className={`h-11 w-full rounded-xl border bg-[#340402] px-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#E1B76F] ${
                        errors.name ? "border-rose-400 bg-rose-950/20" : "border-[#E1B76F]/30"
                      }`}
                      {...register("name", { required: "Full name is required" })}
                    />
                    {errors.name && <p className="mt-1 text-xs text-rose-300">{errors.name.message}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-white">
                      Phone number <span className="text-[#E1B76F]">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="01XXXXXXXXX"
                      className={`h-11 w-full rounded-xl border bg-[#340402] px-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#E1B76F] ${
                        errors.phone ? "border-rose-400 bg-rose-950/20" : "border-[#E1B76F]/30"
                      }`}
                      {...register("phone", {
                        required: "Phone number is required",
                        pattern: {
                          value: /^(?:\+?88)?01[3-9]\d{8}$/,
                          message: "Please enter a valid 11-digit Bangladeshi number (e.g. 017XXXXXXXX)",
                        },
                      })}
                    />
                    {errors.phone ? (
                      <p className="mt-1 text-xs text-rose-300">{errors.phone.message}</p>
                    ) : (
                      <p className="mt-1 text-[11px] text-white/50">
                        Delivery riders call this number to confirm delivery arrival.
                      </p>
                    )}
                  </div>
                </div>

                {/* Email address */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-white">
                    Email address <span className="text-[#E1B76F]">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={`h-11 w-full rounded-xl border bg-[#340402] px-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#E1B76F] ${
                      errors.email ? "border-rose-400 bg-rose-950/20" : "border-[#E1B76F]/30"
                    }`}
                    {...register("email", {
                      required: "Email is required",
                      pattern: { value: /^\S+@\S+\.\S+$/, message: "Please enter a valid email address" },
                    })}
                  />
                  {errors.email ? (
                    <p className="mt-1 text-xs text-rose-300">{errors.email.message}</p>
                  ) : (
                    <p className="mt-1 text-[11px] text-white/50">
                      Order invoice &amp; courier tracking updates are sent to this address.
                    </p>
                  )}
                </div>

                {/* Street address */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-white">
                    Street address <span className="text-[#E1B76F]">*</span>
                  </label>
                  <input
                    placeholder="House, road, area and landmark"
                    className={`h-11 w-full rounded-xl border bg-[#340402] px-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#E1B76F] ${
                      errors.streetAddress ? "border-rose-400 bg-rose-950/20" : "border-[#E1B76F]/30"
                    }`}
                    {...register("streetAddress", { required: "Street address is required" })}
                  />
                  {errors.streetAddress && (
                    <p className="mt-1 text-xs text-rose-300">{errors.streetAddress.message}</p>
                  )}
                </div>

                {/* District & City / Upazila */}
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-white">
                      District <span className="text-[#E1B76F]">*</span>
                    </label>
                    <div className="relative">
                      <select
                        className={`h-11 w-full appearance-none rounded-xl border bg-[#340402] px-3.5 pr-9 text-sm text-white outline-none transition focus:border-[#E1B76F] cursor-pointer ${
                          errors.district ? "border-rose-400 bg-rose-950/20" : "border-[#E1B76F]/30"
                        }`}
                        defaultValue=""
                        {...register("district", { required: "Please select your delivery district" })}
                      >
                        <option value="" disabled className="text-white/40 bg-[#2d0302]">
                          Select district
                        </option>
                        {DIVISIONS.map((div) => (
                          <optgroup
                            key={div.name}
                            label={`── ${div.name} Division`}
                            className="font-bold text-white bg-[#340402]"
                          >
                            {div.districts.map((d) => (
                              <option key={d} value={d} className="text-white bg-[#2d0302]">
                                {d}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <svg
                        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {errors.district && <p className="mt-1 text-xs text-rose-300">{errors.district.message}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-white">
                      City / Upazila <span className="text-[#E1B76F]">*</span>
                    </label>
                    <input
                      placeholder="Enter city or upazila"
                      className={`h-11 w-full rounded-xl border bg-[#340402] px-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#E1B76F] ${
                        errors.city ? "border-rose-400 bg-rose-950/20" : "border-[#E1B76F]/30"
                      }`}
                      {...register("city", { required: "City / Upazila is required" })}
                    />
                    {errors.city && <p className="mt-1 text-xs text-rose-300">{errors.city.message}</p>}
                  </div>
                </div>

                {/* Optional Order notes */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-white/80">
                    Order notes (optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Special instructions for delivery (e.g. call before arriving, landmark)"
                    className="w-full resize-none rounded-xl border border-[#E1B76F]/30 bg-[#340402] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#E1B76F]"
                    {...register("orderNotes")}
                  />
                </div>
              </div>

              {/* ── CARD: 2. Promo code ── */}
              {checkoutConfig?.enablePromoCodes !== false && (
                <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#2b0403] p-5 sm:p-6 shadow-sm">
                  <div className="border-b border-[#E1B76F]/20 pb-2 mb-3">
                    <h2 className="text-base font-serif font-bold text-white flex items-center gap-2">
                      <Tag className="h-4 w-4 text-[#E1B76F]" />
                      2. Promo code
                    </h2>
                    <p className="text-xs text-white/60 mt-0.5">
                      Have a coupon? Apply it here.
                    </p>
                  </div>

                  <div className="flex gap-2.5 max-w-md pt-1">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Enter promo code"
                      disabled={couponLoading || !!appliedPromo}
                      className="h-11 flex-1 rounded-xl border border-[#E1B76F]/30 bg-[#340402] px-3.5 text-xs text-white outline-none placeholder:text-white/35 focus:border-[#E1B76F] uppercase tracking-wider font-semibold disabled:opacity-60"
                    />
                    {appliedPromo ? (
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="h-11 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 px-5 text-xs font-bold uppercase hover:bg-rose-900 transition cursor-pointer"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                        className="h-11 rounded-xl bg-[#E1B76F] text-[#400604] px-6 text-xs font-bold uppercase tracking-wider hover:bg-[#f3cb87] transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {couponLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                      </button>
                    )}
                  </div>

                  {couponMessage && (
                    <p className="mt-2 text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      {couponMessage}
                    </p>
                  )}
                  {couponError && (
                    <p className="mt-2 text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                      {couponError}
                    </p>
                  )}
                </div>
              )}

              {/* ── CARD: 3. Payment method ── */}
              <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#2b0403] p-5 sm:p-6 shadow-sm space-y-3">
                <div className="border-b border-[#E1B76F]/20 pb-2 mb-2">
                  <h2 className="text-base font-serif font-bold text-white">
                    3. Payment method
                  </h2>
                </div>

                {/* Option 1: Cash on Delivery */}
                <label
                  onClick={() => setPaymentMethod("cod")}
                  className={`block cursor-pointer rounded-xl border p-4 transition ${
                    paymentMethod === "cod"
                      ? "border-[#E1B76F] bg-[#3a0604] ring-1 ring-[#E1B76F]/60"
                      : "border-[#E1B76F]/20 bg-[#340402] hover:border-[#E1B76F]/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment_method"
                      value="cod"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                      className="h-4 w-4 accent-[#E1B76F]"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Truck className="h-4 w-4 text-[#E1B76F]" />
                        Cash on Delivery
                      </p>
                      <p className="text-xs text-white/70 mt-0.5">
                        Pay when your order arrives.
                      </p>
                    </div>
                  </div>
                </label>

                {/* Option 2: Online payment SSLCOMMERZ */}
                <label
                  onClick={() => setPaymentMethod("sslcommerz")}
                  className={`block cursor-pointer rounded-xl border p-4 transition ${
                    paymentMethod === "sslcommerz"
                      ? "border-[#E1B76F] bg-[#3a0604] ring-1 ring-[#E1B76F]/60"
                      : "border-[#E1B76F]/20 bg-[#340402] hover:border-[#E1B76F]/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment_method"
                      value="sslcommerz"
                      checked={paymentMethod === "sslcommerz"}
                      onChange={() => setPaymentMethod("sslcommerz")}
                      className="h-4 w-4 accent-[#E1B76F]"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white flex items-center gap-1.5">
                        <CreditCard className="h-4 w-4 text-[#E1B76F]" />
                        Online payment
                      </p>
                      <p className="text-xs text-white/70 mt-0.5">
                        Pay securely through SSLCOMMERZ.
                      </p>
                    </div>
                  </div>
                  {paymentMethod === "sslcommerz" && (
                    <div className="mt-3 pl-7 flex flex-wrap gap-1.5">
                      {["bKash", "Nagad", "Rocket", "VISA", "Mastercard", "Amex"].map((brand) => (
                        <span
                          key={brand}
                          className="rounded-md border border-[#E1B76F]/30 bg-[#260302] px-2 py-0.5 text-[10px] font-bold text-white/90"
                        >
                          {brand}
                        </span>
                      ))}
                    </div>
                  )}
                </label>
              </div>

            </div>

            {/* ── RIGHT COLUMN: Sticky Order Summary ── */}
            <div className="lg:sticky lg:top-24">
              <div className="rounded-2xl border border-[#E1B76F]/30 bg-[#2b0403] p-6 sm:p-7 shadow-xl space-y-4">
                <h3 className="font-serif text-xl font-bold text-white pb-3 border-b border-[#E1B76F]/20">
                  Order summary
                </h3>

                {/* Line items thumbnail list */}
                <div className="divide-y divide-[#E1B76F]/15 max-h-[300px] overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div
                      key={`${item.productId}-${item.size}`}
                      className="flex justify-between items-center py-3 gap-3"
                    >
                      <div className="flex gap-3 items-center min-w-0">
                        {item.image && (
                          <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg border border-[#E1B76F]/30 bg-[#340402]">
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover object-top"
                              sizes="48px"
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                          <p className="text-[11px] text-white/60">
                            {item.size ? `Size: ${item.size} • ` : ""}Qty: {item.quantity}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-white shrink-0">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Subtotal */}
                <div className="flex justify-between items-center pt-3 border-t border-[#E1B76F]/20 text-xs sm:text-sm">
                  <span className="text-white/80">Subtotal</span>
                  <span className="font-semibold text-white">{formatPrice(subtotal)}</span>
                </div>

                {/* Delivery fee */}
                <div className="flex justify-between items-start gap-2 text-xs sm:text-sm">
                  <span className="text-white/80">Delivery</span>
                  <div className="text-right">
                    {!shippingQuote ? (
                      shippingLoading ? (
                        <span className="inline-block h-4 w-20 animate-pulse rounded bg-[#340402]" />
                      ) : (
                        <span className="text-white/50 text-xs">Calculated at order</span>
                      )
                    ) : !shippingQuote.zoneKnown ? (
                      <span className="text-white/60 text-xs">Select district</span>
                    ) : (
                      <>
                        <span className={shippingQuote.isFree ? "text-emerald-400 font-bold" : "text-white font-semibold"}>
                          {shippingQuote.isFree ? "৳0 (Free)" : formatPrice(shippingQuote.fee)}
                        </span>
                        {shippingQuote.amountToFreeDelivery !== null && (
                          <p className="text-[10px] text-[#E1B76F] mt-0.5">
                            Add {formatPrice(shippingQuote.amountToFreeDelivery)} more for free delivery
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Promo code discount line */}
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-xs sm:text-sm text-emerald-300">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5 text-emerald-400" /> Promo Discount
                    </span>
                    <span className="font-bold">-{formatPrice(discountAmount)}</span>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between items-center pt-4 border-t border-[#E1B76F]/20 text-base">
                  <span className="font-bold text-white">Total</span>
                  <span className="text-xl font-bold text-[#E1B76F]">{formatPrice(FINAL_TOTAL)}</span>
                </div>

                {/* Submission Error */}
                {submitError && (
                  <div className="rounded-xl border border-rose-500/50 bg-rose-950/40 p-3 text-xs text-rose-200 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Order CTA Button — Exact match to screenshot */}
                <button
                  type="submit"
                  disabled={isSubmitting || placing}
                  className="w-full h-12 rounded-xl bg-[#E1B76F] text-[#400604] font-bold text-sm uppercase tracking-wider hover:bg-[#f3cb87] active:scale-98 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting || placing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-[#400604]" />
                      <span>Placing Order…</span>
                    </>
                  ) : (
                    <span>Place order · {formatPrice(FINAL_TOTAL)}</span>
                  )}
                </button>

                {/* Trust Footer */}
                <p className="text-[11px] text-center text-white/55 flex items-center justify-center gap-1.5 pt-1">
                  <Lock className="h-3 w-3 text-[#E1B76F]" />
                  Your personal information is handled securely.
                </p>
              </div>
            </div>

          </div>
        </form>
      </div>

      {/* ── DEDICATED AUTH MODAL (Login / Register / OTP) ── */}
      <AuthModal
        isOpen={authModalOpen}
        initialView={authModalView}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* ── Fallback Verification Dialog (if server ever demands it) ── */}
      {verifyDialog && (
        <EmailVerifyDialog
          email={verifyDialog.email}
          name={verifyDialog.name}
          phone={verifyDialog.phone}
          initialResendAfter={verifyDialog.resendAfter}
          onVerified={handleVerifiedFallback}
          onClose={() => {
            pendingOrderValues.current = null;
            setVerifyDialog(null);
          }}
        />
      )}
    </div>
  );
}
