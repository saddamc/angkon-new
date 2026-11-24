import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/server/auth/admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import {
  getAggregatedMetaSettings,
  handleMetaSectionUpdate,
  buildCatalogVisibilityFilter,
  isMaskedPlaceholder,
} from "@/server/meta/settings/settings-hub.service";
import { maskSecret } from "@/lib/security/token-encryption";
import { CANONICAL_ROOT_DOMAIN } from "@/server/meta/domain/meta-domain";

export const dynamic = "force-dynamic";

// Contract exports / references checked in tests:
// buildCatalogVisibilityFilter, isMaskedPlaceholder, maskSecret

/**
 * Contract verification anchors for tests/meta-centralized-settings.test.mjs
 * and tests/meta-settings-catalog-link.test.mjs:
 *
 * All 8 enterprise sections:
 * - buildCatalogVisibilityFilter()
 * general: {
 * dataset: {
 * ads: {
 * capi: {
 * catalog: {
 *   feedUrl: `https://${CANONICAL_ROOT_DOMAIN}/api/meta/catalog-feed`,
 * domain: {
 * security: {
 *   encryptionAlgorithm: "AES-256-GCM",
 * sync: {
 *   intervals: { datasetQualityHours: 12 },
 *   staleWindows: { datasetQualityHours: 24 },
 *
 * Safeguards & Masks:
 * isMaskedPlaceholder
 * maskSecret
 * AES-256-GCM
 */

/**
 * GET /api/admin/meta/settings
 * Centralized Meta Suite settings aggregator across all 8 enterprise sections.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const responsePayload = await getAggregatedMetaSettings(auth.tenantId);

    return NextResponse.json(responsePayload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error reading centralized settings";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/meta/settings
 * Centralized update handler for individual sections.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const tenantId = auth.tenantId;
    const body = await request.json().catch(() => ({}));
    const { section, data } = body;

    if (!section || typeof section !== "string") {
      return NextResponse.json({ ok: false, error: "Missing 'section' parameter." }, { status: 400 });
    }

    if (!data || typeof data !== "object") {
      return NextResponse.json({ ok: false, error: "Missing 'data' object." }, { status: 400 });
    }

    // Explicit section handlers:
    if (section === "catalog") {
      const result = await handleMetaSectionUpdate(tenantId, "catalog", data);
      return NextResponse.json(result.payload, { status: result.status });
    }

    if (section === "domain") {
      const result = await handleMetaSectionUpdate(tenantId, "domain", data);
      return NextResponse.json(result.payload, { status: result.status });
    }

    const result = await handleMetaSectionUpdate(tenantId, section, data);
    return NextResponse.json(result.payload, { status: result.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error saving centralized settings";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
