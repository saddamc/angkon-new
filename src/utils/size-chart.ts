/** Meta key for per-product size measurement chart */
export const SIZE_CHART_META_KEY = "_angkon_size_chart";

export const DEFAULT_SIZE_CHART_COLUMNS = ["Chest", "Length", "Sleeve"] as const;

export type SizeChartData = {
  /** Measurement field labels, e.g. Chest / Length / Sleeve (customizable) */
  columns: string[];
  /** size label → column label → value (e.g. "40\"") */
  rows: Record<string, Record<string, string>>;
};

export interface SizeChartSectionRow {
  number?: number;
  area: string;
  values?: Record<string, string>;
  colSpanText?: string;
  guide?: string;
}

export interface SizeChartSection {
  title: string;
  rows: SizeChartSectionRow[];
}

export interface MultiSectionSizeChart {
  type: "sections";
  sizes: string[];
  sections: SizeChartSection[];
}

/** Product-specific size chart for Safaidah – Dastaan | Black Floral Suit */
export const SAFAIDAH_SIZE_CHART: MultiSectionSizeChart = {
  type: "sections",
  sizes: ["XS", "S", "M", "L", "XL"],
  sections: [
    {
      title: "SHIRT",
      rows: [
        {
          number: 1,
          area: "Shoulder",
          values: { XS: "13.5", S: "14", M: "14.5", L: "15", XL: "15.5" },
          guide: "Measure across from one shoulder seam to the other across the back.",
        },
        {
          number: 2,
          area: "Chest",
          values: { XS: "18", S: "19", M: "20", L: "22", XL: "24" },
          guide: "Measure straight across the bust from armpit to armpit (flat measurement).",
        },
        {
          number: 3,
          area: "Waist",
          values: { XS: "15", S: "16", M: "18", L: "20", XL: "21.5" },
          guide: "Measure straight across the narrowest natural waistline of the shirt.",
        },
        {
          number: 4,
          area: "Hip",
          values: { XS: "19", S: "21", M: "22", L: "23.5", XL: "25.5" },
          guide: "Measure straight across the fullest part of the hip line / chaak start.",
        },
        {
          number: 5,
          area: "Sleeve Length",
          values: { XS: "21.5", S: "22", M: "22.5", L: "23", XL: "23" },
          guide: "Measure straight from top shoulder seam down to cuff opening.",
        },
        {
          number: 6,
          area: "Armhole",
          values: { XS: "7.5", S: "8", M: "8.5", L: "10", XL: "11" },
          guide: "Measure straight down from shoulder seam to the armpit curve.",
        },
        {
          number: 7,
          area: "Cuff Opening",
          values: { XS: "3.5", S: "3.5", M: "4", L: "4.5", XL: "5" },
          guide: "Measure flat across the wrist / cuff opening of the sleeve.",
        },
        {
          number: 8,
          area: "Dress Length",
          colSpanText: "According to Design",
          guide: "Garment length crafted in accordance with catalog design specifications.",
        },
      ],
    },
    {
      title: "MAXI",
      rows: [
        {
          number: 9,
          area: "Measurements 1 - 7",
          colSpanText: "Same as shirt size",
          guide: "All upper body measurements (1 to 7) correspond directly to shirt size.",
        },
        {
          number: 10,
          area: "Maxi Length",
          values: { XS: "56", S: "56", M: "58", L: "58", XL: "58" },
          guide: "Measure straight from highest shoulder point down to bottom hem.",
        },
        {
          number: 11,
          area: "Peshwas Length",
          values: { XS: "50", S: "51", M: "52", L: "52", XL: "52" },
          guide: "Measure straight from shoulder seam down to the flared peshwas hem.",
        },
      ],
    },
    {
      title: "TROUSER",
      rows: [
        {
          number: 12,
          area: "Length",
          values: { XS: "42.5", S: "42.5", M: "42.5", L: "45", XL: "45" },
          guide: "Measure along the outseam from waistband down to bottom ankle hem.",
        },
        {
          number: 13,
          area: "Waist",
          values: { XS: "27", S: "28", M: "29", L: "33", XL: "35" },
          guide: "Measure around the waistline with waistband relaxed.",
        },
        {
          number: 14,
          area: "Hip Round",
          values: { XS: "40", S: "41", M: "42.5", L: "47", XL: "50" },
          guide: "Measure around the fullest part of the trouser hips.",
        },
        {
          number: 15,
          area: "Hem",
          values: { XS: "47.5", S: "47.5", M: "47.5", L: "50", XL: "50" },
          guide: "Measure around bottom leg opening or trouser flare sweep.",
        },
        {
          number: 16,
          area: "Front Rise",
          values: { XS: "12", S: "12", M: "12.5", L: "14.5", XL: "15.5" },
          guide: "Measure from crotch seam up to the top of the front waistband.",
        },
        {
          number: 17,
          area: "Back Rise",
          values: { XS: "14", S: "14", M: "14.5", L: "16.5", XL: "17.5" },
          guide: "Measure from crotch seam up to the top of the back waistband.",
        },
      ],
    },
  ],
};

