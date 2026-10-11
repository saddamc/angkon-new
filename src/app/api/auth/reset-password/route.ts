import { NextRequest, NextResponse } from "next/server";
import { hashPassword, setSessionCookie, validatePassword } from "@/server/auth";
import { findUserByToken, publicUser } from "@/server/account";

/**
 * GET  /api/auth/reset-password?token=… — check a link is still valid (for the page).
 * POST /api/auth/reset-password { token, password } — set the new password.
 * Using the emailed link proves the customer owns the address, so the email
 * is marked verified and they're signed in.
 */
export async function GET(request: NextRequest) {
  const user = await findUserByToken("reset", request.nextUrl.searchParams.get("token"));
  return NextResponse.json({ valid: Boolean(user), email: user?.email ?? null });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const passwordError = validatePassword(body.password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const user = await findUserByToken("reset", body.token);
    if (!user) {
      return NextResponse.json(
        { error: "This link has expired or was already used. Please request a new one." },
        { status: 400 },
      );
    }

    user.password = hashPassword(body.password);
    user.resetTokenHash = null; // single use
    user.resetTokenExpires = null;
    if (!user.emailVerified) {
      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
      user.verifyTokenHash = null;
      user.verifyTokenExpires = null;
    }
    await user.save();

    const response = NextResponse.json({ ok: true, user: publicUser(user) });
    setSessionCookie(response, { id: String(user._id), email: user.email, name: user.name, role: user.role });
    return response;
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
