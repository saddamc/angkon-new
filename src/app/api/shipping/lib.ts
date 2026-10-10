import { DISTRICT_TO_WC_CODE } from "@/data/bangladesh-districts";

const WC_BASE = (process.env.NEXT_PUBLIC_WC_API_URL ?? "https://netbazarbd.net").replace(/\/$/, "");

export function wcAuth() {
  const ck = process.env.WC_ORDERS_CONSUMER_KEY ?? process.env.NEXT_PUBLIC_WC_CONSUMER_KEY ?? "";
  const cs = process.env.WC_ORDERS_CONSUMER_SECRET ?? process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET ?? "";
  return Buffer.from(`${ck}:${cs}`).toString("base64");
}

// ── Public types ────────────────────────────────────────────────────────────

export interface ShippingMethod {
  instance_id: number;
  method_id: string;
  title: string;
  cost: number;
  enabled: boolean;
}

export interface ShippingZoneData {
  id: number;
  name: string;
  /** Default/representative cost when no specific product context is known */
  cost: number;
  method_id: string;
  method_title: string;
  /** WC district codes this zone covers, e.g. ["BD-13"]. Empty = catch-all. */
  states: string[];
  isCatchAll: boolean;
  /** shipping_class_id (as string) → cost for that class in this zone */
  classCosts: Record<string, number>;
  /** Cost for products that have no shipping class assigned */
  noClassCost: number;
}

// ── Internal WC API types ───────────────────────────────────────────────────

interface WCShippingZone { id: number; name: string }
interface WCMethodSettings {
  cost?: { value: string };
  no_class_cost?: { value: string };
  [key: string]: { value: string } | undefined;
}
interface WCMethod {
  instance_id: number;
  method_id: string;
  title: string;
  enabled: boolean;
  settings?: WCMethodSettings;
}
interface WCLocation { code: string; type: string }

// ── Cost parsing ────────────────────────────────────────────────────────────

function parseShippingCosts(settings: WCMethodSettings): {
  classCosts: Record<string, number>;
  noClassCost: number;
  representativeCost: number;
} {
  const base = parseFloat(settings.cost?.value ?? "0") || 0;
  const noClassCost = parseFloat(settings.no_class_cost?.value ?? "0") || 0;

  const classCosts: Record<string, number> = {};
  const allValues: number[] = [];

  for (const [key, entry] of Object.entries(settings)) {
    if (key.startsWith("class_cost_") && entry?.value) {
      const classId = key.replace("class_cost_", "");
      const v = parseFloat(entry.value);
      if (!isNaN(v) && v > 0) {
        classCosts[classId] = v;
        allValues.push(v);
      }
    }
  }

  if (noClassCost > 0) allValues.push(noClassCost);
  if (base > 0) allValues.push(base);

  let representativeCost = base;
  if (noClassCost > 0) {
    representativeCost = noClassCost;
  } else if (allValues.length > 0) {
    representativeCost = Math.min(...allValues);
  }

  return { classCosts, noClassCost, representativeCost };
}

// ── Zone fetching ────────────────────────────────────────────────────────────

