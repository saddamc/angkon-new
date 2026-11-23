import { runReconcilePendingPaymentsJob } from "./jobs/reconcile-pending-payments";
import { runExpirePaymentAttemptsJob } from "./jobs/expire-payment-attempts";
import { runRetryFailedVerificationsJob } from "./jobs/retry-failed-verifications";
import { runSyncProcessingRefundsJob } from "./jobs/sync-processing-refunds";

export interface PaymentJobSuiteResult {
  reconcile: Awaited<ReturnType<typeof runReconcilePendingPaymentsJob>>;
  expire: Awaited<ReturnType<typeof runExpirePaymentAttemptsJob>>;
  retry: Awaited<ReturnType<typeof runRetryFailedVerificationsJob>>;
  refundSync: Awaited<ReturnType<typeof runSyncProcessingRefundsJob>>;
}

/**
 * One entry point for every scheduled payment job, shared by the cron route
 * and the admin "Reconcile now" action so the two can never drift apart.
 */
export async function runAllPaymentJobs(): Promise<PaymentJobSuiteResult> {
  const [reconcile, expire, retry, refundSync] = await Promise.all([
    runReconcilePendingPaymentsJob(30),
    runExpirePaymentAttemptsJob(50),
    runRetryFailedVerificationsJob(20),
    runSyncProcessingRefundsJob(20),
  ]);

  return { reconcile, expire, retry, refundSync };
}
