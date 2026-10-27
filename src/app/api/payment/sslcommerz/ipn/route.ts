import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { validateSslcommerzTransaction } from "@/server/sslcommerz";

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
    await order.save();

    return NextResponse.json({ success: true, message: "IPN processed successfully" });
  } catch (error) {
    console.error("SSLCOMMERZ IPN error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
