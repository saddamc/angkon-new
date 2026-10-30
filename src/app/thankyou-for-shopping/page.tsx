import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, ShieldCheck, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Thank You for Shopping With Us — ANGKON",
  description: "Your order details and delivery timeline for nationwide Cash on Delivery dispatch.",
};

const DELIVERY_TIMES = [
  { area: "Dhaka", time: "1–2 Days", note: "Direct home delivery via express courier" },
  { area: "Chittagong City", time: "2–3 Days", note: "Standard courier service" },
  { area: "Dhaka Suburbs (Savar, Gazipur, Narayanganj)", time: "2–3 Days", note: "Sub-urban transit" },
  { area: "Outside Dhaka Home Delivery (All 64 Districts)", time: "3–4 Days", note: "Steadfast / RedX door-to-door" },
  { area: "Sundarban Courier Hub Pickup", time: "2–3 Days", note: "Collect from local branch" },
];

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-[#400604] text-white">
      {/* Header */}
      <div className="border-b border-[#5c0f0d] bg-[#2b0403] py-14 px-4 text-center">
        <div className="container mx-auto max-w-[800px]">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#E1B76F] text-[#400604] mb-4 shadow-xl">
            <CheckCircle2 className="h-10 w-10 stroke-[2.5]" />
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-white/70 block">
            Order Confirmation
          </span>
          <h1 className="mt-2 font-heading text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
            Thank You For Shopping With Us
          </h1>
          <p className="mt-3 text-sm sm:text-base text-white leading-relaxed">
            We appreciate your support of homegrown craftsmanship. Our fulfillment team is preparing your package.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-[1000px] px-4 py-12 lg:px-8 space-y-12">
        {/* Delivery Timings Section */}
        <div className="rounded-2xl border-2 border-[#5c0f0d] bg-[#2b0403] p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-3 border-b border-[#5c0f0d] pb-4 mb-6">
            <Clock className="h-6 w-6 text-white" />
            <h2 className="font-heading text-2xl font-black uppercase text-white">
              When Will I Get My Product?
            </h2>
          </div>

          <div className="space-y-3">
            {DELIVERY_TIMES.map((item) => (
              <div
                key={item.area}
                className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-[#5c0f0d] bg-[#400604] p-4 gap-2"
              >
                <div>
                  <h3 className="font-bold text-sm text-white">{item.area}</h3>
                  <p className="text-xs text-white/70">{item.note}</p>
                </div>
                <div className="rounded-lg bg-[#E1B76F] px-3.5 py-1 text-xs font-black uppercase text-[#400604] self-start sm:self-auto">
                  {item.time}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-white/70 border-t border-[#5c0f0d] pt-4 leading-relaxed">
            * Please note: Orders placed after 4:00 PM are processed on the subsequent working day. Public holidays and extreme transit circumstances may incur slight variations.
          </p>
        </div>

        {/* Our Policies Quick Links */}
        <div className="rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-3 border-b border-[#5c0f0d] pb-4 mb-6">
            <ShieldCheck className="h-6 w-6 text-white" />
            <h2 className="font-heading text-2xl font-black uppercase text-white">
              Our Policies
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/returns"
              className="rounded-xl border border-[#5c0f0d] bg-[#400604] p-4 hover:border-[#E1B76F] transition group"
            >
              <h3 className="font-bold text-sm text-white group-hover:text-white transition">
                Exchange Policy &rarr;
              </h3>
              <p className="text-xs text-white/70 mt-1">
                Hassle-free size and product exchanges within 7 calendar days.
              </p>
            </Link>

            <Link
              href="/returns"
              className="rounded-xl border border-[#5c0f0d] bg-[#400604] p-4 hover:border-[#E1B76F] transition group"
            >
              <h3 className="font-bold text-sm text-white group-hover:text-white transition">
                Trial at Doorstep &rarr;
              </h3>
              <p className="text-xs text-white/70 mt-1">
                Inspect fits directly in front of the delivery agent.
              </p>
            </Link>

            <Link
              href="/refund-and-exchange-policies"
              className="rounded-xl border border-[#5c0f0d] bg-[#400604] p-4 hover:border-[#E1B76F] transition group"
            >
              <h3 className="font-bold text-sm text-white group-hover:text-white transition">
                Refund Guidelines &rarr;
              </h3>
              <p className="text-xs text-white/70 mt-1">
                Transparent refunds issued via bKash, Nagad, or original payment.
              </p>
            </Link>
          </div>
        </div>

        {/* Showroom & Helpline */}
        <div className="rounded-2xl border-2 border-[#E1B76F]/40 bg-[#2b0403] p-6 sm:p-8 text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-white/70 block">
            Questions Regarding Your Order?
          </span>
          <h3 className="font-heading text-2xl font-black uppercase text-white">
            ANGKON Flagship Showroom
          </h3>
          <p className="text-sm text-white font-serif">
            H-93, (Ground floor), Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-white/70">
            <span>Hotline / WhatsApp: <strong className="text-white">+880 1338-668899</strong></span>
            <span>Email: <strong className="text-white">angkonofficial08@gmail.com</strong></span>
          </div>

          <div className="pt-4">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-xl bg-[#E1B76F] px-8 py-3 text-xs font-black uppercase text-[#400604] hover:bg-[#f3cb87] transition shadow-md"
            >
              Continue Shopping <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
