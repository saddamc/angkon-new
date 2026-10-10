"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ShoppingCart, Menu, User } from "lucide-react";
import { CartDrawer } from "@/components/layout/cart-drawer";
import { SlideSearch } from "@/components/navigation/slide-search";
import { useCartStore } from "@/store/cart-store";
import type { CategoryNode } from "@/types/woocommerce";
import { MobileMenu } from "@/components/navigation/MobileMenu";

interface NavbarProps {
  categoryTree: CategoryNode[];
}

export function Navbar({ categoryTree }: NavbarProps) {
  const pathname = usePathname();
  const isCartOpen = useCartStore((state) => state.isOpen);
  const openCart = useCartStore((state) => state.openCart);
  const closeCart = useCartStore((state) => state.closeCart);
  const [openMobile, setOpenMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const itemCount = useCartStore((state) => state.itemCount());
  const subtotal = useCartStore((state) => state.subtotal());

  useEffect(() => {
    setMounted(true);
  }, []);

  const navLinks = [
    { label: "Home", href: "/", isExact: true },
    { label: "Women", href: "/women", isExact: false },
    { label: "Men", href: "/men", isExact: false },
    { label: "Mighto", href: "/mighto", isExact: false, hasSubmenu: true },
    { label: "Accessories", href: "/accessories", isExact: false },
    { label: "Policies", href: "/policies", isExact: false },
    { label: "On Sale", href: "/sale", isExact: false },
    { label: "About Us", href: "/about", isExact: false },
  ];

  const isLinkActive = (href: string, isExact: boolean) => {
    if (isExact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white text-[#4e4e4e] transition-all border-b border-neutral-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* ── Main Navigation Header (100% Gorur Ghash Astra Parity) ── */}
      <div className="w-full">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-4 py-3 sm:py-3.5">
          
          {/* Left: Mobile Menu Trigger + Search on Mobile */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setOpenMobile(true)}
              className="p-1 text-[#4e4e4e] hover:text-[#602bb7] transition"
              aria-label="Open navigation menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <SlideSearch />
          </div>

          {/* Left: Brand Logo (Exact Gorur Ghash Header Logo) */}
          <div className="flex-shrink-0">
            <Link href="/" className="inline-block" aria-label="Gorur Ghash">
              <Image
                src="/logo-gg.png"
                alt="Gorur Ghash"
                width={85}
                height={51}
                className="h-10 sm:h-12 w-auto object-contain transition-transform duration-200 hover:scale-[1.02]"
                priority
              />
            </Link>
          </div>

          {/* Center: Desktop Navigation Links (EXACT MIDDLE - NO ARROWS, UPPERCASE BOLD) */}
          <nav className="hidden lg:flex items-center justify-center flex-1 mx-4 xl:mx-8 gap-6 xl:gap-8 text-[13px] xl:text-[14px] font-bold tracking-normal uppercase">
            {navLinks.map((link) => {
              const active = isLinkActive(link.href, link.isExact);

              if (link.hasSubmenu) {
                return (
                  <div key={link.label} className="relative group py-2">
                    <Link
                      href={link.href}
                      className={`transition ${
                        active
                          ? "text-[#602bb7]"
                          : "text-[#4e4e4e] hover:text-[#602bb7]"
                      }`}
                    >
                      {link.label}
                    </Link>
                    {/* Mighto Dropdown (clean Astra-style popover without arrow) */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full hidden group-hover:block w-48 rounded border border-neutral-200 bg-white p-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                      <Link
                        href="/mighto/mighto-men"
                        className="block rounded px-3 py-2 text-xs font-bold text-[#4e4e4e] hover:bg-neutral-50 hover:text-[#602bb7] transition uppercase"
                      >
                        Mighto Men
                      </Link>
                      <Link
                        href="/mighto/mighto-women"
                        className="block rounded px-3 py-2 text-xs font-bold text-[#4e4e4e] hover:bg-neutral-50 hover:text-[#602bb7] transition uppercase"
                      >
                        Mighto Women
                      </Link>
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`py-2 transition ${
                    active
                      ? "text-[#602bb7]"
                      : "text-[#4e4e4e] hover:text-[#602bb7]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Actions (Search, Woo Cart, My Account - 3 Items Exactly) */}
          <div className="flex-shrink-0 flex items-center gap-4 sm:gap-5">
            {/* 1. Desktop Search (Astra Slide Search matching reference) */}
            <SlideSearch />

            {/* 2. Woo Cart (Plain Tk amount + Shopping Cart Icon - NO Pill Border) */}
            <button
              onClick={openCart}
              className="group flex items-center gap-1.5 p-1 text-[#4e4e4e] hover:text-[#602bb7] transition"
              aria-label="View shopping cart"
            >
              <span className="text-[13px] sm:text-[14px] font-bold text-[#4e4e4e] transition group-hover:text-[#602bb7]">
                {mounted ? `Tk${subtotal.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Tk0.00"}
              </span>
              <div className="relative flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-[#4e4e4e] group-hover:text-[#602bb7] transition" />
                {mounted && itemCount > 0 && (
                  <span className="absolute -top-2 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#602bb7] px-1 text-[9px] font-bold text-white shadow-sm">
                    {itemCount}
                  </span>
                )}
              </div>
            </button>

            {/* 3. My Account Icon (Solid User Silhouette) */}
            <Link
              href="/my-account"
              className="p-1 text-[#4e4e4e] hover:text-[#602bb7] transition"
              title="My Account"
              aria-label="My Account"
            >
              <User className="h-5 w-5 fill-current" />
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
