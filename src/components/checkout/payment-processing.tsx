"use client";

import React from "react";
import { Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentProcessingProps {
  orderNumber?: string;
  amount?: number;
  tranId?: string;
  onRefreshStatus?: () => void;
  isRefreshing?: boolean;
}

export function PaymentProcessing({
  orderNumber,
  amount,
  tranId,
  onRefreshStatus,
  isRefreshing = false,
}: PaymentProcessingProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-[#E1B76F]/15 border border-[#E1B76F]/40 flex items-center justify-center mb-5">
        <Loader2 className="w-8 h-8 text-[#E1B76F] animate-spin" />
      </div>

      <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-[#E1B76F]/15 text-[#E1B76F] border border-[#E1B76F]/30 mb-3">
        Processing
      </span>

      <h2 className="text-2xl font-heading font-black tracking-wide text-white mb-2">
        Verifying Your Payment
      </h2>

      <p className="text-sm text-white/75 mb-6 max-w-sm leading-relaxed">
        We are securely confirming your transaction with SSLCOMMERZ. Please wait a moment — this page refreshes automatically.
      </p>

      {(orderNumber || amount !== undefined || tranId) && (
        <div className="w-full rounded-xl p-4 bg-[#2e050a]/80 border border-[#E1B76F]/25 space-y-2.5 text-xs text-white/75 mb-6">
          {orderNumber && (
            <div className="flex justify-between items-center">
              <span>Order Reference</span>
              <span className="font-bold text-white tracking-wide">{orderNumber}</span>
            </div>
          )}
          {amount !== undefined && (
            <div className="flex justify-between items-center">
              <span>Amount</span>
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
      )}

      {onRefreshStatus && (
        <Button
          onClick={onRefreshStatus}
          disabled={isRefreshing}
          variant="outline"
          className="w-full mb-4 border-[#E1B76F]/35 bg-white/5 text-white hover:bg-white/10 hover:text-white font-semibold"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Checking Status..." : "Refresh Payment Status"}
        </Button>
      )}

      <div className="flex items-center gap-1.5 text-xs text-white/60">
        <ShieldCheck className="w-4 h-4 text-[#E1B76F]" />
        <span>256-bit Encrypted SSLCOMMERZ Verification</span>
      </div>
    </div>
  );
}
