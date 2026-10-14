"use client";

import Link from "next/link";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  ExternalLink,
  ArrowUpRight,
} from "lucide-react";

// Official Social Media Icons
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298 0 .59.046.87.135V9.41a6.33 6.33 0 0 0-.87-.06A6.34 6.34 0 0 0 3.14 15.7a6.34 6.34 0 0 0 10.82 4.48c.04-.04.08-.07.12-.11.23-.25.43-.53.58-.83.05-.1.09-.2.13-.3.06-.17.11-.34.14-.52.02-.12.04-.24.04-.36V9.01a8.16 8.16 0 0 0 4.62 1.43V7.01c-.01-.11-.01-.22 0-.32z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

const SOCIAL_CHANNELS = [
  {
    name: "Facebook",
    href: "https://www.facebook.com/share/19LUKov4Ei/?mibextid=wwXIfr",
    icon: FacebookIcon,
    label: "Follow ANGKON on Facebook",
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/angkon.officiall?stkn=MTBjcmt5NWhwYzVqYQ==",
    icon: InstagramIcon,
    label: "Follow ANGKON on Instagram",
  },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@angkon.official",
    icon: TikTokIcon,
    label: "Follow ANGKON on TikTok",
  },
  {
    name: "WhatsApp",
    href: "https://wa.me/8801338668899",
    icon: WhatsAppIcon,
    label: "Connect with ANGKON on WhatsApp",
  },
];

const SHOP_LINKS = [
  { label: "New Arrivals & Tawakkal Wada", href: "/products" },
  { label: "Women's Ethnic Collection", href: "/product-category/women" },
  { label: "Men's Heritage Collection", href: "/product-category/men" },
  { label: "Exclusive Accessories", href: "/product-category/accessories" },
  { label: "Festive Offers & Sale", href: "/sale" },
];

