"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, X } from "lucide-react";
import type { CategoryNode } from "@/types/woocommerce";
import { categoryDisplayName } from "@/utils/category-display";

interface MobileMenuProps {
  categoryTree: CategoryNode[];
  isOpen: boolean;
  onClose: () => void;
}

function CategoryAccordionItem({
  node,
  parentPath,
  onNavigate,
}: {
  node: CategoryNode;
  parentPath: string;
  onNavigate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const href = `${parentPath}/${node.slug}`;
  const hasChildren = node.children.length > 0;

  return (
    <li className="border-b border-[#E1B76F]/15">
      <div className="flex items-center justify-between px-6 py-3.5 hover:bg-[#280504] transition">
        <Link href={href} onClick={onNavigate} className="flex-1 text-white font-medium">
          {categoryDisplayName(node.name)}
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="p-1 text-white/70 hover:text-[#E1B76F]"
            aria-label={`Toggle ${node.name} subcategories`}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {hasChildren && expanded && (
        <div className="bg-[#240403] pb-2 pl-4">
          <ul className="text-[13px] text-white/90">
            {node.children.map((child) => (
              <CategoryAccordionItem key={child.id} node={child} parentPath={href} onNavigate={onNavigate} />
            ))}
            <li className="border-t border-[#E1B76F]/15 px-6 py-2.5">
              <Link href={href} onClick={onNavigate} className="block font-bold text-white hover:text-[#f3cb87]">
                View All {categoryDisplayName(node.name)}
              </Link>
            </li>
          </ul>
        </div>
      )}
    </li>
  );
}

export function MobileMenu({ categoryTree, isOpen, onClose }: MobileMenuProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex bg-black/70 backdrop-blur-sm">
      <div className="animate-in slide-in-from-left flex h-full w-[85%] max-w-[380px] flex-col bg-[#1A0302] border-r border-[#E1B76F]/30 shadow-2xl duration-300">
        <div className="flex items-center justify-between border-b border-[#E1B76F]/20 bg-[#100101] p-4 text-white">
          <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
            <Image
              src="/logo.jpeg"
              alt="ANGKON"
              width={36}
              height={36}
              className="h-9 w-9 rounded-md shadow-sm border border-[#E1B76F]/30 object-contain"
            />
            <span className="font-serif tracking-[0.2em] text-[16px] font-bold text-white uppercase leading-none">
              ANGKON
            </span>
          </Link>
          <button onClick={onClose} className="-mr-2 p-2 text-white hover:text-[#f3cb87] transition cursor-pointer" aria-label="Close menu">
            <X className="h-5 w-5 stroke-[1.8]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <ul className="flex flex-col text-[14px] font-bold uppercase tracking-wider text-white">
            <li>
              <Link href="/" onClick={onClose} className="block border-b border-[#E1B76F]/15 px-6 py-3.5 hover:bg-[#280504] text-white transition">
                Home
              </Link>
            </li>
            <li>
              <Link href="/product-category/women" onClick={onClose} className="block border-b border-[#E1B76F]/15 px-6 py-3.5 hover:bg-[#280504] transition">
                Women
              </Link>
            </li>
            <li>
              <Link href="/product-category/men" onClick={onClose} className="block border-b border-[#E1B76F]/15 px-6 py-3.5 hover:bg-[#280504] transition">
                Men
              </Link>
            </li>
            <li>
              <Link href="/products" onClick={onClose} className="block border-b border-[#E1B76F]/15 px-6 py-3.5 hover:bg-[#280504] transition">
                Products
              </Link>
            </li>
            <li>
              <Link href="/product-category/accessories" onClick={onClose} className="block border-b border-[#E1B76F]/15 px-6 py-3.5 hover:bg-[#280504] transition">
                Accessories
              </Link>
            </li>
            <li>
              <Link href="/sale" onClick={onClose} className="flex items-center justify-between border-b border-[#E1B76F]/15 px-6 py-3.5 bg-[#280504] text-white hover:bg-[#200302] transition">
                <span>On Sale 🔥</span>
                <span className="text-[10px] bg-[#E1B76F] text-[#1A0302] px-2 py-0.5 rounded-full font-black">SAVE BIG</span>
              </Link>
            </li>
            <li>
              <Link href="/policies" onClick={onClose} className="block border-b border-[#E1B76F]/15 px-6 py-3.5 hover:bg-[#280504] transition">
                Policies
              </Link>
            </li>
            <li>
              <Link href="/about" onClick={onClose} className="block border-b border-[#E1B76F]/15 px-6 py-3.5 hover:bg-[#280504] transition">
                About Us
              </Link>
            </li>
            <li>
              <Link href="/my-account" onClick={onClose} className="block border-b border-[#E1B76F]/15 px-6 py-3.5 hover:bg-[#280504] transition">
                My Account
              </Link>
            </li>

            {categoryTree.length > 0 && (
              <li className="pt-2">
                <span className="block px-6 py-2 text-[11px] text-white/60 font-bold uppercase tracking-wider">Categories</span>
                <ul>
                  {categoryTree.map((cat) => (
                    <CategoryAccordionItem key={cat.id} node={cat} parentPath="/product-category" onNavigate={onClose} />
                  ))}
                </ul>
              </li>
            )}
          </ul>

          {/* Showroom & Contact in Mobile Menu */}
          <div className="mt-6 border-t border-[#E1B76F]/20 p-6 text-[12px] text-white/90 space-y-2 bg-[#100101]">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">Showroom Address</div>
            <p className="leading-relaxed">
              H-93, (Ground floor), Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212
            </p>
            <div>
              <a
                href="https://maps.app.goo.gl/hwrj3KgQ6NdSYp3R8"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E1B76F] hover:underline"
              >
                View on Google Maps →
              </a>
            </div>
            <div className="pt-1 space-y-1 text-xs">
              <div>
                <span className="text-white/70">Hotline: </span>
                <a href="https://wa.me/8801338668899" target="_blank" rel="noreferrer" className="text-[#E1B76F] hover:underline font-bold">
                  +880 1338-668899
                </a>
              </div>
              <div>
                <span className="text-white/70">Email: </span>
                <a href="mailto:angkonofficial08@gmail.com" className="text-[#E1B76F] hover:underline font-medium">
                  angkonofficial08@gmail.com
                </a>
              </div>
            </div>

            {/* Social channels in mobile menu */}
            <div className="pt-3 border-t border-[#E1B76F]/15">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-white/80 mb-2">
                Follow Us Online
              </span>
              <div className="flex items-center gap-2">
                <a
                  href="https://www.facebook.com/share/19LUKov4Ei/?mibextid=wwXIfr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-[#E1B76F]/40 bg-[#1A0302] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#E1B76F] hover:text-[#1A0302] transition"
                >
                  Facebook
                </a>
                <a
                  href="https://www.instagram.com/angkon.officiall?stkn=MTBjcmt5NWhwYzVqYQ=="
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-[#E1B76F]/40 bg-[#1A0302] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#E1B76F] hover:text-[#1A0302] transition"
                >
                  Instagram
                </a>
                <a
                  href="https://www.tiktok.com/@angkon.official"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-[#E1B76F]/40 bg-[#1A0302] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#E1B76F] hover:text-[#1A0302] transition"
                >
                  TikTok
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1" onClick={onClose} />
    </div>
  );
}
