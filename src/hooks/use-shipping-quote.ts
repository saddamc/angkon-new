"use client";

import { useEffect, useState } from "react";
import type { ShippingQuote } from "@/lib/shipping";

interface QuoteItem {
  productId: number;
  price: number;
  quantity: number;
}

/**
 * Delivery quote from the server (admin settings + product fees), so the fee shown
 * in the cart and checkout always equals the fee the order is charged.
 * `loading` is true while the quote for the current cart/district hasn't arrived yet;
 * `quote` keeps the previous value meanwhile so the UI doesn't flicker.
 */
export function useShippingQuote(items: QuoteItem[], district?: string, city?: string, discount = 0) {
  const payload = JSON.stringify({
    district: district ?? "",
    city: city ?? "",
    discount: Math.max(0, Math.round(discount) || 0),
    items: items.map((i) => ({ productId: i.productId, price: i.price, quantity: i.quantity })),
  });
  const [result, setResult] = useState<{ payload: string; quote: ShippingQuote | null }>({
    payload: "",
    quote: null,
  });

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/shipping/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
        const data = (await res.json()) as { quote?: ShippingQuote };
        if (!cancelled) setResult({ payload, quote: res.ok && data.quote ? data.quote : null });
      } catch {
        if (!cancelled) setResult({ payload, quote: null });
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [payload]);

  return { quote: result.quote, loading: result.payload !== payload };
}
