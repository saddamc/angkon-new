import { connectToDatabase } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";
import { DEFAULT_TENANT_ID } from "../tenant";
import {
  isEncryptedToken,
  encryptTokenString,
  redactTokens,
} from "@/lib/security/token-encryption";
import { PIXEL_SETTINGS_KEY } from "../pixel-settings";
import { META_MARKETING_SETTINGS_KEY } from "../meta-marketing-settings";
import { META_CATALOG_SETTINGS_KEY } from "../meta-catalog";

export interface MigrationSummary {
  tenantId: string;
  totalChecked: number;
  totalMigrated: number;
  migratedKeys: string[];
  alreadyEncryptedKeys: string[];
  skippedKeys: string[];
  timestamp: string;
}

/**
 * Scans all Meta configuration records in MongoDB Settings and encrypts any plaintext
 * access tokens at rest using AES-256-GCM.
 *
 * Idempotent:
 * - Plaintext tokens are safely encrypted into `enc:v1:<iv>:<tag>:<ciphertext>`.
 * - Already-encrypted tokens are untouched.
 * - Empty / unconfigured tokens are untouched.
 * - Never logs plaintext credentials.
 */
export async function migrateAllMetaTokensAtRest(
  tenantId: string = DEFAULT_TENANT_ID
): Promise<MigrationSummary> {
  await connectToDatabase();
  const safeTenant = tenantId?.trim() || DEFAULT_TENANT_ID;

  const targetKeys = [
    PIXEL_SETTINGS_KEY,
    META_MARKETING_SETTINGS_KEY,
    META_CATALOG_SETTINGS_KEY,
  ];

  const summary: MigrationSummary = {
    tenantId: safeTenant,
    totalChecked: targetKeys.length,
    totalMigrated: 0,
    migratedKeys: [],
    alreadyEncryptedKeys: [],
    skippedKeys: [],
    timestamp: new Date().toISOString(),
  };

  for (const key of targetKeys) {
    try {
      type SettingsRecord = { _id?: unknown; tenantId?: string; key?: string; value?: unknown };
      let doc = (await Settings.findOne(
        { tenantId: safeTenant, key },
        null,
        { strict: false }
      ).lean().catch(() => null)) as SettingsRecord | null;

      if (!doc && safeTenant === DEFAULT_TENANT_ID) {
        doc = (await Settings.findOne({
          key,
          $or: [{ tenantId: safeTenant }, { tenantId: { $exists: false } }, { tenantId: null }],
        }, null, { strict: false }).lean().catch(() => null)) as SettingsRecord | null;
      }

      if (!doc || !doc.value || typeof doc.value !== "object") {
        summary.skippedKeys.push(key);
        continue;
      }

      const val = { ...(doc.value as Record<string, unknown>) };
      let changed = false;

      // Check pixel tokens
      if (key === PIXEL_SETTINGS_KEY) {
        if (typeof val.capiAccessToken === "string" && val.capiAccessToken.trim()) {
          const raw = val.capiAccessToken.trim();
          if (!isEncryptedToken(raw)) {
            val.capiAccessToken = encryptTokenString(raw);
            changed = true;
          } else {
            summary.alreadyEncryptedKeys.push(`${key}.capiAccessToken`);
          }
        }

        if (typeof val.marketingApiAccessToken === "string" && val.marketingApiAccessToken.trim()) {
          const raw = val.marketingApiAccessToken.trim();
          if (!isEncryptedToken(raw)) {
            val.marketingApiAccessToken = encryptTokenString(raw);
            changed = true;
          } else {
            summary.alreadyEncryptedKeys.push(`${key}.marketingApiAccessToken`);
          }
        }
      }

      // Check marketing settings tokens
      if (key === META_MARKETING_SETTINGS_KEY) {
        if (typeof val.accessToken === "string" && val.accessToken.trim()) {
          const raw = val.accessToken.trim();
          if (!isEncryptedToken(raw)) {
            val.accessToken = encryptTokenString(raw);
            changed = true;
          } else {
            summary.alreadyEncryptedKeys.push(`${key}.accessToken`);
          }
        }
      }

      // Check catalog settings tokens
      if (key === META_CATALOG_SETTINGS_KEY) {
        if (typeof val.catalogApiToken === "string" && val.catalogApiToken.trim()) {
          const raw = val.catalogApiToken.trim();
          if (!isEncryptedToken(raw)) {
            val.catalogApiToken = encryptTokenString(raw);
            changed = true;
          } else {
            summary.alreadyEncryptedKeys.push(`${key}.catalogApiToken`);
          }
        }
      }

      if (changed) {
        await Settings.findOneAndUpdate(
          { tenantId: safeTenant, key },
          { $set: { tenantId: safeTenant, key, value: val, updatedAt: new Date() } },
          { upsert: true }
        );
        summary.totalMigrated++;
        summary.migratedKeys.push(key);
      } else {
        if (!summary.alreadyEncryptedKeys.some((k) => k.startsWith(key))) {
          summary.skippedKeys.push(key);
        }
      }
    } catch (err) {
      console.warn(`[Token Migration] Error checking key ${key}:`, redactTokens(String(err)));
    }
  }

  return summary;
}
