import { PaymentAttemptRepository } from "../repositories/payment-attempt.repository";
import { ReconcilePaymentService } from "../services/reconcile-payment";

export interface ReconcileJobStats {
  totalProcessed: number;
  succeeded: number;
  reviewRequired: number;
  failed: number;
  stillPending: number;
  errors: number;
}

export async function runReconcilePendingPaymentsJob(batchSize: number = 25): Promise<ReconcileJobStats> {
  const eligible = await PaymentAttemptRepository.findEligibleForReconciliation(batchSize);

  const stats: ReconcileJobStats = {
    totalProcessed: eligible.length,
    succeeded: 0,
    reviewRequired: 0,
    failed: 0,
    stillPending: 0,
    errors: 0,
  };

  for (const attempt of eligible) {
    try {
      const result = await ReconcilePaymentService.reconcile(attempt);
      if (result.resolved) {
        if (result.status === "succeeded") {
          stats.succeeded++;
        } else if (result.status === "review_required") {
          stats.reviewRequired++;
        } else {
          stats.failed++;
        }
      } else {
        stats.stillPending++;
      }
    } catch {
      stats.errors++;
    }
  }

  return stats;
}
