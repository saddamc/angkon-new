"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Eye,
  Server,
  Cookie,
  UserCheck,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";

export default function PrivacyPolicyPage() {
  const [lang, setLang] = useState<"en" | "bn">("en");

  return (
    <div className="min-h-screen bg-[#530911] text-white selection:bg-[#E1B76F] selection:text-[#230407]">
      {/* ── Breadcrumb & Hero Header ── */}
      <div className="w-full border-b border-[#E1B76F]/20 bg-[#42070e] py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1140px] mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3 text-xs text-white/70">
            <nav className="flex items-center gap-2">
              <Link href="/" className="hover:text-[#E1B76F] transition">
                Home
              </Link>
              <span className="text-white/40">/</span>
              <span className="text-white font-semibold">
                {lang === "en" ? "Privacy Policy" : "গোপনীয়তা নীতিমালা"}
              </span>
            </nav>

            {/* Language Switcher */}
            <div className="flex items-center gap-1 rounded-full bg-[#280504] border border-[#E1B76F]/30 p-1">
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  lang === "en"
                    ? "bg-[#E1B76F] text-[#230407] shadow-sm"
                    : "text-white/70 hover:text-white"
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLang("bn")}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  lang === "bn"
                    ? "bg-[#E1B76F] text-[#230407] shadow-sm"
                    : "text-white/70 hover:text-white"
                }`}
              >
                বাংলা
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#E1B76F]">
              {lang === "en" ? "Data Protection & Privacy" : "তথ্য সুরক্ষা ও গোপনীয়তা"}
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
              {lang === "en" ? "Privacy & Data Protection Policy" : "গোপনীয়তা ও তথ্য সুরক্ষা নীতিমালা"}
            </h1>
            <p className="text-xs sm:text-sm text-white/80 max-w-2xl leading-relaxed">
              {lang === "en"
                ? "At ANGKON, your privacy and financial security are our utmost priority. Learn how we collect, handle, and safeguard your personal details across Bangladesh."
                : "অংকন-এ আপনার ব্যক্তিগত তথ্যের নিরাপত্তা ও সুরক্ষাকে সর্বোচ্চ অগ্রাধিকার দেওয়া হয়। জেনে নিন কীভাবে আপনার তথ্য সংগৃহীত, ব্যবহৃত ও সুরক্ষিত থাকে।"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Main Content Container ── */}
      <div className="max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 space-y-10">
        {/* ══ 1. CORE PILLARS ══ */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-6 space-y-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Lock className="h-5 w-5" />
            </span>
            <h3 className="text-base font-bold text-white font-serif">
              {lang === "en" ? "Zero Card Storage" : "কার্ডের তথ্য সংরক্ষণহীন"}
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              {lang === "en"
                ? "We never store debit/credit card numbers, CVVs, or bank PINs on our servers. All digital payments are handled directly by PCI-DSS Level 1 certified SSLCOMMERZ."
                : "আমাদের সার্ভারে কোনো কার্ডের বিবরণ, CVV বা পিন সংরক্ষিত হয় না। সকল লেনদেন সরাসরি বাংলাদেশ ব্যাংকের অনুমোদিত SSLCOMMERZ দ্বারা পরিচালিত।"}
            </p>
          </div>

          <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-6 space-y-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E1B76F]/15 border border-[#E1B76F]/30 text-[#E1B76F]">
              <Eye className="h-5 w-5" />
            </span>
            <h3 className="text-base font-bold text-white font-serif">
              {lang === "en" ? "Strict Delivery Sharing" : "ডেলিভারি তথ্যের সুরক্ষা"}
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              {lang === "en"
                ? "Your delivery address and phone number are shared solely with our contracted logistics partners (Steadfast, Pathao, RedX) for parcel transit."
                : "আপনার নাম, ঠিকানা ও ফোন নম্বর কেবল পার্সেল ডেলিভারির স্বার্থে আমাদের অনুমোদিত কুরিয়ার পার্টনারদের সাথে শেয়ার করা হয়।"}
            </p>
          </div>

          <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-6 space-y-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
              <UserCheck className="h-5 w-5" />
            </span>
            <h3 className="text-base font-bold text-white font-serif">
              {lang === "en" ? "Your Legal Rights" : "আপনার অধিকার"}
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              {lang === "en"
                ? "In accordance with Bangladesh PDPA 2026, you retain the full right to access, rectify, export, or permanently request deletion of your account."
                : "বাংলাদেশের তথ্য সুরক্ষা আইন অনুযায়ী আপনি যে কোনো সময় আপনার তথ্য যাচাই, পরিবর্তন বা সম্পূর্ণ মুছে ফেলার অধিকার রাখেন।"}
            </p>
          </div>
        </div>

        {/* ══ 2. DETAILED SECTIONS ══ */}
        <div className="space-y-8 rounded-2xl border border-[#E1B76F]/25 bg-[#280504] p-6 sm:p-8 text-xs sm:text-sm text-white/85 leading-relaxed">
          {/* Section 1: Information Collected */}
          <section className="space-y-3 border-b border-[#E1B76F]/15 pb-6">
            <h3 className="text-base sm:text-lg font-bold text-white font-serif flex items-center gap-2">
              <span className="text-[#E1B76F]">01.</span>
              <span>{lang === "en" ? "Information We Collect" : "আমরা যেসব তথ্য সংগ্রহ করি"}</span>
            </h3>
            <p>
              {lang === "en"
                ? "When you browse our catalog, register an account, or complete a checkout on ANGKON, we collect:"
                : "অংকন ওয়েবসাইটে ব্রাউজ করা, অ্যাকাউন্ট তৈরি বা কেনাকাটার সময় আমরা নিম্নলিখিত তথ্যগুলো সংগ্রহ করি:"}
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-white/80">
              <li>
                <strong>{lang === "en" ? "Identity & Contact: " : "পরিচয় ও যোগাযোগ: "}</strong>
                {lang === "en" ? "Full customer name, active mobile number, and email address." : "পূর্ণ নাম, সক্রিয় মোবাইল নম্বর এবং ইমেইল ঠিকানা।"}
              </li>
              <li>
                <strong>{lang === "en" ? "Delivery Destination: " : "ডেলিভারি ঠিকানা: "}</strong>
                {lang === "en" ? "Street address, apartment/house details, district, and city/upazila for accurate courier booking." : "বাড়ি/রোড নম্বর, জেলা এবং থানা/উপজেলা।"}
              </li>
              <li>
                <strong>{lang === "en" ? "Account Credentials: " : "অ্যাকাউন্ট সিকিউরিটি: "}</strong>
                {lang === "en" ? "Encrypted password hashes (passwords are one-way hashed using industry-standard bcrypt and cannot be viewed by our staff)." : "ওয়ান-ওয়ে এনক্রিপ্টেড পাসওয়ার্ড (bcrypt হ্যাশ), যা কেউ দেখতে পারে না।"}
              </li>
              <li>
                <strong>{lang === "en" ? "Transaction Logs: " : "লেনদেন বিবরণ: "}</strong>
                {lang === "en" ? "Order numbers, purchased apparel SKUs, payment method, delivery fees, and gateway reference tokens." : "অর্ডার নম্বর, পণ্যের তালিকা, পেমেন্ট মাধ্যম ও ট্র্যাকিং কোড।"}
              </li>
            </ul>
          </section>

          {/* Section 2: Purpose of Processing */}
          <section className="space-y-3 border-b border-[#E1B76F]/15 pb-6">
            <h3 className="text-base sm:text-lg font-bold text-white font-serif flex items-center gap-2">
              <span className="text-[#E1B76F]">02.</span>
              <span>{lang === "en" ? "How We Use Your Information" : "তথ্যের ব্যবহার ও উদ্দেশ্য"}</span>
            </h3>
            <p>
              {lang === "en"
                ? "Your information is used strictly for legitimate e-commerce operations:"
                : "আপনার ব্যক্তিগত তথ্য কেবল নির্দিষ্ট ব্যবসায়িক উদ্দেশ্যে ব্যবহৃত হয়:"}
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-white/80">
              <li>{lang === "en" ? "Processing order reservations and doorstep courier dispatch." : "অর্ডার প্রক্রিয়াকরণ ও কুরিয়ার মারফত হোম ডেলিভারি নিশ্চিতকরণ।"}</li>
              <li>{lang === "en" ? "Verifying online payments via SSLCOMMERZ validator APIs." : "অনলাইন পেমেন্ট স্বয়ংক্রিয়ভাবে যাচাই ও নিশ্চিতকরণ।"}</li>
              <li>{lang === "en" ? "Sending order invoices, parcel tracking codes, and delivery status updates via SMS and Email." : "এসএমএস ও ইমেইলে ইনভয়েস এবং ট্র্যাকিং আপডেট প্রেরণ।"}</li>
              <li>{lang === "en" ? "Preventing fraudulent transactions and malicious bot checkout attacks." : "প্রতারণামূলক অর্ডার ও স্প্যাম প্রতিরোধ।"}</li>
            </ul>
          </section>

          {/* Section 3: Third-Party Service Providers */}
          <section className="space-y-3 border-b border-[#E1B76F]/15 pb-6">
            <h3 className="text-base sm:text-lg font-bold text-white font-serif flex items-center gap-2">
              <span className="text-[#E1B76F]">03.</span>
              <span>{lang === "en" ? "Third-Party Service Integrations" : "তৃতীয় পক্ষীয় সেবাসমূহ"}</span>
            </h3>
            <p>
              {lang === "en"
                ? "To ensure a smooth shopping experience, ANGKON integrates with reputable technology partners under strict data privacy obligations:"
                : "উন্নত সেবা নিশ্চিত করতে অংকন বিশ্বস্ত প্রযুক্তি পার্টনারদের সাথে সংযুক্ত:"}
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-white/80">
              <li>
                <strong>SSLCOMMERZ:</strong>{" "}
                {lang === "en"
                  ? "Processes digital transactions under Bangladesh Bank licensing and PCI-DSS Level 1 compliance."
                  : "বাংলাদেশ ব্যাংকের লাইসেন্সপ্রাপ্ত ও পিসিআই-ডিএসএস অনুমোদিত পেমেন্ট গেটওয়ে।"}
              </li>
              <li>
                <strong>{lang === "en" ? "Courier Partners: " : "কুরিয়ার পার্টনার: "}</strong>
                Steadfast Courier, Pathao Courier, RedX, eCourier ({lang === "en" ? "receive recipient name, address, and phone solely for delivering your parcel" : "পার্সেল পৌঁছে দেওয়ার জন্য কেবল নাম, ঠিকানা ও ফোন পায়"})।
              </li>
              <li>
                <strong>{lang === "en" ? "Cloud Infrastructure: " : "হোস্টিং ও ডাটাবেজ: "}</strong>
                Vercel &amp; MongoDB Atlas ({lang === "en" ? "enterprise cloud hosting with end-to-end TLS encryption" : "সম্পূর্ণ এনক্রিপ্টেড ক্লাউড সার্ভার"})।
              </li>
            </ul>
          </section>

          {/* Section 4: Cookies & Tracking */}
          <section className="space-y-3 border-b border-[#E1B76F]/15 pb-6">
            <h3 className="text-base sm:text-lg font-bold text-white font-serif flex items-center gap-2">
              <span className="text-[#E1B76F]">04.</span>
              <span>{lang === "en" ? "Cookies & Device Context" : "কুকিজ ও ব্রাউজিং তথ্য"}</span>
            </h3>
            <p>
              {lang === "en"
                ? "We use standard browser cookies to remember your shopping bag items, keep you signed in securely, and record anonymous website performance analytics. You can adjust your cookie settings through your browser preferences at any time."
                : "শপিং ব্যাগে পণ্য সংরক্ষণ, সুরক্ষিত লগইন এবং ওয়েবসাইট পারফরম্যান্স মূল্যায়নে কুকিজ ব্যবহৃত হয়। আপনি যেকোনো সময় ব্রাউজার সেটিংস থেকে তা নিয়ন্ত্রণ করতে পারেন।"}
            </p>
          </section>

          {/* Section 5: Data Retention & Customer Rights */}
          <section className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-white font-serif flex items-center gap-2">
              <span className="text-[#E1B76F]">05.</span>
              <span>{lang === "en" ? "Data Retention & Your Rights" : "তথ্য সংরক্ষণ ও গ্রাহকের অধিকার"}</span>
            </h3>
            <p>
              {lang === "en"
                ? "Financial and taxation laws in Bangladesh require transaction records to be preserved for audit purposes. However, you can at any time request a copy of your personal data or request deletion of your storefront account by emailing our Data Protection Concierge at "
                : "অডিট ও ট্যাক্স নিয়মের প্রয়োজনে অর্ডার রেকর্ড সংরক্ষিত থাকে। তবে আপনি যেকোনো সময় আপনার অ্যাকাউন্ট মুছে ফেলার বা তথ্যের অনুলিপি পাওয়ার জন্য আমাদের সাথে যোগাযোগ করতে পারেন: "}
              <a href="mailto:angkonofficial08@gmail.com" className="text-[#E1B76F] font-bold underline">
                angkonofficial08@gmail.com
              </a>.
            </p>
          </section>
        </div>

        {/* ══ 3. OFFICIAL COMPANY CONTACT ══ */}
        <div className="rounded-2xl border border-[#E1B76F]/30 bg-[#35060a] p-6 sm:p-8 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#E1B76F]">
            {lang === "en" ? "Official Business Inquiries & Data Office" : "অফিসিয়াল যোগাযোগ ও ঠিকানা"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-3 pt-2 text-xs">
            <div className="flex items-center gap-3 rounded-xl bg-[#280504] border border-white/5 p-3.5">
              <Phone className="h-4 w-4 text-[#E1B76F] shrink-0" />
              <div>
                <span className="text-[10px] text-white/50 uppercase block">Hotline &amp; WhatsApp</span>
                <span className="font-bold text-white">+880 1338-668899</span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-[#280504] border border-white/5 p-3.5">
              <Mail className="h-4 w-4 text-[#E1B76F] shrink-0" />
              <div>
                <span className="text-[10px] text-white/50 uppercase block">Official Email</span>
                <span className="font-bold text-white">angkonofficial08@gmail.com</span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-[#280504] border border-white/5 p-3.5">
              <MapPin className="h-4 w-4 text-[#E1B76F] shrink-0" />
              <div>
                <span className="text-[10px] text-white/50 uppercase block">Flagship Showroom</span>
                <span className="font-medium text-white/90">Niketan, Gulshan, Dhaka</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Version */}
        <div className="text-center text-[11px] text-white/50">
          <p>Version: 2026.1 • Compliant with Bangladesh PDPA 2026 &amp; Consumer Rights Act 2009</p>
        </div>
      </div>
    </div>
  );
}
