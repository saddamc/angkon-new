import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import {
  PaymentEvent,
  type IPaymentEventDocument,
  type PaymentEventType,
  type PaymentEventSource,
} from "@/models/PaymentEvent";
import { redactSensitiveData } from "../utils/redact-sensitive-data";

export class PaymentEventRepository {
  public static async recordEvent(args: {
    /** Null for manual offline refund events that have no payment attempt. */
    attemptId: Types.ObjectId | string | null;
    orderId: Types.ObjectId | string;
    orderNumber: string;
    /** Empty string for events with no gateway transaction. */
    tranId: string;
    eventType: PaymentEventType | string;
    source: PaymentEventSource | string;
    gatewayStatus?: string | null;
    metadata?: Record<string, unknown> | null;
    correlationId?: string | null;
  }): Promise<IPaymentEventDocument> {
    await connectToDatabase();

    const sanitizedMeta = args.metadata ? redactSensitiveData(args.metadata) : null;

    return await PaymentEvent.create({
      attemptId: args.attemptId ? new Types.ObjectId(String(args.attemptId)) : null,
      orderId: new Types.ObjectId(String(args.orderId)),
      orderNumber: args.orderNumber.trim(),
      tranId: (args.tranId || "").trim(),
      eventType: args.eventType,
      source: args.source,
      timestamp: new Date(),
      gatewayStatus: args.gatewayStatus || null,
      metadata: sanitizedMeta,
      correlationId: args.correlationId || null,
    });
  }

  public static async getEventsForAttempt(attemptId: string | Types.ObjectId): Promise<IPaymentEventDocument[]> {
    await connectToDatabase();
    return await PaymentEvent.find({ attemptId }).sort({ timestamp: 1 }).lean();
  }

  public static async getEventsForOrder(orderId: string | Types.ObjectId): Promise<IPaymentEventDocument[]> {
    await connectToDatabase();
    return await PaymentEvent.find({ orderId }).sort({ timestamp: 1 }).lean();
  }
}
