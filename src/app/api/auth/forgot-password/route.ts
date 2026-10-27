import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { EMAIL_REGEX, EMAIL_RESEND_COOLDOWN_MS, normalizeEmail } from "@/server/auth";
import { issuePasswordResetEmail } from "@/server/account";
import { clientIp, rateLimit } from "@/server/rate-limit";

// Same answer whether or not the account exists, so this can't be used to
// discover which emails are registered.
const GENERIC_OK = {
  ok: true,
  message: "If an account exists for that email, we've sent a link to set a new password. It expires in 1 hour.",
};

/** POST /api/auth/forgot-password { email } */
export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const ipLimit = await rateLimit(`auth-forgot:ip:${ip}`, 5, 15 * 60);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many password reset requests from this network. Please wait 15 minutes before trying again.",
          retryAfterSeconds: ipLimit.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email = normalizeEmail(body.email);
    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const emailLimit = await rateLimit(`auth-forgot:email:${email}`, 3, 15 * 60);
    if (!emailLimit.allowed) {
      return NextResponse.json(GENERIC_OK); // Quietly rate-limit to prevent account probing
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
