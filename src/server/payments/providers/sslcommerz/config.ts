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

export function getSslcommerzConfig(): SslcommerzConfig {
  const isLive =
    process.env.SSLCOMMERZ_IS_LIVE?.trim().toLowerCase() === "true" ||
    process.env.SSLCOMMERZ_MODE?.trim().toLowerCase() === "live";

  // Scoped credentials win; the legacy pair stays as a backward-compatible
  // fallback so existing deployments keep working through the migration.
  const scopedId = isLive
    ? process.env.SSLCOMMERZ_LIVE_STORE_ID?.trim()
    : process.env.SSLCOMMERZ_SANDBOX_STORE_ID?.trim();
  const scopedPasswd = isLive
    ? process.env.SSLCOMMERZ_LIVE_STORE_PASSWORD?.trim()
    : process.env.SSLCOMMERZ_SANDBOX_STORE_PASSWORD?.trim();

  const storeId = scopedId || process.env.SSLCOMMERZ_STORE_ID?.trim() || "";
  const storePasswd =
    scopedPasswd || process.env.SSLCOMMERZ_STORE_PASSWORD?.trim() || "";

  const isSandbox = !isLive;
  const isConfigured = Boolean(storeId && storePasswd);

  const baseUrl = isSandbox
    ? "https://sandbox.sslcommerz.com"
    : "https://securepay.sslcommerz.com";

  return {
    storeId,
    storePasswd,
    isSandbox,
    isConfigured,
    baseUrl,
    sessionUrl: `${baseUrl}/gwprocess/v4/api.php`,
    validationUrl: `${baseUrl}/validator/api/validationserverAPI.php`,
    queryUrl: `${baseUrl}/validator/api/merchantTransIDvalidationAPI.php`,
    timeoutMs: Number(process.env.SSLCOMMERZ_TIMEOUT_MS) || 15000,
  };
}
