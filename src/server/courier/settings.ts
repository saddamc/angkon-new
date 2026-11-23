import { connectToDatabase } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";
import { DEFAULT_TENANT_ID } from "@/server/tenant";
import {
  DEFAULT_COURIER_SETTINGS,
  normalizeCourierSettings,
  type CourierSettings,
} from "./tracking";

export const COURIER_SETTINGS_KEY = "courier";
export { DEFAULT_COURIER_SETTINGS, normalizeCourierSettings, type CourierSettings };

let cachedCourierSettings: { data: CourierSettings; expiresAt: number } | null = null;
const COURIER_SETTINGS_CACHE_TTL_MS = 60 * 1000;

export function invalidateCourierSettingsCache() {
  cachedCourierSettings = null;
}

export async function getCourierSettings(): Promise<CourierSettings> {
  const now = Date.now();
  if (cachedCourierSettings && now < cachedCourierSettings.expiresAt) {
    return cachedCourierSettings.data;
  }

  try {
    await connectToDatabase();
    const doc = await Settings.findOne({
      key: COURIER_SETTINGS_KEY,
      // The PUT writes { tenantId: auth.tenantId, key: "courier" } and every
      // authenticated admin defaults to DEFAULT_TENANT_ID, so reads must scope
      // by the same tenant — an unscoped findOne could return an arbitrary
      // tenant's document once a second tenant exists.
      tenantId: DEFAULT_TENANT_ID,
    }).lean();
    const normalized = normalizeCourierSettings(doc?.value);
    cachedCourierSettings = {
      data: normalized,
      expiresAt: now + COURIER_SETTINGS_CACHE_TTL_MS,
    };
    return normalized;
  } catch (error) {
    if (cachedCourierSettings) return cachedCourierSettings.data;
    console.warn("Courier settings unavailable, using defaults:", error);
    return { ...DEFAULT_COURIER_SETTINGS };
  }
}
