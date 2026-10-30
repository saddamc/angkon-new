import type { Metadata } from "next";
import { Poppins, Lato } from "next/font/google";
import "./globals.css";
import { RootShell } from "@/components/layout/root-shell";
import { getCategoryTree } from "@/lib/woocommerce/categories";
import { FacebookPixel } from "@/components/analytics/facebook-pixel";
import { getPixelSettings } from "@/server/pixel-settings";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-lato",
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://angkon.com.bd");

export async function generateMetadata(): Promise<Metadata> {
  const pixelSettings = await getPixelSettings().catch(() => null);
  const domainToken = pixelSettings?.domainVerificationToken?.trim();

  return {
    metadataBase: new URL(siteUrl),
    title: "ANGKON — House of Modern Heritage",
    description:
      "ANGKON — HOUSE OF MODERN HERITAGE. Premium fashion and modern heritage apparel crafted with excellence in Bangladesh. Showroom: HOUSE OF MODERN HERITAGE — H-93, (Ground floor), Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212.",
    icons: {
      icon: "/logo.jpeg",
      shortcut: "/logo.jpeg",
      apple: "/logo.jpeg",
    },
    verification: {
      other: domainToken
        ? {
            "facebook-domain-verification": [domainToken],
          }
        : undefined,
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // A WooCommerce hiccup here shouldn't take down the whole site — degrade to
  // static nav links only rather than tripping the root error boundary.
  const [categoryTree, pixelSettings] = await Promise.all([
    getCategoryTree().catch(() => []),
    getPixelSettings().catch(() => null),
  ]);

  return (
    <html lang="en" className={`${poppins.variable} ${lato.variable}`}>
      <body className="font-sans antialiased text-white bg-[#400604]" suppressHydrationWarning>
        <FacebookPixel initialConfig={pixelSettings} />
        <RootShell categoryTree={categoryTree}>{children}</RootShell>
      </body>
    </html>
  );
}
