import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/server/rate-limit";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const JWT_SECRET = process.env.JWT_SECRET || "angkon_secure_jwt_secret_2026";

// ── Minimal HMAC-SHA256 token (no external package needed) ──────────────────
async function sign(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${data}.${sigB64}`;
}

async function verify(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const data = `${header}.${body}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const expectedSig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
    const expectedSigB64 = btoa(String.fromCharCode(...new Uint8Array(expectedSig)));
    if (sig !== expectedSigB64) return null;
    const payload = JSON.parse(atob(body));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// GET /api/admin/login — check auth status
export async function GET(request: NextRequest) {
  const token = request.cookies.get("nb_admin_token")?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  const payload = await verify(token, JWT_SECRET);
  if (!payload) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, user: payload.sub });
}

// POST /api/admin/login — authenticate
export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const limit = await rateLimit(`admin-login:ip:${ip}`, 5, 15 * 60);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: "Too many admin login attempts from this network. Please wait 15 minutes before trying again.",
          retryAfterSeconds: limit.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    // Comparison against configured credentials or default admin/admin
    const userMatch = username === ADMIN_USERNAME;
    const passMatch = password === ADMIN_PASSWORD;
    if (!userMatch || !passMatch) {
      await new Promise((r) => setTimeout(r, 400));
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await sign(
      {
        sub: username,
        role: "admin",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
      },
      JWT_SECRET,
    );

    const response = NextResponse.json({ ok: true });
    // HttpOnly cookie — not accessible from JS (XSS-safe)
    response.cookies.set("nb_admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

// DELETE /api/admin/login — logout
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("nb_admin_token", "", { httpOnly: true, maxAge: 0, path: "/" });
  return response;
}
