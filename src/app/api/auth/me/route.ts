import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/server/auth";
import { getUserOrders } from "@/server/orders";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ authenticated: false, user: null, orders: [] }, { status: 401 });
    }

    const payload = verifyAuthToken(token);
    if (!payload?.sub) {
      return NextResponse.json({ authenticated: false, user: null, orders: [] }, { status: 401 });
    }

    await connectToDatabase();

    const userDoc = await User.findById(payload.sub).select("-password").lean();
    if (!userDoc) {
      return NextResponse.json({ authenticated: false, user: null, orders: [] }, { status: 401 });
    }

    // Retrieve customer's real orders from MongoDB
    const orders = await getUserOrders({ email: userDoc.email, phone: userDoc.phone });

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: String(userDoc._id),
          name: userDoc.name,
          email: userDoc.email,
          phone: userDoc.phone,
          role: userDoc.role,
          addresses: userDoc.addresses || [],
        },
        orders,
      },
      {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ authenticated: false, user: null, orders: [] }, { status: 500 });
  }
}
