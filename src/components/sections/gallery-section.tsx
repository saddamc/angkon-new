"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

const GALLERY_ITEMS = [
  { src: "/Hero.jpg", alt: "Argentina 2026 jersey collection" },
  { src: "/Hero1.png", alt: "World Cup 2026 official kit" },
  { src: "/Hero.jpeg", alt: "France national team jersey" },
  { src: "/Hero.webp", alt: "England 2026 home kit" },
  { src: "/Hero1.png", alt: "Brazil 2026 away kit" },
  { src: "/Hero.jpg", alt: "Match day jersey detail" },
  { src: "/Hero.webp", alt: "Official match grade fabric" },
  { src: "/Hero.jpeg", alt: "National team 2026 collection" },
];

export function GallerySection() {
  return (
    <section className="bg-[#f7f8fa] py-16 md:py-24">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <span className="mb-3 inline-block text-[11px] font-bold uppercase tracking-widest text-amber-500">
              @ANGKON
            </span>
            <h2 className="text-2xl font-semibold tracking-tight text-black md:text-4xl">The Jersey Life</h2>
            <p className="mt-2 text-sm text-black/50 md:text-base">
              Follow us for the latest drops, match day fits, and fan moments
            </p>
          </div>

          <Link
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-2.5 rounded-full bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(188,24,136,0.3)] transition hover:opacity-90 hover:shadow-[0_12px_32px_rgba(188,24,136,0.4)]"
          >
            <InstagramIcon className="h-4 w-4" />
            Follow on Instagram
          </Link>
        </motion.div>

        {/* Gallery grid — Pinterest / masonry-style using CSS grid areas */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {GALLERY_ITEMS.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.05 }}
              // First and sixth items span 2 rows for visual variety
              className={`group relative overflow-hidden rounded-2xl bg-[#eef2f6] ${
                index === 0 || index === 5 ? "row-span-2" : ""
              }`}
              style={{ aspectRatio: index === 0 || index === 5 ? "auto" : "1 / 1" }}
            >
              {/* Enforce height on row-span items */}
              <div className={`relative ${index === 0 || index === 5 ? "h-full min-h-[360px] md:min-h-[460px]" : "aspect-square"}`}>
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 25vw"
                  className="object-cover transition duration-500 group-hover:scale-108"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-[2px] transition-all duration-300 group-hover:opacity-100">
                  <div className="flex items-center gap-2 rounded-full border border-white/40 bg-white/20 px-4 py-2 backdrop-blur-md">
                    <InstagramIcon className="h-4 w-4 text-white" />
                    <span className="text-xs font-semibold text-white">View</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
