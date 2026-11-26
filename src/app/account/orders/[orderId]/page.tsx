import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

/**
 * Resolves `/account/orders/[orderId]` links (e.g. from payment confirmation
 * screens or Back to Order navigation) directly to the matching order in `/my-account`.
 */
export default async function AccountOrderRedirectPage({ params }: PageProps) {
  const { orderId } = await params;
  const cleanId = String(orderId || "").trim();
  if (!cleanId) {
    redirect("/my-account?tab=orders");
  }
  redirect(`/my-account?tab=orders&order=${encodeURIComponent(cleanId)}`);
}
