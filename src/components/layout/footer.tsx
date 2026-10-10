"use client";

import Link from "next/link";

const PAGES_LINKS = [
  { label: "My Account", href: "/my-account" },
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Legal Info", href: "/legal" },
];

const HELP_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Refund, Trial & Exchange Policy", href: "/refund-and-exchange-policies" },
  { label: "Contact Us", href: "/contact" },
  { label: "Terms & Conditions", href: "/terms" },
];

export function Footer() {
  return (
    <footer className="bg-white text-neutral-800 border-t border-neutral-200">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-[1440px] py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {/* Column 1: Pages */}
          <div>
            <h3 className="text-base font-bold text-black mb-4">
              Pages
            </h3>
            <ul className="space-y-2 text-[13px] text-neutral-600">
              {PAGES_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-black hover:underline transition">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: Help */}
          <div>
            <h3 className="text-base font-bold text-black mb-4">
              Help
            </h3>
            <ul className="space-y-2 text-[13px] text-neutral-600">
              {HELP_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-black hover:underline transition">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Contact Information matching Gorur Ghash */}
          <div>
            <h3 className="text-base font-bold text-black mb-4">
              Contact Information
            </h3>
            <div className="space-y-2.5 text-[13px] text-neutral-600 leading-relaxed">
              <div>
                <span className="font-bold text-black block uppercase tracking-wider text-xs mb-0.5">
                  HOUSE OF MODERN HERITAGE
                </span>
                <p className="text-neutral-700">
                  <b>Showroom:</b> H-93, (Ground floor), Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212
                </p>
              </div>

              <p>
                <b>Phone:</b>{" "}
                <a href="https://wa.me/8801338668899" target="_blank" rel="noreferrer" className="text-black hover:underline font-semibold">
                  +880 1338-668899
                </a>
              </p>

              <p>
                <b>Email:</b>{" "}
                <a href="mailto:angkonofficial08@gmail.com" className="text-black hover:underline">
                  angkonofficial08@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Bar matching Gorur Ghash */}
      <div className="bg-white py-5 border-t border-neutral-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-[1440px] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
          <p>
            Copyright © {new Date().getFullYear()} ANGKON — HOUSE OF MODERN HERITAGE
          </p>
          <p>
            Powered by ANGKON
          </p>
        </div>
      </div>
    </footer>
  );
}
