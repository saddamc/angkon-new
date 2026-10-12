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

export async function POST(request: NextRequest) {
  try {
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
      // point the customer to the email link instead of "already exists".
      const message = existing.password
        ? "An account with this email already exists. Please sign in."
        : "We already created an account for this email with your order. Check your inbox for the verification link, or use “Forgot password” to set a password.";
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
    try {
      const emailResult = await issueVerificationEmail(user, request, "register");
      if (!emailResult.success) {
        console.warn("Registration verification email warning:", emailResult.error);
      }
    } catch (emailErr) {
      console.warn("Registration verification email failed to dispatch:", emailErr);
    }

    const response = NextResponse.json({ ok: true, user: publicUser(user) }, { status: 201 });
    setSessionCookie(response, { id: String(user._id), email: user.email, name: user.name, role: user.role });
    return response;
  } catch (error) {
    console.error("User registration error:", error);
    return NextResponse.json({ error: "Failed to register account. Please try again." }, { status: 500 });
  }
}
