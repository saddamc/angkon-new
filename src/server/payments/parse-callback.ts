import type { NextRequest } from "next/server";

/**
 * Parses a gateway callback body (form-encoded, multipart or JSON) into a
 * flat string map. Missing or malformed bodies yield an empty object so the
 * caller can decide which fields are mandatory.
 */
export async function parseGatewayCallback(
  req: NextRequest
): Promise<Record<string, string>> {
  const payload: Record<string, string> = {};

  if (req.method !== "POST") {
    req.nextUrl.searchParams.forEach((value, key) => {
      payload[key] = value;
    });
    return payload;
  }

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const json = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    for (const [key, value] of Object.entries(json)) {
      if (value !== undefined && value !== null) payload[key] = String(value);
    }
    return payload;
  }

  const formData = await req.formData().catch(() => new FormData());
  formData.forEach((value, key) => {
    payload[key] = value.toString();
  });
  return payload;
}

export function firstDefined(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}
