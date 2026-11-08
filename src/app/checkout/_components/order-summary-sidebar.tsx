import Image from "next/image";
import { Lock, Tag, AlertCircle, Loader2 } from "lucide-react";
import { formatPrice } from "@/utils/price";
import type { CartItem } from "@/types/product";
import type { ShippingQuote } from "@/lib/shipping";

interface OrderSummarySidebarProps {
  items: CartItem[];
  subtotal: number;
  shippingQuote: ShippingQuote | null;
  shippingLoading: boolean;
  discountAmount: number;
  finalTotal: number;
  isSubmitting: boolean;
  placing: boolean;
  submitError: string | null;
}

export function OrderSummarySidebar({
  items,
  subtotal,
  shippingQuote,
  shippingLoading,
  discountAmount,
  finalTotal,
  isSubmitting,
  placing,
  submitError,
}: OrderSummarySidebarProps) {
  const isBusy = isSubmitting || placing;

  return (
    <div className="lg:sticky lg:top-24">
      <div className="rounded-2xl border border-[#E1B76F]/30 bg-[#3b050b] p-6 sm:p-7 shadow-xl space-y-4">
        <h3 className="font-serif text-xl font-bold text-white pb-3 border-b border-[#E1B76F]/20">
          Order summary
        </h3>

        {/* Line items thumbnail list */}
        <div className="divide-y divide-[#E1B76F]/15 max-h-[300px] overflow-y-auto pr-1">
          {items.map((item) => (
            <div
              key={`${item.productId}-${item.size}-${item.color || ""}`}
              className="flex justify-between items-center py-3 gap-3"
            >
              <div className="flex gap-3 items-center min-w-0">
                {item.image && (
                  <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg border border-[#E1B76F]/30 bg-[#42070e]">
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
                    {item.size ? `Size: ${item.size} • ` : ""}{item.color ? `Color: ${item.color} • ` : ""}Qty: {item.quantity}
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
                <span className="inline-block h-4 w-20 animate-pulse rounded bg-[#42070e]" />
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
          <span className="text-xl font-bold text-[#E1B76F]">{formatPrice(finalTotal)}</span>
        </div>

        {/* Submission Error */}
        {submitError && (
          <div className="rounded-xl border border-rose-500/50 bg-rose-950/40 p-3 text-xs text-rose-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Order CTA Button */}
        <button
          type="submit"
          disabled={isBusy}
          className="w-full h-12 rounded-xl bg-[#E1B76F] text-[#530911] font-bold text-sm uppercase tracking-wider hover:bg-[#f3cb87] active:scale-98 transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBusy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-[#530911]" />
              <span>Placing Order…</span>
            </>
          ) : (
            <span>Place order · {formatPrice(finalTotal)}</span>
          )}
        </button>

        {/* Trust Footer */}
        <p className="text-[11px] text-center text-white/55 flex items-center justify-center gap-1.5 pt-1">
          <Lock className="h-3 w-3 text-[#E1B76F]" />
          Your personal information is handled securely.
        </p>
      </div>
    </div>
  );
}
