import { getSslcommerzCredentials } from "@/server/sslcommerz";

export interface SslcommerzConfig {
  storeId: string;
  storePasswd: string;
  isSandbox: boolean;
  isConfigured: boolean;
  baseUrl: string;
  sessionUrl: string;
  validationUrl: string;
  queryUrl: string;
  timeoutMs: number;
}

/**
 * Gateway HTTP configuration.
 *
 * Mode + credential selection is owned exclusively by
 * `getSslcommerzCredentials()` in `src/server/sslcommerz.ts` (the same module
 * behind `isSslcommerzLive()` / `isSslcommerzLiveReady()`), so the checkout
 * gating, the production sandbox hard-block, and every gateway HTTP call can
 * never disagree about which store is in use. This module only adds the
 * transport details (URLs, timeout).
 */
export function getSslcommerzConfig(): SslcommerzConfig {
  const credentials = getSslcommerzCredentials();
  const isSandbox = credentials.mode === "sandbox";

  const baseUrl = isSandbox
    ? "https://sandbox.sslcommerz.com"
    : "https://securepay.sslcommerz.com";

  return {
    storeId: credentials.storeId,
    storePasswd: credentials.storePassword,
    isSandbox,
    isConfigured: credentials.configured,
    baseUrl,
    sessionUrl: `${baseUrl}/gwprocess/v4/api.php`,
    validationUrl: `${baseUrl}/validator/api/validationserverAPI.php`,
    queryUrl: `${baseUrl}/validator/api/merchantTransIDvalidationAPI.php`,
    timeoutMs: Number(process.env.SSLCOMMERZ_TIMEOUT_MS) || 15000,
  };
}
