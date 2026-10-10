"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const REVIEWS = [
  {
    name: "Marcus Thompson",
    location: "London, UK",
    avatar: "MT",
    rating: 5,
    jersey: "Argentina 2026 Home",
    text: "Absolutely incredible quality. The stitching, the fabric, the weight — it feels exactly like what the players wear on the pitch. Arrived in 48 hours. Will definitely order again.",
    date: "Apr 2026",
  },
  {
    name: "Sofia Ribeiro",
    location: "São Paulo, Brazil",
    avatar: "SR",
    rating: 5,
    jersey: "Brazil 2026 Home",
    text: "I've been collecting jerseys for 10 years and this is genuinely the best service I've used. Packaging was premium, jersey was perfect, and the size guide was spot on.",
    date: "Mar 2026",
  },
  {
    name: "Ahmed Al-Rashid",
    location: "Dubai, UAE",
    avatar: "AA",
    rating: 5,
    jersey: "France 2026 Away",
    text: "Ordered for a World Cup watch party and the jersey arrived with 2 days to spare. The print quality is phenomenal — you can tell it's the real deal, not a replica.",
    date: "May 2026",
  },
  {
    name: "Emma Williams",
    location: "Manchester, UK",
    avatar: "EW",
    rating: 4,
    jersey: "England 2026 Home",
    text: "Great jersey, fast shipping. Quality is unmatched compared to what I've found on other sites. The England badge embroidery is so crisp. Would love more size options next time.",
    date: "Apr 2026",
  },
  {
    name: "Diego Hernández",
    location: "Buenos Aires, Argentina",
    avatar: "DH",
    rating: 5,
    jersey: "Real Madrid 2026 Home",
    text: "ANGKON is the only store I trust for authentic jerseys. I've ordered 6 times over the past 2 years and every single jersey has been perfect quality with fast delivery.",
    date: "Feb 2026",
  },
  {
    name: "Yuki Tanaka",
    location: "Tokyo, Japan",
    avatar: "YT",
    rating: 5,
    jersey: "Japan 2026 Home",
    text: "Surprisingly fast international shipping to Japan. The jersey looks and feels exactly like the photos. Very impressed with the packaging — it came wrapped like a gift.",
    date: "Mar 2026",
  },
];

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-rose-500",
  "bg-sky-500",
];

export function CustomerReviewsSection() {
  const overallRating = (REVIEWS.reduce((sum, r) => sum + r.rating, 0) / REVIEWS.length).toFixed(1);
  const fiveStarCount = REVIEWS.filter((r) => r.rating === 5).length;
  const fiveStarPct = Math.round((fiveStarCount / REVIEWS.length) * 100);

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <span className="mb-3 inline-block text-[11px] font-bold uppercase tracking-widest text-amber-500">
              Verified Reviews
            </span>
            <h2 className="text-2xl font-semibold tracking-tight text-black md:text-4xl">
              What Our Customers Say
            </h2>
            <p className="mt-2 text-sm text-black/50 md:text-base">
              Real reviews from real football fans across the globe
            </p>
          </div>

          {/* Rating summary card */}
          <div className="inline-flex items-center gap-5 rounded-2xl border border-[#eceff3] bg-[#f7f8fa] px-6 py-4 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
            <div className="text-center">
              <p className="font-['Bebas_Neue'] text-5xl leading-none tracking-wide text-black">{overallRating}</p>
              <div className="mt-1.5 flex items-center justify-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-black/40">out of 5</p>
            </div>

            <div className="h-14 w-px bg-black/8" />

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className="w-14 text-right text-[11px] text-black/45">5 stars</span>
                <div className="h-1.5 w-28 overflow-hidden rounded-full bg-black/8">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${fiveStarPct}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-black/70">{fiveStarPct}%</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-14 text-right text-[11px] text-black/45">4 stars</span>
                <div className="h-1.5 w-28 overflow-hidden rounded-full bg-black/8">
                  <div
                    className="h-full rounded-full bg-amber-300"
                    style={{ width: `${100 - fiveStarPct}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-black/70">{100 - fiveStarPct}%</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Review cards */}
        <div className="grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
          {REVIEWS.map((review, index) => (
            <motion.div
              key={review.name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.07 }}
              className="flex flex-col rounded-2xl border border-[#eceff3] bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)] transition duration-300 hover:shadow-[0_12px_32px_rgba(15,23,42,0.1)]"
            >
              <Quote className="mb-4 h-6 w-6 text-amber-400/50" />

              {/* Stars */}
              <div className="mb-3 flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < review.rating ? "fill-amber-400 text-amber-400" : "fill-transparent text-black/15"
                    }`}
                  />
                ))}
              </div>

              {/* Review text */}
              <p className="flex-1 text-sm leading-relaxed text-black/65">&ldquo;{review.text}&rdquo;</p>

              {/* Footer */}
              <div className="mt-5 flex items-center justify-between border-t border-black/6 pt-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                      AVATAR_COLORS[index % AVATAR_COLORS.length]
                    } text-[11px] font-bold text-white`}
                  >
                    {review.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-black">{review.name}</p>
                    <p className="text-[11px] text-black/40">{review.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-black/35">{review.date}</p>
                  <p className="mt-0.5 max-w-[96px] truncate text-[11px] font-semibold text-amber-600">
                    {review.jersey}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
