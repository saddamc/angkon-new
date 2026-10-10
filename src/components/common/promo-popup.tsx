"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

export function PromoPopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem("angkon_promo_dismissed");
    if (!dismissed) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem("angkon_promo_dismissed", "true");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="fixed inset-0" 
        onClick={handleClose} 
        aria-label="Close backdrop"
      />

      <div className="relative z-10 w-full max-w-[480px] overflow-hidden rounded-[14px] bg-[#400604] border-2 border-[#E1B76F] shadow-2xl text-[#f5ebd8] animate-in zoom-in-95 duration-300">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/80 text-white hover:bg-[#E1B76F] hover:text-[#400604] transition shadow-md"
          aria-label="Close popup"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Campaign Visual Banner */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#2b0403]">
          <Image
            src="https://gorurghash.com/wp-content/uploads/2026/09/Bkash-Cashback.png"
            alt="10% Cashback Campaign"
            fill
            className="object-cover"
            sizes="(max-width: 640px) 90vw, 480px"
            priority
          />
        </div>

        {/* Terms and Logos Box */}
        <div className="p-5 bg-white text-black">
          <ul className="space-y-1.5 text-[11px] sm:text-[12px] text-gray-800 leading-tight">
            <li className="flex items-start gap-1.5">
              <span className="font-bold">•</span>
              <span>Minimum payment amount BDT 600</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="font-bold">•</span>
              <span>Max BDT 150 cashback on a single transaction upto BDT 300 cashback throughout the campaign period</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="font-bold">•</span>
              <span>Can be availed only once a day and twice overall during campaign period</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="font-bold">•</span>
              <span>Valid for all bKash and online checkout payments</span>
            </li>
          </ul>

          <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-3">
            <div className="flex flex-col">
              <span className="font-heading text-sm font-black text-[#400604]">ANGKON.</span>
              <span className="text-[8px] uppercase tracking-wider text-gray-500 font-bold">House of Modern Heritage</span>
            </div>
            <button
              onClick={handleClose}
              className="rounded-full bg-[#fbdd02] px-4 py-1.5 text-[11px] font-black uppercase text-black hover:bg-yellow-400 transition shadow-sm"
            >
              Shop Deals Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
