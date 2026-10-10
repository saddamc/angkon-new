"use client";

import Link from "next/link";
import { Phone, Mail, Clock, ChevronRight, Send, MapPin } from "lucide-react";

const QUICK_LINKS = [
  { label: "Home", href: "/" },
  { label: "Women Collection", href: "/women" },
  { label: "Men Collection", href: "/men" },
  { label: "Mighto Activewear", href: "/mighto" },
  { label: "Accessories", href: "/accessories" },
  { label: "All Products", href: "/products" },
  { label: "On Sale 🔥", href: "/sale" },
];

const CUSTOMER_SERVICE = [
  { label: "Contact & Showroom", href: "/contact" },
  { label: "About ANGKON", href: "/about" },
  { label: "My Account", href: "/my-account" },
  { label: "Shipping & Delivery Policy", href: "/shipping" },
  { label: "7-Day Exchange & Returns", href: "/returns" },
  { label: "Legal Information", href: "/legal" },
  { label: "Store Policies", href: "/policies" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
];

export function Footer() {
  return (
    <footer className="bg-[#2b0403] text-[#E1B76F] border-t-4 border-[#E1B76F] relative">
      <div className="container mx-auto px-4 lg:px-8 max-w-[1400px] py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Column 1: Brand & Contact Info */}
          <div>
            <div className="mb-4">
              <Link href="/" className="flex flex-col leading-none">
                <span className="font-heading text-3xl font-black tracking-tight text-[#E1B76F]">
                  ANGKON<span className="text-[#f3cb87]">.</span>
                </span>
                <span className="text-[9px] uppercase tracking-[0.24em] font-medium text-[#cbb18a] mt-1">
                  HOUSE OF MODERN HERITAGE
                </span>
              </Link>
            </div>
            <p className="text-[13px] text-[#cbb18a] mb-6 leading-relaxed">
              Premium fashion and modern heritage apparel crafted with excellence in Bangladesh. Quality fabrics designed for everyday distinction.
            </p>
            <ul className="space-y-3 text-[13px] text-[#cbb18a]">
              <li className="flex items-start gap-3 hover:text-[#E1B76F] transition">
                <MapPin className="h-4 w-4 shrink-0 text-[#E1B76F] mt-1" />
                <div className="flex flex-col">
                  <span className="font-bold text-[#E1B76F] uppercase tracking-wider text-[12px]">
                    HOUSE OF MODERN HERITAGE
                  </span>
                  <span className="text-[#cbb18a] leading-relaxed">
                    H-93, (Ground floor), Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212
                  </span>
                </div>
              </li>
              <li className="flex items-center gap-3 hover:text-[#E1B76F] transition">
                <Phone className="h-4 w-4 shrink-0 text-[#E1B76F]" />
                <a href="https://wa.me/8801338668899" target="_blank" rel="noreferrer" className="hover:underline">
                  +880 1338-668899 (WhatsApp)
                </a>
              </li>
              <li className="flex items-center gap-3 hover:text-[#E1B76F] transition">
                <Mail className="h-4 w-4 shrink-0 text-[#E1B76F]" />
                <a href="mailto:angkonofficial08@gmail.com" className="hover:underline">
                  angkonofficial08@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="h-4 w-4 shrink-0 text-[#E1B76F]" />
                <span>Showroom: 10:00 AM - 10:00 PM</span>
              </li>
            </ul>

            <div className="mt-8">
              <h3 className="font-heading text-[13px] font-bold text-[#E1B76F] mb-3 uppercase tracking-wider">
                Follow Us
              </h3>
              <div className="flex gap-2.5">
                {/* Facebook */}
                <a
                  href="https://www.facebook.com/share/19LUKov4Ei/?mibextid=wwXIfr"
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-full bg-[#400604] border border-[#5c0f0d] flex items-center justify-center text-[#E1B76F] hover:bg-[#E1B76F] hover:text-[#400604] transition"
                  aria-label="Follow us on Facebook"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </a>

                {/* Instagram */}
                <a
                  href="https://www.instagram.com/angkon.officiall?stkn=MTBjcmt5NWhwYzVqYQ=="
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-full bg-[#400604] border border-[#5c0f0d] flex items-center justify-center text-[#E1B76F] hover:bg-[#E1B76F] hover:text-[#400604] transition"
                  aria-label="Follow us on Instagram"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </a>

                {/* TikTok (replacing YouTube as requested) */}
                <a
                  href="https://www.tiktok.com/@angkon.official"
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 rounded-full bg-[#400604] border border-[#5c0f0d] flex items-center justify-center text-[#E1B76F] hover:bg-[#E1B76F] hover:text-[#400604] transition"
                  aria-label="Follow us on TikTok"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.32a6.34 6.34 0 0 0-.86-.06A6.34 6.34 0 0 0 3.14 15.6a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V9a8.16 8.16 0 0 0 3.77.92V6.69z"/></svg>
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Collections */}
          <div>
            <h3 className="font-heading text-[15px] font-bold text-[#E1B76F] mb-6 uppercase tracking-wider">
              Explore Collections
            </h3>
            <ul className="space-y-3">
              {QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="flex items-center gap-2 text-[13px] text-[#cbb18a] hover:text-[#E1B76F] transition group">
                    <ChevronRight className="w-3.5 h-3.5 text-[#5c0f0d] group-hover:text-[#E1B76F] transition" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Customer Support */}
          <div>
            <h3 className="font-heading text-[15px] font-bold text-[#E1B76F] mb-6 uppercase tracking-wider">
              Customer Support
            </h3>
            <ul className="space-y-3 mb-8">
              {CUSTOMER_SERVICE.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="flex items-center gap-2 text-[13px] text-[#cbb18a] hover:text-[#E1B76F] transition group">
                    <ChevronRight className="w-3.5 h-3.5 text-[#5c0f0d] group-hover:text-[#E1B76F] transition" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Newsletter */}
          <div>
            <h3 className="font-heading text-[15px] font-bold text-[#E1B76F] mb-2 uppercase tracking-wider">
              Heritage Club
            </h3>
            <p className="text-[12px] text-[#cbb18a] mb-4 leading-relaxed">
              Subscribe to get secret drops, private sales, and limited heritage editions before anyone else.
            </p>
            <div className="flex rounded-[12px] overflow-hidden border border-[#5c0f0d] focus-within:border-[#E1B76F]">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="w-full bg-[#400604] text-sm text-[#E1B76F] px-4 py-3 placeholder-[#cbb18a]/60 outline-none"
              />
              <button className="bg-[#E1B76F] text-[#400604] hover:bg-[#f3cb87] font-bold px-5 transition flex items-center justify-center">
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-[#cbb18a]/70 mt-2">
              No spam. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Bottom (Payment badges & Copyright) */}
      <div className="bg-[#1e0302] py-6 border-t border-[#5c0f0d]">
        <div className="container mx-auto px-4 lg:px-8 max-w-[1400px] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-[12px] text-[#cbb18a] text-center md:text-left">
            <p>© {new Date().getFullYear()} ANGKON - HOUSE OF MODERN HERITAGE. All rights reserved.</p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <span className="text-[12px] text-[#cbb18a] mr-1">Accepted Payments:</span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 bg-[#D82A6B] text-white rounded font-bold text-[10px]">bKash</span>
              <span className="px-2.5 py-1 bg-[#E83C24] text-white rounded font-bold text-[10px]">Nagad</span>
              <span className="px-2.5 py-1 bg-[#7C2D8A] text-white rounded font-bold text-[10px]">Rocket</span>
              <span className="px-2.5 py-1 bg-white text-blue-900 rounded font-bold text-[10px]">VISA</span>
              <span className="px-2.5 py-1 bg-white text-red-600 rounded font-bold text-[10px]">Mastercard</span>
              <span className="px-2.5 py-1 bg-[#27AE60] text-white rounded font-bold text-[10px]">Cash on Delivery</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
