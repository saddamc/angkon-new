import type { Metadata } from "next";
import { Truck, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Delivery Time & Shipping Policy — ANGKON",
  description: "Nationwide Cash on Delivery in all 64 districts. Inside Dhaka 2-3 days, Outside Dhaka 3-5 days. Free delivery over ৳3,000.",
};

export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-[#400604] text-[#E1B76F]">
      <div className="border-b border-[#5c0f0d] bg-[#2b0403] py-12 px-4 text-center">
        <div className="container mx-auto max-w-[900px]">
          <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#cbb18a]">
            Nationwide Logistics
          </span>
          <h1 className="mt-2 font-heading text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#E1B76F]">
            Shipping & Delivery Policy
          </h1>
          <p className="mt-3 text-[14px] sm:text-[15px] text-[#cbb18a]">
            Fast, secure fulfillment with Cash on Delivery across all 64 districts of Bangladesh.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-[1000px] px-4 py-12 lg:px-8 space-y-8">
        {/* Authentic Yellow Delivery Timing Poster Card (Gorur Ghash parity) */}
        <div className="rounded-[16px] bg-[#fbdd02] text-black p-6 sm:p-10 shadow-2xl">
          <h2 className="font-heading text-2xl sm:text-4xl lg:text-5xl font-black italic tracking-tight text-center uppercase mb-8">
            Delivery Timing for COD
          </h2>
          
          <div className="max-w-2xl mx-auto border-2 border-black rounded-xl overflow-hidden bg-white/20">
            <div className="grid grid-cols-2 border-b-2 border-black bg-black text-white p-3 sm:p-4 text-center">
              <span className="font-heading text-lg sm:text-2xl font-black italic uppercase">Area</span>
              <span className="font-heading text-lg sm:text-2xl font-black italic uppercase">Time Needed</span>
            </div>
            
            <div className="divide-y-2 divide-black/30 text-center font-heading text-lg sm:text-2xl font-black italic">
              <div className="grid grid-cols-2 p-3 sm:p-4 bg-white/30">
                <span>Dhaka</span>
                <span>1-2 Days</span>
              </div>
              <div className="grid grid-cols-2 p-3 sm:p-4 bg-white/10">
                <span>Gazipur, Narayanganj, Savar</span>
                <span>1-2 Days</span>
              </div>
              <div className="grid grid-cols-2 p-3 sm:p-4 bg-white/30">
                <span>Chittagong, Sylhet, Rajshahi</span>
                <span>3-4 Days</span>
              </div>
              <div className="grid grid-cols-2 p-3 sm:p-4 bg-white/10">
                <span>Other Major Cities</span>
                <span>4-5 Days</span>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-black/80 space-y-1">
            <p>*Mentioned timings are estimated time for delivery after package has been dispatched</p>
            <p>*ANGKON works with reliable 3rd party delivery couriers</p>
          </div>
        </div>
        {/* Shipping Rates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#400604] text-[#E1B76F] border border-[#5c0f0d]">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-[#E1B76F]">Inside Dhaka City</h3>
                <span className="text-xs text-[#cbb18a]">Home Delivery</span>
              </div>
            </div>
            <div className="space-y-2 text-[14px] text-[#f5ebd8]">
              <p><strong>Fee:</strong> ৳70 Flat Rate</p>
              <p><strong>Timeline:</strong> 2 to 3 Business Days</p>
              <p><strong>Coverage:</strong> All postal zones within Dhaka Metro</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#400604] text-[#E1B76F] border border-[#5c0f0d]">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-[#E1B76F]">Outside Dhaka (All 64 Districts)</h3>
                <span className="text-xs text-[#cbb18a]">Nationwide Courier</span>
              </div>
            </div>
            <div className="space-y-2 text-[14px] text-[#f5ebd8]">
              <p><strong>Fee:</strong> ৳130 Flat Rate</p>
              <p><strong>Timeline:</strong> 3 to 5 Business Days</p>
              <p><strong>Coverage:</strong> All divisional and district headquarters</p>
            </div>
          </div>
        </div>

        {/* Free Shipping Alert */}
        <div className="rounded-2xl border-2 border-[#E1B76F] bg-[#2b0403] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-[#E1B76F] shrink-0" />
            <div>
              <h4 className="font-heading text-lg font-black uppercase text-[#E1B76F]">
                Free Delivery Over ৳3,000
              </h4>
              <p className="text-xs text-[#cbb18a]">
                Add items worth ৳3,000 or more to your cart to enjoy free shipping everywhere in Bangladesh!
              </p>
            </div>
          </div>
          <Link
            href="/products"
            className="inline-flex rounded-xl bg-[#E1B76F] px-5 py-2.5 text-xs font-black uppercase text-[#400604] hover:bg-[#f3cb87] transition shrink-0"
          >
            Start Shopping
          </Link>
        </div>

        {/* Instructions */}
        <div className="rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-8 space-y-6">
          <h3 className="font-heading text-xl font-bold uppercase text-[#E1B76F]">
            Delivery Guidelines & Terms
          </h3>

          <ul className="space-y-4 text-[14px] text-[#cbb18a] leading-relaxed">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-[#E1B76F] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#f5ebd8]">Cash on Delivery (COD):</strong> You can pay in cash or via mobile banking (bKash, Nagad) directly to the delivery hero upon receiving your parcel.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-[#E1B76F] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#f5ebd8]">Check Upon Delivery:</strong> We encourage customers to verify the package and outer condition in front of the rider. If the wrong item or damaged parcel is delivered, please contact our support hotline immediately.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-[#E1B76F] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#f5ebd8]">No Try-Ons Before Payment:</strong> For logistics security, delivery agents are not authorized to wait for fittings or trial sessions prior to payment acceptance. All sizing adjustments are fully protected under our 7-Day Exchange Policy.
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
