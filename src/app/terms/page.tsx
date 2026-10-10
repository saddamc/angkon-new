import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions — ANGKON",
  description: "Official terms of service, payment policies, and legal agreements for ANGKON.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#400604] text-[#E1B76F]">
      <div className="border-b border-[#5c0f0d] bg-[#2b0403] py-12 px-4 text-center">
        <div className="container mx-auto max-w-[800px]">
          <h1 className="font-heading text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#E1B76F]">
            Terms & Conditions
          </h1>
          <p className="mt-2 text-[14px] text-[#cbb18a]">
            Please review these terms before placing an order on our platform.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-[900px] px-4 py-12 lg:px-8 space-y-8 text-[14px] text-[#cbb18a] leading-relaxed">
        <div className="rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-8 space-y-4">
          <h2 className="font-heading text-lg font-bold uppercase text-[#E1B76F]">1. Order Placement & Confirmation</h2>
          <p>
            By placing an order via our online store or official WhatsApp, you agree to provide complete and accurate delivery and contact credentials. All orders are subject to confirmation and inventory availability.
          </p>
        </div>

        <div className="rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-8 space-y-4">
          <h2 className="font-heading text-lg font-bold uppercase text-[#E1B76F]">2. Pricing & Currency</h2>
          <p>
            All listed prices are denominated in Bangladeshi Taka (BDT / ৳) and include applicable statutory taxes. Delivery charges are calculated based on your destination: inside Dhaka (৳70) or outside Dhaka (৳130), with free shipping on orders over ৳3,000.
          </p>
        </div>

        <div className="rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-8 space-y-4">
          <h2 className="font-heading text-lg font-bold uppercase text-[#E1B76F]">3. Cash on Delivery (COD) Obligations</h2>
          <p>
            Customers electing Cash on Delivery are expected to honor their order upon arrival. Fraudulent ordering or refusing genuine shipments without valid grounds may lead to restriction of COD privileges on future orders.
          </p>
        </div>

        <div className="rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-8 space-y-4">
          <h2 className="font-heading text-lg font-bold uppercase text-[#E1B76F]">4. Showroom & Official Contact</h2>
          <p>
            <strong>HOUSE OF MODERN HERITAGE</strong><br />
            H-93, (Ground floor), Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212<br />
            WhatsApp: +880 1338-668899 | Email: angkonofficial08@gmail.com
          </p>
        </div>
      </div>
    </div>
  );
}
