import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingBag,
  Tag,
  Loader2,
  AlertCircle,
  Minus,
  Plus,
  Trash2,
  Lock,
} from "lucide-react";
import type { CartItem } from "@/types/product";
import type { AppliedPromo, CheckoutPaymentMethod } from "../_types/checkout.types";

interface StarTechOrderSummaryProps {
  items: CartItem[];
  onUpdateQuantity?: (productId: number, size: string | undefined, quantity: number, color?: string) => void;
  onRemoveItem?: (productId: number, size?: string, color?: string) => void;
  subtotal: number;
  deliveryMethod?: "home" | "pickup";
  pickupLocation?: string;
  effectiveShippingFee: number;
  isFreeDelivery: boolean;
  appliedPromo: AppliedPromo | null;
  discountAmount: number;
  finalTotal: number;
  couponCode: string;
  setCouponCode: (val: string) => void;
  couponLoading: boolean;
  couponMessage: string | null;
  couponError: string | null;
  onApplyCoupon: (e: React.FormEvent) => void;
  onRemoveCoupon: () => void;
  policyAccepted: boolean;
  setPolicyAccepted: (val: boolean) => void;
  placing: boolean;
  submitError: string | null;
  onConfirmOrder: () => void;
  paymentMethod?: CheckoutPaymentMethod;
}

