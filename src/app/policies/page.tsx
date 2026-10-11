import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle, MapPin, Truck } from "lucide-react";

export const metadata: Metadata = {
  title: "Policies — ANGKON",
  description: "Official store policies for ANGKON: Delivery timing, refund and exchange policy, and privacy policy.",
};

export default function PoliciesPage() {
  const policyLinks = [
    {
      title: "Delivery Timing",
      href: "/delivery-time",
      image: "/policies/delivery-timing-btn.png",
      alt: "Delivery Timing for COD Orders",
    },
    {
      title: "Refund and Exchange Policy",
      href: "/refund-and-exchange-policies",
      image: "/policies/refund-policy-btn.png",
      alt: "Refund and Exchange Policy (For local orders)",
    },
    {
      title: "Privacy Policy",
      href: "/privacy-policy",
      image: "/policies/privacy-policy-btn.png",
      alt: "Privacy Policy",
    },
  ];

  return (
    <div className="min-h-screen bg-[#400604] text-white">
      {/* ── Breadcrumb & Page Header ── */}
      <div className="w-full border-b border-[#E1B76F]/20 bg-[#340402] py-6 sm:py-8 px-4">
        <div className="max-w-[1100px] mx-auto">
          <nav className="text-xs text-white/70 mb-2">
            <Link href="/" className="hover:text-[#E1B76F] transition">Home</Link>
            <span className="mx-2 text-white/40">/</span>
            <span className="text-white font-semibold">Policies</span>
          </nav>
          <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
            Policies
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-white/90">
            Please choose a policy below to read all guidelines and conditions.
          </p>
        </div>
      </div>

      {/* ── 3 Policy Banner Option Buttons ── */}
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-4 sm:space-y-6">
        {policyLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group relative block w-full overflow-hidden rounded-xl sm:rounded-2xl border border-[#E1B76F]/25 shadow-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.01] hover:border-[#E1B76F]/50"
          >
            <div className="relative w-full aspect-[1920/250] bg-[#340402] overflow-hidden">
              <Image
                src={item.image}
                alt={item.alt}
                fill
                priority
                sizes="(max-width: 1100px) 100vw, 1100px"
                className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.015]"
              />
            </div>
          </Link>
        ))}

        {/* ── Helpful Support Strip ── */}
        <div className="mt-12 pt-8 border-t border-[#E1B76F]/20 grid grid-cols-1 md:grid-cols-3 gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-[#340402] border border-[#E1B76F]/20">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E1B76F] text-[#400604]">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-white">All 64 Districts</h3>
              <p className="text-[11px] text-white/90">Doorstep Cash on Delivery nationwide</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-[#340402] border border-[#E1B76F]/20">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E1B76F] text-[#400604]">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-white">WhatsApp Helpdesk</h3>
              <p className="text-[11px] text-white/90">+880 1338-668899 (Daily 10am - 10pm)</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-[#340402] border border-[#E1B76F]/20">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E1B76F] text-[#400604]">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-white">Flagship Showroom</h3>
              <p className="text-[11px] text-white/90">Niketan, Gulshan, Dhaka</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
