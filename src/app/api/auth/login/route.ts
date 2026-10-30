import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { normalizeEmail, setSessionCookie, verifyPassword } from "@/server/auth";
import { publicUser } from "@/server/account";
import { clientIp, rateLimit } from "@/server/rate-limit";

const INVALID = "Invalid email or password.";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    // Active Rate Limiting: 5 attempts per 15 minutes per email, 25 per IP
    const ip = clientIp(request);
    const [perEmail, perIp] = await Promise.all([
      rateLimit(`auth-login:email:${email}`, 5, 15 * 60),
      rateLimit(`auth-login:ip:${ip}`, 25, 15 * 60),
    ]);

    if (!perEmail.allowed || !perIp.allowed) {
      const wait = Math.max(perEmail.retryAfterSeconds, perIp.retryAfterSeconds);
      return NextResponse.json(
        {
          error: "Too many failed login attempts. Please wait a few minutes before trying again.",
          retryAfterSeconds: wait,
        },
        { status: 429 }
      );
    }

    await connectToDatabase();
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.findOne({ email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } });
    }

    if (!user) {
      return NextResponse.json({ error: INVALID }, { status: 401 });
    }

    // Accounts created automatically at checkout have no password until the
    // customer sets one via the verification or reset email.
    if (!user.password) {
      return NextResponse.json(
        {
          error: "This account was created with your order and doesn't have a password yet. Use “Forgot password” to set one.",
          code: "NO_PASSWORD",
        },
        { status: 401 },
      );
    }

    if (!verifyPassword(password, user.password)) {
      return NextResponse.json({ error: INVALID }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, user: publicUser(user) }, { status: 200 });
    setSessionCookie(response, { id: String(user._id), email: user.email, name: user.name, role: user.role });
    return response;
  } catch (error) {
    console.error("User login error:", error);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}
