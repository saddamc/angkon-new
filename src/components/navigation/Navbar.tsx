"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Search, ShoppingBag, Heart, Menu, ArrowRight, ChevronDown, User } from "lucide-react";
import { CartDrawer } from "@/components/layout/cart-drawer";
import { SearchModal } from "@/components/layout/search-modal";
import { useCartStore } from "@/store/cart-store";
import { useWishlistStore } from "@/store/wishlist-store";
import type { CategoryNode } from "@/types/woocommerce";
import { MobileMenu } from "@/components/navigation/MobileMenu";
import { formatPrice } from "@/utils/price";

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
    <header className="sticky top-0 z-50 w-full bg-[#400604] transition-all">
      {/* ── 1. Top Announcement Bar (Royal Heritage Ticker) ── */}
      <div className="bg-[#2b0403] text-[#E1B76F] border-b border-[#5c0f0d] py-2 px-4 text-center text-[11px] sm:text-[12px] font-semibold tracking-wider uppercase">
        <div className="container mx-auto flex items-center justify-center gap-2">
          <span>⚡ FREE SHIPPING OVER ৳3,000</span>
          <span className="text-[#E1B76F]">●</span>
          <span>CASH ON DELIVERY ALL OVER BANGLADESH</span>
          <span className="hidden md:inline text-[#E1B76F]">●</span>
          <span className="hidden md:inline">EASY 7-DAY EXCHANGE</span>
        </div>
      </div>

      {/* ── 2. Main Navigation Header ── */}
      <div className="border-b border-[#5c0f0d] bg-[#400604]/95 backdrop-blur-md">
        <div className="container mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 lg:px-8">
          
          {/* Left: Mobile Menu Trigger + Quick Search on Mobile */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setOpenMobile(true)}
              className="p-2 text-[#E1B76F] hover:text-white transition"
              aria-label="Open navigation menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <SearchModal />
          </div>

          {/* Center-Left: Brand Logo & Tagline */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex flex-col group leading-none">
              <span className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-[#E1B76F] group-hover:text-white transition">
                ANGKON<span className="text-[#f3cb87]">.</span>
              </span>
              <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.22em] font-medium text-[#cbb18a] mt-0.5">
                HOUSE OF MODERN HERITAGE
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-5 xl:gap-7 text-[13px] font-medium tracking-wide">
              <Link
                href="/"
                className="text-[#E1B76F] hover:text-white hover:border-b-2 hover:border-[#E1B76F] py-2 transition font-bold"
              >
                Home
              </Link>
              <Link
                href="/women"
                className="text-[#cbb18a] hover:text-[#E1B76F] hover:border-b-2 hover:border-[#E1B76F] py-2 transition"
              >
                Women
              </Link>
              <Link
                href="/men"
                className="text-[#cbb18a] hover:text-[#E1B76F] hover:border-b-2 hover:border-[#E1B76F] py-2 transition"
              >
                Men
              </Link>
              {/* Mighto with Dropdown */}
              <div className="relative group py-2">
                <Link
                  href="/mighto"
                  className="inline-flex items-center gap-1 text-[#cbb18a] hover:text-[#E1B76F] hover:border-b-2 hover:border-[#E1B76F] transition"
                >
                  Mighto
                  <ChevronDown className="w-3.5 h-3.5 text-[#cbb18a] group-hover:text-[#E1B76F] group-hover:rotate-180 transition-transform" />
                </Link>
                <div className="absolute left-0 top-full hidden group-hover:block w-44 rounded-xl border border-[#5c0f0d] bg-[#2b0403] p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Link
                    href="/mighto/mighto-men"
                    className="block rounded-lg px-3 py-2 text-xs font-semibold text-[#cbb18a] hover:bg-[#4a0705] hover:text-[#E1B76F] transition"
                  >
                    Mighto Men
                  </Link>
                  <Link
                    href="/mighto/mighto-women"
                    className="block rounded-lg px-3 py-2 text-xs font-semibold text-[#cbb18a] hover:bg-[#4a0705] hover:text-[#E1B76F] transition"
                  >
                    Mighto Women
                  </Link>
                </div>
              </div>
              <Link
                href="/accessories"
                className="text-[#cbb18a] hover:text-[#E1B76F] hover:border-b-2 hover:border-[#E1B76F] py-2 transition"
              >
                Accessories
              </Link>
              <Link
                href="/policies"
                className="text-[#cbb18a] hover:text-[#E1B76F] hover:border-b-2 hover:border-[#E1B76F] py-2 transition"
              >
                Policies
              </Link>
              <Link
                href="/sale"
                className="text-[#cbb18a] hover:text-[#E1B76F] hover:border-b-2 hover:border-[#E1B76F] py-2 transition font-semibold"
              >
                On Sale
              </Link>
              <Link
                href="/about"
                className="text-[#cbb18a] hover:text-[#E1B76F] hover:border-b-2 hover:border-[#E1B76F] py-2 transition"
              >
                About Us
              </Link>
            </nav>
          </div>

          {/* Right: Actions (Search, Woo Cart, My Account, Wishlist) matching Gorur Ghash */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Desktop Search */}
            <div className="hidden lg:block text-[#E1B76F]">
              <SearchModal />
            </div>

            {/* Woo Cart (Astra Header Cart Style: Tk amount then Icon) */}
            <button
              onClick={openCart}
              className="group flex items-center gap-2.5 rounded-full border border-[#E1B76F]/60 bg-[#400604] px-3.5 py-1.5 transition hover:border-[#E1B76F] hover:bg-[#E1B76F] hover:text-[#400604] shadow-sm"
              aria-label="View shopping cart"
            >
              <span className="text-[12px] sm:text-[13px] font-bold text-[#E1B76F] group-hover:text-[#400604] transition">
                {mounted ? `Tk ${subtotal.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Tk 0.00"}
              </span>
              <div className="relative flex items-center justify-center">
                <ShoppingBag className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-[#E1B76F] group-hover:text-[#400604] transition" />
                {mounted && itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#E1B76F] px-1 text-[9px] font-black text-[#400604] shadow-sm group-hover:bg-[#400604] group-hover:text-[#E1B76F]">
                    {itemCount}
                  </span>
                )}
              </div>
            </button>

            {/* My Account */}
            <Link
              href="/my-account"
              className="p-1.5 text-[#E1B76F] hover:text-white transition"
              title="My Account"
              aria-label="My Account"
            >
              <User className="h-5 w-5" />
            </Link>

            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="relative p-1.5 text-[#E1B76F] hover:text-white transition"
              aria-label="Wishlist"
              title="Wishlist"
            >
              <Heart className="h-5 w-5" />
              {mounted && wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#E1B76F] text-[9px] font-bold text-[#400604]">
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