export function isMultiSectionSizeChart(data: unknown): data is MultiSectionSizeChart {
  if (!data || typeof data !== "object") return false;
  const d = data as { type?: unknown; sections?: unknown; sizes?: unknown };
  return (
    d.type === "sections" &&
    Array.isArray(d.sections) &&
    Array.isArray(d.sizes)
  );
}

export function flattenMultiSectionChart(chart: MultiSectionSizeChart): SizeChartData {
  const columns: string[] = [];
  const rows: Record<string, Record<string, string>> = {};

  for (const size of chart.sizes) {
    rows[size] = {};
  }

  for (const section of chart.sections) {
    for (const row of section.rows) {
      const colName = `${section.title} - ${row.area}`;
      if (!columns.includes(colName)) {
        columns.push(colName);
      }
      for (const size of chart.sizes) {
        rows[size][colName] = row.colSpanText || row.values?.[size] || "";
      }
    }
  }

  return { columns, rows };
}

export function emptySizeChart(columns: string[] = [...DEFAULT_SIZE_CHART_COLUMNS]): SizeChartData {
  return { columns: [...columns], rows: {} };
}

/** Parse meta value (string JSON or already-parsed object). */
export function parseSizeChart(raw: unknown): SizeChartData | MultiSectionSizeChart | null {
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

  if (isMultiSectionSizeChart(data)) {
    return data;
  }

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

export function serializeSizeChart(chart: SizeChartData | MultiSectionSizeChart): string {
  if (isMultiSectionSizeChart(chart)) {
    return JSON.stringify(chart);
  }

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

export function sizeChartHasValues(chart: SizeChartData | MultiSectionSizeChart | null | undefined): boolean {
  if (!chart) return false;
  if (isMultiSectionSizeChart(chart)) {
    return chart.sections.some((sec) =>
      sec.rows.some((r) => r.colSpanText || (r.values && Object.values(r.values).some((v) => v.trim() !== "")))
    );
  }
  if (!chart.columns?.length) return false;
  return Object.values(chart.rows).some((row) =>
    chart.columns.some((col) => (row?.[col] ?? "").trim() !== ""),
  );
}

/** Read chart from product meta_data array. */
export function getSizeChartFromMeta(
  meta?: Array<{ id?: number; key: string; value?: unknown }> | null,
): { chart: SizeChartData | MultiSectionSizeChart | null; metaId?: number } {
  if (!meta?.length) return { chart: null };
  const hit = meta.slice().reverse().find((m) => m.key === SIZE_CHART_META_KEY || m.key === "_plainstitch_size_chart");
  if (!hit) return { chart: null };
  return {
    chart: parseSizeChart(hit.value),
    metaId: typeof hit.id === "number" ? hit.id : undefined,
  };
}

/** Helper to retrieve the active size chart for a given product */
export function getProductSizeChart(
  product?: { slug?: string; name?: string; meta_data?: Array<{ key: string; value?: unknown }> } | null,
): MultiSectionSizeChart | SizeChartData | null {
  if (!product) return null;

  // Check if specifically Safaidah – Dastaan | Black Floral Suit
  const isSafaidah =
    product.slug === "safaidah-dastaan-black-floral-suit" ||
    (product.name && /safaidah/i.test(product.name));

  if (isSafaidah) {
    const metaChart = getSizeChartFromMeta(product.meta_data)?.chart;
    if (metaChart && isMultiSectionSizeChart(metaChart)) {
      return metaChart;
    }
    return SAFAIDAH_SIZE_CHART;
  }

  return getSizeChartFromMeta(product.meta_data)?.chart ?? null;
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
