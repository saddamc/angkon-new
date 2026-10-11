import crypto from "crypto";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User, IUser } from "@/models/User";

const JWT_SECRET = process.env.JWT_SECRET || "angkon_secure_jwt_secret_2026";
export const AUTH_COOKIE_NAME = "angkon_user_token";

export interface AuthTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: "customer" | "admin";
  iat: number;
  exp: number;
}

// ── 1. Secure Password Hashing via crypto.scryptSync ─────────────────────────
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

// ── 2. JWT-compatible Token Generation & Verification ─────────────────────────
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

export function createAuthToken(user: {
  id: string;
  email: string;
  name: string;
  role: "customer" | "admin";
}): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthTokenPayload = {
    sub: user.id,
    email: user.email.toLowerCase(),
    name: user.name,
    role: user.role,
    iat: now,
    exp: now + 60 * 60 * 24 * 30, // 30 days session
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${encodedPayload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${header}.${encodedPayload}.${signature}`;
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const decodedPayload = JSON.parse(base64UrlDecode(payload)) as AuthTokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (decodedPayload.exp && decodedPayload.exp < now) {
      return null; // Expired
    }

    return decodedPayload;
  } catch {
    return null;
  }
}

// ── 3. Server Session Resolver ───────────────────────────────────────────────
export async function getCurrentUser(): Promise<IUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifyAuthToken(token);
    if (!payload?.sub) return null;

    await connectToDatabase();
    const user = await User.findById(payload.sub).select("-password").lean();
    return (user as unknown as IUser) ?? null;
  } catch {
    return null;
  }
}

// ── 4. Session cookie helpers ────────────────────────────────────────────────
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function setSessionCookie(
  response: NextResponse,
  user: { id: string; email: string; name: string; role: "customer" | "admin" },
): void {
  response.cookies.set(AUTH_COOKIE_NAME, createAuthToken(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

/** User id from the session cookie on an API request, or null. */
export function getSessionUserId(request: NextRequest): string | null {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAuthToken(token)?.sub ?? null;
}

// ── 5. Passwords ─────────────────────────────────────────────────────────────
export const PASSWORD_MIN_LENGTH = 8;

/** Returns an error message, or null when the password is acceptable. */
export function validatePassword(password: unknown): string | null {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`;
  }
  if (password.length > 128) return "Password is too long.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must contain at least one letter and one number.";
  }
  return null;
}

// ── 6. One-time email tokens (verification / password reset) ────────────────
// Only the sha256 hash is stored, so a database leak can't be used to verify
// or reset accounts. Tokens are single-use and expire.
export const VERIFY_TOKEN_TTL_MS = 1000 * 60 * 60 * 48; // 48 hours
export const RESET_TOKEN_TTL_MS = 1000 * 60 * 60; // 1 hour
export const EMAIL_RESEND_COOLDOWN_MS = 1000 * 60; // 1 minute between emails

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function generateOneTimeToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("base64url");
  return { raw, hash: hashToken(raw) };
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/** Public base URL for links in emails. Prefer an explicit env var in production. */
export function getSiteUrl(request?: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (request) {
    // The dev server binds to 0.0.0.0, which browsers can't open — prefer the
    // host the visitor actually used (also correct behind Vercel's proxy).
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    if (host) {
      const proto =
        request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
        request.nextUrl.protocol.replace(":", "");
      return `${proto}://${host}`;
    }
    return request.nextUrl.origin;
  }
  return "https://angkon.net";
}
