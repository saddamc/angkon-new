import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getSessionUserId } from "@/server/auth";
import { canSendVerification, issueVerificationEmail } from "@/server/account";

/** POST /api/auth/resend-verification — signed-in customer asks for a new link. */
export async function POST(request: NextRequest) {
  try {
    const userId = getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }
    if (user.emailVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }
    if (!canSendVerification(user)) {
      return NextResponse.json(
        { error: "A link was sent less than a minute ago. Please wait a moment and check your inbox and spam folder." },
        { status: 429 },
      );
    }

    const result = await issueVerificationEmail(user, request, "resend");
    if (!result.success) {
      return NextResponse.json({ error: "We couldn't send the email right now. Please try again shortly." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
