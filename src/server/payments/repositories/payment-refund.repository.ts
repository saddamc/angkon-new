import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { PaymentRefund, type IPaymentRefund, type RefundStatus } from "@/models/PaymentRefund";

export class PaymentRefundRepository {
  public static async createRefund(data: {
    refundId: string;
    paymentId: Types.ObjectId;
    orderId: Types.ObjectId;
    orderNumber: string;
    tranId: string;
    valId: string;
    bankTranId: string;
    amount: number;
    currency?: string;
    reason: string;
    requestedBy: string;
  }): Promise<IPaymentRefund> {
    await connectToDatabase();
    return await PaymentRefund.create({
      refundId: data.refundId,
      paymentId: data.paymentId,
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      tranId: data.tranId,
      valId: data.valId,
      bankTranId: data.bankTranId,
      amount: data.amount,
      currency: data.currency || "BDT",
      status: "initiated",
      reason: data.reason,
      requestedBy: data.requestedBy,
      initiatedAt: new Date(),
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
   * Sum of refund amounts that count against the refundable balance.
   *
   * By default only committed refunds (processing at the gateway / succeeded at
   * the bank) are counted. Pass `includeInitiated` to also count freshly
   * created `initiated` rows — this is what makes the balance reservation in
   * `ProcessRefundService.initiateRefund` atomic: the new refund doc is part of
   * the sum before the amount is validated, so two concurrent refunds can never
   * both claim the same balance.
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

  public static async updateStatus(
    refundId: string | Types.ObjectId,
    status: RefundStatus,
    updates?: {
      refundRefId?: string | null;
      failureReason?: string | null;
      rawResponse?: Record<string, unknown> | null;
      rawQueryResponse?: Record<string, unknown> | null;
    }
  ): Promise<IPaymentRefund | null> {
    await connectToDatabase();
    const now = new Date();
    const updateOps: Record<string, unknown> = {
      status,
    };

    if (updates?.refundRefId !== undefined) updateOps.refundRefId = updates.refundRefId;
    if (updates?.failureReason !== undefined) updateOps.failureReason = updates.failureReason;
    if (updates?.rawResponse !== undefined) updateOps.rawResponse = updates.rawResponse;
    if (updates?.rawQueryResponse !== undefined) updateOps.rawQueryResponse = updates.rawQueryResponse;

    if (status === "succeeded") {
      updateOps.processedAt = now;
    } else if (status === "failed") {
      updateOps.failedAt = now;
    }

    return await PaymentRefund.findByIdAndUpdate(refundId, { $set: updateOps }, { new: true });
  }
}
