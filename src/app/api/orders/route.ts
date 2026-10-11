import { after, NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { sendOrderConfirmationEmails } from "@/lib/email/resend";
import { User, type IUser } from "@/models/User";
import { EMAIL_REGEX, getSessionUserId, normalizeEmail, setSessionCookie } from "@/server/auth";
import { issueVerificationEmail } from "@/server/account";

import REAL_PRODUCTS from "@/data/real-products.json";

type AccountStatus = "signed_in" | "created" | "existing" | "none";

/**
 * Decide which customer account owns this order.
 * - Signed in → that account.
 * - New email → create an account (no password yet) and sign the customer in;
 *   they verify the email and set a password from the link we send.
 * - Email already registered but not signed in → link the order to that account
 *   but do NOT sign in (otherwise anyone could take over an account by typing
 *   its email at checkout).
 */
async function resolveOrderAccount(
  request: NextRequest,
  orderEmail: string,
  customer: { fullName: string; phone: string; address: string; city: string; district: string; postalCode: string },
): Promise<{ status: AccountStatus; user: IUser | null }> {
  const sessionUserId = getSessionUserId(request);
  if (sessionUserId) {
    const user = await User.findById(sessionUserId);
    if (user) return { status: "signed_in", user };
  }
  if (!orderEmail || !EMAIL_REGEX.test(orderEmail)) return { status: "none", user: null };

  const existing = await User.findOne({ email: orderEmail });
  if (existing) return { status: "existing", user: existing };

  try {
    const created = await User.create({
      name: customer.fullName,
      email: orderEmail,
      password: "",
      phone: customer.phone,
      role: "customer",
      emailVerified: false,
      source: "checkout",
      addresses: [{ ...customer, isDefault: true }],
    });
    return { status: "created", user: created };
  } catch {
    // Two orders with the same new email at once — the other request created it.
    const raced = await User.findOne({ email: orderEmail });
    return raced ? { status: "existing", user: raced } : { status: "none", user: null };
  }
}

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
      email: normalizeEmail(email),
      phone: String(phone).trim(),
      address: String(address).trim(),
      city: String(city || resolvedDistrict).trim(),
      district: String(resolvedDistrict).trim(),
      postalCode: postalCode ? String(postalCode).trim() : "",
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemsData = items.map((item: any) => {
      let resolvedImage = item.image ? String(item.image) : "";
      if (!resolvedImage) {
        // Fallback to real products catalog if image wasn't sent
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const matched = (REAL_PRODUCTS as any[]).find(
          (p) => p.id === Number(item.productId) || (item.slug && p.slug === item.slug)
        );
        if (matched?.images?.[0]?.src) {
          resolvedImage = matched.images[0].src;
        }
      }
      return {
        productId: Number(item.productId || 0),
        slug: item.slug ? String(item.slug) : "",
        name: String(item.name || "Item"),
        price: parseFloat(item.price || "0"),
        quantity: parseInt(item.quantity || "1", 10),
        size: item.size ? String(item.size) : "",
        image: resolvedImage,
      };
    });

    try {
      await connectToDatabase();

      // Account linking must never block the order itself.
      let account: { status: AccountStatus; user: IUser | null } = { status: "none", user: null };
      try {
        account = await resolveOrderAccount(request, customerData.email, customerData);
      } catch (accountErr) {
        console.warn("Order account linking failed (order still placed):", accountErr);
      }
      const accountUser = account.user;

      const newOrder = await Order.create({
        orderNumber,
        userId: accountUser?._id ?? null,
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

      // Send emails after the response (Customer confirmation + Admin alert).
      // after() keeps the serverless function alive until they finish; a bare
      // un-awaited promise can be dropped on Vercel once the response is sent.
      after(() =>
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
        }),
      );

      // New account: send the "verify your email / set a password" link.
      if (account.status === "created" && accountUser) {
        after(() =>
          issueVerificationEmail(accountUser, request, "checkout", newOrder.orderNumber).catch((err) =>
            console.warn("Checkout verification email failed:", err),
          ),
        );
      }

      const response = NextResponse.json(
        {
          orderId: newOrder.orderNumber,
          orderNumber: newOrder.orderNumber,
          shippingFee,
          subtotal,
          total,
          status: "success",
          account: {
            status: account.status,
            email: accountUser?.email ?? customerData.email,
            emailVerified: Boolean(accountUser?.emailVerified),
          },
        },
        { status: 201 }
      );

      // Auto sign-in only for the account this order just created.
      if (account.status === "created" && accountUser) {
        setSessionCookie(response, {
          id: String(accountUser._id),
          email: accountUser.email,
          name: accountUser.name,
          role: accountUser.role,
        });
      }
      return response;
    } catch (dbErr) {
      console.warn("MongoDB order creation warning, returning confirmed order number:", dbErr);

      // Attempt email dispatch even if DB had a temporary hiccup
      after(() =>
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
        }),
      );

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
