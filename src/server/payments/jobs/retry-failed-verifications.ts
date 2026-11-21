import { connectToDatabase } from "@/lib/mongodb";
import { PaymentWebhookInbox } from "@/models/PaymentWebhookInbox";
import { ProcessIpnService } from "../services/process-ipn";

export interface RetryVerificationsStats {
  processed: number;
  recovered: number;
  stillFailing: number;
}

export async function runRetryFailedVerificationsJob(batchSize: number = 20): Promise<RetryVerificationsStats> {
  await connectToDatabase();
  const failedInboxes = await PaymentWebhookInbox.find({
    processingStatus: "failed",
    processingAttempts: { $lt: 5 },
    $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: new Date() } }],
  })
    .sort({ nextRetryAt: 1, receivedAt: 1 })
    .limit(batchSize);

  const stats: RetryVerificationsStats = {
    processed: failedInboxes.length,
    recovered: 0,
    stillFailing: 0,
  };

  for (const inbox of failedInboxes) {
    try {
      const res = await ProcessIpnService.processWebhook(inbox.rawPayload);
      if (res.ok) {
        stats.recovered++;
      } else {
        stats.stillFailing++;
      }
    } catch {
      stats.stillFailing++;
    }
  }

  return stats;
}
