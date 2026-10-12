import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, MapPin, Truck, RotateCcw, ShieldCheck, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Policies — ANGKON",
  description: "Official store policies for ANGKON: Delivery timing, refund and exchange policy, and privacy policy.",
};

export default function PoliciesPage() {
  const policyLinks = [
    {
      title: "Delivery Timing",
      subtitle: "Standard delivery timelines across all 64 districts in Bangladesh",
      href: "/delivery-time",
      icon: Truck,
      badge: "2-5 Days Nationwide",
    },
    {
      title: "Refund and Exchange Policy",
      subtitle: "Terms for local orders · 48-hour exchange window & defect coverage",
      href: "/refund-and-exchange-policies",
      icon: RotateCcw,
      badge: "7-Day Refund SLA",
    },
    {
      title: "Privacy Policy",
      subtitle: "How personal data, transaction security, and SSL encryption are protected",
      href: "/privacy-policy",
      icon: ShieldCheck,
      badge: "100% Secure & Encrypted",
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

      {/* ── 3 Luxury Policy Banner Option Cards ── */}
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-4 sm:space-y-5">
        {policyLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[#E1B76F]/25 bg-gradient-to-r from-[#340402] via-[#3a0604] to-[#2b0403] p-6 sm:p-7 shadow-lg transition-all duration-300 hover:border-[#E1B76F]/70 hover:shadow-2xl hover:scale-[1.01]"
            >
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-[#E1B76F]/10 border border-[#E1B76F]/30 text-[#E1B76F] group-hover:bg-[#E1B76F] group-hover:text-[#400604] transition-colors duration-300">
                  <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#E1B76F] bg-[#E1B76F]/10 px-2.5 py-0.5 rounded-full border border-[#E1B76F]/20">
                      {item.badge}
                    </span>
                  </div>
                  <h2 className="font-heading text-xl sm:text-2xl font-black uppercase text-white tracking-tight group-hover:text-[#E1B76F] transition-colors">
                    {item.title}
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-white/80">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-bold uppercase tracking-wider text-[#E1B76F] shrink-0 pt-2 sm:pt-0">
                <span>View Guidelines</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
              </div>
            </Link>
          );
        })}

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
