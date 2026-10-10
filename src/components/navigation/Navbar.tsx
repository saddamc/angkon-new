"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ShoppingCart, Menu, User, Search, X, Loader2 } from "lucide-react";
import { CartDrawer } from "@/components/layout/cart-drawer";
import { useCartStore } from "@/store/cart-store";
import type { CategoryNode } from "@/types/woocommerce";
import { MobileMenu } from "@/components/navigation/MobileMenu";
import { getProducts } from "@/services/products.service";
import { formatPrice } from "@/utils/price";
import { decodeEntities } from "@/utils/html";

interface SearchProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  image: string;
  category: string;
}

interface NavbarProps {
  categoryTree: CategoryNode[];
}

export function Navbar({ categoryTree }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isCartOpen = useCartStore((state) => state.isOpen);
  const openCart = useCartStore((state) => state.openCart);
  const closeCart = useCartStore((state) => state.closeCart);
  const [openMobile, setOpenMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const itemCount = useCartStore((state) => state.itemCount());
  const subtotal = useCartStore((state) => state.subtotal());

  // Search State: when open, full menu hides and search bar takes over
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Focus input on search open
  useEffect(() => {
    if (searchOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [searchOpen]);

  // Click outside listener to close search and restore menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    }
    if (searchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchOpen]);

  // Escape key closes search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Live search query fetching
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const products = await getProducts({ search: searchQuery.trim(), perPage: 6 });
        setSearchResults(
          products.map((p) => ({
            id: p.id,
            name: decodeEntities(p.name),
            slug: p.slug,
            price: Number(p.sale_price || p.price || 0),
            image: p.images[0]?.src || "https://placehold.co/800x800/f5f5f5/999.png?text=Product",
            category: p.categories[0]?.name ? decodeEntities(p.categories[0].name) : "Apparel",
          }))
        );
      } catch (err) {
        console.error("Failed to search products:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

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
      {/* ── Main Navigation Header ── */}
      <div className="w-full">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-4 py-3 sm:py-3.5">
          
          {/* Left: Mobile Menu Trigger */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setOpenMobile(true)}
              className="p-1 text-[#4e4e4e] hover:text-[#602bb7] transition"
              aria-label="Open navigation menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="p-1 text-[#4e4e4e] hover:text-[#602bb7] transition"
              aria-label="Open search"
            >
              <Search className="h-5 w-5" />
            </button>
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

          {/* ── Center: Menu Row OR Expanded Search Bar ── */}
          <div className="flex-1 mx-4 xl:mx-8 flex items-center justify-center">
            {!searchOpen ? (
              /* Normal State: Centered Navigation Menu with Search Icon at the End */
              <nav className="hidden lg:flex items-center justify-center gap-6 xl:gap-8 text-[13px] xl:text-[14px] font-bold tracking-normal uppercase animate-in fade-in duration-150">
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
                        {/* Mighto Dropdown (clean Astra-style popover) */}
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

                {/* Search Icon placed at the end of the menu (NOT on cart side) */}
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="py-2 text-[#4e4e4e] hover:text-[#602bb7] transition flex items-center justify-center cursor-pointer"
                  aria-label="Open search"
                  title="Search"
                >
                  <Search className="h-4.5 w-4.5 stroke-[2.2]" />
                </button>
              </nav>
            ) : (
              /* Search Active State: Full Menu Gone, Search Bar Takes Over Middle Space */
              <div
                ref={searchContainerRef}
                className="relative w-full max-w-[560px] flex items-center animate-in fade-in zoom-in-95 duration-150"
              >
                <form
                  onSubmit={handleSearchSubmit}
                  className="flex items-center w-full border border-dotted border-[#4e4e4e] bg-white px-3 py-1.5 rounded-[2px] transition-all shadow-sm focus-within:border-solid focus-within:border-[#602bb7]"
                >
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="flex-1 text-[13px] text-[#4e4e4e] placeholder:text-[#888888] bg-transparent outline-none pr-2 font-normal"
                  />
                  <button
                    type="submit"
                    className="p-1 text-[#4e4e4e] hover:text-[#602bb7] transition flex items-center justify-center"
                    aria-label="Submit search"
                  >
                    {searchLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#602bb7]" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery("");
                    }}
                    className="p-1 text-neutral-400 hover:text-black transition ml-1"
                    aria-label="Close search"
                    title="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </form>

                {/* Instant Live Search Dropdown */}
                {searchQuery.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-neutral-200 shadow-2xl rounded-lg p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {searchLoading && searchResults.length === 0 ? (
                      <div className="py-6 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#602bb7]" />
                        Searching products...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="py-6 text-center text-xs text-neutral-500">
                        No products found for &ldquo;{searchQuery}&rdquo;
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 py-1">
                          Matching Products
                        </div>
                        {searchResults.map((product) => (
                          <Link
                            key={product.id}
                            href={`/products/${product.slug}`}
                            onClick={() => {
                              setSearchOpen(false);
                              setSearchQuery("");
                            }}
                            className="flex items-center gap-2.5 p-1.5 rounded-md hover:bg-neutral-50 transition group"
                          >
                            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-neutral-100 border border-neutral-200">
                              <Image
                                src={product.image}
                                alt={product.name}
                                fill
                                className="object-cover"
                                sizes="40px"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="line-clamp-1 text-xs font-semibold text-neutral-900 group-hover:text-[#602bb7] transition">
                                {product.name}
                              </h4>
                              <p className="text-[10px] text-neutral-400">
                                {product.category}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-black flex-shrink-0">
                              {formatPrice(product.price)}
                            </span>
                          </Link>
                        ))}
                        <div className="pt-2 mt-1 border-t border-neutral-100">
                          <button
                            type="button"
                            onClick={handleSearchSubmit}
                            className="w-full text-center py-1.5 text-xs font-bold text-[#602bb7] hover:underline"
                          >
                            View all results for &ldquo;{searchQuery}&rdquo; &rarr;
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Actions (Cart & My Account ONLY - NO search icon here) */}
          <div className="flex-shrink-0 flex items-center gap-4 sm:gap-5">
            {/* 1. Woo Cart (Plain Tk amount + Shopping Cart Icon) */}
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

            {/* 2. My Account Icon (Solid User Silhouette) */}
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
