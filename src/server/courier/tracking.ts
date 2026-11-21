/**
 * Pure client- and server-safe courier display, settings, and tracking helpers.
 * Never import server secrets, database models, or Node modules here.
 */

export type ApiCourierProvider = "steadfast" | "pathao" | "redx";
export type LegacyCourierCode = ApiCourierProvider | "ecourier";

export interface CourierProviderDescriptor {
  id: ApiCourierProvider;
  label: string;
  shortLabel: string;
  /** True when live API booking is active in production. */
  supported: boolean;
  disabledReason?: string;
  requiresLocationPicker: "pathao" | "redx" | null;
  trackingUrl: (trackingCode?: string | null, consignmentId?: string | null) => string | null;
}

/**
 * Stage 3: Only expose Steadfast (active) and Pathao (disabled until implemented)
 * in courier selection UIs.
 */
export const COURIER_PROVIDER_LIST: CourierProviderDescriptor[] = [
  {
    id: "steadfast",
    label: "Steadfast Courier",
    shortLabel: "Steadfast",
    supported: true,
    requiresLocationPicker: null,
    trackingUrl: (trackingCode) =>
      trackingCode ? `https://steadfast.com.bd/t/${encodeURIComponent(trackingCode)}` : null,
  },
  {
    id: "pathao",
    label: "Pathao Courier",
    shortLabel: "Pathao",
    supported: false,
    disabledReason: "Pathao integration will be enabled in a future release.",
    requiresLocationPicker: "pathao",
    trackingUrl: (_trackingCode, consignmentId) =>
      consignmentId
        ? `https://merchant.pathao.com/tracking?consignment_id=${encodeURIComponent(consignmentId)}`
        : null,
  },
  {
    id: "redx",
    label: "RedX Courier",
    shortLabel: "RedX",
    supported: false,
    disabledReason:
      "RedX integration is pending official API documentation and credentials. Setup required.",
    requiresLocationPicker: "redx",
    trackingUrl: (trackingCode) =>
      trackingCode
        ? `https://redx.com.bd/track-global-parcel/?trackingId=${encodeURIComponent(trackingCode)}`
        : null,
  },
];

const LEGACY_TRACKING_BUILDERS: Record<
  string,
  {
    label: string;
    trackingUrl: (trackingCode?: string | null, consignmentId?: string | null) => string | null;
  }
> = {
  steadfast: {
    label: "Steadfast Courier",
    trackingUrl: (trackingCode) =>
      trackingCode ? `https://steadfast.com.bd/t/${encodeURIComponent(trackingCode)}` : null,
  },
  pathao: {
    label: "Pathao Courier",
    trackingUrl: (_trackingCode, consignmentId) =>
      consignmentId
        ? `https://merchant.pathao.com/tracking?consignment_id=${encodeURIComponent(consignmentId)}`
        : null,
  },
  redx: {
    label: "RedX",
    trackingUrl: (trackingCode) =>
      trackingCode
        ? `https://redx.com.bd/track-global-parcel/?trackingId=${encodeURIComponent(trackingCode)}`
        : null,
  },
  ecourier: {
    label: "eCourier",
    trackingUrl: (trackingCode) =>
      trackingCode
        ? `https://ecourier.com.bd/tracking/?tracking_no=${encodeURIComponent(trackingCode)}`
        : null,
  },
};

export function isApiCourierProvider(value: unknown): value is ApiCourierProvider {
  return value === "steadfast" || value === "pathao";
}

export function isSupportedCourierProvider(value: unknown): value is "steadfast" {
  return value === "steadfast";
}

export function getCourierLabel(courier?: string | null): string {
  const key = String(courier || "").trim().toLowerCase();
  const found = LEGACY_TRACKING_BUILDERS[key];
  if (found) return found.label;
  if (key === "sundarban") return "Sundarban Courier";
  if (key === "other") return "Other Courier";
  return courier ? String(courier) : "Courier";
}

