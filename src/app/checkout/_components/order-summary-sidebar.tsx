import Image from "next/image";
import { Lock, Tag, ShieldCheck } from "lucide-react";
import type { CartItem } from "@/types/product";
import type { ShippingQuote } from "@/lib/shipping";

interface OrderSummarySidebarProps {
  items: CartItem[];
  subtotal: number;
  shippingQuote: ShippingQuote | null;
  shippingLoading: boolean;
  discountAmount: number;
  finalTotal: number;
  checkoutStep: 1 | 2 | 3;
}

export function OrderSummarySidebar({
  items,
  subtotal,
  shippingQuote,
  shippingLoading,
  discountAmount,
  finalTotal,
  checkoutStep,
}: OrderSummarySidebarProps) {
  const formatPrice = (price: number) => `৳${Math.round(price).toLocaleString("en-BD")}`;

  const getColorDisplayName = (color: string) => {
    return color.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-5 sm:p-6 shadow-sm sticky top-24">
      <div className="flex items-center justify-between border-b border-[#E1B76F]/20 pb-2 mb-4">
        <h2 className="text-base font-serif font-bold text-white">Order Summary</h2>
        <span className="text-xs text-white/60">
          {items.reduce((acc, item) => acc + item.quantity, 0)} items
        </span>
      </div>

      <div className="space-y-4">
        {/* Item list */}
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {items.map((item, idx) => (
            <div
              key={`${item.productId}-${item.size}-${item.color}-${idx}`}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#280504] border border-[#E1B76F]/20">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-white/40">
                      No Img
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                  <p className="text-[11px] text-white/60">
                    {item.size ? `Size: ${item.size} • ` : ""}
                    {item.color ? `Color: ${getColorDisplayName(item.color)} • ` : ""}
                    Qty: {item.quantity}
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

        {/* Step Guide Badge */}
        <div className="rounded-xl bg-[#280504]/90 border border-white/5 p-3 text-center">
          <span className="text-[11px] font-semibold text-[#E1B76F] uppercase tracking-wider block">
            {checkoutStep === 1
              ? "Step 1 of 3: Delivery Details"
              : checkoutStep === 2
                ? "Step 2 of 3: Order Review"
                : "Step 3 of 3: Payment Selection"}
          </span>
          <p className="text-[11.5px] text-white/70 mt-0.5">
            {checkoutStep === 1
              ? "Complete address form to continue to review."
              : checkoutStep === 2
                ? "Verify your order items and delivery details."
                : "Choose Cash on Delivery or Secure Online Payment."}
          </p>
        </div>

        {/* Trust Footer */}
        <p className="text-[11px] text-center text-white/55 flex items-center justify-center gap-1.5 pt-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>SSLCOMMERZ 256-Bit Bank-Grade Security</span>
        </p>
      </div>
    </div>
  );
}
