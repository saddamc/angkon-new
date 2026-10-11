import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getSessionUserId } from "@/server/auth";
import { getAccountOrders, publicUser } from "@/server/account";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function GET(request: NextRequest) {
  try {
    const userId = getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ authenticated: false, user: null, orders: [] }, { status: 401, headers: NO_STORE });
    }

    await connectToDatabase();
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null, orders: [] }, { status: 401, headers: NO_STORE });
    }

    const orders = await getAccountOrders(user);

    return NextResponse.json(
      { authenticated: true, user: publicUser(user), orders },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ authenticated: false, user: null, orders: [] }, { status: 500, headers: NO_STORE });
  }
}
