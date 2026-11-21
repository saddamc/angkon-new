"use client";

import React from "react";
import { CreditCard, Banknote, ShieldCheck } from "lucide-react";

export type PaymentMethodType = "cod" | "sslcommerz";

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethodType;
  onSelectMethod: (method: PaymentMethodType) => void;
  disabled?: boolean;
}

export function PaymentMethodSelector({
  selectedMethod,
  onSelectMethod,
  disabled = false,
}: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-4">
      <label className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
        Select Payment Method
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* SSLCOMMERZ Online Payment Option */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelectMethod("sslcommerz")}
          className={`relative p-4 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between ${
            selectedMethod === "sslcommerz"
              ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-600/30"
              : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900"
          } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div className="flex items-start justify-between w-full mb-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  selectedMethod === "sslcommerz"
                    ? "bg-emerald-600 text-white"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                }`}
              >
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                  Online Payment
                </span>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  bKash, Nagad, Rocket, Cards
                </p>
              </div>
            </div>
            <span
              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                selectedMethod === "sslcommerz"
                  ? "border-emerald-600 bg-emerald-600"
                  : "border-neutral-300 dark:border-neutral-600"
              }`}
            >
              {selectedMethod === "sslcommerz" && (
                <span className="w-1.5 h-1.5 bg-white rounded-full" />
              )}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Instant confirmation via SSLCOMMERZ</span>
          </div>
        </button>

        {/* Cash on Delivery Option */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelectMethod("cod")}
          className={`relative p-4 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between ${
            selectedMethod === "cod"
              ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-600/30"
              : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900"
          } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div className="flex items-start justify-between w-full mb-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  selectedMethod === "cod"
                    ? "bg-emerald-600 text-white"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                }`}
              >
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                  Cash on Delivery
                </span>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Pay upon delivery at your doorstep
                </p>
              </div>
            </div>
            <span
              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                selectedMethod === "cod"
                  ? "border-emerald-600 bg-emerald-600"
                  : "border-neutral-300 dark:border-neutral-600"
              }`}
            >
              {selectedMethod === "cod" && (
                <span className="w-1.5 h-1.5 bg-white rounded-full" />
              )}
            </span>
          </div>

          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Delivery confirmation required
          </div>
        </button>
      </div>
    </div>
  );
}
