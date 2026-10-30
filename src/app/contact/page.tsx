import type { Metadata } from "next";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageSquare,
  Send,
  Navigation,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us & Flagship Showroom — ANGKON",
  description:
    "Visit the ANGKON flagship showroom at H-93 (Ground Floor), Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212. Call or WhatsApp +880 1338-668899 or email angkonofficial08@gmail.com.",
};

const MAPS_SHORT_URL = "https://maps.app.goo.gl/hwrj3KgQ6NdSYp3R8";
const MAPS_DIRECTIONS_URL =
  "https://www.google.com/maps/dir/?api=1&destination=Angkon,+H-93(Ground+floor),+Road:2,+Block-A,+Dhaka&destination_place_id=0x3755c700590c6bd1:0xb8c41782ee16f18f";
const MAPS_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1500.0!2d90.4527872!3d23.8585285!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3755c700590c6bd1%3A0xb8c41782ee16f18f!2sAngkon%2C%20H-93(Ground%20floor)%2C%20Road%3A2%2C%20Block-A%2C%20Dhaka!5e0!3m2!1sen!2sbd!4v1710000000000!5m2!1sen!2sbd";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#400604] text-white">
      {/* ── 1. Page Header ── */}
      <div className="border-b border-[#E1B76F]/20 bg-[#340402] py-10 sm:py-14 px-4 text-center">
        <div className="container mx-auto max-w-[1000px]">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-[#E1B76F]">
            <Sparkles className="h-3 w-3" /> Flagship Experience Center & Support
          </span>
          <h1 className="mt-2 font-heading text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
            Visit & Contact ANGKON
          </h1>
          <p className="mt-3 text-[14px] sm:text-[15px] text-white/90 max-w-2xl mx-auto">
            Experience our modern heritage collection in person at our Niketan flagship showroom, or connect directly with our customer concierge team.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-[1240px] px-4 py-8 sm:py-12 lg:px-8 space-y-10 sm:space-y-12">
        {/* ── 2. Flagship Showroom & Live Google Map Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Showroom Details (5 cols on large screens) */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border-2 border-[#E1B76F]/40 bg-[#340402] p-6 sm:p-8 shadow-2xl">
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="inline-block rounded-full bg-[#E1B76F] px-3 py-1 text-[11px] font-black uppercase text-[#400604] tracking-wider shadow">
                  Flagship Showroom
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Open 7 Days
                </span>
              </div>

              <h2 className="font-heading text-2xl sm:text-3xl font-black uppercase text-white tracking-wide mb-2">
                ANGKON Flagship
              </h2>

              <div className="flex items-start gap-2.5 text-white/90 mb-5">
                <MapPin className="h-5 w-5 text-[#E1B76F] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[15px] font-serif leading-relaxed text-white">
                    H-93, (Ground floor), Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212
                  </p>
                  <p className="text-xs text-[#E1B76F]/80 mt-1">
                    Landmark: Near Niketan Gate-1 / Gulshan-1
                  </p>
                </div>
              </div>

              <div className="space-y-3.5 border-t border-[#E1B76F]/20 pt-5 text-[14px]">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-[#E1B76F] shrink-0" />
                  <div>
                    <span className="text-white/70 block text-[11px] uppercase tracking-wider">Showroom Hours</span>
                    <span className="text-white font-medium text-[13px] sm:text-[14px]">
                      Every Day: 10:00 AM – 10:00 PM
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-[#E1B76F] shrink-0" />
                  <div>
                    <span className="text-white/70 block text-[11px] uppercase tracking-wider">Hotline & WhatsApp</span>
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
                  <Mail className="h-5 w-5 text-[#E1B76F] shrink-0" />
                  <div>
                    <span className="text-white/70 block text-[11px] uppercase tracking-wider">Official Inquiries</span>
                    <a
                      href="mailto:angkonofficial08@gmail.com"
                      className="font-bold text-[#E1B76F] hover:underline"
                    >
                      angkonofficial08@gmail.com
                    </a>
                  </div>
                </div>
              </div>

              {/* Social Channels */}
              <div className="mt-5 border-t border-[#E1B76F]/20 pt-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/80 block mb-2.5">
                  Follow Official Handles
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href="https://www.facebook.com/share/19LUKov4Ei/?mibextid=wwXIfr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center rounded-lg border border-[#E1B76F]/40 bg-[#400604] py-1.5 text-xs font-bold text-white hover:bg-[#E1B76F] hover:text-[#400604] transition"
                  >
                    Facebook
                  </a>
                  <a
                    href="https://www.instagram.com/angkon.officiall?stkn=MTBjcmt5NWhwYzVqYQ=="
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center rounded-lg border border-[#E1B76F]/40 bg-[#400604] py-1.5 text-xs font-bold text-white hover:bg-[#E1B76F] hover:text-[#400604] transition"
                  >
                    Instagram
                  </a>
                  <a
                    href="https://www.tiktok.com/@angkon.official"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center rounded-lg border border-[#E1B76F]/40 bg-[#400604] py-1.5 text-xs font-bold text-white hover:bg-[#E1B76F] hover:text-[#400604] transition"
                  >
                    TikTok
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="mt-6 pt-4 border-t border-[#E1B76F]/20 flex flex-col sm:flex-row gap-2.5">
              <a
                href="https://wa.me/8801338668899"
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-[13px] font-bold text-white hover:opacity-95 transition shadow-lg"
              >
                <MessageSquare className="h-4 w-4" />
                Chat on WhatsApp
              </a>
              <a
                href={MAPS_SHORT_URL}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[#E1B76F] bg-[#400604] px-4 py-3 text-[13px] font-bold text-[#E1B76F] hover:bg-[#E1B76F] hover:text-[#400604] transition shadow-md"
              >
                <ExternalLink className="h-4 w-4" />
                Google Maps Pin
              </a>
            </div>
          </div>

          {/* Interactive Google Map Embed Card (7 cols on large screens) */}
          <div className="lg:col-span-7 flex flex-col rounded-2xl border-2 border-[#E1B76F]/40 bg-[#340402] overflow-hidden shadow-2xl">
            {/* Map Top Bar */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#2b0403] border-b border-[#E1B76F]/25">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#E1B76F]" />
                <span className="font-heading font-black text-sm uppercase tracking-wider text-white">
                  Live Showroom Location
                </span>
              </div>
              <span className="text-[11px] font-bold text-[#E1B76F] uppercase tracking-wider">
                Niketan, Gulshan, Dhaka
              </span>
            </div>

            {/* Interactive Google Map Iframe */}
            <div className="relative w-full flex-1 min-h-[360px] sm:min-h-[420px] bg-[#1a0201]">
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

            {/* Map Bottom Actions */}
            <div className="p-4 sm:p-5 bg-[#2b0403] border-t border-[#E1B76F]/25 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-left w-full sm:w-auto">
                <p className="text-xs font-bold text-white">
                  Angkon — H-93 (Ground Floor), Road: 2, Block-A
                </p>
                <p className="text-[11px] text-white/70">
                  Easy parking & accessible entrance inside Niketan residential area.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <a
                  href={MAPS_DIRECTIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#E1B76F] px-4 py-2.5 text-xs font-black uppercase text-[#400604] hover:bg-[#f3cc87] transition shadow-md"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  Get Directions
                </a>
                <a
                  href={MAPS_SHORT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E1B76F]/50 bg-[#400604] px-4 py-2.5 text-xs font-black uppercase text-white hover:bg-[#520805] hover:border-[#E1B76F] transition shadow-md"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open in Maps
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. Quick Message Form & Service Guarantees ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Quick Message Form (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-[#E1B76F]/25 bg-[#340402] p-6 sm:p-8 shadow-xl">
            <h3 className="font-heading text-xl sm:text-2xl font-bold uppercase text-white mb-1">
              Send Us a Message
            </h3>
            <p className="text-[13px] text-white/80 mb-6">
              Have questions about sizes, fabric care, or custom order bookings? Drop us a note and we will reply promptly.
            </p>

            <form className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/80 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Your Name"
                    className="w-full rounded-xl border border-[#E1B76F]/30 bg-[#2d0302] px-4 py-3 text-[14px] text-white placeholder-[#E1B76F]/40 focus:border-[#E1B76F] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/80 mb-1.5">
                    Phone / WhatsApp Number *
                  </label>
                  <input
                    type="tel"
                    placeholder="01XXXXXXXXX"
                    className="w-full rounded-xl border border-[#E1B76F]/30 bg-[#2d0302] px-4 py-3 text-[14px] text-white placeholder-[#E1B76F]/40 focus:border-[#E1B76F] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/80 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="you@domain.com"
                  className="w-full rounded-xl border border-[#E1B76F]/30 bg-[#2d0302] px-4 py-3 text-[14px] text-white placeholder-[#E1B76F]/40 focus:border-[#E1B76F] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/80 mb-1.5">
                  Your Message or Inquiry *
                </label>
                <textarea
                  rows={4}
                  placeholder="How can our customer concierge team assist you today?"
                  className="w-full rounded-xl border border-[#E1B76F]/30 bg-[#2d0302] px-4 py-3 text-[14px] text-white placeholder-[#E1B76F]/40 focus:border-[#E1B76F] focus:outline-none"
                  required
                />
              </div>

              <button
                type="button"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#400604] border border-[#E1B76F]/60 py-3.5 text-[14px] font-black uppercase text-white hover:bg-[#520805] hover:border-[#E1B76F] transition shadow-md"
              >
                <Send className="h-4 w-4" />
                Submit Message
              </button>
            </form>
          </div>

          {/* Service Highlights (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#340402] p-6 shadow-xl space-y-4">
              <h4 className="font-heading text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#E1B76F]" /> Showroom Services
              </h4>
              <p className="text-xs text-white/80 leading-relaxed">
                Enjoy a personalized VIP shopping experience inside our flagship studio:
              </p>
              <ul className="space-y-3 text-xs text-white/90">
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#E1B76F] mt-1.5 shrink-0" />
                  <span><strong>Complimentary Styling Consultation:</strong> Our stylists assist you in selecting the ideal outfit and silhouette.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#E1B76F] mt-1.5 shrink-0" />
                  <span><strong>Fabric Feel & Trial Room:</strong> Touch the authentic silk, muslin, and cotton weaves in person.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#E1B76F] mt-1.5 shrink-0" />
                  <span><strong>On-the-spot Exchange:</strong> Swap online orders directly at our showroom counter within 7 days.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[#E1B76F]/25 bg-[#340402] p-6 shadow-xl space-y-3">
              <h4 className="font-heading text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#E1B76F]" /> Nationwide Delivery Support
              </h4>
              <p className="text-xs text-white/80 leading-relaxed">
                Cash on delivery across all 64 districts in Bangladesh with real-time dispatch tracking.
              </p>
              <div className="flex items-center gap-2 pt-1 text-xs text-[#E1B76F] font-bold">
                <RotateCcw className="h-3.5 w-3.5" /> 7-day hassle-free exchange policy
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
