import { Tag, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import type { AppliedPromo } from "../_types/checkout.types";

interface PromoCodeStepProps {
  couponCode: string;
  setCouponCode: (code: string) => void;
  appliedPromo: AppliedPromo | null;
  couponLoading: boolean;
  couponMessage: string | null;
  couponError: string | null;
  onApplyCoupon: (e: React.FormEvent) => void;
  onRemoveCoupon: () => void;
}

export function PromoCodeStep({
  couponCode,
  setCouponCode,
  appliedPromo,
  couponLoading,
  couponMessage,
  couponError,
  onApplyCoupon,
  onRemoveCoupon,
}: PromoCodeStepProps) {
  return (
    <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-5 sm:p-6 shadow-sm">
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
          className="h-11 flex-1 rounded-xl border border-[#E1B76F]/30 bg-[#42070e] px-3.5 text-xs text-white outline-none placeholder:text-white/35 focus:border-[#E1B76F] uppercase tracking-wider font-semibold disabled:opacity-60"
        />
        {appliedPromo ? (
          <button
            type="button"
            onClick={onRemoveCoupon}
            className="h-11 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 px-5 text-xs font-bold uppercase hover:bg-rose-900 transition cursor-pointer"
          >
            Remove
          </button>
        ) : (
          <button
            type="button"
            onClick={onApplyCoupon}
            disabled={couponLoading || !couponCode.trim()}
            className="h-11 rounded-xl bg-[#E1B76F] text-[#530911] px-6 text-xs font-bold uppercase tracking-wider hover:bg-[#f3cb87] transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
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
  );
}
