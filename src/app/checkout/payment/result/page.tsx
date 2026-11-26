import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ShoppingCart } from "lucide-react";
import { connectToDatabase } from "@/lib/mongodb";
import { PaymentAttempt } from "@/models/PaymentAttempt";
import { Order } from "@/models/Order";
import { PaymentStatusCard } from "@/components/checkout/payment-status-card";
import { Button } from "@/components/ui/button";
import { verifyAuthToken } from "@/server/auth/auth";
import { customerOwnsOrder } from "@/server/payments/customer-auth";
import { verifyPaymentStatusToken, createPaymentStatusToken } from "@/server/payments/status-token";
import { getPaymentStatusInfo } from "@/lib/payments/payment-status-labels";
import { isValidObjectId } from "@/server/payments/utils/object-id";

interface PageProps {
  searchParams: Promise<{ attemptId?: string; token?: string }>;
}

export const dynamic = "force-dynamic";

/**
 * Shared customer-facing payment result page (`/checkout/payment/result`).
 *
 * Always renders from the server-confirmed PaymentAttempt state in MongoDB,
 * never from untrusted query parameters.
 */
export default async function PaymentResultPage({ searchParams }: PageProps) {
  const { attemptId, token } = await searchParams;

  if (!attemptId || !isValidObjectId(attemptId)) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-[#2a0408]">
        <div className="max-w-md w-full rounded-2xl border border-[#E1B76F]/30 bg-[#3b050b] shadow-2xl p-8 text-center">
          <h1 className="text-xl font-heading font-black uppercase tracking-wide text-white mb-2">
            Payment Session Not Found
          </h1>
          <p className="text-sm text-white/75 mb-6">
            We could not locate this payment session. Your bag items are safe — please return to checkout or check your order history.
          </p>
          <Button asChild className="w-full bg-[#E1B76F] hover:bg-[#d4a657] text-[#2a0408] font-bold">
            <Link href="/checkout">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Return to Checkout
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const tokenValid = verifyPaymentStatusToken(token, attemptId);
  let userId: string | null = null;

  if (!tokenValid) {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("angkon_user_token")?.value;
    userId = sessionToken ? verifyAuthToken(sessionToken)?.sub ?? null : null;
    if (!userId) notFound();
  }

  await connectToDatabase();
  const attempt = await PaymentAttempt.findById(attemptId).lean();

  if (!attempt) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-[#2a0408]">
        <div className="max-w-md w-full rounded-2xl border border-[#E1B76F]/30 bg-[#3b050b] shadow-2xl p-8 text-center">
          <h1 className="text-xl font-heading font-black uppercase tracking-wide text-white mb-2">
            Payment Session Not Found
          </h1>
          <p className="text-sm text-white/75 mb-6">
            We could not locate this payment attempt. It may have expired or been replaced by a newer session.
          </p>
          <Button asChild className="w-full bg-[#E1B76F] hover:bg-[#d4a657] text-[#2a0408] font-bold">
            <Link href="/checkout">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Return to Checkout
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    const order = await Order.findOne({ orderNumber: attempt.orderNumber }).lean();
    const owned = order && userId ? await customerOwnsOrder(order, userId) : false;
    if (!owned) notFound();
  }

  const statusInfo = getPaymentStatusInfo(attempt.status);
  const safeToken = createPaymentStatusToken(String(attempt._id));

  const initialAttemptData = {
    id: String(attempt._id),
    orderNumber: attempt.orderNumber,
    tranId: attempt.tranId,
    status: attempt.status,
    statusLabel: statusInfo.label,
    customerActivity: attempt.customerActivity,
    expectedAmount: attempt.expectedAmount ?? attempt.amount ?? 0,
    currency: attempt.currency || "BDT",
    paidAt: attempt.paidAt ? attempt.paidAt.toISOString() : null,
    failedAt: attempt.failedAt ? attempt.failedAt.toISOString() : null,
    failureReason: attempt.lastErrorMessage || attempt.failureReason || null,
    valId: attempt.valId || attempt.validationId || null,
    isTerminal: statusInfo.isTerminal,
    canRetry: statusInfo.canRetry,
    statusToken: safeToken,
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-[#2a0408]">
      <div className="w-full max-w-lg">
        <PaymentStatusCard initialAttempt={initialAttemptData} statusToken={safeToken} />
      </div>
    </div>
  );
}
