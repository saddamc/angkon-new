import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  Award,
  Shield,
  Phone,
  Mail,
  MapPin,
  Clock,
  Navigation,
  ExternalLink,
  MessageSquare,
  Car,
  CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Us & Flagship Showroom — HOUSE OF MODERN HERITAGE | ANGKON",
  description:
    "Discover ANGKON, Bangladesh's modern heritage fashion house bridging tradition and contemporary street aesthetics. Visit our flagship showroom in Niketan, Gulshan, Dhaka.",
};

const MAPS_SHORT_URL = "https://maps.app.goo.gl/hwrj3KgQ6NdSYp3R8";
const MAPS_DIRECTIONS_URL =
  "https://www.google.com/maps/dir/?api=1&destination=Angkon,+H-93(Ground+floor),+Road:2,+Block-A,+Dhaka&destination_place_id=0x3755c700590c6bd1:0xb8c41782ee16f18f";
// High-precision street-level zoom (1d1500) centered directly on Angkon Showroom pin
const MAPS_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1500.0!2d90.4527872!3d23.8585285!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3755c700590c6bd1%3A0xb8c41782ee16f18f!2sAngkon%2C%20H-93(Ground%20floor)%2C%20Road%3A2%2C%20Block-A%2C%20Dhaka!5e0!3m2!1sen!2sbd!4v1710000000000!5m2!1sen!2sbd";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#400604] text-white">
      {/* ── 1. Hero Header ── */}
      <div className="border-b border-[#5c0f0d] bg-[#2b0403] py-14 sm:py-20 px-4 text-center">
        <div className="container mx-auto max-w-[950px]">
          <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#E1B76F]">
            Our Identity & Philosophy
          </span>
          <h1 className="mt-3 font-heading text-4xl sm:text-6xl font-black uppercase tracking-tight text-white">
            House of Modern Heritage
          </h1>
          <p className="mt-4 text-[15px] sm:text-[17px] text-white/90 max-w-2xl mx-auto leading-relaxed font-serif">
            ANGKON is where the deep artisanal textile roots of Bengal meet modern silhouettes, bold tailoring, and timeless craftsmanship.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-[1240px] px-4 py-12 sm:py-16 lg:px-8 space-y-16">
        {/* ── 2. The Vision & Core Standards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#E1B76F] block mb-2">
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
            <h3 className="font-heading text-xl font-bold uppercase text-white tracking-wide">
              The Core Standards
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-[#E1B76F] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[14px] text-white">100% Breathable Natural Fibers</h4>
                  <p className="text-xs text-white/85">Combed cottons, waffle textures, and linen blends suited for tropical elegance.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Award className="h-5 w-5 text-[#E1B76F] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[14px] text-white">Pre-Shrunk & Color-Fast</h4>
                  <p className="text-xs text-white/85">Enzyme-washed so your favorite piece retains its tailored fit and vivid tone wash after wash.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-[#E1B76F] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[14px] text-white">Ethical Production</h4>
                  <p className="text-xs text-white/85">Fair wages, safe workspaces, and mindful manufacturing across our artisan facilities.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. WORLD-CLASS FLAGSHIP SHOWROOM & LIVE GOOGLE MAP SHOWCASE ── */}
        <div className="space-y-6 pt-4">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#E1B76F]">
              Experience In Person
            </span>
            <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-black uppercase text-white tracking-tight">
              Visit The Flagship Showroom
            </h2>
            <p className="mt-2 text-sm text-white/80">
              Step inside our flagship experience center in Niketan, Gulshan. Feel the textures, explore custom fittings, and experience modern heritage fashion up close.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Showroom Card (5 columns) */}
            <div className="lg:col-span-5 rounded-2xl border-2 border-[#E1B76F]/40 bg-[#340402] p-6 sm:p-8 flex flex-col justify-between shadow-2xl">
              <div className="space-y-5">
                {/* Header Badges */}
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-block rounded-full bg-[#E1B76F] px-3.5 py-1 text-[11px] font-black uppercase text-[#400604] tracking-wider shadow">
                    Flagship Experience Center
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold bg-emerald-950/70 border border-emerald-500/30 px-3 py-0.5 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Open 7 Days
                  </span>
                </div>

                {/* Showroom Title */}
                <div>
                  <h3 className="font-heading text-2xl sm:text-3xl font-black uppercase text-white tracking-wide">
                    ANGKON Showroom
                  </h3>
                  <span className="text-xs text-[#E1B76F] font-bold tracking-widest uppercase">
                    House of Modern Heritage
                  </span>
                </div>

                {/* Address */}
                <div className="flex items-start gap-3 rounded-xl bg-[#280504] border border-[#E1B76F]/20 p-4">
                  <MapPin className="h-5 w-5 text-[#E1B76F] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[15px] font-serif leading-relaxed text-white">
                      H-93, (Ground floor), Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212
                    </p>
                    <p className="text-xs text-[#E1B76F]/80 flex items-center gap-1">
                      <Car className="h-3 w-3 shrink-0" /> Near Niketan Gate-1 / Gulshan-1 · Parking Available
                    </p>
                  </div>
                </div>

                {/* Operating Hours & Contacts */}
                <div className="space-y-3 border-t border-[#E1B76F]/20 pt-4 text-[13px] text-white/90">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-[#E1B76F] shrink-0" />
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-white/70 block">Showroom Hours</span>
                      <span className="font-semibold text-white">Every Day: 10:00 AM – 10:00 PM</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-[#E1B76F] shrink-0" />
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-white/70 block">Hotline & WhatsApp</span>
                      <a
                        href="https://wa.me/8801338668899"
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-[#E1B76F] hover:underline"
                      >
                        +880 1338-668899
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-[#E1B76F] shrink-0" />
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-white/70 block">Official Inquiries</span>
                      <a
                        href="mailto:angkonofficial08@gmail.com"
                        className="font-medium text-white hover:text-[#E1B76F] transition"
                      >
                        angkonofficial08@gmail.com
                      </a>
                    </div>
                  </div>
                </div>

                {/* VIP Perks */}
                <div className="border-t border-[#E1B76F]/20 pt-4 space-y-2 text-xs text-white/80">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#E1B76F] shrink-0" />
                    <span>Complimentary personalized styling & sizing guidance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#E1B76F] shrink-0" />
                    <span>Instant 7-day in-store exchange for online orders</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-5 border-t border-[#E1B76F]/20 flex flex-col sm:flex-row gap-2.5">
                <a
                  href={MAPS_DIRECTIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#E1B76F] px-4 py-3 text-xs font-black uppercase text-[#400604] hover:bg-[#f3cc87] transition shadow-lg"
                >
                  <Navigation className="h-4 w-4" />
                  Get Directions
                </a>
                <a
                  href={MAPS_SHORT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[#E1B76F] bg-[#400604] px-4 py-3 text-xs font-black uppercase text-[#E1B76F] hover:bg-[#E1B76F] hover:text-[#400604] transition shadow-md"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in Maps
                </a>
                <a
                  href="https://wa.me/8801338668899"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-[#25D366] px-3.5 py-3 text-white hover:opacity-95 transition shadow-lg"
                  aria-label="Chat on WhatsApp"
                >
                  <MessageSquare className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Right Map Card with High-Precision Street-Level Zoom (7 columns) */}
            <div className="lg:col-span-7 rounded-2xl border-2 border-[#E1B76F]/40 bg-[#340402] overflow-hidden shadow-2xl flex flex-col">
              {/* Map Top Bar */}
              <div className="flex items-center justify-between px-5 py-3 bg-[#2b0403] border-b border-[#E1B76F]/25">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#E1B76F] animate-ping" />
                  <span className="font-heading font-black text-xs sm:text-sm uppercase tracking-wider text-white">
                    Live GPS Showroom Pin
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#E1B76F] uppercase tracking-wider">
                  Niketan · Gulshan-1 · Dhaka
                </span>
              </div>

              {/* High-Precision Google Maps Embed */}
              <div className="relative w-full flex-1 min-h-[380px] sm:min-h-[460px] bg-[#1a0201]">
                <iframe
                  title="ANGKON Flagship Showroom Google Maps Location"
                  src={MAPS_EMBED_URL}
                  width="100%"
                  height="100%"
                  className="w-full h-full border-0 absolute inset-0"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

              {/* Map Footer Bar */}
              <div className="px-5 py-3.5 bg-[#2b0403] border-t border-[#E1B76F]/25 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-white/80">
                  <strong className="text-white">ANGKON Flagship Experience Center</strong> — H-93, Road 2, Block-A, Niketan
                </p>
                <a
                  href={MAPS_SHORT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E1B76F] hover:underline"
                >
                  View full map on Google <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. Bottom CTAs ── */}
        <div className="pt-6 border-t border-[#E1B76F]/20 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/products"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-[#E1B76F] px-8 py-3.5 text-xs font-black uppercase text-[#400604] hover:bg-[#f3cc87] transition shadow-lg"
          >
            Explore Current Drops
          </Link>
          <Link
            href="/contact"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-[#E1B76F]/60 bg-[#340402] px-8 py-3.5 text-xs font-black uppercase text-white hover:bg-[#400604] hover:border-[#E1B76F] transition shadow-md"
          >
            Get In Touch
          </Link>
        </div>
      </div>
    </div>
  );
}
