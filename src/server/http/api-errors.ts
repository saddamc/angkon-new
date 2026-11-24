import { NextResponse } from "next/server";

export class HttpError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: unknown;
  public readonly retryable?: boolean;

  constructor(
    message: string,
    status = 500,
    code?: string,
    details?: unknown,
    retryable?: boolean
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryable = retryable;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends HttpError {
  constructor(message = "Bad request", code = "BAD_REQUEST", details?: unknown) {
    super(message, 400, code, details);
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Unauthorized", code = "UNAUTHORIZED", details?: unknown) {
    super(message, 401, code, details);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "Forbidden", code = "FORBIDDEN", details?: unknown) {
    super(message, 403, code, details);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Not found", code = "NOT_FOUND", details?: unknown) {
    super(message, 404, code, details);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends HttpError {
  constructor(message = "Conflict", code = "CONFLICT", details?: unknown) {
    super(message, 409, code, details);
    this.name = "ConflictError";
  }
}

export class TooManyRequestsError extends HttpError {
  constructor(message = "Too many requests", code = "RATE_LIMITED", details?: unknown) {
    super(message, 429, code, details);
    this.name = "TooManyRequestsError";
  }
}

export class ServiceUnavailableError extends HttpError {
  constructor(message = "Service unavailable", code = "SERVICE_UNAVAILABLE", details?: unknown) {
    super(message, 503, code, details, true);
    this.name = "ServiceUnavailableError";
  }
}

export function mapErrorToResponse(error: unknown, defaultMessage = "Internal server error"): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error.details !== undefined ? { details: error.details } : {}),
        ...(error.retryable ? { retryable: true } : {}),
      },
      { status: error.status }
    );
  }

  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    // MongoDB duplicate key error
    if (err.code === 11000) {
      return NextResponse.json(
        {
          error: "A record with this identifier already exists.",
          code: "DUPLICATE_KEY",
        },
        { status: 409 }
      );
    }
  }

  console.error("Unhandled API error:", error);
  const message = error instanceof Error ? error.message : defaultMessage;

  return NextResponse.json(
    {
      error: message || defaultMessage,
      code: "INTERNAL_ERROR",
    },
    { status: 500 }
  );
}
