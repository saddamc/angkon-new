"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useMounted } from "@/hooks/use-mounted";
import { Heart, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useWishlistStore } from "@/store/wishlist-store";
import { useCartStore } from "@/store/cart-store";
import { formatPrice } from "@/utils/price";

export default function WishlistPage() {
  const mounted = useMounted();
  const { items, removeItem, clearWishlist } = useWishlistStore();
  const addItemToCart = useCartStore((s) => s.addItem);
  const [addedIds, setAddedIds] = useState<number[]>([]);


  if (!mounted) {
    return (
      <div className="min-h-[60vh] bg-[#400604] py-16 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <Heart className="h-10 w-10 text-white/40" />
          <div className="h-4 w-32 bg-[#4a0705] rounded" />
        </div>
      </div>
    );
  }

  const handleAddToCart = (item: (typeof items)[0]) => {
    addItemToCart({
      productId: item.productId,
      slug: item.slug,
      name: item.name,
      image: item.image,
      price: item.price,
      size: "",
      quantity: 1,
      shippingClassId: 0,
      deliveryInside: 60,
      deliveryOutside: 120,
    });

    setAddedIds((prev) => [...prev, item.productId]);
    setTimeout(() => {
      setAddedIds((prev) => prev.filter((id) => id !== item.productId));
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#400604] py-12">
      <div className="container mx-auto max-w-[1200px] px-4 lg:px-8">
        
        {/* Header */}
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4 border-b border-[#E1B76F]/20 pb-6">
          <div>
            <h1 className="text-2xl font-black font-heading uppercase text-white sm:text-3xl flex items-center gap-3">
              <Heart className="h-7 w-7 text-white fill-[#E1B76F]" />
              My Wishlist
            </h1>
            <p className="mt-1 text-sm text-white/90">
              {items.length === 0
                ? "Your wishlist is currently empty."
                : `You have ${items.length} item${items.length > 1 ? "s" : ""} saved.`}
            </p>
          </div>

          {items.length > 0 && (
            <button
              onClick={clearWishlist}
              className="text-xs font-semibold text-[#E1B76F]/70 hover:text-[#E1B76F] transition underline underline-offset-4"
            >
              Clear Wishlist
            </button>
          )}
        </div>

        {/* Empty state */}
        {items.length === 0 ? (
          <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#340402] p-12 text-center shadow-xl max-w-md mx-auto my-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#E1B76F]/30 bg-[#2d0302] text-white">
              <Heart className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-heading font-black uppercase text-white mb-2">No Items in Wishlist</h2>
            <p className="text-sm text-white/90 mb-6 leading-relaxed">
              Explore our latest modern heritage apparel and save your favorite styles to check them out later.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-[12px] bg-[#400604] border border-[#E1B76F]/50 px-6 py-3 text-sm font-bold text-white transition hover:bg-[#520805]"
            >
              Start Shopping <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          /* Grid of saved items */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((item) => {
              const isAdded = addedIds.includes(item.productId);
              return (
                <div
                  key={item.productId}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#E1B76F]/25 bg-[#340402] shadow-lg transition hover:border-[#E1B76F]/60"
                >
                  {/* Remove Button */}
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[#E1B76F]/30 bg-[#2d0302]/90 text-white/70 shadow-sm backdrop-blur transition hover:bg-[#400604] hover:text-[#E1B76F]"
                    title="Remove from wishlist"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  {/* Image */}
                  <Link href={`/products/${item.slug}`} className="relative aspect-[3/4] w-full overflow-hidden bg-[#2d0302]">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  </Link>

                  {/* Info */}
                  <div className="flex flex-1 flex-col p-4">
                    <Link href={`/products/${item.slug}`}>
                      <h3 className="line-clamp-2 text-sm font-semibold text-white hover:text-white transition mb-2">
                        {item.name}
                      </h3>
                    </Link>
                    <div className="mb-4 mt-auto">
                      <span className="text-lg font-bold text-white">{formatPrice(item.price)}</span>
                    </div>

                    <button
                      onClick={() => handleAddToCart(item)}
                      className={`flex w-full items-center justify-center gap-2 rounded-[12px] py-2.5 text-xs font-bold transition shadow-sm ${
                        isAdded ? "bg-[#520805] text-white border border-[#E1B76F]" : "bg-[#400604] border border-[#E1B76F]/40 text-white hover:bg-[#520805] hover:border-[#E1B76F]"
                      }`}
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      {isAdded ? "Added to Order!" : "Add to Order"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
