import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAdminSessionCore } from "@/server/admin-auth";
import { courierService, getCourierModeConfig } from "@/server/courier";
import { getCourierSettings } from "@/server/courier/settings";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/couriers/overview
 * Returns live configuration status for supported couriers (Steadfast active, Pathao disabled),
 * Steadfast merchant balance, diagnostics summary, and non-secret preferences.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const settings = await getCourierSettings();
    const modeConfig = getCourierModeConfig();
    const providerList = courierService.getProviderStatuses(settings);
    const steadfastAdapter = courierService.getAdapter("steadfast");

    const isConfigured = steadfastAdapter.isConfigured();
    const [steadfastBalance, diagnostics] = await Promise.all([
      isConfigured && !modeConfig.isMock
        ? steadfastAdapter.getBalance().catch((err: unknown) => ({
            ok: false as const,
            error: {
              code: "upstream" as const,
              message: err instanceof Error ? err.message : "Connection error to Steadfast API",
            },
          }))
        : Promise.resolve({
          ok: false as const,
          error: {
              code: modeConfig.isMock ? ("mock-mode" as const) : ("not-configured" as const),
              message: modeConfig.isMock
                ? "Live Steadfast balance is unavailable in mock mode"
                : "Steadfast credentials are not configured",
            },
          }),
      courierService.getDiagnostics().catch(() => ({
        lastSyncAt: null,
        health: "healthy" as const,
        stats24h: { totalCalls: 0, errorCount: 0, successCount: 0 },
        recentErrors: [],
      })),
    ]);

    const steadfastStatus = providerList.find((p) => p.id === "steadfast");
    const pathaoStatus = providerList.find((p) => p.id === "pathao");

    const steadfastBalancePayload = {
      balance:
        steadfastBalance.ok && typeof steadfastBalance.balance === "number"
          ? steadfastBalance.balance
          : null,
      currency: (steadfastBalance.ok && steadfastBalance.currency) || "BDT",
      lastSyncedAt: steadfastBalance.ok ? new Date().toISOString() : null,
      error: !steadfastBalance.ok && steadfastBalance.error ? steadfastBalance.error.message : null,
      configured: isConfigured,
      mode: modeConfig.mode,
      isMock: modeConfig.isMock,
      simulated: modeConfig.isMock,
    };

    return NextResponse.json(
      {
        providers: {
          steadfast: {
            configured: Boolean(steadfastStatus?.configured),
            enabled: Boolean(steadfastStatus?.enabled),
            supported: true,
            label: steadfastStatus?.label || "Steadfast Courier",
            mode: modeConfig.mode,
            isMock: modeConfig.isMock,
            liveBookingEnabled: modeConfig.liveBookingEnabled,
          },
          pathao: {
            configured: false,
            enabled: false,
            supported: false,
            disabledReason: pathaoStatus?.disabledReason || "Integration coming soon",
            label: pathaoStatus?.label || "Pathao Courier",
          },
        },
        settings,
        webhooks: {
          // The webhook route accepts STEADFAST_WEBHOOK_TOKEN or
          // STEADFAST_WEBHOOK_SECRET — the indicator must match both.
          steadfast: Boolean(
            (
              process.env.STEADFAST_WEBHOOK_TOKEN || process.env.STEADFAST_WEBHOOK_SECRET || ""
            ).trim()
          ),
          pathao: false,
        },
        balances: {
          steadfast: steadfastBalancePayload,
        },
        diagnostics: {
          lastSyncAt: diagnostics.lastSyncAt,
          health: diagnostics.health,
          stats24h: diagnostics.stats24h,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/admin/couriers/overview error:", error);
    return NextResponse.json(
      { error: "Courier overview is unavailable." },
      { status: 503 }
    );
  }
}
