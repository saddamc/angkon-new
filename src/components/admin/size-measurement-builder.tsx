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
import {
  PRESET_ICONS,
  COMMON_SIZES,
  LivePreviewCard,
  AddPartModal,
  ManageSizesModal,
} from "./size-builder";

export { LivePreviewCard } from "./size-builder";

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
    <div className="flex flex-col xl:flex-row gap-6 text-gray-800">
      {/* ── LEFT: SIZE & MEASUREMENT BUILDER ── */}
      <div className="flex-1 bg-white rounded-2xl border border-purple-100/60 shadow-sm p-5 sm:p-7 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-stone-200/80">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/60 text-purple-700 text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Eye className="h-4 w-4 text-purple-600" />
              View Live Preview
            </button>
          </div>
        </div>

        {/* Top Control Bar: Category Preset, Size Columns & Units */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-center p-4 rounded-2xl bg-stone-50/80 border border-purple-100/60">
          {/* Preset Selector */}
          <div className="lg:col-span-4 space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600">
              Product Category
            </label>
            <div className="relative">
              <select
                value={chart.preset || "suit"}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full appearance-none rounded-xl border border-stone-300 bg-white py-2.5 pl-10 pr-9 text-xs sm:text-[13px] font-bold text-stone-800 shadow-xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-200 transition cursor-pointer"
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
          <div className="lg:col-span-5 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600">
                Size Columns ({chart.sizes.length})
              </label>
              <button
                type="button"
                onClick={() => setShowManageSizesModal(true)}
                className="text-[11px] font-bold text-purple-600 hover:text-purple-700 hover:underline cursor-pointer inline-flex items-center gap-1 transition"
              >
                <Plus className="h-3 w-3" />
                Manage All
              </button>
            </div>
            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-white border border-stone-200/90 shadow-2xs min-h-[44px]">
              <div className="flex items-center gap-1.5 flex-wrap flex-1">
                {chart.sizes.map((s) => (
                  <span
                    key={s}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 text-[11px] font-black uppercase border border-stone-200 shadow-2xs"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowManageSizesModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold shadow-sm shadow-purple-200 transition cursor-pointer shrink-0"
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
            <div className="grid grid-cols-2 rounded-xl bg-stone-200/70 p-1 border border-stone-300 shadow-inner h-[44px] items-center gap-1">
              <button
                type="button"
                onClick={() => toggleUnit("in")}
                className={`h-full text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                  chart.unit !== "cm"
                    ? "bg-purple-600 text-white shadow-xs font-black"
                    : "text-stone-600 hover:text-stone-900 font-semibold"
                }`}
              >
                Inches
              </button>
              <button
                type="button"
                onClick={() => toggleUnit("cm")}
                className={`h-full text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                  chart.unit === "cm"
                    ? "bg-purple-600 text-white shadow-xs font-black"
                    : "text-stone-600 hover:text-stone-900 font-semibold"
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
                    ? "bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-200 ring-2 ring-purple-100"
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
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border border-dashed border-stone-300 text-stone-600 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50 transition cursor-pointer whitespace-nowrap"
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
                    ? "border-purple-200 shadow-sm bg-white ring-2 ring-purple-100"
                    : "border-stone-200 bg-stone-50/50 opacity-80"
                }`}
              >
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-purple-50/40 border-b border-purple-100/60 rounded-t-2xl">
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
                          className="px-2.5 py-1 text-xs font-bold uppercase rounded-lg border border-purple-500 bg-white text-stone-900 focus:outline-none focus:ring-1 focus:ring-purple-200"
                        />
                        <button
                          type="button"
                          onClick={handleSaveRenameSection}
                          className="h-7 px-2.5 rounded-lg bg-purple-600 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-gray-900">
                          {sec.title} MEASUREMENTS
                        </h3>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingSectionTitle({ sectionId: sec.id, title: sec.title })
                          }
                          className="h-6 w-6 rounded flex items-center justify-center text-stone-400 hover:text-purple-600 hover:bg-purple-50 transition cursor-pointer"
                          title="Rename section"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] font-bold text-stone-500 bg-white px-2.5 py-1 rounded-lg border border-purple-100/60 shadow-2xs">
                      {sec.rows.length} {sec.rows.length === 1 ? "field" : "fields"}
                    </span>

                    {chart.sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSection(sec.id, sec.title)}
                        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition text-xs font-semibold cursor-pointer border border-transparent hover:border-rose-100"
                        title={`Delete ${sec.title} part`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Delete Part</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Section Measurement Table */}
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left text-xs border-collapse min-w-[550px]">
                    <thead>
                      <tr className="border-b border-purple-100/60 bg-purple-50/30 text-purple-800 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-2.5 px-3 w-10 text-center">::</th>
                        <th className="py-2.5 px-2.5 w-10 text-center">#</th>
                        <th className="py-2.5 px-4 min-w-[140px]">Measurement Field</th>
                        {chart.sizes.map((s) => (
                          <th key={s} className="py-2.5 px-2.5 text-center min-w-[70px]">
                            {s}
                          </th>
                        ))}
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
                            className="hover:bg-purple-50/20 transition group"
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
                                    className="px-2 py-1 text-xs font-bold rounded border border-purple-500 bg-white text-stone-900 w-full focus:outline-none focus:ring-1 focus:ring-purple-200"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleSaveRenameField}
                                    className="px-2 py-1 bg-purple-600 text-white rounded text-[10px] font-bold cursor-pointer"
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
                                  className="cursor-pointer hover:text-purple-600"
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
                                    className="w-full min-w-[4rem] text-center rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs font-semibold text-stone-800 placeholder:text-stone-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                                  />
                                </td>
                              );
                            })}

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
                                  className="h-6 w-6 rounded flex items-center justify-center text-stone-400 hover:text-purple-600 hover:bg-purple-50 transition cursor-pointer"
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
                <div className="p-3.5 bg-stone-50/70 border-t border-purple-100/60 rounded-b-2xl">
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
                      className="flex-1 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddField(sec.id)}
                      disabled={!(newFieldInputs[sec.id] || "").trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
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
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-purple-200 bg-white hover:bg-purple-50 text-purple-700 text-xs font-bold transition shadow-xs cursor-pointer"
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
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold tracking-wide shadow-md shadow-purple-200 hover:shadow-lg transition cursor-pointer"
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
            <Eye className="h-4 w-4 text-purple-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">
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
      <AddPartModal
        isOpen={showAddPartModal}
        partName={newPartName}
        onPartNameChange={setNewPartName}
        partIcon={newPartIcon}
        onPartIconChange={setNewPartIcon}
        onClose={() => setShowAddPartModal(false)}
        onAdd={handleAddCustomPart}
      />

      {/* ── MODAL: MANAGE SIZES ── */}
      <ManageSizesModal
        isOpen={showManageSizesModal}
        activeSizes={chart.sizes}
        onAddSize={addSize}
        onRemoveSize={removeSize}
        onClose={() => setShowManageSizesModal(false)}
      />
    </div>
  );
}
