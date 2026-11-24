export const POLICY_SETTINGS_KEY = "policies";

export interface PolicySettings {
  returnWindowDays: number;
  exchangeAllowed: boolean;
  refundProcessingDays: string;
  openBoxInspectionSupported: boolean;
  policyVersion: string;
  supportPhone: string;
  supportEmail: string;
  showroomAddress: string;
  lastUpdated: string;
}

export const DEFAULT_POLICY_SETTINGS: PolicySettings = {
  returnWindowDays: 7,
  exchangeAllowed: true,
  refundProcessingDays: "5–10 working days",
  openBoxInspectionSupported: true,
  policyVersion: "2026.1",
  supportPhone: "+880 1338-668899",
  supportEmail: "angkonofficial08@gmail.com",
  showroomAddress: "H-93, (Ground floor), Road: 2, Block-A, Niketan, Gulshan, Dhaka-1212",
  lastUpdated: "2026-11-20",
};

export function normalizePolicySettings(raw: unknown): PolicySettings {
  const source = (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}) as Partial<
    Record<keyof PolicySettings, unknown>
  >;

  const readNum = (val: unknown, fallback: number) => {
    const n = Number(val);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
  };

  const readStr = (val: unknown, fallback: string) => {
    return typeof val === "string" && val.trim() ? val.trim() : fallback;
  };

  return {
    returnWindowDays: readNum(source.returnWindowDays, DEFAULT_POLICY_SETTINGS.returnWindowDays),
    exchangeAllowed:
      typeof source.exchangeAllowed === "boolean"
        ? source.exchangeAllowed
        : DEFAULT_POLICY_SETTINGS.exchangeAllowed,
    refundProcessingDays: readStr(source.refundProcessingDays, DEFAULT_POLICY_SETTINGS.refundProcessingDays),
    openBoxInspectionSupported:
      typeof source.openBoxInspectionSupported === "boolean"
        ? source.openBoxInspectionSupported
        : DEFAULT_POLICY_SETTINGS.openBoxInspectionSupported,
    policyVersion: readStr(source.policyVersion, DEFAULT_POLICY_SETTINGS.policyVersion),
    supportPhone: readStr(source.supportPhone, DEFAULT_POLICY_SETTINGS.supportPhone),
    supportEmail: readStr(source.supportEmail, DEFAULT_POLICY_SETTINGS.supportEmail),
    showroomAddress: readStr(source.showroomAddress, DEFAULT_POLICY_SETTINGS.showroomAddress),
    lastUpdated: readStr(source.lastUpdated, DEFAULT_POLICY_SETTINGS.lastUpdated),
  };
}
