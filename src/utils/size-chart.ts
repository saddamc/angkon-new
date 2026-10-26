/**
 * Unified Garment Size & Measurement System
 * Supports multi-part garment sections (Shirt/Kameez, Trouser/Pajama, Custom Parts),
 * reusable garment presets, unit conversion (Inches/CM), and backward compatibility.
 */

/** Meta key for per-product size measurement chart */
export const SIZE_CHART_META_KEY = "_angkon_size_chart";

export const DEFAULT_SIZE_CHART_COLUMNS = ["Chest", "Length", "Sleeve"] as const;

/** Legacy flat chart format (retained for backward compatibility) */
export type SizeChartData = {
  columns: string[];
  rows: Record<string, Record<string, string>>;
};

export interface SizeChartSectionRow {
  id: string;
  number?: number;
  area: string;
  values: Record<string, string>;
  colSpanText?: string;
  guide?: string;
  visible?: boolean;
}

export interface SizeChartSection {
  id: string;
  title: string;
  icon?: string;
  enabled?: boolean;
  rows: SizeChartSectionRow[];
}

export interface MultiSectionSizeChart {
  type: "sections";
  enabled?: boolean;
  unit?: "in" | "cm";
  preset?: string;
  sizes: string[];
  sections: SizeChartSection[];
}

export interface GarmentPreset {
  id: string;
  label: string;
  icon: string;
  description: string;
  defaultSizes: string[];
  sections: Array<{
    id: string;
    title: string;
    icon: string;
    enabled: boolean;
    rows: Array<{
      id: string;
      area: string;
      values: Record<string, string>;
      guide?: string;
    }>;
  }>;
}

