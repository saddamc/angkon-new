import type { Metadata } from "next";
import { Truck, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { getShippingSettings } from "@/server/shipping";

export const metadata: Metadata = {
  title: "Delivery Time & Shipping Policy — ANGKON",
  description: "Nationwide Cash on Delivery in all 64 districts. Inside Dhaka 2-3 days, Outside Dhaka 3-5 days.",
};

// Delivery prices come from Admin → Settings → Shipping; refresh at most once a minute.
export const revalidate = 60;

export default async function ShippingPage() {
  const settings = await getShippingSettings();
  const tk = (n: number) => (n === 0 ? "Free" : `Tk${n.toLocaleString("en-US")}`);
  return (
    <div className="min-h-screen bg-[#400604] text-white">
      <div className="border-b border-[#5c0f0d] bg-[#2b0403] py-12 px-4 text-center">
        <div className="container mx-auto max-w-[900px]">
          <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/70">
            Nationwide Logistics
          </span>
          <h1 className="mt-2 font-heading text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
            Shipping & Delivery Policy
          </h1>
          <p className="mt-3 text-[14px] sm:text-[15px] text-white/70">
            Fast, secure fulfillment with Cash on Delivery across all 64 districts of Bangladesh.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-[1000px] px-4 py-12 lg:px-8 space-y-8">
        {/* Authentic Luxury Delivery Timing Poster Card */}
        <div className="rounded-[16px] bg-[#340402] border-2 border-[#E1B76F]/40 text-white p-6 sm:p-10 shadow-2xl">
          <h2 className="font-heading text-2xl sm:text-4xl lg:text-5xl font-black italic tracking-tight text-center uppercase mb-8 text-white">
            Delivery Timing for COD
          </h2>
          
          <div className="max-w-2xl mx-auto border-2 border-[#E1B76F]/40 rounded-xl overflow-hidden bg-[#2b0403]">
            <div className="grid grid-cols-2 border-b-2 border-[#E1B76F]/40 bg-[#400604] text-white p-3 sm:p-4 text-center">
              <span className="font-heading text-lg sm:text-2xl font-black italic uppercase">Area</span>
              <span className="font-heading text-lg sm:text-2xl font-black italic uppercase">Time Needed</span>
            </div>
            
            <div className="divide-y-2 divide-[#E1B76F]/20 text-center font-heading text-lg sm:text-2xl font-black italic text-white/90">
              <div className="grid grid-cols-2 p-3 sm:p-4 bg-[#340402]">
                <span>Dhaka</span>
                <span className="text-white">1-2 Days</span>
              </div>
              <div className="grid grid-cols-2 p-3 sm:p-4 bg-[#2b0403]">
                <span>Gazipur, Narayanganj, Savar</span>
                <span className="text-white">1-2 Days</span>
              </div>
              <div className="grid grid-cols-2 p-3 sm:p-4 bg-[#340402]">
                <span>Chittagong, Sylhet, Rajshahi</span>
                <span className="text-white">3-4 Days</span>
              </div>
              <div className="grid grid-cols-2 p-3 sm:p-4 bg-[#2b0403]">
                <span>Other Major Cities</span>
                <span className="text-white">4-5 Days</span>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/70 space-y-1">
            <p>*Mentioned timings are estimated time for delivery after package has been dispatched</p>
            <p>*ANGKON works with reliable 3rd party delivery couriers</p>
          </div>
        </div>
        {/* Shipping Rates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#400604] text-white border border-[#5c0f0d]">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-white">Inside Dhaka City</h3>
                <span className="text-xs text-white/70">Home Delivery</span>
              </div>
            </div>
            <div className="space-y-2 text-[14px] text-white">
              <p><strong>Fee:</strong> {settings.insideDhaka === 0 ? "Free" : `${tk(settings.insideDhaka)} Flat Rate`}</p>
              <p><strong>Timeline:</strong> 2 to 3 Business Days</p>
              <p><strong>Coverage:</strong> All postal zones within Dhaka Metro</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#400604] text-white border border-[#5c0f0d]">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-white">Gazipur, Narayanganj &amp; Savar</h3>
                <span className="text-xs text-white/70">Dhaka Outskirts</span>
              </div>
            </div>
            <div className="space-y-2 text-[14px] text-white">
              <p><strong>Fee:</strong> {settings.nearDhaka === 0 ? "Free" : `${tk(settings.nearDhaka)} Flat Rate`}</p>
              <p><strong>Timeline:</strong> 1 to 2 Business Days</p>
              <p><strong>Coverage:</strong> Gazipur, Narayanganj and Savar</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#400604] text-white border border-[#5c0f0d]">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-white">Outside Dhaka (All 64 Districts)</h3>
                <span className="text-xs text-white/70">Nationwide Courier</span>
              </div>
            </div>
            <div className="space-y-2 text-[14px] text-white">
              <p><strong>Fee:</strong> {settings.outsideDhaka === 0 ? "Free" : `${tk(settings.outsideDhaka)} Flat Rate`}</p>
              <p><strong>Timeline:</strong> 3 to 5 Business Days</p>
              <p><strong>Coverage:</strong> All divisional and district headquarters</p>
            </div>
          </div>
        </div>

        {/* Free Shipping Alert — only when a free-delivery threshold is set in the admin panel */}
        {settings.freeDeliveryThreshold > 0 && (
        <div className="rounded-2xl border-2 border-[#E1B76F] bg-[#2b0403] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-white shrink-0" />
            <div>
              <h4 className="font-heading text-lg font-black uppercase text-white">
                Free Delivery Over {tk(settings.freeDeliveryThreshold)}
              </h4>
              <p className="text-xs text-white/70">
                Add items worth {tk(settings.freeDeliveryThreshold)} or more to your cart to enjoy free shipping everywhere in Bangladesh!
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
        )}

        {/* Instructions */}
        <div className="rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-8 space-y-6">
          <h3 className="font-heading text-xl font-bold uppercase text-white">
            Delivery Guidelines & Terms
          </h3>

          <ul className="space-y-4 text-[14px] text-white/70 leading-relaxed">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-white shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Cash on Delivery (COD):</strong> You can pay in cash or via mobile banking (bKash, Nagad) directly to the delivery hero upon receiving your parcel.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-white shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Check Upon Delivery:</strong> We encourage customers to verify the package and outer condition in front of the rider. If the wrong item or damaged parcel is delivered, please contact our support hotline immediately.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-white shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">No Try-Ons Before Payment:</strong> For logistics security, delivery agents are not authorized to wait for fittings or trial sessions prior to payment acceptance. All sizing adjustments are fully protected under our 7-Day Exchange Policy.
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