export async function fetchZonesWithData(): Promise<ShippingZoneData[]> {
  const headers = { Authorization: `Basic ${wcAuth()}`, "Content-Type": "application/json" };
  const opts = { headers, cache: "no-store" as const };

  const zonesRes = await fetch(`${WC_BASE}/wp-json/wc/v3/shipping/zones`, opts);
  if (!zonesRes.ok) return [];

  const zones = (await zonesRes.json()) as WCShippingZone[];
  const result: ShippingZoneData[] = [];

  for (const zone of zones) {
    const [methodsRes, locRes] = await Promise.all([
      fetch(`${WC_BASE}/wp-json/wc/v3/shipping/zones/${zone.id}/methods`, opts),
      fetch(`${WC_BASE}/wp-json/wc/v3/shipping/zones/${zone.id}/locations`, opts),
    ]);

    if (!methodsRes.ok) continue;
    const methods = (await methodsRes.json()) as WCMethod[];
    const enabled = methods.filter((m) => m.enabled);
    if (!enabled.length) continue;

    const best = enabled.find((m) => m.method_id === "flat_rate") ?? enabled[0];

    let cost = 0;
    let classCosts: Record<string, number> = {};
    let noClassCost = 0;

    if (best.method_id === "flat_rate" || best.method_id === "local_pickup") {
      const parsed = parseShippingCosts(best.settings ?? {});
      cost = parsed.representativeCost;
      classCosts = parsed.classCosts;
      noClassCost = parsed.noClassCost;
    }

    let states: string[] = [];
    if (locRes.ok) {
      const locs = (await locRes.json()) as WCLocation[];
      states = locs
        .filter((l) => l.type === "state")
        .map((l) => l.code.replace(/^BD:/, "")); // "BD:BD-13" → "BD-13"
    }

    result.push({
      id: zone.id,
      name: zone.name,
      cost,
      method_id: best.method_id,
      method_title: best.title || best.method_id,
      states,
      isCatchAll: zone.id === 0 || states.length === 0,
      classCosts,
      noClassCost,
    });
  }

  return result;
}

// ── Cost by shipping class IDs ──────────────────────────────────────────────

export function calcZoneCostForClasses(zone: ShippingZoneData, classIds: number[]): number {
  if (classIds.length === 0) return zone.noClassCost || zone.cost;
  let maxCost = zone.noClassCost;
  for (const classId of classIds) {
    const applicable = classId > 0 ? (zone.classCosts[String(classId)] ?? zone.noClassCost) : zone.noClassCost;
    if (applicable > maxCost) maxCost = applicable;
  }
  return maxCost > 0 ? maxCost : zone.cost;
}

// ── Exported helpers ────────────────────────────────────────────────────────

export async function fetchWCShippingMethods(): Promise<ShippingMethod[]> {
  const zones = await fetchZonesWithData();
  return zones.map((z) => ({
    instance_id: z.id,
    method_id: z.method_id,
    title: z.method_title,
    cost: z.cost,
    enabled: true,
  }));
}

export async function fetchWCShippingFee(): Promise<number> {
  const zones = await fetchZonesWithData();
  const catchAll = zones.find((z) => z.isCatchAll);
  return catchAll?.cost ?? zones.find((z) => z.cost > 0)?.cost ?? 0;
}

export async function fetchWCShippingFeeForDistrict(district: string): Promise<number> {
  const zones = await fetchZonesWithData();
  const wcCode = DISTRICT_TO_WC_CODE[district.toLowerCase().trim()];
  if (wcCode) {
    const specific = zones.find((z) => !z.isCatchAll && z.states.includes(wcCode));
    if (specific) return specific.cost;
  }
  const catchAll = zones.find((z) => z.isCatchAll);
  return catchAll?.cost ?? zones.find((z) => z.cost > 0)?.cost ?? 0;
}

export async function calculateCartShippingByProducts(
  district: string,
  productIds: number[],
): Promise<number> {
  const zones = await fetchZonesWithData();
  const wcCode = DISTRICT_TO_WC_CODE[district.toLowerCase().trim()];
  const targetZone =
    (wcCode ? zones.find((z) => !z.isCatchAll && z.states.includes(wcCode)) : null)
    ?? zones.find((z) => z.isCatchAll)
    ?? zones[0];

  if (!targetZone) return 0;

  const uniqueIds = [...new Set(productIds.filter((id) => id > 0))];
  const headers = { Authorization: `Basic ${wcAuth()}` };

  const classIds = await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const res = await fetch(`${WC_BASE}/wp-json/wc/v3/products/${id}`, {
          headers,
          next: { revalidate: 3600 },
        });
        if (!res.ok) return 0;
        const p = await res.json() as { shipping_class_id?: number };
        return p.shipping_class_id ?? 0;
      } catch {
        return 0;
      }
    }),
  );

  return calcZoneCostForClasses(targetZone, classIds);
}
