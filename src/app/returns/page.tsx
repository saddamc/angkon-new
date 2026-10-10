import type { Metadata } from "next";
import { RefreshCw, CheckCircle, AlertTriangle, MapPin, Phone } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "7-Day Exchange & Returns Policy — ANGKON",
  description: "Hassle-free 7-day size exchange and returns. Visit our showroom at HOUSE OF MODERN HERITAGE Niketan or request doorstep reverse delivery.",
};

export default function ReturnsPage() {
  return (
    <div className="min-h-screen bg-[#400604] text-[#E1B76F]">
      <div className="border-b border-[#5c0f0d] bg-[#2b0403] py-12 px-4 text-center">
        <div className="container mx-auto max-w-[900px]">
          <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#cbb18a]">
            Customer Assurance
          </span>
          <h1 className="mt-2 font-heading text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#E1B76F]">
            Exchange & Refund Policy
          </h1>
          <p className="mt-3 text-[14px] sm:text-[15px] text-[#cbb18a]">
            Shop with total confidence. We guarantee seamless exchanges within 7 days of delivery.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-[1000px] px-4 py-12 lg:px-8 space-y-8">
        {/* 3 Authentic Policy Poster Banners (Gorur Ghash parity) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border-2 border-[#5c0f0d] bg-[#2b0403] p-6 text-center shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="font-heading text-xl sm:text-2xl font-black uppercase tracking-tight text-[#fbdd02] mb-3">
                Trial Policy
              </h2>
              <div className="bg-[#400604] p-3 rounded-xl mb-4 border border-[#5c0f0d]">
                <p className="text-[12px] font-bold text-white uppercase">
                  Trials and partial delivery are not allowed.
                </p>
              </div>
              <p className="text-xs text-[#cbb18a] leading-relaxed">
                Trials create logistical issues for our delivery partners. Please receive the entire parcel and contact us within 48 hours for any sizing exchange.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-[#5c0f0d] bg-[#2b0403] p-6 text-center shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="font-heading text-xl sm:text-2xl font-black uppercase tracking-tight text-[#fbdd02] mb-3">
                Exchange Policy
              </h2>
              <div className="bg-[#400604] p-3 rounded-xl mb-4 border border-[#5c0f0d]">
                <p className="text-[12px] font-bold text-white uppercase">
                  Size doesn&apos;t fit or defect found?
                </p>
              </div>
              <p className="text-xs text-[#cbb18a] leading-relaxed">
                Contact us within 48 hours to 7 days of delivery and have it exchanged hassle-free at your doorstep or our Niketan showroom.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-[#5c0f0d] bg-[#2b0403] p-6 text-center shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="font-heading text-xl sm:text-2xl font-black uppercase tracking-tight text-[#fbdd02] mb-3">
                Refund Policy
              </h2>
              <div className="bg-[#400604] p-3 rounded-xl mb-4 border border-[#5c0f0d]">
                <p className="text-[12px] font-bold text-white uppercase">
                  Dissatisfied with the quality?
                </p>
              </div>
              <p className="text-xs text-[#cbb18a] leading-relaxed">
                Contact our helpline within 48 hours. We will issue a full refund within 7 working days via original payment method.
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-8 space-y-6">
          <h2 className="font-heading text-xl font-bold uppercase text-[#E1B76F]">
            How to Request an Exchange
          </h2>

          <div className="space-y-4 text-[14px] text-[#cbb18a] leading-relaxed">
            <p>
              1. <strong>Contact Support:</strong> Send us a message on WhatsApp at{" "}
              <a href="https://wa.me/8801338668899" className="text-[#E1B76F] font-bold underline">
                +880 1338-668899
              </a>{" "}
              with your order number, photo of the product tag, and the preferred replacement size.
            </p>
            <p>
              2. <strong>Doorstep Reverse Exchange:</strong> Our delivery partner will bring the new size directly to your doorstep and collect the previous item simultaneously.
            </p>
            <p>
              3. <strong>Showroom Walk-in:</strong> You can also bring the item directly to our physical experience center:
            </p>
            <div className="rounded-xl border border-[#5c0f0d] bg-[#400604] p-4 text-[13px] text-[#f5ebd8]">
              <strong className="block text-[#E1B76F] uppercase">HOUSE OF MODERN HERITAGE</strong>
              H-93, (Ground floor), Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-900/50 bg-[#2b0403] p-6 text-xs text-[#cbb18a] leading-relaxed flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-300 block mb-1">Non-Returnable Items:</strong>
            For hygiene and health protocols, innerwear, socks, and face masks cannot be returned or exchanged once the safety seal is broken.
          </div>
        </div>
      </div>
    </div>
  );
}
