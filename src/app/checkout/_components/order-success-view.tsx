import Link from "next/link";
import { CheckCircle, Sparkles, Eye, EyeOff, Loader2, ShoppingBag } from "lucide-react";
import { formatPrice } from "@/utils/price";
import type { ConfirmedCustomer, AccountInfo } from "../_types/checkout.types";

interface OrderSuccessViewProps {
  orderId: string | number | null;
  paymentMethod: "cod" | "sslcommerz";
  confirmedSubtotal: number | null;
  confirmedShippingFee: number | null;
  confirmedDiscount: number | null;
  confirmedPromoCode: string | null;
  confirmedTotal: number | null;
  confirmedCustomer: ConfirmedCustomer | null;
  accountInfo: AccountInfo | null;
  isEmailVerified: boolean;
  isGuestOrder: boolean;
  guestEmail: string;
  postOrderPassword: string;
  setPostOrderPassword: (val: string) => void;
  showPostPassword: boolean;
  setShowPostPassword: (show: boolean) => void;
  savingPostAccount: boolean;
  postAccountSuccess: boolean;
  postAccountError: string | null;
  onSavePostAccountPassword: (e: React.FormEvent) => void;
}

export function OrderSuccessView({
  orderId,
  paymentMethod,
  confirmedSubtotal,
  confirmedShippingFee,
  confirmedDiscount,
  confirmedPromoCode,
  confirmedTotal,
  confirmedCustomer,
  accountInfo,
  isEmailVerified,
  isGuestOrder,
  guestEmail,
  postOrderPassword,
  setPostOrderPassword,
  showPostPassword,
  setShowPostPassword,
  savingPostAccount,
  postAccountSuccess,
  postAccountError,
  onSavePostAccountPassword,
}: OrderSuccessViewProps) {
  return (
    <div className="min-h-screen bg-[#530911] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-xl text-center">
        {/* Success Icon */}
        <div className="mb-5 mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#42070e] border-2 border-[#E1B76F] text-[#E1B76F] shadow-xl">
          <CheckCircle className="h-10 w-10 text-[#E1B76F]" />
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold uppercase tracking-wide text-white">
          Order Confirmed!
        </h1>
        <p className="mt-2 text-sm sm:text-base text-white/85">
          Thank you for shopping with <strong className="text-[#E1B76F]">ANGKON</strong>.{" "}
          {orderId && <span className="font-bold text-white">Order #{orderId}</span>} has been placed.
        </p>
        {(accountInfo?.emailVerified || isEmailVerified) && (
          <p className="mt-2 text-xs text-emerald-400 font-semibold inline-flex items-center justify-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-emerald-400" /> Email verified
          </p>
        )}

        {/* Confirmed Details Card */}
        <div className="mt-6 rounded-2xl border border-[#E1B76F]/30 bg-[#3b050b] p-5 sm:p-7 text-left w-full space-y-3.5 text-sm text-white/90 shadow-2xl">
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

        {/* Post-Order Guest Account Creation Card */}
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
              <form onSubmit={onSavePostAccountPassword} className="mt-3.5 space-y-2.5">
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
                  className="h-9 px-5 rounded-xl bg-[#E1B76F] text-[#530911] font-bold text-xs uppercase tracking-wider hover:bg-[#f3cb87] transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
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
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#E1B76F] px-8 py-3 text-sm font-bold text-[#530911] hover:bg-[#f3cb87] transition shadow-md"
          >
            <ShoppingBag className="h-4 w-4" />
            Continue Shopping
          </Link>
          <Link
            href="/my-account"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#E1B76F]/40 bg-[#42070e] px-8 py-3 text-sm font-bold text-white hover:bg-[#680c16] transition"
          >
            View My Account
          </Link>
        </div>
      </div>
    </div>
  );
}
