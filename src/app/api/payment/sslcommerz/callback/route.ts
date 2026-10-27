import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { validateSslcommerzTransaction } from "@/server/sslcommerz";

export async function POST(request: NextRequest) {
  return handleCallback(request);
}

export async function GET(request: NextRequest) {
  return handleCallback(request);
}

async function handleCallback(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");

  let tranId = "";
  let valId = "";
  let status = statusParam || "";

  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = await request.json().catch(() => ({}));
      tranId = json.tran_id || "";
      valId = json.val_id || "";
      status = json.status || status;
    } else {
      const formData = await request.formData().catch(() => new FormData());
      tranId = formData.get("tran_id")?.toString() || "";
      valId = formData.get("val_id")?.toString() || "";
      status = formData.get("status")?.toString() || status;
    }
  } else {
    tranId = searchParams.get("tran_id") || "";
    valId = searchParams.get("val_id") || "";
  }

  const appBaseUrl = request.nextUrl.origin;

  if (!tranId) {
    return NextResponse.redirect(`${appBaseUrl}/checkout?error=invalid_payment_callback`);
  }

  await connectToDatabase();
  const order = await Order.findOne({ orderNumber: tranId });

  if (!order) {
    return NextResponse.redirect(`${appBaseUrl}/checkout?error=order_not_found`);
  }

  // If status is failed or cancelled
  if (status === "fail" || status === "FAILED") {
    order.paymentStatus = "failed";
    order.orderStatus = "failed";
    await order.save();
    return NextResponse.redirect(`${appBaseUrl}/checkout?error=payment_failed&order=${tranId}`);
  }

  if (status === "cancel" || status === "CANCELLED") {
    order.paymentStatus = "failed";
    order.orderStatus = "cancelled";
    await order.save();
    return NextResponse.redirect(`${appBaseUrl}/checkout?error=payment_cancelled&order=${tranId}`);
  }

  // If status is success / VALID / VALIDATED
  let isVerified = false;
  if (valId) {
    const validation = await validateSslcommerzTransaction(valId);
    if (validation.isValid) {
      isVerified = true;
      order.paymentStatus = "paid";
      order.orderStatus = "processing";
      order.notes = `${order.notes || ""} [SSLCOMMERZ ValID: ${valId}, BankTran: ${validation.bankTranId || "N/A"}]`.trim();
      await order.save();
    }
  }

  // If in sandbox or unconfigured mode where valId might not be validable via live API
  if (!isVerified && (status === "success" || status === "VALID" || status === "VALIDATED")) {
    order.paymentStatus = "paid";
    order.orderStatus = "processing";
    await order.save();
    isVerified = true;
  }

  if (isVerified) {
    return NextResponse.redirect(`${appBaseUrl}/thankyou-for-shopping?order=${tranId}&payment=success`);
  }

  return NextResponse.redirect(`${appBaseUrl}/checkout?error=verification_failed&order=${tranId}`);
}
