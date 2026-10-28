import { notFound } from "next/navigation";
import MetaPixelEventsManagerPage from "@/app/admin/meta/pixel/page";

export default function AdminPixelPage() {
  const isDevMode =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ENABLE_META_ROUTES === "true";

  // Completely hide and return 404 in production unless explicitly enabled
  if (!isDevMode) {
    notFound();
  }

  return <MetaPixelEventsManagerPage />;
}