export function getCourierTrackingUrl(
  courier?: string | null,
  trackingCode?: string | null,
  consignmentId?: string | null
): string | null {
  const key = String(courier || "").trim().toLowerCase();
  const found = LEGACY_TRACKING_BUILDERS[key];
  if (!found) return null;
  return found.trackingUrl(trackingCode || null, consignmentId || null);
}

export interface CourierSettings {
  defaultProvider: ApiCourierProvider;
  enabledProviders: {
    steadfast: boolean;
    pathao: boolean;
    redx?: boolean;
  };
  defaultParcelNote: string;
  autoAdvanceToShipped: boolean;
  allowUnpaidOnlineShipment: boolean;
  autoBookOnConfirm: boolean;
  codEnabled: boolean;
  insideDhakaCharge: number;
  outsideDhakaCharge: number;
  freeDeliveryThreshold: number;
}

export const DEFAULT_COURIER_SETTINGS: CourierSettings = {
  defaultProvider: "steadfast",
  enabledProviders: {
    steadfast: true,
    pathao: false,
    redx: false,
  },
  defaultParcelNote: "",
  autoAdvanceToShipped: true,
  allowUnpaidOnlineShipment: false,
  autoBookOnConfirm: false,
  codEnabled: true,
  insideDhakaCharge: 60,
  outsideDhakaCharge: 120,
  freeDeliveryThreshold: 0,
};

function sanitizeNonNegativeInt(value: unknown, fallback: number, max = 50000): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(max, Math.round(n));
}

export function normalizeCourierSettings(raw: unknown): CourierSettings {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const enabledRaw =
    source.enabledProviders && typeof source.enabledProviders === "object"
      ? (source.enabledProviders as Record<string, unknown>)
      : {};

  // Pathao remains disabled until full integration is enabled.
  const steadfastEnabled =
    typeof enabledRaw.steadfast === "boolean"
      ? enabledRaw.steadfast
      : DEFAULT_COURIER_SETTINGS.enabledProviders.steadfast;

  const requestedDefault = isApiCourierProvider(source.defaultProvider)
    ? source.defaultProvider
    : DEFAULT_COURIER_SETTINGS.defaultProvider;

  return {
    defaultProvider: requestedDefault === "pathao" ? "steadfast" : requestedDefault,
    enabledProviders: {
      steadfast: steadfastEnabled,
      pathao: false,
      redx: false,
    },
    defaultParcelNote:
      typeof source.defaultParcelNote === "string"
        ? source.defaultParcelNote.trim().slice(0, 200)
        : DEFAULT_COURIER_SETTINGS.defaultParcelNote,
    autoAdvanceToShipped:
      typeof source.autoAdvanceToShipped === "boolean"
        ? source.autoAdvanceToShipped
        : DEFAULT_COURIER_SETTINGS.autoAdvanceToShipped,
    allowUnpaidOnlineShipment:
      typeof source.allowUnpaidOnlineShipment === "boolean"
        ? source.allowUnpaidOnlineShipment
        : DEFAULT_COURIER_SETTINGS.allowUnpaidOnlineShipment,
    autoBookOnConfirm:
      typeof source.autoBookOnConfirm === "boolean"
        ? source.autoBookOnConfirm
        : DEFAULT_COURIER_SETTINGS.autoBookOnConfirm,
    codEnabled:
      typeof source.codEnabled === "boolean"
        ? source.codEnabled
        : DEFAULT_COURIER_SETTINGS.codEnabled,
    insideDhakaCharge: sanitizeNonNegativeInt(
      source.insideDhakaCharge,
      DEFAULT_COURIER_SETTINGS.insideDhakaCharge
    ),
    outsideDhakaCharge: sanitizeNonNegativeInt(
      source.outsideDhakaCharge,
      DEFAULT_COURIER_SETTINGS.outsideDhakaCharge
    ),
    freeDeliveryThreshold: sanitizeNonNegativeInt(
      source.freeDeliveryThreshold,
      DEFAULT_COURIER_SETTINGS.freeDeliveryThreshold,
      1000000
    ),
  };
}
