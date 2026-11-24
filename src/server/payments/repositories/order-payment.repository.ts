import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Order, type IOrder } from "@/models/Order";
import { commitStockForOrder, releaseStockForOrder } from "@/server/products/stock";

export class OrderPaymentRepository {
  public static async findByOrderNumber(orderNumber: string): Promise<IOrder | null> {
    await connectToDatabase();
    return await Order.findOne({ orderNumber: orderNumber.trim() });
  }

  /**
   * Settles order payment atomically: changes paymentStatus to "paid" exactly once.
   * Concurrent callbacks or IPN calls that lose the race detect alreadySettled === true.
   */
  public static async settleOrderPayment(args: {
    orderId: string | Types.ObjectId;
    orderNumber: string;
    amount: number;
    paymentId: string | Types.ObjectId;
    valId?: string | null;
    isHighRisk?: boolean;
    actor?: string;
  }): Promise<{ settled: boolean; alreadySettled: boolean; order: IOrder | null }> {
    await connectToDatabase();
    const now = new Date();

    const claimed = await Order.findOneAndUpdate(
      {
        _id: args.orderId,
        paymentStatus: { $ne: "paid" },
      },
      {
        $set: {
          paymentStatus: "paid",
          paidAt: now,
          failedAt: null,
          paidAmount: args.amount,
          expectedCodAmount: 0,
          codSettlementStatus: "none",
          paymentId: args.paymentId,
        },
      },
      { new: true }
    );

    if (claimed) {
      // Order status transition: high risk -> "on-hold", safe -> "processing"
      const nextOrderStatus = args.isHighRisk ? "on-hold" : "processing";
      const note = args.isHighRisk
        ? `SSLCOMMERZ payment verified with HIGH RISK (val_id: ${args.valId || "N/A"}). Held for manual inspection.`
        : `SSLCOMMERZ payment verified (val_id: ${args.valId || "N/A"})`;

      await Order.updateOne(
        { _id: claimed._id, orderStatus: { $in: ["pending", "on-hold"] } },
        {
          $set: { orderStatus: nextOrderStatus },
          $push: {
            statusHistory: {
              status: nextOrderStatus,
              previousStatus: claimed.orderStatus,
              actor: args.actor || "sslcommerz",
              note,
              source: "payment_gateway",
              at: now,
            },
          },
        }
      );

      // Finalize inventory deduction exactly once
      await commitStockForOrder(claimed);

      const refreshed = await Order.findById(claimed._id);
      return { settled: true, alreadySettled: false, order: refreshed };
    }

    const currentOrder = await Order.findById(args.orderId);
    return {
      settled: false,
      alreadySettled: currentOrder?.paymentStatus === "paid",
      order: currentOrder,
    };
  }

  /**
   * Marks an order failed or cancelled, and restores inventory safely.
   */
  public static async markOrderPaymentFailed(args: {
    orderNumber: string;
    status: "failed" | "cancelled";
    reason?: string;
    actor?: string;
  }): Promise<void> {
    await connectToDatabase();
    const now = new Date();
    const nextOrderStatus = args.status === "cancelled" ? "cancelled" : "failed";

    await Order.updateOne(
      {
        orderNumber: args.orderNumber,
        paymentStatus: { $ne: "paid" },
        orderStatus: { $in: ["pending", "on-hold"] },
      },
      {
        $set: {
          paymentStatus: args.status,
          failedAt: args.status === "failed" ? now : null,
          expectedCodAmount: 0,
          codSettlementStatus: "none",
          orderStatus: nextOrderStatus,
        },
        $push: {
          statusHistory: {
            status: nextOrderStatus,
            previousStatus: "pending",
            actor: args.actor || "sslcommerz",
            note: args.reason || `Payment ${args.status}`,
            source: "payment_gateway",
            at: now,
          },
        },
      }
    );

    const order = await Order.findOne({ orderNumber: args.orderNumber });
    if (order && order.paymentStatus !== "paid") {
      await releaseStockForOrder(order);
    }
  }
}
