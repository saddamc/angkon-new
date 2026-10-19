/** Meta key for per-product size measurement chart */
export const SIZE_CHART_META_KEY = "_angkon_size_chart";

export const DEFAULT_SIZE_CHART_COLUMNS = ["Chest", "Length", "Sleeve"] as const;

export type SizeChartData = {
  /** Measurement field labels, e.g. Chest / Length / Sleeve (customizable) */
  columns: string[];
  /** size label → column label → value (e.g. "40\"") */
  rows: Record<string, Record<string, string>>;
};

export function emptySizeChart(columns: string[] = [...DEFAULT_SIZE_CHART_COLUMNS]): SizeChartData {
  return { columns: [...columns], rows: {} };
}

/** Parse meta value (string JSON or already-parsed object). */
export function parseSizeChart(raw: unknown): SizeChartData | null {
  if (raw == null || raw === "") return null;

  let data: unknown = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!data || typeof data !== "object") return null;
  const obj = data as { columns?: unknown; rows?: unknown };

  const columns = Array.isArray(obj.columns)
    ? obj.columns.map((c) => String(c).trim()).filter(Boolean)
    : [];
  if (columns.length === 0) return null;

  const rows: Record<string, Record<string, string>> = {};
  if (obj.rows && typeof obj.rows === "object" && !Array.isArray(obj.rows)) {
    for (const [size, vals] of Object.entries(obj.rows as Record<string, unknown>)) {
      if (!size || !vals || typeof vals !== "object" || Array.isArray(vals)) continue;
      const entry: Record<string, string> = {};
      for (const col of columns) {
        const v = (vals as Record<string, unknown>)[col];
        entry[col] = v == null ? "" : String(v);
      }
      rows[size] = entry;
    }
  }

  return { columns, rows };
}

export function serializeSizeChart(chart: SizeChartData): string {
  // Drop empty rows entirely; keep columns even if unused
  const rows: Record<string, Record<string, string>> = {};
  for (const [size, vals] of Object.entries(chart.rows)) {
    const cleaned: Record<string, string> = {};
    let hasValue = false;
    for (const col of chart.columns) {
      const v = (vals?.[col] ?? "").trim();
      cleaned[col] = v;
      if (v) hasValue = true;
    }
    if (hasValue) rows[size] = cleaned;
  }
  return JSON.stringify({ columns: chart.columns, rows });
}

export function sizeChartHasValues(chart: SizeChartData | null | undefined): boolean {
  if (!chart?.columns?.length) return false;
  return Object.values(chart.rows).some((row) =>
    chart.columns.some((col) => (row?.[col] ?? "").trim() !== ""),
  );
}

/** Read chart from product meta_data array. */
export function getSizeChartFromMeta(
  meta?: Array<{ id?: number; key: string; value?: unknown }> | null,
): { chart: SizeChartData | null; metaId?: number } {
  if (!meta?.length) return { chart: null };
  const hit = meta.slice().reverse().find((m) => m.key === SIZE_CHART_META_KEY || m.key === "_plainstitch_size_chart");
  if (!hit) return { chart: null };
  return {
    chart: parseSizeChart(hit.value),
    metaId: typeof hit.id === "number" ? hit.id : undefined,
  };
}

/** Fallback industry defaults when product has no custom chart (clothing only). */
export const DEFAULT_SHIRT_CHART: SizeChartData = {
  columns: ["Chest", "Length", "Sleeve"],
  rows: {
    XS: { Chest: '36"', Length: '26"', Sleeve: '7.5"' },
    S: { Chest: '38"', Length: '27"', Sleeve: '8"' },
    M: { Chest: '40"', Length: '28"', Sleeve: '8.5"' },
    L: { Chest: '42"', Length: '29"', Sleeve: '9"' },
    XL: { Chest: '44"', Length: '30"', Sleeve: '9.5"' },
    XXL: { Chest: '46"', Length: '31"', Sleeve: '10"' },
    "3XL": { Chest: '48"', Length: '32"', Sleeve: '10.5"' },
  },
};

/** True when any selected size matches XS–3XL clothing labels. */
export function isClothingSizeLabel(size: string): boolean {
  const u = size.trim().toUpperCase();
  return ["XS", "S", "M", "L", "XL", "XXL", "3XL"].includes(u);
}
