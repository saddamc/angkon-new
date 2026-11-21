import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { PaymentAttempt, type IPaymentAttempt } from "@/models/PaymentAttempt";
import type {
  PaymentAttemptStatus,
  CustomerActivityStatus,
  ReconciliationStatus,
} from "../types";
import { PaymentStateMachine, normalizePaymentStatus } from "../payment-state-machine";

export class PaymentAttemptRepository {
  public static async createAttempt(data: {
    orderId: Types.ObjectId;
    orderNumber: string;
    userId?: Types.ObjectId | null;
    attemptNumber: number;
    tranId: string;
    expectedAmount: number;
    currency?: string;
    idempotencyKey?: string | null;
    environment?: "sandbox" | "live";
  }): Promise<IPaymentAttempt> {
    await connectToDatabase();
    return await PaymentAttempt.create({
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      userId: data.userId || null,
      attemptNumber: data.attemptNumber,
      tranId: data.tranId,
      expectedAmount: data.expectedAmount,
      amount: data.expectedAmount,
      currency: data.currency || "BDT",
      status: "created",
      customerActivity: "not_redirected",
      reconciliationStatus: "not_required",
      environment: data.environment || "sandbox",
      idempotencyKey: data.idempotencyKey || undefined,
      initiatedAt: new Date(),
    });
  }

  public static async findById(id: string | Types.ObjectId): Promise<IPaymentAttempt | null> {
    await connectToDatabase();
    return await PaymentAttempt.findById(id);
  }

  public static async findByTranId(tranId: string): Promise<IPaymentAttempt | null> {
    await connectToDatabase();
    return await PaymentAttempt.findOne({ tranId: tranId.trim() });
  }

  public static async findByIdempotencyKey(key: string): Promise<IPaymentAttempt | null> {
    await connectToDatabase();
    return await PaymentAttempt.findOne({ idempotencyKey: key.trim() });
  }

  public static async findLatestByOrderNumber(orderNumber: string): Promise<IPaymentAttempt | null> {
    await connectToDatabase();
    return await PaymentAttempt.findOne({ orderNumber: orderNumber.trim() }).sort({ attemptNumber: -1 });
  }

  public static async countAttemptsForOrder(orderNumber: string): Promise<number> {
    await connectToDatabase();
    return await PaymentAttempt.countDocuments({ orderNumber: orderNumber.trim() });
  }

