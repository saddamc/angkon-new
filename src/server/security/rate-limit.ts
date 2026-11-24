import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { RateLimitBucket } from "@/models/RateLimitBucket";
import { getJwtSecret } from "@/lib/env";
import { securityLog } from "./security-log";

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetSeconds: number;
  windowStart: Date;
  expiresAt: Date;
  /** True when the store could not be reached and the caller chose fail-open. */
  degraded?: boolean;
}

export interface RateLimitOptions {
  /**
   * With `true`, a database failure denies the request instead of allowing it.
   * Use it for credential endpoints (login, register, OTP) where availability
   * is less important than blocking a brute-force window.
   *
   * The default is fail-open: a transient database error must never stop a
   * customer from paying.
   */
  failClosed?: boolean;
}

/** Keeps only the non-identifying prefix of a bucket key for logging. */
function keyScope(key: string): string {
  return key.split(":").slice(0, 2).join(":") || "unknown";
}

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && (error as { code?: number }).code === 11000
  );
}

/**
 * One atomic upsert. Two simultaneous first-requests for the same bucket can
 * race between "not found" and "insert"; MongoDB reports E11000 for the loser,
 * so a single retry re-reads/increments the winner's document.
 */
async function incrementBucket(
  bucketKey: string,
  windowStart: Date,
  expiresAt: Date
) {
  const run = () =>
    RateLimitBucket.findOneAndUpdate(
      { key: bucketKey },
      {
        $inc: { count: 1 },
        $setOnInsert: { windowStart, expiresAt },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

  try {
    return await run();
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    return run();
  }
}

/**
 * Derives a secure HMAC hash for client IPs to avoid storing raw PII
 * in MongoDB collections while preserving deterministic throttling.
 */
export function hashIp(ip: string): string {
  const normalized = (ip || "unknown").trim().toLowerCase();
  if (normalized === "unknown" || !normalized) return "unknown";
  try {
    const secret = process.env.RATE_LIMIT_HMAC_SECRET || getJwtSecret();
    return crypto.createHmac("sha256", secret).update(normalized).digest("hex").slice(0, 16);
  } catch {
    return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16);
  }
}

/**
 * Validates whether a candidate string is a well-formed IPv4 or IPv6 address.
 */
function isValidIp(ip: string): boolean {
  if (!ip || typeof ip !== "string") return false;
  const trimmed = ip.trim();
  // IPv4 simple pattern
  if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(trimmed)) {
    const octets = trimmed.split(".").map(Number);
    return octets.every((o) => o >= 0 && o <= 255);
  }
  // IPv6 pattern
  if (/^[0-9a-fA-F:]+$/.test(trimmed) && trimmed.includes(":")) {
    return true;
  }
  return false;
}

/**
 * Resilient, trusted client IP extraction behind reverse proxies
 * (Vercel, Cloudflare, Nginx).
 *
 * Trust model:
 * - `cf-connecting-ip` is only trusted when `TRUST_CLOUDFLARE_IP_HEADER=true`,
 *   because any client can send that header when Cloudflare is not in front.
 * - `x-real-ip` is set by the nearest reverse proxy and is preferred next.
 * - `x-forwarded-for` is read from the RIGHTMOST hop. The leftmost value is
 *   attacker-controlled (a client can prepend a fake IP); the rightmost value
 *   is appended by the trusted proxy.
 * - Set `TRUST_PROXY_HEADERS=false` when the app is reachable directly, so
 *   forwarded headers are ignored entirely.
 */
export function clientIp(request: NextRequest): string {
  const trustForwarded =
    process.env.TRUST_PROXY_HEADERS?.trim().toLowerCase() !== "false";

  if (!trustForwarded) return "unknown";

  const trustCloudflare =
    process.env.TRUST_CLOUDFLARE_IP_HEADER?.trim().toLowerCase() === "true";

  if (trustCloudflare) {
    const cfIp = request.headers.get("cf-connecting-ip");
    if (cfIp && isValidIp(cfIp)) return cfIp.trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp && isValidIp(realIp)) return realIp.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
    // Rightmost non-empty IP is the one appended by the nearest trusted reverse proxy
    for (let i = parts.length - 1; i >= 0; i--) {
      const candidate = parts[i];
      if (isValidIp(candidate)) {
        return candidate;
      }
    }
  }

  return "unknown";
}

/**
 * Calculates the estimated sliding-window request count using a weighted
 * approximation between the current window and the previous window.
 *
 * Prevents fixed-window boundary burst exploits (where an attacker sends
 * 100% of the limit at the end of window N and 100% at the start of window N+1).
 */
export function calculateSlidingWindowCount(
  currentCount: number,
  prevCount: number,
  nowMs: number,
  windowStartMs: number,
  windowSizeMs: number
): number {
  const timeElapsed = Math.max(0, nowMs - windowStartMs);
  const prevWeight = Math.max(0, Math.min(1, (windowSizeMs - timeElapsed) / windowSizeMs));
  return currentCount + Math.floor(prevCount * prevWeight);
}

