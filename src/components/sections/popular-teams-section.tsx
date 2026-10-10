"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type TeamCard = {
  name: string;
  href: string;
  emblem: string;
};

const defaultTeams: TeamCard[] = [
  { name: "Argentina", href: "/search?q=argentina", emblem: "AFA" },
  { name: "Brazil", href: "/search?q=brazil", emblem: "CBF" },
  { name: "Real Madrid", href: "/search?q=real%20madrid", emblem: "RM" },
  { name: "Barcelona", href: "/search?q=barcelona", emblem: "FCB" },
  { name: "Manchester City", href: "/search?q=manchester%20city", emblem: "MC" },
  { name: "PSG", href: "/search?q=psg", emblem: "PSG" },
  { name: "Liverpool", href: "/search?q=liverpool", emblem: "LFC" },
  { name: "Bayern Munich", href: "/search?q=bayern%20munich", emblem: "FCB" },
];

function TeamSkeletonCard() {
  return (
    <div className="relative min-w-[250px] max-w-[250px] snap-start rounded-[28px] border border-[#e8edf3] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)] md:min-w-[285px] md:max-w-[285px]">
      <div className="relative h-[320px] overflow-hidden rounded-[22px] bg-[#eef2f6] md:h-[360px]">
        <div className="absolute inset-y-0 -left-1/2 w-1/2 animate-[shimmer_1.6s_linear_infinite] bg-gradient-to-r from-transparent via-white/95 to-transparent" />
      </div>
    </div>
  );
}

export function PopularTeamsSection({ teams = defaultTeams }: { teams?: TeamCard[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const cards = useMemo(() => teams.slice(0, 8), [teams]);
  const showSkeleton = cards.length === 0;

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    const updateState = () => {
      const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
      setCanScrollLeft(rail.scrollLeft > 2);
      setCanScrollRight(rail.scrollLeft < maxScrollLeft - 2);
    };

    updateState();
    rail.addEventListener("scroll", updateState, { passive: true });
    window.addEventListener("resize", updateState);

    return () => {
      rail.removeEventListener("scroll", updateState);
      window.removeEventListener("resize", updateState);
    };
  }, [cards.length]);

  const scrollByAmount = (direction: "left" | "right") => {
    if (!railRef.current) {
      return;
    }

    const amount = Math.min(railRef.current.clientWidth * 0.84, 980);
    railRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="bg-[#f7f8fa] py-16 md:py-20">
      <div className="container">
        <div className="mb-8 flex items-end justify-between gap-4 md:mb-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-black md:text-4xl">Popular Teams</h2>
            <p className="mt-2 max-w-2xl text-sm text-black/55 md:text-base">
              Shop Jerseys From The World’s Biggest Clubs & Nations
            </p>
          </div>

          <Link
            href="/products"
            className="inline-flex items-center text-sm font-semibold uppercase tracking-[0.14em] text-black/75 transition hover:text-black"
          >
            View All Teams
          </Link>
        </div>

        <div
          ref={railRef}
          className="-mx-1 flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 pb-3 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {showSkeleton
            ? Array.from({ length: 8 }).map((_, index) => <TeamSkeletonCard key={`popular-team-skeleton-${index}`} />)
            : cards.map((team, index) => (
                <Link
                  key={team.name}
                  href={team.href}
                  className="group relative min-w-[250px] max-w-[250px] snap-start rounded-[28px] border border-[#e7ebf1] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-2 hover:shadow-[0_20px_46px_rgba(15,23,42,0.14)] md:min-w-[285px] md:max-w-[285px]"
                >
                  <div className="relative h-[320px] overflow-hidden rounded-[22px] bg-[#eef2f6] md:h-[360px]">
                    <Image
                      src="/Hero.jpg"
                      alt={`${team.name} jersey collection`}
                      fill
                      sizes="(max-width: 768px) 250px, 285px"
                      className="object-cover transition duration-700 group-hover:scale-110"
                      style={{ filter: "brightness(0.88) contrast(1.02) saturate(1.05)" }}
                    />

                    <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-white/0 via-black/10 to-black/45" />
                    <div
                      aria-hidden
                      className="absolute inset-0 opacity-70"
                      style={{
                        background:
                          index % 3 === 0
                            ? "radial-gradient(circle at 82% 16%, rgba(56,189,248,0.24), transparent 38%)"
                            : index % 3 === 1
                              ? "radial-gradient(circle at 20% 18%, rgba(74,222,128,0.22), transparent 38%)"
                              : "radial-gradient(circle at 18% 76%, rgba(250,204,21,0.2), transparent 40%)",
                      }}
                    />

                    <div className="absolute left-4 top-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/65 bg-white/85 text-[10px] font-bold tracking-[0.22em] text-black shadow-[0_6px_20px_rgba(0,0,0,0.12)] backdrop-blur-sm">
                      {team.emblem}
                    </div>

                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/85">Team Collection</p>
                      <h3 className="text-[23px] font-semibold leading-tight text-white">{team.name}</h3>
                    </div>

                    <div className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-black/0 transition duration-500 group-hover:ring-black/10" />
                  </div>
                </Link>
              ))}
        </div>

        <div className="mt-5 flex justify-end gap-3 md:mt-6">
          <button
            type="button"
            onClick={() => scrollByAmount("left")}
            disabled={!canScrollLeft}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e4e9ef] bg-white text-black shadow-[0_8px_20px_rgba(15,23,42,0.1)] transition enabled:hover:scale-105 enabled:hover:shadow-[0_12px_26px_rgba(15,23,42,0.14)] disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Scroll popular teams left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollByAmount("right")}
            disabled={!canScrollRight}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e4e9ef] bg-white text-black shadow-[0_8px_20px_rgba(15,23,42,0.1)] transition enabled:hover:scale-105 enabled:hover:shadow-[0_12px_26px_rgba(15,23,42,0.14)] disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Scroll popular teams right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
