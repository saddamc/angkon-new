"use client";

import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { useMounted } from "@/hooks/use-mounted";

export function FloatingCartButton() {
  const openCart = useCartStore((state) => state.openCart);
  const itemCount = useCartStore((state) => state.itemCount());
  const mounted = useMounted();

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label="View shopping cart"
      className="fixed bottom-6 left-4 z-40 lg:hidden flex h-12 w-12 items-center justify-center rounded-full bg-[#400604] text-[#E1B76F] shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-[#E1B76F]/40 transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer"
    >
      <ShoppingBag className="h-5 w-5 text-[#E1B76F] stroke-[2]" />
      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#E1B76F] text-[#400604] border border-[#400604] text-[10px] font-black shadow-sm">
        {mounted ? itemCount : 0}
      </span>
    </button>
  );
}
