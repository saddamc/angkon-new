import { Truck, CreditCard } from "lucide-react";

interface PaymentMethodStepProps {
  paymentMethod: "cod" | "sslcommerz";
  setPaymentMethod: (method: "cod" | "sslcommerz") => void;
}

const PAYMENT_BRANDS = ["bKash", "Nagad", "Rocket", "VISA", "Mastercard", "Amex"] as const;

export function PaymentMethodStep({
  paymentMethod,
  setPaymentMethod,
}: PaymentMethodStepProps) {
  return (
    <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-5 sm:p-6 shadow-sm space-y-3">
      <div className="border-b border-[#E1B76F]/20 pb-2 mb-2">
        <h2 className="text-base font-serif font-bold text-white">
          3. Payment method
        </h2>
      </div>

      {/* Option 1: Cash on Delivery */}
      <label
        onClick={() => setPaymentMethod("cod")}
        className={`block cursor-pointer rounded-xl border p-4 transition ${
          paymentMethod === "cod"
            ? "border-[#E1B76F] bg-[#3a0604] ring-1 ring-[#E1B76F]/60"
            : "border-[#E1B76F]/20 bg-[#42070e] hover:border-[#E1B76F]/40"
        }`}
      >
        <div className="flex items-center gap-3">
          <input
            type="radio"
            name="payment_method"
            value="cod"
            checked={paymentMethod === "cod"}
            onChange={() => setPaymentMethod("cod")}
            className="h-4 w-4 accent-[#E1B76F]"
          />
          <div className="flex-1">
            <p className="text-sm font-bold text-white flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-[#E1B76F]" />
              Cash on Delivery
            </p>
            <p className="text-xs text-white/70 mt-0.5">
              Pay when your order arrives.
            </p>
          </div>
        </div>
      </label>

      {/* Option 2: Online payment SSLCOMMERZ */}
      <label
        onClick={() => setPaymentMethod("sslcommerz")}
        className={`block cursor-pointer rounded-xl border p-4 transition ${
          paymentMethod === "sslcommerz"
            ? "border-[#E1B76F] bg-[#3a0604] ring-1 ring-[#E1B76F]/60"
            : "border-[#E1B76F]/20 bg-[#42070e] hover:border-[#E1B76F]/40"
        }`}
      >
        <div className="flex items-center gap-3">
          <input
            type="radio"
            name="payment_method"
            value="sslcommerz"
            checked={paymentMethod === "sslcommerz"}
            onChange={() => setPaymentMethod("sslcommerz")}
            className="h-4 w-4 accent-[#E1B76F]"
          />
          <div className="flex-1">
            <p className="text-sm font-bold text-white flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-[#E1B76F]" />
              Online payment
            </p>
            <p className="text-xs text-white/70 mt-0.5">
              Pay securely through SSLCOMMERZ.
            </p>
          </div>
        </div>
        {paymentMethod === "sslcommerz" && (
          <div className="mt-3 pl-7 flex flex-wrap gap-1.5">
            {PAYMENT_BRANDS.map((brand) => (
              <span
                key={brand}
                className="rounded-md border border-[#E1B76F]/30 bg-[#260302] px-2 py-0.5 text-[10px] font-bold text-white/90"
              >
                {brand}
              </span>
            ))}
          </div>
        )}
      </label>
    </div>
  );
}
