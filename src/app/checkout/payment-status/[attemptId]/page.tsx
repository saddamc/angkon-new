import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import { PaymentAttempt } from "@/models/PaymentAttempt";
import { PaymentStatusCard } from "@/components/checkout/payment-status-card";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verifyAuthToken } from "@/server/auth/auth";
import { customerOwnsOrder } from "@/server/payments/customer-auth";
import { verifyPaymentStatusToken, createPaymentStatusToken } from "@/server/payments/status-token";
import { Order } from "@/models/Order";
import { getPaymentStatusInfo } from "@/lib/payments/payment-status-labels";
import { cookies } from "next/headers";

interface PageProps {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ token?: string }>;
}

export const dynamic = "force-dynamic";

export default async function PaymentStatusPage({ params, searchParams }: PageProps) {
  const { attemptId } = await params;
  const { token } = await searchParams;

  // The status page is reachable through a signed token (guest checkout) or a
  // session that owns the order. Reject anonymous requests before touching the
  // database so enumeration is impossible and the response is a real 404.
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
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-8 text-center">
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Payment Session Not Found
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
            We could not locate this payment attempt. It may have expired or been replaced by a newer session.
          </p>
          <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
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
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 bg-neutral-50/50 dark:bg-neutral-950/50">
      <div className="w-full max-w-lg">
        <PaymentStatusCard initialAttempt={initialAttemptData} statusToken={safeToken} />
      </div>
    </div>
  );
}