/**
 * Atomic MongoDB-backed windowed rate limiter with sliding-window smoothing.
 *
 * - Atomic single-query counter increment (`$inc`) with an E11000 retry for
 *   simultaneous first requests.
 * - Concurrency-safe across serverless instances with no in-memory state.
 * - Sliding-window smoothing: weights the previous window's count by the
 *   overlapping fraction of the rolling window, defeating boundary burst attacks.
 * - Window enforcement is mathematical; the TTL index is cleanup only.
 * - Fail-open for purchase paths, opt-in fail-closed for credential endpoints.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const safeLimit = Math.max(1, limit);
  const safeWindowSec = Math.max(1, windowSeconds);
  const windowSizeMs = safeWindowSec * 1000;
  const nowMs = Date.now();

  // Mathematical window boundary
  const windowStartMs = Math.floor(nowMs / windowSizeMs) * windowSizeMs;
  const prevWindowStartMs = windowStartMs - windowSizeMs;
  const windowStart = new Date(windowStartMs);
  const windowEndMs = windowStartMs + windowSizeMs;

  // TTL cleanup time far enough in the future that the window has completed.
  // 2 full windows ensure the previous window is available for sliding calculation.
  // TTL is housekeeping only; it is never used to decide if a window is open.
  const expiresAt = new Date(windowStartMs + windowSizeMs * 2);

  const bucketKey = `${key}:${windowStartMs}`;
  const prevBucketKey = `${key}:${prevWindowStartMs}`;

  try {
    await connectToDatabase();

    // Concurrently increment the current bucket and inspect the previous bucket
    const [doc, prevDoc] = await Promise.all([
      incrementBucket(bucketKey, windowStart, expiresAt),
      RateLimitBucket.findOne({ key: prevBucketKey }, { count: 1 }).lean(),
    ]);

    const currentCount = doc?.count ?? 1;
    const prevCount = (prevDoc as { count?: number } | null)?.count ?? 0;

    // Weighted sliding-window counter calculation
    const effectiveCount = calculateSlidingWindowCount(
      currentCount,
      prevCount,
      nowMs,
      windowStartMs,
      windowSizeMs
    );

    const allowed = effectiveCount <= safeLimit;
    const remaining = Math.max(0, safeLimit - effectiveCount);
    const retryAfterSeconds = Math.max(1, Math.ceil((windowEndMs - nowMs) / 1000));
    const resetSeconds = Math.ceil(windowEndMs / 1000);

    if (!allowed) {
      securityLog("rate_limit.blocked", {
        scope: keyScope(key),
        count: effectiveCount,
        limit: safeLimit,
        windowSeconds: safeWindowSec,
      });
    }

    return {
      allowed,
      count: effectiveCount,
      limit: safeLimit,
      remaining,
      retryAfterSeconds,
      resetSeconds,
      windowStart,
      expiresAt,
    };
  } catch (error) {
    // Payment/checkout paths fail open: an infrastructure glitch must not stop a
    // legitimate purchase. Credential endpoints pass `failClosed` so a database
    // outage cannot become a brute-force window.
    securityLog("rate_limit.store_error", {
      scope: keyScope(key),
      failClosed: Boolean(options.failClosed),
      message: error instanceof Error ? error.message.slice(0, 160) : "unknown",
    });

    if (options.failClosed) {
      securityLog("rate_limit.degraded_fail_closed", { scope: keyScope(key) });
      return {
        allowed: false,
        count: safeLimit,
        limit: safeLimit,
        remaining: 0,
        retryAfterSeconds: safeWindowSec,
        resetSeconds: Math.ceil(windowEndMs / 1000),
        windowStart,
        expiresAt,
        degraded: true,
      };
    }

    return {
      allowed: true,
      count: 0,
      limit: safeLimit,
      remaining: safeLimit,
      retryAfterSeconds: 0,
      resetSeconds: Math.ceil((nowMs + windowSizeMs) / 1000),
      windowStart,
      expiresAt,
      degraded: true,
    };
  }
}

/**
 * Checks dual rate limits in parallel: one for client IP (with HMAC hashing)
 * and optionally one for authenticated account / email.
 */
export async function checkDualRateLimit(options: {
  request: NextRequest;
  prefix: string;
  ipLimit: { limit: number; windowSeconds: number };
  accountLimit?: { identifier: string; limit: number; windowSeconds: number };
}): Promise<RateLimitResult> {
  const rawIp = clientIp(options.request);
  const hashedIp = hashIp(rawIp);
  const ipKey = `${options.prefix}:ip:${hashedIp}`;

  const tasks: Promise<RateLimitResult>[] = [
    rateLimit(ipKey, options.ipLimit.limit, options.ipLimit.windowSeconds),
  ];

  if (options.accountLimit && options.accountLimit.identifier) {
    const safeId = options.accountLimit.identifier.toLowerCase().trim();
    const accountKey = `${options.prefix}:account:${safeId}`;
    tasks.push(
      rateLimit(accountKey, options.accountLimit.limit, options.accountLimit.windowSeconds)
    );
  }

  const results = await Promise.all(tasks);
  const ipRes = results[0];
  const accountRes = results[1];

  if (accountRes && !accountRes.allowed) {
    return accountRes;
  }
  return ipRes;
}

/**
 * Creates standard HTTP 429 response with canonical RFC 6585 and RateLimit headers.
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  customMessage?: string
): NextResponse {
  const message =
    customMessage ||
    "Too many requests. Please wait a few moments before trying again.";

  return NextResponse.json(
    {
      error: message,
      retryAfterSeconds: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.resetSeconds),
        "Cache-Control": "no-store",
      },
    }
  );
}

/**
 * Attaches Retry-After and X-RateLimit-* headers to any standard Response/NextResponse.
 */
export function applyRateLimitHeaders<T extends Response>(
  response: T,
  result: RateLimitResult
): T {
  response.headers.set("Retry-After", String(result.retryAfterSeconds));
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(result.resetSeconds));
  return response;
}
