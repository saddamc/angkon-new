"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Search, ShoppingBag, Heart, Menu, ChevronDown, User } from "lucide-react";
import { CartDrawer } from "@/components/layout/cart-drawer";
import { SearchModal } from "@/components/layout/search-modal";
import { useCartStore } from "@/store/cart-store";
import { useWishlistStore } from "@/store/wishlist-store";
import type { CategoryNode } from "@/types/woocommerce";
import { MobileMenu } from "@/components/navigation/MobileMenu";

interface NavbarProps {
  categoryTree: CategoryNode[];
}

export function Navbar({ categoryTree }: NavbarProps) {
  const isCartOpen = useCartStore((state) => state.isOpen);
  const openCart = useCartStore((state) => state.openCart);
  const closeCart = useCartStore((state) => state.closeCart);
  const [openMobile, setOpenMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const itemCount = useCartStore((state) => state.itemCount());
  const subtotal = useCartStore((state) => state.subtotal());
  const wishlistCount = useWishlistStore((state) => state.itemCount());

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-white text-black shadow-sm transition-all border-b border-neutral-200">
      {/* ── Main Navigation Header (Centered Menu Layout) ── */}
      <div className="w-full">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-4 py-3">
          
          {/* Left: Mobile Menu Trigger + Mobile Search */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setOpenMobile(true)}
              className="p-1.5 text-black hover:text-neutral-600 transition"
              aria-label="Open navigation menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <SearchModal />
          </div>

          {/* Left: Brand Logo & Tagline */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex flex-col group leading-none">
              <span className="font-heading text-2xl sm:text-[28px] font-black tracking-tight text-black group-hover:text-neutral-700 transition">
                ANGKON<span className="text-[#990000]">.</span>
              </span>
              <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.22em] font-bold text-neutral-500 mt-0.5">
                HOUSE OF MODERN HERITAGE
              </span>
            </Link>
          </div>

          {/* Center: Desktop Navigation Links (EXACT MIDDLE) */}
          <nav className="hidden lg:flex items-center justify-center flex-1 mx-4 xl:mx-8 gap-5 xl:gap-7 text-[13px] font-bold tracking-wider uppercase text-black">
            <Link
              href="/"
              className="text-[#512da8] hover:text-[#512da8] py-2 transition font-bold"
            >
              Home
            </Link>
            <Link
              href="/women"
              className="text-black hover:text-[#512da8] py-2 transition"
            >
              Women
            </Link>
            <Link
              href="/men"
              className="text-black hover:text-[#512da8] py-2 transition"
            >
              Men
            </Link>
            {/* Mighto with Dropdown */}
            <div className="relative group py-2">
              <Link
                href="/mighto"
                className="inline-flex items-center gap-1 text-black hover:text-[#512da8] transition"
              >
                Mighto
                <ChevronDown className="w-3.5 h-3.5 text-black group-hover:text-[#512da8] group-hover:rotate-180 transition-transform" />
              </Link>
              <div className="absolute left-0 top-full hidden group-hover:block w-48 rounded-lg border border-neutral-200 bg-white p-1.5 shadow-xl z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                <Link
                  href="/mighto/mighto-men"
                  className="block rounded-md px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 hover:text-black transition"
                >
                  Mighto Men
                </Link>
                <Link
                  href="/mighto/mighto-women"
                  className="block rounded-md px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 hover:text-black transition"
                >
                  Mighto Women
                </Link>
              </div>
            </div>
            <Link
              href="/accessories"
              className="text-black hover:text-[#512da8] py-2 transition"
            >
              Accessories
            </Link>
            <Link
              href="/policies"
              className="text-black hover:text-[#512da8] py-2 transition"
            >
              Policies
            </Link>
            <Link
              href="/sale"
              className="text-black hover:text-[#512da8] py-2 transition font-semibold"
            >
              On Sale
            </Link>
            <Link
              href="/about"
              className="text-black hover:text-[#512da8] py-2 transition"
            >
              About Us
            </Link>
          </nav>

          {/* Right: Actions (Search, Woo Cart, My Account, Wishlist) */}
          <div className="flex-shrink-0 flex items-center gap-2 sm:gap-4">
            {/* Desktop Search */}
            <div className="hidden lg:block text-black hover:text-[#512da8] transition">
              <SearchModal />
            </div>

            {/* Woo Cart (Astra Header Cart Style: Tk amount + Shopping Bag Icon) */}
            <button
              onClick={openCart}
              className="group flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 transition hover:border-black hover:shadow-sm"
              aria-label="View shopping cart"
            >
              <span className="text-[12px] sm:text-[13px] font-bold text-black transition">
                {mounted ? `Tk${subtotal.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Tk0.00"}
              </span>
              <div className="relative flex items-center justify-center">
                <ShoppingBag className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-black transition group-hover:scale-105" />
                {mounted && itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#ffd800] px-1 text-[9px] font-black text-black shadow-sm">
                    {itemCount}
                  </span>
                )}
              </div>
            </button>

            {/* My Account */}
            <Link
              href="/my-account"
              className="p-1.5 text-black hover:text-[#512da8] transition"
              title="My Account"
              aria-label="My Account"
            >
              <User className="h-5 w-5" />
            </Link>

            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="relative p-1.5 text-black hover:text-[#512da8] transition"
              aria-label="Wishlist"
              title="Wishlist"
            >
              <Heart className="h-5 w-5" />
              {mounted && wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#ffd800] text-[9px] font-bold text-black">
                  {wishlistCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Cart Drawer */}
      <CartDrawer open={isCartOpen} onClose={closeCart} />

      {/* Mobile Drawer */}
      <MobileMenu
        isOpen={openMobile}
        onClose={() => setOpenMobile(false)}
        categoryTree={categoryTree}
      />
    </header>
  );
}
