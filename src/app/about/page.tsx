import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Award, Shield, HeartHandshake, Play, ExternalLink, MapPin, Phone, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us — HOUSE OF MODERN HERITAGE | ANGKON",
  description: "Discover ANGKON, Bangladesh's modern heritage fashion house bridging tradition and contemporary street aesthetics.",
};

const FEATURED_PRESS = [
  {
    name: "Prothom Alo",
    tagline: "Fashion & Lifestyle Feature",
    url: "https://www.prothomalo.com/lifestyle/fashion/%E0%A6%AE%E0%A6%BF%E0%A6%B2%E0%A7%87%E0%A6%A8%E0%A6%BF%E0%A7%9F%E0%A6%BE%E0%A6%B2%E0%A6%A6%E0%A7%87%E0%A6%B0-%E0%A6%AB%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%B6%E0%A6%A8-%E0%A6%AC%E0%A7%8D%E0%A6%B0%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%A8%E0%A7%8D%E0%A6%A1",
    badge: "National Daily",
  },
  {
    name: "The Daily Star",
    tagline: "Where Fashion Meets Utility",
    url: "https://www.thedailystar.net/star-youth/news/gorur-ghash-where-fashion-meets-comedy-1760020",
    badge: "Leading English Daily",
  },
  {
    name: "The Business Standard",
    tagline: "Fashion, Culture & Production",
    url: "https://www.tbsnews.net/features/mode/gorur-ghash-fashion-comedy-and-utility-534690",
    badge: "Business Journal",
  },
  {
    name: "Dhaka Tribune",
    tagline: "Season of Heritage & Expression",
    url: "https://archive.dhakatribune.com/magazine/avenue-t/2019/02/11/season-of-ghash",
    badge: "Avenue T Feature",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#400604] text-[#E1B76F]">
      {/* Hero Header */}
      <div className="border-b border-[#5c0f0d] bg-[#2b0403] py-16 px-4 text-center">
        <div className="container mx-auto max-w-[900px]">
          <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#cbb18a]">
            Our Identity & Philosophy
          </span>
          <h1 className="mt-3 font-heading text-4xl sm:text-6xl font-black uppercase tracking-tight text-[#E1B76F]">
            House of Modern Heritage
          </h1>
          <p className="mt-4 text-[15px] sm:text-[17px] text-[#f5ebd8] max-w-2xl mx-auto leading-relaxed font-serif">
            ANGKON is where the deep artisanal textile roots of Bengal meet modern silhouettes, bold tailoring, and timeless craftsmanship.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-[1200px] px-4 py-16 lg:px-8 space-y-16">
        {/* The Vision & Core Standards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#E1B76F] block mb-2">
              The Vision
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-black uppercase text-[#E1B76F] leading-tight mb-4">
              Revitalizing Heritage Fabrics for Everyday Modern Living
            </h2>
            <p className="text-[14px] text-[#f0d29d] leading-relaxed mb-4">
              Founded on the belief that everyday wear should feel luxurious yet effortless, ANGKON produces limited-edition apparel, breathable resort shirts, premium waffle henleys, structured denim, and signature knitted polos.
            </p>
            <p className="text-[14px] text-[#f0d29d] leading-relaxed">
              Every garment is designed, woven, cut, and stitched with rigorous attention to detail right here in Bangladesh.
            </p>
          </div>

          <div className="rounded-2xl border-2 border-[#E1B76F]/30 bg-[#340402] p-8 shadow-2xl space-y-6">
            <h3 className="font-heading text-xl font-bold uppercase text-[#E1B76F]">
              The Core Standards
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-[#E1B76F] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[14px] text-[#E1B76F]">100% Breathable Natural Fibers</h4>
                  <p className="text-xs text-[#f0d29d]">Combed cottons, waffle textures, linen blends suited for tropical weather.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Award className="h-5 w-5 text-[#E1B76F] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[14px] text-[#E1B76F]">Pre-Shrunk & Color-Fast</h4>
                  <p className="text-xs text-[#f0d29d]">Enzyme-washed so your favorite piece retains its fit and vivid tone wash after wash.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-[#E1B76F] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[14px] text-[#E1B76F]">Ethical Production</h4>
                  <p className="text-xs text-[#f0d29d]">Fair wages, safe workspaces, and mindful manufacturing across our facilities.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Podcasts & Video Features */}
        <div className="rounded-2xl border border-[#E1B76F]/20 bg-[#340402] p-8 lg:p-10 shadow-2xl">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#E1B76F]/70 block mb-1">
              In The Spotlight
            </span>
            <h2 className="font-heading text-2xl sm:text-4xl font-black uppercase text-[#E1B76F]">
              Podcasts & Features
            </h2>
            <p className="text-xs sm:text-sm text-[#f0d29d] mt-2">
              Deep dives into the creative journey, manufacturing trials, and storytelling behind contemporary apparel in Bangladesh.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Podcast Video 1 */}
            <div className="space-y-3">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[#E1B76F]/20 bg-black shadow-lg">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/A3hjb6EyOmc"
                  title="The story behind contemporary apparel brand in Bangladesh"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <h4 className="font-bold text-sm sm:text-base text-[#E1B76F]">
                The Story Behind the Brand & 300x Growth Through Content
              </h4>
              <p className="text-xs text-[#f0d29d]">
                A full podcast breakdown covering fabric sourcing, creative positioning, and direct-to-consumer fulfillment in Dhaka.
              </p>
            </div>

            {/* Podcast Video 2 */}
            <div className="space-y-3">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[#E1B76F]/20 bg-black shadow-lg">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/iFb44mVECvs"
                  title="Daekhopedia Stories"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <h4 className="font-bold text-sm sm:text-base text-[#E1B76F]">
                Daekhopedia Stories: Modern Heritage Edition
              </h4>
              <p className="text-xs text-[#f0d29d]">
                Behind-the-scenes documentary discussing product design philosophy and redefining homegrown youth fashion.
              </p>
            </div>
          </div>
        </div>

        {/* Featured On Media Strip */}
        <div>
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#E1B76F]/70 block mb-1">
              Press & Media
            </span>
            <h2 className="font-heading text-2xl sm:text-4xl font-black uppercase text-[#E1B76F]">
              Featured On
            </h2>
            <p className="text-xs sm:text-sm text-[#f0d29d] mt-2">
              Recognized and documented across prominent publications and national journals.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURED_PRESS.map((press) => (
              <a
                key={press.name}
                href={press.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col justify-between rounded-xl border border-[#E1B76F]/20 bg-[#340402] p-5 shadow-lg transition hover:border-[#E1B76F] hover:bg-[#400604]"
              >
                <div>
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#E1B76F] bg-[#400604] px-2 py-0.5 rounded border border-[#E1B76F]/30 mb-3">
                    {press.badge}
                  </span>
                  <h3 className="font-heading text-lg font-black text-[#E1B76F] group-hover:text-white transition">
                    {press.name}
                  </h3>
                  <p className="text-xs text-[#f0d29d] mt-1">
                    {press.tagline}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E1B76F]/20 flex items-center justify-between text-[11px] font-bold uppercase text-[#E1B76F]">
                  <span>Read Article</span>
                  <ExternalLink className="h-3.5 w-3.5 text-[#E1B76F] group-hover:translate-x-0.5 transition-transform" />
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Showroom & Contact Box */}
        <div className="rounded-2xl border-2 border-[#E1B76F]/40 bg-[#340402] p-8 sm:p-10 text-center space-y-6 shadow-2xl">
          <span className="inline-block rounded-full bg-[#E1B76F] px-4 py-1 text-xs font-black uppercase text-[#400604]">
            Flagship Experience Center
          </span>
          <h3 className="font-heading text-3xl sm:text-4xl font-black uppercase text-[#E1B76F]">
            HOUSE OF MODERN HERITAGE
          </h3>
          <p className="text-[15px] sm:text-[17px] text-[#f0d29d] max-w-xl mx-auto font-serif">
            H-93, (Ground floor), Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs sm:text-sm text-[#f0d29d]">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-[#E1B76F]" />
              <span>WhatsApp / Hotline: <strong className="text-[#E1B76F]">+880 1338-668899</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#E1B76F]" />
              <span>Email: <strong className="text-[#E1B76F]">angkonofficial08@gmail.com</strong></span>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex rounded-xl bg-[#400604] border border-[#E1B76F]/50 px-8 py-3 text-xs font-black uppercase text-[#E1B76F] hover:bg-[#520805] hover:border-[#E1B76F] transition shadow-md"
            >
              Get In Touch
            </Link>
            <Link
              href="/products"
              className="inline-flex rounded-xl border border-[#E1B76F]/50 bg-[#340402] px-8 py-3 text-xs font-black uppercase text-[#E1B76F] hover:bg-[#400604] hover:text-white transition"
            >
              Explore Current Drops
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
