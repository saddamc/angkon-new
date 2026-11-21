import { connectToDatabase } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";
import {
  POLICY_SETTINGS_KEY,
  DEFAULT_POLICY_SETTINGS,
  normalizePolicySettings,
  type PolicySettings,
} from "./policy-settings-core";

export * from "./policy-settings-core";

// In-Memory cache with 60s TTL
let cachedSettings: { data: PolicySettings; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60 * 1000;

export function invalidatePolicySettingsCache() {
  cachedSettings = null;
}

export async function getPolicySettings(): Promise<PolicySettings> {
  const now = Date.now();
  if (cachedSettings && now < cachedSettings.expiresAt) {
    return cachedSettings.data;
  }

  try {
    await connectToDatabase();
    const doc = await Settings.findOne({ key: POLICY_SETTINGS_KEY }).lean();
    const normalized = normalizePolicySettings(doc?.value);
    cachedSettings = { data: normalized, expiresAt: now + CACHE_TTL_MS };
    return normalized;
  } catch (error) {
    if (cachedSettings) return cachedSettings.data;
    console.warn("Policy settings unavailable in DB, using fallback defaults:", error);
    return { ...DEFAULT_POLICY_SETTINGS };
  }
}
