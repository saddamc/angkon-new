import { NextRequest, NextResponse } from "next/server";


const WC_BASE = (process.env.NEXT_PUBLIC_WC_API_URL ?? "https://netbazarbd.net").replace(/\/$/, "");
// Prefer server-only write keys; fall back to the public read keys
const WC_CK = process.env.WC_ORDERS_CONSUMER_KEY ?? process.env.NEXT_PUBLIC_WC_CONSUMER_KEY ?? "";
const WC_CS = process.env.WC_ORDERS_CONSUMER_SECRET ?? process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET ?? "";

function wcAuth() {
  return Buffer.from(`${WC_CK}:${WC_CS}`).toString("base64");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { fullName, email, phone, address, city, district, postalCode, items, paymentMethod } = body;
    // district takes priority (sent from checkout); fall back to plain city string
    const resolvedCity = district ?? city ?? "";

    // Split full name into first/last
    const nameParts = (fullName ?? "").trim().split(/\s+/);
    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.slice(1).join(" ") || "-";

    const billing = {
      first_name: firstName,
      last_name: lastName,
      email: email ?? "",
      phone: phone ?? "",
      address_1: address ?? "",
      city: resolvedCity,
      postcode: postalCode ?? "",
      country: "BD",
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lineItems = (items ?? []).map((item: any) => ({
      product_id: item.productId,
      quantity: item.quantity,
      meta_data: item.size ? [{ key: "Size", value: item.size }] : [],
    }));

    // ── Authoritative shipping calculation (server-side, fresh from WP) ──
    // Never trust client-sent fee. Re-fetch each product's current shipping meta.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productIds: number[] = (items ?? []).map((item: any) => item.productId as number).filter(Boolean);

    let shippingFee = 0;
    if (district && productIds.length > 0) {
      const isInsideDhaka = district.trim().toLowerCase() === "dhaka" || district.trim().toLowerCase() === "dhaka city";
      
      try {
        const res = await fetch(`${WC_BASE}/wp-json/wc/v3/products?include=${productIds.join(",")}&per_page=100`, {
          headers: { Authorization: `Basic ${wcAuth()}` }
        });
        if (res.ok) {
          const products = await res.json();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          shippingFee = products.reduce((max: number, p: any) => {
            const insideStr = p.meta_data?.slice().reverse().find((m: any) => m.key === "_delivery_inside")?.value;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const outsideStr = p.meta_data?.slice().reverse().find((m: any) => m.key === "_delivery_outside")?.value;
            const inside = insideStr ? parseInt(insideStr) : 60;
            const outside = outsideStr ? parseInt(outsideStr) : 120;
            const fee = isInsideDhaka ? inside : outside;
            return Math.max(max, fee);
          }, 0);
        } else {
          shippingFee = 120;
        }
      } catch (err) {
        shippingFee = 120;
      }
    } else {
      shippingFee = 120; // Fallback
    }

    const isOnlinePayment = paymentMethod === "sslcommerz" || paymentMethod === "online";
    const wcPayload = {
      payment_method: isOnlinePayment ? "sslcommerz" : "cod",
      payment_method_title: isOnlinePayment ? "Online Payment (SSLCOMMERZ / bKash / Nagad / Cards)" : "Cash on Delivery",
      set_paid: false,
      status: "pending",
      billing,
      shipping: billing,
      line_items: lineItems,
      // Attach shipping line so WooCommerce records the correct total
      ...(shippingFee > 0 && {
        shipping_lines: [
          {
            method_id: "flat_rate",
            method_title: "Flat Rate",
            total: String(shippingFee),
          },
        ],
      }),
    };

    const response = await fetch(`${WC_BASE}/wp-json/wc/v3/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${wcAuth()}`,
      },
      body: JSON.stringify(wcPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("WooCommerce order error:", JSON.stringify(data));
      return NextResponse.json(
        { error: data?.message ?? "Failed to create order", code: data?.code },
        { status: response.status },
      );
    }

    return NextResponse.json({ orderId: data.id, orderNumber: data.number, shippingFee }, { status: 201 });
  } catch (error) {
    console.error("API /orders error:", error);
    return NextResponse.json({ error: "Failed to submit order" }, { status: 500 });
  }
}
