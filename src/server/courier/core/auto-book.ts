import type { IOrder } from "@/models/Order";
import { Shipment } from "@/models/Shipment";
import { courierService } from "./courier-service";
import { getCourierSettings } from "../settings";

/**
 * Best-effort auto-booking invoked when `autoBookOnConfirm` is enabled in
 * Courier Settings and an order becomes confirmed / processing / ready_to_ship.
 * Never throws and enforces all CourierService business rules.
 */
export async function tryAutoBookOnConfirm(order: IOrder): Promise<{
  attempted: boolean;
  booked: boolean;
  courier?: string;
  trackingCode?: string | null;
  error?: string;
}> {
  const settings = await getCourierSettings();
  if (!settings.autoBookOnConfirm) {
    return { attempted: false, booked: false };
  }
  if (order.consignmentId || order.trackingCode) {
    return { attempted: false, booked: false };
  }

  // Never auto-book a reopened/cancelled order: a previous consignment (even a
  // cancelled one) means a human must explicitly confirm a new parcel.
  const priorShipment = await Shipment.findOne({ orderId: order._id }).select("_id").lean();
  if (priorShipment) {
    return { attempted: false, booked: false };
  }

  const res = await courierService.bookShipment({
    orderIdOrNumber: order.orderNumber,
    provider: settings.defaultProvider === "pathao" ? "steadfast" : settings.defaultProvider,
    note: settings.defaultParcelNote || "",
    actor: "auto-book",
    tenantId: "default",
    ip: "internal",
    userAgent: "auto-book",
  });

  if (!res.ok) {
    return {
      attempted: true,
      booked: false,
      error: res.error,
    };
  }

  return {
    attempted: true,
    booked: true,
    courier: res.shipment.provider,
    trackingCode: res.shipment.trackingCode || res.shipment.consignmentId,
  };
}
