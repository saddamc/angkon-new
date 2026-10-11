import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Truck, Clock, ShieldCheck, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Delivery Timing — ANGKON",
  description: "Estimated delivery timelines for Cash on Delivery (COD) orders across Dhaka and all 64 districts in Bangladesh.",
};

export default function DeliveryTimePage() {
  const deliveryEstimates = [
    { area: "Dhaka Metro", time: "1 - 2 Days", fee: "৳60" },
    { area: "Gazipur, Narayanganj, Savar", time: "1 - 2 Days", fee: "৳100" },
    { area: "Chittagong, Sylhet, Rajshahi", time: "3 - 4 Days", fee: "৳100" },
    { area: "Other Major Cities (All 64 Districts)", time: "4 - 5 Days", fee: "৳100" },
  ];

  return (
    <div className="min-h-screen bg-white text-black">
      {/* ── Breadcrumb & Top Bar ── */}
      <div className="w-full border-b border-neutral-100 bg-[#fafafa] py-6 sm:py-8 px-4">
        <div className="max-w-[1000px] mx-auto">
          <nav className="text-xs text-neutral-500 mb-2 flex items-center gap-2">
            <Link href="/" className="hover:text-black transition">Home</Link>
            <span className="text-neutral-300">/</span>
            <Link href="/policies" className="hover:text-black transition">Policies</Link>
            <span className="text-neutral-300">/</span>
            <span className="text-black font-semibold">Delivery Timing</span>
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-black">
                Delivery Timing for COD
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-neutral-600">
                Nationwide Cash on Delivery timelines and shipping details.
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

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* ── 1. Authentic Delivery Timing Poster Graphic ── */}
        <div className="max-w-[720px] mx-auto overflow-hidden rounded-2xl shadow-xl border border-neutral-200/80 bg-[#ffd800]">
          <div className="relative w-full aspect-square">
            <Image
              src="/policies/delivery-time-table.png"
              alt="Delivery Timing for Cash on Delivery (COD) - Dhaka 1-2 Days, Gazipur Narayanganj Savar 1-2 Days, Chittagong Sylhet Rajshahi 3-4 Days, Other Major Cities 4-5 Days"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 720px"
              className="object-contain"
            />
          </div>
        </div>

        {/* ── 2. Modern Structured Breakdown ── */}
        <div className="mt-12 max-w-[850px] mx-auto">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffd800] text-black">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-heading text-lg sm:text-xl font-bold uppercase text-black">
                  Detailed Delivery Schedule
                </h2>
                <p className="text-xs text-neutral-500">
                  Timings are estimated after parcel dispatch
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Destination Area</th>
                    <th className="py-3 px-4">Estimated Transit</th>
                    <th className="py-3 px-4 text-right">Standard Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium">
                  {deliveryEstimates.map((row) => (
                    <tr key={row.area} className="hover:bg-neutral-50/70 transition">
                      <td className="py-3.5 px-4 text-black font-semibold">{row.area}</td>
                      <td className="py-3.5 px-4 text-neutral-700 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-neutral-400" />
                        {row.time}
                      </td>
                      <td className="py-3.5 px-4 text-right text-black font-bold">{row.fee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Free Delivery Banner */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl bg-[#ffd800]/20 border border-[#ffd800] p-4 text-xs">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-black shrink-0" />
                <span className="text-black font-bold">
                  Orders over ৳3,000 qualify for FREE delivery across Bangladesh!
                </span>
              </div>
              <Link
                href="/products"
                className="font-bold text-black underline underline-offset-4 hover:opacity-80 shrink-0"
              >
                Shop Now &rarr;
              </Link>
            </div>
          </div>

          {/* Key Guidelines */}
          <div className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 sm:p-8 space-y-3 text-xs sm:text-sm text-neutral-700">
            <h3 className="font-heading text-base font-bold uppercase text-black mb-2">
              Important Delivery Notes
            </h3>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Mentioned timings are estimated business days after your package has been confirmed and dispatched.</span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>ANGKON works with reliable 3rd-party express courier networks (Steadfast, Pathao, RedX).</span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Deliveries may experience slight delays during national holidays or adverse weather conditions.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
