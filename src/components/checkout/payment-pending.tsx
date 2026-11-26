"use client";

import React from "react";
import Link from "next/link";
import { Clock, RefreshCw, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentPendingProps {
  orderNumber: string;
  amount: number;
  tranId?: string;
  onRefreshStatus?: () => void;
  isRefreshing?: boolean;
}

export function PaymentPending({
  orderNumber,
  amount,
  tranId,
  onRefreshStatus,
  isRefreshing = false,
}: PaymentPendingProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-400/40 flex items-center justify-center mb-5">
        <Clock className="w-9 h-9 text-[#E1B76F]" />
      </div>

      <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-amber-500/15 text-[#E1B76F] border border-[#E1B76F]/30 mb-3">
        Verification Pending
      </span>

      <h2 className="text-2xl font-heading font-black tracking-wide text-white mb-2">
        Payment Verification in Progress
      </h2>

      <p className="text-sm text-white/75 mb-6 max-w-sm leading-relaxed">
        If you completed payment in your bank or mobile wallet, we are awaiting final confirmation from SSLCOMMERZ. This page updates automatically.
      </p>

      <div className="w-full rounded-xl p-4 bg-[#2e050a]/80 border border-[#E1B76F]/25 space-y-2.5 text-xs text-white/75 mb-6">
        <div className="flex justify-between items-center">
          <span>Order Reference</span>
          <span className="font-bold text-white tracking-wide">{orderNumber}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Expected Amount</span>
          <span className="font-bold text-[#E1B76F]">৳{amount.toLocaleString("en-BD")}</span>
        </div>
        {tranId && (
          <div className="flex justify-between items-center">
            <span>Payment Reference</span>
            <span className="font-mono text-white/90">{tranId}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
        {onRefreshStatus && (
          <Button
            onClick={onRefreshStatus}
            disabled={isRefreshing}
            className="bg-[#E1B76F] hover:bg-[#d4a657] text-[#2a0408] font-bold"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Checking..." : "Check Status"}
          </Button>
        )}
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
  );
}
