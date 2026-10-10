"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/cart-store";

export function FloatingCartButton() {
  const openCart = useCartStore((state) => state.openCart);
  const itemCount = useCartStore((state) => state.itemCount());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label="View shopping cart"
      className="fixed bottom-6 left-4 z-40 lg:hidden flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-[0_4px_16px_rgba(0,0,0,0.18)] border border-neutral-200/80 transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer"
    >
      <ShoppingBag className="h-5 w-5 text-black stroke-[2]" />
      <span className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-black text-white text-[10px] font-bold shadow-sm">
        {mounted ? itemCount : 0}
      </span>
    </button>
  );
}
