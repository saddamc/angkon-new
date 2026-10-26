"use client";

import { useState, useMemo, useEffect, useRef, Fragment } from "react";
import {
  X,
  Check,
  Plus,
  Trash2,
  Edit2,
  Eye,
  Ruler,
  ChevronDown,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Info,
  Layers,
} from "lucide-react";
import {
  MultiSectionSizeChart,
  SizeChartSection,
  SizeChartSectionRow,
  GARMENT_PRESETS,
  createDefaultMultiSectionChart,
  formatMeasurement,
  MeasurementUnit,
} from "@/utils/size-chart";

const PRESET_ICONS: Record<string, string> = {
  shirt: "👔",
  trouser: "👖",
  panjabi: "✨",
  salwar: "🥻",
  dupatta: "🧣",
  waistcoat: "🧥",
  custom: "⚙️",
};

const COMMON_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "38", "40", "42", "44", "46", "Free Size"];

interface SizeMeasurementBuilderProps {
  initialChart?: MultiSectionSizeChart;
  productName?: string;
  availableProductSizes?: string[];
  onSave: (chart: MultiSectionSizeChart) => void;
  onCancel: () => void;
}

export function SizeMeasurementBuilder({
  initialChart,
  productName,
  availableProductSizes,
  onSave,
  onCancel,
}: SizeMeasurementBuilderProps) {
  // Working chart state (deep copy to allow cancellation without side effects)
  const [chart, setChart] = useState<MultiSectionSizeChart>(() => {
    if (initialChart && initialChart.sections && initialChart.sections.length > 0) {
      return JSON.parse(JSON.stringify(initialChart));
    }
    return createDefaultMultiSectionChart("suit", availableProductSizes);
  });

  const [activeTabSectionId, setActiveTabSectionId] = useState<string>(() => {
    return chart.sections[0]?.id || "shirt";
  });

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUnit, setPreviewUnit] = useState<MeasurementUnit>(chart.unit === "cm" ? "cm" : "in");

  // Inline field editing state
  const [editingField, setEditingField] = useState<{ sectionId: string; rowId: string; name: string } | null>(null);
  const [newFieldInputs, setNewFieldInputs] = useState<Record<string, string>>({});
  const [editingSectionTitle, setEditingSectionTitle] = useState<{ sectionId: string; title: string } | null>(null);

  // New Custom Part modal state
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [newPartName, setNewPartName] = useState("");
  const [newPartIcon, setNewPartIcon] = useState("custom");

  // Manage Sizes modal state
  const [showManageSizesModal, setShowManageSizesModal] = useState(false);
  const [customSizeInput, setCustomSizeInput] = useState("");

  // Track unsaved modifications
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setPreviewUnit(chart.unit === "cm" ? "cm" : "in");
  }, [chart.unit]);

  // Keep active section valid if sections are deleted
  useEffect(() => {
    if (!chart.sections.some((s) => s.id === activeTabSectionId) && chart.sections.length > 0) {
      setActiveTabSectionId(chart.sections[0].id);
    }
  }, [chart.sections, activeTabSectionId]);

  /* ── Presets Handlers ── */
  const handlePresetChange = (presetKey: string) => {
    const preset = GARMENT_PRESETS[presetKey];
    if (!preset) return;

    if (
      hasChanges &&
      !window.confirm(
        `Switch to the "${preset.label}" template? This will load the standard measurement fields for this garment.`
      )
    ) {
      return;
    }

    const newChart = createDefaultMultiSectionChart(presetKey, chart.sizes);
    setChart(newChart);
    setActiveTabSectionId(newChart.sections[0]?.id || "");
    setHasChanges(true);
  };

  /* ── Unit Toggle ── */
  const toggleUnit = (unit: "in" | "cm") => {
    setChart((prev) => ({ ...prev, unit }));
    setPreviewUnit(unit);
    setHasChanges(true);
  };

  /* ── Sizes Management ── */
  const addSize = (sizeToAdd: string) => {
    const clean = sizeToAdd.trim();
    if (!clean || chart.sizes.includes(clean)) return;

    setChart((prev) => {
      const nextSizes = [...prev.sizes, clean];
      return {
        ...prev,
        sizes: nextSizes,
        sections: prev.sections.map((sec) => ({
          ...sec,
          rows: sec.rows.map((r) => ({
            ...r,
            values: { ...r.values, [clean]: "" },
          })),
        })),
      };
    });
    setHasChanges(true);
  };

  const removeSize = (sizeToRemove: string) => {
    if (chart.sizes.length <= 1) {
      alert("At least one size column must remain configured.");
      return;
    }

    if (
      !window.confirm(
        `Remove size "${sizeToRemove}" column? Any measurement values for this size will be cleared.`
      )
    ) {
      return;
    }

    setChart((prev) => ({
      ...prev,
      sizes: prev.sizes.filter((s) => s !== sizeToRemove),
      sections: prev.sections.map((sec) => ({
        ...sec,
        rows: sec.rows.map((r) => {
          const newVals = { ...r.values };
          delete newVals[sizeToRemove];
          return { ...r, values: newVals };
        }),
      })),
    }));
    setHasChanges(true);
  };

  /* ── Value Input Handlers ── */
  const handleValueChange = (sectionId: string, rowId: string, size: string, val: string) => {
    setChart((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          rows: sec.rows.map((r) => {
            if (r.id !== rowId) return r;
            return {
              ...r,
              values: {
                ...r.values,
                [size]: val,
              },
            };
          }),
        };
      }),
    }));
    setHasChanges(true);
  };

  /* ── Field Management (Add / Rename / Delete / Reorder) ── */
  const handleAddField = (sectionId: string) => {
    const raw = (newFieldInputs[sectionId] || "").trim();
    if (!raw) return;

    setChart((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const exists = sec.rows.some((r) => r.area.toLowerCase() === raw.toLowerCase());
        if (exists) {
          alert(`A field named "${raw}" already exists in this section.`);
          return sec;
        }

        const newRow: SizeChartSectionRow = {
          id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          number: sec.rows.length + 1,
          area: raw,
          values: Object.fromEntries(prev.sizes.map((s) => [s, ""])),
          visible: true,
        };

        return {
          ...sec,
          rows: [...sec.rows, newRow],
        };
      }),
    }));

    setNewFieldInputs((prev) => ({ ...prev, [sectionId]: "" }));
    setHasChanges(true);
  };

  const handleDeleteField = (sectionId: string, rowId: string, fieldName: string) => {
    if (!window.confirm(`Delete measurement field "${fieldName}"?`)) return;

    setChart((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const filtered = sec.rows.filter((r) => r.id !== rowId);
        // Re-index row numbers
        return {
          ...sec,
          rows: filtered.map((r, idx) => ({ ...r, number: idx + 1 })),
        };
      }),
    }));
    setHasChanges(true);
  };

  const handleSaveRenameField = () => {
    if (!editingField) return;
    const clean = editingField.name.trim();
    if (!clean) {
      setEditingField(null);
      return;
    }

    setChart((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id !== editingField.sectionId) return sec;
        return {
          ...sec,
          rows: sec.rows.map((r) => (r.id === editingField.rowId ? { ...r, area: clean } : r)),
        };
      }),
    }));

    setEditingField(null);
    setHasChanges(true);
  };

  const handleMoveField = (sectionId: string, rowIdx: number, direction: "up" | "down") => {
    setChart((prev) => ({
      ...prev,
      sections: prev.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        const rows = [...sec.rows];
        const targetIdx = direction === "up" ? rowIdx - 1 : rowIdx + 1;
        if (targetIdx < 0 || targetIdx >= rows.length) return sec;

        const [moved] = rows.splice(rowIdx, 1);
        rows.splice(targetIdx, 0, moved);

        return {
          ...sec,
          rows: rows.map((r, idx) => ({ ...r, number: idx + 1 })),
        };
      }),
    }));
    setHasChanges(true);
  };

  /* ── Section Management (Add Part / Delete / Rename) ── */
  const handleAddCustomPart = () => {
    const title = newPartName.trim();
    if (!title) return;

    const newSecId = `part_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newSection: SizeChartSection = {
      id: newSecId,
      title,
      icon: newPartIcon,
      enabled: true,
      rows: [
        {
          id: `field_${Date.now()}_1`,
          number: 1,
          area: "Length",
          values: Object.fromEntries(chart.sizes.map((s) => [s, ""])),
          visible: true,
        },
      ],
    };

    setChart((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));

    setActiveTabSectionId(newSecId);
    setNewPartName("");
    setShowAddPartModal(false);
    setHasChanges(true);
  };

  const handleDeleteSection = (sectionId: string, sectionTitle: string) => {
    if (chart.sections.length <= 1) {
      alert("A size guide must have at least one garment part.");
      return;
    }

    if (!window.confirm(`Delete entire "${sectionTitle}" garment part and all its measurements?`)) {
      return;
    }

    setChart((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== sectionId),
    }));
    setHasChanges(true);
  };

  const handleSaveRenameSection = () => {
    if (!editingSectionTitle) return;
    const clean = editingSectionTitle.title.trim();
    if (!clean) {
      setEditingSectionTitle(null);
      return;
    }

    setChart((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === editingSectionTitle.sectionId ? { ...s, title: clean } : s
      ),
    }));

    setEditingSectionTitle(null);
    setHasChanges(true);
  };

  /* ── Save Validation ── */
  const handleFinalSave = () => {
    // Basic validation
    if (chart.sizes.length === 0) {
      alert("Please configure at least one size column (e.g. S, M, L).");
      return;
    }

    if (chart.sections.length === 0) {
      alert("Please configure at least one garment section.");
      return;
    }

    onSave(chart);
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 text-[#1A0302]">
      {/* ── LEFT: SIZE & MEASUREMENT BUILDER ── */}
      <div className="flex-1 bg-white rounded-2xl border border-stone-200 shadow-sm p-5 sm:p-7 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-stone-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-[#400604]">
              Size &amp; Measurement Builder
            </h2>
            <p className="text-xs sm:text-[13px] text-stone-500 mt-0.5">
              Create and manage garment measurements for your products
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#400604]/20 bg-stone-50 hover:bg-[#400604]/5 text-[#400604] text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Eye className="h-4 w-4 text-[#400604]" />
              View Live Preview
            </button>
          </div>
        </div>

        {/* Top Control Bar: Category Preset, Size Columns & Units */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-center p-4 rounded-2xl bg-stone-50/90 border border-stone-200">
          {/* Preset Selector */}
          <div className="lg:col-span-5 space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600">
              Product Category
            </label>
            <div className="relative">
              <select
                value={chart.preset || "suit"}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full appearance-none rounded-xl border border-stone-300 bg-white py-2.5 pl-10 pr-9 text-xs sm:text-[13px] font-bold text-stone-800 shadow-xs focus:border-[#400604] focus:outline-none focus:ring-1 focus:ring-[#400604]/20 transition cursor-pointer"
              >
                {Object.values(GARMENT_PRESETS).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none">
                {PRESET_ICONS[chart.preset || "suit"] || "👔"}
              </span>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
            </div>
          </div>

          {/* Sizes Overview & Fast Add */}
          <div className="lg:col-span-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600">
                Size Columns ({chart.sizes.length})
              </label>
              <button
                type="button"
                onClick={() => setShowManageSizesModal(true)}
                className="text-[11px] font-extrabold text-[#400604] hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Manage All
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap p-1.5 rounded-xl bg-white border border-stone-200 shadow-2xs min-h-[42px]">
              {chart.sizes.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 text-[11px] font-black uppercase border border-stone-200"
                >
                  {s}
                </span>
              ))}
              <button
                type="button"
                onClick={() => setShowManageSizesModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#400604] hover:bg-[#590a07] text-white text-[11px] font-bold shadow-2xs transition cursor-pointer ml-auto"
              >
                <Plus className="h-3 w-3" />
                Add Size
              </button>
            </div>
          </div>

          {/* Units Selector */}
          <div className="lg:col-span-3 space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600">
              Units
            </label>
            <div className="grid grid-cols-2 rounded-xl bg-stone-200 p-1 border border-stone-300 shadow-inner h-[42px] items-center">
              <button
                type="button"
                onClick={() => toggleUnit("in")}
                className={`h-full text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                  chart.unit !== "cm"
                    ? "bg-[#400604] text-white shadow-sm font-black"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Inches
              </button>
              <button
                type="button"
                onClick={() => toggleUnit("cm")}
                className={`h-full text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                  chart.unit === "cm"
                    ? "bg-[#400604] text-white shadow-sm font-black"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                CM
              </button>
            </div>
          </div>
        </div>

        {/* Section Switcher Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {chart.sections.map((sec) => {
            const isActive = activeTabSectionId === sec.id;
            const icon = PRESET_ICONS[sec.icon || ""] || PRESET_ICONS[sec.id] || "👔";
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveTabSectionId(sec.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-[#400604] border-[#400604] text-white shadow-md ring-2 ring-[#400604]/20"
                    : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50 hover:border-stone-300"
                }`}
              >
                <span>{icon}</span>
                <span>{sec.title}</span>
                <span className="text-[10px] opacity-75">({sec.rows.length})</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowAddPartModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border border-dashed border-stone-300 text-stone-600 hover:text-[#400604] hover:border-[#400604] hover:bg-stone-50 transition cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Custom Part
          </button>
        </div>

        {/* ── SECTION EDITORS (Cards) ── */}
        <div className="space-y-6">
          {chart.sections.map((sec) => {
            // In tab mode, show only active section; on larger screens, admin can also scroll all
            const isTabActive = activeTabSectionId === sec.id;
            const icon = PRESET_ICONS[sec.icon || ""] || PRESET_ICONS[sec.id] || "👔";

            return (
              <div
                key={sec.id}
                id={`section-${sec.id}`}
                className={`rounded-2xl border transition-all duration-200 ${
                  isTabActive
                    ? "border-[#E1B76F]/50 shadow-sm bg-white ring-1 ring-[#E1B76F]/20"
                    : "border-stone-200 bg-stone-50/50 opacity-80"
                }`}
              >
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-stone-50/90 border-b border-stone-200 rounded-t-2xl">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-lg">{icon}</span>
                    {editingSectionTitle?.sectionId === sec.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          value={editingSectionTitle.title}
                          onChange={(e) =>
                            setEditingSectionTitle({ sectionId: sec.id, title: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveRenameSection();
                            if (e.key === "Escape") setEditingSectionTitle(null);
                          }}
                          className="px-2.5 py-1 text-xs font-bold uppercase rounded-lg border border-[#400604] bg-white text-stone-900 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleSaveRenameSection}
                          className="h-7 px-2.5 rounded-lg bg-[#400604] text-white text-[11px] font-bold"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-stone-900">
                          {sec.title} MEASUREMENTS
                        </h3>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingSectionTitle({ sectionId: sec.id, title: sec.title })
                          }
                          className="h-6 w-6 rounded flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition"
                          title="Rename section"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-stone-500 mr-0.5">
                      Size Columns:
                    </span>
                    <div className="inline-flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-1 shadow-2xs">
                      {chart.sizes.map((s) => (
                        <span
                          key={s}
                          className="px-2.5 py-0.5 text-[11px] font-extrabold uppercase rounded bg-stone-100 text-stone-800 border border-stone-200/60"
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    {/* Prominent + Add Size Button */}
                    <button
                      type="button"
                      onClick={() => setShowManageSizesModal(true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#400604] hover:bg-[#580906] text-white text-[11px] font-bold shadow-xs transition cursor-pointer"
                      title="Add or remove size columns"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Size</span>
                    </button>

                    {/* Quick Add Pills for Missing Standard Sizes (e.g. + XS, + XL, + XXL) */}
                    {COMMON_SIZES.filter((s) => !chart.sizes.includes(s))
                      .slice(0, 3)
                      .map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => addSize(s)}
                          className="hidden sm:inline-flex items-center px-2 py-1 rounded-lg border border-dashed border-stone-300 bg-white hover:border-[#400604] hover:text-[#400604] hover:bg-stone-50 text-[11px] font-bold text-stone-600 transition cursor-pointer"
                          title={`Click to quickly add ${s} column`}
                        >
                          + {s}
                        </button>
                      ))}

                    {chart.sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSection(sec.id, sec.title)}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition ml-2"
                        title={`Delete ${sec.title} part`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Section Measurement Table */}
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left text-xs border-collapse min-w-[550px]">
                    <thead>
                      <tr className="border-b border-stone-200 bg-stone-100/70 text-stone-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-2.5 px-3 w-10 text-center">::</th>
                        <th className="py-2.5 px-2.5 w-10 text-center">#</th>
                        <th className="py-2.5 px-4 min-w-[140px]">Measurement Field</th>
                        {chart.sizes.map((s) => (
                          <th key={s} className="py-2.5 px-2.5 text-center min-w-[70px]">
                            {s}
                          </th>
                        ))}
                        <th className="py-2 px-1 text-center w-14">
                          <button
                            type="button"
                            onClick={() => setShowManageSizesModal(true)}
                            className="inline-flex items-center justify-center gap-0.5 h-6 px-1.5 rounded-md bg-[#400604]/10 hover:bg-[#400604] hover:text-white text-[#400604] text-[10px] font-black transition cursor-pointer"
                            title="Add or manage size columns"
                          >
                            <Plus className="h-2.5 w-2.5" />
                            <span>Size</span>
                          </button>
                        </th>
                        <th className="py-2.5 px-3 w-20 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-800 font-medium">
                      {sec.rows.map((row, rowIdx) => {
                        const isEditingThisRow =
                          editingField?.sectionId === sec.id && editingField?.rowId === row.id;

                        return (
                          <tr
                            key={row.id}
                            className="hover:bg-stone-50/80 transition group"
                          >
                            {/* Drag / Reorder Handle */}
                            <td className="py-2 px-2 text-center text-stone-300 group-hover:text-stone-500">
                              <div className="flex items-center justify-center gap-0.5">
                                <button
                                  type="button"
                                  disabled={rowIdx === 0}
                                  onClick={() => handleMoveField(sec.id, rowIdx, "up")}
                                  className="h-5 w-5 rounded flex items-center justify-center hover:bg-stone-200 disabled:opacity-20 cursor-pointer"
                                  title="Move row up"
                                >
                                  <ArrowUp className="h-2.5 w-2.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={rowIdx === sec.rows.length - 1}
                                  onClick={() => handleMoveField(sec.id, rowIdx, "down")}
                                  className="h-5 w-5 rounded flex items-center justify-center hover:bg-stone-200 disabled:opacity-20 cursor-pointer"
                                  title="Move row down"
                                >
                                  <ArrowDown className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            </td>

                            {/* Row Number */}
                            <td className="py-2 px-2.5 text-center font-mono text-[11px] text-stone-400">
                              {row.number || rowIdx + 1}
                            </td>

                            {/* Measurement Field Name */}
                            <td className="py-2 px-4 font-bold text-stone-900 text-xs">
                              {isEditingThisRow ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    autoFocus
                                    value={editingField.name}
                                    onChange={(e) =>
                                      setEditingField({ ...editingField, name: e.target.value })
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSaveRenameField();
                                      if (e.key === "Escape") setEditingField(null);
                                    }}
                                    className="px-2 py-1 text-xs font-bold rounded border border-[#400604] bg-white text-stone-900 w-full focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleSaveRenameField}
                                    className="px-2 py-1 bg-[#400604] text-white rounded text-[10px] font-bold"
                                  >
                                    Done
                                  </button>
                                </div>
                              ) : (
                                <span
                                  onDoubleClick={() =>
                                    setEditingField({
                                      sectionId: sec.id,
                                      rowId: row.id,
                                      name: row.area,
                                    })
                                  }
                                  className="cursor-pointer hover:text-[#400604]"
                                  title="Double-click to rename"
                                >
                                  {row.area}
                                </span>
                              )}
                            </td>

                            {/* Size Values Inputs */}
                            {chart.sizes.map((s) => {
                              const val = row.values?.[s] ?? "";
                              return (
                                <td key={s} className="py-2 px-2 text-center">
                                  <input
                                    value={val}
                                    onChange={(e) =>
                                      handleValueChange(sec.id, row.id, s, e.target.value)
                                    }
                                    placeholder='e.g. 53"'
                                    className="w-full min-w-[4rem] text-center rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs font-semibold text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-[#400604] focus:ring-1 focus:ring-[#400604]/20 transition"
                                  />
                                </td>
                              );
                            })}

                            {/* Empty spacer under the + Size header */}
                            <td className="py-2 px-1 text-center bg-stone-50/20" />

                            {/* Actions */}
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingField({
                                      sectionId: sec.id,
                                      rowId: row.id,
                                      name: row.area,
                                    })
                                  }
                                  className="h-6 w-6 rounded flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition cursor-pointer"
                                  title={`Edit ${row.area}`}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteField(sec.id, row.id, row.area)
                                  }
                                  className="h-6 w-6 rounded flex items-center justify-center text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                  title={`Delete ${row.area}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Add Field Row */}
                <div className="p-3.5 bg-stone-50/70 border-t border-stone-200 rounded-b-2xl">
                  <div className="flex gap-2">
                    <input
                      value={newFieldInputs[sec.id] || ""}
                      onChange={(e) =>
                        setNewFieldInputs({ ...newFieldInputs, [sec.id]: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddField(sec.id);
                        }
                      }}
                      placeholder="Add measurement field (e.g. Collar, Cuff, Inseam, Thigh, Dupatta Length...)"
                      className="flex-1 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#400604] focus:ring-1 focus:ring-[#400604]/20 transition shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddField(sec.id)}
                      disabled={!(newFieldInputs[sec.id] || "").trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-800 hover:bg-[#400604] disabled:opacity-40 text-white text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Field
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-stone-200">
          <button
            type="button"
            onClick={() => setShowAddPartModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Custom Part
          </button>

          <div className="w-full sm:w-auto flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-xs font-semibold text-stone-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleFinalSave}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-[#400604] hover:bg-[#520805] text-white text-xs font-black tracking-wide shadow-md hover:shadow-lg transition cursor-pointer border border-[#E1B76F]/30"
            >
              Save Measurements
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT: DESKTOP EMBEDDED LIVE PREVIEW (>= 1280px) ── */}
      <div className="hidden xl:block w-[450px] shrink-0 sticky top-6 self-start space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-[#400604]" />
            <h3 className="text-xs font-black uppercase tracking-wider text-stone-800">
              Customer Size Guide — Live Preview
            </h3>
          </div>
          <span className="text-[10px] text-stone-500 font-medium">Real-time</span>
        </div>

        {/* Live Preview Card (Royal Burgundy & Gold Theme) */}
        <div className="rounded-2xl border border-[#E1B76F]/30 bg-[#280302] p-5 shadow-xl text-white">
          <LivePreviewCard chart={chart} unit={previewUnit} onUnitChange={setPreviewUnit} />
        </div>
      </div>

      {/* ── MODAL: POPUP LIVE PREVIEW FOR MOBILE & TABLET ── */}
      {showPreviewModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border border-[#E1B76F]/40 bg-[#280302] shadow-2xl text-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E1B76F]/25 bg-[#400604]">
              <div className="flex items-center gap-2.5">
                <Eye className="h-5 w-5 text-[#E1B76F]" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    Customer Size Guide — Live Preview
                  </h3>
                  <p className="text-[11px] text-white/70">
                    This is how customers will see the size guide on the product page
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="h-8 w-8 rounded-full bg-[#340402] border border-[#E1B76F]/40 flex items-center justify-center text-white hover:bg-[#E1B76F] hover:text-[#400604] transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <LivePreviewCard chart={chart} unit={previewUnit} onUnitChange={setPreviewUnit} />
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD CUSTOM PART ── */}
      {showAddPartModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="text-base font-serif font-bold text-stone-900">
                Add Garment Part
              </h3>
              <button
                type="button"
                onClick={() => setShowAddPartModal(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Part Name
                </label>
                <input
                  autoFocus
                  value={newPartName}
                  onChange={(e) => setNewPartName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddCustomPart();
                  }}
                  placeholder="e.g. Salwar, Waistcoat, Dupatta, Cape..."
                  className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-xs font-medium text-stone-900 focus:outline-none focus:border-[#400604]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Select Icon
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "shirt", label: "Shirt", icon: "👔" },
                    { id: "trouser", label: "Trouser", icon: "👖" },
                    { id: "panjabi", label: "Panjabi", icon: "✨" },
                    { id: "salwar", label: "Salwar", icon: "🥻" },
                    { id: "dupatta", label: "Dupatta", icon: "🧣" },
                    { id: "waistcoat", label: "Waistcoat", icon: "🧥" },
                    { id: "custom", label: "Custom", icon: "⚙️" },
                  ].map((ic) => (
                    <button
                      key={ic.id}
                      type="button"
                      onClick={() => setNewPartIcon(ic.id)}
                      className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                        newPartIcon === ic.id
                          ? "bg-[#400604] border-[#400604] text-white"
                          : "border-stone-200 hover:bg-stone-50 text-stone-700"
                      }`}
                    >
                      <div className="text-xl">{ic.icon}</div>
                      <div className="text-[10px] font-semibold mt-0.5">{ic.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setShowAddPartModal(false)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomPart}
                disabled={!newPartName.trim()}
                className="px-5 py-2 rounded-xl bg-[#400604] text-white text-xs font-bold disabled:opacity-40"
              >
                Create Part
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: MANAGE SIZES ── */}
      {showManageSizesModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <h3 className="text-base font-serif font-bold text-stone-900">
                  Manage Size Columns
                </h3>
                <p className="text-[11px] text-stone-500">
                  Configure which sizes appear as columns in the measurement tables
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowManageSizesModal(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Currently Active Sizes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                Active Size Columns ({chart.sizes.length})
              </label>
              <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-stone-50 border border-stone-200 min-h-[46px]">
                {chart.sizes.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#400604] text-white text-xs font-bold shadow-2xs"
                  >
                    <span>{s}</span>
                    <button
                      type="button"
                      onClick={() => removeSize(s)}
                      className="text-white/70 hover:text-white transition"
                      title={`Remove ${s}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Presets of Common Sizes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                Add Standard Sizes
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SIZES.filter((s) => !chart.sizes.includes(s)).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addSize(s)}
                    className="px-2.5 py-1 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-xs font-semibold text-stone-700 transition cursor-pointer"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Size Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
                Add Custom Size
              </label>
              <div className="flex gap-2">
                <input
                  value={customSizeInput}
                  onChange={(e) => setCustomSizeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addSize(customSizeInput);
                      setCustomSizeInput("");
                    }
                  }}
                  placeholder="e.g. 50, Free Size, 2-3Y..."
                  className="flex-1 rounded-xl border border-stone-300 px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-[#400604]"
                />
                <button
                  type="button"
                  onClick={() => {
                    addSize(customSizeInput);
                    setCustomSizeInput("");
                  }}
                  disabled={!customSizeInput.trim()}
                  className="px-4 py-1.5 rounded-xl bg-stone-800 text-white text-xs font-bold disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setShowManageSizesModal(false)}
                className="px-5 py-2 rounded-xl bg-[#400604] text-white text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── REUSABLE LIVE PREVIEW CARD COMPONENT ── */
export function LivePreviewCard({
  chart,
  unit = "in",
  onUnitChange,
  onSelectSize,
  selectedSize,
}: {
  chart: MultiSectionSizeChart;
  unit?: MeasurementUnit;
  onUnitChange?: (unit: MeasurementUnit) => void;
  onSelectSize?: (size: string) => void;
  selectedSize?: string;
}) {
  const preset = GARMENT_PRESETS[chart.preset || "suit"] || GARMENT_PRESETS.suit;

  return (
    <div className="space-y-4 text-white">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-[#E1B76F]/25 pb-3">
        <div>
          <h4 className="text-base sm:text-lg font-serif font-black tracking-wide text-white">
            Garment Size Guide
          </h4>
          <p className="text-[11px] font-bold tracking-wider text-[#E1B76F] uppercase mt-0.5">
            {preset.label}
          </p>
        </div>

        {onUnitChange ? (
          <div className="inline-flex rounded-lg border border-[#E1B76F]/30 bg-[#340402] p-0.5">
            <button
              type="button"
              onClick={() => onUnitChange("in")}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                unit === "in" ? "bg-[#E1B76F] text-[#400604] font-black" : "text-white/70"
              }`}
            >
              Inches
            </button>
            <button
              type="button"
              onClick={() => onUnitChange("cm")}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                unit === "cm" ? "bg-[#E1B76F] text-[#400604] font-black" : "text-white/70"
              }`}
            >
              CM
            </button>
          </div>
        ) : (
          <span className="inline-block px-2.5 py-1 rounded-full border border-[#E1B76F]/40 bg-[#340402] text-[#E1B76F] text-[10px] font-bold tracking-widest uppercase">
            Unit: {unit === "in" ? "Inches" : "CM"}
          </span>
        )}
      </div>

      {/* Main Content Layout (Silhouette Left + Measurement Table Right) */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch">
        {/* Silhouette Column */}
        <div className="sm:w-28 shrink-0 flex flex-col items-center justify-center p-3 rounded-xl bg-[#340402] border border-[#E1B76F]/20 text-center">
          <svg
            viewBox="0 0 160 320"
            className="w-20 sm:w-22 h-auto max-h-[190px] text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Kameez / Kurti Dress Silhouette */}
            <path
              d="M 50 15 C 60 25, 100 25, 110 15 L 128 22 L 142 55 L 126 62 L 122 42 L 122 105 C 114 125, 126 185, 134 210 L 26 210 C 34 185, 46 125, 38 105 L 38 42 L 34 62 L 18 55 L 32 22 Z"
              fill="currentColor"
              fillOpacity="0.88"
            />
            <line x1="38" y1="108" x2="122" y2="108" stroke="#400604" strokeWidth="2" strokeDasharray="3,2" />
            <line x1="26" y1="209" x2="134" y2="209" stroke="#400604" strokeWidth="2.5" />
            {/* Trouser Pants Silhouette */}
            <path
              d="M 46 216 L 114 216 L 112 300 L 92 300 L 80 238 L 68 300 L 48 300 Z"
              fill="currentColor"
              fillOpacity="0.8"
            />
          </svg>

          <div className="mt-2 text-center pt-2 border-t border-[#E1B76F]/20 w-full">
            <span className="block font-serif tracking-[0.2em] text-[9px] font-black uppercase text-[#E1B76F]">
              ANGKON
            </span>
            <span className="block text-[8px] tracking-wider uppercase text-white/70">
              ROYAL HERITAGE
            </span>
          </div>
        </div>

        {/* Measurement Table */}
        <div className="flex-1 overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse min-w-[260px]">
            <thead>
              <tr className="border-b border-[#E1B76F]/25 text-white/90">
                <th className="py-2.5 px-2.5 font-bold text-[11px] uppercase tracking-wider sticky left-0 bg-[#280302] z-10">
                  Measurement
                </th>
                {chart.sizes.map((s) => {
                  const isSelected = selectedSize?.toUpperCase().trim() === s.toUpperCase().trim();
                  return (
                    <th key={s} className="py-2 px-2 text-center">
                      <div className="font-black text-sm uppercase tracking-wide text-white">
                        {s}
                      </div>
                      {onSelectSize ? (
                        <button
                          type="button"
                          onClick={() => onSelectSize(s)}
                          className={`mt-1 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                            isSelected
                              ? "bg-[#E1B76F] text-[#400604] font-black"
                              : "bg-white/10 text-white/90 hover:bg-[#E1B76F] hover:text-[#400604]"
                          }`}
                        >
                          {isSelected ? "✓ Selected" : "Choose size ▾"}
                        </button>
                      ) : (
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold text-white/60 bg-white/5 border border-white/10">
                          Choose size ▾
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1B76F]/10 text-white/90 font-medium">
              {chart.sections
                .filter((sec) => sec.enabled !== false)
                .map((sec) => {
                  const icon = PRESET_ICONS[sec.icon || ""] || PRESET_ICONS[sec.id] || "👔";
                  return (
                    <Fragment key={`section-group-${sec.id}`}>
                      {/* Section Title Header Row */}
                      <tr className="bg-[#400604] border-t border-b border-[#E1B76F]/30">
                        <td
                          colSpan={chart.sizes.length + 1}
                          className="py-1.5 px-2.5 font-black text-[10px] tracking-widest uppercase text-[#E1B76F]"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{icon}</span>
                            <span>{sec.title}</span>
                          </div>
                        </td>
                      </tr>

                      {/* Section Field Rows */}
                      {sec.rows
                        .filter((r) => r.visible !== false)
                        .map((row, rIdx) => (
                          <tr
                            key={row.id}
                            className={`hover:bg-[#400604]/50 transition ${
                              rIdx % 2 === 0 ? "bg-[#2f0403]" : "bg-[#240201]"
                            }`}
                          >
                            <td className="py-2 px-2.5 font-bold text-[11px] text-white/95 sticky left-0 bg-inherit z-10 border-r border-[#E1B76F]/15 whitespace-nowrap">
                              {row.area}
                            </td>

                            {chart.sizes.map((s) => {
                              const rawVal = row.values?.[s] || "-";
                              return (
                                <td
                                  key={s}
                                  className="py-2 px-2 text-center text-xs font-semibold border-r border-[#E1B76F]/10 last:border-r-0"
                                >
                                  {formatMeasurement(rawVal, unit)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                    </Fragment>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footnote Notice */}
      <div className="flex items-center gap-1.5 pt-2 text-[10px] text-white/80 leading-snug">
        <Info className="h-3.5 w-3.5 text-[#E1B76F] shrink-0" />
        <span>
          Measurements are in {unit === "in" ? "inches" : "centimeters"}. Allow 0.5 – 1 inch variation due to manual measurement.
        </span>
      </div>

      {/* Signature Bottom Line */}
      <div className="text-center pt-2 border-t border-[#E1B76F]/20">
        <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-[#E1B76F]/70">
          ANGKON • ROYAL HERITAGE
        </span>
      </div>
    </div>
  );
}
