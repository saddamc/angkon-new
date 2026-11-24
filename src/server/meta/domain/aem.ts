import { CANONICAL_ROOT_DOMAIN } from "./constants";

export interface AemSlotDefinition {
  slot: number;
  name: string;
  level: string;
  optimization: string;
  description: string;
  badge: string;
  isCalibrated: boolean;
}

export const AEM_CALIBRATED_EVENTS: Omit<AemSlotDefinition, "slot" | "isCalibrated">[] = [
  {
    name: "Purchase",
    level: "Highest Priority (Tier 1)",
    optimization: "Value Optimization (ROAS)",
    description: "Tracks confirmed luxury orders. Must remain #1 for Meta conversion bidding.",
    badge: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  {
    name: "InitiateCheckout",
    level: "High Priority (Tier 2)",
    optimization: "Conversion Funnel Progression",
    description: "Tracks visitors opening the checkout page with cart contents.",
    badge: "text-indigo-700 bg-indigo-50 border-indigo-200",
  },
  {
    name: "AddToCart",
    level: "Medium-High Priority (Tier 3)",
    optimization: "Audience Remarketing",
    description: "Tracks product size selections and cart additions.",
    badge: "text-amber-800 bg-amber-50 border-amber-200",
  },
  {
    name: "ViewContent",
    level: "Medium Priority (Tier 4)",
    optimization: "Dynamic Product Retargeting",
    description: "Tracks specific attire detail views for catalog retargeting.",
    badge: "text-purple-700 bg-purple-50 border-purple-200",
  },
  {
    name: "PageView",
    level: "Base Priority (Tier 5)",
    optimization: "General Store Traffic",
    description: "Base visitor volume across all landing pages.",
    badge: "text-blue-700 bg-blue-50 border-blue-200",
  },
];

export const MAX_AEM_SLOTS = 8;

/**
 * Returns current AEM 8-slot allocation:
 * 5 slots calibrated to ANGKON e-commerce funnel, 3 available slots for future campaign expansion.
 */
export function getAemConfiguration(tenantId = "angkon-main") {
  const calibratedSlots: AemSlotDefinition[] = AEM_CALIBRATED_EVENTS.map((item, idx) => ({
    ...item,
    slot: idx + 1,
    isCalibrated: true,
  }));

  const emptySlots: AemSlotDefinition[] = [];
  for (let s = calibratedSlots.length + 1; s <= MAX_AEM_SLOTS; s++) {
    emptySlots.push({
      slot: s,
      name: `Slot #${s} — Available`,
      level: `Unassigned (Tier ${s})`,
      optimization: "Reserved for Custom Events",
      description: "Available slot for future campaign objectives or custom pixel conversion rules.",
      badge: "text-slate-400 bg-slate-50 border-slate-200",
      isCalibrated: false,
    });
  }

  return {
    domain: CANONICAL_ROOT_DOMAIN,
    tenantId,
    maxSlots: MAX_AEM_SLOTS,
    calibratedCount: calibratedSlots.length,
    availableSlotsCount: emptySlots.length,
    calibratedSlots,
    allSlots: [...calibratedSlots, ...emptySlots],
    localStatus: "CONFIGURED_LOCALLY",
    metaSyncStatus: "MANUAL_VERIFICATION_REQUIRED",
    metaApiLimitationNote:
      "Meta Graph API v22.0 does not expose a public programmatic REST endpoint to query or mutate tenant Aggregated Event Measurement (AEM) slot priorities. Verification and slot mutation must be confirmed manually in Meta Business Settings > Events Manager > Aggregated Event Measurement.",
    lastSynchronizedAt: null,
  };
}
