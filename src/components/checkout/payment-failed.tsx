"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, ShoppingCart, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentFailedProps {
  orderNumber: string;
  amount?: number;
  tranId?: string;
  reason?: string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function PaymentFailed({
  orderNumber,
  amount,
  tranId,
  reason,
  onRetry,
  isRetrying = false,
}: PaymentFailedProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-rose-500/15 border border-rose-400/40 flex items-center justify-center mb-5">
        <AlertCircle className="w-9 h-9 text-rose-400" />
      </div>

      <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-400/30 mb-3">
        Payment Failed
      </span>

      <h2 className="text-2xl font-heading font-black tracking-wide text-white mb-2">
        Payment Not Completed
      </h2>

      <p className="text-sm text-white/75 mb-6 max-w-sm leading-relaxed">
        {reason ||
          "Your bank or mobile wallet could not complete this transaction. No funds were charged, and your bag items are still saved."}
      </p>

      <div className="w-full rounded-xl p-4 bg-[#2e050a]/80 border border-[#E1B76F]/25 space-y-2.5 text-xs text-white/75 mb-6">
        <div className="flex justify-between items-center">
          <span>Order Reference</span>
          <span className="font-bold text-white tracking-wide">{orderNumber}</span>
        </div>
        {typeof amount === "number" && (
          <div className="flex justify-between items-center">
            <span>Order Amount</span>
            <span className="font-bold text-[#E1B76F]">৳{amount.toLocaleString("en-BD")}</span>
          </div>
        )}
        {tranId && (
          <div className="flex justify-between items-center">
            <span>Payment Reference</span>
            <span className="font-mono text-white/90">{tranId}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5 w-full">
        {onRetry && (
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            className="w-full bg-[#E1B76F] hover:bg-[#d4a657] text-[#2a0408] font-bold"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? "animate-spin" : ""}`} />
            {isRetrying ? "Starting New Payment..." : "Retry Payment"}
          </Button>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
          <Button
            variant="outline"
            asChild
            className="border-[#E1B76F]/35 bg-white/5 text-white hover:bg-white/10 hover:text-white font-semibold"
          >
            <Link href="/checkout">
              <ShoppingCart className="w-4 h-4 mr-2 text-[#E1B76F]" />
              Return to Checkout
            </Link>
          </Button>
          <Button
            variant="outline"
            asChild
            className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white font-semibold"
          >
            <Link href="/contact">
              <HelpCircle className="w-4 h-4 mr-2 text-white/80" />
              Contact Support
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
