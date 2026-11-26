import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ token?: string }>;
}

export const dynamic = "force-dynamic";

/**
 * Legacy route alias — redirects to the canonical shared payment result page
 * (`/checkout/payment/result`).
 */
export default async function LegacyPaymentStatusRedirectPage({ params, searchParams }: PageProps) {
  const { attemptId } = await params;
  const { token } = await searchParams;
  const query = new URLSearchParams({ attemptId });
  if (token) query.set("token", token);
  redirect(`/checkout/payment/result?${query.toString()}`);
}
