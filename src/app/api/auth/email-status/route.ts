import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { EMAIL_REGEX, normalizeEmail } from "@/server/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/email-status
 * Checks if an email belongs to an existing customer and whether it has been verified.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: unknown };
    const email = normalizeEmail(body.email);

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ exists: false, emailVerified: false });
    }

    await connectToDatabase();
    const user = await User.findOne({ email }).select("email emailVerified name").lean();

    if (!user) {
      return NextResponse.json({ exists: false, emailVerified: false });
    }

    return NextResponse.json({
      exists: true,
      emailVerified: Boolean(user.emailVerified),
      name: user.name || "",
    });
  } catch (err) {
    console.warn("email-status check warning:", err);
    return NextResponse.json({ exists: false, emailVerified: false });
  }
}
