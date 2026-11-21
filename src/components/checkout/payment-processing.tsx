"use client";

import React from "react";
import { Loader2, ShieldCheck } from "lucide-react";

interface PaymentProcessingProps {
  orderNumber?: string;
  amount?: number;
}

export function PaymentProcessing({ orderNumber, amount }: PaymentProcessingProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center animate-pulse">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      </div>

      <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
        Processing Your Payment
      </h2>

      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
        We are securely communicating with SSLCOMMERZ to finalize your transaction. Please do not refresh or close this page.
      </p>

      {(orderNumber || amount !== undefined) && (
        <div className="w-full bg-neutral-50 dark:bg-neutral-800/60 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
          {orderNumber && (
            <div className="flex justify-between">
              <span>Order Number:</span>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">{orderNumber}</span>
            </div>
          )}
          {amount !== undefined && (
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">৳{amount.toLocaleString("en-BD")}</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex items-center gap-1.5 text-xs text-neutral-500">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>256-bit Encrypted SSLCOMMERZ Session</span>
      </div>
    </div>
  );
}
