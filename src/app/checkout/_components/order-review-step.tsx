import Link from "next/link";
import Image from "next/image";
import {
  MapPin,
  Edit2,
  ShoppingBag,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Truck,
  Tag,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { CartItem } from "@/types/product";
import type { ShippingQuote } from "@/lib/shipping";
import type { AppliedPromo, CheckoutFormValues } from "../_types/checkout.types";

interface OrderReviewStepProps {
  formValues: CheckoutFormValues;
  items: CartItem[];
  subtotal: number;
  shippingQuote: ShippingQuote | null;
  shippingLoading: boolean;
  appliedPromo: AppliedPromo | null;
  discountAmount: number;
  finalTotal: number;
  policyAccepted: boolean;
  setPolicyAccepted: (accepted: boolean) => void;
  onEditDelivery: () => void;
  onConfirmAndContinue: () => void;
  submitError: string | null;
}

export function OrderReviewStep({
  formValues,
  items,
  subtotal,
  shippingQuote,
  shippingLoading,
  appliedPromo,
  discountAmount,
  finalTotal,
  policyAccepted,
  setPolicyAccepted,
  onEditDelivery,
  onConfirmAndContinue,
  submitError,
}: OrderReviewStepProps) {
  const formatTaka = (amount: number) => `৳${Math.round(amount).toLocaleString("en-BD")}`;

  return (
    <div className="space-y-6">
      {/* ── 1. Delivery Details Review Card ── */}
      <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-5 sm:p-6 shadow-md shadow-black/20 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E1B76F]/20 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E1B76F]/15 text-[#E1B76F] border border-[#E1B76F]/30">
              <MapPin className="h-4 w-4" />
            </span>
            <h2 className="text-base font-serif font-bold text-white">
              Recipient &amp; Delivery Destination
            </h2>
          </div>
          <button
            type="button"
            onClick={onEditDelivery}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E1B76F] hover:text-[#f3cb87] hover:underline cursor-pointer transition"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Edit Address</span>
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 text-xs sm:text-sm">
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50 block">
              Recipient Details
            </span>
            <p className="font-bold text-white text-base">{formValues.name || "Customer"}</p>
            <p className="text-white/80 font-mono">{formValues.phone}</p>
            <p className="text-white/70">{formValues.email}</p>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50 block">
              Shipping Address
            </span>
            <p className="text-white/90 leading-relaxed font-medium">
              {formValues.streetAddress}
            </p>
            <p className="text-white/75">
              {formValues.city}, {formValues.district}
              {formValues.postcode ? ` - ${formValues.postcode}` : ""}
            </p>
            {formValues.orderNotes && (
              <p className="text-[11.5px] text-[#E1B76F]/90 bg-[#280504] border border-[#E1B76F]/20 rounded-lg p-2 mt-2">
                <strong>Delivery Note:</strong> {formValues.orderNotes}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Order Items Review Card ── */}
      <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-5 sm:p-6 shadow-md shadow-black/20 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E1B76F]/20 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E1B76F]/15 text-[#E1B76F] border border-[#E1B76F]/30">
              <ShoppingBag className="h-4 w-4" />
            </span>
            <h2 className="text-base font-serif font-bold text-white">
              Items in Your Bag ({items.reduce((sum, item) => sum + item.quantity, 0)})
            </h2>
          </div>
          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E1B76F] hover:text-[#f3cb87] hover:underline transition"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Edit Bag</span>
          </Link>
        </div>

        <div className="divide-y divide-[#E1B76F]/15">
          {items.map((item, idx) => (
            <div key={`${item.productId}-${item.size}-${item.color}-${idx}`} className="py-3.5 flex items-center gap-3.5">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#E1B76F]/30 bg-[#280504]">
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
                    No Image
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-white truncate">{item.name}</p>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/60 mt-0.5">
                  {item.size && <span className="rounded bg-white/5 px-1.5 py-0.5">Size: {item.size}</span>}
                  {item.color && <span className="rounded bg-white/5 px-1.5 py-0.5">Color: {item.color}</span>}
                  <span>Qty: {item.quantity}</span>
                  <span>•</span>
                  <span>Unit: {formatTaka(item.price)}</span>
                </div>
              </div>

              <div className="text-right shrink-0 font-bold text-white text-xs sm:text-sm">
                {formatTaka(item.price * item.quantity)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. Verified Financial Breakdown Review ── */}
      <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#280504] p-5 sm:p-6 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/70">
          Financial Breakdown (Server Verified)
        </h3>

        <div className="space-y-2 text-xs sm:text-sm pt-2">
          <div className="flex justify-between text-white/80">
            <span>Subtotal</span>
            <span className="font-semibold text-white">{formatTaka(subtotal)}</span>
          </div>

          <div className="flex justify-between items-center text-white/80">
            <span className="flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-[#E1B76F]" /> Delivery Fee ({formValues.district || "Standard"})
            </span>
            <span>
              {shippingLoading ? (
                <span className="inline-block h-4 w-16 animate-pulse rounded bg-white/10" />
              ) : shippingQuote?.isFree ? (
                <span className="text-emerald-400 font-bold">৳0 (Free Delivery)</span>
              ) : (
                <span className="font-semibold text-white">
                  {formatTaka(shippingQuote?.fee ?? 80)}
                </span>
              )}
            </span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Promo Discount ({appliedPromo?.code})
              </span>
              <span>-{formatTaka(discountAmount)}</span>
            </div>
          )}

          <div className="pt-3 border-t border-[#E1B76F]/25 flex justify-between items-center text-base sm:text-lg font-bold">
            <span className="text-white">Final Payable Amount</span>
            <span className="text-[#E1B76F] font-serif text-xl sm:text-2xl">
              {formatTaka(finalTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* ── 4. Customer Policies & Legal Consent ── */}
      <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-5 sm:p-6 space-y-3.5 shadow-sm">
        <div className="flex items-start gap-3">
          <input
            id="policy-consent-checkbox"
            type="checkbox"
            checked={policyAccepted}
            onChange={(e) => setPolicyAccepted(e.target.checked)}
            className="mt-1 h-4.5 w-4.5 rounded accent-[#E1B76F] border-[#E1B76F]/40 cursor-pointer shrink-0"
          />
          <label
            htmlFor="policy-consent-checkbox"
            className="text-xs sm:text-[13px] text-white/85 leading-relaxed cursor-pointer select-none"
          >
            I confirm that I have reviewed my order details, and I agree to ANGKON&apos;s{" "}
            <Link
              href="/terms"
              target="_blank"
              className="text-[#E1B76F] font-bold underline hover:text-[#f3cb87]"
            >
              Terms &amp; Conditions
            </Link>
            ,{" "}
            <Link
              href="/return-refund-policy"
              target="_blank"
              className="text-[#E1B76F] font-bold underline hover:text-[#f3cb87]"
            >
              Return &amp; Refund Policy
            </Link>
            , and{" "}
            <Link
              href="/privacy-policy"
              target="_blank"
              className="text-[#E1B76F] font-bold underline hover:text-[#f3cb87]"
            >
              Privacy Policy
            </Link>
            .
          </label>
        </div>

        {/* Customer Reassurance Note */}
        <div className="rounded-xl bg-[#280504]/90 border border-white/5 p-3 flex items-start gap-2.5 text-[11px] text-white/70">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Customer Promise:</strong> Always check your parcel exterior and label with the delivery rider. Unworn items with intact tags are eligible for our 7-day exchange window.
          </p>
        </div>
      </div>

      {/* Error banner if validation failed */}
      {submitError && (
        <div className="rounded-xl border border-rose-500/50 bg-rose-950/40 p-4 text-xs text-rose-200 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      {/* ── 5. Navigation Actions ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onEditDelivery}
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl border border-[#E1B76F]/30 bg-[#280504] px-5 py-3 text-xs sm:text-sm font-semibold text-white/90 hover:bg-[#35060a] hover:border-[#E1B76F]/60 transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Delivery</span>
        </button>

        <button
          type="button"
          onClick={onConfirmAndContinue}
          className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto rounded-xl bg-gradient-to-r from-[#E1B76F] to-[#caa25e] px-7 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#230407] shadow-lg shadow-[#E1B76F]/20 hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
        >
          <span>Confirm Details &amp; Continue</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
