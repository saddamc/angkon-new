import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { PaymentAttempt } from "@/models/PaymentAttempt";
import { PaymentStatusCard } from "@/components/checkout/payment-status-card";
import { ArrowLeft, CreditCard } from "lucide-react";
import { verifyAuthToken } from "@/server/auth/auth";
import { customerOwnsOrder } from "@/server/payments/customer-auth";
import { createPaymentStatusToken } from "@/server/payments/status-token";
import { getPaymentStatusInfo } from "@/lib/payments/payment-status-labels";
import { normalizePaymentStatus } from "@/server/payments/payment-state-machine";
import { PayNowButton } from "./_components/pay-now-button";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export const dynamic = "force-dynamic";

export default async function OrderPaymentPage({ params }: PageProps) {
  const { orderId } = await params;

  await connectToDatabase();
  const order = await Order.findOne({
    $or: [{ orderNumber: orderId }, { _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }],
  }).lean();

  if (!order) {
    notFound();
  }

  // This page exposes order and transaction data: only the owner may see it.
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("angkon_user_token")?.value;
  const userId = sessionToken ? verifyAuthToken(sessionToken)?.sub ?? null : null;
  if (!userId || !(await customerOwnsOrder(order, userId))) {
    notFound();
  }

  // Find the latest payment attempt for this order
  const latestAttempt = await PaymentAttempt.findOne({ orderNumber: order.orderNumber })
    .sort({ attemptNumber: -1, createdAt: -1 })
    .lean();

  const statusInfo = latestAttempt ? getPaymentStatusInfo(latestAttempt.status) : null;
  const statusToken = latestAttempt ? createPaymentStatusToken(String(latestAttempt._id)) : "";

  return (
    <div className="min-h-screen bg-[#530911] bg-gradient-to-b from-[#5d0a14] via-[#530911] to-[#42070d] text-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={`/my-account?tab=orders&order=${encodeURIComponent(order.orderNumber)}`}
            className="text-xs text-white/85 hover:text-[#E1B76F] flex items-center gap-1.5 transition-colors font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Order
          </Link>
          <span className="font-mono text-xs font-bold text-[#E1B76F]">
            Order #{order.orderNumber}
          </span>
        </div>

        {latestAttempt ? (
          <PaymentStatusCard
            statusToken={statusToken}
            initialAttempt={{
              id: String(latestAttempt._id),
              orderNumber: latestAttempt.orderNumber,
              tranId: latestAttempt.tranId,
              status: normalizePaymentStatus(latestAttempt.status),
              customerActivity: latestAttempt.customerActivity,
              expectedAmount: latestAttempt.expectedAmount ?? latestAttempt.amount ?? order.total,
              currency: latestAttempt.currency || "BDT",
              paidAt: latestAttempt.paidAt ? latestAttempt.paidAt.toISOString() : null,
              failedAt: latestAttempt.failedAt ? latestAttempt.failedAt.toISOString() : null,
              failureReason: latestAttempt.lastErrorMessage || latestAttempt.failureReason || null,
              valId: latestAttempt.valId || latestAttempt.validationId || null,
              isTerminal: Boolean(statusInfo?.isTerminal),
              canRetry: Boolean(statusInfo?.canRetry),
              statusToken,
            }}
          />
        ) : (
          <div className="rounded-2xl border border-[#E1B76F]/30 bg-[#3b050b] shadow-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#2b0408] border border-[#E1B76F]/35 flex items-center justify-center mx-auto mb-6">
              <CreditCard className="w-8 h-8 text-[#E1B76F]" />
            </div>

            <h1 className="font-heading text-xl font-black uppercase text-white mb-2">
              Pay for Order #{order.orderNumber}
            </h1>

            <p className="text-sm text-[#EADBC8] mb-6">
              Total Payable Amount:{" "}
              <span className="font-bold text-[#E1B76F] tabular-nums">
                ৳{order.total.toLocaleString("en-BD")}
              </span>
            </p>

            <PayNowButton orderNumber={order.orderNumber} amount={order.total} />
          </div>
        )}
      </div>
    </div>
  );
}
