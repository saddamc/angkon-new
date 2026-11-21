"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  FileCheck,
  Scissors,
  HelpCircle,
} from "lucide-react";

export default function WarrantyPolicyPage() {
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
                {lang === "en" ? "Warranty & Quality Policy" : "ওয়ারেন্টি ও গুণগত মান নীতিমালা"}
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
              {lang === "en" ? "Fashion Craftsmanship Assurance" : "অভিজাত পোশাকের গুণগত নিশ্চয়তা"}
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
              {lang === "en" ? "Warranty & Quality Policy" : "ওয়ারেন্টি ও গুণগত মান নীতিমালা"}
            </h1>
            <p className="text-xs sm:text-sm text-white/80 max-w-2xl leading-relaxed">
              {lang === "en"
                ? "Every ANGKON creation reflects artisanal mastery, handloom heritage, and exquisite textile engineering. Learn about our manufacturing quality commitment and defect protection."
                : "অংকন-এর প্রতিটি পোশাকে রয়েছে নিখুঁত কারিগরি দক্ষতা, ঐতিহ্যবাহী তাঁতশিল্প এবং প্রিমিয়াম কাপড়ের নিশ্চয়তা। আমাদের উৎপাদনগত ত্রুটির সুরক্ষা নীতিমালা সম্পর্কে বিস্তারিত জানুন।"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Main Content Container ── */}
      <div className="max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 space-y-10">
        {/* ══ 1. CRAFTSMANSHIP GUARANTEE BANNER ══ */}
        <div className="rounded-2xl border border-[#E1B76F]/40 bg-gradient-to-r from-[#280504] via-[#3a060a] to-[#280504] p-6 sm:p-8 shadow-xl shadow-black/25">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#E1B76F]/20 text-[#E1B76F] border border-[#E1B76F]/40 shadow-md">
              <Sparkles className="h-7 w-7" />
            </span>
            <div className="space-y-1.5 flex-1">
              <span className="rounded-full bg-[#E1B76F]/20 border border-[#E1B76F]/40 px-3 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-[#E1B76F] inline-block">
                {lang === "en" ? "Authenticity & Heritage" : "খাঁটি পণ্য ও ঐতিহ্যের নিশ্চয়তা"}
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-black uppercase text-white tracking-wide">
                {lang === "en"
                  ? "Artisanal Craftsmanship & Quality Standards"
                  : "কারিগরী দক্ষতা ও প্রিমিয়াম মানদণ্ড"}
              </h2>
              <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
                {lang === "en"
                  ? "ANGKON specializes in luxury lawn, festive ethnic wear, and artisanal embroidery. As fashion and textile products, our warranty specifically covers genuine manufacturing defects present at the time of delivery, ensuring you receive what you paid for."
                  : "অংকন প্রিমিয়াম লন, উৎসবের পোশাক ও কারুকাজে সমৃদ্ধ পোশাকে বিশেষায়িত। আমাদের ওয়ারেন্টি ডেলিভারির সময় উপস্থিত যে কোনো উৎপাদনগত ত্রুটির ক্ষেত্রে পূর্ণ সুরক্ষা প্রদান করে।"}
              </p>
            </div>
          </div>
        </div>

        {/* ══ 2. WHAT IS COVERED VS EXCLUDED ══ */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Covered */}
          <div className="rounded-2xl border border-emerald-500/30 bg-[#280504] p-6 space-y-4 shadow-md">
            <div className="flex items-center gap-2.5 text-emerald-400">
              <ShieldCheck className="h-5 w-5 shrink-0" />
              <h3 className="text-base font-bold text-white font-serif">
                {lang === "en" ? "What Is Covered" : "যা অন্তর্ভুক্ত"}
              </h3>
            </div>
            <p className="text-xs text-white/70">
              {lang === "en"
                ? "Manufacturing defects reported within our inspection & reporting window:"
                : "পরিদর্শন ও রিপোর্ট করার নির্ধারিত সময়সীমার মধ্যে নিম্নলিখিত ত্রুটিসমূহ:"}
            </p>
            <ul className="space-y-2.5 text-xs text-white/80">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>{lang === "en" ? "Seam & Stitching Failures: " : "সেলাইয়ের ত্রুটি: "}</strong>
                  {lang === "en"
                    ? "Open seams, loose tailoring threads, or structural seam detachment present upon delivery."
                    : "ডেলিভারির সময় খোলা সেলাই, সুতা খুলে যাওয়া বা সেলাইয়ের অসম্পূর্ণতা।"}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>{lang === "en" ? "Hardware Deficiencies: " : "হার্ডওয়্যার সমস্যা: "}</strong>
                  {lang === "en"
                    ? "Defective zippers, broken hooks, missing buttons, or detached embellishments on brand new unworn items."
                    : "নতুন পোশাকে ভাঙা চেইন, হুক অনুপস্থিতি বা আলগা হয়ে যাওয়া বাটন/এমবেলিশমেন্ট।"}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>{lang === "en" ? "Textile Weaving Flaws: " : "কাপড়ের বুননগত ত্রুটি: "}</strong>
                  {lang === "en"
                    ? "Significant weaving holes, missed loom threads, or dye misprints not part of the intentional artisanal design."
                    : "কাপড়ে ফুটো, বুননে বড় ধরনের ত্রুটি বা অনাকাঙ্ক্ষিত ছোপ/রঙের অসংগতি।"}
                </span>
              </li>
            </ul>
          </div>

          {/* Excluded */}
          <div className="rounded-2xl border border-rose-500/30 bg-[#280504] p-6 space-y-4 shadow-md">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <h3 className="text-base font-bold text-white font-serif">
                {lang === "en" ? "What Is Not Covered" : "যা অন্তর্ভুক্ত নয়"}
              </h3>
            </div>
            <p className="text-xs text-white/70">
              {lang === "en"
                ? "Damage resulting from wear, external elements, or incorrect fabric maintenance:"
                : "ব্যবহারজনিত ক্ষতি, ভুল ধোলাই বা বাহ্যিক কারণে সৃষ্ট সমস্যা:"}
            </p>
            <ul className="space-y-2.5 text-xs text-white/80">
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-black text-sm shrink-0 leading-none mt-0.5">✕</span>
                <span>
                  <strong>{lang === "en" ? "Improper Laundering: " : "ভুল ওয়াশিং পদ্ধতি: "}</strong>
                  {lang === "en"
                    ? "Shrinkage, dye bleed, or fabric damage resulting from hot water washing, machine drying, bleaching, or ignoring Dry-Clean-Only instructions."
                    : "ব্লিচ ব্যবহার, ড্রায়ার বা ড্রাই-ক্লিন লেবেল অমান্য করে গরম পানিতে ধোয়ার কারণে ক্ষতি।"}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-black text-sm shrink-0 leading-none mt-0.5">✕</span>
                <span>
                  <strong>{lang === "en" ? "Snags & Friction: " : "ঘর্ষণজনিত ক্ষতি: "}</strong>
                  {lang === "en"
                    ? "Fabric snags, thread pulls, or embroidery tears caused by rough jewelry, bag friction, or accidental sharp contact after delivery."
                    : "গয়নার সাথে আটকে সুতা টানা পড়া, ব্যাগের ঘর্ষণ বা ধারালো বস্তুর সংস্পর্শে আসা।"}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-black text-sm shrink-0 leading-none mt-0.5">✕</span>
                <span>
                  <strong>{lang === "en" ? "Post-Delivery Alterations: " : "তৃতীয় পক্ষ দ্বারা পরিবর্তন: "}</strong>
                  {lang === "en"
                    ? "Garments cut, tailored, or altered by an outside tailor void all quality warranties."
                    : "বাইরের টেইলার দ্বারা কাটিং বা অল্টারেশন করা পোশাকে ওয়ারেন্টি কার্যকর নয়।"}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* ══ 3. WARRANTY CLAIM PROCEDURE ══ */}
        <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#3b050b] p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2.5">
            <FileCheck className="h-5 w-5 text-[#E1B76F]" />
            <h3 className="text-base sm:text-lg font-bold text-white font-serif">
              {lang === "en" ? "How to Submit a Quality Claim" : "ত্রুটিজনিত দাবি জানানোর নিয়ম"}
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 text-xs">
            <div className="rounded-xl bg-[#280504] border border-white/5 p-4 space-y-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E1B76F] text-[#230407] font-black text-xs">
                1
              </span>
              <h4 className="font-bold text-white">{lang === "en" ? "Step 1: Contact Support" : "১ম ধাপ: যোগাযোগ"}</h4>
              <p className="text-white/70 leading-relaxed">
                {lang === "en"
                  ? "Reach out on WhatsApp (+880 1338-668899) with your Order Number and phone."
                  : "অর্ডার নম্বর ও ফোন নম্বর সহ আমাদের হোয়াটসঅ্যাপে মেসেজ দিন।"}
              </p>
            </div>

            <div className="rounded-xl bg-[#280504] border border-white/5 p-4 space-y-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E1B76F] text-[#230407] font-black text-xs">
                2
              </span>
              <h4 className="font-bold text-white">{lang === "en" ? "Step 2: Share Photos" : "২য় ধাপ: ছবি প্রদান"}</h4>
              <p className="text-white/70 leading-relaxed">
                {lang === "en"
                  ? "Send high-resolution photos highlighting the specific seam, zipper, or fabric defect."
                  : "পোশাকের ত্রুটিপূর্ণ অংশের স্পষ্ট ও পরিষ্কার ছবি প্রেরণ করুন।"}
              </p>
            </div>

            <div className="rounded-xl bg-[#280504] border border-white/5 p-4 space-y-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E1B76F] text-[#230407] font-black text-xs">
                3
              </span>
              <h4 className="font-bold text-white">{lang === "en" ? "Step 3: Rapid Resolution" : "৩য় ধাপ: সমাধান"}</h4>
              <p className="text-white/70 leading-relaxed">
                {lang === "en"
                  ? "Our QA team verifies the issue within 24 hours to arrange an exchange, repair, or full refund."
                  : "২৪ ঘণ্টার মধ্যে যাচাই করে বিনামূল্যে নতুন পিস বা রিফান্ড নিশ্চিত করা হবে।"}
              </p>
            </div>
          </div>
        </div>

        {/* ══ 4. OFFICIAL CONTACT & SHOWROOM ══ */}
        <div className="rounded-2xl border border-[#E1B76F]/30 bg-[#280504] p-6 sm:p-8 space-y-3 text-xs sm:text-sm text-white/80">
          <h4 className="font-bold text-white uppercase tracking-wider text-xs text-[#E1B76F]">
            {lang === "en" ? "ANGKON Quality Concierge" : "অংকন কোয়ালিটি কন্ট্রোল টিম"}
          </h4>
          <p>
            {lang === "en"
              ? "Flagship Showroom: H-93, (Ground floor), Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212 • Hotline: +880 1338-668899"
              : "ফ্ল্যাগশিপ শোরুম: বাড়ি-৯৩, রোড-২, ব্লক-এ, নিকেতন, গুলশান, ঢাকা-১২১২ • হটলাইন: +৮৮০ ১৩৩৮-৬৬৮৮৯৯"}
          </p>
        </div>
      </div>
    </div>
  );
}
