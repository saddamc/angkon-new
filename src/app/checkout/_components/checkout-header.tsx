import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";

export function CheckoutHeader() {
  return (
    <div className="border-b border-[#E1B76F]/20 bg-[#42070e]">
      <div className="mx-auto max-w-[1240px] flex h-11 items-center gap-2 px-4 sm:px-6 lg:px-8 text-xs text-white/70">
        <Link href="/" className="transition hover:text-white">Home</Link>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <Link href="/cart" className="transition hover:text-white">Bag</Link>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className="font-semibold text-white">Checkout</span>
      </div>
    </div>
  );
}

export function CheckoutTitle() {
  return (
    <div className="mb-6 pb-2 flex items-center justify-between border-b border-[#E1B76F]/20">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold uppercase tracking-wide text-white">
          Checkout
        </h1>
        <p className="mt-1 text-xs text-white/70 flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-[#E1B76F]" />
          Secure checkout · Angkon
        </p>
      </div>
    </div>
  );
}
