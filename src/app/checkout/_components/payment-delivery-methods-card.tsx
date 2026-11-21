import React from "react";
import { CreditCard, Truck, ShieldCheck, Building2, CheckCircle2 } from "lucide-react";
import type { CheckoutPaymentMethod } from "../_types/checkout.types";

interface PaymentDeliveryMethodsCardProps {
  paymentMethod: CheckoutPaymentMethod;
  setPaymentMethod: (method: CheckoutPaymentMethod) => void;
  onlinePaymentAvailable?: boolean;
}

/* ── Brand Badges ── */

function BkashBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-[#E2136E] px-2 py-0.5 text-[10.5px] font-bold text-white shadow-xs">
      <svg className="h-3 w-3 fill-current shrink-0" viewBox="0 0 24 24">
        <path d="M12.017 0L1.758 7.378l4.475 7.751 15.65-9.39L12.017 0zm-1.84 9.176l-4.47 2.682-1.789-3.1 6.259-3.754v4.172zm3.68 2.208l-4.472 2.683V9.895l4.472-2.683v4.172zm-4.472 4.891l-4.47 2.682-1.789-3.1 6.259-3.754v4.172zm9.155-5.493L12.068 14.5v-4.172l6.472-3.883v4.337z" />
      </svg>
      bKash
    </span>
  );
}

function NagadBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-[#F7941D] to-[#ED1C24] px-2 py-0.5 text-[10.5px] font-bold text-white shadow-xs">
      <svg className="h-3 w-3 fill-current shrink-0" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M12 6a6 6 0 0 1 6 6c0 3.314-2.686 6-6 6a6 6 0 0 1-6-6" fill="currentColor" />
      </svg>
      Nagad
    </span>
  );
}

function CardsBadge() {
  return (
    <div className="inline-flex items-center gap-1">
      <span className="rounded bg-[#1434CB] px-1.5 py-0.5 text-[9.5px] font-black italic tracking-tighter text-white">
        VISA
      </span>
      <span className="rounded bg-[#222222] px-1.5 py-0.5 text-[9.5px] font-bold text-white flex items-center gap-0.5">
        <span className="h-2 w-2 rounded-full bg-[#EB001B] inline-block" />
        <span className="h-2 w-2 rounded-full bg-[#F79E1B] -ml-1.5 inline-block opacity-90" />
      </span>
      <span className="rounded bg-[#006FCF] px-1.5 py-0.5 text-[9.5px] font-bold text-white">
        AMEX
      </span>
    </div>
  );
}

export function PaymentDeliveryMethodsCard({
  paymentMethod,
  setPaymentMethod,
  onlinePaymentAvailable = true,
}: PaymentDeliveryMethodsCardProps) {
  const options: Array<{
    id: CheckoutPaymentMethod;
    title: string;
    subtitle: string;
    badge?: React.ReactNode;
    icon: React.ReactNode;
    disabled?: boolean;
    tag?: string;
  }> = [
    {
      id: "cod",
      title: "Cash on Delivery",
      subtitle: "Pay cash upon arrival · No advance deposit",
      icon: <Truck className="h-4 w-4 text-[#E1B76F]" />,
      tag: "Free Settlement",
    },
    {
      id: "bkash",
      title: "bKash Direct",
      subtitle: "Instant mobile payment via bKash app or PIN",
      icon: <CreditCard className="h-4 w-4 text-[#E2136E]" />,
      badge: <BkashBadge />,
      disabled: !onlinePaymentAvailable,
      tag: "Direct Gateway",
    },
    {
      id: "nagad",
      title: "Nagad Direct",
      subtitle: "Fast OTP/PIN settlement via Nagad wallet",
      icon: <CreditCard className="h-4 w-4 text-[#F7941D]" />,
      badge: <NagadBadge />,
      disabled: !onlinePaymentAvailable,
      tag: "Direct Gateway",
    },
    {
      id: "cards",
      title: "Debit / Credit Cards",
      subtitle: "Visa, Mastercard, Amex & DBBL Nexus",
      icon: <CreditCard className="h-4 w-4 text-[#E1B76F]" />,
      badge: <CardsBadge />,
      disabled: !onlinePaymentAvailable,
      tag: "3D Secure",
    },
    {
      id: "sslcommerz",
      title: "Other Online Banking",
      subtitle: "Rocket, Upay, Citytouch, IBBL & all banks",
      icon: <Building2 className="h-4 w-4 text-emerald-400" />,
      disabled: !onlinePaymentAvailable,
      tag: "SSLCOMMERZ",
    },
  ];

  return (
    <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-5 sm:p-6 shadow-sm space-y-4">
      {/* ── Card Header ── */}
      <div className="flex items-center justify-between border-b border-[#E1B76F]/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#530911] text-[#E1B76F] border border-[#E1B76F]/30">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-serif font-bold text-white tracking-wide">
              Payment Method
            </h3>
            <p className="text-xs text-white/80 font-normal">
              Choose your direct checkout channel
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#E1B76F]/90 font-medium bg-[#530911]/60 px-2.5 py-1 rounded-full border border-[#E1B76F]/20">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>256-Bit Bank Encrypted</span>
        </div>
      </div>

      {/* ── Payment Options Grid ── */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {options.map((option) => {
          const isSelected = paymentMethod === option.id;
          const isDisabled = option.disabled;

          return (
            <label
              key={option.id}
              onClick={() => {
                if (!isDisabled) setPaymentMethod(option.id);
              }}
              className={`relative flex items-start gap-3 rounded-xl border p-3.5 sm:p-4 cursor-pointer transition-all ${
                isSelected
                  ? "border-[#E1B76F] bg-[#220406] shadow-md ring-1 ring-[#E1B76F]/60"
                  : isDisabled
                  ? "border-neutral-800 bg-[#280504]/40 opacity-50 cursor-not-allowed"
                  : "border-[#E1B76F]/20 bg-[#280504]/70 hover:bg-[#280504] hover:border-[#E1B76F]/50"
              }`}
            >
              <input
                type="radio"
                name="checkout_payment_method"
                value={option.id}
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => {
                  if (!isDisabled) setPaymentMethod(option.id);
                }}
                className="mt-1 h-4 w-4 accent-[#E1B76F] cursor-pointer"
              />

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-sm tracking-wide">
                      {option.title}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#E1B76F] shrink-0" />
                    )}
                  </div>
                  {option.tag && (
                    <span className="text-[10px] font-semibold text-[#E1B76F]/90 bg-[#530911] px-1.5 py-0.5 rounded border border-[#E1B76F]/25">
                      {option.tag}
                    </span>
                  )}
                </div>

                <p className="text-xs text-stone-300 leading-snug">
                  {option.subtitle}
                </p>

                {option.badge && <div className="pt-1">{option.badge}</div>}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
