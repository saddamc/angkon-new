import { AlertTriangle } from "lucide-react";

export function TopNoticeBanner() {
  return (
    <div className="mb-5 overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-950/25 p-3.5 sm:p-4 text-emerald-200/95 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
          <AlertTriangle className="h-3.5 w-3.5" />
        </div>
        <div className="space-y-1 text-xs sm:text-[13px] leading-relaxed">
          <p className="font-medium text-emerald-100">
            কারিগরি ত্রুটির কারণে পণ্যের মূল্য অসঙ্গতিপূর্ণ হলে, আঙ্কন (ANGKON) কর্তৃপক্ষ অর্ডার বাতিলের অধিকার সংরক্ষণ করে। অনুগ্রহ করে কাস্টমার সাপোর্ট এজেন্টের কনফার্মেশন ব্যতীত কোনো ধরনের পেমেন্ট প্রসিড না করার অনুরোধ করা হচ্ছে।
          </p>
          <p className="text-[11px] sm:text-xs text-emerald-300/80">
            In case of technical price discrepancies, ANGKON reserves the right to cancel the order. Please confirm with customer support before proceeding with manual payments.
          </p>
        </div>
      </div>
    </div>
  );
}