export function StarTechOrderSummary({
  items = [],
  onUpdateQuantity,
  onRemoveItem,
  subtotal,
  effectiveShippingFee,
  isFreeDelivery,
  appliedPromo,
  discountAmount,
  finalTotal,
  couponCode,
  setCouponCode,
  couponLoading,
  couponMessage,
  couponError,
  onApplyCoupon,
  onRemoveCoupon,
  policyAccepted,
  setPolicyAccepted,
  placing,
  submitError,
  onConfirmOrder,
  paymentMethod = "cod",
}: StarTechOrderSummaryProps) {
  const [policyError, setPolicyError] = useState<string | null>(null);

  const formatPrice = (price: number) => `${Math.round(price).toLocaleString("en-BD")}৳`;

  const getColorDisplayName = (color: string) => {
    return color.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const handleConfirmClick = () => {
    if (!policyAccepted) {
      setPolicyError("Please accept the Terms & Conditions and Policies to proceed.");
      return;
    }
    setPolicyError(null);
    onConfirmOrder();
  };

  const totalItemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const deliveryLabel = isFreeDelivery
    ? "Home Delivery (Free Delivery):"
    : "Home Delivery:";

  const deliveryCostDisplay = isFreeDelivery ? "0৳" : `${effectiveShippingFee}৳`;

  return (
    <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-5 sm:p-6 shadow-sm sticky top-20 space-y-5">
      {/* ── Header with Item Count Badge ── */}
      <div className="flex items-center justify-between border-b border-[#E1B76F]/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#530911] text-[#E1B76F] border border-[#E1B76F]/30">
            <ShoppingBag className="h-4 w-4" />
          </div>
          <h2 className="text-base font-serif font-bold text-white tracking-wide">
            Order Summary
          </h2>
        </div>
        <span className="rounded-full bg-[#220406] px-2.5 py-0.5 text-xs font-bold text-[#E1B76F] border border-[#E1B76F]/30">
          {totalItemCount} {totalItemCount === 1 ? "item" : "items"}
        </span>
      </div>

      {/* ── Products List with Quantity Stepper & Remove ── */}
      {items.length > 0 && (
        <div className="max-h-[320px] overflow-y-auto pr-1 space-y-3.5 divide-y divide-[#E1B76F]/15">
          {items.map((item, idx) => {
            const itemTotal = item.price * item.quantity;

            return (
              <div
                key={`${item.productId}-${item.size}-${item.color}-${idx}`}
                className="pt-3.5 first:pt-0 space-y-2.5"
              >
                <div className="flex items-start gap-3">
                  {/* Thumbnail */}
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#220406] border border-[#E1B76F]/30 shadow-xs">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-white/40">
                        ANGKON
                      </div>
                    )}
                  </div>

                  {/* Title, Variations & Price */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-white truncate leading-tight">
                        {item.name}
                      </p>
                      <span className="text-xs font-bold text-white shrink-0">
                        {formatPrice(itemTotal)}
                      </span>
                    </div>

                    {/* Variations */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {item.size && (
                        <span className="rounded bg-[#220406] px-1.5 py-0.5 text-[10px] font-medium text-stone-200 border border-[#E1B76F]/30">
                          Size: {item.size}
                        </span>
                      )}
                      {item.color && (
                        <span className="rounded bg-[#220406] px-1.5 py-0.5 text-[10px] font-medium text-stone-200 border border-[#E1B76F]/30">
                          Color: {getColorDisplayName(item.color)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stepper (Minus / Count / Plus) & Remove Button */}
                <div className="flex items-center justify-between pl-[68px]">
                  <div className="flex items-center rounded-lg border border-[#E1B76F]/30 bg-[#220406] overflow-hidden">
                    <button
                      type="button"
                      disabled={item.quantity <= 1}
                      onClick={() => {
                        if (item.quantity > 1) {
                          onUpdateQuantity?.(item.productId, item.size, item.quantity - 1, item.color);
                        }
                      }}
                      className="h-7 w-7 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                      title="Reduce quantity"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-7 text-center text-xs font-bold text-white">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      disabled={item.quantity >= 99}
                      onClick={() => {
                        if (item.quantity < 99) {
                          onUpdateQuantity?.(item.productId, item.size, item.quantity + 1, item.color);
                        }
                      }}
                      className="h-7 w-7 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                      title="Increase quantity"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => onRemoveItem?.(item.productId, item.size, item.color)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-300 hover:text-rose-200 hover:underline transition cursor-pointer"
                    title="Remove item from bag"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Single Clean Promo / Coupon Code Section ── */}
      <div className="pt-2 border-t border-[#E1B76F]/20 space-y-2">
        {appliedPromo ? (
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-emerald-300">
                  {appliedPromo.code} Applied!
                </p>
                <p className="text-[11px] text-emerald-400/90">
                  You saved {formatPrice(appliedPromo.discount)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onRemoveCoupon}
              className="text-xs font-semibold text-rose-300 hover:text-rose-200 underline cursor-pointer"
            >
              Remove
            </button>
          </div>
        ) : (
          <form onSubmit={onApplyCoupon} className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Promo / Coupon Code"
              className="h-10 flex-1 rounded-xl border border-[#E1B76F]/40 bg-[#220406] px-3.5 text-xs uppercase tracking-wider font-medium text-white placeholder:normal-case placeholder:text-stone-300/75 outline-none transition focus:border-[#E1B76F] focus:ring-1 focus:ring-[#E1B76F]/50"
            />
            <button
              type="submit"
              disabled={couponLoading || !couponCode.trim()}
              className="h-10 rounded-xl bg-[#E1B76F] hover:bg-[#F2C97D] px-4 text-xs font-bold text-[#300508] transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {couponLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Apply"
              )}
            </button>
          </form>
        )}

        {couponMessage && !appliedPromo && (
          <p className="text-xs text-emerald-400">{couponMessage}</p>
        )}
        {couponError && (
          <p className="text-xs text-rose-400">{couponError}</p>
        )}
      </div>

      {/* ── Price Breakdown ── */}
      <div className="space-y-2.5 pt-2 border-t border-[#E1B76F]/20 text-xs sm:text-sm">
        <div className="flex items-center justify-between text-white/90">
          <span className="font-medium">Sub-Total:</span>
          <span className="font-semibold text-white">{formatPrice(subtotal)}</span>
        </div>

        <div className="flex items-center justify-between text-white/90">
          <span className="pr-2 font-medium">{deliveryLabel}</span>
          <span className={`font-semibold ${deliveryCostDisplay === "0৳" ? "text-emerald-400" : "text-white"}`}>
            {deliveryCostDisplay}
          </span>
        </div>

        {appliedPromo && discountAmount > 0 && (
          <div className="flex items-center justify-between text-emerald-400">
            <span>Coupon Discount ({appliedPromo.code}):</span>
            <span className="font-bold">-{formatPrice(discountAmount)}</span>
          </div>
        )}

        {/* Divider & Total */}
        <div className="pt-2.5 border-t border-[#E1B76F]/20 flex items-center justify-between">
          <span className="text-sm font-bold text-white">Total:</span>
          <span className="text-xl sm:text-2xl font-bold font-serif text-[#E1B76F]">
            {formatPrice(finalTotal)}
          </span>
        </div>
      </div>

      {/* ── Terms & Policies Checkbox ── */}
      <div className="pt-1">
        <label className="flex items-start gap-2.5 cursor-pointer text-xs text-stone-200 leading-relaxed font-normal">
          <input
            type="checkbox"
            checked={policyAccepted}
            onChange={(e) => {
              setPolicyAccepted(e.target.checked);
              if (e.target.checked) setPolicyError(null);
            }}
            className="mt-0.5 h-4 w-4 rounded border-[#E1B76F]/60 bg-[#280504] text-[#E1B76F] accent-[#E1B76F] focus:ring-0 cursor-pointer"
          />
          <span>
            I have read and agree to the{" "}
            <Link
              href="/terms-and-conditions"
              target="_blank"
              className="text-[#E1B76F] hover:text-[#F2C97D] underline font-semibold transition"
            >
              Terms and Conditions
            </Link>
            ,{" "}
            <Link
              href="/privacy-policy"
              target="_blank"
              className="text-[#E1B76F] hover:text-[#F2C97D] underline font-semibold transition"
            >
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link
              href="/return-refund-policy"
              target="_blank"
              className="text-[#E1B76F] hover:text-[#F2C97D] underline font-semibold transition"
            >
              Refund and Return Policy
            </Link>
          </span>
        </label>
        {policyError && (
          <p className="mt-1 text-xs text-rose-400 font-medium">{policyError}</p>
        )}
      </div>

      {/* ── Submission Error Banner ── */}
      {submitError && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <p className="leading-relaxed">{submitError}</p>
        </div>
      )}

      {/* ── Primary CTA Button: Confirm Order / Pay Securely Now ── */}
      <button
        type="button"
        disabled={placing}
        onClick={handleConfirmClick}
        className={`w-full rounded-xl py-3.5 px-4 text-sm font-bold text-white shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer ${
          paymentMethod === "bkash"
            ? "bg-[#E2136E] hover:bg-[#c70f5e]"
            : paymentMethod === "nagad"
            ? "bg-gradient-to-r from-[#F7941D] to-[#ED1C24] hover:brightness-105"
            : paymentMethod === "cards" || paymentMethod === "sslcommerz"
            ? "bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF]"
            : "bg-[#27408B] hover:bg-[#1E3270]"
        }`}
      >
        {placing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>
              {paymentMethod === "bkash"
                ? "Connecting to bKash..."
                : paymentMethod === "nagad"
                ? "Connecting to Nagad..."
                : paymentMethod === "cards"
                ? "Connecting to Card Gateway..."
                : paymentMethod === "sslcommerz"
                ? "Connecting to SSLCOMMERZ..."
                : "Processing Order..."}
            </span>
          </>
        ) : paymentMethod === "bkash" ? (
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-white" />
            Pay with bKash · {formatPrice(finalTotal)}
          </span>
        ) : paymentMethod === "nagad" ? (
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-white" />
            Pay with Nagad · {formatPrice(finalTotal)}
          </span>
        ) : paymentMethod === "cards" ? (
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-[#E1B76F]" />
            Pay with Card · {formatPrice(finalTotal)}
          </span>
        ) : paymentMethod === "sslcommerz" ? (
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-[#E1B76F]" />
            Continue to secure payment · {formatPrice(finalTotal)}
          </span>
        ) : (
          <span>Confirm COD Order · {formatPrice(finalTotal)}</span>
        )}
      </button>
    </div>
  );
}
