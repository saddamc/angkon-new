import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import mongoose from "mongoose";

// PATCH /api/admin/orders/[id] — update order status in MongoDB Atlas
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    await connectToDatabase();

    const updateFields: Record<string, unknown> = {};
    if (body.status) {
      updateFields.orderStatus = body.status;
    }
    if (body.paymentStatus) {
      updateFields.paymentStatus = body.paymentStatus;
    }

    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ orderNumber: id }, { _id: id }] }
      : { orderNumber: id };

    const updated = await Order.findOneAndUpdate(
      query,
      { $set: updateFields },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        ...updated,
        id: updated.orderNumber,
        status: updated.orderStatus,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to update order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
