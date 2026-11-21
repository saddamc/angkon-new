"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, ShoppingCart, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentFailedProps {
  orderNumber: string;
  reason?: string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function PaymentFailed({
  orderNumber,
  reason,
  onRetry,
  isRetrying = false,
}: PaymentFailedProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950 flex items-center justify-center mb-6">
        <AlertCircle className="w-10 h-10 text-rose-600 dark:text-rose-400" />
      </div>

      <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
        Payment Failed
      </h2>

      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
        {reason || "Your bank or mobile wallet could not complete this transaction. No funds were charged."}
      </p>

      <div className="w-full bg-neutral-50 dark:bg-neutral-800/60 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 space-y-2 text-xs text-neutral-600 dark:text-neutral-400 mb-6">
        <div className="flex justify-between">
          <span>Order Number:</span>
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">{orderNumber}</span>
        </div>
        {reason && (
          <div className="flex justify-between text-left">
            <span>Gateway Note:</span>
            <span className="font-medium text-rose-600 dark:text-rose-400 max-w-[200px] truncate">{reason}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 w-full">
        {onRetry && (
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? "animate-spin" : ""}`} />
            {isRetrying ? "Starting New Payment..." : "Retry Payment"}
          </Button>
        )}

        <div className="flex gap-3 w-full">
          <Button
            variant="outline"
            asChild
            className="flex-1 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-950 font-semibold shadow-xs"
          >
            <Link href="/checkout">
              <ShoppingCart className="w-4 h-4 mr-2 text-neutral-700 dark:text-neutral-300" />
              Back to Checkout
            </Link>
          </Button>
          <Button
            variant="ghost"
            asChild
            className="flex-1 border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-950 font-semibold"
          >
            <Link href="/contact">
              <HelpCircle className="w-4 h-4 mr-2 text-neutral-700 dark:text-neutral-300" />
              Contact Support
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