  /**
   * Performs an atomic conditional state transition on a payment attempt.
   * Guarantees that concurrent webhooks or late failure notifications cannot downgrade
   * an already succeeded payment.
   */
  public static async atomicTransition(args: {
    attemptId: string | Types.ObjectId;
    targetStatus: PaymentAttemptStatus;
    customerActivity?: CustomerActivityStatus;
    reconciliationStatus?: ReconciliationStatus;
    validationId?: string | null;
    bankTransactionId?: string | null;
    cardType?: string | null;
    cardBrand?: string | null;
    riskLevel?: string | null;
    riskTitle?: string | null;
    gatewayStatus?: string | null;
    lastErrorCode?: string | null;
    lastErrorMessage?: string | null;
    rawValidation?: Record<string, unknown> | null;
    note?: string | null;
  }): Promise<{ success: boolean; attempt: IPaymentAttempt | null; wasAlreadyTerminal: boolean }> {
    await connectToDatabase();
    const existing = await PaymentAttempt.findById(args.attemptId);
    if (!existing) {
      return { success: false, attempt: null, wasAlreadyTerminal: false };
    }

    const currentStatus = normalizePaymentStatus(existing.status);
    const targetStatus = normalizePaymentStatus(args.targetStatus);

    if (
      currentStatus === "succeeded" &&
      targetStatus !== "succeeded" &&
      targetStatus !== "refunded" &&
      targetStatus !== "partially_refunded"
    ) {
      // Cannot downgrade a successful payment
      return { success: true, attempt: existing, wasAlreadyTerminal: true };
    }

    if (!PaymentStateMachine.canTransition(currentStatus, targetStatus)) {
      return { success: false, attempt: existing, wasAlreadyTerminal: PaymentStateMachine.isTerminal(currentStatus) };
    }

    const now = new Date();
    const updateOps: Record<string, unknown> = {
      status: targetStatus,
      lastCheckedAt: now,
    };

    if (args.customerActivity) updateOps.customerActivity = args.customerActivity;
    if (args.reconciliationStatus) updateOps.reconciliationStatus = args.reconciliationStatus;
    if (args.validationId) {
      updateOps.validationId = args.validationId;
      updateOps.valId = args.validationId;
    }
    if (args.bankTransactionId) {
      updateOps.bankTransactionId = args.bankTransactionId;
      updateOps.bankTranId = args.bankTransactionId;
    }
    if (args.cardType) updateOps.cardType = args.cardType;
    if (args.cardBrand) updateOps.cardBrand = args.cardBrand;
    if (args.riskLevel) updateOps.riskLevel = args.riskLevel;
    if (args.riskTitle) updateOps.riskTitle = args.riskTitle;
    if (args.gatewayStatus) updateOps.gatewayStatus = args.gatewayStatus;
    if (args.lastErrorCode) updateOps.lastErrorCode = args.lastErrorCode;
    if (args.lastErrorMessage) {
      updateOps.lastErrorMessage = args.lastErrorMessage;
      updateOps.failureReason = args.lastErrorMessage;
    }
    if (args.rawValidation) updateOps.rawValidation = args.rawValidation;
    if (args.note) updateOps.note = args.note;

    if (targetStatus === "succeeded") {
      updateOps.paidAt = now;
      updateOps.validatedAt = now;
      updateOps.failedAt = null;
    } else if (targetStatus === "failed") {
      updateOps.failedAt = now;
    } else if (targetStatus === "cancelled") {
      updateOps.cancelledAt = now;
    } else if (targetStatus === "expired") {
      updateOps.expiredAt = now;
    }

    // A successful attempt may only move to a refund state. Any other target
    // must not overwrite a `succeeded` / legacy `paid` document.
    const isRefundTarget =
      targetStatus === "refunded" || targetStatus === "partially_refunded";
    const isDowngradeTarget =
      targetStatus === "failed" ||
      targetStatus === "cancelled" ||
      targetStatus === "expired" ||
      targetStatus === "unknown" ||
      targetStatus === "pending" ||
      targetStatus === "review_required";

    const filter: Record<string, unknown> = { _id: args.attemptId };
    if (isDowngradeTarget && !isRefundTarget) {
      filter.status = { $nin: ["succeeded", "paid"] };
    }

    const updated = await PaymentAttempt.findOneAndUpdate(
      filter as unknown as Parameters<typeof PaymentAttempt.findOne>[0],
      { $set: updateOps },
      { new: true }
    );

    return {
      success: Boolean(updated),
      attempt: updated ?? existing,
      wasAlreadyTerminal: !updated,
    };
  }

  /**
   * Queries pending and unknown attempts eligible for scheduled reconciliation.
   */
  public static async findEligibleForReconciliation(limit: number = 25): Promise<IPaymentAttempt[]> {
    await connectToDatabase();
    const now = new Date();

    const filter: Record<string, unknown> = {
      status: {
        $in: ["created", "initiated", "pending", "unknown", "review_required"],
      },
      $or: [
        { nextCheckAt: { $lte: now } },
        { nextCheckAt: null, createdAt: { $lte: new Date(now.getTime() - 2 * 60 * 1000) } },
      ],
      reconciliationStatus: { $ne: "resolved" },
    };

    return await PaymentAttempt.find(
      filter as unknown as Parameters<typeof PaymentAttempt.find>[0]
    )
      .sort({ nextCheckAt: 1, createdAt: 1 })
      .limit(limit);
  }
}
