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
    <div className="min-h-screen bg-[#400604] text-[#E1B76F]">
      {/* ── Breadcrumb & Top Bar ── */}
      <div className="w-full border-b border-[#E1B76F]/20 bg-[#340402] py-6 sm:py-8 px-4">
        <div className="max-w-[1100px] mx-auto">
          <nav className="text-xs text-[#E1B76F]/70 mb-2 flex items-center gap-2">
            <Link href="/" className="hover:text-[#E1B76F] transition">Home</Link>
            <span className="text-[#E1B76F]/40">/</span>
            <Link href="/policies" className="hover:text-[#E1B76F] transition">Policies</Link>
            <span className="text-[#E1B76F]/40">/</span>
            <span className="text-[#E1B76F] font-semibold">Refund and Exchange</span>
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-[#E1B76F]">
                Refund and Exchange Policy
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-[#f0d29d]">
                Applicable for local orders across all 64 districts in Bangladesh.
              </p>
            </div>
            <Link
              href="/policies"
              className="inline-flex items-center gap-1.5 self-start sm:self-auto text-xs font-bold text-[#E1B76F] hover:text-[#400604] border border-[#E1B76F]/40 rounded-full px-4 py-2 bg-[#400604] hover:bg-[#E1B76F] transition shadow-sm"
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
              className="overflow-hidden rounded-2xl border border-[#E1B76F]/30 shadow-md bg-[#340402] transition-all duration-300 hover:shadow-xl hover:scale-[1.015] hover:border-[#E1B76F]/60"
            >
              <div className="relative w-full aspect-square bg-[#2b0403]">
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
        <div className="mt-14 max-w-[850px] space-y-10 text-[#f0d29d]">
          {/* Section 1: Trial Policy */}
          <section className="border-b border-[#E1B76F]/20 pb-8">
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-[#E1B76F] tracking-tight mb-4">
              1. Trial Policy
            </h2>
            <ul className="space-y-2.5 text-sm sm:text-base text-[#f0d29d] list-disc list-inside">
              <li>
                Trials, try-ons, and partial deliveries are <strong className="text-[#E1B76F] font-bold">not allowed</strong>.
              </li>
              <li>
                Customers must receive the <strong className="text-[#E1B76F] font-bold">entire order</strong> at the time of delivery.
              </li>
              <li>
                This is because trials and partial deliveries create logistical problems for our delivery partners.
              </li>
              <li>
                If you require an <strong className="text-[#E1B76F] font-bold">exchange or return</strong>, please contact us <strong className="text-[#E1B76F] font-bold">within 48 hours</strong> of delivery.
              </li>
            </ul>
          </section>

          {/* Section 2: Exchange Policy */}
          <section className="border-b border-[#E1B76F]/20 pb-8">
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-[#E1B76F] tracking-tight mb-3">
              2. Exchange Policy
            </h2>
            <p className="text-sm sm:text-base text-[#f0d29d] mb-4">
              You may request an exchange <strong className="text-[#E1B76F] font-bold">within 48 hours of delivery</strong> in the following cases:
            </p>

            <h3 className="text-base sm:text-lg font-bold text-[#E1B76F] mb-2">
              Eligible for Exchange
            </h3>
            <ul className="space-y-2 text-sm sm:text-base text-[#f0d29d] list-disc list-inside mb-5">
              <li>Size doesn&apos;t fit, <span className="text-[#E1B76F]/70 font-semibold uppercase text-xs">OR</span></li>
              <li>Product has a defect <span className="text-[#E1B76F]/70 text-xs italic">(rare, but we&apos;ve got you)</span></li>
            </ul>

            <h3 className="text-base sm:text-lg font-bold text-[#E1B76F] mb-2">
              Conditions
            </h3>
            <ul className="space-y-2.5 text-sm sm:text-base text-[#f0d29d] list-disc list-inside">
              <li>
                The product <strong className="text-[#E1B76F] font-bold">must not be used</strong> and must be in <strong className="text-[#E1B76F] font-bold">fresh, unused condition</strong> with original tags.
              </li>
              <li>
                <strong className="text-[#E1B76F] font-bold">Delivery charge for exchanges</strong> must be paid by the customer.
              </li>
              <li>
                If the exchange is required due to a <strong className="text-[#E1B76F] font-bold">defect</strong> or if <strong className="text-[#E1B76F] font-bold">we sent the wrong size</strong>, ANGKON will cover the delivery charge for the exchange.
              </li>
            </ul>
          </section>

          {/* Section 3: Refund Policy */}
          <section className="pb-4">
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-[#E1B76F] tracking-tight mb-3">
              3. Refund Policy
            </h2>
            <p className="text-sm sm:text-base text-[#f0d29d] mb-4">
              If you are dissatisfied with the quality, you may request a refund <strong className="text-[#E1B76F] font-bold">within 48 hours of delivery</strong>.
            </p>

            <h3 className="text-base sm:text-lg font-bold text-[#E1B76F] mb-2">
              Eligibility
            </h3>
            <ul className="space-y-2 text-sm sm:text-base text-[#f0d29d] list-disc list-inside mb-5">
              <li>
                Product must <strong className="text-[#E1B76F] font-bold">not be used</strong> and must be in <strong className="text-[#E1B76F] font-bold">fresh condition</strong>.
              </li>
            </ul>

            <h3 className="text-base sm:text-lg font-bold text-[#E1B76F] mb-2">
              Refund Timeline
            </h3>
            <ul className="space-y-2.5 text-sm sm:text-base text-[#f0d29d] list-disc list-inside">
              <li>
                After your return is confirmed, ANGKON will issue a full refund <strong className="text-[#E1B76F] font-bold">within 7 working days</strong>.
              </li>
              <li>
                Refunds will be processed using the <strong className="text-[#E1B76F] font-bold">same payment method</strong> used during purchase (Card, bKash, Nagad, Bank).
              </li>
            </ul>
          </section>

          {/* ── Contact Concierge Card ── */}
          <div className="rounded-2xl border border-[#E1B76F]/30 bg-[#340402] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E1B76F] text-[#400604]">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-heading text-base sm:text-lg font-bold uppercase text-[#E1B76F]">
                  Need to initiate an exchange?
                </h4>
                <p className="text-xs text-[#f0d29d]">
                  Message our WhatsApp concierge with your Order ID and photo of product tag.
                </p>
              </div>
            </div>
            <a
              href="https://wa.me/8801338668899"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-[#E1B76F] px-6 py-3 text-xs font-black uppercase text-[#400604] hover:bg-[#f3cb87] transition shrink-0"
            >
              WhatsApp Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
