import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { PaymentWebhookInbox, type IPaymentWebhookInbox } from "@/models/PaymentWebhookInbox";
import { generateEventFingerprint } from "../payment-idempotency";
import { redactSensitiveData } from "../utils/redact-sensitive-data";

export class PaymentWebhookRepository {
  /**
   * Persists an inbound notification in the durable inbox with unique fingerprinting.
   * If the notification is a duplicate, returns the existing record.
   */
  public static async recordInboundWebhook(args: {
    provider?: string;
    attemptId?: Types.ObjectId | null;
    tranId: string;
    valId?: string | null;
    status: string;
    amount?: number | string;
    rawPayload: Record<string, unknown>;
  }): Promise<{ isDuplicate: boolean; inboxDoc: IPaymentWebhookInbox }> {
    await connectToDatabase();

    const provider = args.provider || "sslcommerz";
    const fingerprint = generateEventFingerprint({
      provider,
      tranId: args.tranId,
      valId: args.valId,
      status: args.status,
      amount: args.amount,
    });

    const sanitizedPayload = redactSensitiveData<Record<string, unknown>>(args.rawPayload);

    try {
      const inboxDoc = await PaymentWebhookInbox.create({
        provider,
        attemptId: args.attemptId || null,
        tranId: args.tranId.trim(),
        valId: args.valId ? args.valId.trim() : null,
        eventFingerprint: fingerprint,
        rawPayload: sanitizedPayload,
        receivedAt: new Date(),
        processingStatus: "pending",
        processingAttempts: 0,
      });

      return { isDuplicate: false, inboxDoc };
    } catch (err: unknown) {
      // MongoDB duplicate key error (code 11000) means already stored
      const isMongoDuplicate = typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
      if (isMongoDuplicate) {
        const existing = await PaymentWebhookInbox.findOne({ eventFingerprint: fingerprint });
        if (existing) {
          return { isDuplicate: true, inboxDoc: existing };
        }
      }
      throw err;
    }
  }

  public static async markProcessed(
    inboxId: string | Types.ObjectId,
    status: "processed" | "failed" | "ignored",
    error?: string
  ): Promise<void> {
    await connectToDatabase();

    const existing = await PaymentWebhookInbox.findById(inboxId)
      .select("processingAttempts")
      .lean();
    const nextAttemptCount = (existing?.processingAttempts || 0) + 1;

    // Failed notifications are retried with bounded exponential backoff:
    // 2, 4, 8, 16 minutes … capped at one hour. The retry job honours
    // `nextRetryAt`, so a permanently broken notification cannot spin every run.
    const nextRetryAt =
      status === "failed"
        ? new Date(Date.now() + Math.min(2 ** nextAttemptCount * 60_000, 60 * 60_000))
        : null;

    await PaymentWebhookInbox.findByIdAndUpdate(inboxId, {
      $set: {
        processingStatus: status,
        processedAt: new Date(),
        lastError: error || null,
        nextRetryAt,
      },
      $inc: { processingAttempts: 1 },
    });
  }
}
