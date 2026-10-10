"use client";

import { useState } from "react";
import Link from "next/link";
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
    <li className="border-b border-neutral-100">
      <div className="flex items-center justify-between px-6 py-3.5 hover:bg-neutral-50">
        <Link href={href} onClick={onNavigate} className="flex-1 text-black font-medium">
          {categoryDisplayName(node.name)}
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="p-1 text-neutral-500"
            aria-label={`Toggle ${node.name} subcategories`}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {hasChildren && expanded && (
        <div className="bg-neutral-50 pb-2 pl-4">
          <ul className="text-[13px] text-neutral-700">
            {node.children.map((child) => (
              <CategoryAccordionItem key={child.id} node={child} parentPath={href} onNavigate={onNavigate} />
            ))}
            <li className="border-t border-neutral-200 px-6 py-2.5">
              <Link href={href} onClick={onNavigate} className="block font-bold text-black">
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
    <div className="fixed inset-0 z-[100] flex bg-black/60 backdrop-blur-sm">
      <div className="animate-in slide-in-from-left flex h-full w-[85%] max-w-[380px] flex-col bg-white border-r border-neutral-200 shadow-2xl duration-300">
        <div className="flex items-center justify-between border-b border-neutral-100 p-4">
          <Link href="/" onClick={onClose} className="inline-block">
            <img
              src="/logo-gg.png"
              alt="Logo"
              className="h-9 w-auto object-contain"
            />
          </Link>
          <button onClick={onClose} className="-mr-2 p-2 text-black hover:text-neutral-600 transition">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <ul className="flex flex-col text-[14px] font-bold uppercase tracking-wider text-[#4e4e4e]">
            <li>
              <Link href="/" onClick={onClose} className="block border-b border-neutral-100 px-6 py-3.5 hover:bg-neutral-50 text-[#602bb7]">
                Home
              </Link>
            </li>
            <li>
              <Link href="/product-category/women" onClick={onClose} className="block border-b border-neutral-100 px-6 py-3.5 hover:bg-neutral-50">
                Women
              </Link>
            </li>
            <li>
              <Link href="/product-category/men" onClick={onClose} className="block border-b border-neutral-100 px-6 py-3.5 hover:bg-neutral-50">
                Men
              </Link>
            </li>
            <li>
              <Link href="/product-category/mighto" onClick={onClose} className="block border-b border-neutral-100 px-6 py-3.5 hover:bg-neutral-50">
                Mighto Activewear
              </Link>
            </li>
            <li>
              <Link href="/product-category/accessories" onClick={onClose} className="block border-b border-neutral-100 px-6 py-3.5 hover:bg-neutral-50">
                Accessories
              </Link>
            </li>
            <li>
              <Link href="/sale" onClick={onClose} className="flex items-center justify-between border-b border-neutral-100 px-6 py-3.5 bg-[#ffd800] text-black">
                <span>On Sale 🔥</span>
                <span className="text-[10px] bg-black text-[#ffd800] px-2 py-0.5 rounded-full font-black">SAVE BIG</span>
              </Link>
            </li>
            <li>
              <Link href="/policies" onClick={onClose} className="block border-b border-neutral-100 px-6 py-3.5 hover:bg-neutral-50">
                Policies
              </Link>
            </li>
            <li>
              <Link href="/about" onClick={onClose} className="block border-b border-neutral-100 px-6 py-3.5 hover:bg-neutral-50">
                About Us
              </Link>
            </li>
            <li>
              <Link href="/my-account" onClick={onClose} className="block border-b border-neutral-100 px-6 py-3.5 hover:bg-neutral-50">
                My Account
              </Link>
            </li>

            {categoryTree.length > 0 && (
              <li className="pt-2">
                <span className="block px-6 py-2 text-[11px] text-neutral-400 font-bold uppercase tracking-wider">Categories</span>
                <ul>
                  {categoryTree.map((cat) => (
                    <CategoryAccordionItem key={cat.id} node={cat} parentPath="/product-category" onNavigate={onClose} />
                  ))}
                </ul>
              </li>
            )}
          </ul>

          {/* Showroom & Contact in Mobile Menu */}
          <div className="mt-6 border-t border-neutral-200 p-6 text-[12px] text-neutral-600 space-y-1.5 bg-neutral-50">
            <div className="font-bold text-black uppercase tracking-wider text-[11px]">Showroom Address</div>
            <div className="font-bold text-black uppercase tracking-wide text-[12px]">
              HOUSE OF MODERN HERITAGE
            </div>
            <p className="leading-relaxed">
              H-93, (Ground floor), Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212
            </p>
            <div className="pt-2">
              <a href="https://wa.me/8801338668899" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-black hover:underline font-bold">
                WhatsApp: +880 1338-668899
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1" onClick={onClose} />
    </div>
  );
}
