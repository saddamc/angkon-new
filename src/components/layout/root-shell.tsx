"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navigation/Navbar";
import { Footer } from "@/components/layout/footer";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { BackToTop } from "@/components/common/back-to-top";
import { FloatingCartButton } from "@/components/layout/floating-cart-button";
import type { CategoryNode } from "@/types/woocommerce";

export function RootShell({
  children,
  categoryTree,
}: {
  children: React.ReactNode;
  categoryTree: CategoryNode[];
}) {
  const pathname = usePathname();
  // Admin and auth screens render without the storefront chrome.
  const isBareRoute = pathname.startsWith("/admin") || pathname === "/login";

  if (isBareRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar categoryTree={categoryTree} />
      <main className="min-h-[70vh]">{children}</main>
      <Footer />
      <WhatsAppButton />
      <FloatingCartButton />
      <BackToTop />
    </>
  );
}
