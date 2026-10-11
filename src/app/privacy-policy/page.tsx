import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield, Lock, Eye, FileText, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — ANGKON",
  description: "Privacy Policy for ANGKON: Information collection, order fulfillment data protection, cookies, and consumer rights.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#400604] text-[#E1B76F]">
      {/* ── Breadcrumb & Top Bar ── */}
      <div className="w-full border-b border-[#E1B76F]/20 bg-[#340402] py-6 sm:py-8 px-4">
        <div className="max-w-[900px] mx-auto">
          <nav className="text-xs text-[#E1B76F]/70 mb-2 flex items-center gap-2">
            <Link href="/" className="hover:text-[#E1B76F] transition">Home</Link>
            <span className="text-[#E1B76F]/40">/</span>
            <Link href="/policies" className="hover:text-[#E1B76F] transition">Policies</Link>
            <span className="text-[#E1B76F]/40">/</span>
            <span className="text-[#E1B76F] font-semibold">Privacy Policy</span>
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-[#E1B76F]">
                Privacy Policy
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-[#f0d29d]">
                Privacy Policy for ANGKON Storefront & Customers.
              </p>
            </div>
            <Link
              href="/policies"
              className="inline-flex items-center gap-1.5 self-start sm:self-auto text-xs font-bold text-[#E1B76F] hover:text-[#400604] border border-[#E1B76F]/40 rounded-full px-4 py-2 bg-[#400604] hover:bg-[#E1B76F] transition shadow-sm"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Policies
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10 text-[#f0d29d] leading-relaxed text-sm sm:text-base">
        {/* Intro */}
        <section className="border-b border-[#E1B76F]/20 pb-8">
          <p className="text-[#f0d29d]">
            At <strong className="text-[#E1B76F]">ANGKON</strong>, accessible from our official website, one of our main priorities is the privacy of our visitors. This Privacy Policy document outlines the types of information that is collected and recorded by ANGKON and how we use it.
          </p>
          <p className="mt-3 text-[#f0d29d]">
            If you have additional questions or require more information about our Privacy Policy, please do not hesitate to contact our customer concierge.
          </p>
        </section>

        {/* Consent */}
        <section className="border-b border-[#E1B76F]/20 pb-8 space-y-2">
          <h2 className="font-heading text-xl sm:text-2xl font-black uppercase text-[#E1B76F] tracking-tight">
            Consent
          </h2>
          <p className="text-[#f0d29d]">
            By using our website, you hereby consent to our Privacy Policy and agree to its terms.
          </p>
        </section>

        {/* Information We Collect */}
        <section className="border-b border-[#E1B76F]/20 pb-8 space-y-3">
          <h2 className="font-heading text-xl sm:text-2xl font-black uppercase text-[#E1B76F] tracking-tight">
            Information We Collect
          </h2>
          <p className="text-[#f0d29d]">
            The personal information that you are asked to provide, and the reasons why you are asked to provide it, will be made clear to you at the point we ask you to provide your personal information.
          </p>
          <p className="text-[#f0d29d]">
            When you place an order, we collect details necessary to process Cash on Delivery (COD) and delivery shipping across Bangladesh:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-[#f0d29d]">
            <li>Customer Name and Recipient Name</li>
            <li>Delivery Address (including District and Police Station / Thana)</li>
            <li>Contact Phone Number (used for courier delivery verification)</li>
            <li>Email Address (for order receipts and tracking confirmations)</li>
            <li>Order specifics (products selected, size, quantity)</li>
          </ul>
        </section>

        {/* How We Use Your Information */}
        <section className="border-b border-[#E1B76F]/20 pb-8 space-y-3">
          <h2 className="font-heading text-xl sm:text-2xl font-black uppercase text-[#E1B76F] tracking-tight">
            How We Use Your Information
          </h2>
          <p className="text-[#f0d29d]">
            We use the information we collect in various ways, including to:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-[#f0d29d]">
            <li>Provide, operate, and maintain our e-commerce platform</li>
            <li>Process transactions and arrange doorstep courier delivery</li>
            <li>Communicate with you for order verification, dispatch updates, and customer support</li>
            <li>Send order tracking numbers via SMS or WhatsApp</li>
            <li>Prevent fraudulent transactions and protect our customers</li>
          </ul>
        </section>

        {/* Log Files & Cookies */}
        <section className="border-b border-[#E1B76F]/20 pb-8 space-y-3">
          <h2 className="font-heading text-xl sm:text-2xl font-black uppercase text-[#E1B76F] tracking-tight">
            Log Files & Cookies
          </h2>
          <p className="text-[#f0d29d]">
            ANGKON follows a standard procedure of using log files and browser storage cookies. Cookies are used to store information including visitors&apos; preferences, shopping bag items, and recently viewed products. The information is used to optimize your experience by customizing our web page content based on your browser type or device.
          </p>
        </section>

        {/* Third-Party Services */}
        <section className="border-b border-[#E1B76F]/20 pb-8 space-y-3">
          <h2 className="font-heading text-xl sm:text-2xl font-black uppercase text-[#E1B76F] tracking-tight">
            Third-Party Delivery & Payment Gateways
          </h2>
          <p className="text-[#f0d29d]">
            For online payments, transactions are processed securely through certified gateways such as <strong className="text-[#E1B76F]">SSLCOMMERZ</strong> (accepting VISA, Mastercard, bKash, Nagad, Rocket). ANGKON does not store complete debit or credit card credentials on our servers.
          </p>
          <p className="text-[#f0d29d]">
            Delivery details are shared strictly with our contracted domestic logistics partners (Steadfast, Pathao, RedX) solely for delivering your parcel.
          </p>
        </section>

        {/* Contact Info */}
        <section className="space-y-3">
          <h2 className="font-heading text-xl sm:text-2xl font-black uppercase text-[#E1B76F] tracking-tight">
            Contact Information
          </h2>
          <p className="text-[#f0d29d]">
            If you have any questions, wish to review your stored information, or request removal of your account records, please contact our support desk:
          </p>
          <div className="rounded-xl border border-[#E1B76F]/25 bg-[#340402] p-5 text-sm space-y-1.5 text-[#f0d29d]">
            <p><strong className="text-[#E1B76F]">Brand:</strong> ANGKON</p>
            <p><strong className="text-[#E1B76F]">Showroom:</strong> H-93, (Ground floor), Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212</p>
            <p><strong className="text-[#E1B76F]">Phone / WhatsApp:</strong> +880 1338-668899</p>
            <p><strong className="text-[#E1B76F]">Email:</strong> angkonofficial08@gmail.com</p>
          </div>
        </section>
      </div>
    </div>
  );
}
