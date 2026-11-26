"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Download, ShoppingBag, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart-store";

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
  // Clear the shopping bag only once payment is verified by the server.
  // Keeping items in the bag until confirmation ensures failed or cancelled
  // gateway attempts never leave the customer with an empty cart.
  useEffect(() => {
    useCartStore.getState().clearCart();
    try {
      localStorage.removeItem("angkon_applied_promo");
    } catch {
      /* ignore */
    }
  }, [orderNumber]);

  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center mb-5 shadow-inner">
        <CheckCircle2 className="w-9 h-9 text-emerald-400" />
      </div>

      <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 mb-3">
        Payment Verified
      </span>

      <h2 className="text-2xl font-heading font-black tracking-wide text-white mb-2">
        Payment Confirmed
      </h2>

      <p className="text-sm text-white/75 mb-6 max-w-sm leading-relaxed">
        Thank you for shopping with ANGKON. Your payment has been verified and your order is now being prepared.
      </p>

      <div className="w-full rounded-xl p-4 bg-[#2e050a]/80 border border-[#E1B76F]/25 space-y-2.5 text-xs text-white/75 mb-6">
        <div className="flex justify-between items-center">
          <span>Order Reference</span>
          <span className="font-bold text-white tracking-wide">{orderNumber}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Amount Paid</span>
          <span className="font-bold text-emerald-400 text-sm">
            ৳{amount.toLocaleString("en-BD")}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span>Payment Reference</span>
          <span className="font-mono text-white/90">{tranId}</span>
        </div>
        {valId && (
          <div className="flex justify-between items-center">
            <span>Confirmation ID</span>
            <span className="font-mono text-white/90">{valId}</span>
          </div>
        )}
        {paidAt && (
          <div className="flex justify-between items-center">
            <span>Confirmed At</span>
            <span className="text-white/90" suppressHydrationWarning>
              {new Date(paidAt).toLocaleString("en-BD", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Dhaka",
              })}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5 w-full">
        <Button
          asChild
          className="w-full bg-[#E1B76F] hover:bg-[#d4a657] text-[#2a0408] font-bold"
        >
          <Link href={`/my-account?tab=orders&order=${encodeURIComponent(orderNumber)}`}>
            View Order Details
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
          <Button
            variant="outline"
            asChild
            className="border-[#E1B76F]/35 bg-white/5 text-white hover:bg-white/10 hover:text-white font-semibold"
          >
            <a
              href={`/api/orders/${encodeURIComponent(orderNumber)}/invoice`}
              download={`ANGKON-Invoice-${orderNumber}.pdf`}
            >
              <Download className="w-4 h-4 mr-2 text-[#E1B76F]" />
              Download PDF
            </a>
          </Button>
          <Button
            variant="outline"
            asChild
            className="border-[#E1B76F]/35 bg-white/5 text-white hover:bg-white/10 hover:text-white font-semibold"
          >
            <Link href={`/track?orderNumber=${encodeURIComponent(orderNumber)}`}>
              <Truck className="w-4 h-4 mr-2 text-[#E1B76F]" />
              Track Order
            </Link>
          </Button>
        </div>
        <Button
          variant="outline"
          asChild
          className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white font-semibold"
        >
          <Link href="/products">
            <ShoppingBag className="w-4 h-4 mr-2 text-white/80" />
            Continue Shopping
          </Link>
        </Button>
      </div>
    </div>
  );
}
