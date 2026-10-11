import type { Metadata } from "next";
import { Poppins, Lato } from "next/font/google";
import "./globals.css";
import { RootShell } from "@/components/layout/root-shell";
import { getCategoryTree } from "@/lib/woocommerce/categories";

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

export const metadata: Metadata = {
  title: "ANGKON — House of Modern Heritage",
  description: "ANGKON — HOUSE OF MODERN HERITAGE. Premium fashion and modern heritage apparel crafted with excellence in Bangladesh. Showroom: HOUSE OF MODERN HERITAGE — H-93, (Ground floor), Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212.",
  icons: {
    icon: "/logo.jpeg",
    shortcut: "/logo.jpeg",
    apple: "/logo.jpeg",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // A WooCommerce hiccup here shouldn't take down the whole site — degrade to
  // static nav links only rather than tripping the root error boundary.
  const categoryTree = await getCategoryTree().catch(() => []);

  return (
    <html lang="en" className={`${poppins.variable} ${lato.variable}`}>
      <body className="font-sans antialiased text-[#E1B76F] bg-[#400604]" suppressHydrationWarning>
        <RootShell categoryTree={categoryTree}>{children}</RootShell>
      </body>
    </html>
  );
}
