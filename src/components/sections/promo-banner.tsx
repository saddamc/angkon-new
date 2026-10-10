"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";

const STATS = [
  { value: "32+", label: "National Teams" },
  { value: "100%", label: "Authentic" },
  { value: "24hr", label: "Dispatch" },
];

export function PromoBanner() {
  return (
    <section className="relative overflow-hidden bg-[#080c14] py-20 md:py-28">
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src="/Hero.webp"
          alt="Promo background"
          fill
          sizes="100vw"
          className="object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080c14] via-[#080c14]/85 to-[#080c14]/30" />
      </div>

      {/* Glow blobs */}
      <div className="pointer-events-none absolute -left-40 top-1/2 h-[520px] w-[520px] -translate-y-1/2 rounded-full bg-amber-500/12 blur-[130px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-[400px] w-[400px] rounded-full bg-blue-600/10 blur-[110px]" />

      <div className="container relative z-10">
        <div className="max-w-2xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-400"
          >
            <Zap className="h-3.5 w-3.5 fill-amber-400" />
            Limited Edition — World Cup 2026
          </motion.div>

          {/* Headline */}
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="mb-5 font-['Bebas_Neue'] text-[64px] leading-[0.92] tracking-wide text-white md:text-[88px] lg:text-[104px]"
          >
            Official Kits
            <br />
            <span className="text-amber-400">For Champions</span>
          </motion.h2>

          {/* Sub-copy */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.18 }}
            className="mb-9 max-w-[480px] text-base leading-relaxed text-white/55 md:text-lg"
          >
            Match-grade jerseys worn by the world&apos;s greatest nations. Officially licensed, meticulously crafted,
            delivered to your door.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.26 }}
            className="flex flex-wrap items-center gap-4"
          >
            <Link
              href="/products"
              className="group inline-flex items-center gap-2.5 rounded-full bg-amber-400 px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-black transition hover:bg-amber-300 hover:shadow-[0_0_40px_rgba(251,191,36,0.45)]"
            >
              Shop Collection
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-full border border-white/18 px-7 py-3.5 text-sm font-semibold tracking-wide text-white/75 transition hover:border-white/35 hover:text-white"
            >
              World Cup Kits
            </Link>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.35 }}
            className="mt-12 flex flex-wrap gap-10"
          >
            {STATS.map((stat, i) => (
              <div key={stat.label} className="relative">
                {i > 0 && (
                  <div className="absolute -left-5 top-1/2 hidden h-8 w-px -translate-y-1/2 bg-white/12 md:block" />
                )}
                <p className="font-['Bebas_Neue'] text-[40px] leading-none tracking-wide text-white">{stat.value}</p>
                <p className="mt-1 text-[11px] uppercase tracking-widest text-white/40">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
