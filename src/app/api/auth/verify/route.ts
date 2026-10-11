import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie } from "@/server/auth";
import { findUserByToken } from "@/server/account";

/**
 * GET /api/auth/verify?token=… — the link in the verification email.
 * Marks the email verified, signs the customer in, and sends them to
 * /my-account (which prompts for a password if the account has none).
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const redirectTo = (status: string) => new URL(`/my-account?verify=${status}`, request.nextUrl.origin);

  try {
    const user = await findUserByToken("verify", token);
    if (!user) {
      return NextResponse.redirect(redirectTo("invalid"));
    }

    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    user.verifyTokenHash = null; // single use
    user.verifyTokenExpires = null;
    await user.save();

    const response = NextResponse.redirect(redirectTo("success"));
    setSessionCookie(response, { id: String(user._id), email: user.email, name: user.name, role: user.role });
    return response;
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.redirect(redirectTo("error"));
  }
}
