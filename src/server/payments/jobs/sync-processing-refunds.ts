import { connectToDatabase } from "@/lib/mongodb";
import { PaymentRefund } from "@/models/PaymentRefund";
import { ProcessRefundService } from "../services/process-refund";

export interface RefundSyncJobResult {
  /** Refunds in `processing` state that were polled at the gateway. */
  processed: number;
  /** Polls that confirmed the money reached the customer (`succeeded`). */
  succeeded: number;
  /** Polls where the gateway/bank is still working — will be retried next run. */
  stillProcessing: number;
  /** Polls where the gateway reported the refund failed/cancelled. */
  failed: number;
  /** Unexpected errors while polling (network etc.) — retried next run. */
  errors: number;
  /**
   * Observability counter: refunds stuck in `initiated` (created durably but
   * the gateway call outcome was never recorded). These are NEVER
   * auto-resolved because the gateway outcome is unknowable — they still hold
   * a balance reservation and need an admin decision.
   */
  stuckInitiated: number;
}

/**
 * Polls SSLCOMMERZ for every refund sitting in `processing`.
 *
 * The gateway refund API is asynchronous: `initiateRefund` accepting the request
 * only moves money later. Without this job a refund could sit in `processing`
 * forever unless an admin manually clicked "Sync". It runs as part of
 * `runAllPaymentJobs()` (cron + admin "Reconcile now") so attempt/order refund
 * statuses converge automatically.
 */
export async function runSyncProcessingRefundsJob(
  batchSize: number = 20
): Promise<RefundSyncJobResult> {
  await connectToDatabase();

  const [processing, stuckInitiatedCount] = await Promise.all([
    PaymentRefund.find({
      status: "processing",
      refundRefId: { $exists: true, $nin: ["", null] },
    })
      .sort({ updatedAt: 1, createdAt: 1 })
      .limit(Math.max(1, batchSize))
      .lean(),
    PaymentRefund.countDocuments({
      status: "initiated",
      initiatedAt: { $lt: new Date(Date.now() - 15 * 60 * 1000) },
    }),
  ]);

  const result: RefundSyncJobResult = {
    processed: 0,
    succeeded: 0,
    stillProcessing: 0,
    failed: 0,
    errors: 0,
    stuckInitiated: stuckInitiatedCount,
  };

  for (const refund of processing) {
    try {
      result.processed += 1;
      const sync = await ProcessRefundService.syncRefundStatus(refund.refundId);
      if (sync.status === "succeeded") {
        result.succeeded += 1;
      } else if (sync.status === "failed") {
        result.failed += 1;
      } else {
        result.stillProcessing += 1;
      }
    } catch {
      result.errors += 1;
    }
  }

  return result;
}
