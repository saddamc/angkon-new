"use client";

import React from "react";
import Link from "next/link";
import { XCircle, RefreshCw, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentCancelledProps {
  orderNumber: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function PaymentCancelled({
  orderNumber,
  onRetry,
  isRetrying = false,
}: PaymentCancelledProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-6">
        <XCircle className="w-10 h-10 text-neutral-500" />
      </div>

      <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
        Payment Cancelled
      </h2>

      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
        You cancelled the payment before completion. Your order has not been charged.
      </p>

      <div className="w-full bg-neutral-50 dark:bg-neutral-800/60 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 space-y-2 text-xs text-neutral-600 dark:text-neutral-400 mb-6">
        <div className="flex justify-between">
          <span>Order Number:</span>
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">{orderNumber}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full">
        {onRetry && (
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? "animate-spin" : ""}`} />
            {isRetrying ? "Restarting Payment..." : "Complete Payment Now"}
          </Button>
        )}

        <Button
          variant="outline"
          asChild
          className="w-full border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-950 font-semibold shadow-xs"
        >
          <Link href="/checkout">
            <ShoppingCart className="w-4 h-4 mr-2 text-neutral-700 dark:text-neutral-300" />
            Return to Checkout
          </Link>
        </Button>
      </div>
    </div>
  );
}
