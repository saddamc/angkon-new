import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getSessionUserId, hashPassword, validatePassword, verifyPassword } from "@/server/auth";
import { publicUser } from "@/server/account";

/**
 * POST /api/auth/set-password { password, currentPassword? }
 * - Account has a password → currentPassword is required (change password).
 * - Account has none (created at checkout) → allowed only after the email is
 *   verified, so a session from a mistyped checkout email can't claim it.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const body = await request.json();
    const passwordError = validatePassword(body.password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    if (user.password) {
      if (typeof body.currentPassword !== "string" || !verifyPassword(body.currentPassword, user.password)) {
        return NextResponse.json({ error: "Your current password is incorrect." }, { status: 400 });
      }
    } else if (!user.emailVerified) {
      return NextResponse.json(
        { error: "Please verify your email first — use the link we sent you." },
        { status: 403 },
      );
    }

    user.password = hashPassword(body.password);
    await user.save();
    return NextResponse.json({ ok: true, user: publicUser(user) });
  } catch (error) {
    console.error("Set password error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
