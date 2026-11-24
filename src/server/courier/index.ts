import { steadfastAdapter } from "./providers/steadfast";
import { mockSteadfastProvider } from "./mock/steadfast";
import { pathaoAdapter } from "./providers/pathao";
import { redxAdapter } from "./providers/redx";
import { ecourierAdapter } from "./providers/ecourier";
import { getCourierModeConfig, type CourierMode } from "./core/courier-mode";
import type { CourierAdapter, CourierProvider } from "./core/types";
import { courierService } from "./core/courier-service";

// courierService re-exported below

/**
 * Courier registry. All providers implement the same `CourierAdapter`
 * contract, so the admin API can switch without changing the order flow.
 */
export function getCourierAdapter(
  provider: CourierProvider = "steadfast",
  options?: { mode?: CourierMode; forceLive?: boolean }
): CourierAdapter {
  if (provider === "steadfast") {
    if (options?.forceLive || options?.mode === "live") {
      return steadfastAdapter;
    }
    if (options?.mode === "mock") {
      return mockSteadfastProvider;
    }
    const modeConfig = getCourierModeConfig();
    if (modeConfig.mode === "live" && modeConfig.liveBookingEnabled && modeConfig.hasCredentials) {
      return steadfastAdapter;
    }
    return mockSteadfastProvider;
  }

  switch (provider) {
    case "pathao":
      return pathaoAdapter;
    case "redx":
      return redxAdapter;
    case "ecourier":
      return ecourierAdapter;
    default:
      return mockSteadfastProvider;
  }
}

export function getDefaultCourierProvider(): CourierProvider {
  return "steadfast";
}

export function getProviderConfigSummary() {
  const modeConfig = getCourierModeConfig();
  return {
    steadfast: {
      configured: modeConfig.mode === "live" ? steadfastAdapter.isConfigured() : true,
      label:
        modeConfig.mode === "live"
          ? "Steadfast Courier (Live)"
          : "Steadfast Courier (Mock / Development)",
      mode: modeConfig.mode,
      isMock: modeConfig.isMock,
      liveBookingEnabled: modeConfig.liveBookingEnabled,
    },
    pathao: {
      configured: pathaoAdapter.isConfigured(),
      label: "Pathao Courier",
      mode: "live",
      isMock: false,
      liveBookingEnabled: false,
    },
    redx: {
      configured: redxAdapter.isConfigured(),
      label: "RedX",
      mode: "live",
      isMock: false,
      liveBookingEnabled: false,
    },
    ecourier: {
      configured: ecourierAdapter.isConfigured(),
      label: "eCourier",
      mode: "live",
      isMock: false,
      liveBookingEnabled: false,
    },
  };
}

export {
  CourierService,
  courierService,
  COURIER_FAILURE_HTTP_STATUS,
} from "./core/courier-service";
export { isSteadfastConfigured } from "./providers/steadfast";
export { mockSteadfastProvider } from "./mock/steadfast";
export {
  getCourierModeConfig,
  isLocalTestOrder,
  type CourierMode,
  type CourierModeConfig,
} from "./core/courier-mode";
export { isPathaoConfigured } from "./providers/pathao";
export { isRedxConfigured } from "./providers/redx";
export { isEcourierConfigured } from "./providers/ecourier";
export type {
  BulkShipmentInputItem,
  BulkShipmentResultItem,
  CancelShipmentResult,
  CourierAdapter,
  CourierBalanceResult,
  CourierError,
  CourierErrorCode,
  CourierProvider,
  CourierProviderContract,
  CourierProviderMeta,
  CreateShipmentInput,
  CreateShipmentResult,
  ShipmentStatusResult,
} from "./core/types";

