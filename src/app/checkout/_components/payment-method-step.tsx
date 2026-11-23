import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { PaymentDeliveryMethodsCard } from "./payment-delivery-methods-card";
import type { CheckoutPaymentMethod } from "../_types/checkout.types";

interface PaymentMethodStepProps {
  paymentMethod: CheckoutPaymentMethod;
  setPaymentMethod: (method: CheckoutPaymentMethod) => void;
  onlinePaymentAvailable: boolean;
  finalTotal: number;
  placing: boolean;
  submitError: string | null;
  onBackToReview: () => void;
  onSubmitOrder: (method: CheckoutPaymentMethod) => void;
}

/** Legacy step wrapper retained for compatibility; it shares the live,
 * two-choice payment selector and never exposes gateway subchannels here. */
export function PaymentMethodStep({
  paymentMethod,
  setPaymentMethod,
  onlinePaymentAvailable,
  finalTotal,
  placing,
  submitError,
  onBackToReview,
  onSubmitOrder,
}: PaymentMethodStepProps) {
  const isCod = paymentMethod === "cod";
  const activeMethod: CheckoutPaymentMethod = isCod ? "cod" : "sslcommerz";
  const totalLabel = `৳${Math.round(finalTotal).toLocaleString("en-BD")}`;

  return (
    <div className="space-y-4">
      <PaymentDeliveryMethodsCard
        paymentMethod={activeMethod}
        setPaymentMethod={setPaymentMethod}
        onlinePaymentAvailable={onlinePaymentAvailable}
      />

      {submitError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <p>{submitError}</p>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onBackToReview}
          disabled={placing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5 disabled:opacity-50"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to review
        </button>
        <button
          type="button"
          onClick={() => onSubmitOrder(activeMethod)}
          disabled={placing || (!isCod && !onlinePaymentAvailable)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#27408B] px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#1E3270] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {placing ? (
            <>
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : isCod ? (
            `Place COD order · ${totalLabel}`
          ) : (
            `Continue to secure payment · ${totalLabel}`
          )}
        </button>
      </div>
    </div>
  );
}
