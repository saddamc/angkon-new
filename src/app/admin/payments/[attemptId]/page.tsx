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
import { computeOrderFinancials } from "@/server/orders/workflow";
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
  Wallet,
  Hash,
  CalendarDays,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentActions } from "./_components/payment-actions";
import { isValidObjectId } from "@/server/payments/utils/object-id";

interface AdminPaymentDetailPageProps {
  params: Promise<{ attemptId: string }>;
}

export const dynamic = "force-dynamic";

function providerMeta(provider: string | undefined) {
  const value = String(provider || "sslcommerz").toLowerCase();
  if (value === "manual") {
    return {
      key: "manual",
      label: "Manual payment",
      description: "Recorded by an administrator — not an SSLCOMMERZ transaction.",
      cls: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }
  if (value === "cod") {
    return {
      key: "cod",
      label: "Cash on Delivery",
      description: "Collected at the door.",
      cls: "border-stone-200 bg-stone-100 text-stone-700",
    };
  }
  return {
    key: "sslcommerz",
    label: "SSLCOMMERZ",
    description: "Verified by the SSLCOMMERZ gateway.",
    cls: "border-purple-200 bg-purple-50 text-purple-700",
  };
}

function statusStyle(status: string): string {
  if (status === "succeeded" || status === "paid")
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400";
  if (status === "failed")
    return "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400";
  if (status === "review_required")
    return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400";
  if (status === "partially_refunded" || status === "refunded")
    return "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300";
  return "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300";
}

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
  const provider = providerMeta(attempt.provider);
  const isManual = provider.key === "manual";
  const isGateway = provider.key === "sslcommerz";
  const amount = attempt.amount ?? attempt.expectedAmount ?? 0;
  const financials = order ? computeOrderFinancials(order) : null;

  const legacyEvents =
    (attempt as unknown as {
      events?: Array<{ at?: Date | string; type?: string; source?: string; message?: string }>;
    }).events || [];

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/admin/payments"
            className="mb-2 flex items-center gap-1.5 text-xs text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Payments
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              {attempt.tranId}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusStyle(
                String(attempt.status)
              )}`}
            >
              {statusInfo.label}
            </span>
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${provider.cls}`}>
              {provider.label.toUpperCase()}
            </span>
          </div>
          <p className="mt-1 text-[11.5px] text-neutral-500">{provider.description}</p>
        </div>

        {attempt.orderNumber && (
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link href={`/admin/orders/${attempt.orderNumber}`}>
              View order #{attempt.orderNumber}
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>

      {/* Key facts */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Amount",
            value: formatCurrency(amount, attempt.currency),
            icon: Wallet,
            tone: "text-emerald-600",
          },
          {
            label: isManual ? "Manual method" : "Method",
            value: (attempt.cardBrand || attempt.cardType || (isManual ? "Manual" : "Gateway")).toUpperCase(),
            icon: CreditCard,
            tone: "text-purple-600",
          },
          {
            label: "Date",
            value: formatPaymentDate(attempt.paidAt || attempt.initiatedAt || attempt.createdAt),
            icon: CalendarDays,
            tone: "text-neutral-500",
          },
          {
            label: "Reference",
            value: isManual
              ? attempt.recordedBy || "Admin"
              : attempt.bankTranId || attempt.bankTransactionId || "—",
            icon: isManual ? User : Hash,
            tone: "text-neutral-500",
          },
        ].map((fact) => {
          const Icon = fact.icon;
          return (
            <div
              key={fact.label}
              className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                  {fact.label}
                </p>
                <Icon className={`h-4 w-4 ${fact.tone}`} />
              </div>
              <p className="mt-1.5 truncate text-[13px] font-bold text-neutral-900 dark:text-neutral-100">
                {fact.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <PaymentActions
        attemptId={String(attempt._id)}
        status={String(attempt.status)}
        expectedAmount={attempt.expectedAmount ?? amount}
        currency={attempt.currency || "BDT"}
        provider={provider.key}
        orderNumber={attempt.orderNumber}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Payment details */}
        <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-2 text-sm font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-100">
            <CreditCard className="h-4 w-4 text-emerald-600" />
            {isManual ? "Manual payment details" : "Gateway transaction details"}
          </div>

          <dl className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
            <div className="flex justify-between gap-3">
              <dt>Amount</dt>
              <dd className="font-semibold text-neutral-900 dark:text-neutral-100">
                {formatCurrency(amount, attempt.currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Status</dt>
              <dd className="font-semibold text-neutral-900 dark:text-neutral-100">
                {statusInfo.label}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>{isManual ? "Method" : "Card / method"}</dt>
              <dd className="font-semibold uppercase text-neutral-900 dark:text-neutral-100">
                {attempt.cardBrand || attempt.cardType || "—"}
              </dd>
            </div>

            {isManual ? (
              <>
                <div className="flex justify-between gap-3">
                  <dt>Recorded by</dt>
                  <dd className="font-mono text-[11px] text-neutral-900 dark:text-neutral-100">
                    {attempt.recordedBy || "Administrator"}
                  </dd>
                </div>
                {attempt.bankTranId && (
                  <div className="flex justify-between gap-3">
                    <dt>Reference</dt>
                    <dd className="font-mono text-[11px] text-neutral-900 dark:text-neutral-100">
                      {attempt.bankTranId}
                    </dd>
                  </div>
                )}
                {attempt.note && (
                  <div className="pt-2">
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                      Note
                    </dt>
                    <dd className="mt-0.5 text-[11.5px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                      {attempt.note}
                    </dd>
                  </div>
                )}
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10.5px] leading-relaxed text-amber-800">
                  <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  No gateway validation, environment or risk data applies to manual entries.
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between gap-3">
                  <dt>Validation ID (val_id)</dt>
                  <dd className="max-w-[55%] truncate font-mono text-[11px] text-neutral-900 dark:text-neutral-100">
                    {attempt.valId || attempt.validationId || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Bank transaction ID</dt>
                  <dd className="max-w-[55%] truncate font-mono text-[11px] text-neutral-900 dark:text-neutral-100">
                    {attempt.bankTranId || attempt.bankTransactionId || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Environment</dt>
                  <dd className="text-[10px] font-bold uppercase text-neutral-900 dark:text-neutral-100">
                    {attempt.environment || "sandbox"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Gateway status</dt>
                  <dd className="font-mono text-[11px] text-neutral-900 dark:text-neutral-100">
                    {attempt.gatewayStatus || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Attempt</dt>
                  <dd className="font-mono text-[11px]">#{attempt.attemptNumber ?? 1}</dd>
                </div>
              </>
            )}
          </dl>
        </div>

        {/* Order & customer */}
        <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-2 text-sm font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-100">
            <User className="h-4 w-4 text-emerald-600" />
            Order & customer
          </div>
          <dl className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
            <div className="flex justify-between gap-3">
              <dt>Order</dt>
              <dd className="font-semibold text-neutral-900 dark:text-neutral-100">
                {attempt.orderNumber}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Order status</dt>
              <dd className="font-semibold uppercase text-neutral-900 dark:text-neutral-100">
                {order?.orderStatus || "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Customer</dt>
              <dd className="font-semibold text-neutral-900 dark:text-neutral-100">
                {order?.customer?.fullName || "Guest"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Phone</dt>
              <dd className="font-mono text-[11px] text-neutral-900 dark:text-neutral-100">
                {order?.customer?.phone || "—"}
              </dd>
            </div>
            {financials && (
              <>
                <div className="mt-2 border-t border-neutral-100 pt-2 dark:border-neutral-800" />
                <div className="flex justify-between gap-3">
                  <dt>Order total</dt>
                  <dd className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(financials.orderTotal)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Total paid</dt>
                  <dd className="font-semibold text-emerald-600">
                    {formatCurrency(financials.advancePaidAmount)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Outstanding / COD</dt>
                  <dd className="font-semibold text-amber-700">
                    {formatCurrency(financials.outstandingAmount)}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </div>
      </div>

      {/* Refunds */}
      <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-2 dark:border-neutral-800">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            <CreditCard className="h-4 w-4 text-emerald-600" />
            Refunds ({refunds.length})
          </div>
          <span className="text-[10.5px] text-neutral-400">
            {isGateway
              ? "Gateway refunds are processed through the SSLCOMMERZ Refund API."
              : "Manual payments are refunded offline — record it from the order."}
          </span>
        </div>

        {refunds.length === 0 ? (
          <p className="py-2 text-xs text-neutral-400">No refunds recorded for this payment.</p>
        ) : (
          <div className="divide-y divide-neutral-100 text-xs dark:divide-neutral-800">
            {refunds.map((ref) => (
              <div key={ref.refundId} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                    {ref.refundId}
                  </span>
                  <p className="mt-0.5 truncate text-[11px] text-neutral-500">
                    {ref.reason} · Ref: {ref.refundRefId || "pending gateway"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(ref.amount, ref.currency)}
                  </div>
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-[10px] font-medium uppercase ${
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
        )}
      </div>

      {/* Risk (gateway only) */}
      {isGateway && (attempt.riskLevel || attempt.gatewayStatus || attempt.lastErrorMessage) && (
        <div className="space-y-2 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-2 text-sm font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-100">
            {attempt.riskLevel === "1" ? (
              <ShieldAlert className="h-4 w-4 text-amber-500" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            )}
            Gateway risk & security
          </div>
          <dl className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
            <div className="flex justify-between gap-3">
              <dt>Risk level</dt>
              <dd className="font-semibold text-neutral-900 dark:text-neutral-100">
                {attempt.riskLevel === "1" ? "Level 1 — high risk" : "Level 0 — safe"}
              </dd>
            </div>
            {attempt.riskTitle && (
              <div className="flex justify-between gap-3">
                <dt>Reason</dt>
                <dd className="text-neutral-900 dark:text-neutral-100">{attempt.riskTitle}</dd>
              </div>
            )}
            {attempt.lastErrorMessage && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
                {attempt.lastErrorMessage}
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-2 text-sm font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-100">
          <Activity className="h-4 w-4 text-emerald-600" />
          Timeline ({events.length})
        </div>

        {events.length > 0 ? (
          <ol className="relative space-y-4 pl-5 before:absolute before:bottom-2 before:left-1.5 before:top-2 before:w-0.5 before:bg-neutral-200 dark:before:bg-neutral-800">
            {events.map((evt, idx) => (
              <li key={String(evt._id || idx)} className="relative text-xs">
                <span className="absolute -left-5 top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-600 dark:border-neutral-900" />
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-900 dark:text-neutral-100">
                    {evt.eventType.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10.5px] text-neutral-400">
                    {formatPaymentDate(evt.timestamp || evt.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-neutral-500">
                  {evt.source}
                  {evt.gatewayStatus ? ` · ${evt.gatewayStatus}` : ""}
                </p>
              </li>
            ))}
          </ol>
        ) : legacyEvents.length > 0 ? (
          <ol className="space-y-2">
            {legacyEvents.map((evt, idx) => (
              <li
                key={idx}
                className="flex flex-col justify-between gap-1 border-b border-neutral-100 pb-2 text-xs last:border-0 dark:border-neutral-800 sm:flex-row"
              >
                <span className="font-mono text-neutral-700 dark:text-neutral-300">
                  {String(evt.type || "event").replace(/_/g, " ")}
                  {evt.message ? ` — ${evt.message}` : ""}
                </span>
                <span className="text-[10.5px] text-neutral-400">
                  {evt.at ? formatPaymentDate(evt.at) : ""}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="py-3 text-center text-xs text-neutral-400">No events recorded.</p>
        )}
      </div>

      {/* Raw gateway response (collapsed) */}
      {isGateway && attempt.rawValidation && (
        <details className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            <FileText className="h-4 w-4 text-emerald-600" />
            Raw gateway validation response
          </summary>
          <pre className="mt-3 max-h-96 overflow-x-auto rounded-lg bg-neutral-50 p-4 font-mono text-[11px] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            {JSON.stringify(attempt.rawValidation, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
