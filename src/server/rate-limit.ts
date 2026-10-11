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

/** Best-effort client IP behind Vercel's proxy. */
export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded?.split(",")[0] || request.headers.get("x-real-ip") || "unknown").trim();
}