export const GARMENT_PRESETS: Record<string, GarmentPreset> = {
  suit: {
    id: "suit",
    label: "Shirt & Trouser (Suit)",
    icon: "👔",
    description: "Two-piece ensemble: Kameez/Kurti + Trouser/Pants",
    defaultSizes: ["S", "M", "L"],
    sections: [
      {
        id: "shirt",
        title: "Shirt / Kameez",
        icon: "shirt",
        enabled: true,
        rows: [
          { id: "length", area: "Length", values: { S: "53", M: "53", L: "53", XL: "54" }, guide: "Highest shoulder point down to bottom hem" },
          { id: "chest", area: "Chest", values: { S: "19", M: "21", L: "23", XL: "25" }, guide: "Armpit to armpit flat measurement" },
          { id: "shoulder", area: "Shoulder", values: { S: "14", M: "15", L: "16", XL: "16.5" }, guide: "Across shoulder seams on back" },
          { id: "sleeve", area: "Sleeve Length", values: { S: "20", M: "21", L: "22", XL: "22.5" }, guide: "Shoulder seam down to cuff opening" },
          { id: "hip", area: "Hip", values: { S: "21", M: "23", L: "25", XL: "27" }, guide: "Fullest part of the hip line" },
          { id: "armhole", area: "Armhole", values: { S: "9", M: "9.75", L: "10.5", XL: "11" }, guide: "Shoulder seam down to armpit curve" },
        ],
      },
      {
        id: "trouser",
        title: "Trouser / Pajama",
        icon: "trouser",
        enabled: true,
        rows: [
          { id: "t_length", area: "Length", values: { S: "37", M: "38", L: "39", XL: "40" }, guide: "Outseam from waistband down to ankle hem" },
          { id: "t_waist", area: "Waist", values: { S: "41", M: "46", L: "50", XL: "54" }, guide: "Waistband stretched full width" },
          { id: "t_relaxed_waist", area: "Relaxed Waist", values: { S: "26", M: "28", L: "30", XL: "32" }, guide: "Waistband relaxed / unstretched" },
          { id: "t_hip", area: "Hip", values: { S: "22", M: "23", L: "24", XL: "25" }, guide: "Fullest part of trouser hips" },
        ],
      },
    ],
  },
  shirt: {
    id: "shirt",
    label: "Shirt / Kameez",
    icon: "👗",
    description: "Single piece Kameez, Kurti, or Top",
    defaultSizes: ["S", "M", "L", "XL"],
    sections: [
      {
        id: "shirt",
        title: "Shirt / Kameez",
        icon: "shirt",
        enabled: true,
        rows: [
          { id: "length", area: "Length", values: { S: "38", M: "39", L: "40", XL: "41" } },
          { id: "chest", area: "Chest", values: { S: "19", M: "21", L: "23", XL: "25" } },
          { id: "shoulder", area: "Shoulder", values: { S: "14", M: "14.5", L: "15", XL: "15.5" } },
          { id: "sleeve", area: "Sleeve Length", values: { S: "20", M: "21", L: "22", XL: "23" } },
          { id: "hip", area: "Hip", values: { S: "21", M: "23", L: "24.5", XL: "26" } },
          { id: "armhole", area: "Armhole", values: { S: "9", M: "9.5", L: "10", XL: "10.5" } },
        ],
      },
    ],
  },
  trouser: {
    id: "trouser",
    label: "Trouser / Pajama",
    icon: "👖",
    description: "Pajama, Pants, Shalwar or Trouser bottom",
    defaultSizes: ["S", "M", "L", "XL"],
    sections: [
      {
        id: "trouser",
        title: "Trouser / Pajama",
        icon: "trouser",
        enabled: true,
        rows: [
          { id: "length", area: "Length", values: { S: "38", M: "39", L: "40", XL: "41" } },
          { id: "waist", area: "Waist", values: { S: "28-30", M: "30-32", L: "32-34", XL: "34-36" } },
          { id: "relaxed_waist", area: "Relaxed Waist", values: { S: "26", M: "28", L: "30", XL: "32" } },
          { id: "hip", area: "Hip", values: { S: "40", M: "42", L: "44", XL: "46" } },
          { id: "inseam", area: "Inseam", values: { S: "28", M: "29", L: "30", XL: "31" } },
          { id: "bottom", area: "Bottom Opening", values: { S: "14", M: "15", L: "15.5", XL: "16" } },
        ],
      },
    ],
  },
  panjabi: {
    id: "panjabi",
    label: "Panjabi",
    icon: "✨",
    description: "Traditional men's Panjabi / Kurta",
    defaultSizes: ["38", "40", "42", "44", "46"],
    sections: [
      {
        id: "panjabi",
        title: "Panjabi",
        icon: "panjabi",
        enabled: true,
        rows: [
          { id: "chest", area: "Chest", values: { "38": "40", "40": "42", "42": "44", "44": "46", "46": "48" } },
          { id: "length", area: "Length", values: { "38": "40", "40": "42", "42": "44", "44": "46", "46": "48" } },
          { id: "sleeve", area: "Sleeve Length", values: { "38": "24", "40": "24.5", "42": "25", "44": "25.5", "46": "26" } },
          { id: "collar", area: "Collar", values: { "38": "15", "40": "15.5", "42": "16", "44": "16.5", "46": "17" } },
          { id: "shoulder", area: "Shoulder", values: { "38": "17", "40": "17.5", "42": "18", "44": "18.5", "46": "19" } },
        ],
      },
    ],
  },
  salwar: {
    id: "salwar",
    label: "Salwar",
    icon: "🥻",
    description: "Traditional pleated or gathered Salwar",
    defaultSizes: ["S", "M", "L", "XL"],
    sections: [
      {
        id: "salwar",
        title: "Salwar",
        icon: "salwar",
        enabled: true,
        rows: [
          { id: "length", area: "Length", values: { S: "38", M: "39", L: "40", XL: "41" } },
          { id: "waist", area: "Waist", values: { S: "42", M: "46", L: "50", XL: "54" } },
          { id: "hip", area: "Hip / Flare", values: { S: "44", M: "48", L: "52", XL: "56" } },
          { id: "bottom", area: "Bottom Opening (Poncha)", values: { S: "14", M: "15", L: "16", XL: "17" } },
        ],
      },
    ],
  },
  dupatta: {
    id: "dupatta",
    label: "Dupatta",
    icon: "🧣",
    description: "Matching or contrast Dupatta / Scarf",
    defaultSizes: ["Free Size"],
    sections: [
      {
        id: "dupatta",
        title: "Dupatta",
        icon: "dupatta",
        enabled: true,
        rows: [
          { id: "length", area: "Length (Yards / Inches)", values: { "Free Size": "2.5 Yards (90\")" } },
          { id: "width", area: "Width (Inches)", values: { "Free Size": "38\"" } },
        ],
      },
    ],
  },
  waistcoat: {
    id: "waistcoat",
    label: "Waistcoat",
    icon: "🧥",
    description: "Sleeveless waistcoat or vest (Koti / Mujib coat)",
    defaultSizes: ["38", "40", "42", "44", "46"],
    sections: [
      {
        id: "waistcoat",
        title: "Waistcoat",
        icon: "waistcoat",
        enabled: true,
        rows: [
          { id: "length", area: "Length", values: { "38": "27", "40": "28", "42": "29", "44": "30", "46": "31" } },
          { id: "chest", area: "Chest", values: { "38": "40", "40": "42", "42": "44", "44": "46", "46": "48" } },
          { id: "waist", area: "Waist", values: { "38": "38", "40": "40", "42": "42", "44": "44", "46": "46" } },
          { id: "shoulder", area: "Shoulder", values: { "38": "15", "40": "15.5", "42": "16", "44": "16.5", "46": "17" } },
        ],
      },
    ],
  },
  custom: {
    id: "custom",
    label: "Custom Garment Configuration",
    icon: "⚙️",
    description: "Fully customizable garment parts and measurements",
    defaultSizes: ["S", "M", "L"],
    sections: [
      {
        id: "custom_part",
        title: "Custom Part",
        icon: "custom",
        enabled: true,
        rows: [
          { id: "length", area: "Length", values: { S: "", M: "", L: "" } },
          { id: "chest", area: "Width / Chest", values: { S: "", M: "", L: "" } },
        ],
      },
    ],
  },
};

