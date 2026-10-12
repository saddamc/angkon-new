import { NextRequest, NextResponse } from "next/server";
import { EMAIL_REGEX, normalizeEmail } from "@/server/auth";
import { CODE_TTL_MS, discardEmailCode, issueEmailCode } from "@/server/email-code";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { sendVerificationCodeEmail } from "@/lib/email/account-emails";

/**
 * POST /api/auth/email-code/send { email, name? }
 * Emails a 6-digit code so the customer can confirm their address at checkout.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: unknown; name?: unknown };
    const email = normalizeEmail(body.email);
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";

    if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    // Stop code-spamming a victim's inbox, and stop one visitor from hammering the sender.
    const [perEmail, perIp] = await Promise.all([
      rateLimit(`code-send:email:${email}`, 6, 60 * 60),
      rateLimit(`code-send:ip:${clientIp(request)}`, 20, 60 * 60),
    ]);
    if (!perEmail.allowed || !perIp.allowed) {
      const wait = Math.max(perEmail.retryAfterSeconds, perIp.retryAfterSeconds);
      return NextResponse.json(
        { error: "Too many codes requested. Please wait a while before trying again.", reason: "limit", retryAfterSeconds: wait },
        { status: 429 },
      );
    }

    const issued = await issueEmailCode(email);
    if ("cooldownSeconds" in issued) {
      return NextResponse.json(
        { error: "A code was sent a moment ago. Check your inbox and spam folder.", reason: "cooldown", retryAfterSeconds: issued.cooldownSeconds },
        { status: 429 },
      );
    }

    const result = await sendVerificationCodeEmail({ to: email, name, code: issued.code });
    if (!result.success) {
      // Don't leave an unusable code behind or make the customer wait out a cooldown.
      await discardEmailCode(email);
      console.warn("Verification code email failed:", result.error);
      return NextResponse.json(
        { error: "We couldn't send the code right now. Please try again in a moment." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, expiresInMinutes: CODE_TTL_MS / 60000, resendAfterSeconds: 60 });
  } catch (error) {
    console.error("Email code send error:", error);
    const message = error instanceof Error ? error.message : "Unable to send verification code. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
