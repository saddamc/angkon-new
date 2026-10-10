import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Truck, RefreshCw, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Store Policies — ANGKON",
  description: "Comprehensive guide to ANGKON store policies: shipping, exchange, privacy, and terms of service.",
};

export default function PoliciesPage() {
  const policies = [
    {
      title: "Delivery & Shipping Policy",
      description: "Nationwide COD in all 64 districts. Inside Dhaka ৳70 (2-3 days), Outside Dhaka ৳130 (3-5 days). Free over ৳3,000.",
      href: "/shipping",
      icon: Truck,
    },
    {
      title: "7-Day Exchange & Returns",
      description: "Hassle-free size exchanges within 7 calendar days. Doorstep pickup or in-person showroom exchange.",
      href: "/returns",
      icon: RefreshCw,
    },
    {
      title: "Terms & Conditions",
      description: "Transparent conditions governing purchases, payments, warranties, and platform usage.",
      href: "/terms",
      icon: FileText,
    },
    {
      title: "Privacy Policy",
      description: "Our strict protocol on protecting your delivery information and contact privacy.",
      href: "/privacy",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="min-h-screen bg-[#400604] text-[#E1B76F]">
      <div className="border-b border-[#5c0f0d] bg-[#2b0403] py-12 px-4 text-center">
        <div className="container mx-auto max-w-[800px]">
          <h1 className="font-heading text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#E1B76F]">
            Store Policies
          </h1>
          <p className="mt-2 text-[14px] text-[#cbb18a]">
            Everything you need to know about shopping with ANGKON — House of Modern Heritage.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-[1000px] px-4 py-12 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {policies.map((p) => {
            const Icon = p.icon;
            return (
              <Link
                key={p.title}
                href={p.href}
                className="group rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-8 shadow-lg hover:border-[#E1B76F] hover:bg-[#4a0705] transition"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#400604] border border-[#5c0f0d] text-[#E1B76F] group-hover:bg-[#E1B76F] group-hover:text-[#400604] transition">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="font-heading text-xl font-bold uppercase text-[#E1B76F] group-hover:text-white transition">
                    {p.title}
                  </h2>
                </div>
                <p className="text-[14px] text-[#cbb18a] leading-relaxed mb-4">
                  {p.description}
                </p>
                <span className="text-[13px] font-bold text-[#E1B76F] group-hover:text-white underline underline-offset-4">
                  Read policy details &rarr;
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
