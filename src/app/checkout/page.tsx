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
  AlertCircle,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { useShippingQuote } from "@/hooks/use-shipping-quote";
import { EmailVerifyDialog, requestEmailCode, type VerifiedUser } from "@/components/checkout/email-verify-dialog";
import { formatPrice } from "@/utils/price";
import { DIVISIONS } from "@/data/bangladesh-districts";
import { playCheckoutSuccessSound } from "@/lib/sound-alert";

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

/** What the checkout needs from the server on load (see /api/checkout/config). */
interface CheckoutConfig {
  requireEmailVerification: boolean;
  user: {
    name: string;
    email: string;
    phone: string;
    emailVerified: boolean;
    address?: { address: string; city: string; district: string; postalCode?: string };
  } | null;
  allowGuestCheckout?: boolean;
  enablePromoCodes?: boolean;
}

/** Fresh config from the server. If it can't be read, assume verification is required (the server enforces it anyway). */
async function loadCheckoutConfig(): Promise<CheckoutConfig> {
  try {
    const res = await fetch("/api/checkout/config", { cache: "no-store" });
    if (res.ok) return (await res.json()) as CheckoutConfig;
  } catch {
    /* fall through */
  }
  return { requireEmailVerification: true, enablePromoCodes: true, user: null };
}

