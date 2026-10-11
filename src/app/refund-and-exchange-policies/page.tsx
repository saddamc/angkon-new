import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MessageCircle, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Refund and Exchange Policy — ANGKON",
  description: "Official refund and exchange terms for local orders. Sizing exchanges, defect replacements, and 7-day refund timeline.",
};

export default function RefundAndExchangePoliciesPage() {
  const policyCards = [
    {
      title: "Trial Policy",
      image: "/policies/trial-policy.png",
      alt: "Trial Policy: Trials and partial delivery are not allowed",
    },
    {
      title: "Exchange Policy",
      image: "/policies/exchange-policy.png",
      alt: "Exchange Policy: Contact us within 48 hours of delivery and have it exchanged",
    },
    {
      title: "Refund Policy",
      image: "/policies/refund-policy.png",
      alt: "Refund Policy: Full refund within 7 working days",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-black">
      {/* ── Breadcrumb & Top Bar ── */}
      <div className="w-full border-b border-neutral-100 bg-[#fafafa] py-6 sm:py-8 px-4">
        <div className="max-w-[1100px] mx-auto">
          <nav className="text-xs text-neutral-500 mb-2 flex items-center gap-2">
            <Link href="/" className="hover:text-black transition">Home</Link>
            <span className="text-neutral-300">/</span>
            <Link href="/policies" className="hover:text-black transition">Policies</Link>
            <span className="text-neutral-300">/</span>
            <span className="text-black font-semibold">Refund and Exchange</span>
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-black">
                Refund and Exchange Policy
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-neutral-600">
                Applicable for local orders across all 64 districts in Bangladesh.
              </p>
            </div>
            <Link
              href="/policies"
              className="inline-flex items-center gap-1.5 self-start sm:self-auto text-xs font-bold text-neutral-700 hover:text-black border border-neutral-300 rounded-full px-4 py-2 bg-white hover:bg-neutral-50 transition shadow-sm"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Policies
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* ── 1. The 3 Authentic Policy Poster Banners ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {policyCards.map((card) => (
            <div
              key={card.title}
              className="overflow-hidden rounded-2xl border border-neutral-200/90 shadow-md bg-neutral-900 transition-all duration-300 hover:shadow-xl hover:scale-[1.015]"
            >
              <div className="relative w-full aspect-square bg-black">
                <Image
                  src={card.image}
                  alt={card.alt}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-contain"
                />
              </div>
            </div>
          ))}
        </div>

        {/* ── 2. Authentic Policy Text Details ── */}
        <div className="mt-14 max-w-[850px] space-y-10 text-neutral-800">
          {/* Section 1: Trial Policy */}
          <section className="border-b border-neutral-200 pb-8">
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-black tracking-tight mb-4">
              1. Trial Policy
            </h2>
            <ul className="space-y-2.5 text-sm sm:text-base text-neutral-700 list-disc list-inside">
              <li>
                Trials, try-ons, and partial deliveries are <strong className="text-black font-bold">not allowed</strong>.
              </li>
              <li>
                Customers must receive the <strong className="text-black font-bold">entire order</strong> at the time of delivery.
              </li>
              <li>
                This is because trials and partial deliveries create logistical problems for our delivery partners.
              </li>
              <li>
                If you require an <strong className="text-black font-bold">exchange or return</strong>, please contact us <strong className="text-black font-bold">within 48 hours</strong> of delivery.
              </li>
            </ul>
          </section>

          {/* Section 2: Exchange Policy */}
          <section className="border-b border-neutral-200 pb-8">
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-black tracking-tight mb-3">
              2. Exchange Policy
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 mb-4">
              You may request an exchange <strong className="text-black font-bold">within 48 hours of delivery</strong> in the following cases:
            </p>

            <h3 className="text-base sm:text-lg font-bold text-black mb-2">
              Eligible for Exchange
            </h3>
            <ul className="space-y-2 text-sm sm:text-base text-neutral-700 list-disc list-inside mb-5">
              <li>Size doesn&apos;t fit, <span className="text-neutral-500 font-semibold uppercase text-xs">OR</span></li>
              <li>Product has a defect <span className="text-neutral-500 text-xs italic">(rare, but we&apos;ve got you)</span></li>
            </ul>

            <h3 className="text-base sm:text-lg font-bold text-black mb-2">
              Conditions
            </h3>
            <ul className="space-y-2.5 text-sm sm:text-base text-neutral-700 list-disc list-inside">
              <li>
                The product <strong className="text-black font-bold">must not be used</strong> and must be in <strong className="text-black font-bold">fresh, unused condition</strong> with original tags.
              </li>
              <li>
                <strong className="text-black font-bold">Delivery charge for exchanges</strong> must be paid by the customer.
              </li>
              <li>
                If the exchange is required due to a <strong className="text-black font-bold">defect</strong> or if <strong className="text-black font-bold">we sent the wrong size</strong>, ANGKON will cover the delivery charge for the exchange.
              </li>
            </ul>
          </section>

          {/* Section 3: Refund Policy */}
          <section className="pb-4">
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-black tracking-tight mb-3">
              3. Refund Policy
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 mb-4">
              If you are dissatisfied with the quality, you may request a refund <strong className="text-black font-bold">within 48 hours of delivery</strong>.
            </p>

            <h3 className="text-base sm:text-lg font-bold text-black mb-2">
              Eligibility
            </h3>
            <ul className="space-y-2 text-sm sm:text-base text-neutral-700 list-disc list-inside mb-5">
              <li>
                Product must <strong className="text-black font-bold">not be used</strong> and must be in <strong className="text-black font-bold">fresh condition</strong>.
              </li>
            </ul>

            <h3 className="text-base sm:text-lg font-bold text-black mb-2">
              Refund Timeline
            </h3>
            <ul className="space-y-2.5 text-sm sm:text-base text-neutral-700 list-disc list-inside">
              <li>
                After your return is confirmed, ANGKON will issue a full refund <strong className="text-black font-bold">within 7 working days</strong>.
              </li>
              <li>
                Refunds will be processed using the <strong className="text-black font-bold">same payment method</strong> used during purchase (Card, bKash, Nagad, Bank).
              </li>
            </ul>
          </section>

          {/* ── Contact Concierge Card ── */}
          <div className="rounded-2xl border border-neutral-200 bg-[#fafafa] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ffd800] text-black">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-heading text-base sm:text-lg font-bold uppercase text-black">
                  Need to initiate an exchange?
                </h4>
                <p className="text-xs text-neutral-600">
                  Message our WhatsApp concierge with your Order ID and photo of product tag.
                </p>
              </div>
            </div>
            <a
              href="https://wa.me/8801338668899"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-black px-6 py-3 text-xs font-bold text-white hover:bg-neutral-800 transition shrink-0"
            >
              WhatsApp Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
