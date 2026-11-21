import { Types } from "mongoose";
import { Order } from "@/models/Order";
import { sendMetaCapiEvent } from "@/server/meta-capi";
import { isSslcommerzLive } from "@/server/sslcommerz";

const META_EVENT_SOURCE =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://angkon.net";

/**
 * Sends the server-side Meta Purchase event at most once per order.
 *
 * This used to live in the legacy settlement helper. Keeping it here means
 * every settlement path (callback, IPN, reconciliation) goes through the same
 * idempotent claim, and sandbox transactions never pollute the live dataset.
 */
export async function sendVerifiedPurchaseCapi(
  orderId: Types.ObjectId | string,
  eventSourceUrl?: string
): Promise<void> {
  if (!isSslcommerzLive()) return;

  const now = new Date();
  const claimed = await Order.findOneAndUpdate(
    {
      _id: orderId,
      $or: [{ capiPurchaseSentAt: null }, { capiPurchaseSentAt: { $exists: false } }],
    },
    { $set: { capiPurchaseSentAt: now } },
    { new: true }
  );

  if (!claimed) return;

  try {
    const customer = claimed.customer;
    const nameParts = (customer.fullName || "").trim().split(/\s+/);
    const firstName = nameParts[0] || customer.fullName;
    const lastName = nameParts.slice(1).join(" ") || undefined;

    await sendMetaCapiEvent({
      eventName: "Purchase",
      eventId: `order_${claimed.orderNumber}`,
      eventSourceUrl: eventSourceUrl || `${META_EVENT_SOURCE}/checkout`,
      userData: {
        email: customer.email,
        phone: customer.phone,
        firstName,
        lastName,
        city: customer.city,
        district: customer.district,
        postalCode: customer.postalCode,
        clientIp: claimed.visitorContext?.clientIp,
        clientUserAgent: claimed.visitorContext?.clientUserAgent,
        fbp: claimed.visitorContext?.fbp,
        fbc: claimed.visitorContext?.fbc,
      },
      customData: {
        value: claimed.total,
        currency: "BDT",
        order_id: claimed.orderNumber,
        num_items: claimed.items.reduce((acc, it) => acc + it.quantity, 0),
        content_ids: claimed.items.map((it) => it.productId),
        content_type: "product",
        contents: claimed.items.map((it) => ({
          id: String(it.productId),
          quantity: it.quantity,
          price: it.price,
        })),
      },
    });
  } catch (err) {
    console.warn("[Meta CAPI] Post-payment purchase error:", err);
  }
}
