import type { Metadata } from "next";
import { MapPin, Phone, Mail, Clock, MessageSquare, Send } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us & Showroom Location — ANGKON",
  description: "Visit our showroom at HOUSE OF MODERN HERITAGE, Niketan, Gulshan, Dhaka. Call or WhatsApp +880 1338-668899.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#400604] text-[#E1B76F]">
      <div className="border-b border-[#5c0f0d] bg-[#2b0403] py-12 px-4 text-center">
        <div className="container mx-auto max-w-[1000px]">
          <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#cbb18a]">
            Customer Support & Showroom
          </span>
          <h1 className="mt-2 font-heading text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#E1B76F]">
            Contact ANGKON
          </h1>
          <p className="mt-3 text-[14px] sm:text-[15px] text-[#cbb18a]">
            We are here to assist with size inquiries, custom fits, and order status updates.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-[1200px] px-4 py-12 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Showroom Details */}
          <div className="space-y-6">
            <div className="rounded-2xl border-2 border-[#E1B76F]/40 bg-[#2b0403] p-8 shadow-xl">
              <span className="inline-block rounded-full bg-[#E1B76F] px-3 py-1 text-[11px] font-black uppercase text-[#400604] mb-4">
                Flagship Experience Center
              </span>
              
              <h2 className="font-heading text-2xl font-black uppercase text-[#E1B76F] tracking-wide mb-2">
                HOUSE OF MODERN HERITAGE
              </h2>
              
              <p className="text-[15px] text-[#f5ebd8] leading-relaxed mb-6 font-serif">
                H-93, (Ground floor), Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212
              </p>

              <div className="space-y-4 border-t border-[#5c0f0d] pt-6 text-[14px]">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-[#E1B76F] shrink-0" />
                  <div>
                    <span className="text-[#cbb18a] block text-xs uppercase">WhatsApp & Hotline</span>
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
                    <span className="text-[#cbb18a] block text-xs uppercase">Official Inquiries</span>
                    <a
                      href="mailto:angkonofficial08@gmail.com"
                      className="font-bold text-[#E1B76F] hover:underline"
                    >
                      angkonofficial08@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-[#E1B76F] shrink-0" />
                  <div>
                    <span className="text-[#cbb18a] block text-xs uppercase">Showroom Hours</span>
                    <span className="text-[#f5ebd8] font-medium">
                      Open 7 Days a Week: 10:00 AM – 10:00 PM
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <a
                  href="https://wa.me/8801338668899"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-[14px] font-bold text-black hover:opacity-95 transition shadow-lg"
                >
                  <MessageSquare className="h-4 w-4" />
                  Chat on WhatsApp
                </a>
                <a
                  href="https://maps.google.com/?q=H-93,+Road+2,+Block+A,+Niketan,+Gulshan,+Dhaka-1212"
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[#E1B76F] bg-[#400604] px-5 py-3 text-[14px] font-bold text-[#E1B76F] hover:bg-[#E1B76F] hover:text-[#400604] transition"
                >
                  <MapPin className="h-4 w-4" />
                  Open in Google Maps
                </a>
              </div>
            </div>
          </div>

          {/* Quick Message Form */}
          <div className="rounded-2xl border border-[#5c0f0d] bg-[#2b0403] p-8 shadow-xl">
            <h3 className="font-heading text-xl font-bold uppercase text-[#E1B76F] mb-2">
              Send Us a Message
            </h3>
            <p className="text-[13px] text-[#cbb18a] mb-6">
              Our customer happiness team will respond to your inquiry within 24 hours.
            </p>

            <form className="space-y-4">
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wider text-[#cbb18a] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Your Name"
                  className="w-full rounded-xl border border-[#5c0f0d] bg-[#400604] px-4 py-3 text-[14px] text-[#f5ebd8] placeholder-[#8c6b4b] focus:border-[#E1B76F] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wider text-[#cbb18a] mb-1">
                  Phone / WhatsApp Number
                </label>
                <input
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  className="w-full rounded-xl border border-[#5c0f0d] bg-[#400604] px-4 py-3 text-[14px] text-[#f5ebd8] placeholder-[#8c6b4b] focus:border-[#E1B76F] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wider text-[#cbb18a] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="you@domain.com"
                  className="w-full rounded-xl border border-[#5c0f0d] bg-[#400604] px-4 py-3 text-[14px] text-[#f5ebd8] placeholder-[#8c6b4b] focus:border-[#E1B76F] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wider text-[#cbb18a] mb-1">
                  Your Message or Inquiry
                </label>
                <textarea
                  rows={4}
                  placeholder="How can we assist you today?"
                  className="w-full rounded-xl border border-[#5c0f0d] bg-[#400604] px-4 py-3 text-[14px] text-[#f5ebd8] placeholder-[#8c6b4b] focus:border-[#E1B76F] focus:outline-none"
                  required
                />
              </div>

              <button
                type="button"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#E1B76F] py-3.5 text-[14px] font-black uppercase text-[#400604] hover:bg-[#f3cb87] transition shadow-md"
              >
                <Send className="h-4 w-4" />
                Submit Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
