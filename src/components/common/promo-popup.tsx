"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

export function PromoPopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Show popup on website load every time as requested
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-300">
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        onClick={handleClose}
        aria-label="Close modal backdrop"
      />

      {/* Modal Popup Card matching Gorur Ghash exactly */}
      <div className="relative z-10 w-full max-w-[480px] sm:max-w-[520px] overflow-hidden rounded-lg shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Close Button: Black square with bold white X at top right */}
        <button
          onClick={handleClose}
          className="absolute right-2 top-2 z-30 flex h-7 w-7 items-center justify-center bg-black text-white hover:bg-neutral-800 transition shadow-lg"
          aria-label="Close popup"
        >
          <X className="h-4 w-4 stroke-[3]" />
        </button>

        {/* Campaign Poster Card */}
        <Link href="/sale" onClick={handleClose} className="block relative w-full aspect-[555/731]">
          <Image
            src="/promo/popup-campaign.png"
            alt="10% Cashback Campaign — bKash & ANGKON"
            fill
            priority
            className="object-contain"
            sizes="(max-width: 640px) 95vw, 520px"
          />
        </Link>
      </div>
    </div>
  );
}
