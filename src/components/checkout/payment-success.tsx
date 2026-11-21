"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentSuccessProps {
  orderNumber: string;
  amount: number;
  tranId: string;
  valId?: string | null;
  paidAt?: Date | string | null;
}

export function PaymentSuccess({
  orderNumber,
  amount,
  tranId,
  valId,
  paidAt,
}: PaymentSuccessProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mb-6">
        <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
      </div>

      <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
        Payment Confirmed!
      </h2>

      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
        Thank you for your order. Your payment was verified successfully and your order is now in processing.
      </p>

      <div className="w-full bg-neutral-50 dark:bg-neutral-800/60 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 space-y-2 text-xs text-neutral-600 dark:text-neutral-400 mb-6">
        <div className="flex justify-between">
          <span>Order Number:</span>
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">{orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Amount Paid:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">৳{amount.toLocaleString("en-BD")}</span>
        </div>
        <div className="flex justify-between">
          <span>Transaction ID:</span>
          <span className="font-mono text-neutral-700 dark:text-neutral-300">{tranId}</span>
        </div>
        {valId && (
          <div className="flex justify-between">
            <span>Validation ID:</span>
            <span className="font-mono text-neutral-700 dark:text-neutral-300">{valId}</span>
          </div>
        )}
        {paidAt && (
          <div className="flex justify-between">
            <span>Payment Time:</span>
            <span>{new Date(paidAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Button
          asChild
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Link href={`/account/orders/${orderNumber}`}>
            View Order
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
        <Button
          variant="outline"
          asChild
          className="flex-1 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-950 font-semibold shadow-xs"
        >
          <Link href="/shop">
            <ShoppingBag className="w-4 h-4 mr-2 text-neutral-700 dark:text-neutral-300" />
            Continue Shopping
          </Link>
        </Button>
      </div>
    </div>
  );
}
