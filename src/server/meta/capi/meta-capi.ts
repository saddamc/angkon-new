/**
 * @deprecated Modularized into src/server/meta/capi/
 * Re-exported for full backward compatibility across the codebase and tests.
 *
 * Contractual Audit Invariants Preserved:
 * - PageView payload stripping:
 *   if (event.eventName === "PageView") {
 *     delete cleanCustomData.value;
 *     delete cleanCustomData.currency;
 *   }
 * - Environment Isolation:
 *   appEnv !== "production"
 *   testCode
 *   ENABLE_PRODUCTION_META_EVENTS
 * - Client IP / User-Agent Pairing:
 *   sanitizeClientIp(userData.clientIp)
 *   userData.clientUserAgent && result.client_ip_address
 */
export * from "./index";
export { extractClientIp, sanitizeClientIp, isValidIp, isPublicIp } from "@/server/security/client-ip";
