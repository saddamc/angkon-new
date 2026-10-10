"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ShoppingCart, Menu, User, Search, X, ChevronDown } from "lucide-react";
import { CartDrawer } from "@/components/layout/cart-drawer";
import { useCartStore } from "@/store/cart-store";
import type { CategoryNode } from "@/types/woocommerce";
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
  const [mightoExpanded, setMightoExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const itemCount = useCartStore((state) => state.itemCount());
  const subtotal = useCartStore((state) => state.subtotal());

  // Search State: when open, full menu hides and search bar takes over
  const [searchOpen, setSearchOpen] = useState(false);
  const [isSearchClosing, setIsSearchClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const focusActiveSearchInput = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      mobileInputRef.current?.focus();
    } else {
      desktopInputRef.current?.focus();
    }
  };

  const handleOpenSearch = () => {
    setOpenMobile(false);
    setIsSearchClosing(false);
    setSearchOpen(true);
    setSearchLoading(false); // No fake loading on click!
    // Multiple microtask attempts ensure cursor is immediately placed ready to type
    focusActiveSearchInput();
    setTimeout(focusActiveSearchInput, 15);
    setTimeout(focusActiveSearchInput, 50);
    setTimeout(focusActiveSearchInput, 120);
  };

  const handleCloseSearch = () => {
    setIsSearchClosing(true);
    setTimeout(() => {
      setSearchOpen(false);
      setIsSearchClosing(false);
      setSearchQuery("");
      setSearchResults([]);
      setSearchLoading(false);
    }, 200);
  };

  // Focus input on search open
  useEffect(() => {
    if (searchOpen && !isSearchClosing) {
      focusActiveSearchInput();
      const t1 = setTimeout(focusActiveSearchInput, 30);
      const t2 = setTimeout(focusActiveSearchInput, 100);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [searchOpen, isSearchClosing]);

  // Click outside listener to close search and restore menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        handleCloseSearch();
      }
    }
    if (searchOpen && !isSearchClosing) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchOpen, isSearchClosing]);

  // Escape key closes search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && searchOpen && !isSearchClosing) {
        handleCloseSearch();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen, isSearchClosing]);

  // Live search query fetching
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
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
      handleCloseSearch();
    }
  };

  const navLinks = [
    { label: "Home", href: "/", isExact: true },
    { label: "Women", href: "/product-category/women", isExact: false },
    { label: "Men", href: "/product-category/men", isExact: false },
    { label: "Mighto", href: "/product-category/mighto", isExact: false, hasSubmenu: true },
    { label: "Accessories", href: "/product-category/accessories", isExact: false },
    { label: "Policies", href: "/policies", isExact: false },
    { label: "On Sale", href: "/sale", isExact: false },
    { label: "About Us", href: "/about", isExact: false },
  ];

  const isLinkActive = (href: string, isExact: boolean) => {
    if (isExact) return pathname === href;
    if (pathname === href || pathname.startsWith(href + "/")) return true;
    if (href.startsWith("/product-category/")) {
      const short = href.replace("/product-category", "");
      if (pathname === short || pathname.startsWith(short + "/")) return true;
    }
    return false;
  };

  return (
    <header
      className={`top-0 z-50 w-full bg-white text-[#4e4e4e] transition-all ${
        openMobile
          ? "max-lg:relative max-lg:shadow-none lg:sticky"
          : "sticky"
      }`}
    >
      {/* ── Main Navigation Header (Border directly under navbar) ── */}
      <div className="w-full border-b border-[#e7e7e7]">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5">
          
          {/* Left: Brand Logo (Exact Gorur Ghash Header Logo) */}
          <div className="flex-shrink-0">
            <Link href="/" className="inline-block" aria-label="Gorur Ghash">
              <Image
                src="/logo-gg.png"
                alt="Gorur Ghash"
                width={140}
                height={58}
                className="h-8 sm:h-9 md:h-10 w-auto object-contain transition-transform duration-200 hover:scale-[1.02]"
                priority
              />
            </Link>
          </div>

          {/* ── Center: Menu Row OR Expanded Search Bar ── */}
          <div className="flex-1 mx-4 xl:mx-8 flex items-center justify-center min-w-0">
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
                            href="/product-category/mighto/mighto-men"
                            className="block rounded px-3 py-2 text-xs font-bold text-[#4e4e4e] hover:bg-neutral-50 hover:text-[#602bb7] transition uppercase"
                          >
                            Mighto Men
                          </Link>
                          <Link
                            href="/product-category/mighto/mighto-women"
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
                  onClick={handleOpenSearch}
                  className="py-2 text-[#4e4e4e] hover:text-[#602bb7] transition flex items-center justify-center cursor-pointer"
                  aria-label="Open search"
                  title="Search"
                >
                  <Search className="h-4.5 w-4.5 stroke-[2.2]" />
                </button>
              </nav>
            ) : (
              /* Search Active State: Full Menu Gone, Search Bar Slides In from Right to Left (Matches Screenshot) */
              <div
                ref={searchContainerRef}
                className={`relative w-full max-w-[700px] flex items-center ${
                  isSearchClosing
                    ? "animate-slide-search-out"
                    : "animate-slide-search-in"
                }`}
              >
                <form
                  onSubmit={handleSearchSubmit}
                  className="relative flex items-center w-full h-[38px] sm:h-[40px] border border-[#602bb7] bg-white px-3.5 py-1.5 rounded-[2px] transition-all shadow-[0_2px_8px_rgba(96,43,183,0.06)]"
                >
                  <input
                    ref={desktopInputRef}
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="flex-1 text-[13.5px] text-[#4e4e4e] placeholder:text-[#777777] bg-transparent outline-none pr-3 font-normal"
                  />

                  {/* Loading Spinner - shows when actively searching products */}
                  <div
                    className={`flex items-center justify-center transition-opacity duration-150 mr-2.5 ${
                      searchLoading && searchQuery.trim().length > 0
                        ? "opacity-100"
                        : "opacity-0 pointer-events-none"
                    }`}
                    aria-hidden={!searchLoading}
                  >
                    <svg
                      className="animate-spin h-4 w-4 text-[#602bb7]"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-20"
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      />
                      <path
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        d="M12 3a9 9 0 0 1 9 9"
                      />
                    </svg>
                  </div>

                  {/* Dismiss / Close Icon (✕) - Exactly matches user uploaded media_1791619306455_ad1507e2.png */}
                  <button
                    type="button"
                    onClick={handleCloseSearch}
                    className="p-1 text-neutral-400 hover:text-[#4e4e4e] transition-colors flex items-center justify-center cursor-pointer"
                    aria-label="Close search"
                    title="Close"
                  >
                    <X className="h-4 w-4 stroke-[1.8]" />
                  </button>
                </form>

                {/* Instant Live Search Dropdown */}
                {searchQuery.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-neutral-200 shadow-2xl rounded-lg p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {searchLoading && searchResults.length === 0 ? (
                      <div className="py-6 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-3.5 w-3.5 text-[#602bb7]"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-20"
                            cx="12"
                            cy="12"
                            r="9"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          />
                          <path
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            d="M12 3a9 9 0 0 1 9 9"
                          />
                        </svg>
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
                              handleCloseSearch();
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
                              <h4 className="line-clamp-1 text-xs font-semibold text-[#4e4e4e] group-hover:text-[#602bb7] transition">
                                {product.name}
                              </h4>
                              <p className="text-[10px] text-neutral-400">
                                {product.category}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-[#4e4e4e] flex-shrink-0">
                              Tk{product.price.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

          {/* Mobile Full-Width Search Overlay Bar when Search is Open on Mobile */}
          {searchOpen && (
            <div className="lg:hidden absolute inset-0 z-50 bg-white px-3 flex items-center animate-slide-search-in shadow-md">
              <form
                onSubmit={handleSearchSubmit}
                className="relative flex items-center w-full h-[38px] border border-[#602bb7] bg-white px-3 py-1 rounded-[2px]"
              >
                <input
                  ref={mobileInputRef}
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="flex-1 text-[13.5px] text-[#4e4e4e] placeholder:text-[#777777] bg-transparent outline-none pr-2 font-normal"
                />
                <div
                  className={`flex items-center justify-center transition-opacity duration-150 mr-2 ${
                    searchLoading && searchQuery.trim().length > 0
                      ? "opacity-100"
                      : "opacity-0 pointer-events-none"
                  }`}
                >
                  <svg
                    className="animate-spin h-3.5 w-3.5 text-[#602bb7]"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle className="opacity-20" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" />
                    <path fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" d="M12 3a9 9 0 0 1 9 9" />
                  </svg>
                </div>
                <button
                  type="button"
                  onClick={handleCloseSearch}
                  className="p-1 text-neutral-400 hover:text-black transition flex items-center justify-center"
                  aria-label="Close search"
                >
                  <X className="h-4 w-4 stroke-[1.8]" />
                </button>
              </form>
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex-shrink-0 flex items-center gap-2.5 sm:gap-3.5 lg:gap-5">
            {/* Desktop-only: Cart (Plain Tk amount + Shopping Cart Icon) */}
            <button
              onClick={openCart}
              className="hidden lg:flex group items-center gap-1.5 p-1 text-[#4e4e4e] hover:text-[#602bb7] transition cursor-pointer"
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

            {/* My Account Icon (Solid User Silhouette - visible on mobile and desktop) */}
            <Link
              href="/my-account"
              className="p-1 text-[#4e4e4e] hover:text-[#602bb7] transition flex items-center justify-center"
              title="My Account"
              aria-label="My Account"
            >
              <User className="h-5 w-5 fill-current" />
            </Link>

            {/* Mobile-only: Search Button (Matches Image 1 & 2) */}
            <button
              type="button"
              onClick={handleOpenSearch}
              className="lg:hidden p-1 text-[#4e4e4e] hover:text-[#602bb7] transition flex items-center justify-center cursor-pointer"
              aria-label="Open search"
              title="Search"
            >
              <Search className="h-5 w-5 stroke-[2]" />
            </button>

            {/* Mobile-only: Menu Toggle Button (Exact Gorur Ghash Astra outline & #ccc2c2 color) */}
            <button
              type="button"
              onClick={() => {
                setOpenMobile(!openMobile);
                if (searchOpen) handleCloseSearch();
              }}
              className="lg:hidden flex h-8 w-8 sm:h-8.5 sm:w-8.5 items-center justify-center border border-[#ccc2c2] rounded-[2px] text-[#ccc2c2] hover:border-[#999999] hover:text-[#999999] transition cursor-pointer"
              aria-label={openMobile ? "Close navigation menu" : "Open navigation menu"}
            >
              {openMobile ? (
                <X className="h-[15px] w-[15px] stroke-[1.4]" />
              ) : (
                <Menu className="h-[15px] w-[15px] stroke-[1.4]" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile In-Header Dropdown Menu (Under navbar border, strictly NO border or shadow after dropdown) */}
        {openMobile && (
          <div className="lg:hidden w-full bg-white px-6 sm:px-8 pt-4 pb-5 sm:pt-4 sm:pb-6 border-none shadow-none animate-in slide-in-from-top-1 duration-150">
            <ul className="flex flex-col space-y-2.5 text-[15px] font-normal text-[#4e4e4e]">
              <li>
                <Link
                  href="/"
                  onClick={() => setOpenMobile(false)}
                  className="block py-0.5 text-[#4e4e4e] hover:text-black transition"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/product-category/women"
                  onClick={() => setOpenMobile(false)}
                  className="block py-0.5 text-[#4e4e4e] hover:text-black transition"
                >
                  Women
                </Link>
              </li>
              <li>
                <Link
                  href="/product-category/men"
                  onClick={() => setOpenMobile(false)}
                  className="block py-0.5 text-[#4e4e4e] hover:text-black transition"
                >
                  Men
                </Link>
              </li>
              <li>
                <div>
                  <div className="flex items-center justify-between py-0.5">
                    <Link
                      href="/product-category/mighto"
                      onClick={() => setOpenMobile(false)}
                      className="flex-1 text-[#4e4e4e] hover:text-black transition"
                    >
                      Mighto
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setMightoExpanded(!mightoExpanded);
                      }}
                      className="p-0.5 text-[#888888] hover:text-black cursor-pointer"
                      aria-label="Toggle Mighto subcategories"
                    >
                      <ChevronDown
                        className={`h-4 w-4 stroke-[1.5] transition-transform duration-200 ${
                          mightoExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>
                  {mightoExpanded && (
                    <ul className="pl-4 pt-2 pb-1 space-y-2 text-[14px] text-[#666666] animate-in fade-in duration-150">
                      <li>
                        <Link
                          href="/product-category/mighto/mighto-men"
                          onClick={() => setOpenMobile(false)}
                          className="block py-0.5 hover:text-black transition"
                        >
                          Mighto Men
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/product-category/mighto/mighto-women"
                          onClick={() => setOpenMobile(false)}
                          className="block py-0.5 hover:text-black transition"
                        >
                          Mighto Women
                        </Link>
                      </li>
                    </ul>
                  )}
                </div>
              </li>
              <li>
                <Link
                  href="/product-category/accessories"
                  onClick={() => setOpenMobile(false)}
                  className="block py-0.5 text-[#4e4e4e] hover:text-black transition"
                >
                  Accessories
                </Link>
              </li>
              <li>
                <Link
                  href="/policies"
                  onClick={() => setOpenMobile(false)}
                  className="block py-0.5 text-[#4e4e4e] hover:text-black transition"
                >
                  Policies
                </Link>
              </li>
              <li>
                <Link
                  href="/sale"
                  onClick={() => setOpenMobile(false)}
                  className="block py-0.5 text-[#4e4e4e] hover:text-black transition"
                >
                  On Sale
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  onClick={() => setOpenMobile(false)}
                  className="block py-0.5 text-[#4e4e4e] hover:text-black transition"
                >
                  About Us
                </Link>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Cart Drawer */}
      <CartDrawer open={isCartOpen} onClose={closeCart} />
    </header>
  );
}
