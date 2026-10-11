import crypto from "crypto";
import { cookies } from "next/headers";
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
