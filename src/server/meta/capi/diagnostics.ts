import { DEFAULT_TENANT_ID } from "@/server/meta/pixel/pixel-settings";
import type { MetaCapiResponse } from "./types";
import { sendMetaCapiEvent } from "./event-dispatcher";

/**
 * Diagnostic test runner for validating Conversions API credentials live against Meta.
 */
export async function testMetaCapiConnection(
  pixelId: string,
  capiToken: string,
  testEventCode?: string,
  tenantId = DEFAULT_TENANT_ID,
  options?: {
    eventName?: string;
    eventId?: string;
    eventSourceUrl?: string;
    customData?: Record<string, unknown>;
  }
): Promise<MetaCapiResponse> {
  const testEventId = options?.eventId || `diag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return sendMetaCapiEvent(
    {
      eventName: options?.eventName || "PageView",
      eventId: testEventId,
      eventSourceUrl:
        options?.eventSourceUrl ||
        `${process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://www.angkon.net"}/admin/meta/pixel`,
      actionSource: "website",
      userData: {
        clientIp: "103.145.12.44",
        clientUserAgent: "ANGKON Diagnostic Agent/1.0",
      },
      customData: {
        diagnostic_test: true,
        ...(options?.customData || {}),
      },
      testEventCode,
    },
    capiToken,
    pixelId,
    tenantId
  );
}
