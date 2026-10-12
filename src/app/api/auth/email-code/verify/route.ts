import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { EMAIL_REGEX, normalizeEmail, setSessionCookie } from "@/server/auth";
import { consumeEmailCode, isWellFormedCode } from "@/server/email-code";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { publicUser } from "@/server/account";

/**
 * POST /api/auth/email-code/verify { email, code, name?, phone? }
 * A correct code proves the customer owns the address, so we:
 *   1. mark (or create) their account as email-verified, and
 *   2. sign them in — the checkout then places the order as that account.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: unknown; code?: unknown; name?: unknown; phone?: unknown };
    const email = normalizeEmail(body.email);
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!email || !EMAIL_REGEX.test(email) || !isWellFormedCode(code)) {
      return NextResponse.json({ error: "Enter the 6-digit code from your email." }, { status: 400 });
    }

    const [perEmail, perIp] = await Promise.all([
      rateLimit(`code-verify:email:${email}`, 12, 15 * 60),
      rateLimit(`code-verify:ip:${clientIp(request)}`, 40, 15 * 60),
    ]);
    if (!perEmail.allowed || !perIp.allowed) {
      return NextResponse.json({ error: "Too many attempts. Please wait a few minutes and try again." }, { status: 429 });
    }

    const check = await consumeEmailCode(email, code);
    if (check.status === "error") {
      return NextResponse.json(
        { error: "Our verification service is momentarily unavailable. Please try again in a moment." },
        { status: 503 }
      );
    }
    if (check.status === "expired") {
      return NextResponse.json({ error: "That code has expired. Request a new one.", code: "EXPIRED" }, { status: 400 });
    }
    if (check.status === "locked") {
      return NextResponse.json({ error: "Too many wrong codes. Request a new code.", code: "LOCKED" }, { status: 429 });
    }
    if (check.status === "invalid") {
      const left = check.attemptsLeft;
      return NextResponse.json(
        { error: `That code isn't correct. ${left} ${left === 1 ? "try" : "tries"} left.`, code: "INVALID", attemptsLeft: left },
        { status: 400 },
      );
    }

    // ── Code is correct: verify / create the account and sign in ──
    await connectToDatabase();
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
    const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 30) : "";

    let user = await User.findOne({ email });
    if (!user) {
      try {
        user = await User.create({
          name: name || email.split("@")[0],
          email,
          password: "", // set later from My Account (or sign in with a code again)
          phone,
          role: "customer",
          emailVerified: true,
          emailVerifiedAt: new Date(),
          source: "checkout",
        });
      } catch {
        user = await User.findOne({ email }); // created by a parallel request
      }
    }
    if (!user) {
      return NextResponse.json({ error: "Unable to verify user account. Please try again." }, { status: 500 });
    }

    if (!user.emailVerified) {
      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
      user.verifyTokenHash = null; // any older link is no longer needed
      user.verifyTokenExpires = null;
    }
    if (!user.phone && phone) user.phone = phone;
    await user.save();

    const response = NextResponse.json({ ok: true, user: publicUser(user) });
    setSessionCookie(response, { id: String(user._id), email: user.email, name: user.name, role: user.role });
    return response;
  } catch (error) {
    console.error("Email code verify error:", error);
    const message = error instanceof Error ? error.message : "Verification failed. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
