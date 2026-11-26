import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import {
  PaymentRefund,
  type IPaymentRefund,
  type RefundStatus,
  type RefundChannel,
} from "@/models/PaymentRefund";

export class PaymentRefundRepository {
  public static async createRefund(data: {
    refundId: string;
    /** Null for offline refunds with no payment attempt. */
    paymentId: Types.ObjectId | null;
    orderId: Types.ObjectId;
    orderNumber: string;
    /** Null for offline refunds. */
    tranId?: string | null;
    /** Null for offline refunds. */
    valId?: string | null;
    /** Null for offline refunds. */
    bankTranId?: string | null;
    amount: number;
    currency?: string;
    reason: string;
    requestedBy: string;
    refundChannel?: RefundChannel;
    refundMethod?: string | null;
    externalReference?: string | null;
    refundDate?: Date | null;
    evidenceNote?: string | null;
    adminNote?: string | null;
    idempotencyKey?: string | null;
    /** Pre-set status — default "initiated"; pass "succeeded" for offline confirmed entries. */
    status?: RefundStatus;
    processedAt?: Date | null;
  }): Promise<IPaymentRefund> {
    await connectToDatabase();
    return await PaymentRefund.create({
      refundId: data.refundId,
      paymentId: data.paymentId,
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      tranId: data.tranId ?? null,
      valId: data.valId ?? null,
      bankTranId: data.bankTranId ?? null,
      amount: data.amount,
      currency: data.currency || "BDT",
      status: data.status ?? "initiated",
      reason: data.reason,
      requestedBy: data.requestedBy,
      initiatedAt: new Date(),
      processedAt: data.processedAt ?? null,
      refundChannel: data.refundChannel ?? "sslcommerz",
      refundMethod: data.refundMethod ?? null,
      externalReference: data.externalReference ?? null,
      refundDate: data.refundDate ?? null,
      evidenceNote: data.evidenceNote ?? null,
      adminNote: data.adminNote ?? null,
      idempotencyKey: data.idempotencyKey ?? null,
    });
  }

  public static async findById(id: string | Types.ObjectId): Promise<IPaymentRefund | null> {
    await connectToDatabase();
    return await PaymentRefund.findById(id);
  }

  public static async findByRefundId(refundId: string): Promise<IPaymentRefund | null> {
    await connectToDatabase();
    return await PaymentRefund.findOne({ refundId: refundId.trim() });
  }

  public static async findByPaymentId(paymentId: string | Types.ObjectId): Promise<IPaymentRefund[]> {
    await connectToDatabase();
    return await PaymentRefund.find({ paymentId }).sort({ createdAt: -1 });
  }

  public static async findByOrderNumber(orderNumber: string): Promise<IPaymentRefund[]> {
    await connectToDatabase();
    return await PaymentRefund.find({ orderNumber: orderNumber.trim() }).sort({ createdAt: -1 });
  }

  /**
   * Check idempotency: returns an existing refund for the same key + payment.
   * Returns null if none exists.
   */
  public static async findByIdempotencyKey(
    idempotencyKey: string,
    paymentId: Types.ObjectId | null
  ): Promise<IPaymentRefund | null> {
    await connectToDatabase();
    return await PaymentRefund.findOne({
      idempotencyKey: idempotencyKey.trim(),
      paymentId,
    });
  }

  /**
   * Sum of refund amounts that count against the refundable balance for a
   * specific payment attempt.
   *
   * By default only committed refunds (processing at the gateway / succeeded at
   * the bank) are counted. Pass `includeInitiated` to also count freshly
   * created `initiated` rows — this is what makes the balance reservation in
   * `ProcessRefundService.initiateRefund` atomic.
   */
  public static async getTotalRefundedForPayment(
    paymentId: string | Types.ObjectId,
    options?: { includeInitiated?: boolean }
  ): Promise<number> {
    await connectToDatabase();
    const statuses: RefundStatus[] = options?.includeInitiated
      ? ["initiated", "processing", "succeeded"]
      : ["processing", "succeeded"];

    const result = await PaymentRefund.aggregate([
      {
        $match: {
          paymentId: typeof paymentId === "string" ? new Types.ObjectId(paymentId) : paymentId,
          status: { $in: statuses },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    return result[0]?.total || 0;
  }

  /**
   * Sum of refund amounts across ALL payment attempts for an order.
   * Useful when an order has multiple payment attempts.
   */
  public static async getTotalRefundedForOrderNumber(
    orderNumber: string,
    options?: { includeInitiated?: boolean }
  ): Promise<number> {
    await connectToDatabase();
    const statuses: RefundStatus[] = options?.includeInitiated
      ? ["initiated", "processing", "succeeded"]
      : ["processing", "succeeded"];

    const result = await PaymentRefund.aggregate([
      {
        $match: {
          orderNumber: orderNumber.trim(),
          status: { $in: statuses },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    return result[0]?.total || 0;
  }

  public static async updateStatus(
    refundId: string | Types.ObjectId,
    status: RefundStatus,
    updates?: {
      refundRefId?: string | null;
      failureReason?: string | null;
      rawResponse?: Record<string, unknown> | null;
      rawQueryResponse?: Record<string, unknown> | null;
      reconciliationRequired?: boolean;
      reconcileError?: string | null;
    }
  ): Promise<IPaymentRefund | null> {
    await connectToDatabase();
    const now = new Date();
    const updateOps: Record<string, unknown> = { status };

    if (updates?.refundRefId !== undefined) updateOps.refundRefId = updates.refundRefId;
    if (updates?.failureReason !== undefined) updateOps.failureReason = updates.failureReason;
    if (updates?.rawResponse !== undefined) updateOps.rawResponse = updates.rawResponse;
    if (updates?.rawQueryResponse !== undefined) updateOps.rawQueryResponse = updates.rawQueryResponse;
    if (updates?.reconciliationRequired !== undefined)
      updateOps.reconciliationRequired = updates.reconciliationRequired;
    if (updates?.reconcileError !== undefined) updateOps.reconcileError = updates.reconcileError;

    if (status === "succeeded") {
      updateOps.processedAt = now;
    } else if (status === "failed") {
      updateOps.failedAt = now;
    }

    return await PaymentRefund.findByIdAndUpdate(refundId, { $set: updateOps }, { new: true });
  }
}
