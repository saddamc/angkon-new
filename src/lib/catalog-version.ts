import { connectToDatabase } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";

/**
 * Cross-instance catalog version stamp. Every server instance compares it (at most every few
 * seconds) with the stamp its in-memory products/categories were built from and reloads when
 * it differs, so an admin edit made on one instance reaches all of them almost immediately.
 * Kept free of `next/cache` on purpose — this file is imported by the data layer.
 */

const VERSION_KEY = "catalog-version";
const VERSION_CHECK_INTERVAL_MS = 3000;

declare global {
  // eslint-disable-next-line no-var
  var __catalogVersion: { value: string; checkedAt: number } | undefined;
}

/** Current catalog version stamp (cheap: one tiny document, re-read at most every 3s per instance). */
export async function getCatalogVersion(): Promise<string> {
  const cached = globalThis.__catalogVersion;
  const now = Date.now();
  if (cached && now - cached.checkedAt < VERSION_CHECK_INTERVAL_MS) return cached.value;

  try {
    await connectToDatabase();
    const doc = await Settings.findOne({ key: VERSION_KEY }).select("value").lean();
    const value = String((doc?.value as { v?: unknown } | undefined)?.v ?? "0");
    globalThis.__catalogVersion = { value, checkedAt: now };
    return value;
  } catch {
    // Database unreachable: keep serving what we have rather than failing the page.
    return cached?.value ?? "0";
  }
}

export async function bumpCatalogVersion(): Promise<void> {
  const value = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await connectToDatabase();
  await Settings.findOneAndUpdate(
    { key: VERSION_KEY },
    { $set: { value: { v: value } } },
    { upsert: true },
  );
  globalThis.__catalogVersion = { value, checkedAt: Date.now() };
}

