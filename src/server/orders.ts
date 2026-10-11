import { connectToDatabase } from "@/lib/mongodb";
import { Order, IOrder } from "@/models/Order";

/**
 * Server-only Orders Data Access Layer
 */

export async function getUserOrders(identifier: { email?: string; phone?: string }): Promise<IOrder[]> {
  try {
    await connectToDatabase();
    const orConditions: Array<Record<string, unknown>> = [];

    if (identifier.email && identifier.email.trim()) {
      orConditions.push({ "customer.email": identifier.email.trim().toLowerCase() });
    }
    if (identifier.phone && identifier.phone.trim()) {
      orConditions.push({ "customer.phone": identifier.phone.trim() });
    }

    if (orConditions.length === 0) return [];

    const orders = await Order.find({ $or: orConditions })
      .sort({ createdAt: -1 })
      .lean();

    return (orders as unknown as IOrder[]) || [];
  } catch (error) {
    console.error("Failed to fetch user orders:", error);
    return [];
  }
}

export async function getOrderByNumber(orderNumber: string): Promise<IOrder | null> {
  try {
    await connectToDatabase();
    const order = await Order.findOne({ orderNumber }).lean();
    return (order as unknown as IOrder) ?? null;
  } catch (error) {
    console.error("Failed to fetch order by number:", error);
    return null;
  }
}
