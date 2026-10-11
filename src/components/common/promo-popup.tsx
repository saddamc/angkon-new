"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

export function PromoPopup() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    try {
      sessionStorage.setItem("angkon_promo_seen", "true");
    } catch {
      // Ignore in private browsing / storage restricted mode
    }
  }, []);

  useEffect(() => {
    // Only show popup on home page
    if (pathname !== "/") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- close the popup when leaving the home page
      setIsOpen(false);
      return;
    }

    // Check if user already dismissed/viewed the popup in this session
    try {
      const alreadySeen = sessionStorage.getItem("angkon_promo_seen");
      if (alreadySeen === "true") {
        return;
      }
    } catch {
      // In case sessionStorage is blocked
    }

    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 700);

    return () => clearTimeout(timer);
  }, [pathname]);

  // Keyboard accessibility: Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (pathname !== "/" || !isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ANGKON Special Launch Campaign"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
    >
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 cursor-pointer"
        onClick={handleClose}
        aria-label="Close modal backdrop"
      />

      {/* Luxury Campaign Modal Card */}
      <div className="relative z-10 w-full max-w-[420px] sm:max-w-[480px] max-h-[92vh] overflow-hidden rounded-2xl border-2 border-[#E1B76F]/70 ring-1 ring-[#E1B76F]/30 bg-[#400604] shadow-[0_0_60px_rgba(225,183,111,0.28),0_25px_50px_-12px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-250">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 z-30 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-[#400604]/90 border border-[#E1B76F]/80 text-[#E1B76F] hover:bg-[#E1B76F] hover:text-[#400604] transition-all duration-200 shadow-xl cursor-pointer hover:scale-105 active:scale-95"
          aria-label="Close promotion popup"
        >
          <X className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.5]" />
        </button>

        {/* Campaign Poster Link */}
        <Link
          href="/products"
          onClick={handleClose}
          className="block relative w-full aspect-[3/4] bg-[#400604] group cursor-pointer"
        >
          <Image
            src="/promo/popup-campaign.png"
            alt="ANGKON — Tawakkal Wada Luxury 3-Piece Lawn Collection Launch"
            fill
            priority
            className="object-cover sm:object-contain transition-transform duration-500 group-hover:scale-[1.01]"
            sizes="(max-width: 640px) 94vw, 480px"
          />
        </Link>
      </div>
    </div>
  );
}
