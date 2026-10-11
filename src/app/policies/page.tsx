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
    <div className="min-h-screen bg-white text-black">
      {/* ── Breadcrumb & Page Header ── */}
      <div className="w-full border-b border-neutral-100 bg-[#fafafa] py-6 sm:py-8 px-4">
        <div className="max-w-[1100px] mx-auto">
          <nav className="text-xs text-neutral-500 mb-2">
            <Link href="/" className="hover:text-black transition">Home</Link>
            <span className="mx-2 text-neutral-300">/</span>
            <span className="text-black font-semibold">Policies</span>
          </nav>
          <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-black">
            Policies
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-neutral-600">
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
            className="group relative block w-full overflow-hidden rounded-xl sm:rounded-2xl border border-neutral-200/90 shadow-sm transition-all duration-300 hover:shadow-xl hover:scale-[1.01] hover:border-black/30"
          >
            <div className="relative w-full aspect-[1920/250] bg-[#ffd800] overflow-hidden">
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
        <div className="mt-12 pt-8 border-t border-neutral-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 border border-neutral-100">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffd800] text-black">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-black">All 64 Districts</h3>
              <p className="text-[11px] text-neutral-600">Doorstep Cash on Delivery nationwide</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 border border-neutral-100">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffd800] text-black">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-black">WhatsApp Helpdesk</h3>
              <p className="text-[11px] text-neutral-600">+880 1338-668899 (Daily 10am - 10pm)</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 border border-neutral-100">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffd800] text-black">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-black">Flagship Showroom</h3>
              <p className="text-[11px] text-neutral-600">Niketan, Gulshan, Dhaka</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
