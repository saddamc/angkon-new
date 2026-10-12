import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageCircle, AlertTriangle, RefreshCw, RotateCcw, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Refund and Exchange Policy — ANGKON",
  description: "Official refund and exchange terms for local orders. Sizing exchanges, defect replacements, and 7-day refund timeline.",
};

export default function RefundAndExchangePoliciesPage() {
  const policyHighlights = [
    {
      title: "Trial Policy",
      subtitle: "No Try-Ons Before Payment",
      icon: AlertTriangle,
      badge: "Delivery Notice",
      tagColor: "bg-amber-500/20 text-[#E1B76F] border-amber-500/30",
      bullets: [
        "Trials and partial delivery are strictly not allowed.",
        "Parcels must be received in full upon courier arrival.",
        "To protect parcel safety and courier logistics.",
        "Sizing issues can be exchanged within 48 hours.",
      ],
      highlight: "48-Hour Exchange Window",
    },
    {
      title: "Exchange Policy",
      subtitle: "Size Adjustments & Defects",
      icon: RefreshCw,
      badge: "Sizing Guarantee",
      tagColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      bullets: [
        "Eligible if size doesn't fit or defect is found.",
        "Contact ANGKON support within 48 hours of delivery.",
        "Apparel must remain unworn with original tags attached.",
        "Free exchange delivery if defect or incorrect item sent.",
      ],
      highlight: "Free Shipping on Defects",
    },
    {
      title: "Refund Policy",
      subtitle: "Full Return within 7 Days",
      icon: RotateCcw,
      badge: "Quality Assurance",
      tagColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      bullets: [
        "Dissatisfied with quality? We've got you covered.",
        "Notify support within 48 hours of receiving delivery.",
        "Full refund processed within 7 working business days.",
        "Refunded directly to original payment method.",
      ],
      highlight: "7 Working Days Refund",
    },
  ];

  return (
    <div className="min-h-screen bg-[#400604] text-white">
      {/* ── Breadcrumb & Top Bar ── */}
      <div className="w-full border-b border-[#E1B76F]/20 bg-[#340402] py-6 sm:py-8 px-4">
        <div className="max-w-[1100px] mx-auto">
          <nav className="text-xs text-white/70 mb-2 flex items-center gap-2">
            <Link href="/" className="hover:text-[#E1B76F] transition">Home</Link>
            <span className="text-white/40">/</span>
            <Link href="/policies" className="hover:text-[#E1B76F] transition">Policies</Link>
            <span className="text-white/40">/</span>
            <span className="text-white font-semibold">Refund and Exchange</span>
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
                Refund and Exchange Policy
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-white/90">
                Applicable for local orders across all 64 districts in Bangladesh.
              </p>
            </div>
            <Link
              href="/policies"
              className="inline-flex items-center gap-1.5 self-start sm:self-auto text-xs font-bold text-white hover:text-[#400604] border border-[#E1B76F]/40 rounded-full px-4 py-2 bg-[#400604] hover:bg-[#E1B76F] transition shadow-sm"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Policies
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* ── 1. Luxury ANGKON Policy Summary Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {policyHighlights.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="flex flex-col justify-between rounded-2xl border border-[#E1B76F]/30 bg-[#340402] p-6 sm:p-7 shadow-lg transition-all duration-300 hover:border-[#E1B76F]/70 hover:shadow-2xl hover:scale-[1.015]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E1B76F]/10 border border-[#E1B76F]/30 text-[#E1B76F]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span
                      className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${card.tagColor}`}
                    >
                      {card.badge}
                    </span>
                  </div>

                  <h3 className="font-heading text-xl sm:text-2xl font-black uppercase text-white tracking-tight">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#E1B76F]">
                    {card.subtitle}
                  </p>

                  <ul className="mt-5 space-y-2.5 text-xs sm:text-[13px] text-white/85">
                    {card.bullets.map((b, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#E1B76F] shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E1B76F]/15">
                  <div className="rounded-xl bg-[#2b0403] border border-[#E1B76F]/20 px-3.5 py-2 text-center text-xs font-bold text-[#E1B76F]">
                    ★ {card.highlight}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── 2. Authentic Policy Text Details ── */}
        <div className="mt-14 max-w-[850px] space-y-10 text-white/90">
          {/* Section 1: Trial Policy */}
          <section className="border-b border-[#E1B76F]/20 pb-8">
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-white tracking-tight mb-4">
              1. Trial Policy
            </h2>
            <ul className="space-y-2.5 text-sm sm:text-base text-white/90 list-disc list-inside">
              <li>
                Trials, try-ons, and partial deliveries are <strong className="text-white font-bold">not allowed</strong>.
              </li>
              <li>
                Customers must receive the <strong className="text-white font-bold">entire order</strong> at the time of delivery.
              </li>
              <li>
                This is because trials and partial deliveries create logistical problems for our delivery partners.
              </li>
              <li>
                If you require an <strong className="text-white font-bold">exchange or return</strong>, please contact us <strong className="text-white font-bold">within 48 hours</strong> of delivery.
              </li>
            </ul>
          </section>

          {/* Section 2: Exchange Policy */}
          <section className="border-b border-[#E1B76F]/20 pb-8">
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
              2. Exchange Policy
            </h2>
            <p className="text-sm sm:text-base text-white/90 mb-4">
              You may request an exchange <strong className="text-white font-bold">within 48 hours of delivery</strong> in the following cases:
            </p>

            <h3 className="text-base sm:text-lg font-bold text-white mb-2">
              Eligible for Exchange
            </h3>
            <ul className="space-y-2 text-sm sm:text-base text-white/90 list-disc list-inside mb-5">
              <li>Size doesn&apos;t fit, <span className="text-white/70 font-semibold uppercase text-xs">OR</span></li>
              <li>Product has a defect <span className="text-white/70 text-xs italic">(rare, but we&apos;ve got you)</span></li>
            </ul>

            <h3 className="text-base sm:text-lg font-bold text-white mb-2">
              Conditions
            </h3>
            <ul className="space-y-2.5 text-sm sm:text-base text-white/90 list-disc list-inside">
              <li>
                The product <strong className="text-white font-bold">must not be used</strong> and must be in <strong className="text-white font-bold">fresh, unused condition</strong> with original tags.
              </li>
              <li>
                <strong className="text-white font-bold">Delivery charge for exchanges</strong> must be paid by the customer.
              </li>
              <li>
                If the exchange is required due to a <strong className="text-white font-bold">defect</strong> or if <strong className="text-white font-bold">we sent the wrong size</strong>, ANGKON will cover the delivery charge for the exchange.
              </li>
            </ul>
          </section>

          {/* Section 3: Refund Policy */}
          <section className="pb-4">
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
              3. Refund Policy
            </h2>
            <p className="text-sm sm:text-base text-white/90 mb-4">
              If you are dissatisfied with the quality, you may request a refund <strong className="text-white font-bold">within 48 hours of delivery</strong>.
            </p>

            <h3 className="text-base sm:text-lg font-bold text-white mb-2">
              Eligibility
            </h3>
            <ul className="space-y-2 text-sm sm:text-base text-white/90 list-disc list-inside mb-5">
              <li>
                Product must <strong className="text-white font-bold">not be used</strong> and must be in <strong className="text-white font-bold">fresh condition</strong>.
              </li>
            </ul>

            <h3 className="text-base sm:text-lg font-bold text-white mb-2">
              Refund Timeline
            </h3>
            <ul className="space-y-2.5 text-sm sm:text-base text-white/90 list-disc list-inside">
              <li>
                After your return is confirmed, ANGKON will issue a full refund <strong className="text-white font-bold">within 7 working days</strong>.
              </li>
              <li>
                Refunds will be processed using the <strong className="text-white font-bold">same payment method</strong> used during purchase (Card, bKash, Nagad, Bank).
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
                <h4 className="font-heading text-base sm:text-lg font-bold uppercase text-white">
                  Need to initiate an exchange?
                </h4>
                <p className="text-xs text-white/90">
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