export default function CheckoutPage() {
  const [mounted, setMounted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [accountInfo, setAccountInfo] = useState<{
    status: "signed_in" | "created" | "existing" | "none";
    email: string;
    emailVerified: boolean;
  } | null>(null);
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
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "sslcommerz">("cod");

  // Accordion toggles for top notice bars (matches WooCommerce layout in screenshot)
  const [showLogin, setShowLogin] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discount: number;
    description?: string;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

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
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>();

  const watchedDistrict = watch("district");
  const watchedCity = watch("city");

  // Email verification state
  const [checkoutConfig, setCheckoutConfig] = useState<CheckoutConfig | null>(null);
  const [placing, setPlacing] = useState(false);
  const [verifyDialog, setVerifyDialog] = useState<{ email: string; name: string; phone: string; resendAfter: number } | null>(null);
  const pendingOrder = useRef<CheckoutFormValues | null>(null);

  // Inline Email Verification states
  const [inlineVerifyOpen, setInlineVerifyOpen] = useState(false);
  const [inlineCode, setInlineCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [inlineCountdown, setInlineCountdown] = useState(0);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [inlineSuccess, setInlineSuccess] = useState<string | null>(null);
  const [returningVerifiedUser, setReturningVerifiedUser] = useState<{ name: string } | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  const checkEmailStatus = async (emailToCheck?: string) => {
    const raw = (emailToCheck || getValues("email") || "").trim().toLowerCase();
    if (!raw || !/^\S+@\S+\.\S+$/.test(raw)) {
      setReturningVerifiedUser(null);
      return;
    }
    if (checkoutConfig?.user?.emailVerified) return;
    try {
      const res = await fetch("/api/auth/email-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: raw }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.exists && data.emailVerified) {
        setReturningVerifiedUser({ name: data.name || "" });
      } else {
        setReturningVerifiedUser(null);
      }
    } catch {
      setReturningVerifiedUser(null);
    }
  };

  useEffect(() => {
    if (inlineCountdown <= 0) return;
    const timer = setTimeout(() => setInlineCountdown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [inlineCountdown]);

  // Load the checkout config once, and pre-fill from the signed-in account (never overwriting what's typed).
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
      fill("streetAddress", u.address?.address);
      fill("city", u.address?.city);
      fill("district", u.address?.district);
      fill("postcode", u.address?.postalCode);
      if (u.emailVerified) setValue("email", u.email); // verified accounts always use their own email
    });
    return () => {
      cancelled = true;
    };
  }, [getValues, setValue]);

  const emailLocked = Boolean(checkoutConfig?.user?.emailVerified);

  // Delivery fee comes from the server (admin Shipping settings + product fees),
  // so what is shown here is exactly what the order is charged.
  const { quote: shippingQuote, loading: shippingLoading } = useShippingQuote(
    items,
    watchedDistrict,
    watchedCity,
    appliedPromo?.discount ?? 0,
  );
  // No fee is charged to the total until the customer has chosen a district.
  const SHIPPING_FEE = shippingQuote?.zoneKnown ? shippingQuote.fee : 0;

  // Sync promo code from localStorage or Cart on load / subtotal update
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

  /** Send the order. The server re-checks the email verification and recalculates the delivery fee. */
  const placeOrder = async (data: CheckoutFormValues) => {
    setPlacing(true);
    setSubmitError(null);
    try {
      const fullAddress = data.apartment ? data.streetAddress + ", " + data.apartment : data.streetAddress;
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
          promoCode: appliedPromo?.code || "",
          discount: discountAmount,
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
        // The session may have expired between the check and the order — verify again instead of failing.
        if (result.code === "EMAIL_VERIFICATION_REQUIRED") {
          await startEmailVerification(data);
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
        address: `${fullAddress}, ${data.city || data.district}`,
      });
      setSubmitted(true);
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

  /** Send 6-digit code directly from the email address field */
  const handleSendEmailCodeInline = async () => {
    const rawEmail = getValues("email");
    const email = (rawEmail || "").trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setInlineError("Please enter a valid email address first.");
      emailInputRef.current?.focus();
      return;
    }
    setSendingCode(true);
    setInlineError(null);
    setInlineSuccess(null);
    setReturningVerifiedUser(null);
    try {
      const sent = await requestEmailCode(email, getValues("name"));
      if (!sent.ok) {
        setInlineError(sent.error);
        return;
      }
      setInlineVerifyOpen(true);
      setInlineCountdown(sent.resendAfter);
      setInlineSuccess(`A 6-digit verification code has been sent to ${email}.`);
    } catch {
      setInlineError("Failed to send verification code. Please try again.");
    } finally {
      setSendingCode(false);
    }
  };

  /** Verify the 6-digit code entered in the inline input */
  const handleVerifyCodeInline = async (codeToVerify?: string) => {
    const code = (codeToVerify || inlineCode).trim();
    if (!code || code.length !== 6) {
      setInlineError("Please enter the complete 6-digit code.");
      return;
    }
    const rawEmail = getValues("email");
    const email = (rawEmail || "").trim().toLowerCase();
    setVerifyingCode(true);
    setInlineError(null);
    try {
      const res = await fetch("/api/auth/email-code/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code,
          name: getValues("name"),
          phone: getValues("phone"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setInlineError(data.error || "That code did not work. Please try again.");
        return;
      }
      // Verified successfully!
      setInlineVerifyOpen(false);
      setInlineCode("");
      setInlineError(null);
      setReturningVerifiedUser(null);
      setInlineSuccess("Email verified successfully!");
      // Auto-fill profile and address fields from verified customer account
      if (data.user) {
        if (data.user.name && !getValues("name")) setValue("name", data.user.name);
        if (data.user.phone && !getValues("phone")) setValue("phone", data.user.phone);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const savedAddr = data.user.addresses?.find((a: any) => a.isDefault) || data.user.addresses?.[0];
        if (savedAddr) {
          if (!getValues("streetAddress") && savedAddr.address) setValue("streetAddress", savedAddr.address);
          if (!getValues("city") && savedAddr.city) setValue("city", savedAddr.city);
          if (!getValues("district") && savedAddr.district) setValue("district", savedAddr.district);
          if (!getValues("postcode") && savedAddr.postalCode) setValue("postcode", savedAddr.postalCode);
        }
      }

      setCheckoutConfig((c) => ({
        requireEmailVerification: c?.requireEmailVerification ?? true,
        user: {
          ...(c?.user ?? { address: undefined }),
          name: data.user?.name || getValues("name") || "",
          email: data.user?.email || email,
          phone: data.user?.phone || getValues("phone") || "",
          emailVerified: true,
        },
      }));

      // If customer was in the process of placing order, proceed immediately
      const pending = pendingOrder.current;
      if (pending) {
        pendingOrder.current = null;
        await placeOrder({ ...pending, email });
      }
    } catch {
      setInlineError("Network error. Please try again.");
    } finally {
      setVerifyingCode(false);
    }
  };

  /** Email the customer a 6-digit code and open inline verification */
  const startEmailVerification = async (data: CheckoutFormValues) => {
    const email = data.email.trim().toLowerCase();
    pendingOrder.current = data;
    setInlineVerifyOpen(true);
    setInlineError("Please verify your email address to complete your order.");
    emailInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    emailInputRef.current?.focus();
    await handleSendEmailCodeInline();
  };

  const onSubmit = async (data: CheckoutFormValues) => {
    setSubmitError(null);
    // Ask the server fresh: it knows whether verification is required and who is signed in.
    const cfg = await loadCheckoutConfig();
    setCheckoutConfig(cfg);

    const email = data.email.trim().toLowerCase();
    const alreadyVerified = Boolean(cfg.user?.emailVerified && cfg.user.email === email);
    if (cfg.requireEmailVerification && !alreadyVerified) {
      await startEmailVerification(data);
      return;
    }
    await placeOrder(data);
  };

  /** Code accepted from dialog (fallback) */
  const handleVerified = async (user: VerifiedUser) => {
    setVerifyDialog(null);
    setCheckoutConfig((c) => ({
      requireEmailVerification: c?.requireEmailVerification ?? true,
      user: { ...(c?.user ?? { address: undefined }), name: user.name, email: user.email, phone: user.phone ?? "", emailVerified: true },
    }));
    const data = pendingOrder.current;
    pendingOrder.current = null;
    if (data) await placeOrder({ ...data, email: user.email });
  };

  const signOutOfCheckout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      const cfg = await loadCheckoutConfig();
      setCheckoutConfig(cfg);
      setValue("email", "");
      setValue("name", "");
      setValue("phone", "");
      setValue("streetAddress", "");
      setValue("city", "");
      setValue("district", "");
      setValue("postcode", "");
      setReturningVerifiedUser(null);
    }
  };

  // ── 1. Hydration loading skeleton ──────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#400604] text-white">
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
      <div className="min-h-screen bg-[#400604] text-white">
        <div className="container mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#340402] border border-[#E1B76F]/30 text-white shadow-lg">
            <CheckCircle className="h-10 w-10 text-white" />
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black uppercase text-white tracking-wide">
            Order Confirmed!
          </h1>
          <p className="mt-3 text-base text-white/90">
            Thank you for shopping with <strong className="text-white">ANGKON</strong>.{" "}
            {orderId && <span className="font-bold text-white">Order #{orderId}</span>}{" "}
            has been placed successfully.
          </p>
          <div className="mt-5 rounded-2xl border border-[#E1B76F]/30 bg-[#2b0403] p-5 sm:p-6 text-left w-full space-y-3 text-sm text-white/90 shadow-xl">
            {/* Payment method */}
            <div className="flex justify-between items-center pb-3 border-b border-[#E1B76F]/20">
              <span className="text-white/70 text-xs uppercase tracking-wider font-semibold">Payment method</span>
              <strong className="text-white font-bold uppercase text-xs sm:text-sm">
                {paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment (SSLCOMMERZ)"}
              </strong>
            </div>

            {/* Subtotal */}
            {confirmedSubtotal !== null && (
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-white/70">Items Subtotal:</span>
                <span className="text-white font-semibold">{formatPrice(confirmedSubtotal)}</span>
              </div>
            )}

            {/* Shipment fee with free shipping reason badge */}
            {confirmedShippingFee !== null && (
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-white/70">Shipment fee:</span>
                  {confirmedShippingFee === 0 && (
                    <span className="text-[10px] bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded font-bold uppercase">
                      Free{shippingQuote?.freeDeliveryThreshold ? ` (Orders ≥ ${formatPrice(shippingQuote.freeDeliveryThreshold)})` : ""}
                    </span>
                  )}
                </div>
                <strong className={confirmedShippingFee === 0 ? "text-emerald-400 font-bold" : "text-white font-semibold"}>
                  {confirmedShippingFee === 0 ? "৳0 (Free)" : formatPrice(confirmedShippingFee)}
                </strong>
              </div>
            )}

            {/* Promo Discount */}
            {confirmedDiscount !== null && confirmedDiscount > 0 && (
              <div className="flex justify-between items-center text-xs sm:text-sm text-emerald-300">
                <span>Promo Discount ({confirmedPromoCode || "Applied"}):</span>
                <strong className="font-bold text-emerald-300">-{formatPrice(confirmedDiscount)}</strong>
              </div>
            )}

            {/* Total payable amount */}
            {confirmedTotal !== null && (
              <div className="flex justify-between items-center pt-3 pb-1 border-t border-[#E1B76F]/20 text-sm sm:text-base">
                <span className="font-bold text-white">Total Amount:</span>
                <span className="text-lg sm:text-xl font-black text-[#E1B76F]">
                  {formatPrice(confirmedTotal)}
                </span>
              </div>
            )}

            {/* Delivery address details */}
            {confirmedCustomer && (
              <div className="pt-3 border-t border-[#E1B76F]/15 text-xs text-white/80 space-y-1">
                <p>
                  <strong className="text-white">Delivering to:</strong> {confirmedCustomer.name} ({confirmedCustomer.phone})
                </p>
                <p className="text-white/70">{confirmedCustomer.address}</p>
              </div>
            )}

            <p className="text-xs text-white/60 pt-2 border-t border-[#E1B76F]/15">
              Our support team will contact you shortly to verify delivery details.
            </p>
          </div>

          {/* Account status for this order */}
          {accountInfo && accountInfo.status !== "none" && (
            <div className="mt-4 w-full rounded-xl border border-[#E1B76F]/40 bg-[#2b0403] p-5 text-left text-sm text-white/90">
              {accountInfo.status === "created" && (
                <>
                  <p className="font-bold text-white">Your ANGKON account is ready, and you&apos;re signed in.</p>
                  <p className="mt-1.5">
                    We sent a verification link to <strong className="text-white">{accountInfo.email}</strong>. Open it to
                    confirm your email and set a password, so you can sign in on any device and see all your orders.
                  </p>
                </>
              )}
              {accountInfo.status === "existing" && (
                <>
                  <p className="font-bold text-white">This order was added to your ANGKON account.</p>
                  <p className="mt-1.5">
                    Sign in with <strong className="text-white">{accountInfo.email}</strong> to track it.
                  </p>
                </>
              )}
              {accountInfo.status === "signed_in" && (
                <>
                  <p className="font-bold text-white">
                    Email verified — you&apos;re signed in as <span className="break-all text-[#E1B76F]">{accountInfo.email}</span>.
                  </p>
                  <p className="mt-1.5">
                    This order is saved in your account. Add a password in My Account to sign in faster next time.
                  </p>
                </>
              )}
              <Link
                href="/my-account"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E1B76F] underline underline-offset-4 hover:text-white"
              >
                {accountInfo.status === "existing" ? "Sign in to my account" : "View my account"}
              </Link>
            </div>
          )}
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
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#E1B76F]/40 bg-[#340402] px-8 py-3.5 text-sm font-bold text-white transition hover:bg-[#520805]"
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

        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-10 md:py-16">
          <h1 className="font-heading text-3xl font-black uppercase text-white tracking-wide mb-6">
            Checkout
          </h1>

          {/* WooCommerce notice format from checkout-2.png */}
          <div className="rounded-xl border border-[#E1B76F]/30 bg-[#340402] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#400604] border border-[#E1B76F]/40 text-white">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Your cart is currently empty.</h2>
                <p className="text-sm text-white/90 mt-1">
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

        {/* ── Top Notice 1: Returning customer / Signed-in Account ── */}
        <div className="mb-4">
          <div className="border-t-2 border-[#E1B76F] border-b border-[#E1B76F]/20 bg-[#340402] px-4 py-3.5 text-sm text-white/90 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-white text-base leading-none">▢</span>
              <span>
                {checkoutConfig?.user ? (
                  <>
                    Logged in as <strong className="text-white font-bold">{checkoutConfig.user.email}</strong>.{" "}
                    <button
                      type="button"
                      onClick={signOutOfCheckout}
                      className="text-[#E1B76F] underline underline-offset-2 hover:text-white transition font-medium cursor-pointer ml-1.5"
                    >
                      Switch account / Log out
                    </button>
                  </>
                ) : (
                  <>
                    Returning customer?{" "}
                    <button
                      type="button"
                      onClick={() => setShowLogin((v) => !v)}
                      className="text-[#E1B76F] underline underline-offset-2 hover:text-white transition font-medium cursor-pointer"
                    >
                      Click here to login
                    </button>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Expandable login box */}
          {showLogin && (
            <div className="mt-2 p-5 rounded-xl border border-[#E1B76F]/25 bg-[#2d0302] animate-in fade-in slide-in-from-top-1 duration-150">
              <p className="text-xs text-white/90 mb-4">
                If you have shopped with us before, please enter your details below. If you are a new customer, please proceed to the Billing section.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 max-w-lg mb-3">
                <input
                  type="text"
                  placeholder="Username or email *"
                  className="h-10 rounded-lg border border-[#E1B76F]/30 bg-[#340402] px-3 text-xs text-white outline-none placeholder:text-[#E1B76F]/40 focus:border-[#E1B76F]"
                />
                <input
                  type="password"
                  placeholder="Password *"
                  className="h-10 rounded-lg border border-[#E1B76F]/30 bg-[#340402] px-3 text-xs text-white outline-none placeholder:text-[#E1B76F]/40 focus:border-[#E1B76F]"
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

        {/* ── Top Notice 2: Have a coupon / promo code? ── */}
        {checkoutConfig?.enablePromoCodes !== false && (
          <div className="mb-6">
            <div className="border-t-2 border-[#E1B76F] border-b border-[#E1B76F]/20 bg-[#340402] px-4 py-3.5 text-sm text-white/90 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Tag className="h-4 w-4 text-[#E1B76F] shrink-0" />
                <span>
                  Have a coupon or promo code?{" "}
                  <button
                    type="button"
                    onClick={() => setShowCoupon((v) => !v)}
                    className="text-[#E1B76F] underline underline-offset-2 hover:text-white transition font-medium cursor-pointer"
                  >
                    Click here to enter your code
                  </button>
                </span>
              </div>
              {appliedPromo && (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded">
                  {appliedPromo.code} Applied (-{formatPrice(discountAmount)})
                </span>
              )}
            </div>

            {/* Expandable coupon input */}
            {showCoupon && (
              <form onSubmit={handleApplyCoupon} className="mt-2 p-5 rounded-xl border border-[#E1B76F]/25 bg-[#2d0302] animate-in fade-in slide-in-from-top-1 duration-150">
                <p className="text-xs text-white/90 mb-3">If you have a promo code or royal voucher, enter it below to apply your discount.</p>
                <div className="flex flex-col sm:flex-row items-stretch gap-2.5 max-w-md">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="e.g. ANGKON10"
                    disabled={couponLoading || !!appliedPromo}
                    className="h-10 flex-1 rounded-lg border border-[#E1B76F]/30 bg-[#340402] px-3 text-xs text-white outline-none placeholder:text-[#E1B76F]/40 focus:border-[#E1B76F] uppercase disabled:opacity-60"
                  />
                  {appliedPromo ? (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="h-10 rounded-lg bg-rose-900/60 border border-rose-500/40 text-rose-200 px-5 text-xs font-bold uppercase hover:bg-rose-900 transition cursor-pointer"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={couponLoading || !couponCode.trim()}
                      className="h-10 rounded-lg bg-[#E1B76F] text-[#400604] px-5 text-xs font-bold uppercase hover:bg-[#f3cb87] transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {couponLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply coupon"}
                    </button>
                  )}
                </div>
                {couponMessage && (
                  <p className="mt-2.5 text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                    {couponMessage}
                  </p>
                )}
                {couponError && (
                  <p className="mt-2.5 text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {couponError}
                  </p>
                )}
              </form>
            )}
          </div>
        )}

        {/* ── Social Login Row (from screenshot) ── */}
        <div className="mb-8">
          <p className="text-xs sm:text-sm text-white/90 mb-2.5">Login with your Facebook or Google account</p>
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
                <h2 className="text-xl sm:text-2xl font-heading font-bold text-white">
                  Billing details
                </h2>
              </div>

              <div className="space-y-4">
                {/* Name * */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-white">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    placeholder=""
                    className={`h-11 w-full rounded-md border bg-[#2d0302] px-3.5 text-sm text-white outline-none transition placeholder:text-[#E1B76F]/40 focus:border-[#E1B76F] ${
                      errors.name ? "border-red-400 bg-red-950/20" : "border-[#E1B76F]/30"
                    }`}
                    {...register("name", { required: "Name is required" })}
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
                </div>

                {/* Country / Region */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-white">
                    Country / Region <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      disabled
                      defaultValue="BD"
                      className="h-11 w-full appearance-none rounded-md border border-[#E1B76F]/30 bg-[#2d0302] px-3.5 pr-9 text-sm text-white outline-none cursor-not-allowed opacity-90"
                    >
                      <option value="BD">Bangladesh</option>
                    </select>
                    <svg
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60"
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
                  <label className="block text-xs font-semibold text-white">
                    Street address <span className="text-red-400">*</span>
                  </label>
                  <input
                    placeholder="House number and street name"
                    className={`h-11 w-full rounded-md border bg-[#2d0302] px-3.5 text-sm text-white outline-none transition placeholder:text-[#E1B76F]/40 focus:border-[#E1B76F] ${
                      errors.streetAddress ? "border-red-400 bg-red-950/20" : "border-[#E1B76F]/30"
                    }`}
                    {...register("streetAddress", { required: "Street address is required" })}
                  />
                  {errors.streetAddress && (
                    <p className="text-xs text-red-400">{errors.streetAddress.message}</p>
                  )}
                  <input
                    placeholder="Apartment, suite, unit, etc. (optional)"
                    className="h-11 w-full rounded-md border border-[#E1B76F]/30 bg-[#2d0302] px-3.5 text-sm text-white outline-none transition placeholder:text-[#E1B76F]/40 focus:border-[#E1B76F]"
                    {...register("apartment")}
                  />
                </div>

                {/* Town / City * */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-white">
                    Town / City <span className="text-red-400">*</span>
                  </label>
                  <input
                    placeholder=""
                    className={`h-11 w-full rounded-md border bg-[#2d0302] px-3.5 text-sm text-white outline-none transition placeholder:text-[#E1B76F]/40 focus:border-[#E1B76F] ${
                      errors.city ? "border-red-400 bg-red-950/20" : "border-[#E1B76F]/30"
                    }`}
                    {...register("city", { required: "Town / City is required" })}
                  />
                  {errors.city && <p className="mt-1 text-xs text-red-400">{errors.city.message}</p>}
                </div>

                {/* District * */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-white">
                    District <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      className={`h-11 w-full appearance-none rounded-md border bg-[#2d0302] px-3.5 pr-9 text-sm text-white outline-none transition focus:border-[#E1B76F] ${
                        errors.district ? "border-red-400 bg-red-950/20" : "border-[#E1B76F]/30"
                      }`}
                      defaultValue=""
                      {...register("district", { required: "District is required" })}
                    >
                      <option value="" disabled className="text-white/40 bg-[#2d0302]">
                        Select an option…
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
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60"
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
                  <label className="mb-1.5 block text-xs font-semibold text-white">
                    Postcode / ZIP (optional)
                  </label>
                  <input
                    placeholder="1234"
                    className="h-11 w-full rounded-md border border-[#E1B76F]/30 bg-[#2d0302] px-3.5 text-sm text-white outline-none transition placeholder:text-[#E1B76F]/40 focus:border-[#E1B76F]"
                    {...register("postcode")}
                  />
                </div>

                {/* Phone * */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-white">
                    Phone <span className="text-red-400">*</span>
                  </label>
                  <input
                    placeholder="01XXXXXXXXX"
                    className={`h-11 w-full rounded-md border bg-[#2d0302] px-3.5 text-sm text-white outline-none transition placeholder:text-[#E1B76F]/40 focus:border-[#E1B76F] ${
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
                  <label className="block text-xs font-semibold text-white mb-1.5">
                    Email address <span className="text-red-400">*</span>
                  </label>

                  <div className="relative flex items-center">
                    <input
                      type="email"
                      placeholder="name@example.com"
                      readOnly={emailLocked}
                      autoComplete="email"
                      className={`h-11 w-full rounded-md border bg-[#2d0302] pl-3.5 pr-28 text-sm text-white outline-none transition placeholder:text-[#E1B76F]/40 focus:border-[#E1B76F] ${
                        errors.email ? "border-red-400 bg-red-950/20" : "border-[#E1B76F]/30"
                      } ${emailLocked ? "border-emerald-500/50 text-emerald-200" : ""}`}
                      {...register("email", {
                        required: "Email is required",
                        pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email address" },
                      })}
                      onBlur={(e) => {
                        register("email").onBlur(e);
                        void checkEmailStatus(e.target.value);
                      }}
                      ref={(e) => {
                        register("email").ref(e);
                        emailInputRef.current = e;
                      }}
                    />

                    {/* Right side verification action */}
                    {emailLocked ? (
                      <div className="absolute right-2 flex items-center gap-2">
                        <div className="flex items-center gap-1 rounded bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Verified</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCheckoutConfig((c) => (c ? { ...c, user: null } : null));
                            setValue("email", "");
                            setValue("name", "");
                            setValue("phone", "");
                            setValue("streetAddress", "");
                            setValue("city", "");
                            setValue("district", "");
                            setValue("postcode", "");
                            setReturningVerifiedUser(null);
                          }}
                          className="text-[11px] font-bold text-[#E1B76F] hover:underline cursor-pointer"
                          title="Use a different email address"
                        >
                          Change
                        </button>
                      </div>
                    ) : checkoutConfig?.requireEmailVerification !== false ? (
                      <button
                        type="button"
                        onClick={handleSendEmailCodeInline}
                        disabled={sendingCode || inlineCountdown > 0}
                        className="absolute right-1.5 top-1.5 bottom-1.5 rounded-md bg-[#E1B76F] px-3 text-[11px] font-black uppercase tracking-wider text-[#400604] transition hover:bg-[#f3cb87] disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                      >
                        {sendingCode ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Sending…</span>
                          </>
                        ) : inlineCountdown > 0 ? (
                          <span>Resend ({inlineCountdown}s)</span>
                        ) : (
                          <span>Verify</span>
                        )}
                      </button>
                    ) : null}
                  </div>

                  {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}

                  {/* Returning verified customer notice */}
                  {returningVerifiedUser && !emailLocked && !inlineVerifyOpen && (
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200 animate-in fade-in duration-150">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                        <span>
                          Verified customer account found{returningVerifiedUser.name ? ` (${returningVerifiedUser.name})` : ""}.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSendEmailCodeInline}
                        className="cursor-pointer font-bold text-[#E1B76F] hover:underline whitespace-nowrap"
                      >
                        Load Saved Address →
                      </button>
                    </div>
                  )}

                  {/* Inline Verification Box */}
                  {inlineVerifyOpen && !emailLocked && (
                    <div className="mt-3 p-4 rounded-xl border border-[#E1B76F]/40 bg-[#1e0202] space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-[#E1B76F]" /> Enter 6-digit verification code
                          </p>
                          <p className="text-[11px] text-white/70 mt-0.5">
                            Sent to <strong className="text-white">{watch("email")}</strong>. Check your inbox and spam folder.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInlineVerifyOpen(false)}
                          className="text-white/50 hover:text-white text-xs font-bold cursor-pointer"
                        >
                          ✕ Close
                        </button>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={inlineCode}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                            setInlineCode(digits);
                            setInlineError(null);
                            if (digits.length === 6) {
                              void handleVerifyCodeInline(digits);
                            }
                          }}
                          placeholder="123456"
                          className="h-10 w-36 text-center font-mono text-base tracking-[0.3em] font-bold rounded-lg border border-[#E1B76F]/50 bg-[#2d0302] text-white focus:border-[#E1B76F] outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleVerifyCodeInline(inlineCode)}
                          disabled={verifyingCode || inlineCode.length !== 6}
                          className="h-10 px-4 rounded-lg bg-[#E1B76F] text-[#400604] text-xs font-black uppercase tracking-wider hover:bg-[#f3cb87] transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                        >
                          {verifyingCode ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Verifying…</span>
                            </>
                          ) : (
                            <span>Confirm Code</span>
                          )}
                        </button>
                      </div>

                      {inlineError && (
                        <p className="text-xs text-red-400 font-semibold">{inlineError}</p>
                      )}
                      {inlineSuccess && (
                        <p className="text-xs text-emerald-400 font-semibold">{inlineSuccess}</p>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-white/60 pt-1.5 border-t border-[#E1B76F]/15">
                        <span>Didn&apos;t receive code?</span>
                        {inlineCountdown > 0 ? (
                          <span>Resend in {inlineCountdown}s</span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendEmailCodeInline}
                            disabled={sendingCode}
                            className="text-[#E1B76F] hover:underline font-bold cursor-pointer"
                          >
                            Resend code now
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {!emailLocked && checkoutConfig?.requireEmailVerification !== false && !inlineVerifyOpen ? (
                    <p className="mt-1.5 text-xs text-white/60">
                      Click <strong>Verify</strong> to confirm your email before placing the order.
                    </p>
                  ) : null}
                </div>

                {/* Additional information */}
                <div className="pt-4 border-t border-[#E1B76F]/15">
                  <h3 className="text-base font-heading font-bold text-white mb-3">
                    Additional information
                  </h3>
                  <label className="mb-1.5 block text-xs font-semibold text-white">
                    Order notes (optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Notes about your order, e.g. special notes for delivery."
                    className="w-full resize-none rounded-md border border-[#E1B76F]/30 bg-[#2d0302] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-[#E1B76F]/40 focus:border-[#E1B76F]"
                    {...register("orderNotes")}
                  />
                </div>
              </div>
            </div>

            {/* ── Right Column: "Your order" (Matches exact card from screenshot) ── */}
            <div>
              <div className="rounded-xl border border-[#E1B76F]/30 bg-[#340402] p-6 sm:p-7 shadow-sm sticky top-24">
                <h3 className="text-xl font-heading font-bold text-white mb-4">
                  Your order
                </h3>

                {/* Table Header: Product | Subtotal */}
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-white pb-3 border-b border-[#E1B76F]/20">
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
                              className="object-cover object-top"
                              sizes="48px"
                            />
                          </div>
                        )}
                        <span className="text-[13px] text-white/90 font-normal leading-snug">
                          {item.name} - {item.size} <strong className="text-white whitespace-nowrap">× {item.quantity}</strong>
                        </span>
                      </div>
                      <span className="text-[13px] font-semibold text-white shrink-0 whitespace-nowrap">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Subtotal Row */}
                <div className="flex justify-between items-center py-3.5 border-t border-b border-[#E1B76F]/20 text-sm">
                  <span className="font-medium text-white">Subtotal</span>
                  <span className="font-semibold text-white">{formatPrice(subtotal)}</span>
                </div>

                {/* Shipment Row */}
                <div className="flex justify-between items-start gap-4 py-3.5 border-b border-[#E1B76F]/20 text-sm">
                  <span className="font-medium text-white">Shipment</span>
                  <div className="text-right text-white/90" aria-live="polite">
                    {!shippingQuote ? (
                      shippingLoading ? (
                        <span className="inline-block h-4 w-24 animate-pulse rounded bg-[#2d0302]" />
                      ) : (
                        <span className="text-white/70">Calculated when you place the order</span>
                      )
                    ) : !shippingQuote.zoneKnown ? (
                      <span className="text-white/70">Choose your district to see the delivery fee</span>
                    ) : (
                      <>
                        <div>
                          Flat rate:{" "}
                          <strong className="text-white">{shippingQuote.isFree ? "Free" : formatPrice(shippingQuote.fee)}</strong>
                        </div>
                        <div className="mt-0.5 text-xs text-white/60">
                          {shippingQuote.freeByThreshold
                              ? `Free delivery on orders of ${formatPrice(shippingQuote.freeDeliveryThreshold)} or more`
                              : shippingQuote.isFree
                                ? "Free delivery for this order"
                                : shippingQuote.zone === "inside"
                                  ? "Inside Dhaka"
                                  : shippingQuote.zone === "near"
                                    ? "Gazipur / Narayanganj / Savar"
                                    : "Outside Dhaka"}
                        </div>
                        {shippingQuote.amountToFreeDelivery !== null && (
                          <div className="mt-0.5 text-xs font-semibold text-[#E1B76F]">
                            Add {formatPrice(shippingQuote.amountToFreeDelivery)} more for free delivery
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Promo Code Discount Row */}
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center py-3 border-b border-[#E1B76F]/25 text-sm text-emerald-300 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Tag className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Promo Discount ({appliedPromo?.code})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-300">-{formatPrice(discountAmount)}</span>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-[11px] text-white/50 hover:text-red-400 underline cursor-pointer"
                        title="Remove promo code"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                {/* Total Row */}
                <div className="flex justify-between items-center py-4 border-b border-[#E1B76F]/25 text-base font-bold text-white">
                  <span>Total</span>
                  <span className="text-xl text-white">{formatPrice(FINAL_TOTAL)}</span>
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
                      <Truck className="h-4 w-4 text-white" />
                      <span className="text-sm font-bold text-white">Cash on Delivery (COD)</span>
                    </div>
                    {paymentMethod === "cod" && (
                      <p className="mt-2 text-xs text-white/90 pl-6 leading-relaxed">
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
                        <CreditCard className="h-4 w-4 text-white" />
                        <span className="text-sm font-bold text-white">Online Payment (SSLCOMMERZ)</span>
                      </div>
                      <span className="text-[10px] bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded font-bold uppercase">
                        Instant
                      </span>
                    </div>
                    {paymentMethod === "sslcommerz" && (
                      <div className="mt-2.5 pl-6 space-y-2">
                        <p className="text-xs text-white/90 leading-relaxed">
                          Pay securely with bKash, Nagad, Rocket, VISA, Mastercard, Amex, Upay, or Internet Banking.
                        </p>
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          {["bKash", "Nagad", "Rocket", "VISA", "Mastercard", "Amex"].map((brand) => (
                            <span
                              key={brand}
                              className="rounded border border-[#E1B76F]/30 bg-[#340402] px-2 py-0.5 text-[10px] font-bold text-white"
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
                <p className="mt-5 text-[11px] text-white/75 leading-relaxed">
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
                  disabled={isSubmitting || placing}
                  className="w-full mt-4 rounded-xl bg-[#E1B76F] text-[#400604] py-3.5 px-6 font-bold text-sm sm:text-base uppercase tracking-wider hover:bg-[#f3cb87] transition shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Lock className="h-4 w-4 text-[#400604]" />
                  {isSubmitting || placing ? "Processing…" : "Place order"}
                </button>
              </div>
            </div>

          </div>
        </form>

      </div>

      {/* Outside the <form> so pressing Enter in the code box can't submit the checkout again. */}
      {verifyDialog && (
        <EmailVerifyDialog
          email={verifyDialog.email}
          name={verifyDialog.name}
          phone={verifyDialog.phone}
          initialResendAfter={verifyDialog.resendAfter}
          onVerified={handleVerified}
          onClose={() => {
            pendingOrder.current = null;
            setVerifyDialog(null);
          }}
        />
      )}
    </div>
  );
}
