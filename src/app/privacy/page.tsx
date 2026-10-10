import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — ANGKON",
  description: "Learn how ANGKON protects and respects your personal customer information.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#400604] text-[#E1B76F]">
      <div className="border-b border-[#5c0f0d] bg-[#2b0403] py-12 px-4 text-center">
        <div className="container mx-auto max-w-[800px]">
          <h1 className="font-heading text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#E1B76F]">
            Privacy Policy
          </h1>
          <p className="mt-2 text-[14px] text-[#cbb18a]">
            Your privacy and customer data security are sacred to us.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-[900px] px-4 py-12 lg:px-8 space-y-8 text-[14px] text-[#cbb18a] leading-relaxed">
        <div className="rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-8 space-y-4">
          <h2 className="font-heading text-lg font-bold uppercase text-[#E1B76F]">Data We Collect</h2>
          <p>
            When you place an order or contact us, we collect only the necessary details required to complete your delivery: your name, recipient delivery address, contact phone number, and optional email address.
          </p>
        </div>

        <div className="rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-8 space-y-4">
          <h2 className="font-heading text-lg font-bold uppercase text-[#E1B76F]">How We Use Your Data</h2>
          <p>
            Your information is used strictly to fulfill your orders, provide dispatch tracking notifications via SMS/WhatsApp, and coordinate delivery with trusted domestic courier services (e.g., Steadfast, Pathao, RedX). We never sell, rent, or share customer data with third-party advertisers.
          </p>
        </div>

        <div className="rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-8 space-y-4">
          <h2 className="font-heading text-lg font-bold uppercase text-[#E1B76F]">Contact Information</h2>
          <p>
            For privacy inquiries or to request deletion of your account record, please contact us at:
            <br />
            <strong>angkonofficial08@gmail.com</strong> or WhatsApp <strong>+880 1338-668899</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
