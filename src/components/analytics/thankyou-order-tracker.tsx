"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { trackPurchase } from "@/lib/fpixel";

export function ThankYouOrderTracker() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams?.get("order")?.trim();
  const paymentStatus = searchParams?.get("payment")?.trim();
  const hasTriggeredRef = useRef<boolean>(false);

  useEffect(() => {
    // Only verify and track for valid redirected post-payment returns
    if (!orderNumber || paymentStatus !== "success") return;
    if (hasTriggeredRef.current) return;

    const storageKey = `angkon_purchase_tracked_${orderNumber}`;
    try {
      if (sessionStorage.getItem(storageKey) === "true") {
        return; // Idempotency: prevent repeat firing on refresh or back/forward navigation
      }
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

  return null;
}
