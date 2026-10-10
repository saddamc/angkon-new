import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "MIGHTO Performance Activewear — ANGKON",
  description: "Mighto Performance Activewear: gym shorts, sculpt yoga pants, compression tees, and breathable athleisure.",
};

export default function MightoPage() {
  return (
    <div className="w-full min-h-screen bg-white text-black overflow-hidden">
      {/* ── 1. Top Hero Banner (Full Bleed Edge-to-Edge) ── */}
      <section className="w-full">
        <Link
          href="/mighto-men"
          className="group block w-full overflow-hidden bg-neutral-100"
        >
          <Image
            src="/banners/mighto-home-banner.png"
            alt="Mighto Performance Activewear"
            width={2560}
            height={942}
            priority
            sizes="100vw"
            className="w-full h-auto block transition-transform duration-700 group-hover:scale-[1.005]"
          />
        </Link>
      </section>

      {/* ── 2. Split 2-Column Tiles: Mighto Men & Mighto Women ── */}
      <section className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 w-full gap-0 p-0">
          {/* MIGHTO MEN */}
          <Link
            href="/mighto-men"
            className="group block w-full overflow-hidden bg-neutral-100"
          >
            <Image
              src="/banners/mighto-men-card.png"
              alt="Mighto Men Collection"
              width={1440}
              height={1440}
              sizes="(max-width: 768px) 100vw, 50vw"
              className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.01]"
            />
          </Link>

          {/* MIGHTO WOMEN */}
          <Link
            href="/mighto-women"
            className="group block w-full overflow-hidden bg-neutral-100"
          >
            <Image
              src="/banners/mighto-women-card.png"
              alt="Mighto Women Collection"
              width={1440}
              height={1440}
              sizes="(max-width: 768px) 100vw, 50vw"
              className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.01]"
            />
          </Link>
        </div>
      </section>

      {/* ── 3. Middle Strip Full Bleed Banner ── */}
      <section className="w-full">
        <div className="w-full overflow-hidden bg-neutral-100">
          <Image
            src="/banners/mighto-strip-1.png"
            alt="Mighto Performance Apparel"
            width={2560}
            height={676}
            sizes="100vw"
            className="w-full h-auto block"
          />
        </div>
      </section>

      {/* ── 4. Bottom Strip Full Bleed Banner ── */}
      <section className="w-full">
        <Link
          href="/mighto"
          className="group block w-full overflow-hidden bg-neutral-100"
        >
          <Image
            src="/banners/mighto-strip-2.png"
            alt="Mighto Athleisure"
            width={2560}
            height={676}
            sizes="100vw"
            className="w-full h-auto block transition-transform duration-700 group-hover:scale-[1.005]"
          />
        </Link>
      </section>
    </div>
  );
}
