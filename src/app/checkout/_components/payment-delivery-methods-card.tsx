import { Check, CreditCard, ShieldCheck, Truck } from "lucide-react";
import type { CheckoutPaymentMethod } from "../_types/checkout.types";
import { isOnlinePaymentMethod } from "@/lib/payment-methods";

interface PaymentDeliveryMethodsCardProps {
  paymentMethod: CheckoutPaymentMethod;
  setPaymentMethod: (method: CheckoutPaymentMethod) => void;
  onlinePaymentAvailable?: boolean;
}

/**
 * Keep the store checkout choice simple: COD or pay online.
 * SSLCOMMERZ owns the individual bKash/Nagad/card/banking choices on its
 * hosted page, so they should not appear here as duplicate payment methods.
 */
export function PaymentDeliveryMethodsCard({
  paymentMethod,
  setPaymentMethod,
  onlinePaymentAvailable = true,
}: PaymentDeliveryMethodsCardProps) {
  const onlineSelected = isOnlinePaymentMethod(paymentMethod);

  return (
    <section className="rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#E1B76F]/20 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E1B76F]/30 bg-[#530911] text-[#E1B76F]">
            <CreditCard aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-base font-serif font-bold tracking-wide text-white">
              Payment method
            </h3>
            <p className="text-xs text-white/75">Choose how you&apos;d like to pay</p>
          </div>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full border border-[#E1B76F]/20 bg-[#530911]/60 px-2.5 py-1 text-[10px] font-semibold text-[#E1B76F] sm:inline-flex">
          <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-emerald-400" />
          Secure checkout
        </span>
      </div>

      <fieldset>
        <legend className="sr-only">Select a payment method</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label
            className={`relative flex min-h-[112px] cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
              paymentMethod === "cod"
                ? "border-[#E1B76F] bg-[#220406] ring-1 ring-[#E1B76F]/60"
                : "border-[#E1B76F]/20 bg-[#280504]/70 hover:border-[#E1B76F]/50 hover:bg-[#280504]"
            }`}
          >
            <input
              type="radio"
              name="checkout_payment_method"
              value="cod"
              checked={paymentMethod === "cod"}
              onChange={() => setPaymentMethod("cod")}
              className="mt-1 h-4 w-4 shrink-0 accent-[#E1B76F]"
            />
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#530911] text-[#E1B76F]">
              <Truck aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-white">Cash on Delivery</span>
                <span className="rounded border border-[#E1B76F]/20 bg-[#530911] px-1.5 py-0.5 text-[9px] font-semibold text-[#E1B76F]">
                  Pay at delivery
                </span>
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-stone-300">
                Pay the delivery agent when your order arrives.
              </span>
            </span>
            {paymentMethod === "cod" && (
              <Check aria-hidden="true" className="absolute right-3 top-3 h-4 w-4 text-[#E1B76F]" />
            )}
          </label>

          <label
            className={`relative flex min-h-[112px] items-start gap-3 rounded-xl border p-4 transition-colors ${
              onlinePaymentAvailable
                ? "cursor-pointer"
                : "cursor-not-allowed opacity-50"
            } ${
              onlineSelected
                ? "border-[#E1B76F] bg-[#220406] ring-1 ring-[#E1B76F]/60"
                : "border-[#E1B76F]/20 bg-[#280504]/70 hover:border-[#E1B76F]/50 hover:bg-[#280504]"
            }`}
          >
            <input
              type="radio"
              name="checkout_payment_method"
              value="sslcommerz"
              checked={onlineSelected}
              disabled={!onlinePaymentAvailable}
              onChange={() => {
                if (onlinePaymentAvailable) setPaymentMethod("sslcommerz");
              }}
              className="mt-1 h-4 w-4 shrink-0 accent-[#E1B76F] disabled:cursor-not-allowed"
            />
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#530911] text-[#E1B76F]">
              <CreditCard aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-white">Online payment</span>
                <span className="rounded border border-[#E1B76F]/20 bg-[#530911] px-1.5 py-0.5 text-[9px] font-semibold text-[#E1B76F]">
                  SSLCOMMERZ
                </span>
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-stone-300">
                Pay securely now using the methods available on the gateway page.
              </span>
              <span className="mt-2 block text-[10px] leading-relaxed text-stone-400">
                Available methods may include mobile wallets, cards, and supported mobile or internet banking.
              </span>
            </span>
            {onlineSelected && (
              <Check aria-hidden="true" className="absolute right-3 top-3 h-4 w-4 text-[#E1B76F]" />
            )}
          </label>
        </div>
      </fieldset>

      {onlinePaymentAvailable ? (
        <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-stone-400">
          <ShieldCheck aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
          When you continue, you&apos;ll be redirected to SSLCOMMERZ to choose an available payment method
          and complete payment securely.
        </p>
      ) : (
        <p
          role="status"
          className="mt-3 rounded-lg border border-amber-400/25 bg-amber-950/25 px-3 py-2 text-xs leading-relaxed text-amber-200"
        >
          Online payment is temporarily unavailable. Please choose Cash on Delivery.
        </p>
      )}
    </section>
  );
}
