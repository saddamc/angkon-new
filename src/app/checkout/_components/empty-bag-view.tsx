import Link from "next/link";
import { ChevronRight, ShoppingBag, ArrowRight } from "lucide-react";

export function EmptyBagView() {
  return (
    <div className="min-h-screen bg-[#530911] text-white">
      <div className="border-b border-[#E1B76F]/20 bg-[#42070e]">
        <div className="mx-auto max-w-[1240px] flex h-11 items-center gap-2 px-4 sm:px-6 lg:px-8 text-xs text-white/70">
          <Link href="/" className="transition hover:text-white">Home</Link>
          <ChevronRight className="h-3 w-3 opacity-60" />
          <Link href="/cart" className="transition hover:text-white">Bag</Link>
          <ChevronRight className="h-3 w-3 opacity-60" />
          <span className="font-semibold text-white">Checkout</span>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-serif text-3xl font-bold uppercase text-white tracking-wide mb-6">
          Checkout
        </h1>
        <div className="rounded-2xl border border-[#E1B76F]/30 bg-[#42070e] p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#530911] border border-[#E1B76F]/40 text-white">
              <ShoppingBag className="h-7 w-7 text-[#E1B76F]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Your bag is currently empty.</h2>
              <p className="text-sm text-white/80 mt-1">
                Add items to your bag before proceeding to checkout.
              </p>
            </div>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#E1B76F] px-8 py-3 text-sm font-bold text-[#530911] hover:bg-[#f3cb87] transition shadow-md shrink-0"
          >
            Explore Collection <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
