import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import type { CartItem } from "@/types/product";

interface ProductsCardProps {
  items: CartItem[];
}

export function ProductsCard({ items }: ProductsCardProps) {
  const formatPrice = (price: number) => `${Math.round(price).toLocaleString("en-BD")}৳`;

  const getColorDisplayName = (color: string) => {
    return color.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-5 sm:p-6 shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-[#E1B76F]/20 pb-3 mb-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#530911] text-[#E1B76F] border border-[#E1B76F]/30">
          <ShoppingBag className="h-4 w-4" />
        </div>
        <h2 className="text-base font-serif font-bold text-white tracking-wide">
          Products
        </h2>
      </div>

      <div className="divide-y divide-[#E1B76F]/15">
        {items.map((item, idx) => {
          const itemTotal = item.price * item.quantity;
          const pointsEarned = Math.floor(itemTotal / 100);

          return (
            <div
              key={`${item.productId}-${item.size}-${item.color}-${idx}`}
              className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#280504] border border-[#E1B76F]/25">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-white/40">
                      ANGKON
                    </div>
                  )}
                </div>

                <div className="min-w-0 space-y-1">
                  <p className="text-xs sm:text-sm font-semibold text-white truncate">
                    <span className="text-[#E1B76F] font-bold">{item.quantity} X</span> {item.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {item.size && (
                      <span className="rounded-md bg-[#220406] px-2 py-0.5 text-stone-200 border border-[#E1B76F]/30 font-medium">
                        Size: {item.size}
                      </span>
                    )}
                    {item.color && (
                      <span className="rounded-md bg-[#220406] px-2 py-0.5 text-stone-200 border border-[#E1B76F]/30 font-medium">
                        Color: {getColorDisplayName(item.color)}
                      </span>
                    )}
                    {pointsEarned > 0 && (
                      <span className="rounded-md bg-[#E1B76F]/20 text-[#E1B76F] border border-[#E1B76F]/40 px-2 py-0.5 font-semibold">
                        ANGKON Points: {pointsEarned}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-sm sm:text-base font-bold text-white">
                  {formatPrice(itemTotal)}
                </span>
                {item.quantity > 1 && (
                  <p className="text-xs text-white/70 font-medium mt-0.5">
                    {formatPrice(item.price)} each
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
