import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminSessionCore } from "@/server/auth/admin-auth";
import {
  getProviderConfigSummary,
  getCourierModeConfig,
} from "@/server/courier";
import {
  isSslcommerzConfigured,
  isSslcommerzLive,
  isSslcommerzLiveReady,
} from "@/server/payments/config/sslcommerz";
import { getPixelSettings } from "@/server/meta/pixel/pixel-settings";

export const dynamic = "force-dynamic";

type IntegrationState = "connected" | "sandbox" | "live" | "not-configured" | "disabled";

interface IntegrationCard {
  id: string;
  name: string;
  category: string;
  description: string;
  state: IntegrationState;
  detail: string;
  href: string | null;
  actionLabel: string | null;
  /** Configuration requires a super administrator. */
  restricted?: boolean;
}

// GET /api/admin/integrations/status — configuration state only. Never secrets.
export async function GET(request: NextRequest) {
  const auth = await requireSuperAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providers = getProviderConfigSummary();
  const courierMode = getCourierModeConfig();
  const canConfigure = true;

  const sslConfigured = isSslcommerzConfigured();
  const sslLive = isSslcommerzLive();
  const sslLiveReady = isSslcommerzLiveReady();

  let pixelSettings: Awaited<ReturnType<typeof getPixelSettings>> | null = null;
  try {
    pixelSettings = await getPixelSettings(auth.tenantId);
  } catch {
    pixelSettings = null;
  }

  const envPixelId = (
    process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID ||
    process.env.NEXT_PUBLIC_META_PIXEL_ID ||
    process.env.META_PIXEL_ID ||
    ""
  ).trim();
  const dbPixelId = (pixelSettings?.pixelId || "").trim();
  const isMockPixel = dbPixelId.startsWith("DEV_MOCK_");
  const pixelId = (!isMockPixel && dbPixelId) || envPixelId || dbPixelId;
  const capiToken =
    Boolean((process.env.META_CAPI_ACCESS_TOKEN || "").trim()) ||
    Boolean((pixelSettings?.capiAccessToken || "").trim());
  const resendKey = (process.env.RESEND_API_KEY || "").trim();
  const emailFrom = (process.env.EMAIL_FROM || "").trim();
  const cloudinary =
    Boolean((process.env.CLOUDINARY_CLOUD_NAME || "").trim()) &&
    Boolean((process.env.CLOUDINARY_API_KEY || "").trim());
  const databaseUrl = Boolean((process.env.DATABASE_URL || "").trim());
  const cronSecret = Boolean((process.env.CRON_SECRET || "").trim());
  const metaSuiteEnabled = process.env.NEXT_PUBLIC_DISABLE_META_ROUTES !== "true";

  const integrations: IntegrationCard[] = [
    {
      id: "sslcommerz",
      name: "SSLCOMMERZ",
      category: "Payments",
      description: "Card, mobile banking and net-banking checkout with server-side validation.",
      state: sslConfigured ? (sslLive ? "live" : "sandbox") : "not-configured",
      detail: !sslConfigured
        ? "Store ID / password missing"
        : sslLive
          ? sslLiveReady
            ? "Live credentials verified"
            : "Live mode selected — credentials need review"
          : "Sandbox credentials active",
      href: "/admin/settings?tab=checkout",
      actionLabel: "Payment settings",
      restricted: !canConfigure,
    },
    {
      id: "cod",
      name: "Cash on Delivery",
      category: "Payments",
      description: "Collect cash at the door with courier settlement tracking.",
      state: "connected",
      detail: "Enabled at checkout",
      href: "/admin/settings?tab=checkout",
      actionLabel: "Checkout settings",
    },
    {
      id: "steadfast",
      name: "Steadfast Courier",
      category: "Courier",
      description: "Primary delivery partner — booking, tracking and COD settlement.",
      state: providers.steadfast?.configured
        ? courierMode.mode === "live"
          ? "live"
          : "sandbox"
        : "not-configured",
      detail: providers.steadfast?.configured
        ? courierMode.mode === "live"
          ? "Live bookings enabled"
          : "Mock mode (no real parcels booked)"
        : "API key / secret missing",
      href: "/admin/settings?tab=courier",
      actionLabel: "Courier settings",
      restricted: !canConfigure,
    },
    {
      id: "pathao",
      name: "Pathao Courier",
      category: "Courier",
      description: "Secondary delivery partner — planned integration.",
      state: providers.pathao?.configured ? "sandbox" : "disabled",
      detail: providers.pathao?.configured
        ? "Credentials configured"
        : "Planned for a future release",
      href: null,
      actionLabel: null,
    },
    {
      id: "redx",
      name: "RedX",
      category: "Courier",
      description: "Secondary delivery partner — planned integration.",
      state: providers.redx?.configured ? "sandbox" : "disabled",
      detail: providers.redx?.configured
        ? "Credentials configured"
        : "Planned for a future release",
      href: null,
      actionLabel: null,
    },
    {
      id: "meta-pixel",
      name: "Meta Pixel",
      category: "Marketing",
      description: "Browser-side conversion tracking for ads and catalog remarketing.",
      state: !pixelId
        ? "not-configured"
        : pixelId.startsWith("DEV_MOCK_")
          ? "sandbox"
          : pixelSettings && !pixelSettings.enabled && !envPixelId
            ? "disabled"
            : "connected",
      detail: !pixelId
        ? "Pixel ID missing"
        : pixelId.startsWith("DEV_MOCK_")
          ? `Dev mock (${pixelId.slice(0, 14)}…)`
          : `Pixel ${pixelId.slice(0, 6)}… configured`,
      href: "/admin/meta/settings",
      actionLabel: "Pixel settings",
    },
    {
      id: "meta-capi",
      name: "Conversions API",
      category: "Marketing",
      description: "Server-side purchase events with deduplication and retry queue.",
      state: capiToken ? "connected" : "not-configured",
      detail: capiToken ? "Access token configured" : "Access token missing",
      href: "/admin/meta/conversions-api",
      actionLabel: "CAPI console",
    },
    {
      id: "meta-suite",
      name: "Meta Marketing Suite",
      category: "Marketing",
      description: "Catalog feed, ads reporting and events manager.",
      state: metaSuiteEnabled ? "connected" : "disabled",
      detail: metaSuiteEnabled ? "Available for super admins" : "Disabled by environment flag",
      href: metaSuiteEnabled ? "/admin/meta" : null,
      actionLabel: metaSuiteEnabled ? "Open suite" : null,
    },
    {
      id: "email",
      name: "Email (Resend)",
      category: "Messaging",
      description: "Order confirmations, invoices and verification codes.",
      state: resendKey ? "connected" : "not-configured",
      detail: resendKey
        ? `Sending as ${emailFrom || "ANGKON Orders <orders@angkon.net>"}`
        : "RESEND_API_KEY missing",
      href: "/admin/settings?tab=notifications",
      actionLabel: "Notification settings",
    },
    {
      id: "cloudinary",
      name: "Cloudinary",
      category: "Media",
      description: "Product image upload, optimisation and delivery CDN.",
      state: cloudinary ? "connected" : "not-configured",
      detail: cloudinary ? "Cloud + API key configured" : "Cloud name or API key missing",
      href: "/admin/products",
      actionLabel: "Manage products",
    },
    {
      id: "mongodb",
      name: "MongoDB Atlas",
      category: "Platform",
      description: "Primary datastore for orders, payments, inventory and settings.",
      state: databaseUrl ? "connected" : "not-configured",
      detail: databaseUrl ? "Connection string configured" : "DATABASE_URL missing",
      href: null,
      actionLabel: null,
    },
    {
      id: "cron",
      name: "Payment Reconciliation",
      category: "Platform",
      description: "Scheduled IPN/queue reconciliation protected by a cron secret.",
      state: cronSecret ? "connected" : "not-configured",
      detail: cronSecret ? "CRON_SECRET configured" : "CRON_SECRET missing",
      href: "/admin/payments",
      actionLabel: "Payment attempts",
    },
  ];

  const summary = {
    total: integrations.length,
    connected: integrations.filter((i) => i.state === "connected" || i.state === "live").length,
    sandbox: integrations.filter((i) => i.state === "sandbox").length,
    needsAttention: integrations.filter(
      (i) => i.state === "not-configured" || i.state === "disabled"
    ).length,
  };

  return NextResponse.json(
    { integrations, summary },
    { headers: { "Cache-Control": "no-store" } }
  );
}
