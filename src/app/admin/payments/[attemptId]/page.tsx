import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import { PaymentAttempt } from "@/models/PaymentAttempt";
import { PaymentEvent } from "@/models/PaymentEvent";
import { PaymentRefund } from "@/models/PaymentRefund";
import { Order } from "@/models/Order";
import { formatCurrency, formatPaymentDate } from "@/lib/payments/payment-display";
import { getPaymentStatusInfo } from "@/lib/payments/payment-status-labels";
import {
  ArrowLeft,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Activity,
  FileText,
  User,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentActions } from "./_components/payment-actions";
import { isValidObjectId } from "@/server/payments/utils/object-id";

interface AdminPaymentDetailPageProps {
  params: Promise<{ attemptId: string }>;
}

export const dynamic = "force-dynamic";

export default async function AdminPaymentDetailPage({ params }: AdminPaymentDetailPageProps) {
  const { attemptId } = await params;

  if (!isValidObjectId(attemptId)) {
    notFound();
  }

  await connectToDatabase();

  const attempt = await PaymentAttempt.findById(attemptId).lean();
  if (!attempt) {
    notFound();
  }

  const [order, events, refunds] = await Promise.all([
    Order.findOne({ orderNumber: attempt.orderNumber }).lean(),
    PaymentEvent.find({
      $or: [{ attemptId: attempt._id }, { tranId: attempt.tranId }],
    })
      .sort({ createdAt: 1 })
      .lean(),
    PaymentRefund.find({ paymentId: attempt._id }).sort({ createdAt: -1 }).lean(),
  ]);

  const statusInfo = getPaymentStatusInfo(attempt.status);

  // Legacy settlements wrote their history into an embedded `events` array
  // instead of the PaymentEvent collection. Surface it so old transactions are
  // still traceable in the admin timeline.
  const legacyEvents =
    (attempt as unknown as {
      events?: Array<{ at?: Date | string; type?: string; source?: string; message?: string }>;
    }).events || [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/payments"
            className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 flex items-center gap-1.5 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Payments
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono tracking-tight text-neutral-900 dark:text-neutral-100">
              {attempt.tranId}
            </h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                attempt.status === "succeeded" || String(attempt.status) === "paid"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                  : attempt.status === "failed"
                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400"
                  : attempt.status === "review_required"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"
                  : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              {statusInfo.label}
            </span>
          </div>
        </div>

        {attempt.orderNumber && (
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link href={`/admin/orders/${attempt.orderNumber}`}>
              View Order #{attempt.orderNumber}
              <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        )}
      </div>

      {/* Admin Actions */}
      <PaymentActions
        attemptId={String(attempt._id)}
        status={attempt.status}
        expectedAmount={attempt.expectedAmount ?? attempt.amount ?? 0}
        currency={attempt.currency || "BDT"}
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Transaction Summary */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl p-5 border border-neutral-200 dark:border-neutral-800 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-sm text-neutral-900 dark:text-neutral-100 border-b border-neutral-100 dark:border-neutral-800 pb-2">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            Transaction Details
          </div>
          <div className="text-xs space-y-2 text-neutral-600 dark:text-neutral-400">
            <div className="flex justify-between">
              <span>Expected Amount:</span>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                {formatCurrency(attempt.expectedAmount ?? attempt.amount ?? 0, attempt.currency)}
              </span>
            </div>
            {attempt.amount !== undefined && (
              <div className="flex justify-between">
                <span>Charged Amount:</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {formatCurrency(attempt.amount, attempt.currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Attempt Number:</span>
              <span className="font-mono">#{attempt.attemptNumber ?? 1}</span>
            </div>
            <div className="flex justify-between">
              <span>Validation ID:</span>
              <span className="font-mono">{attempt.valId || attempt.validationId || "None"}</span>
            </div>
            <div className="flex justify-between">
              <span>Bank Tran ID:</span>
              <span className="font-mono">{attempt.bankTranId || attempt.bankTransactionId || "None"}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Card / Method:</span>
              <span className="uppercase font-medium">{attempt.cardBrand || attempt.cardType || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span>Environment:</span>
              <span className="uppercase font-mono text-[11px]">{attempt.environment || "sandbox"}</span>
            </div>
          </div>
        </div>

        {/* Customer & Order */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl p-5 border border-neutral-200 dark:border-neutral-800 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-sm text-neutral-900 dark:text-neutral-100 border-b border-neutral-100 dark:border-neutral-800 pb-2">
            <User className="w-4 h-4 text-emerald-600" />
            Customer & Order
          </div>
          <div className="text-xs space-y-2 text-neutral-600 dark:text-neutral-400">
            <div className="flex justify-between">
              <span>Order Number:</span>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                {attempt.orderNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Order Status:</span>
              <span className="uppercase font-medium">{order?.orderStatus || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer Name:</span>
              <span>{order?.customer?.fullName || "Guest"}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer Phone:</span>
              <span>{order?.customer?.phone || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer Activity:</span>
              <span className="font-mono text-[11px]">{attempt.customerActivity}</span>
            </div>
            <div className="flex justify-between">
              <span>Reconcile Status:</span>
              <span className="font-mono text-[11px]">{attempt.reconciliationStatus}</span>
            </div>
          </div>
        </div>

        {/* Risk & Gateway Security */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl p-5 border border-neutral-200 dark:border-neutral-800 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-sm text-neutral-900 dark:text-neutral-100 border-b border-neutral-100 dark:border-neutral-800 pb-2">
            {attempt.riskLevel === "1" ? (
              <ShieldAlert className="w-4 h-4 text-amber-500" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            )}
            Gateway Security & Risk
          </div>
          <div className="text-xs space-y-2 text-neutral-600 dark:text-neutral-400">
            <div className="flex justify-between">
              <span>Risk Level:</span>
              <span
                className={`font-semibold ${
                  attempt.riskLevel === "1"
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {attempt.riskLevel === "1" ? "Risk Level 1 (High Risk)" : "Risk Level 0 (Safe)"}
              </span>
            </div>
            {attempt.riskTitle && (
              <div className="flex justify-between">
                <span>Risk Reason:</span>
                <span>{attempt.riskTitle}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Gateway Status:</span>
              <span className="font-mono">{attempt.gatewayStatus || "N/A"}</span>
            </div>
            {attempt.lastErrorMessage && (
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <span className="text-rose-600 font-medium">Failure Reason:</span>
                <p className="mt-0.5 text-neutral-700 dark:text-neutral-300 font-mono text-[11px]">
                  {attempt.lastErrorMessage}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chronological Audit Timeline */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 space-y-4">
        <div className="flex items-center gap-2 font-semibold text-sm text-neutral-900 dark:text-neutral-100 border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <Activity className="w-4 h-4 text-emerald-600" />
          Chronological Audit Log ({events.length} Events)
        </div>

        {events.length === 0 ? (
          legacyEvents.length > 0 ? (
            <div className="space-y-3">
              <p className="text-[11px] text-neutral-400">
                Showing the embedded history recorded before the centralized event log.
              </p>
              {legacyEvents.map((evt, idx) => (
                <div key={idx} className="text-xs flex flex-col sm:flex-row sm:justify-between gap-1 border-b border-neutral-100 dark:border-neutral-800 pb-2">
                  <span className="font-mono text-neutral-700 dark:text-neutral-300">
                    {String(evt.type || "event").replace(/_/g, " ")}
                    {evt.message ? ` — ${evt.message}` : ""}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {evt.at ? formatPaymentDate(evt.at) : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 py-4 text-center">No audit events recorded.</p>
          )
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200 dark:before:bg-neutral-800">
            {events.map((evt, idx) => (
              <div key={String(evt._id || idx)} className="relative text-xs">
                {/* Bullet */}
                <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-neutral-900 bg-emerald-600" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[11px]">
                    {evt.eventType.replace(/_/g, " ")}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {formatPaymentDate(evt.timestamp || evt.createdAt)}
                  </span>
                </div>

                <p className="text-neutral-500 mt-0.5">
                  Source: <span className="font-mono text-neutral-700 dark:text-neutral-300">{evt.source}</span>
                  {evt.gatewayStatus && (
                    <span>
                      {" "}• Gateway Status:{" "}
                      <span className="font-mono text-neutral-700 dark:text-neutral-300">
                        {evt.gatewayStatus}
                      </span>
                    </span>
                  )}
                </p>

                {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                  <pre className="mt-2 p-2 rounded bg-neutral-50 dark:bg-neutral-800 text-[11px] font-mono text-neutral-600 dark:text-neutral-400 overflow-x-auto">
                    {JSON.stringify(evt.metadata, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Refund Management & History */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2 font-semibold text-sm text-neutral-900 dark:text-neutral-100">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            Refund Lifecycle ({refunds.length} Recorded)
          </div>
          {(attempt.status === "succeeded" ||
          String(attempt.status) === "paid" ||
          attempt.status === "partially_refunded") && (
            <span className="text-xs text-neutral-500">
              Eligible for full or partial refund via SSLCOMMERZ API
            </span>
          )}
        </div>

        {refunds.length > 0 ? (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
            {refunds.map((ref) => (
              <div key={ref.refundId} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                    {ref.refundId}
                  </span>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Reason: {ref.reason} • Ref ID: {ref.refundRefId || "Pending Gateway"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(ref.amount, ref.currency)}
                  </div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                      ref.status === "succeeded"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                        : ref.status === "failed"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400"
                    }`}
                  >
                    {ref.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-400 py-2">No refund requests recorded for this transaction.</p>
        )}
      </div>

      {/* Raw Gateway Validation Response */}
      {attempt.rawValidation && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-sm text-neutral-900 dark:text-neutral-100 border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <FileText className="w-4 h-4 text-emerald-600" />
            Raw Gateway Validation Response (Sanitized)
          </div>
          <pre className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-xs font-mono text-neutral-700 dark:text-neutral-300 overflow-x-auto max-h-96">
            {JSON.stringify(attempt.rawValidation, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
