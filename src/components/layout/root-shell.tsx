"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navigation/Navbar";
import { Footer } from "@/components/layout/footer";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { PromoPopup } from "@/components/common/promo-popup";
import { BackToTop } from "@/components/common/back-to-top";
import type { CategoryNode } from "@/types/woocommerce";

export function RootShell({
  children,
  categoryTree,
}: {
  children: React.ReactNode;
  categoryTree: CategoryNode[];
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar categoryTree={categoryTree} />
      <main className="min-h-[70vh]">{children}</main>
      <Footer />
      <WhatsAppButton />
      <BackToTop />
      {pathname === "/" && <PromoPopup />}
    </>
  );
}
