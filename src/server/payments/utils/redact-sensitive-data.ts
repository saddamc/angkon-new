const SENSITIVE_KEYS = new Set([
  "store_passwd",
  "store_password",
  "password",
  "card_no",
  "card_number",
  "cvv",
  "cvc",
  "sessionkey",
  "session_key",
  "token",
  "secret",
]);

/**
 * Recursively deep-clones an object and redacts any passwords, card numbers, or session keys
 * so payloads can be safely stored in MongoDB audit collections or logged.
 */
export function redactSensitiveData<T = Record<string, unknown>>(data: unknown): T {
  if (!data || typeof data !== "object") {
    return data as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item)) as unknown as T;
  }

  const result: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      result[key] = "[REDACTED]";
    } else if (typeof val === "string" && /^\d{13,19}$/.test(val)) {
      // Possible raw credit card number in a value
      result[key] = `****-****-****-${val.slice(-4)}`;
    } else if (typeof val === "object" && val !== null) {
      result[key] = redactSensitiveData(val);
    } else {
      result[key] = val;
    }
  }

  return result as T;
}
