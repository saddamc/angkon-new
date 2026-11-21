import { connectToDatabase } from "@/lib/mongodb";
import { PaymentAttempt } from "@/models/PaymentAttempt";
import { PaymentWebhookInbox } from "@/models/PaymentWebhookInbox";
import { computePendingCount } from "./reconcile-counts";

export interface ReconciliationInspection {
  /** Unresolved attempts in the reconciliation queue. */
  scanned: number;
  /** Records a real run would process now (due + reconcilable). */
  eligible: number;
  /** Records not due yet; they remain queued, not failed. */
  pending: number;
  /** Records that cannot be reconciled (resolved already or no gateway reference). */
  skipped: number;
  /** Notification processing failures that remain retryable (actual failures). */
  failed: number;
  failedWebhooks: number;
  retryableFailedWebhooks: number;
  /** Historical terminal outcomes, informational only — not part of the queue. */
  terminalFailed: number;
  terminalExpired: number;
  noGatewayReference: number;
  reconciliationStatusResolved: number;
  unresolvedStatuses: string[];
  inspectedAt: string;
}

const UNRESOLVED_STATUSES = [
  "created",
  "initiated",
  "initiating",
  "pending",
  "unknown",
  "review_required",
];

type CountFilter = Parameters<typeof PaymentAttempt.countDocuments>[0];

/**
 * Read-only reconciliation inspection used by `?dryRun=1`.
 *
 * It never calls the gateway and never writes. Counters are scoped to the
 * reconciliation queue; terminal failed/expired attempts are reported
 * separately and are never folded into `failed`.
 */
export async function inspectReconciliationQueue(): Promise<ReconciliationInspection> {
  await connectToDatabase();
  const now = new Date();

  const baseFilter = {
    status: { $in: UNRESOLVED_STATUSES },
  } as unknown as CountFilter;

  const eligibleFilter = {
    status: { $in: UNRESOLVED_STATUSES },
    reconciliationStatus: { $ne: "resolved" },
    tranId: { $nin: [null, ""] },
    $or: [
      { nextCheckAt: { $lte: now } },
      { nextCheckAt: null, createdAt: { $lte: new Date(now.getTime() - 2 * 60 * 1000) } },
    ],
  } as unknown as CountFilter;

  // A record is skipped when it cannot be reconciled: no tranId to query, or
  // it is still unresolved but already marked resolved by an earlier run.
  const skippedFilter = {
    status: { $in: UNRESOLVED_STATUSES },
    $or: [
      { tranId: { $in: [null, ""] } },
      { tranId: { $exists: false } },
      { reconciliationStatus: "resolved" },
    ],
  } as unknown as CountFilter;

  const noReferenceFilter = {
    status: { $in: UNRESOLVED_STATUSES },
    $or: [{ tranId: { $in: [null, ""] } }, { tranId: { $exists: false } }],
  } as unknown as CountFilter;

  const resolvedFilter = {
    status: { $in: UNRESOLVED_STATUSES },
    reconciliationStatus: "resolved",
  } as unknown as CountFilter;

  const [
    scanned,
    eligible,
    skipped,
    noGatewayReference,
    reconciliationStatusResolved,
    terminalFailed,
    terminalExpired,
    failedWebhooks,
    retryableFailedWebhooks,
  ] = await Promise.all([
    PaymentAttempt.countDocuments(baseFilter),
    PaymentAttempt.countDocuments(eligibleFilter),
    PaymentAttempt.countDocuments(skippedFilter),
    PaymentAttempt.countDocuments(noReferenceFilter),
    PaymentAttempt.countDocuments(resolvedFilter),
    PaymentAttempt.countDocuments({ status: "failed" }),
    PaymentAttempt.countDocuments({ status: "expired" }),
    PaymentWebhookInbox.countDocuments({ processingStatus: "failed" }),
    PaymentWebhookInbox.countDocuments({
      processingStatus: "failed",
      processingAttempts: { $lt: 5 },
    }),
  ]);

  const pending = computePendingCount({ scanned, eligible, skipped });

  return {
    scanned,
    eligible,
    pending,
    skipped,
    failed: failedWebhooks,
    failedWebhooks,
    retryableFailedWebhooks,
    terminalFailed,
    terminalExpired,
    noGatewayReference,
    reconciliationStatusResolved,
    unresolvedStatuses: UNRESOLVED_STATUSES,
    inspectedAt: now.toISOString(),
  };
}
