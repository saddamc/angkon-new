import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { EMAIL_REGEX, EMAIL_RESEND_COOLDOWN_MS, normalizeEmail } from "@/server/auth";
import { issuePasswordResetEmail } from "@/server/account";

// Same answer whether or not the account exists, so this can't be used to
// discover which emails are registered.
const GENERIC_OK = {
  ok: true,
  message: "If an account exists for that email, we've sent a link to set a new password. It expires in 1 hour.",
};

/** POST /api/auth/forgot-password { email } */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);
    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email });
    if (!user) return NextResponse.json(GENERIC_OK);

    const last = user.lastResetSentAt ? new Date(user.lastResetSentAt).getTime() : 0;
    if (Date.now() - last < EMAIL_RESEND_COOLDOWN_MS) {
      return NextResponse.json(GENERIC_OK); // quietly rate-limit
    }

    await issuePasswordResetEmail(user, request);
    return NextResponse.json(GENERIC_OK);
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
