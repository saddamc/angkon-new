"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  PackageCheck,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Clock,
  HelpCircle,
  FileText,
  Truck,
} from "lucide-react";

export default function ReturnRefundPolicyPage() {
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
                {lang === "en" ? "Return & Refund Policy" : "রিটার্ন ও রিফান্ড পলিসি"}
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
              {lang === "en" ? "Official Store Policy" : "অফিসিয়াল স্টোর পলিসি"}
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
              {lang === "en" ? "Return & Refund Policy" : "রিটার্ন ও রিফান্ড নীতিমালা"}
            </h1>
            <p className="text-xs sm:text-sm text-white/80 max-w-2xl leading-relaxed">
              {lang === "en"
                ? "At ANGKON, our patron's peace of mind is paramount. We believe in transparent customer care, fair inspection at delivery, and hassle-free returns."
                : "অংকন-এ গ্রাহকদের সন্তুষ্টিই আমাদের প্রধান অগ্রাধিকার। পার্সেল গ্রহণের সময় সঠিক পরিদর্শন এবং সহজ রিটার্ন নীতিমালার মাধ্যমে আমরা সর্বোচ্চ সেবা নিশ্চিত করি।"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Main Content Container ── */}
      <div className="max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 space-y-10">
        {/* ══ 1. PRIMARY PROMISE BANNER ══ */}
        <div className="rounded-2xl border-2 border-[#E1B76F] bg-gradient-to-r from-[#280504] via-[#3d060c] to-[#280504] p-6 sm:p-8 shadow-xl shadow-black/30">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#E1B76F] text-[#230407] shadow-lg shadow-[#E1B76F]/30">
              <PackageCheck className="h-8 w-8" />
            </span>
            <div className="space-y-1.5 flex-1">
              <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-emerald-300 inline-block">
                {lang === "en" ? "Core Customer Promise" : "প্রধান গ্রাহক প্রতিশ্রুতি"}
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-black uppercase text-white tracking-wide">
                {lang === "en"
                  ? "CHECK YOUR ORDER BEFORE YOU ACCEPT IT"
                  : "পণ্য গ্রহণের পূর্বে ভালো করে যাচাই করুন"}
              </h2>
              <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
                {lang === "en"
                  ? "We encourage every patron to verify the parcel exterior, shipping label, and contents when the courier delivery rider arrives. If anything looks visibly damaged, tampered with, or does not match your invoice, refuse the package immediately."
                  : "ডেলিভারি রাইডার পৌঁছানোর পর পার্সেলের বাহ্যিক অবস্থা, ট্র্যাকিং লেবেল ও চালান ভালোভাবে পরীক্ষা করুন। কোনো ক্ষতি বা অমিল পরিলক্ষিত হলে ডেলিভারি সম্পন্ন না করে সাথে সাথে প্রত্যাখ্যান করুন।"}
              </p>
            </div>
          </div>
        </div>

        {/* ══ 2. THREE CORE PILLARS ══ */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Pillar 1 */}
          <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-6 space-y-3.5 shadow-md">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-[#E1B76F]">
                <Truck className="h-5 w-5" />
              </span>
              <span className="text-[10.5px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full">
                {lang === "en" ? "At Delivery" : "ডেলিভারির সময়"}
              </span>
            </div>
            <h3 className="text-base font-bold text-white font-serif">
              {lang === "en" ? "Delivery-Time Inspection" : "ডেলিভারিকালীন পরিদর্শন"}
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              {lang === "en"
                ? "Inspect the outer package and shipping label. If the parcel is compromised or our courier partner supports open-parcel verification, confirm your ensemble before the rider departs."
                : "বাহ্যিক প্যাকেজিং ও লেবেল যাচাই করুন। পার্সেল ক্ষতিগ্রস্ত হলে বা কুরিয়ারের ওপেন-বক্স সুবিধা থাকলে রাইডারের উপস্থিতিতে নিশ্চিত করুন।"}
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-6 space-y-3.5 shadow-md">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <RefreshCw className="h-5 w-5" />
              </span>
              <span className="text-[10.5px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                {lang === "en" ? "7-Day Window" : "৭ দিনের সময়"}
              </span>
            </div>
            <h3 className="text-base font-bold text-white font-serif">
              {lang === "en" ? "Size & Defect Exchanges" : "সাইজ ও ত্রুটিজনিত পরিবর্তন"}
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              {lang === "en"
                ? "Need a different size or discovered a manufacturing flaw? Notify us within 7 days. Unworn garments with intact security tags are eligible for exchange."
                : "সাইজে না মিললে বা উৎপাদনগত ত্রুটি থাকলে ৭ দিনের মধ্যে আমাদের জানান। অক্ষত ট্যাগযুক্ত অব্যবহৃত পোশাকে এক্সচেঞ্জ সুবিধা প্রযোজ্য।"}
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-6 space-y-3.5 shadow-md">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400">
                <RotateCcw className="h-5 w-5" />
              </span>
              <span className="text-[10.5px] font-bold text-blue-300 bg-blue-950/60 border border-blue-500/30 px-2 py-0.5 rounded-full">
                {lang === "en" ? "5–10 Business Days" : "৫–১০ কার্যদিবস"}
              </span>
            </div>
            <h3 className="text-base font-bold text-white font-serif">
              {lang === "en" ? "Verified Refunds" : "যাচাইকৃত রিফান্ড"}
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              {lang === "en"
                ? "Approved returns are refunded to the original payment source (SSLCOMMERZ card/MFS or direct bank transfer for COD) without hidden deduction fees."
                : "অনুমোদিত রিটার্নের অর্থ কোনো গোপন চার্জ ছাড়াই মূল পেমেন্ট মাধ্যমে (কার্ড/বিকাশ/নগদ/ব্যাংক) ৫–১০ কার্যদিবসে রিফান্ড করা হয়।"}
            </p>
          </div>
        </div>

        {/* ══ 3. DETAILED POLICY SECTIONS ══ */}
        <div className="space-y-8 rounded-2xl border border-[#E1B76F]/25 bg-[#280504] p-6 sm:p-8 text-xs sm:text-sm text-white/85 leading-relaxed">
          {/* Section 1: Delivery Inspection */}
          <section className="space-y-3 border-b border-[#E1B76F]/15 pb-6">
            <div className="flex items-center gap-2.5">
              <span className="text-base font-black text-[#E1B76F] font-serif">01.</span>
              <h3 className="text-base sm:text-lg font-bold text-white font-serif">
                {lang === "en"
                  ? "Delivery-Time Inspection Protocol"
                  : "ডেলিভারি গ্রহণের সময় পরিদর্শন নির্দেশিকা"}
              </h3>
            </div>
            <p>
              {lang === "en"
                ? "When our courier partner representative arrives at your delivery destination:"
                : "আমাদের কুরিয়ার পার্টনারের প্রতিনিধি আপনার ঠিকানায় পৌঁছালে:"}
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/80">
              <li>
                <strong>{lang === "en" ? "Exterior Check: " : "বাহ্যিক পরীক্ষা: "}</strong>
                {lang === "en"
                  ? "Check that the outer poly-mailer/box is completely sealed with ANGKON security tape and has no punctures, cuts, or signs of water damage."
                  : "নিশ্চিত করুন যে বাইরের প্যাকেজিং অংকন সিকিউরিটি টেপ দ্বারা সম্পূর্ণ সিল করা এবং এতে কোনো কাটা বা ক্ষতির দাগ নেই।"}
              </li>
              <li>
                <strong>{lang === "en" ? "Invoice & Label: " : "চালান ও লেবেল: "}</strong>
                {lang === "en"
                  ? "Confirm that the shipping label reflects your correct Order Number and contact details."
                  : "শিপিং লেবেলে আপনার সঠিক অর্ডার নম্বর ও বিবরণ রয়েছে কিনা তা মিলিয়ে নিন।"}
              </li>
              <li>
                <strong>{lang === "en" ? "Open-Parcel Inspection: " : "বক্স খুলে দেখা: "}</strong>
                {lang === "en"
                  ? "Where our courier partner (such as Steadfast / Pathao) supports open-box verification, you are welcome to inspect the garment in the rider's presence. Please note that garments cannot be worn, tried on, or washed prior to complete acceptance."
                  : "যেসব এলাকায় কুরিয়ার পার্টনার ওপেন-বক্স সুবিধা দিয়ে থাকে, সেখানে রাইডারের সামনে পোশাকটির রঙ ও মডেল মিলিয়ে দেখতে পারেন। তবে পোশাক ট্রায়াল দেওয়া বা পরা যাবে না।"}
              </li>
              <li>
                <strong>{lang === "en" ? "Refusal Procedure: " : "প্রত্যাখ্যান পদ্ধতি: "}</strong>
                {lang === "en"
                  ? "If the parcel has been opened, damaged, or contains an incorrect product, hand it back to the rider and mark 'Damaged / Discrepancy' on the courier slip. For COD orders, you pay nothing. For online prepaid orders, your payment is held securely and refunded in full upon receipt of the returned item."
                  : "পার্সেল ক্ষতিগ্রস্ত হলে বা ভুল পণ্য এলে তাৎক্ষণিকভাবে রাইডারকে ফেরত দিন। ক্যাশ অন ডেলিভারিতে কোনো পেমেন্ট লাগবে না এবং অনলাইনে প্রিপেইড অর্ডারে পুরো টাকা রিফান্ড করা হবে।"}
              </li>
            </ul>
          </section>

          {/* Section 2: Post-Delivery Issues & Reporting */}
          <section className="space-y-3 border-b border-[#E1B76F]/15 pb-6">
            <div className="flex items-center gap-2.5">
              <span className="text-base font-black text-[#E1B76F] font-serif">02.</span>
              <h3 className="text-base sm:text-lg font-bold text-white font-serif">
                {lang === "en"
                  ? "Post-Delivery Claims & 7-Day Reporting Window"
                  : "ডেলিভারি পরবর্তী অভিযোগ ও ৭ দিনের সময়সীমা"}
              </h3>
            </div>
            <p>
              {lang === "en"
                ? "If you notice an issue after accepting the parcel, please notify ANGKON within 7 calendar days of delivery:"
                : "পার্সেল গ্রহণের পর কোনো সমস্যা চোখে পড়লে ডেলিভারি পাওয়ার পরবর্তী ৭ দিনের মধ্যে আমাদের জানান:"}
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/80">
              <li>
                <strong>{lang === "en" ? "Eligible Issues: " : "যেসকল ক্ষেত্রে প্রযোজ্য: "}</strong>
                {lang === "en"
                  ? "Incorrect size or color supplied, missing accessory/dupatta, weaving defect, zipper malfunction, or significant variance from website descriptions."
                  : "ভুল সাইজ বা রঙ সরবরাহ, ওড়না/অ্যাক্সেসরিজ অনুপস্থিতি, সেলাই বা কাপড়ের ত্রুটি, অথবা ওয়েবসাইটের বর্ণনার সাথে অমিল।"}
              </li>
              <li>
                <strong>{lang === "en" ? "Required Documentation: " : "প্রয়োজনীয় প্রমাণক: "}</strong>
                {lang === "en"
                  ? "Provide your Order Number, contact phone, clear photographs of the garment with tags attached, and packaging photos. While an unboxing video is appreciated for accelerated resolution, legitimate claims are never rejected solely because a video was not recorded."
                  : "অর্ডার নম্বর, যোগাযোগের ফোন নম্বর, ট্যাগসহ পোশাকের স্পষ্ট ছবি এবং প্যাকেজিংয়ের ছবি পাঠান। আনবক্সিং ভিডিও না থাকার কারণে কোনো বৈধ দাবি বাতিল করা হবে না।"}
              </li>
            </ul>
          </section>

          {/* Section 3: Fashion Return & Exchange Eligibility */}
          <section className="space-y-3 border-b border-[#E1B76F]/15 pb-6">
            <div className="flex items-center gap-2.5">
              <span className="text-base font-black text-[#E1B76F] font-serif">03.</span>
              <h3 className="text-base sm:text-lg font-bold text-white font-serif">
                {lang === "en"
                  ? "Return & Exchange Eligibility Conditions"
                  : "পোশাক রিটার্ন ও সাইজ পরিবর্তনের শর্তাবলী"}
              </h3>
            </div>
            <p>
              {lang === "en"
                ? "Due to the artisanal, delicate nature of luxury fabrics, all returned items must meet strict condition standards:"
                : "আমাদের প্রিমিয়াম পোশাকের গুণগত মান রক্ষার্থে রিটার্ন বা এক্সচেঞ্জের ক্ষেত্রে নিম্নোক্ত বিষয়গুলো নিশ্চিত থাকতে হবে:"}
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/80">
              <li>
                <strong>{lang === "en" ? "Pristine Condition: " : "অক্ষত অবস্থা: "}</strong>
                {lang === "en"
                  ? "Garments must be completely unworn, unwashed, free of perfume, makeup, or deodorant marks, and in original pristine folds."
                  : "পোশাক সম্পূর্ণ অব্যবহৃত ও ধোয়াহীন হতে হবে। সুগন্ধি, মেকআপ বা দাগমুক্ত হতে হবে।"}
              </li>
              <li>
                <strong>{lang === "en" ? "Tags & Packaging: " : "ট্যাগ ও প্যাকেজিং: "}</strong>
                {lang === "en"
                  ? "All original hang tags, care labels, brand packaging, and accompanying accessories (tassels, belts, buttons) must be intact."
                  : "সকল ব্র্যান্ড ট্যাগ, নিরাপত্তা লেবেল এবং প্যাকেজিং অক্ষত অবস্থায় থাকতে হবে।"}
              </li>
              <li>
                <strong>{lang === "en" ? "Exclusions: " : "ব্যতিক্রমসমূহ: "}</strong>
                {lang === "en"
                  ? "Custom-tailored ensembles, altered garments, clearance final-sale items, and hygiene-sensitive innerwear cannot be returned or exchanged unless there is an indisputable manufacturing defect."
                  : "কাস্টম সেলাই করা পোশাক, ছাড়মূল্যের অন্তিম বিক্রয় (Final Sale) এবং পরিচ্ছন্নতা সংবেদনশীল পণ্য রিটার্নযোগ্য নয়।"}
              </li>
            </ul>
          </section>

          {/* Section 4: Refund Channels & Timelines */}
          <section className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="text-base font-black text-[#E1B76F] font-serif">04.</span>
              <h3 className="text-base sm:text-lg font-bold text-white font-serif">
                {lang === "en"
                  ? "Refund Execution & Banking Timelines"
                  : "রিফান্ড প্রক্রিয়া ও ব্যাংকিং সময়সীমা"}
              </h3>
            </div>
            <p>
              {lang === "en"
                ? "Once your returned garment is inspected and approved by our quality control team in Dhaka:"
                : "আপনার ফেরত পাঠানো পণ্যটি আমাদের ঢাকা কোয়ালিটি কন্ট্রোল টিমে পৌঁছানোর পর এবং যাচাই সম্পন্ন হলে:"}
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/80">
              <li>
                <strong>{lang === "en" ? "SSLCOMMERZ Online Payments: " : "অনলাইন পেমেন্ট: "}</strong>
                {lang === "en"
                  ? "Reversals are sent directly to the original Visa, Mastercard, AMEX, or bKash/Nagad account. Funds typically reflect within 5–10 business days as per Bangladesh Bank clearing standards."
                  : "মূল কার্ড বা এমএফএস অ্যাকাউন্টে স্বয়ংক্রিয়ভাবে রিফান্ড পাঠানো হয়। বাংলাদেশ ব্যাংকের নিয়ম অনুযায়ী ৫–১০ কার্যদিবসের মধ্যে ব্যালেন্স জমা হয়।"}
              </li>
              <li>
                <strong>{lang === "en" ? "Cash on Delivery (COD) Orders: " : "ক্যাশ অন ডেলিভারি (COD): "}</strong>
                {lang === "en"
                  ? "Refunds for cash orders are disbursed via bKash, Nagad, or direct bank BEFTN/NPSB transfer to the customer's verified personal account within 3–5 business days."
                  : "ক্যাশ অন ডেলিভারির ক্ষেত্রে গ্রাহকের নিজস্ব বিকাশ, নগদ বা ব্যাংক অ্যাকাউন্টে ৩–৫ কার্যদিবসে অর্থ প্রেরণ করা হয়।"}
              </li>
              <li>
                <strong>{lang === "en" ? "Delivery Charges: " : "ডেলিভারি চার্জ: "}</strong>
                {lang === "en"
                  ? "If a return is necessitated by a product defect or shipping error on ANGKON's part, all delivery fees are 100% reimbursed. For customer-initiated size exchanges, a standard delivery fee may apply."
                  : "অংকন-এর ভুলের কারণে রিটার্ন হলে ডেলিভারি চার্জ সম্পূর্ণ ফেরত দেওয়া হয়। গ্রাহক ইচ্ছায় সাইজ পরিবর্তন করতে চাইলে স্ট্যান্ডার্ড ডেলিভারি চার্জ প্রযোজ্য।"}
              </li>
            </ul>
          </section>
        </div>

        {/* ══ 4. OFFICIAL CONTACT & ESCALATION ══ */}
        <div className="rounded-2xl border border-[#E1B76F]/30 bg-[#35060a] p-6 sm:p-8 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#E1B76F]">
            {lang === "en" ? "Direct Client Support & Escalations" : "গ্রাহক সেবা ও যোগাযোগ"}
          </h3>
          <p className="text-xs sm:text-sm text-white/80">
            {lang === "en"
              ? "For instant assistance regarding returns, exchanges, or tracking an active complaint, reach out to our dedicated support concierges:"
              : "রিটার্ন বা এক্সচেঞ্জ সংক্রান্ত যেকোনো সহায়তার জন্য সরাসরি আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন:"}
          </p>

          <div className="grid gap-4 sm:grid-cols-3 pt-2 text-xs">
            <div className="flex items-center gap-3 rounded-xl bg-[#280504] border border-white/5 p-3.5">
              <Phone className="h-4 w-4 text-[#E1B76F] shrink-0" />
              <div>
                <span className="text-[10px] text-white/50 uppercase block">Hotline &amp; WhatsApp</span>
                <a href="https://wa.me/8801338668899" target="_blank" className="font-bold text-white hover:text-[#E1B76F]">
                  +880 1338-668899
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-[#280504] border border-white/5 p-3.5">
              <Mail className="h-4 w-4 text-[#E1B76F] shrink-0" />
              <div>
                <span className="text-[10px] text-white/50 uppercase block">Official Email</span>
                <a href="mailto:angkonofficial08@gmail.com" className="font-bold text-white hover:text-[#E1B76F]">
                  angkonofficial08@gmail.com
                </a>
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

        {/* ══ 5. COMPLIANCE & LEGAL NOTICE ══ */}
        <div className="text-center text-[11px] text-white/50 space-y-1">
          <p>
            {lang === "en"
              ? "This policy is drafted in accordance with the Consumer Rights Protection Act 2009 and the Digital Commerce Operation Guidelines 2021 of Bangladesh."
              : "এই নীতিমালাটি বাংলাদেশের ভোক্তা অধিকার সংরক্ষণ আইন ২০০৯ এবং ডিজিটাল কমার্স পরিচালনা নির্দেশিকা ২০২১ অনুসারে প্রণীত।"}
          </p>
          <p>Version: 2026.1 • Last Updated: November 2026 • ANGKON Luxury Fashion</p>
        </div>
      </div>
    </div>
  );
}
