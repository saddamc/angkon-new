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
    <li className="border-b border-[#5c0f0d]">
      <div className="flex items-center justify-between px-6 py-4 hover:bg-[#4a0705]">
        <Link href={href} onClick={onNavigate} className="flex-1 text-[#E1B76F]">
          {categoryDisplayName(node.name)}
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="p-1 text-[#cbb18a]"
            aria-label={`Toggle ${node.name} subcategories`}
          >
            <ChevronDown className={`h-5 w-5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {hasChildren && expanded && (
        <div className="bg-[#2b0403] pb-2 pl-4">
          <ul className="text-[14px] text-[#cbb18a]">
            {node.children.map((child) => (
              <CategoryAccordionItem key={child.id} node={child} parentPath={href} onNavigate={onNavigate} />
            ))}
            <li className="border-t border-[#5c0f0d] px-6 py-3">
              <Link href={href} onClick={onNavigate} className="block font-bold text-[#E1B76F]">
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
      <div className="animate-in slide-in-from-left flex h-full w-[85%] max-w-[400px] flex-col bg-[#400604] border-r border-[#5c0f0d] shadow-2xl duration-300">
        <div className="flex items-center justify-between border-b border-[#5c0f0d] p-5">
          <div className="flex flex-col">
            <span className="font-heading text-xl font-black uppercase tracking-tight text-[#E1B76F]">
              ANGKON<span className="text-[#f3cb87]">.</span>
            </span>
            <span className="text-[8px] uppercase tracking-[0.2em] font-medium text-[#cbb18a]">
              HOUSE OF MODERN HERITAGE
            </span>
          </div>
          <button onClick={onClose} className="-mr-2 p-2 text-[#E1B76F] hover:text-white transition">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <ul className="flex flex-col text-[15px] font-medium text-[#E1B76F]">
            <li>
              <Link href="/" onClick={onClose} className="block border-b border-[#5c0f0d] px-6 py-3.5 hover:bg-[#4a0705] font-bold">
                Home
              </Link>
            </li>
            <li>
              <Link href="/products" onClick={onClose} className="block border-b border-[#5c0f0d] px-6 py-3.5 hover:bg-[#4a0705]">
                All Products
              </Link>
            </li>
            <li>
              <Link href="/sale" onClick={onClose} className="flex items-center justify-between border-b border-[#5c0f0d] px-6 py-3.5 font-bold text-[#400604] bg-[#E1B76F] hover:bg-[#f3cb87]">
                <span>Sale 🔥</span>
                <span className="text-[11px] bg-[#400604] text-[#E1B76F] px-2 py-0.5 rounded-full font-black">UP TO 50% OFF</span>
              </Link>
            </li>

            <li>
              <Link href="/mighto" onClick={onClose} className="block border-b border-[#5c0f0d] px-6 py-3.5 hover:bg-[#4a0705]">
                Mighto Activewear
              </Link>
            </li>
            <li>
              <Link href="/about" onClick={onClose} className="block border-b border-[#5c0f0d] px-6 py-3.5 hover:bg-[#4a0705]">
                About Us
              </Link>
            </li>
            <li>
              <Link href="/policies" onClick={onClose} className="block border-b border-[#5c0f0d] px-6 py-3.5 hover:bg-[#4a0705]">
                Policies & Exchange
              </Link>
            </li>
            <li>
              <Link href="/my-account" onClick={onClose} className="block border-b border-[#5c0f0d] px-6 py-3.5 hover:bg-[#4a0705]">
                My Account
              </Link>
            </li>

            {categoryTree.length === 0 ? (
              <li className="px-6 py-4 text-[#cbb18a]">No categories yet</li>
            ) : (
              categoryTree.map((cat) => (
                <CategoryAccordionItem key={cat.id} node={cat} parentPath="" onNavigate={onClose} />
              ))
            )}
          </ul>

          {/* Showroom & Contact in Mobile Menu */}
          <div className="mt-8 border-t border-[#5c0f0d] p-6 text-[12px] text-[#cbb18a] space-y-1.5">
            <div className="font-bold text-[#E1B76F] uppercase tracking-wider text-[11px]">Showroom Address</div>
            <div className="font-bold text-[#E1B76F] uppercase tracking-wide text-[12px]">
              HOUSE OF MODERN HERITAGE
            </div>
            <p className="leading-relaxed">
              H-93, (Ground floor), Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212
            </p>
            <div className="pt-2">
              <a href="https://wa.me/8801338668899" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[#E1B76F] hover:underline font-bold">
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
