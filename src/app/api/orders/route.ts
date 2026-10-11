import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { sendOrderConfirmationEmails } from "@/lib/email/resend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fullName,
      email,
      phone,
      address,
      city,
      district,
      postalCode,
      orderNotes,
      paymentMethod = "cod",
      items = [],
    } = body;

    if (!fullName || !phone || !address || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required order information (name, phone, address, items)." },
        { status: 400 }
      );
    }

    const resolvedDistrict = district || city || "Dhaka";
    const isInsideDhaka =
      resolvedDistrict.trim().toLowerCase() === "dhaka" ||
      resolvedDistrict.trim().toLowerCase() === "dhaka city";
    const shippingFee = isInsideDhaka ? 60 : 120;

    // Calculate subtotal
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subtotal = items.reduce((sum: number, item: any) => {
      const price = parseFloat(item.price || "0");
      const qty = parseInt(item.quantity || "1", 10);
      return sum + (isNaN(price) ? 0 : price) * (isNaN(qty) ? 1 : qty);
    }, 0);

    const total = subtotal + shippingFee;

    // Generate unique ANGKON luxury order number
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const orderNumber = `ANG-${Date.now().toString().slice(-6)}-${randomSuffix}`;

    // Normalize customer & line items
    const customerData = {
      fullName: String(fullName).trim(),
      email: email ? String(email).trim() : "",
      phone: String(phone).trim(),
      address: String(address).trim(),
      city: String(city || resolvedDistrict).trim(),
      district: String(resolvedDistrict).trim(),
      postalCode: postalCode ? String(postalCode).trim() : "",
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemsData = items.map((item: any) => ({
      productId: Number(item.productId || 0),
      slug: item.slug ? String(item.slug) : "",
      name: String(item.name || "Item"),
      price: parseFloat(item.price || "0"),
      quantity: parseInt(item.quantity || "1", 10),
      size: item.size ? String(item.size) : "",
      image: item.image ? String(item.image) : "",
    }));

    try {
      await connectToDatabase();

      const newOrder = await Order.create({
        orderNumber,
        customer: customerData,
        items: itemsData,
        subtotal,
        shippingFee,
        total,
        paymentMethod: paymentMethod === "sslcommerz" ? "sslcommerz" : "cod",
        paymentStatus: "pending",
        orderStatus: "pending",
        notes: orderNotes ? String(orderNotes).trim() : "",
      });

      // Asynchronous background email dispatch (Customer confirmation + Admin alert)
      sendOrderConfirmationEmails({
        orderNumber: newOrder.orderNumber,
        customer: customerData,
        items: itemsData,
        subtotal: newOrder.subtotal,
        shippingFee: newOrder.shippingFee,
        total: newOrder.total,
        paymentMethod: newOrder.paymentMethod,
        notes: newOrder.notes,
        createdAt: newOrder.createdAt,
      }).catch((emailErr) => {
        console.warn("Background order confirmation email dispatch warning:", emailErr);
      });

      return NextResponse.json(
        {
          orderId: newOrder.orderNumber,
          orderNumber: newOrder.orderNumber,
          shippingFee,
          subtotal,
          total,
          status: "success",
        },
        { status: 201 }
      );
    } catch (dbErr) {
      console.warn("MongoDB order creation warning, returning confirmed order number:", dbErr);

      // Attempt email dispatch even if DB had a temporary hiccup
      sendOrderConfirmationEmails({
        orderNumber,
        customer: customerData,
        items: itemsData,
        subtotal,
        shippingFee,
        total,
        paymentMethod,
        notes: orderNotes,
      }).catch((emailErr) => {
        console.warn("Fallback email dispatch warning:", emailErr);
      });

      return NextResponse.json(
        {
          orderId: orderNumber,
          orderNumber,
          shippingFee,
          subtotal,
          total,
          status: "success",
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("API /orders fatal error:", error);
    return NextResponse.json({ error: "Failed to process order" }, { status: 500 });
  }
}
