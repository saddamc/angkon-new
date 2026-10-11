import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield, Lock, Eye, FileText, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — ANGKON",
  description: "Privacy Policy for ANGKON: Information collection, order fulfillment data protection, cookies, and consumer rights.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      {/* ── Breadcrumb & Top Bar ── */}
      <div className="w-full border-b border-neutral-100 bg-[#fafafa] py-6 sm:py-8 px-4">
        <div className="max-w-[900px] mx-auto">
          <nav className="text-xs text-neutral-500 mb-2 flex items-center gap-2">
            <Link href="/" className="hover:text-black transition">Home</Link>
            <span className="text-neutral-300">/</span>
            <Link href="/policies" className="hover:text-black transition">Policies</Link>
            <span className="text-neutral-300">/</span>
            <span className="text-black font-semibold">Privacy Policy</span>
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-black">
                Privacy Policy
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-neutral-600">
                Privacy Policy for ANGKON Storefront & Customers.
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

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10 text-neutral-800 leading-relaxed text-sm sm:text-base">
        {/* Intro */}
        <section className="border-b border-neutral-100 pb-8">
          <p className="text-neutral-700">
            At <strong>ANGKON</strong>, accessible from our official website, one of our main priorities is the privacy of our visitors. This Privacy Policy document outlines the types of information that is collected and recorded by ANGKON and how we use it.
          </p>
          <p className="mt-3 text-neutral-700">
            If you have additional questions or require more information about our Privacy Policy, please do not hesitate to contact our customer concierge.
          </p>
        </section>

        {/* Consent */}
        <section className="border-b border-neutral-100 pb-8 space-y-2">
          <h2 className="font-heading text-xl sm:text-2xl font-black uppercase text-black tracking-tight">
            Consent
          </h2>
          <p className="text-neutral-700">
            By using our website, you hereby consent to our Privacy Policy and agree to its terms.
          </p>
        </section>

        {/* Information We Collect */}
        <section className="border-b border-neutral-100 pb-8 space-y-3">
          <h2 className="font-heading text-xl sm:text-2xl font-black uppercase text-black tracking-tight">
            Information We Collect
          </h2>
          <p className="text-neutral-700">
            The personal information that you are asked to provide, and the reasons why you are asked to provide it, will be made clear to you at the point we ask you to provide your personal information.
          </p>
          <p className="text-neutral-700">
            When you place an order, we collect details necessary to process Cash on Delivery (COD) and delivery shipping across Bangladesh:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-neutral-700">
            <li>Customer Name and Recipient Name</li>
            <li>Delivery Address (including District and Police Station / Thana)</li>
            <li>Contact Phone Number (used for courier delivery verification)</li>
            <li>Email Address (for order receipts and tracking confirmations)</li>
            <li>Order specifics (products selected, size, quantity)</li>
          </ul>
        </section>

        {/* How We Use Your Information */}
        <section className="border-b border-neutral-100 pb-8 space-y-3">
          <h2 className="font-heading text-xl sm:text-2xl font-black uppercase text-black tracking-tight">
            How We Use Your Information
          </h2>
          <p className="text-neutral-700">
            We use the information we collect in various ways, including to:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-neutral-700">
            <li>Provide, operate, and maintain our e-commerce platform</li>
            <li>Process transactions and arrange doorstep courier delivery</li>
            <li>Communicate with you for order verification, dispatch updates, and customer support</li>
            <li>Send order tracking numbers via SMS or WhatsApp</li>
            <li>Prevent fraudulent transactions and protect our customers</li>
          </ul>
        </section>

        {/* Log Files & Cookies */}
        <section className="border-b border-neutral-100 pb-8 space-y-3">
          <h2 className="font-heading text-xl sm:text-2xl font-black uppercase text-black tracking-tight">
            Log Files & Cookies
          </h2>
          <p className="text-neutral-700">
            ANGKON follows a standard procedure of using log files and browser storage cookies. Cookies are used to store information including visitors&apos; preferences, shopping bag items, and recently viewed products. The information is used to optimize your experience by customizing our web page content based on your browser type or device.
          </p>
        </section>

        {/* Third-Party Services */}
        <section className="border-b border-neutral-100 pb-8 space-y-3">
          <h2 className="font-heading text-xl sm:text-2xl font-black uppercase text-black tracking-tight">
            Third-Party Delivery & Payment Gateways
          </h2>
          <p className="text-neutral-700">
            For online payments, transactions are processed securely through certified gateways such as <strong>SSLCOMMERZ</strong> (accepting VISA, Mastercard, bKash, Nagad, Rocket). ANGKON does not store complete debit or credit card credentials on our servers.
          </p>
          <p className="text-neutral-700">
            Delivery details are shared strictly with our contracted domestic logistics partners (Steadfast, Pathao, RedX) solely for delivering your parcel.
          </p>
        </section>

        {/* Contact Info */}
        <section className="space-y-3">
          <h2 className="font-heading text-xl sm:text-2xl font-black uppercase text-black tracking-tight">
            Contact Information
          </h2>
          <p className="text-neutral-700">
            If you have any questions, wish to review your stored information, or request removal of your account records, please contact our support desk:
          </p>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 text-sm space-y-1">
            <p><strong>Brand:</strong> ANGKON</p>
            <p><strong>Showroom:</strong> H-93, (Ground floor), Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212</p>
            <p><strong>Phone / WhatsApp:</strong> +880 1338-668899</p>
            <p><strong>Email:</strong> angkonofficial08@gmail.com</p>
          </div>
        </section>
      </div>
    </div>
  );
}
