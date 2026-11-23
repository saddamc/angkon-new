import React from "react";
import Link from "next/link";
import { connectToDatabase } from "@/lib/mongodb";
import { PaymentAttempt } from "@/models/PaymentAttempt";
import { formatCurrency, formatPaymentDate } from "@/lib/payments/payment-display";
import { getPaymentStatusInfo } from "@/lib/payments/payment-status-labels";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Search,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminPaymentsPageProps {
  searchParams: Promise<{
    status?: string;
    q?: string;
    page?: string;
    provider?: string;
    from?: string;
    to?: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage({ searchParams }: AdminPaymentsPageProps) {
  const params = await searchParams;
  const statusFilter = params.status || "all";
  const searchQuery = params.q ? params.q.trim() : "";
  const providerFilter = params.provider ? params.provider.trim() : "";
  const fromFilter = params.from ? params.from.trim() : "";
  const toFilter = params.to ? params.to.trim() : "";
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const limit = 20;

  await connectToDatabase();

  // Legacy rows use `paid`; new rows use `succeeded`. Count both during the
  // migration window so the dashboard never hides real revenue.
  const succeededStatuses = ["succeeded", "paid"];
  const succeededFilter = {
    status: { $in: succeededStatuses },
  } as unknown as Parameters<typeof PaymentAttempt.countDocuments>[0];

  // 1. KPI Counts
  const [
    totalAttempts,
    succeededCount,
    pendingCount,
    reviewCount,
    failedCount,
    cancelledCount,
    revenueAgg,
  ] = await Promise.all([
    PaymentAttempt.countDocuments(),
    PaymentAttempt.countDocuments(succeededFilter),
    PaymentAttempt.countDocuments({ status: { $in: ["pending", "initiating", "unknown"] } }),
    PaymentAttempt.countDocuments({ status: "review_required" }),
    PaymentAttempt.countDocuments({ status: { $in: ["failed", "expired"] } }),
    PaymentAttempt.countDocuments({ status: "cancelled" }),
    PaymentAttempt.aggregate([
      { $match: { status: { $in: succeededStatuses } } },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ["$expectedAmount", "$amount"] } },
        },
      },
    ]),
  ]);

  const totalRevenue = revenueAgg[0]?.total || 0;

  // 2. Query filter
  const filter: Record<string, unknown> = {};
  if (statusFilter !== "all") {
    if (statusFilter === "pending_all") {
      filter.status = { $in: ["pending", "initiating", "unknown"] };
    } else if (statusFilter === "succeeded") {
      filter.status = { $in: succeededStatuses };
    } else {
      filter.status = statusFilter;
    }
  }

  if (providerFilter) {
    filter.provider = providerFilter;
  }

  if (fromFilter || toFilter) {
    const range: Record<string, Date> = {};
    if (fromFilter) {
      const from = new Date(`${fromFilter}T00:00:00.000Z`);
      if (!Number.isNaN(from.getTime())) range.$gte = from;
    }
    if (toFilter) {
      const to = new Date(`${toFilter}T23:59:59.999Z`);
      if (!Number.isNaN(to.getTime())) range.$lte = to;
    }
    if (Object.keys(range).length > 0) filter.createdAt = range;
  }

  if (searchQuery) {
    filter.$or = [
      { orderNumber: { $regex: searchQuery, $options: "i" } },
      { tranId: { $regex: searchQuery, $options: "i" } },
      { valId: { $regex: searchQuery, $options: "i" } },
      { cardBrand: { $regex: searchQuery, $options: "i" } },
    ];
  }

  const [attempts, filteredCount] = await Promise.all([
    PaymentAttempt.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    PaymentAttempt.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(filteredCount / limit);
  const preservedQuery = [
    statusFilter !== "all" ? `status=${encodeURIComponent(statusFilter)}` : "",
    searchQuery ? `q=${encodeURIComponent(searchQuery)}` : "",
    providerFilter ? `provider=${encodeURIComponent(providerFilter)}` : "",
    fromFilter ? `from=${encodeURIComponent(fromFilter)}` : "",
    toFilter ? `to=${encodeURIComponent(toFilter)}` : "",
  ]
    .filter(Boolean)
    .join("&");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Payment Operations
          </h1>
          <p className="text-sm text-neutral-500">
            Manage SSLCOMMERZ gateway transactions, reconciliation, review flags and manually
            recorded payments.
          </p>
        </div>

        <form action="/api/payments/reconcile" method="POST">
          <Button variant="outline" size="sm" type="submit" className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Run Reconciliation Job
          </Button>
        </form>
      </div>

      {/* Manual-entry explainer */}
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-amber-800">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          <strong>Manual</strong> rows are recorded by an administrator (bKash, Nagad, bank
          transfer, cash) and are <strong>not</strong> SSLCOMMERZ gateway transactions. Only
          SSLCOMMERZ rows carry a verified <code className="rounded bg-amber-100 px-1">val_id</code>{" "}
          from the gateway.
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-medium">Total Volume</span>
            <CreditCard className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {formatCurrency(totalRevenue)}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">{totalAttempts} total attempts</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-medium">Succeeded</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {succeededCount}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Confirmed payments</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between text-amber-500 mb-1">
            <span className="text-xs font-medium">Pending / In-Flight</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
            {pendingCount}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Awaiting completion</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between text-rose-500 mb-1">
            <span className="text-xs font-medium">Under Review</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
            {reviewCount}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">High-risk flagged</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-medium">Failed / Expired</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-neutral-700 dark:text-neutral-300">
            {failedCount}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Unsuccessful attempts</div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-xs font-medium">Cancelled</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-neutral-700 dark:text-neutral-300">
            {cancelledCount}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Customer-abandoned attempts</div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="space-y-3 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: "All", value: "all" },
            { label: "Succeeded", value: "succeeded" },
            { label: "Pending", value: "pending_all" },
            { label: "Review Required", value: "review_required" },
            { label: "Failed", value: "failed" },
            { label: "Cancelled", value: "cancelled" },
            { label: "Refunded", value: "refunded" },
          ].map((tab) => {
            const tabQuery = [
              `status=${encodeURIComponent(tab.value)}`,
              searchQuery ? `q=${encodeURIComponent(searchQuery)}` : "",
              providerFilter ? `provider=${encodeURIComponent(providerFilter)}` : "",
              fromFilter ? `from=${encodeURIComponent(fromFilter)}` : "",
              toFilter ? `to=${encodeURIComponent(toFilter)}` : "",
            ]
              .filter(Boolean)
              .join("&");
            return (
              <Link
                key={tab.value}
                href={`/admin/payments?${tabQuery}`}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  statusFilter === tab.value
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <form method="GET" className="flex flex-col lg:flex-row gap-2 lg:items-center">
          {statusFilter !== "all" && <input type="hidden" name="status" value={statusFilter} />}

          <div className="relative w-full lg:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Order, tranId, val_id, brand..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
          </div>

          <select
            name="provider"
            defaultValue={providerFilter}
            className="w-full lg:w-40 px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-400"
          >
            <option value="">All providers</option>
            <option value="sslcommerz">SSLCOMMERZ</option>
            <option value="manual">Manual</option>
            <option value="cod">Cash on Delivery</option>
          </select>

          <label className="text-[11px] text-neutral-500 flex items-center gap-1.5">
            From
            <input
              type="date"
              name="from"
              defaultValue={fromFilter}
              className="px-2 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
            />
          </label>

          <label className="text-[11px] text-neutral-500 flex items-center gap-1.5">
            To
            <input
              type="date"
              name="to"
              defaultValue={toFilter}
              className="px-2 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
            />
          </label>

          <Button type="submit" variant="outline" size="sm" className="text-xs">
            Apply filters
          </Button>
          {preservedQuery && (
            <Link href="/admin/payments" className="text-[11px] text-neutral-500 underline">
              Reset
            </Link>
          )}
        </form>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 text-neutral-500 font-medium">
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300">
              {attempts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-neutral-400">
                    No payment attempts found matching criteria.
                  </td>
                </tr>
              ) : (
                attempts.map((attempt) => {
                  const statusInfo = getPaymentStatusInfo(attempt.status);
                  return (
                    <tr key={String(attempt._id)} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30">
                      <td className="py-3 px-4 font-mono font-medium text-neutral-900 dark:text-neutral-100">
                        {attempt.tranId}
                        {attempt.attemptNumber > 1 && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-600">
                            #{attempt.attemptNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/admin/orders/${attempt.orderNumber}`}
                          className="hover:underline font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1"
                        >
                          {attempt.orderNumber}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-100">
                        {formatCurrency(attempt.expectedAmount ?? attempt.amount, attempt.currency)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            attempt.status === "succeeded"
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
                      </td>
                      <td className="py-3 px-4">
                        {attempt.provider === "manual" ? (
                          <div className="flex flex-col leading-tight">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                              Manual
                            </span>
                            {attempt.cardType && (
                              <span className="text-[10px] uppercase text-neutral-500">
                                {attempt.cardType}
                              </span>
                            )}
                          </div>
                        ) : attempt.provider === "cod" ? (
                          <span className="text-[10px] font-bold uppercase text-neutral-600">
                            Cash on Delivery
                          </span>
                        ) : (
                          <div className="flex flex-col leading-tight">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-purple-700 dark:text-purple-400">
                              SSLCOMMERZ
                            </span>
                            {(attempt.cardBrand || attempt.cardType) && (
                              <span className="text-[10px] uppercase text-neutral-500">
                                {attempt.cardBrand || attempt.cardType}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-neutral-500 whitespace-nowrap">
                        {formatPaymentDate(attempt.initiatedAt || attempt.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/admin/payments/${attempt._id}`}
                          className="text-neutral-900 hover:text-emerald-600 dark:text-neutral-200 font-medium text-xs"
                        >
                          Inspect
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
            <span>
              Showing {Math.min((page - 1) * limit + 1, filteredCount)} - {Math.min(page * limit, filteredCount)} of {filteredCount}
            </span>
            <div className="flex gap-1.5">
              {page > 1 && (
                <Link
                  href={`/admin/payments?page=${page - 1}&status=${statusFilter}${searchQuery ? `&q=${searchQuery}` : ""}`}
                  className="px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/payments?page=${page + 1}&status=${statusFilter}${searchQuery ? `&q=${searchQuery}` : ""}`}
                  className="px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
