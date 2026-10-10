import { NextRequest, NextResponse } from "next/server";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const JWT_SECRET = process.env.JWT_SECRET ?? "changeme";

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

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    // Constant-time-ish comparison to avoid timing attacks
    const userMatch = username === ADMIN_USERNAME;
    const passMatch = password === ADMIN_PASSWORD;
    if (!userMatch || !passMatch) {
      // Same delay regardless of which field failed
      await new Promise((r) => setTimeout(r, 500));
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await sign(
      { sub: username, role: "admin", iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8 },
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

export async function DELETE() {
  // Logout — clear the cookie
  const response = NextResponse.json({ ok: true });
  response.cookies.set("nb_admin_token", "", { httpOnly: true, maxAge: 0, path: "/" });
  return response;
}
