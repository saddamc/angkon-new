import type { Metadata } from "next";
import { ShieldCheck, FileCheck, Building2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Legal Information & Licenses — ANGKON",
  description: "Official statutory credentials, trade license, and digital e-commerce compliance documents for ANGKON.",
};

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-[#400604] text-[#E1B76F]">
      <div className="border-b border-[#5c0f0d] bg-[#2b0403] py-12 px-4 text-center">
        <div className="container mx-auto max-w-[900px]">
          <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#cbb18a]">
            Statutory Transparency
          </span>
          <h1 className="mt-2 font-heading text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#E1B76F]">
            Legal Information
          </h1>
          <p className="mt-3 text-[14px] sm:text-[15px] text-[#cbb18a] max-w-2xl mx-auto">
            As per Digital E-commerce Policy 2021 published by the Commerce Ministry of Bangladesh under clause 3.1.12, the statutory Trade Licence and compliance certifications are maintained here.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-[1100px] px-4 py-12 lg:px-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-6 shadow-xl text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#400604] text-[#E1B76F] mx-auto border border-[#5c0f0d]">
              <FileCheck className="h-6 w-6" />
            </div>
            <h3 className="font-heading text-lg font-bold text-[#E1B76F]">Trade License</h3>
            <p className="text-xs text-[#cbb18a]">
              Dhaka North City Corporation Commercial Registry
            </p>
            <div className="bg-[#400604] p-2.5 rounded-lg border border-[#5c0f0d] text-[12px] font-mono text-[#f5ebd8]">
              TRAD/DNCC/033187/2024
            </div>
          </div>

          <div className="rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-6 shadow-xl text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#400604] text-[#E1B76F] mx-auto border border-[#5c0f0d]">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="font-heading text-lg font-bold text-[#E1B76F]">VAT & BIN Number</h3>
            <p className="text-xs text-[#cbb18a]">
              National Board of Revenue (NBR) Value Added Tax
            </p>
            <div className="bg-[#400604] p-2.5 rounded-lg border border-[#5c0f0d] text-[12px] font-mono text-[#f5ebd8]">
              BIN: 004255476-0102
            </div>
          </div>

          <div className="rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-6 shadow-xl text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#400604] text-[#E1B76F] mx-auto border border-[#5c0f0d]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="font-heading text-lg font-bold text-[#E1B76F]">E-TIN Certificate</h3>
            <p className="text-xs text-[#cbb18a]">
              Income Tax Authority of Bangladesh
            </p>
            <div className="bg-[#400604] p-2.5 rounded-lg border border-[#5c0f0d] text-[12px] font-mono text-[#f5ebd8]">
              e-TIN: 194592642159
            </div>
          </div>
        </div>

        {/* Corporate Office & Showroom Details */}
        <div className="rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-8 space-y-4">
          <h2 className="font-heading text-xl font-bold uppercase text-[#E1B76F]">
            Corporate Office & Showroom Registry
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[14px] text-[#cbb18a]">
            <div>
              <strong className="block text-[#E1B76F] uppercase mb-1">Flagship Showroom</strong>
              <p className="text-[#f5ebd8] font-serif">
                ANGKON Flagship Showroom<br />
                H-93, (Ground floor), Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212
              </p>
            </div>
            <div>
              <strong className="block text-[#E1B76F] uppercase mb-1">Official Communication</strong>
              <p className="text-[#f5ebd8]">
                Hotline & WhatsApp: +880 1338-668899<br />
                Email: angkonofficial08@gmail.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