const CLIENT_CARE_LINKS = [
  { label: "My Account & Orders", href: "/my-account" },
  { label: "Delivery Timing & Shipping", href: "/delivery-time" },
  { label: "Refund, Trial & Exchange Policy", href: "/refund-and-exchange-policies" },
  { label: "Privacy & Data Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "About ANGKON", href: "/about" },
];

export function Footer() {
  return (
    <footer className="bg-[#1A0302] text-white border-t-2 border-[#E1B76F]/35 selection:bg-[#E1B76F] selection:text-[#1A0302]">

      {/* ── 2. Main 4-Column Luxury Footer Grid ── */}
      <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-[1440px] py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12">
          {/* Column 1: Brand & Social Channels (4 cols on lg) */}
          <div className="lg:col-span-4 space-y-5">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <img
                src="/logo.jpeg"
                alt="ANGKON Logo"
                className="h-12 w-12 rounded-lg border border-[#E1B76F]/40 shadow-lg object-contain group-hover:border-[#E1B76F] transition"
              />
              <div>
                <span className="block font-serif text-2xl font-black uppercase tracking-[0.2em] text-white leading-none">
                  ANGKON
                </span>
              </div>
            </Link>

            <p className="text-[13px] text-white/90 leading-relaxed max-w-sm">
              Discover Bangladesh&apos;s premier ethnic fashion house. Handcrafted luxury lawn ensembles, exquisite artisanal embroidery, and contemporary festive elegance crafted for the discerning wardrobe.
            </p>

            {/* Official Social Media Channels */}
            <div className="pt-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-white mb-3">
                Follow Our Official Channels
              </span>
              <div className="flex items-center gap-3">
                {SOCIAL_CHANNELS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={item.label}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E1B76F]/40 bg-[#280504] text-white hover:bg-[#E1B76F] hover:text-[#1A0302] hover:border-[#E1B76F] hover:scale-110 active:scale-95 transition-all duration-200 shadow-md cursor-pointer"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Column 2: Collections & Shop (2.5 cols on lg) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white font-heading border-b border-[#E1B76F]/25 pb-2">
              Collections
            </h3>
            <ul className="space-y-2.5 text-[13px] text-white/90">
              {SHOP_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="hover:text-[#E1B76F] hover:translate-x-1 inline-block transition-transform duration-150"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Client Experience & Help (2.5 cols on lg) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white font-heading border-b border-[#E1B76F]/25 pb-2">
              Client Care
            </h3>
            <ul className="space-y-2.5 text-[13px] text-white/90">
              {CLIENT_CARE_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="hover:text-[#E1B76F] hover:translate-x-1 inline-block transition-transform duration-150"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Showroom & Inquiries (3 cols on lg) */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white font-heading border-b border-[#E1B76F]/25 pb-2">
              Flagship Showroom & Inquiries
            </h3>

            <div className="space-y-3.5 text-[13px] text-white/90">
              {/* Showroom Address */}
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-[#E1B76F] shrink-0 mt-0.5" />
                <div>
                  <p className="leading-snug text-white/90">
                    H-93, (Ground floor), Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212
                  </p>
                  <a
                    href="https://maps.app.goo.gl/hwrj3KgQ6NdSYp3R8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E1B76F] hover:underline mt-1"
                  >
                    View on Google Maps <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* Phone & WhatsApp */}
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-white shrink-0" />
                <div>
                  <span className="text-[11px] text-white/70 block uppercase">Hotline & WhatsApp</span>
                  <a
                    href="https://wa.me/8801338668899"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-white hover:text-[#f3cb87] transition"
                  >
                    +880 1338-668899
                  </a>
                </div>
              </div>

              {/* Official Email */}
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-white shrink-0" />
                <div>
                  <span className="text-[11px] text-white/70 block uppercase">Official Email Inquiries</span>
                  <a
                    href="mailto:angkonofficial08@gmail.com"
                    className="font-semibold text-white hover:text-[#f3cb87] transition"
                  >
                    angkonofficial08@gmail.com
                  </a>
                </div>
              </div>

              {/* Showroom Timing */}
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-white shrink-0" />
                <div>
                  <span className="text-[11px] text-white/70 block uppercase">Showroom Schedule</span>
                  <span className="text-xs text-white/90">
                    Open 7 Days a Week: 10:00 AM – 10:00 PM
                  </span>
                </div>
              </div>

              {/* Instant WhatsApp Action Button */}
              <div className="pt-2">
                <a
                  href="https://wa.me/8801338668899"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-[#280504] border border-[#E1B76F]/50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#E1B76F] hover:text-[#1A0302] hover:border-[#E1B76F] transition-all shadow-md group"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  <span>Chat with Style Specialist</span>
                  <ExternalLink className="h-3 w-3 opacity-70 group-hover:opacity-100" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Bottom Sub-Footer Bar ── */}
      <div className="bg-[#100101] py-6 border-t border-[#E1B76F]/20">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-[1440px] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/80">
          <p className="text-center md:text-left">
            Copyright © {new Date().getFullYear()}{" "}
            <strong className="text-white">ANGKON</strong>. All Rights Reserved.
          </p>

          {/* Secure Payment & Delivery Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] uppercase font-bold tracking-wider text-white">
            <span className="rounded-md border border-[#E1B76F]/30 bg-[#1A0302] px-2.5 py-1">
              Cash on Delivery
            </span>
            <span className="rounded-md border border-[#E1B76F]/30 bg-[#1A0302] px-2.5 py-1">
              bKash
            </span>
            <span className="rounded-md border border-[#E1B76F]/30 bg-[#1A0302] px-2.5 py-1">
              Nagad
            </span>
            <span className="rounded-md border border-[#E1B76F]/30 bg-[#1A0302] px-2.5 py-1">
              Visa / MasterCard
            </span>
            <span className="rounded-md border border-[#E1B76F] bg-[#E1B76F] text-[#1A0302] px-2.5 py-1 font-black">
              SSLCommerz 100% Secured
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
