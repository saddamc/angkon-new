import { NextResponse } from "next/server";

export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
} as const;

export function jsonResponse<T = unknown>(
  body: T,
  init?: ResponseInit
): NextResponse<T> {
  return NextResponse.json(body, init);
}

export function jsonSuccess<T = unknown>(
  data: T,
  init?: ResponseInit
): NextResponse<{ ok: true; data: T }> {
  return NextResponse.json({ ok: true, data }, init);
}

export function jsonCreated<T = unknown>(
  data: T,
  init?: ResponseInit
): NextResponse<{ ok: true; data: T }> {
  return NextResponse.json({ ok: true, data }, { ...init, status: 201 });
}

export function jsonError(
  message: string,
  status = 400,
  code?: string,
  details?: unknown,
  init?: ResponseInit
): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      code,
      ...(details !== undefined ? { details } : {}),
    },
    { ...init, status }
  );
}

export function jsonNoStore<T = unknown>(
  body: T,
  status = 200,
  customHeaders?: Record<string, string>
): NextResponse<T> {
  return NextResponse.json(body, {
    status,
    headers: {
      ...NO_STORE_HEADERS,
      ...(customHeaders || {}),
    },
  });
}
