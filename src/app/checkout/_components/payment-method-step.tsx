import { useState } from "react";
import {
  Truck,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Building2,
  Smartphone,
  Sparkles,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";

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

/* ── Authentic Brand SVG Badges ────────────────────────────────────────── */

function BkashBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg bg-[#E2136E] text-white shadow-xs font-bold tracking-wide transition-transform hover:scale-105 ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      }`}
    >
      <svg className="h-3 w-3 fill-current shrink-0" viewBox="0 0 24 24">
        <path d="M12.017 0L1.758 7.378l4.475 7.751 15.65-9.39L12.017 0zm-1.84 9.176l-4.47 2.682-1.789-3.1 6.259-3.754v4.172zm3.68 2.208l-4.472 2.683V9.895l4.472-2.683v4.172zm-4.472 4.891l-4.47 2.682-1.789-3.1 6.259-3.754v4.172zm9.155-5.493L12.068 14.5v-4.172l6.472-3.883v4.337z" />
      </svg>
      bKash
    </span>
  );
}

function NagadBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#F7941D] to-[#ED1C24] text-white shadow-xs font-bold tracking-wide transition-transform hover:scale-105 ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      }`}
    >
      <svg className="h-3 w-3 fill-current shrink-0" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M12 6a6 6 0 0 1 6 6c0 3.314-2.686 6-6 6a6 6 0 0 1-6-6" fill="currentColor" />
      </svg>
      Nagad
    </span>
  );
}

function RocketBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg bg-[#8C3494] text-white shadow-xs font-bold tracking-wide transition-transform hover:scale-105 ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      }`}
    >
      <svg className="h-3 w-3 fill-current shrink-0" viewBox="0 0 24 24">
        <path d="M12 2.5s3 3.5 3 7.5a3 3 0 0 1-6 0c0-4 3-7.5 3-7.5zm0 13a4.5 4.5 0 0 1-4.5-4.5c0-1.5.5-3 1.5-4.2A9.2 9.2 0 0 0 12 4.1a9.2 9.2 0 0 0 3 2.7c1 1.2 1.5 2.7 1.5 4.2a4.5 4.5 0 0 1-4.5 4.5zm-5 1.5l-2 3.5h14l-2-3.5H7z" />
      </svg>
      Rocket
    </span>
  );
}

function UpayBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg bg-[#003874] text-[#FFC400] shadow-xs font-black tracking-wide border border-[#FFC400]/30 transition-transform hover:scale-105 ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      }`}
    >
      upay
    </span>
  );
}

function VisaBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg bg-white shadow-xs border border-stone-200 shrink-0 transition-transform hover:scale-105 ${
        compact ? "px-1.5 py-0.5" : "px-2.5 py-1"
      }`}
    >
      <svg className={compact ? "h-3 w-8" : "h-3.5 w-10"} viewBox="0 0 36 12" fill="none">
        <path
          d="M14.5 11.2L16.6 0.8H19.9L17.8 11.2H14.5ZM27.3 11.2L29.8 0.8H32.7L29.4 11.2H27.3ZM26.2 3.6C26 2.8 25.1 2.3 23.9 2.3C22.4 2.3 21.2 3 21.2 4.1C21.2 5.1 22.1 5.6 23.1 6.1C24.1 6.6 24.6 7 24.6 7.7C24.6 8.7 23.4 9.2 22.1 9.2C20.8 9.2 19.9 8.7 19.4 8.3L18.8 10.6C19.6 11 20.8 11.3 22.1 11.3C25 11.3 26.9 9.9 26.9 7.8C26.9 6.2 25.7 5.3 24.3 4.6C23.5 4.2 23 3.9 23 3.4C23 2.9 23.5 2.5 24.3 2.5C25.1 2.5 25.7 2.7 26.2 2.9L26.2 3.6ZM12.7 11.2L10.3 0.8H7.3L4.8 8C4.6 8.5 4.4 8.7 3.9 9C3.1 9.4 1.9 9.8 0.8 10L1 11.2H6.6C7.4 11.2 8.1 10.7 8.3 9.8L9.6 3.1L12.7 11.2Z"
          fill="#1A1F71"
        />
        <path d="M5.3 0.8H0.6L0.5 1.1C4.1 2 7.1 5.3 8.1 9.8L7.3 1.9C7.1 1.1 6.4 0.8 5.3 0.8Z" fill="#F7B600" />
      </svg>
    </span>
  );
}

function MastercardBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg bg-[#222222] shadow-xs border border-white/10 shrink-0 transition-transform hover:scale-105 ${
        compact ? "px-1.5 py-0.5" : "px-2 py-1"
      }`}
    >
      <svg className={compact ? "h-3 w-6" : "h-3.5 w-7"} viewBox="0 0 24 16" fill="none">
        <circle cx="8" cy="8" r="6" fill="#EB001B" />
        <circle cx="16" cy="8" r="6" fill="#F79E1B" fillOpacity="0.85" />
      </svg>
    </span>
  );
}

function AmexBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg bg-[#006FCF] text-white font-black tracking-tighter shadow-xs border border-[#006FCF]/40 shrink-0 transition-transform hover:scale-105 ${
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
      }`}
    >
      AMEX
    </span>
  );
}

function NexusBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg bg-[#008060] text-white font-bold tracking-tight shadow-xs border border-emerald-400/30 shrink-0 transition-transform hover:scale-105 ${
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
      }`}
    >
      NEXUS
    </span>
  );
}

function BankTile({ name, initials, color }: { name: string; initials: string; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-[#2d0508] border border-white/5 p-2 transition hover:border-[#E1B76F]/40 hover:bg-[#38060b]">
      <span
        className="flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-black text-white shrink-0 shadow-xs"
        style={{ backgroundColor: color }}
      >
        {initials}
      </span>
      <span className="text-[11.5px] font-medium text-white/90 truncate">{name}</span>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────────────────── */

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
  const [activeCategory, setActiveCategory] = useState<"all" | "mfs" | "cards" | "bank">("all");
  const formatTaka = (amount: number) => `৳${Math.round(amount).toLocaleString("en-BD")}`;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-5 sm:p-6 shadow-md shadow-black/20 space-y-5">
        <div className="border-b border-[#E1B76F]/20 pb-3">
          <h2 className="text-base font-serif font-bold text-white flex items-center gap-2">
            <span>3. Choose Your Preferred Payment Method</span>
          </h2>
          <p className="text-xs text-white/60 mt-1">
            Select how you would like to complete your purchase. Cash on Delivery and all major digital channels are fully supported.
          </p>
        </div>

        {/* ── Option A: Cash on Delivery Card ─────────────────────────────── */}
        <div
          onClick={() => setPaymentMethod("cod")}
          className={`block rounded-2xl border p-4 sm:p-5 transition-all duration-200 cursor-pointer ${
            paymentMethod === "cod"
              ? "border-[#E1B76F] bg-gradient-to-r from-[#3a0604] to-[#45070f] ring-1 ring-[#E1B76F]/80 shadow-lg shadow-black/25"
              : "border-[#E1B76F]/20 bg-[#42070e]/80 hover:border-[#E1B76F]/50 hover:bg-[#480810]"
          }`}
        >
          <div className="flex items-start gap-3.5">
            <input
              type="radio"
              name="payment_method"
              value="cod"
              checked={paymentMethod === "cod"}
              onChange={() => setPaymentMethod("cod")}
              className="mt-1 h-4.5 w-4.5 accent-[#E1B76F] cursor-pointer shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E1B76F]/15 text-[#E1B76F] border border-[#E1B76F]/30">
                    <Truck className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[14.5px] font-bold text-white leading-tight">
                      Cash on Delivery (COD)
                    </p>
                    <p className="text-[11px] text-[#E1B76F]/80 font-medium">
                      Doorstep settlement upon parcel delivery
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-stone-900/60 border border-[#E1B76F]/30 px-2.5 py-0.5 text-[10.5px] font-semibold text-[#E1B76F]">
                  COD Surcharge: ৳0 (Free)
                </span>
              </div>
              <p className="text-xs text-white/70 mt-2 leading-relaxed">
                Pay the exact payable amount in cash directly to the delivery rider when your parcel arrives at your doorstep. No advance deposit required.
              </p>

              {/* Dedicated COD Action CTA Button when COD is selected */}
              {paymentMethod === "cod" && (
                <div className="mt-4 pt-3.5 border-t border-[#E1B76F]/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-white/70 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Amount due on delivery: <strong className="text-white">{formatTaka(finalTotal)}</strong></span>
                  </div>

                  <button
                    type="button"
                    disabled={placing}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSubmitOrder("cod");
                    }}
                    className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl bg-gradient-to-r from-[#E1B76F] to-[#caa25e] px-7 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#230407] shadow-lg shadow-[#E1B76F]/20 hover:brightness-110 active:scale-[0.98] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {placing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Confirming Order...</span>
                      </>
                    ) : (
                      <>
                        <Truck className="h-4 w-4" />
                        <span>Place COD Order · {formatTaka(finalTotal)}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Option B: Secure Online Payment (SSLCOMMERZ) Card ───────────── */}
        <div
          onClick={() => {
            if (onlinePaymentAvailable && paymentMethod === "cod") {
              setPaymentMethod("sslcommerz");
            }
          }}
          aria-disabled={!onlinePaymentAvailable}
          className={`block rounded-2xl border p-4 sm:p-5 transition-all duration-200 ${
            onlinePaymentAvailable ? "cursor-pointer" : "cursor-not-allowed opacity-60"
          } ${
            paymentMethod !== "cod"
              ? "border-[#E1B76F] bg-gradient-to-r from-[#3a0604] to-[#45070f] ring-1 ring-[#E1B76F]/80 shadow-lg shadow-black/25"
              : "border-[#E1B76F]/20 bg-[#42070e]/80 hover:border-[#E1B76F]/50 hover:bg-[#480810]"
          }`}
        >
          <div className="flex items-start gap-3.5">
            <input
              type="radio"
              name="payment_method"
              value="sslcommerz"
              checked={paymentMethod !== "cod"}
              disabled={!onlinePaymentAvailable}
              onChange={() => setPaymentMethod("sslcommerz")}
              className="mt-1 h-4.5 w-4.5 accent-[#E1B76F] disabled:cursor-not-allowed cursor-pointer shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E1B76F]/15 text-[#E1B76F] border border-[#E1B76F]/30">
                    <CreditCard className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[14.5px] font-bold text-white leading-tight">
                      Secure Online Payment (Instant &amp; Automated)
                    </p>
                    <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Instant Confirmation • 0% Surcharge
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-300">
                  Recommended
                </span>
              </div>

              <p className="text-xs text-white/70 mt-2 leading-relaxed">
                {onlinePaymentAvailable
                  ? "Seamless, automated checkout powered by SSLCOMMERZ — Bangladesh's premier licensed payment gateway. Accepts bKash, Nagad, Rocket, Upay, Visa, Mastercard, and Net Banking."
                  : "Online gateway temporarily offline. Please select Cash on Delivery."}
              </p>

              {/* Quick Logo Strip (Always Visible) */}
              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                <BkashBadge compact />
                <NagadBadge compact />
                <RocketBadge compact />
                <UpayBadge compact />
                <VisaBadge compact />
                <MastercardBadge compact />
                <AmexBadge compact />
                <NexusBadge compact />
              </div>
            </div>
          </div>

          {/* ── Expanded Industry-Grade Payment Options Showcase ──────────── */}
          {onlinePaymentAvailable && paymentMethod !== "cod" && (
            <div className="mt-5 pt-4 border-t border-[#E1B76F]/25 pl-0 sm:pl-8 space-y-4">
              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pb-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveCategory("all");
                  }}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                    activeCategory === "all"
                      ? "bg-[#E1B76F] text-[#230407]"
                      : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  All Channels
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveCategory("mfs");
                  }}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                    activeCategory === "mfs"
                      ? "bg-[#E1B76F] text-[#230407]"
                      : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  Mobile Banking (MFS)
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveCategory("cards");
                  }}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                    activeCategory === "cards"
                      ? "bg-[#E1B76F] text-[#230407]"
                      : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  Debit &amp; Credit Cards
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveCategory("bank");
                  }}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                    activeCategory === "bank"
                      ? "bg-[#E1B76F] text-[#230407]"
                      : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  Net Banking
                </button>
              </div>

              {/* Showcase Box Based on Category */}
              <div className="rounded-2xl bg-[#230407]/90 border border-[#E1B76F]/25 p-4 space-y-3.5">
                {/* Category 1: Mobile Banking */}
                {(activeCategory === "all" || activeCategory === "mfs") && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11.5px] font-bold text-white/80">
                      <span className="flex items-center gap-1.5 text-[#E1B76F]">
                        <Smartphone className="h-3.5 w-3.5" /> Mobile Financial Services (MFS)
                      </span>
                      <span className="text-[10px] text-white/50 font-normal">PIN &amp; OTP protected</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPaymentMethod("bkash");
                        }}
                        className={`flex items-center justify-center p-2 rounded-xl border transition cursor-pointer ${
                          paymentMethod === "bkash"
                            ? "bg-[#E2136E]/20 border-[#E2136E] ring-1 ring-[#E2136E]"
                            : "bg-[#35060a] border-white/5 hover:border-white/20"
                        }`}
                      >
                        <BkashBadge />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPaymentMethod("nagad");
                        }}
                        className={`flex items-center justify-center p-2 rounded-xl border transition cursor-pointer ${
                          paymentMethod === "nagad"
                            ? "bg-[#F7941D]/20 border-[#F7941D] ring-1 ring-[#F7941D]"
                            : "bg-[#35060a] border-white/5 hover:border-white/20"
                        }`}
                      >
                        <NagadBadge />
                      </button>
                      <div className="flex items-center justify-center p-2 rounded-xl bg-[#35060a] border border-white/5 opacity-80">
                        <RocketBadge />
                      </div>
                      <div className="flex items-center justify-center p-2 rounded-xl bg-[#35060a] border border-white/5 opacity-80">
                        <UpayBadge />
                      </div>
                    </div>
                  </div>
                )}

                {/* Category 2: Credit / Debit Cards */}
                {(activeCategory === "all" || activeCategory === "cards") && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between text-[11.5px] font-bold text-white/80">
                      <span className="flex items-center gap-1.5 text-[#E1B76F]">
                        <CreditCard className="h-3.5 w-3.5" /> Debit &amp; Credit Cards
                      </span>
                      <span className="text-[10px] text-white/50 font-normal">Direct Card Terminal</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPaymentMethod("cards");
                        }}
                        className={`flex items-center justify-center p-2 rounded-xl border transition cursor-pointer ${
                          paymentMethod === "cards"
                            ? "bg-[#E1B76F]/20 border-[#E1B76F] ring-1 ring-[#E1B76F]"
                            : "bg-[#35060a] border-white/5 hover:border-white/20"
                        }`}
                      >
                        <VisaBadge />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPaymentMethod("cards");
                        }}
                        className={`flex items-center justify-center p-2 rounded-xl border transition cursor-pointer ${
                          paymentMethod === "cards"
                            ? "bg-[#E1B76F]/20 border-[#E1B76F] ring-1 ring-[#E1B76F]"
                            : "bg-[#35060a] border-white/5 hover:border-white/20"
                        }`}
                      >
                        <MastercardBadge />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPaymentMethod("cards");
                        }}
                        className={`flex items-center justify-center p-2 rounded-xl border transition cursor-pointer ${
                          paymentMethod === "cards"
                            ? "bg-[#E1B76F]/20 border-[#E1B76F] ring-1 ring-[#E1B76F]"
                            : "bg-[#35060a] border-white/5 hover:border-white/20"
                        }`}
                      >
                        <AmexBadge />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPaymentMethod("cards");
                        }}
                        className={`flex items-center justify-center p-2 rounded-xl border transition cursor-pointer ${
                          paymentMethod === "cards"
                            ? "bg-[#E1B76F]/20 border-[#E1B76F] ring-1 ring-[#E1B76F]"
                            : "bg-[#35060a] border-white/5 hover:border-white/20"
                        }`}
                      >
                        <NexusBadge />
                      </button>
                    </div>
                  </div>
                )}

                {/* Category 3: Internet Banking */}
                {(activeCategory === "all" || activeCategory === "bank") && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between text-[11.5px] font-bold text-white/80">
                      <span className="flex items-center gap-1.5 text-[#E1B76F]">
                        <Building2 className="h-3.5 w-3.5" /> Major Internet Banking Channels
                      </span>
                      <span className="text-[10px] text-white/50 font-normal">Direct Net Banking</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <BankTile name="City Touch" initials="CT" color="#C8102E" />
                      <BankTile name="BRAC Bank" initials="BB" color="#004B87" />
                      <BankTile name="DBBL Nexus" initials="DB" color="#007A3D" />
                      <BankTile name="Islami Bank" initials="IB" color="#008060" />
                    </div>
                  </div>
                )}

                {/* Gateway Trust & Reassurance Note */}
                <div className="pt-2 border-t border-white/10 flex items-start gap-2.5 text-[11px] text-white/70">
                  <Lock className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <p className="leading-relaxed">
                    Upon pressing <strong className="text-white">Pay Securely Now</strong>, you will be redirected to the official SSLCOMMERZ gateway to finalize your payment securely. Your card &amp; banking credentials are never stored on our servers.
                  </p>
                </div>
              </div>

              {/* Dedicated Online Payment Action CTA Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-white/70 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>256-Bit SSL Encrypted Session</span>
                </div>

                <button
                  type="button"
                  disabled={placing}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSubmitOrder(paymentMethod);
                  }}
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl bg-gradient-to-r from-[#E1B76F] to-[#caa25e] px-7 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#230407] shadow-lg shadow-[#E1B76F]/20 hover:brightness-110 active:scale-[0.98] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                          : "Initiating Payment..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>
                        {paymentMethod === "bkash"
                          ? `Pay with bKash · ${formatTaka(finalTotal)}`
                          : paymentMethod === "nagad"
                          ? `Pay with Nagad · ${formatTaka(finalTotal)}`
                          : paymentMethod === "cards"
                          ? `Pay with Card · ${formatTaka(finalTotal)}`
                          : `Pay Securely Now · ${formatTaka(finalTotal)}`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {submitError && (
        <div className="rounded-xl border border-rose-500/50 bg-rose-950/40 p-4 text-xs text-rose-200 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Secondary Back Action */}
      <div className="flex justify-start">
        <button
          type="button"
          onClick={onBackToReview}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E1B76F]/30 bg-[#280504] px-5 py-3 text-xs sm:text-sm font-semibold text-white/90 hover:bg-[#35060a] hover:border-[#E1B76F]/60 transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Order Review</span>
        </button>
      </div>
    </div>
  );
}
