"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Plus, Pencil, Trash2, RefreshCw, ChevronRight, X, Loader2,
  FolderOpen, Tag, ImageIcon, Check, AlertCircle, UploadCloud,
  Search, Filter, GripVertical, CheckCircle2, XCircle, SearchX, ChevronDown
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────────── */
interface WCCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  count: number;
  menu_order: number;
  meta_data?: { id?: number; key: string; value: any }[];
  image?: { id?: number; src: string; alt?: string } | null;
}

interface CategoryTree extends WCCategory {
  children: WCCategory[];
}

function buildTree(flat: WCCategory[]): CategoryTree[] {
  const byId = new Map<number, CategoryTree>();
  flat.forEach((c) => byId.set(c.id, { ...c, children: [] }));
  const roots: CategoryTree[] = [];
  byId.forEach((node) => {
    if (node.parent && byId.has(node.parent)) {
      byId.get(node.parent)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRecursive = (nodes: CategoryTree[]) => {
    nodes.sort((a, b) => a.menu_order - b.menu_order);
    nodes.forEach((n) => sortRecursive(n.children as CategoryTree[]));
  };
  sortRecursive(roots);
  return roots;
}

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}

function getStatus(cat: WCCategory) {
  const meta = cat.meta_data?.find(m => m.key === "_is_active");
  if (meta) return meta.value === "true";
  return true; // default active
}

/* ─── Modal ──────────────────────────────────────────────────────────── */
interface FormData {
  type: "main" | "sub";
  name: string;
  slug: string;
  description: string;
  parent: number;
  imageUrl: string;
  imageAlt: string;
  imageId: number | null;
  isActive: boolean;
  sortOrder: number;
}

const EMPTY_FORM: FormData = { type: "main", name: "", slug: "", description: "", parent: 0, imageUrl: "", imageAlt: "", imageId: null, isActive: true, sortOrder: 0 };

/* ─── Parent Category Picker (searchable combobox) ─────────────────────── */
function ParentCategoryPicker({ value, options, onChange }: { value: number; options: WCCategory[]; onChange: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selected = options.find((p) => p.id === value) || null;
  const filtered = options.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.slug.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 text-left bg-white hover:border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none transition"
      >
        {selected ? (
          <>
            {selected.image?.src ? (
              <img src={selected.image.src} alt="" className="h-7 w-7 rounded-lg object-cover border border-gray-200 shrink-0" />
            ) : (
              <div className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0"><FolderOpen className="h-3.5 w-3.5 text-gray-400" /></div>
            )}
            <span className="flex-1 min-w-0 truncate text-[14px] font-semibold text-gray-900">{selected.name}</span>
            <span className="text-[11px] text-gray-400 shrink-0">{selected.count} items</span>
          </>
        ) : (
          <span className="flex-1 text-[14px] text-gray-400">— Select Main Category —</span>
        )}
        <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search main categories..."
                className="w-full pl-8 pr-3 py-2 text-[13px] rounded-lg border border-gray-200 outline-none focus:border-blue-400"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-[13px] text-gray-400">No matching categories</div>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { onChange(p.id); setOpen(false); setQuery(""); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-blue-50 transition ${p.id === value ? "bg-blue-50/70" : ""}`}
                >
                  {p.image?.src ? (
                    <img src={p.image.src} alt="" className="h-7 w-7 rounded-lg object-cover border border-gray-200 shrink-0" />
                  ) : (
                    <div className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0"><FolderOpen className="h-3.5 w-3.5 text-gray-400" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900 truncate">{p.name}</p>
                    <p className="text-[11px] text-gray-400 font-mono truncate">/{p.slug}</p>
                  </div>
                  <span className="text-[11px] text-gray-400 shrink-0">{p.count} items</span>
                  {p.id === value && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryModal({ mode, initial, parents, hasChildren, onSave, onClose }: any) {
  const { authFetch } = useAuth();
  const [form, setForm] = useState<FormData>({ ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof FormData, val: any) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleNameChange = (name: string) => setForm((prev) => ({ ...prev, name, slug: slugify(name) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (form.type === "sub" && !form.parent) { setError("Please select a parent category"); return; }
    setSaving(true);
    setError("");
    try { await onSave({ ...form, id: initial.id }); }
    catch (err: any) { setError(err.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return setError("Image exceeds max size (5MB).");
    if (!file.type.startsWith("image/")) return setError("Please select a valid image file.");
    setUploading(true); setError("");
    try {
      const fd = new FormData(); fd.append("image", file);
      const res = await authFetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Upload failed"); }
      const data = await res.json();
      set("imageUrl", data.url);
      set("imageId", data.id ?? null);
      set("imageAlt", data.alt ?? "");
    } catch (err: any) { setError(err.message || "Upload failed"); }
    finally { setUploading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-[18px] font-black text-gray-900">{mode === "add" ? "Add Category" : "Edit Category"}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition"><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-[13px] font-medium text-red-600 mb-6"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-5">
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Category Type</label>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button type="button" onClick={() => { set("type", "main"); set("parent", 0); }} className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition ${form.type === "main" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>Main Category</button>
                  <button
                    type="button"
                    disabled={mode === "edit" && form.type === "main" && hasChildren}
                    onClick={() => set("type", "sub")}
                    title={mode === "edit" && form.type === "main" && hasChildren ? "This category has subcategories — move or delete them first" : undefined}
                    className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition ${form.type === "sub" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"} disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    Sub Category
                  </button>
                </div>
                {mode === "edit" && form.type === "main" && hasChildren && (
                  <p className="text-[12px] text-gray-400 mt-1.5">Has subcategories — can't be converted until they're moved or removed.</p>
                )}
              </div>
              {form.type === "sub" && (
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Parent Category <span className="text-red-500">*</span></label>
                  <ParentCategoryPicker
                    value={form.parent}
                    options={parents.filter((p: any) => p.id !== initial.id)}
                    onChange={(id) => set("parent", id)}
                  />
                </div>
              )}
              {form.name && (
                <div className="flex items-center gap-1.5 text-[12px] text-gray-500 font-medium -mt-2">
                  <span>Will appear as:</span>
                  {form.type === "sub" && form.parent ? (
                    <span className="flex items-center gap-1 text-gray-700 font-bold">
                      {parents.find((p: any) => p.id === form.parent)?.name ?? "…"} <ChevronRight className="h-3 w-3 text-gray-400" /> {form.name}
                    </span>
                  ) : (
                    <span className="text-gray-700 font-bold">{form.name}</span>
                  )}
                </div>
              )}
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Men's T-Shirts" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50" required />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Slug</label>
                <input type="text" value={form.slug} onChange={(e) => set("slug", e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] font-mono text-gray-600 bg-gray-50 outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-[14px] text-gray-700 outline-none focus:border-blue-400" />
              </div>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Category Image</label>
                <div 
                  className={`relative border-2 border-dashed rounded-xl p-6 transition-all ${dragActive ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50 hover:bg-gray-100"}`}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                  onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files && e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0]); }}
                >
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { if (e.target.files && e.target.files[0]) handleUpload(e.target.files[0]); e.target.value = ''; }} />
                  <div className="flex flex-col items-center justify-center text-center">
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2 text-blue-600"><Loader2 className="h-8 w-8 animate-spin" /><span className="text-[13px] font-medium">Uploading...</span></div>
                    ) : form.imageUrl ? (
                      <div className="relative group">
                        <img src={form.imageUrl} alt="Category" className="h-32 w-32 object-cover rounded-xl border border-gray-200 shadow-sm" />
                        <div onClick={() => { set("imageUrl", ""); set("imageId", null); }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full cursor-pointer hover:bg-red-600 shadow-md transition-opacity"><X className="h-4 w-4" /></div>
                      </div>
                    ) : (
                      <>
                        <div className="bg-white p-3 rounded-full shadow-sm mb-3"><UploadCloud className="h-6 w-6 text-blue-500" /></div>
                        <p className="text-[14px] font-medium text-gray-700">Drag & drop image here</p>
                        <p className="text-[13px] text-gray-500 my-1">or <button type="button" onClick={() => fileInputRef.current?.click()} className="text-blue-600 font-bold hover:underline">browse files</button></p>
                        <p className="text-[11px] text-gray-400 mt-2">Recommended: 1000×1000px (1:1) · Max: 5MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Status</label>
                  <select value={form.isActive ? "true" : "false"} onChange={(e) => set("isActive", e.target.value === "true")} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] text-gray-700 outline-none bg-white focus:border-blue-400">
                    <option value="true">Active (Visible)</option>
                    <option value="false">Inactive (Hidden)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Sort Order</label>
                  <input type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] text-gray-900 outline-none focus:border-blue-400" />
                </div>
              </div>
            </div>
          </div>
        </form>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-[14px] font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 text-[14px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {mode === "add" ? "Create Category" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Details Drawer ─────────────────────────────────────────────────── */
function DetailsDrawer({ cat, subcats, onClose, onEdit }: { cat: WCCategory, subcats: WCCategory[], onClose: () => void, onEdit: (c: WCCategory) => void }) {
  const active = getStatus(cat);
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-[18px] font-black text-gray-900">Category Details</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition"><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col items-center text-center mb-8">
            {cat.image?.src ? (
              <img src={cat.image.src} alt={cat.name} className="h-28 w-28 object-cover rounded-2xl border border-gray-200 shadow-sm mb-4" />
            ) : (
              <div className="h-28 w-28 bg-gray-100 rounded-2xl flex items-center justify-center mb-4"><FolderOpen className="h-10 w-10 text-gray-400" /></div>
            )}
            <h3 className="text-[22px] font-black text-gray-900">{cat.name}</h3>
            <p className="text-[13px] text-gray-500 font-mono mt-1">/{cat.slug}</p>
            <div className="flex items-center gap-2 mt-3">
              <span className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{active ? 'Active' : 'Inactive'}</span>
              <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 rounded-lg">{cat.parent === 0 ? "Main Category" : "Sub Category"}</span>
            </div>
          </div>
          <div className="space-y-4 mb-8">
            <div className="flex justify-between py-3 border-b border-gray-50"><span className="text-[13px] font-bold text-gray-500">Products</span><span className="text-[14px] font-semibold text-gray-900">{cat.count} items</span></div>
            <div className="flex justify-between py-3 border-b border-gray-50"><span className="text-[13px] font-bold text-gray-500">Sort Order</span><span className="text-[14px] font-semibold text-gray-900">{cat.menu_order}</span></div>
            {cat.description && <div className="py-3 border-b border-gray-50"><span className="block text-[13px] font-bold text-gray-500 mb-1">Description</span><p className="text-[14px] text-gray-800 leading-relaxed">{cat.description}</p></div>}
          </div>
          {cat.parent === 0 && (
            <div>
              <h4 className="text-[15px] font-black text-gray-900 mb-4">Subcategories ({subcats.length})</h4>
              {subcats.length > 0 ? (
                <div className="space-y-2">
                  {subcats.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                      <div className="flex items-center gap-3">
                        {sub.image?.src ? <img src={sub.image.src} className="h-8 w-8 rounded object-cover" /> : <div className="h-8 w-8 bg-gray-200 rounded flex items-center justify-center"><FolderOpen className="h-3 w-3 text-gray-400" /></div>}
                        <div><p className="text-[13px] font-bold text-gray-900">{sub.name}</p><p className="text-[11px] text-gray-500">{sub.count} products</p></div>
                      </div>
                      <button onClick={() => { onClose(); onEdit(sub); }} className="text-blue-600 hover:text-blue-800 text-[12px] font-bold px-2">Edit</button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-gray-500">No subcategories yet.</p>
              )}
            </div>
          )}
        </div>
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <button onClick={() => { onClose(); onEdit(cat); }} className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-xl text-[14px] font-bold hover:bg-gray-800 transition"><Pencil className="h-4 w-4" /> Edit Category</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */
export default function AdminCategoriesPage() {
  const { authFetch } = useAuth();
  const [flat, setFlat] = useState<WCCategory[]>([]);
  const [tree, setTree] = useState<CategoryTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [modal, setModal] = useState<{ mode: "add" | "edit"; initial: FormData & { id?: number } } | null>(null);
  const [details, setDetails] = useState<WCCategory | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  
  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all"|"main"|"sub">("all");
  const [filterStatus, setFilterStatus] = useState<"all"|"active"|"inactive">("all");

  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());

  const toggleCollapse = (id: number) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/admin/categories");
      if (res.status === 401) {
        window.location.href = "/admin";
        return;
      }
      const data: WCCategory[] = await res.json();
      if (Array.isArray(data)) { setFlat(data); setTree(buildTree(data)); }
    } finally { setLoading(false); }
  }, [authFetch]);

  useEffect(() => { void load(); }, [load]);

  const handleSave = async (data: FormData & { id?: number }) => {
    const payload = {
      name: data.name.trim(),
      slug: data.slug.trim() || slugify(data.name),
      description: data.description,
      parent: data.type === "main" ? 0 : data.parent,
      menu_order: data.sortOrder,
      meta_data: [{ key: "_is_active", value: String(data.isActive) }],
      image: data.imageUrl
        ? (data.imageId ? { id: data.imageId, alt: data.imageAlt } : { src: data.imageUrl, alt: data.imageAlt })
        : null,
    };

    if (data.id) {
      const res = await authFetch(`/api/admin/categories/${data.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed to update category");
      showToast("Category updated!");
    } else {
      const res = await authFetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed to create category");
      showToast("Category created!");
    }
    setModal(null); await load();
  };

  const handleDelete = async (e: React.MouseEvent, cat: WCCategory) => {
    e.stopPropagation();
    const hasSubs = flat.some(c => c.parent === cat.id);
    if (hasSubs) return alert(`Cannot delete: "${cat.name}" has subcategories. Please move or delete them first.`);
    if (cat.count > 0) {
      const confirmDelete = confirm(`"${cat.name}" contains ${cat.count} products.\nAre you sure you want to delete this category? The products will not be deleted, but will lose this category tag.`);
      if (!confirmDelete) return;
    } else {
      if (!confirm(`Delete "${cat.name}"?`)) return;
    }
    setDeleting(cat.id);
    const res = await authFetch(`/api/admin/categories?id=${cat.id}`, { method: "DELETE" });
    if (res.ok) { showToast(`"${cat.name}" deleted`); await load(); } 
    else { showToast("Failed to delete category", false); }
    setDeleting(null);
  };

  // Filter Logic
  const filteredTree = useMemo(() => {
    let result = tree;
    if (filterType === "main") result = result.filter(c => c.parent === 0);
    if (filterType === "sub") {
      const allSubs = flat.filter(c => c.parent !== 0);
      return allSubs.map(s => ({ ...s, children: [] })) as CategoryTree[]; // Flatten for sub view
    }
    
    // Deep filter for search & status
    const deepFilter = (nodes: CategoryTree[]): CategoryTree[] => {
      return nodes.reduce((acc, node) => {
        const matchesSearch = search === "" || node.name.toLowerCase().includes(search.toLowerCase()) || node.slug.toLowerCase().includes(search.toLowerCase());
        const nodeActive = getStatus(node);
        const matchesStatus = filterStatus === "all" || (filterStatus === "active" ? nodeActive : !nodeActive);
        
        const filteredChildren = deepFilter(node.children as CategoryTree[]);
        
        if ((matchesSearch && matchesStatus) || filteredChildren.length > 0) {
          acc.push({ ...node, children: filteredChildren });
        }
        return acc;
      }, [] as CategoryTree[]);
    };

    return deepFilter(result);
  }, [tree, flat, search, filterType, filterStatus]);

  /* Drag & Drop Reorder Handlers */
  const [draggedItem, setDraggedItem] = useState<{ id: number; parent: number; index: number } | null>(null);
  const handleDragStart = (e: React.DragEvent, id: number, parent: number, index: number) => {
    setDraggedItem({ id, parent, index });
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = async (e: React.DragEvent, targetParent: number, targetIndex: number) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.parent !== targetParent || draggedItem.index === targetIndex) { setDraggedItem(null); return; }
    
    // Optimistic UI update
    const listToUpdate = flat.filter(c => c.parent === targetParent).sort((a,b) => a.menu_order - b.menu_order);
    const item = listToUpdate.splice(draggedItem.index, 1)[0];
    listToUpdate.splice(targetIndex, 0, item);
    
    setDraggedItem(null);
    showToast("Reordering...", true);
    
    // Update menu_order in backend sequentially
    try {
      for (let i = 0; i < listToUpdate.length; i++) {
        if (listToUpdate[i].menu_order !== i) {
          await authFetch(`/api/admin/categories/${listToUpdate[i].id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ menu_order: i })
          });
        }
      }
      showToast("Order saved!");
      load();
    } catch {
      showToast("Failed to save order", false);
    }
  };

  const openAdd = () => setModal({ mode: "add", initial: EMPTY_FORM });
  const openEdit = (cat: WCCategory) => setModal({
    mode: "edit",
    initial: {
      id: cat.id,
      type: cat.parent === 0 ? "main" : "sub",
      name: cat.name, slug: cat.slug, description: cat.description,
      parent: cat.parent, sortOrder: cat.menu_order,
      isActive: getStatus(cat),
      imageUrl: cat.image?.src ?? "", imageAlt: cat.image?.alt ?? "", imageId: cat.image?.id ?? null
    },
  });

  const renderRow = (cat: CategoryTree, depth = 0, index: number) => {
    const active = getStatus(cat);
    const hasChildren = cat.children.length > 0;
    const isCollapsed = collapsedIds.has(cat.id);
    
    return (
      <div key={cat.id}>
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, cat.id, cat.parent, index)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, cat.parent, index)}
          onClick={() => {
            if (hasChildren) {
              toggleCollapse(cat.id);
            } else {
              setDetails(cat);
            }
          }}
          className={`flex items-center gap-4 px-6 py-4 border-b border-gray-100 hover:bg-blue-50/40 transition cursor-pointer group ${depth > 0 ? "bg-gray-50/30" : "bg-white"}`}
        >
          {/* Drag Handle & Indentation */}
          <div className="flex items-center" style={{ paddingLeft: `${depth * 32}px` }}>
            <div className="w-6 cursor-grab opacity-0 group-hover:opacity-40 hover:!opacity-100 transition"><GripVertical className="h-4 w-4" /></div>
            {depth > 0 && <span className="block w-4 h-4 border-l-2 border-b-2 border-gray-200 rounded-bl ml-2 mb-1 mr-3 shrink-0" />}
          </div>

          {/* Image */}
          {cat.image?.src ? (
            <img src={cat.image.src} alt={cat.name} className="h-10 w-10 rounded-xl object-cover border border-gray-200 shrink-0 shadow-sm bg-white" />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 shrink-0"><FolderOpen className="h-4 w-4" /></div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-bold text-gray-900 truncate ${depth === 0 ? "text-[15px]" : "text-[14px]"}`}>{cat.name}</span>
              {depth === 0 && hasChildren && (
                <span className="flex items-center gap-1 text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                  {cat.children.length} sub
                  <ChevronDown className={`h-3 w-3 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                </span>
              )}
            </div>
            <div className="text-[12px] text-gray-400 font-mono truncate mt-0.5">/{cat.slug}</div>
          </div>

          {/* Stats & Status */}
          <div className="w-24 shrink-0 text-center">
            <span className="text-[12px] font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">{cat.count} items</span>
          </div>
          <div className="w-24 shrink-0 flex justify-center">
            {active ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-gray-300" />}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-1 shrink-0 ml-4">
            <button onClick={(e) => { e.stopPropagation(); setDetails(cat); }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition" title="View Details">
              <FolderOpen className="h-4 w-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); openEdit(cat); }} className="p-2 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition" title="Edit">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={(e) => handleDelete(e, cat)} disabled={deleting === cat.id} className="p-2 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition disabled:opacity-50" title="Delete">
              {deleting === cat.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
        
        {/* Render Children */}
        {(!hasChildren || !isCollapsed) && cat.children.map((child, i) => renderRow(child as CategoryTree, depth + 1, i))}
      </div>
    );
  };

  const activeCount = flat.filter(c => getStatus(c)).length;
  const mainCount = flat.filter(c => c.parent === 0).length;
  const subCount = flat.length - mainCount;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen bg-gray-50/30">
      {toast && <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-xl text-[14px] font-bold text-white transition-all ${toast.ok ? "bg-emerald-600" : "bg-red-500"}`}>{toast.ok ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}{toast.msg}</div>}

      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-[28px] font-black text-gray-900 tracking-tight">Categories</h1>
          <p className="text-[14px] text-gray-500 mt-1 max-w-lg">Manage your fashion store categories, hierarchy, visibility, and images.</p>
        </div>
        <button onClick={openAdd} className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-[14px] font-bold text-white transition shadow-sm hover:shadow-md shrink-0">
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"><p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total</p><p className="text-[24px] font-black text-gray-900">{flat.length}</p></div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"><p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1">Main</p><p className="text-[24px] font-black text-gray-900">{mainCount}</p></div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"><p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1">Subs</p><p className="text-[24px] font-black text-gray-900">{subCount}</p></div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"><p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1">Active</p><p className="text-[24px] font-black text-emerald-600">{activeCount}</p></div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search categories..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition" />
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
            <Filter className="h-4 w-4 text-gray-400" />
            <select value={filterType} onChange={(e: any) => setFilterType(e.target.value)} className="bg-transparent text-[13px] font-bold text-gray-700 outline-none">
              <option value="all">All Types</option><option value="main">Main Only</option><option value="sub">Subs Only</option>
            </select>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
            <select value={filterStatus} onChange={(e: any) => setFilterStatus(e.target.value)} className="bg-transparent text-[13px] font-bold text-gray-700 outline-none">
              <option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option>
            </select>
          </div>
          <button onClick={load} className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition shrink-0"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-20">
        <div className="flex items-center px-6 py-4 bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold uppercase tracking-widest text-gray-400">
          <div className="w-14 shrink-0" />
          <div className="w-10 shrink-0" />
          <div className="flex-1 min-w-0 px-4">Category</div>
          <div className="w-24 shrink-0 text-center">Products</div>
          <div className="w-24 shrink-0 text-center">Status</div>
          <div className="w-28 shrink-0 text-right pr-4">Actions</div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-blue-500" />
            <p className="text-[14px] font-medium text-gray-600">Loading categories...</p>
          </div>
        ) : filteredTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mb-5"><SearchX className="h-8 w-8 text-gray-400" /></div>
            <p className="text-[16px] font-bold text-gray-900 mb-1">No categories found</p>
            <p className="text-[14px] text-gray-500 max-w-sm mb-6">We couldn't find any categories matching your current filters or search query.</p>
            {search || filterType !== "all" || filterStatus !== "all" ? (
              <button onClick={() => { setSearch(""); setFilterType("all"); setFilterStatus("all"); }} className="text-blue-600 font-bold text-[14px] hover:underline">Clear filters</button>
            ) : (
              <button onClick={openAdd} className="text-blue-600 font-bold text-[14px] hover:underline">Create your first category</button>
            )}
          </div>
        ) : (
          <div className="flex flex-col">{filteredTree.map((cat, i) => renderRow(cat, 0, i))}</div>
        )}
      </div>

      {modal && (
        <CategoryModal
          mode={modal.mode}
          initial={modal.initial}
          parents={flat.filter((c) => c.parent === 0)}
          hasChildren={modal.initial.id ? flat.some((c) => c.parent === modal.initial.id) : false}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {details && <DetailsDrawer cat={details} subcats={flat.filter(c => c.parent === details.id)} onClose={() => setDetails(null)} onEdit={(c) => { setDetails(null); openEdit(c); }} />}
    </div>
  );
}
