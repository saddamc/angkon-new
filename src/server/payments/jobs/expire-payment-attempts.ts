import { ExpirePaymentAttemptsService } from "../services/expire-payment-attempts";

export async function runExpirePaymentAttemptsJob(batchSize: number = 50): Promise<{ expiredCount: number }> {
  return await ExpirePaymentAttemptsService.expireStaleAttempts(batchSize);
}
