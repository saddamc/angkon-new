import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import {
  EMAIL_REGEX,
  hashPassword,
  normalizeEmail,
  setSessionCookie,
  validatePassword,
} from "@/server/auth";
import { issueVerificationEmail, publicUser } from "@/server/account";
import { clientIp, hashIp, rateLimit, createRateLimitResponse } from "@/server/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const limit = await rateLimit(`auth-register:ip:${hashIp(ip)}`, 6, 60 * 60, {
      failClosed: true,
    });
    if (!limit.allowed) {
      return createRateLimitResponse(
        limit,
        "Too many accounts created from this IP address. Please wait an hour before trying again."
      );
    }

    const body = await request.json();
    const email = normalizeEmail(body.email);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    const passwordError = validatePassword(body.password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    await connectToDatabase();

    const existing = await User.findOne({ email });
    if (existing) {
      // An account created automatically at checkout has no password yet —
      // point the customer to the email code instead of "already exists".
      const message = existing.password
        ? "An account with this email already exists. Please sign in — or use “Sign in with a code” if you don't remember the password."
        : "We already created an account for this email with your order. Use “Sign in with a code” on this page (no password needed) to get in and set a password.";
      return NextResponse.json({ error: message }, { status: 409 });
    }

    const user = await User.create({
      name: name || email.split("@")[0],
      email,
      password: hashPassword(body.password),
      phone,
      role: "customer",
      emailVerified: false,
      source: "register",
    });

    // Send the verification email directly before responding to guarantee delivery in serverless lambdas.
    let emailSent = true;
    try {
      const emailResult = await issueVerificationEmail(user, request, "register");
      if (!emailResult.success) {
        emailSent = false;
        console.warn("Registration verification email warning:", emailResult.error);
      }
    } catch (emailErr) {
      emailSent = false;
      console.warn("Registration verification email failed to dispatch:", emailErr);
    }

    const response = NextResponse.json(
      { ok: true, user: publicUser(user), emailSent },
      { status: 201 }
    );
    setSessionCookie(response, { id: String(user._id), email: user.email, name: user.name, role: user.role });
    return response;
  } catch (error) {
    console.error("User registration error:", error);
    return NextResponse.json({ error: "Failed to register account. Please try again." }, { status: 500 });
  }
}