/** Product-specific size chart for Safaidah – Dastaan | Black Floral Suit */
export const SAFAIDAH_SIZE_CHART: MultiSectionSizeChart = {
  type: "sections",
  enabled: true,
  unit: "in",
  preset: "suit",
  sizes: ["S", "M", "L"],
  sections: [
    {
      id: "shirt",
      title: "SHIRT",
      icon: "shirt",
      enabled: true,
      rows: [
        {
          id: "length",
          number: 1,
          area: "Length",
          values: { S: "53", M: "53", L: "53", Small: "53", Medium: "53", Large: "53" },
          guide: "Measure straight from highest shoulder point down to bottom hem.",
        },
        {
          id: "chest",
          number: 2,
          area: "Chest",
          values: { S: "19", M: "21", L: "23", Small: "19", Medium: "21", Large: "23" },
          guide: "Measure straight across the bust from armpit to armpit (flat measurement).",
        },
        {
          id: "shoulder",
          number: 3,
          area: "Shoulder",
          values: { S: "14", M: "15", L: "16", Small: "14", Medium: "15", Large: "16" },
          guide: "Measure across from one shoulder seam to the other across the back.",
        },
        {
          id: "sleeves_length",
          number: 4,
          area: "Sleeves Length",
          values: { S: "20", M: "21", L: "22", Small: "20", Medium: "21", Large: "22" },
          guide: "Measure straight from top shoulder seam down to cuff opening.",
        },
        {
          id: "hip",
          number: 5,
          area: "Hip",
          values: { S: "21", M: "23", L: "25", Small: "21", Medium: "23", Large: "25" },
          guide: "Measure straight across the fullest part of the hip line.",
        },
        {
          id: "armhole",
          number: 6,
          area: "Armhole",
          values: { S: "9", M: "9.75", L: "10.5", Small: "9", Medium: "9.75", Large: "10.5" },
          guide: "Measure straight down from shoulder seam to the armpit curve.",
        },
      ],
    },
    {
      id: "trouser",
      title: "TROUSER",
      icon: "trouser",
      enabled: true,
      rows: [
        {
          id: "t_length",
          number: 7,
          area: "Length",
          values: { S: "37", M: "38", L: "39", Small: "37", Medium: "38", Large: "39" },
          guide: "Measure along the outseam from waistband down to bottom ankle hem.",
        },
        {
          id: "t_waist",
          number: 8,
          area: "Waist",
          values: { S: "41", M: "46", L: "50", Small: "41", Medium: "46", Large: "50" },
          guide: "Measure around the waistband with waistband stretched / full width.",
        },
        {
          id: "t_relax_waist",
          number: 9,
          area: "Relax Waist",
          values: { S: "26", M: "28", L: "30", Small: "26", Medium: "28", Large: "30" },
          guide: "Measure around the waistline with waistband relaxed.",
        },
        {
          id: "t_hip",
          number: 10,
          area: "Hip",
          values: { S: "22", M: "23", L: "24", Small: "22", Medium: "23", Large: "24" },
          guide: "Measure around the fullest part of the trouser hips.",
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

/** Flatten a multi-section chart into a legacy flat chart format (for backward-compatible export) */
export function flattenMultiSectionChart(chart: MultiSectionSizeChart): SizeChartData {
  const columns: string[] = [];
  const rows: Record<string, Record<string, string>> = {};

  for (const size of chart.sizes) {
    rows[size] = {};
  }

  for (const section of chart.sections) {
    if (section.enabled === false) continue;
    for (const row of section.rows) {
      if (row.visible === false) continue;
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

/** Generate a brand-new multi-section chart from a preset template */
export function createDefaultMultiSectionChart(
  presetKey = "suit",
  customSizes?: string[]
): MultiSectionSizeChart {
  const preset = GARMENT_PRESETS[presetKey] || GARMENT_PRESETS.suit;
  const sizes = customSizes && customSizes.length > 0 ? customSizes : preset.defaultSizes;

  let rowCounter = 1;
  const sections: SizeChartSection[] = preset.sections.map((sec) => ({
    id: sec.id || `section_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: sec.title,
    icon: sec.icon || "custom",
    enabled: sec.enabled !== false,
    rows: sec.rows.map((r) => {
      // Map row values across all requested sizes
      const values: Record<string, string> = {};
      for (const s of sizes) {
        values[s] = r.values[s] ?? r.values[s.toUpperCase()] ?? "";
      }
      return {
        id: r.id || `row_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        number: rowCounter++,
        area: r.area,
        values,
        guide: r.guide || "",
        visible: true,
      };
    }),
  }));

  return {
    type: "sections",
    enabled: true,
    unit: "in",
    preset: preset.id,
    sizes: [...sizes],
    sections,
  };
}

/** Normalize any incoming data (multi-section, legacy flat, or null) into a complete MultiSectionSizeChart */
export function normalizeToMultiSectionChart(
  raw: unknown,
  productSizes?: string[]
): MultiSectionSizeChart {
  if (raw && typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      // not JSON
    }
  }

  // Case 1: Already MultiSectionSizeChart
  if (isMultiSectionSizeChart(raw)) {
    let rowCounter = 1;
    const sizes =
      Array.isArray(raw.sizes) && raw.sizes.length > 0
        ? raw.sizes.map(String).map((s) => s.trim()).filter(Boolean)
        : (productSizes && productSizes.length > 0 ? productSizes : ["S", "M", "L"]);

    const sections: SizeChartSection[] = (raw.sections || []).map((sec, secIdx) => ({
      id: sec.id || `section_${secIdx + 1}`,
      title: sec.title || `Part ${secIdx + 1}`,
      icon: sec.icon || (sec.title.toLowerCase().includes("trouser") ? "trouser" : "shirt"),
      enabled: sec.enabled !== false,
      rows: (sec.rows || []).map((r, rIdx) => {
        const values: Record<string, string> = {};
        for (const s of sizes) {
          values[s] = r.values?.[s] ?? r.values?.[s.toUpperCase()] ?? r.values?.[s.toLowerCase()] ?? "";
        }
        return {
          id: r.id || `row_${secIdx + 1}_${rIdx + 1}`,
          number: r.number ?? rowCounter++,
          area: r.area || `Measurement ${rIdx + 1}`,
          values,
          colSpanText: r.colSpanText,
          guide: r.guide,
          visible: r.visible !== false,
        };
      }),
    }));

    return {
      type: "sections",
      enabled: raw.enabled !== false,
      unit: raw.unit === "cm" ? "cm" : "in",
      preset: raw.preset || "suit",
      sizes,
      sections,
    };
  }

  // Case 2: Legacy Flat SizeChartData ({ columns: [...], rows: { S: {...} } })
  if (raw && typeof raw === "object") {
    const obj = raw as { columns?: unknown; rows?: unknown };
    if (Array.isArray(obj.columns) && obj.columns.length > 0) {
      const columns = obj.columns.map(String).map((c) => c.trim()).filter(Boolean);
      const rows = (obj.rows && typeof obj.rows === "object" ? obj.rows : {}) as Record<string, Record<string, string>>;
      const sizes =
        productSizes && productSizes.length > 0
          ? productSizes
          : Object.keys(rows).length > 0
            ? Object.keys(rows)
            : ["S", "M", "L"];

      // Detect if columns have "Shirt" / "Trouser" prefix
      const shirtCols = columns.filter((c) => /shirt|kameez|top|kurti/i.test(c));
      const trouserCols = columns.filter((c) => /trouser|pant|pajama|shalwar/i.test(c));
      const otherCols = columns.filter((c) => !shirtCols.includes(c) && !trouserCols.includes(c));

      const sections: SizeChartSection[] = [];
      let rowCounter = 1;

      if (shirtCols.length > 0 || trouserCols.length > 0) {
        if (shirtCols.length > 0) {
          sections.push({
            id: "shirt",
            title: "Shirt / Kameez",
            icon: "shirt",
            enabled: true,
            rows: shirtCols.map((col) => {
              const cleanArea = col.replace(/^(shirt|kameez)\s*[-:]?\s*/i, "").trim() || col;
              const values: Record<string, string> = {};
              for (const s of sizes) {
                values[s] = rows[s]?.[col] ?? "";
              }
              return {
                id: cleanArea.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
                number: rowCounter++,
                area: cleanArea,
                values,
                visible: true,
              };
            }),
          });
        }

        if (trouserCols.length > 0) {
          sections.push({
            id: "trouser",
            title: "Trouser / Pajama",
            icon: "trouser",
            enabled: true,
            rows: trouserCols.map((col) => {
              const cleanArea = col.replace(/^(trouser|pajama|pant)\s*[-:]?\s*/i, "").trim() || col;
              const values: Record<string, string> = {};
              for (const s of sizes) {
                values[s] = rows[s]?.[col] ?? "";
              }
              return {
                id: cleanArea.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
                number: rowCounter++,
                area: cleanArea,
                values,
                visible: true,
              };
            }),
          });
        }

        if (otherCols.length > 0) {
          sections.push({
            id: "custom_part",
            title: "Custom Part",
            icon: "custom",
            enabled: true,
            rows: otherCols.map((col) => {
              const values: Record<string, string> = {};
              for (const s of sizes) {
                values[s] = rows[s]?.[col] ?? "";
              }
              return {
                id: col.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
                number: rowCounter++,
                area: col,
                values,
                visible: true,
              };
            }),
          });
        }
      } else {
        // Single unified section
        sections.push({
          id: "general",
          title: "Garment Measurements",
          icon: "shirt",
          enabled: true,
          rows: columns.map((col) => {
            const values: Record<string, string> = {};
            for (const s of sizes) {
              values[s] = rows[s]?.[col] ?? "";
            }
            return {
              id: col.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
              number: rowCounter++,
              area: col,
              values,
              visible: true,
            };
          }),
        });
      }

      return {
        type: "sections",
        enabled: true,
        unit: "in",
        preset: sections.length > 1 ? "suit" : "shirt",
        sizes,
        sections,
      };
    }
  }

  // Case 3: Empty / Not provided -> generate default Suit chart
  return createDefaultMultiSectionChart("suit", productSizes);
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
    if (chart.enabled === false) return false;
    return chart.sections.some((sec) =>
      sec.enabled !== false &&
      sec.rows.some((r) =>
        r.visible !== false &&
        (r.colSpanText || (r.values && Object.values(r.values).some((v) => (v ?? "").trim() !== "")))
      )
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
    "38": { Chest: '40"', Length: '40"', Sleeve: '24"' },
    "40": { Chest: '42"', Length: '42"', Sleeve: '24.5"' },
    "42": { Chest: '44"', Length: '44"', Sleeve: '25"' },
    "44": { Chest: '46"', Length: '46"', Sleeve: '25.5"' },
    "46": { Chest: '48"', Length: '48"', Sleeve: '26"' },
  },
};

/** Fallback industry defaults for Suit / 2-Piece & 3-Piece Sets (Shirt & Trouser) */
export const DEFAULT_SUIT_CHART: SizeChartData = {
  columns: ["Shirt Chest", "Shirt Length", "Sleeve", "Trouser Length", "Trouser Waist", "Trouser Hip"],
  rows: {
    XS: { "Shirt Chest": '36"', "Shirt Length": '37"', Sleeve: '21.5"', "Trouser Length": '37"', "Trouser Waist": '26-30"', "Trouser Hip": '38"' },
    S: { "Shirt Chest": '38"', "Shirt Length": '38"', Sleeve: '22"', "Trouser Length": '38"', "Trouser Waist": '28-32"', "Trouser Hip": '40"' },
    M: { "Shirt Chest": '40"', "Shirt Length": '39"', Sleeve: '22.5"', "Trouser Length": '39"', "Trouser Waist": '30-34"', "Trouser Hip": '42"' },
    L: { "Shirt Chest": '42"', "Shirt Length": '40"', Sleeve: '23"', "Trouser Length": '40"', "Trouser Waist": '32-36"', "Trouser Hip": '44"' },
    XL: { "Shirt Chest": '44"', "Shirt Length": '41"', Sleeve: '23.5"', "Trouser Length": '41"', "Trouser Waist": '34-38"', "Trouser Hip": '46"' },
    XXL: { "Shirt Chest": '46"', "Shirt Length": '42"', Sleeve: '24"', "Trouser Length": '42"', "Trouser Waist": '36-40"', "Trouser Hip": '48"' },
    "3XL": { "Shirt Chest": '48"', "Shirt Length": '42"', Sleeve: '24"', "Trouser Length": '42"', "Trouser Waist": '38-42"', "Trouser Hip": '50"' },
    "38": { "Shirt Chest": '40"', "Shirt Length": '40"', Sleeve: '24"', "Trouser Length": '38"', "Trouser Waist": '30-32"', "Trouser Hip": '42"' },
    "40": { "Shirt Chest": '42"', "Shirt Length": '42"', Sleeve: '24.5"', "Trouser Length": '39"', "Trouser Waist": '32-34"', "Trouser Hip": '44"' },
    "42": { "Shirt Chest": '44"', "Shirt Length": '44"', Sleeve: '25"', "Trouser Length": '40"', "Trouser Waist": '34-36"', "Trouser Hip": '46"' },
    "44": { "Shirt Chest": '46"', "Shirt Length": '46"', Sleeve: '25.5"', "Trouser Length": '41"', "Trouser Waist": '36-38"', "Trouser Hip": '48"' },
    "46": { "Shirt Chest": '48"', "Shirt Length": '48"', Sleeve: '26"', "Trouser Length": '42"', "Trouser Waist": '38-40"', "Trouser Hip": '50"' },
  },
};

/** Fallback industry defaults for Trouser / Pajama / Pants */
export const DEFAULT_TROUSER_CHART: SizeChartData = {
  columns: ["Trouser Waist", "Trouser Length", "Trouser Hip", "Bottom Hem"],
  rows: {
    "28": { "Trouser Waist": '28"', "Trouser Length": '38"', "Trouser Hip": '38"', "Bottom Hem": '14"' },
    "30": { "Trouser Waist": '30"', "Trouser Length": '38.5"', "Trouser Hip": '40"', "Bottom Hem": '14.5"' },
    "32": { "Trouser Waist": '32"', "Trouser Length": '39"', "Trouser Hip": '42"', "Bottom Hem": '15"' },
    "34": { "Trouser Waist": '34"', "Trouser Length": '40"', "Trouser Hip": '44"', "Bottom Hem": '15.5"' },
    "36": { "Trouser Waist": '36"', "Trouser Length": '41"', "Trouser Hip": '46"', "Bottom Hem": '16"' },
    "38": { "Trouser Waist": '38"', "Trouser Length": '41.5"', "Trouser Hip": '48"', "Bottom Hem": '16.5"' },
    "40": { "Trouser Waist": '40"', "Trouser Length": '42"', "Trouser Hip": '50"', "Bottom Hem": '17"' },
    XS: { "Trouser Waist": '26-28"', "Trouser Length": '37"', "Trouser Hip": '38"', "Bottom Hem": '14"' },
    S: { "Trouser Waist": '28-30"', "Trouser Length": '38"', "Trouser Hip": '40"', "Bottom Hem": '14.5"' },
    M: { "Trouser Waist": '30-32"', "Trouser Length": '39"', "Trouser Hip": '42"', "Bottom Hem": '15"' },
    L: { "Trouser Waist": '32-34"', "Trouser Length": '40"', "Trouser Hip": '44"', "Bottom Hem": '15.5"' },
    XL: { "Trouser Waist": '34-36"', "Trouser Length": '41"', "Trouser Hip": '46"', "Bottom Hem": '16"' },
    XXL: { "Trouser Waist": '36-38"', "Trouser Length": '42"', "Trouser Hip": '48"', "Bottom Hem": '16.5"' },
    "3XL": { "Trouser Waist": '38-40"', "Trouser Length": '42"', "Trouser Hip": '50"', "Bottom Hem": '17"' },
  },
};

/** Fallback industry defaults for Panjabi / Kurtas */
export const DEFAULT_PANJABI_CHART: SizeChartData = {
  columns: ["Chest", "Length", "Sleeve", "Collar"],
  rows: {
    "38": { Chest: '40"', Length: '40"', Sleeve: '24"', Collar: '15"' },
    "40": { Chest: '42"', Length: '42"', Sleeve: '24.5"', Collar: '15.5"' },
    "42": { Chest: '44"', Length: '44"', Sleeve: '25"', Collar: '16"' },
    "44": { Chest: '46"', Length: '46"', Sleeve: '25.5"', Collar: '16.5"' },
    "46": { Chest: '48"', Length: '48"', Sleeve: '26"', Collar: '17"' },
    S: { Chest: '40"', Length: '40"', Sleeve: '24"', Collar: '15"' },
    M: { Chest: '42"', Length: '42"', Sleeve: '24.5"', Collar: '15.5"' },
    L: { Chest: '44"', Length: '44"', Sleeve: '25"', Collar: '16"' },
    XL: { Chest: '46"', Length: '46"', Sleeve: '25.5"', Collar: '16.5"' },
    XXL: { Chest: '48"', Length: '48"', Sleeve: '26"', Collar: '17"' },
  },
};

/** True when any selected size matches XS–3XL clothing labels. */
export function isClothingSizeLabel(size: string): boolean {
  const u = size.trim().toUpperCase();
  return ["XS", "S", "M", "L", "XL", "XXL", "3XL"].includes(u);
}

export type MeasurementUnit = "in" | "cm";

export function formatMeasurement(value: string, unit: MeasurementUnit): string {
  if (!value || value === "-") return "-";
  const trimmed = value.trim();
  if (isNaN(Number(trimmed)) && !trimmed.includes("/")) return trimmed;
  if (unit === "in") return `${trimmed}″`;
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/").map((part) => {
      const num = parseFloat(part.trim());
      if (isNaN(num)) return part;
      return (Math.round(num * 2.54 * 10) / 10).toString();
    });
    return `${parts.join("/")} cm`;
  }
  const num = parseFloat(trimmed);
  if (isNaN(num)) return trimmed;
  return `${Math.round(num * 2.54 * 10) / 10} cm`;
}

