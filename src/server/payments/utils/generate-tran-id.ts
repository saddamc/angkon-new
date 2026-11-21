/**
 * Generates a globally unique transaction ID per payment attempt.
 *
 * For attempt 1, uses the canonical orderNumber (or orderNumber-1 if specified)
 * so existing gateway integrations match. For retries (attempt 2+), suffixes
 * with -A2, -A3, etc., ensuring SSLCOMMERZ never rejects a retry with "Duplicate tran_id".
 */
export function generateTranId(orderNumber: string, attemptNumber: number = 1): string {
  const cleanOrderNumber = String(orderNumber || "").trim();
  if (attemptNumber <= 1) {
    return cleanOrderNumber;
  }
  return `${cleanOrderNumber}-A${attemptNumber}`;
}

/**
 * Extracts the base orderNumber from a potentially suffixed transaction ID.
 * E.g., "ANG-261120-0001-A2" -> "ANG-261120-0001"
 */
export function extractOrderNumberFromTranId(tranId: string): string {
  const clean = String(tranId || "").trim();
  const match = clean.match(/^(.*?)(-A\d+)?$/);
  return match && match[1] ? match[1] : clean;
}
