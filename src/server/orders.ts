import { connectToDatabase } from "@/lib/mongodb";
import { Order, IOrder } from "@/models/Order";

/**
 * Server-only Orders Data Access Layer
 */

// Customer order history lives in src/server/account.ts (getAccountOrders):
// it matches by account, and by email only once that email is verified.

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
