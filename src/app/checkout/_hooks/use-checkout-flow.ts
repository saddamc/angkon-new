"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useCartStore } from "@/store/cart-store";
import { useShippingQuote } from "@/hooks/use-shipping-quote";
import { requestEmailCode, type VerifiedUser } from "@/components/checkout/email-verify-dialog";
import type { AuthModalUser } from "@/components/checkout/auth-modal";
import { trackInitiateCheckout, trackPurchase } from "@/lib/fpixel";
import { playCheckoutSuccessSound } from "@/lib/sound-alert";
import type {
  CheckoutFormValues,
  CheckoutConfig,
  AppliedPromo,
  ConfirmedCustomer,
  AccountInfo,
  VerifyDialogState,
} from "../_types/checkout.types";

declare global {
  interface Window {
    __angkon_meta_test_code?: string;
  }
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

export function useCheckoutFlow() {
  const [mounted, setMounted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);

  // Submission & Confirmation state
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | number | null>(null);
  const [confirmedShippingFee, setConfirmedShippingFee] = useState<number | null>(null);
  const [confirmedSubtotal, setConfirmedSubtotal] = useState<number | null>(null);
  const [confirmedTotal, setConfirmedTotal] = useState<number | null>(null);
  const [confirmedDiscount, setConfirmedDiscount] = useState<number | null>(null);
  const [confirmedPromoCode, setConfirmedPromoCode] = useState<string | null>(null);
  const [confirmedCustomer, setConfirmedCustomer] = useState<ConfirmedCustomer | null>(null);

  // Payment method: Cash on Delivery by default
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "sslcommerz">("cod");

  // Promo Code state
  const [couponCode, setCouponCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
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
  const [verifyDialog, setVerifyDialog] = useState<VerifyDialogState | null>(null);
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
  const shippingFee = shippingQuote?.zoneKnown ? shippingQuote.fee : 0;

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
  const finalTotal = Math.max(0, subtotal - discountAmount) + shippingFee;

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
  const onSubmit = async (data: CheckoutFormValues, skipVerification = false) => {
    setPlacing(true);
    setSubmitError(null);

    try {
      let config = checkoutConfig;
      if (!config) {
        config = await loadCheckoutConfig();
        setCheckoutConfig(config);
      }

      // If email verification is required and customer is not verified for this email, prompt code verification:
      const rawEmail = typeof data?.email === "string" ? data.email.trim().toLowerCase() : "";
      const userEmail = typeof config?.user?.email === "string" ? config.user.email.trim().toLowerCase() : "";
      const isVerifiedForEmail =
        skipVerification === true || Boolean(config?.user?.emailVerified && userEmail && userEmail === rawEmail);

      if (config?.requireEmailVerification && !isVerifiedForEmail) {
        pendingOrderValues.current = data;
        const sent = await requestEmailCode(data.email, data.name);
        setPlacing(false);
        setVerifyDialog({
          email: data.email,
          name: data.name,
          phone: data.phone,
          resendAfter: sent.ok ? sent.resendAfter : 60,
        });
        return;
      }

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
          setPlacing(false);
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
        value: typeof result.total === "number" ? result.total : finalTotal,
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
      void onSubmit(pendingOrderValues.current, true);
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

  const isLoggedIn = Boolean(checkoutConfig?.user);
  const loggedInEmail = checkoutConfig?.user?.email || "";
  const isEmailVerified = Boolean(checkoutConfig?.user?.emailVerified);
  const isGuestOrder = !checkoutConfig?.user || accountInfo?.status === "created";
  const guestEmail = accountInfo?.email || confirmedCustomer?.phone || "your email";

  return {
    mounted,
    submitted,
    accountInfo,
    submitError,
    orderId,
    confirmedShippingFee,
    confirmedSubtotal,
    confirmedTotal,
    confirmedDiscount,
    confirmedPromoCode,
    confirmedCustomer,
    paymentMethod,
    setPaymentMethod,
    couponCode,
    setCouponCode,
    appliedPromo,
    couponLoading,
    couponMessage,
    couponError,
    handleApplyCoupon,
    handleRemoveCoupon,
    authModalOpen,
    setAuthModalOpen,
    authModalView,
    setAuthModalView,
    handleAuthSuccess,
    handleSignOut,
    postOrderPassword,
    setPostOrderPassword,
    showPostPassword,
    setShowPostPassword,
    savingPostAccount,
    postAccountSuccess,
    postAccountError,
    handleSavePostAccountPassword,
    items,
    subtotal,
    clearCart,
    placing,
    verifyDialog,
    setVerifyDialog,
    pendingOrderValues,
    checkoutConfig,
    setCheckoutConfig,
    register,
    handleSubmit,
    errors,
    isSubmitting,
    shippingQuote,
    shippingLoading,
    shippingFee,
    discountAmount,
    finalTotal,
    isLoggedIn,
    loggedInEmail,
    isEmailVerified,
    isGuestOrder,
    guestEmail,
    onSubmit,
    handleVerifiedFallback,
  };
}
