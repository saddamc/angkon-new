import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Award, Shield, HeartHandshake, Phone, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us — HOUSE OF MODERN HERITAGE | ANGKON",
  description: "Discover ANGKON, Bangladesh's modern heritage fashion house bridging tradition and contemporary street aesthetics.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#400604] text-white">
      {/* Hero Header */}
      <div className="border-b border-[#5c0f0d] bg-[#2b0403] py-16 px-4 text-center">
        <div className="container mx-auto max-w-[900px]">
          <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/70">
            Our Identity & Philosophy
          </span>
          <h1 className="mt-3 font-heading text-4xl sm:text-6xl font-black uppercase tracking-tight text-white">
            House of Modern Heritage
          </h1>
          <p className="mt-4 text-[15px] sm:text-[17px] text-white max-w-2xl mx-auto leading-relaxed font-serif">
            ANGKON is where the deep artisanal textile roots of Bengal meet modern silhouettes, bold tailoring, and timeless craftsmanship.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-[1200px] px-4 py-16 lg:px-8 space-y-16">
        {/* The Vision & Core Standards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-white block mb-2">
              The Vision
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-black uppercase text-white leading-tight mb-4">
              Revitalizing Heritage Fabrics for Everyday Modern Living
            </h2>
            <p className="text-[14px] text-white/90 leading-relaxed mb-4">
              Founded on the belief that everyday wear should feel luxurious yet effortless, ANGKON produces limited-edition apparel, breathable resort shirts, premium waffle henleys, structured denim, and signature knitted polos.
            </p>
            <p className="text-[14px] text-white/90 leading-relaxed">
              Every garment is designed, woven, cut, and stitched with rigorous attention to detail right here in Bangladesh.
            </p>
          </div>

          <div className="rounded-2xl border-2 border-[#E1B76F]/30 bg-[#340402] p-8 shadow-2xl space-y-6">
            <h3 className="font-heading text-xl font-bold uppercase text-white">
              The Core Standards
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-white shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[14px] text-white">100% Breathable Natural Fibers</h4>
                  <p className="text-xs text-white/90">Combed cottons, waffle textures, linen blends suited for tropical weather.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Award className="h-5 w-5 text-white shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[14px] text-white">Pre-Shrunk & Color-Fast</h4>
                  <p className="text-xs text-white/90">Enzyme-washed so your favorite piece retains its fit and vivid tone wash after wash.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-white shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[14px] text-white">Ethical Production</h4>
                  <p className="text-xs text-white/90">Fair wages, safe workspaces, and mindful manufacturing across our facilities.</p>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Showroom & Contact Box */}
        <div className="rounded-2xl border-2 border-[#E1B76F]/40 bg-[#340402] p-8 sm:p-10 text-center space-y-6 shadow-2xl">
          <span className="inline-block rounded-full bg-[#E1B76F] px-4 py-1 text-xs font-black uppercase text-[#400604]">
            Flagship Experience Center
          </span>
          <h3 className="font-heading text-3xl sm:text-4xl font-black uppercase text-white">
            HOUSE OF MODERN HERITAGE
          </h3>
          <p className="text-[15px] sm:text-[17px] text-white/90 max-w-xl mx-auto font-serif">
            H-93, (Ground floor), Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs sm:text-sm text-white/90">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-white" />
              <span>WhatsApp / Hotline: <strong className="text-white">+880 1338-668899</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-white" />
              <span>Email: <strong className="text-white">angkonofficial08@gmail.com</strong></span>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex rounded-xl bg-[#400604] border border-[#E1B76F]/50 px-8 py-3 text-xs font-black uppercase text-white hover:bg-[#520805] hover:border-[#E1B76F] transition shadow-md"
            >
              Get In Touch
            </Link>
            <Link
              href="/products"
              className="inline-flex rounded-xl border border-[#E1B76F]/50 bg-[#340402] px-8 py-3 text-xs font-black uppercase text-white hover:bg-[#400604] hover:text-white transition"
            >
              Explore Current Drops
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
