/**
 * Server-only environment guards & isolation engine.
 *
 * Production must fail closed when a signing/encryption secret is missing.
 * Development and tests get a deterministic local fallback so the app, the
 * test suite and `next build` work without production secrets.
 */

import {
  getAppEnvironment,
  isProductionEnvironment,
  isDevelopmentEnvironment,
  isPreviewEnvironment,
  isTestEnvironment,
  type AppEnvironment,
} from "../server/env/app-environment";

export {
  getAppEnvironment,
  isProductionEnvironment,
  isDevelopmentEnvironment,
  isPreviewEnvironment,
  isTestEnvironment,
  type AppEnvironment,
};

const DEV_FALLBACK = "angkon_local_dev_only_jwt_secret_change_me";

export function isProduction(): boolean {
  return isProductionEnvironment();
}

export function hasJwtSecret(): boolean {
  return Boolean(process.env.JWT_SECRET?.trim());
}

/** JWT signing secret. Throws in production when unset. */
export function getJwtSecret(): string {
  const value = process.env.JWT_SECRET?.trim();
  if (value) return value;
  if (isProduction()) {
    throw new Error(
      "JWT_SECRET is required in production. Set a unique 64+ character secret before deploying."
    );
  }
  return DEV_FALLBACK;
}

/** Cron authorization secret, or null when neither CRON_SECRET nor JWT_SECRET exists. */
export function getCronSecret(): string | null {
  return process.env.CRON_SECRET?.trim() || process.env.JWT_SECRET?.trim() || null;
}

/** Master secret for Meta token encryption, or null when unset. */
export function getMasterEncryptionSecret(): string | null {
  return (
    process.env.META_TOKEN_ENCRYPTION_KEY?.trim() ||
    process.env.ENCRYPTION_KEY?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    null
  );
}
