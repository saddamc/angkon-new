"use client";

import { motion } from "framer-motion";
import { Shield, Truck, RotateCcw, Star, Lock, Headphones } from "lucide-react";

const FEATURES = [
  {
    icon: Shield,
    title: "100% Authentic",
    description:
      "Every jersey is officially licensed and sourced directly from authorized league distributors worldwide.",
    color: "text-blue-500",
    bg: "bg-blue-50",
    border: "group-hover:border-blue-200",
  },
  {
    icon: Truck,
    title: "Fast Worldwide Shipping",
    description:
      "Express delivery to 50+ countries. Orders confirmed before 2 PM are dispatched the same working day.",
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    border: "group-hover:border-emerald-200",
  },
  {
    icon: RotateCcw,
    title: "30-Day Easy Returns",
    description:
      "Changed your mind or wrong size? No problem. Free, hassle-free returns within 30 days of purchase.",
    color: "text-amber-500",
    bg: "bg-amber-50",
    border: "group-hover:border-amber-200",
  },
  {
    icon: Star,
    title: "Match-Grade Quality",
    description:
      "Moisture-wicking, breathable fabrics identical to those worn on the pitch by professional players.",
    color: "text-purple-500",
    bg: "bg-purple-50",
    border: "group-hover:border-purple-200",
  },
  {
    icon: Lock,
    title: "Secure Checkout",
    description:
      "Your payment details are protected with bank-grade 256-bit SSL encryption on every transaction.",
    color: "text-rose-500",
    bg: "bg-rose-50",
    border: "group-hover:border-rose-200",
  },
  {
    icon: Headphones,
    title: "24/7 Expert Support",
    description:
      "Our team of football fans is always ready to help you find the perfect kit, size, or customisation.",
    color: "text-sky-500",
    bg: "bg-sky-50",
    border: "group-hover:border-sky-200",
  },
];

export function WhyChooseUsSection() {
  return (
    <section className="bg-[#f7f8fa] py-16 md:py-24">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center md:mb-16"
        >
          <span className="mb-3 inline-block text-[11px] font-bold uppercase tracking-widest text-amber-500">
            Why ANGKON
          </span>
          <h2 className="text-2xl font-semibold tracking-tight text-black md:text-4xl">
            Built for Football Fans
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-black/50 md:text-base">
            We&apos;re not just a store — we&apos;re fans who live and breathe the game. Every decision we make is
            built around giving you the best jersey experience possible.
          </p>
        </motion.div>

        {/* Feature cards */}
        <div className="grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className={`group rounded-2xl border border-[#eceff3] bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(15,23,42,0.11)] ${feature.border}`}
            >
              <div
                className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.bg} transition duration-300 group-hover:scale-110`}
              >
                <feature.icon className={`h-5 w-5 ${feature.color}`} />
              </div>
              <h3 className="mb-2 text-[15px] font-semibold text-black md:text-base">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-black/55">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
