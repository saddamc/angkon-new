/**
 * Privacy sanitization for URLs in telemetry logs.
 * Redacts fbclid, tokens, session IDs, passwords, and sensitive query parameters.
 */
export function sanitizeTelemetryUrl(rawUrl?: string): string {
  if (!rawUrl) return "/";
  try {
    const dummyBase = "https://www.angkon.net";
    const isRelative = rawUrl.startsWith("/");
    const parsed = new URL(isRelative ? `${dummyBase}${rawUrl}` : rawUrl);
    const sensitiveKeys = [
      "fbclid",
      "token",
      "access_token",
      "capi_token",
      "key",
      "secret",
      "auth",
      "session_id",
      "session",
      "password",
      "pass",
      "email",
      "phone",
      "code",
    ];

    for (const key of Array.from(parsed.searchParams.keys())) {
      const lower = key.toLowerCase();
      if (
        sensitiveKeys.some((s) => lower === s || lower.includes("token") || lower.includes("secret"))
      ) {
        parsed.searchParams.set(key, "[REDACTED]");
      }
    }

    return isRelative ? `${parsed.pathname}${parsed.search}` : parsed.toString();
  } catch {
    return rawUrl.split("?")[0] || "/";
  }
}

/**
 * Sanitizes event parameters so raw emails, phone numbers, and secrets are never leaked in client responses.
 */
export function sanitizeTelemetryParameters(params?: Record<string, unknown>): Record<string, unknown> {
  if (!params || typeof params !== "object") return {};
  const safe: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(params)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("pass") ||
      lower.includes("secret") ||
      lower.includes("token") ||
      lower.includes("auth")
    ) {
      safe[key] = "[REDACTED]";
    } else if (lower === "email" && typeof val === "string") {
      safe[key] = val.includes("@")
        ? `${val.slice(0, 2)}***@${val.split("@")[1]}`
        : "[REDACTED]";
    } else if (lower === "phone" && typeof val === "string") {
      safe[key] = val.length >= 6 ? `${val.slice(0, 4)}***${val.slice(-2)}` : "[REDACTED]";
    } else {
      safe[key] = val;
    }
  }

  return safe;
}
