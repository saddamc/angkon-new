import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { validateSslcommerzTransaction } from "@/server/sslcommerz";
import { sendMetaCapiEvent } from "@/server/meta-capi";

export async function POST(request: NextRequest) {
  try {
    let tranId = "";
    let valId = "";
    let status = "";

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = await request.json();
      tranId = json.tran_id || "";
      valId = json.val_id || "";
      status = json.status || "";
    } else {
      const formData = await request.formData();
      tranId = formData.get("tran_id")?.toString() || "";
      valId = formData.get("val_id")?.toString() || "";
      status = formData.get("status")?.toString() || "";
    }

    if (!tranId || !valId) {
      return NextResponse.json({ error: "Missing required IPN parameters" }, { status: 400 });
    }

    const validation = await validateSslcommerzTransaction(valId);
    if (!validation.isValid && status !== "VALID" && status !== "VALIDATED") {
      return NextResponse.json({ error: "Transaction validation failed" }, { status: 400 });
    }

    await connectToDatabase();
    const order = await Order.findOne({ orderNumber: tranId });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update order status atomically
    order.paymentStatus = "paid";
    if (order.orderStatus === "pending") {
      order.orderStatus = "processing";
    }
    order.notes = `${order.notes || ""} [IPN Verified: ValID=${valId}, Bank=${validation.bankTranId || "N/A"}]`.trim();

    // Dispatch server-side Meta Conversions API (CAPI) Purchase event if callback hasn't already sent it
    if (!order.notes?.includes("[CAPI_PURCHASE_SENT]")) {
      order.notes = `${order.notes || ""} [CAPI_PURCHASE_SENT]`.trim();
      await order.save();

      try {
        const appBase = process.env.NEXT_PUBLIC_APP_URL || "https://angkon.net";
        await sendMetaCapiEvent({
          eventName: "Purchase",
          eventId: `order_${order.orderNumber}`,
          eventSourceUrl: `${appBase}/checkout`,
          userData: {
            email: order.customer.email,
            phone: order.customer.phone,
            firstName: order.customer.fullName,
            city: order.customer.city,
            district: order.customer.district,
            postalCode: order.customer.postalCode,
            clientIp: order.visitorContext?.clientIp,
            clientUserAgent: order.visitorContext?.clientUserAgent,
            fbp: order.visitorContext?.fbp,
            fbc: order.visitorContext?.fbc,
          },
          customData: {
            value: order.total,
            currency: "BDT",
            order_id: order.orderNumber,
            num_items: order.items.reduce((acc, it) => acc + it.quantity, 0),
            content_ids: order.items.map((it) => it.productId),
            content_type: "product",
            contents: order.items.map((it) => ({
              id: String(it.productId),
              quantity: it.quantity,
              item_price: it.price,
            })),
          },
        });
      } catch (err) {
        console.warn("[Meta CAPI] SSLCOMMERZ IPN post-payment purchase error:", err);
      }
    } else {
      await order.save();
    }

    return NextResponse.json({ success: true, message: "IPN processed successfully" });
  } catch (error) {
    console.error("SSLCOMMERZ IPN error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
