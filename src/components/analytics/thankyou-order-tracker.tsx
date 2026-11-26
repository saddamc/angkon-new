"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Download, Truck } from "lucide-react";
import { trackPurchase } from "@/lib/fpixel";
import { useCartStore } from "@/store/cart-store";

interface VerifiedOrderSummary {
  orderNumber: string;
  value: number;
  currency: string;
}

export function ThankYouOrderTracker() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams?.get("order")?.trim();
  const paymentStatus = searchParams?.get("payment")?.trim();
  const hasTriggeredRef = useRef<boolean>(false);
  const [verifiedSummary, setVerifiedSummary] = useState<VerifiedOrderSummary | null>(null);

  useEffect(() => {
    // Only verify and track for valid redirected post-payment returns
    if (!orderNumber || paymentStatus !== "success") return;
    if (hasTriggeredRef.current) return;

    const storageKey = `angkon_purchase_tracked_${orderNumber}`;
    let alreadyTracked = false;
    try {
      alreadyTracked = sessionStorage.getItem(storageKey) === "true";
    } catch {
      // ignore storage access errors
    }

    hasTriggeredRef.current = true;

    // Secure server-side verification: fetch verified order metadata
    fetch(`/api/orders/verify-tracking?order=${encodeURIComponent(orderNumber)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || !data.verified || data.orderNumber !== orderNumber) {
          return;
        }

        setVerifiedSummary({
          orderNumber: data.orderNumber,
          value: Number(data.value || 0),
          currency: data.currency || "BDT",
        });

        // Clear cart and applied promo only once the server confirms the order is verified.
        useCartStore.getState().clearCart();
        try {
          localStorage.removeItem("angkon_applied_promo");
        } catch {
          // ignore storage access errors
        }

        // Sandbox payments must not emit a real browser Purchase event.
        if (data.sandbox) {
          return;
        }
        if (alreadyTracked) {
          return;
        }

        try {
          sessionStorage.setItem(storageKey, "true");
        } catch {
          // ignore
        }

        // Dispatch Browser Purchase with identical eventID, amount, and currency BDT
        trackPurchase({
          order_id: data.orderNumber,
          event_id: data.eventId || `order_${data.orderNumber}`,
          value: Number(data.value),
          currency: data.currency || "BDT",
          num_items: Number(data.num_items || 1),
          content_ids: Array.isArray(data.content_ids) ? data.content_ids : [],
          contents: Array.isArray(data.contents) ? data.contents : [],
        });
      })
      .catch((err) => {
        console.warn("[ThankYou Tracker] Verification fetch failed:", err);
      });
  }, [orderNumber, paymentStatus]);

  if (!verifiedSummary) {
    return null;
  }

  return (
    <div className="border-b border-[#6e101c] bg-[#2f0409] px-4 py-4">
      <div className="container mx-auto max-w-[1000px] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Payment Confirmed · Order #{verifiedSummary.orderNumber}
            </p>
            <p className="text-sm font-semibold text-white">
              Amount Paid: {verifiedSummary.currency} {verifiedSummary.value.toLocaleString("en-BD")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/my-account?tab=orders&order=${encodeURIComponent(verifiedSummary.orderNumber)}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#E1B76F] px-3.5 py-2 text-xs font-black uppercase text-[#2a0408] hover:bg-[#edd19b] transition"
          >
            View Order Details <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <a
            href={`/api/orders/${encodeURIComponent(verifiedSummary.orderNumber)}/invoice`}
            download={`ANGKON-Invoice-${verifiedSummary.orderNumber}.pdf`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E1B76F]/45 bg-[#3b050b] px-3.5 py-2 text-xs font-bold uppercase text-[#E1B76F] hover:border-[#E1B76F] transition"
          >
            <Download className="h-3.5 w-3.5" /> Invoice PDF
          </a>
          <Link
            href={`/track?orderNumber=${encodeURIComponent(verifiedSummary.orderNumber)}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/5 px-3.5 py-2 text-xs font-bold uppercase text-white hover:bg-white/10 transition"
          >
            <Truck className="h-3.5 w-3.5 text-[#E1B76F]" /> Track Order
          </Link>
        </div>
      </div>
    </div>
  );
}
