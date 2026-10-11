"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const SPOTLIGHTS = [
  {
    country: "Argentina",
    subtitle: "2026 World Cup Home Kit",
    description: "Reigning champions. The iconic sky-blue and white stripes that have defined football history.",
    image: "/Hero.jpg",
    href: "/search?q=argentina",
    code: "ARG",
    gradient: "from-[#74ACDF]/30 via-[#74ACDF]/10 to-transparent",
    accent: "#74ACDF",
  },
  {
    country: "Brazil",
    subtitle: "2026 World Cup Home Kit",
    description: "The most decorated nation in World Cup history. Samba gold, built for legends.",
    image: "/Hero1.webp",
    href: "/search?q=brazil",
    code: "BRA",
    gradient: "from-[#FFDF00]/30 via-[#009C3B]/15 to-transparent",
    accent: "#FFDF00",
  },
  {
    country: "France",
    subtitle: "2026 World Cup Home Kit",
    description: "Les Bleus. Two-time world champions with a jersey as iconic as their players.",
    image: "/Hero.jpeg",
    href: "/search?q=france",
    code: "FRA",
    gradient: "from-[#002395]/30 via-[#ED2939]/10 to-transparent",
    accent: "#4189DD",
  },
  {
    country: "England",
    subtitle: "2026 World Cup Home Kit",
    description: "Three Lions. The birthplace of football and the nation that lives for the beautiful game.",
    image: "/Hero.webp",
    href: "/search?q=england",
    code: "ENG",
    gradient: "from-[#CF142B]/25 via-[#00247D]/10 to-transparent",
    accent: "#CF142B",
  },
];

export function PlayerSpotlightSection() {
  return (
    <section className="bg-[#080c14] py-16 md:py-24">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10 md:mb-14"
        >
          <span className="mb-3 inline-block text-[11px] font-bold uppercase tracking-widest text-amber-400">
            Featured Nations
          </span>
          <h2 className="text-2xl font-semibold tracking-tight text-white md:text-4xl">Shop by Country</h2>
          <p className="mt-2 text-sm text-white/40 md:text-base">
            Officially licensed kits from the world&apos;s greatest footballing nations
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
          {SPOTLIGHTS.map((item, index) => (
            <motion.div
              key={item.country}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link
                href={item.href}
                className="group relative flex flex-col overflow-hidden rounded-[22px] border border-white/8 bg-white/4 transition duration-300 hover:-translate-y-1.5 hover:border-white/16 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
              >
                {/* Country code badge */}
                <div className="absolute left-3.5 top-3.5 z-10 rounded-lg bg-black/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md">
                  {item.code}
                </div>

                {/* Image */}
                <div className="relative h-[200px] overflow-hidden sm:h-[240px] md:h-[280px]">
                  <div className={`absolute inset-0 z-10 bg-gradient-to-b ${item.gradient}`} />
                  <Image
                    src={item.image}
                    alt={`${item.country} jersey`}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition duration-600 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                </div>

                {/* Content */}
                <div className="relative z-10 p-4 md:p-5">
                  <h3 className="text-[15px] font-bold text-white md:text-lg">{item.country}</h3>
                  <p className="mt-0.5 text-[11px] text-white/45">{item.subtitle}</p>
                  <p className="mt-2 hidden text-[13px] leading-relaxed text-white/55 sm:line-clamp-2">{item.description}</p>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-400 transition-all duration-300 group-hover:gap-3">
                    Shop Now <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
