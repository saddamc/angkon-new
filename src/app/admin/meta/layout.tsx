import { notFound } from "next/navigation";

export default function MetaRoutesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDevMode =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ENABLE_META_ROUTES === "true";

  // Completely hide and return 404 for all Meta routes in production unless explicitly enabled
  if (!isDevMode) {
    notFound();
  }

  return <>{children}</>;
}
