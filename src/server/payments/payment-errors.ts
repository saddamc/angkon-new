export class PaymentError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: string = "PAYMENT_ERROR",
    statusCode: number = 400,
    retryable: boolean = false,
    details?: unknown
  ) {
    super(message);
    this.name = "PaymentError";
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.details = details;
  }
}

export class GatewayCommunicationError extends PaymentError {
  constructor(message: string, details?: unknown) {
    super(message, "GATEWAY_COMMUNICATION_ERROR", 502, true, details);
  }
}

export class GatewayTimeoutError extends PaymentError {
  constructor(message: string, details?: unknown) {
    super(message, "GATEWAY_TIMEOUT", 504, true, details);
  }
}

export class PaymentValidationError extends PaymentError {
  constructor(message: string, code: string = "PAYMENT_VALIDATION_FAILED", details?: unknown) {
    super(message, code, 422, false, details);
  }
}

export class DuplicatePaymentError extends PaymentError {
  constructor(message: string = "This order has already been paid.") {
    super(message, "ALREADY_PAID", 409, false);
  }
}

export class OrderStateConflictError extends PaymentError {
  constructor(message: string) {
    super(message, "ORDER_STATE_CONFLICT", 409, false);
  }
}
