import type { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { RateLimit } from "@/models/RateLimit";

/**
 * Count an attempt against `key` and report whether it is still allowed.
 * Stored in MongoDB so the limit holds across serverless instances.
 * If the database check itself fails, the request is allowed (fail open) so a
 * rate-limit outage never blocks customers.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  try {
    await connectToDatabase();
    const now = new Date();
    const resetAt = new Date(now.getTime() + windowSeconds * 1000);

    // Start a fresh window if the old one has ended, otherwise add to the count.
    await RateLimit.updateOne({ key, resetAt: { $lte: now } }, { $set: { count: 0, resetAt } });
    const doc = await RateLimit.findOneAndUpdate(
      { key },
      { $inc: { count: 1 }, $setOnInsert: { resetAt } },
      { upsert: true, new: true },
    );

    const allowed = doc.count <= limit;
    const retryAfterSeconds = Math.max(1, Math.ceil((doc.resetAt.getTime() - now.getTime()) / 1000));
    return { allowed, retryAfterSeconds };
  } catch (error) {
    console.warn("Rate-limit check failed (allowing request):", error);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

/**
 * Resilient client IP extraction behind reverse proxies (Vercel, Cloudflare, Nginx).
 * Priority order:
 * 1. Cloudflare header (cf-connecting-ip)
 * 2. Dedicated proxy header (x-real-ip)
 * 3. Last hop in x-forwarded-for (prevents client spoofing by prepending fake IPs)
 */
export function clientIp(request: NextRequest): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
    // Rightmost non-empty IP is the one appended by the nearest trusted reverse proxy
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }
  }

  return "unknown";
}
