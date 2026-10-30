"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, ChevronRight, Menu as MenuIcon, Home, Sparkles, Tag, ShoppingBag, FolderOpen } from "lucide-react";
import type { CategoryNode } from "@/types/woocommerce";
import { FASHION_CATEGORIES } from "@/data/categories";
import { categoryDisplayName } from "@/utils/category-display";

interface MegaMenuProps {
  categoryTree: CategoryNode[];
}

// The top-level fashion nav items (always shown in this fixed order)
const NAV_LINKS = [
  { label: "Home", href: "/", icon: Home, special: null },
  { label: "Shop", href: "/products", icon: ShoppingBag, special: null },
  { label: "New Arrivals", href: "/new-arrivals", icon: Sparkles, special: "new" as const },
  { label: "Sale", href: "/sale", icon: Tag, special: "sale" as const },
];

const MEGA_CATEGORIES = ["men", "women", "kids", "accessories"];

export function MegaMenu({ categoryTree }: MegaMenuProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isAllCategoriesOpen, setIsAllCategoriesOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAllCategoriesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEnter = (slug: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveMenu(slug);
  };
  const handleLeave = () => {
    timerRef.current = setTimeout(() => setActiveMenu(null), 120);
  };

  const renderPanel = (slug: string) => {
    const staticCat = FASHION_CATEGORIES.find((c) => c.slug === slug);
    // Try to get subcategories from WooCommerce tree first, fall back to static config
    const liveCat = categoryTree.find((c) => c.slug === slug);
    const subs = liveCat?.children.length
      ? liveCat.children.map((ch) => ({ name: categoryDisplayName(ch.name), slug: ch.slug }))
      : (staticCat?.sub ?? []).map((s) => ({ name: s.name, slug: s.slug }));

    if (!subs.length) return null;

    return (
      <div
        className="absolute top-full left-0 z-50 min-w-[520px] max-w-[700px] rounded-b-xl border border-[#E1B76F]/25 bg-[#340402] shadow-2xl"
        onMouseEnter={() => handleEnter(slug)}
        onMouseLeave={handleLeave}
      >
        {/* Panel header */}
        <div
          className="flex items-center gap-3 px-6 py-4 border-b border-[#E1B76F]/20 bg-[#400604]"
        >
          <span className="text-2xl">{staticCat?.icon}</span>
          <div>
            <p className="text-[16px] font-black text-white">{staticCat?.name}</p>
            <p className="text-[12px] text-white/90">Browse all {staticCat?.name} collections</p>
          </div>
          <Link
            href={`/${slug}`}
            className="ml-auto flex items-center gap-1.5 text-[12px] font-bold text-white hover:text-[#f3cb87] transition whitespace-nowrap"
          >
            Shop All <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Subcategory grid */}
        <div className="p-5">
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
            {subs.map((sub) => (
              <li key={sub.slug}>
                <Link
                  href={`/${slug}/${sub.slug}`}
                  className="group flex items-center gap-2 rounded-lg px-3 py-2.5 text-[13.5px] font-medium text-white/90 transition hover:bg-[#400604] hover:text-[#E1B76F]"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-white/40 transition-all group-hover:translate-x-0.5 group-hover:text-[#E1B76F]" />
                  {sub.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="flex w-full items-center">
      {/* "Shop by Category" Sidebar Dropdown */}
      <div ref={dropdownRef} className="relative flex h-full items-center shrink-0">
        <div
          onClick={() => setIsAllCategoriesOpen(!isAllCategoriesOpen)}
          className="flex min-w-[220px] items-center gap-3 bg-[#400604] border-r border-[#E1B76F]/30 px-5 py-4 text-[13.5px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#340402] cursor-pointer select-none"
        >
          <MenuIcon className="h-4.5 w-4.5 opacity-90 text-white" />
          <span>All Categories</span>
          <ChevronDown
            className={`ml-auto h-4 w-4 opacity-70 transition-transform duration-300 ${isAllCategoriesOpen ? "rotate-180" : ""}`}
          />
        </div>

        {isAllCategoriesOpen && (
          <div className="absolute top-full left-0 z-50 w-64 border-x border-b border-[#E1B76F]/25 bg-[#340402] shadow-2xl rounded-b-xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="py-2">
              {FASHION_CATEGORIES.map((cat) => {
                const liveCat = categoryTree.find((c) => c.slug === cat.slug);
                const subs = liveCat?.children.length
                  ? liveCat.children.map((ch) => ({ name: categoryDisplayName(ch.name), slug: ch.slug, image: ch.image?.src }))
                  : cat.sub.map((s) => ({ name: s.name, slug: s.slug, image: null }));

                return (
                  <div key={cat.slug} className="group/item relative">
                    <Link
                      href={`/${cat.slug}`}
                      className="flex items-center justify-between border-b border-[#E1B76F]/10 px-4 py-3 text-[13px] font-medium transition last:border-0 hover:bg-[#400604]"
                    >
                      <span className="flex items-center gap-3 text-white/90 group-hover/item:text-[#E1B76F] transition-colors">
                        <span className="text-lg w-6 text-center">{cat.icon}</span>
                        {cat.name}
                      </span>
                      {subs.length > 0 && (
                        <ChevronRight className="h-4 w-4 text-white/40 transition-all group-hover/item:translate-x-1 group-hover/item:text-[#E1B76F]" />
                      )}
                    </Link>

                    {/* Subcategory Flyout */}
                    {subs.length > 0 && (
                      <div className="invisible absolute left-full top-0 z-50 min-h-full min-w-[260px] -translate-x-2 opacity-0 transition-all duration-200 group-hover/item:visible group-hover/item:translate-x-0 group-hover/item:opacity-100 pl-1">
                        <div className="rounded-xl border border-[#E1B76F]/25 bg-[#340402] py-2 shadow-2xl max-h-[400px] overflow-y-auto">
                          {subs.map((sub) => (
                            <Link
                              key={sub.slug}
                              href={`/${cat.slug}/${sub.slug}`}
                              className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-white/90 hover:bg-[#400604] hover:text-[#E1B76F] transition-colors"
                            >
                              {sub.image ? (
                                <Image src={sub.image} alt={sub.name} width={28} height={28} className="h-7 w-7 rounded-lg object-cover bg-[#2b0403] shadow-sm shrink-0 border border-[#E1B76F]/20" />
                              ) : (
                                <div className="h-7 w-7 rounded-lg bg-[#2b0403] border border-[#E1B76F]/20 flex items-center justify-center text-white/50 shrink-0">
                                  <FolderOpen className="h-3.5 w-3.5" />
                                </div>
                              )}
                              <span className="truncate">{sub.name}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Navigation Bar */}
      <nav className="flex h-full flex-1 items-center gap-1 overflow-x-auto px-4 text-[13px] font-semibold tracking-wide [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV_LINKS.map(({ label, href, icon: Icon, special }) => (
          <Link
            key={label}
            href={href}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-4 transition ${
              special === "sale"
                ? "text-yellow-400 hover:text-yellow-300 font-black"
                : special === "new"
                ? "text-emerald-300 hover:text-emerald-200"
                : "text-white hover:text-gray-200"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}

        <div className="w-px h-6 bg-white/20 mx-2 shrink-0" />

        {/* Dynamic Mega Categories */}
        {MEGA_CATEGORIES.map((slug) => {
          const staticCat = FASHION_CATEGORIES.find((c) => c.slug === slug);
          if (!staticCat) return null;
          return (
            <div
              key={slug}
              className="relative h-full shrink-0"
              onMouseEnter={() => handleEnter(slug)}
              onMouseLeave={handleLeave}
            >
              <Link
                href={`/${slug}`}
                className="flex items-center gap-1 whitespace-nowrap px-3 py-4 text-white transition hover:text-gray-200"
              >
                <span>{staticCat.icon}</span>
                <span>{staticCat.name}</span>
                <ChevronDown className={`h-3 w-3 opacity-60 transition-transform duration-200 ${activeMenu === slug ? "rotate-180" : ""}`} />
              </Link>
              {activeMenu === slug && renderPanel(slug)}
            </div>
          );
        })}

        <Link
          href="/products"
          className="ml-auto shrink-0 whitespace-nowrap px-3 py-4 text-white/80 hover:text-white transition"
        >
          All Products →
        </Link>
      </nav>
    </div>
  );
}
