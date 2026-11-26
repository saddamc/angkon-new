"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

interface PayNowButtonProps {
  orderNumber: string;
  amount: number;
}

export function PayNowButton({ orderNumber, amount }: PayNowButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    try {
      setBusy(true);
      setError(null);
      const res = await fetch("/api/payments/sslcommerz/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderNumber }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.data?.gatewayUrl) {
        setError(data.error || "Payment could not be started. Please try again.");
        setBusy(false);
        return;
      }
      window.location.assign(data.data.gatewayUrl);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={handlePay}
        disabled={busy}
        className="w-full bg-gradient-to-r from-[#E1B76F] to-[#edd19b] hover:brightness-105 text-[#240407] font-black uppercase tracking-wider"
      >
        {busy ? "Opening secure gateway..." : `Pay ৳${amount.toLocaleString("en-BD")} Securely`}
      </Button>
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </div>
  );
}
