"use client";

import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { useMounted } from "@/hooks/use-mounted";

export function FloatingCartButton() {
  const openCart = useCartStore((s) => s.openCart);
  const mounted = useMounted();
  const itemCount = useCartStore((s) => s.itemCount());

  return (
    <button
      onClick={openCart}
      className="group fixed bottom-6 left-3 sm:left-4 z-40 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-[#400604] text-white border border-[#E1B76F]/40 shadow-2xl transition-all hover:scale-110 cursor-pointer"
      aria-label="Open cart"
    >
      <ShoppingBag className="h-5 w-5 text-white transition group-hover:scale-105" />
      {mounted && itemCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#E1B76F] text-[10px] font-black text-[#400604] shadow">
          {itemCount}
        </span>
      )}
    </button>
  );
}
