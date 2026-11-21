"use client";

import React from "react";
import Link from "next/link";
import { Clock, RefreshCw, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentPendingProps {
  orderNumber: string;
  amount: number;
  onRefreshStatus?: () => void;
  isRefreshing?: boolean;
}

export function PaymentPending({
  orderNumber,
  amount,
  onRefreshStatus,
  isRefreshing = false,
}: PaymentPendingProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center mb-6">
        <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
      </div>

      <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
        Payment Verification in Progress
      </h2>

      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
        If you completed payment in the gateway or bank app, we are waiting for the final confirmation from the payment provider.
      </p>

      <div className="w-full bg-neutral-50 dark:bg-neutral-800/60 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 space-y-2 text-xs text-neutral-600 dark:text-neutral-400 mb-6">
        <div className="flex justify-between">
          <span>Order Number:</span>
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">{orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Expected Amount:</span>
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">৳{amount.toLocaleString("en-BD")}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full">
        {onRefreshStatus && (
          <Button
            onClick={onRefreshStatus}
            disabled={isRefreshing}
            className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:hover:bg-white dark:text-neutral-900"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Checking..." : "Check Status"}
          </Button>
        )}
        <Button
          variant="outline"
          asChild
          className="flex-1 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-950 font-semibold shadow-xs"
        >
          <Link href="/contact">
            <HelpCircle className="w-4 h-4 mr-2 text-neutral-700 dark:text-neutral-300" />
            Support
          </Link>
        </Button>
      </div>
    </div>
  );
}
