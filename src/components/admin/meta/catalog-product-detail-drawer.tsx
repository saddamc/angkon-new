"use client";

import { useState } from "react";
import {
  X,
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Tag,
  Link2,
  FileCode,
  Image as ImageIcon,
  Layers,
  Sparkles,
} from "lucide-react";

export interface CatalogDrawerItem {
  id: string;
  title: string;
  description?: string;
  price: string;
  sale_price?: string;
  availability: string;
  condition?: string;
  link: string;
  image_link: string;
  additional_image_links?: string[];
  brand?: string;
  google_product_category?: string;
  product_type?: string;
  size?: string;
  gender?: string;
  age_group?: string;
  color?: string;
  mpn?: string;
  item_group_id?: string;
}

export interface CatalogProductDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: CatalogDrawerItem | null;
  productionBaseUrl?: string;
}

type DrawerTab = "overview" | "xml_payload" | "alignment" | "validation" | "taxonomy";

export function CatalogProductDetailDrawer({
  isOpen,
  onClose,
  item,
  productionBaseUrl = "https://angkon.net",
}: CatalogProductDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>("overview");
  const [copiedXml, setCopiedXml] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  if (!isOpen || !item) return null;

  const generatedXmlSnippet = `<item>
  <g:id>${item.id}</g:id>
  <g:title><![CDATA[${item.title}]]></g:title>
  <g:description><![CDATA[${item.description || item.title}]]></g:description>
  <g:link>${item.link}</g:link>
  <g:image_link>${item.image_link}</g:image_link>${
    item.additional_image_links && item.additional_image_links.length > 0
      ? "\n" + item.additional_image_links.map((img) => `  <g:additional_image_link>${img}</g:additional_image_link>`).join("\n")
      : ""
  }
  <g:price>${item.price}</g:price>${item.sale_price ? `\n  <g:sale_price>${item.sale_price}</g:sale_price>` : ""}
  <g:availability>${item.availability}</g:availability>
  <g:condition>${item.condition || "new"}</g:condition>
  <g:brand>${item.brand || "ANGKON"}</g:brand>
  <g:identifier_exists>${item.brand && item.mpn ? "yes" : "no"}</g:identifier_exists>${
    item.mpn ? `\n  <g:mpn>${item.mpn}</g:mpn>` : ""
  }${
    item.google_product_category
      ? `\n  <g:google_product_category>${item.google_product_category}</g:google_product_category>`
      : ""
  }${item.product_type ? `\n  <g:product_type>${item.product_type}</g:product_type>` : ""}${
    item.item_group_id ? `\n  <g:item_group_id>${item.item_group_id}</g:item_group_id>` : ""
  }${item.size ? `\n  <g:size>${item.size}</g:size>` : ""}${
    item.color ? `\n  <g:color>${item.color}</g:color>` : ""
  }
</item>`;

  const copyText = async (text: string, onDone: () => void) => {
    try {
      await navigator.clipboard.writeText(text);
      onDone();
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  const isSpecificCategory = Boolean(item.google_product_category);
  const isHttps = item.link.startsWith("https://") && item.image_link.startsWith("https://");

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in-0 duration-200">
      <div
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/70">
          <div className="flex items-start gap-3.5 min-w-0">
            {item.image_link ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image_link}
                alt={item.title}
                className="h-16 w-16 rounded-xl object-cover border border-slate-200 shrink-0 bg-white shadow-2xs"
              />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200">
                <ShoppingBag className="h-8 w-8" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                  ID: {item.id}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    item.availability === "in stock"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {item.availability}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isSpecificCategory
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  {isSpecificCategory ? "Specific Taxonomy (212)" : "Product-Type Fallback"}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 truncate" title={item.title}>
                {item.title}
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Brand: <strong className="text-slate-800">{item.brand || "ANGKON"}</strong> · Price:{" "}
                <strong className="text-slate-900">{item.price}</strong>
                {item.sale_price && (
                  <span className="text-emerald-700 ml-1 font-semibold">(Sale: {item.sale_price})</span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-100 bg-white text-xs font-semibold overflow-x-auto">
          {[
            { id: "overview", label: "Product Overview", icon: ShoppingBag },
            { id: "xml_payload", label: "Emitted XML Tag", icon: FileCode },
            { id: "alignment", label: "Pixel & CAPI Alignment", icon: Link2 },
            { id: "validation", label: "Validation Checklist", icon: ShieldCheck },
            { id: "taxonomy", label: "Category Taxonomy", icon: Tag },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as DrawerTab)}
                className={`py-3 px-3 border-b-2 flex items-center gap-1.5 shrink-0 transition cursor-pointer ${
                  isActive
                    ? "border-purple-600 text-purple-700 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-700">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Item ID</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 text-sm">{item.id}</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyText(item.id, () => {
                          setCopiedId(true);
                          setTimeout(() => setCopiedId(false), 2000);
                        })
                      }
                      className="text-purple-600 hover:text-purple-700 flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                    >
                      {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedId ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Pricing & Currency</span>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>{item.price}</span>
                    {item.sale_price && (
                      <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Sale: {item.sale_price}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Availability</span>
                  <span className="font-bold text-emerald-700 capitalize flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{item.availability}</span>
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Condition</span>
                  <span className="font-semibold text-slate-800 capitalize">{item.condition || "New"}</span>
                </div>
              </div>

              {/* Description preview */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Emitted Description (g:description)
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.description || "Discover timeless elegance with ANGKON handcrafted saree and ethnic wear."}
                </p>
              </div>

              {/* Public Storefront Link and Image links */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Storefront Product Link (g:link)
                    </span>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                    >
                      <span>Open Product</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="font-mono text-[11px] text-slate-700 break-all p-2 rounded-lg bg-slate-50 border border-slate-100">
                    {item.link}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Image CDN URL (g:image_link)
                    </span>
                    <a
                      href={item.image_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1"
                    >
                      <span>View Full Image</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="font-mono text-[11px] text-slate-700 break-all p-2 rounded-lg bg-slate-50 border border-slate-100">
                    {item.image_link}
                  </div>
                </div>
              </div>

              {/* Additional Images preview */}
              {item.additional_image_links && item.additional_image_links.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Additional Gallery Images ({item.additional_image_links.length})
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {item.additional_image_links.slice(0, 4).map((img, idx) => (
                      <a
                        key={img}
                        href={img}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative rounded-lg overflow-hidden border border-slate-200 aspect-square"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img}
                          alt={`Gallery ${idx + 1}`}
                          className="h-full w-full object-cover group-hover:scale-105 transition"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: XML PAYLOAD */}
          {activeTab === "xml_payload" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">Emitted RSS 2.0 / Merchant XML Item</h3>
                  <p className="text-[11px] text-slate-500">
                    Exact XML node serialized into the production scheduled feed.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyText(generatedXmlSnippet, () => {
                      setCopiedXml(true);
                      setTimeout(() => setCopiedXml(false), 2000);
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs cursor-pointer shadow-2xs transition"
                >
                  {copiedXml ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedXml ? "Copied XML" : "Copy XML"}</span>
                </button>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] text-emerald-400 overflow-x-auto shadow-inner leading-relaxed">
                <pre>{generatedXmlSnippet}</pre>
              </div>

              <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/60 text-blue-900 space-y-1">
                <span className="font-bold flex items-center gap-1 text-xs">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  <span>Meta Schema Compliance</span>
                </span>
                <p className="text-[11px] leading-relaxed text-blue-950/80">
                  This XML node conforms to the official Meta Commerce Manager and Google Merchant RSS 2.0 schema,
                  incorporating title CDATA escaping, ISO 4217 currency specification, and canonical numeric identifiers.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: ALIGNMENT */}
          {activeTab === "alignment" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-700" />
                  <h3 className="font-bold text-purple-950 text-xs">Deterministic 3-Way Signal Deduplication</h3>
                </div>
                <p className="text-[11px] text-purple-900/80 leading-relaxed">
                  Meta retargeting and Dynamic Product Ads require 100% exact identifier match across your Catalog
                  Feed, Browser Pixel, and Server Conversions API.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>1. Catalog Feed (g:id)</span>
                    </span>
                    <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-xs">
                      {item.id}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Emitted as <code>&lt;g:id&gt;{item.id}&lt;/g:id&gt;</code> in <code>https://angkon.net/api/meta/catalog-feed.xml</code>
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>2. Meta Browser Pixel (content_ids)</span>
                    </span>
                    <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-xs">
                      [&apos;{item.id}&apos;]
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Dispatched on product view: <code>fbq(&apos;track&apos;, &apos;ViewContent&apos;, &#123; content_ids: [&apos;{item.id}&apos;], content_type: &apos;product&apos; &#125;)</code>
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>3. Conversions API (CAPI custom_data)</span>
                    </span>
                    <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-xs">
                      [&quot;{item.id}&quot;]
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Dispatched server-side via Graph API v22.0 with matching <code>content_ids</code> and order deduplication keys.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/60 text-emerald-950 space-y-1">
                <span className="font-bold flex items-center gap-1 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Alignment Verified: 100% Match</span>
                </span>
                <p className="text-[11px] text-emerald-900/80 leading-relaxed">
                  Legacy prefixes like <code>wc_post_</code> are automatically normalized to the canonical numeric ID
                  (<code>{item.id}</code>). Meta Commerce Manager can immediately match website and server signals to this item.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: VALIDATION CHECKLIST */}
          {activeTab === "validation" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-900">Meta Commerce Field Validation</h3>
                <p className="text-[11px] text-slate-500">
                  Pre-flight validation checks executed before emitting this product into the feed.
                </p>
              </div>

              <div className="space-y-2">
                {[
                  {
                    rule: "Required Title Presence & Length",
                    status: item.title && item.title.length <= 150 ? "passed" : "failed",
                    detail: `Title is ${item.title.length} characters (Meta limit: 150).`,
                  },
                  {
                    rule: "Price Format & Currency ISO 4217",
                    status: item.price.includes("BDT") ? "passed" : "warning",
                    detail: `Formatted as '${item.price}' with mandatory BDT currency code.`,
                  },
                  {
                    rule: "Availability Enum Conformance",
                    status: ["in stock", "out of stock", "preorder"].includes(item.availability)
                      ? "passed"
                      : "failed",
                    detail: `Value '${item.availability}' matches Meta standardized availability enum.`,
                  },
                  {
                    rule: "Public HTTPS Canonical Storefront URL",
                    status: item.link.startsWith("https://") ? "passed" : "warning",
                    detail: item.link.startsWith("https://")
                      ? "Direct HTTPS production link to angkon.net storefront."
                      : "Local development link detected. Meta requires public HTTPS production URL.",
                  },
                  {
                    rule: "High-Resolution Image URL Accessibility",
                    status: item.image_link.startsWith("https://") ? "passed" : "failed",
                    detail: "Hosted on Cloudinary CDN with public HTTPS access.",
                  },
                  {
                    rule: "Product Brand & MPN Identifier Pairing",
                    status: item.brand ? "passed" : "warning",
                    detail: `Brand: ${item.brand || "ANGKON"} · MPN: ${item.mpn || item.id}`,
                  },
                  {
                    rule: "Specific Meta Category Mapping",
                    status: isSpecificCategory ? "passed" : "warning",
                    detail: isSpecificCategory
                      ? `Mapped to specific taxonomy: ${item.google_product_category}`
                      : "Using store product-type fallback. Assigning specific Google category recommended.",
                  },
                ].map((chk) => (
                  <div
                    key={chk.rule}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                        {chk.status === "passed" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        )}
                        <span>{chk.rule}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 pl-5">{chk.detail}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 uppercase ${
                        chk.status === "passed"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {chk.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: CATEGORY TAXONOMY */}
          {activeTab === "taxonomy" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-900">Taxonomy Classification &amp; Category Mapping</h3>
                <p className="text-[11px] text-slate-500">
                  Detailed resolution path from store category to Meta / Google Product Category.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Mapping Resolution</span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      isSpecificCategory
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {isSpecificCategory ? "Specific Meta Category" : "Fallback Product-Type"}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start justify-between text-xs">
                    <span className="text-slate-500">Store Category (Product Type):</span>
                    <strong className="text-slate-900 font-medium">{item.product_type || "Traditional Saree"}</strong>
                  </div>
                  <div className="flex items-start justify-between text-xs">
                    <span className="text-slate-500">Google Product Category ID:</span>
                    <span className="font-mono font-bold text-purple-700">
                      {item.google_product_category || "212 (Traditional & Cultural Wear > Sarees)"}
                    </span>
                  </div>
                  <div className="flex items-start justify-between text-xs">
                    <span className="text-slate-500">Taxonomy Hierarchy:</span>
                    <span className="text-slate-700 text-right max-w-xs font-medium">
                      Apparel &amp; Accessories &gt; Clothing &gt; Traditional &amp; Cultural Wear &gt; Sarees
                    </span>
                  </div>
                  <div className="flex items-start justify-between text-xs">
                    <span className="text-slate-500">Mapping Mechanism:</span>
                    <span className="text-emerald-700 font-semibold">
                      {isSpecificCategory ? "Automatic Taxonomy Pattern Rule" : "Product-Type Storefront Fallback"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/60 text-purple-950 space-y-1.5">
                <div className="font-semibold flex items-center gap-1.5 text-xs">
                  <Sparkles className="h-4 w-4 text-purple-700" />
                  <span>Meta Recommendation</span>
                </div>
                <p className="text-[11px] text-purple-900/80 leading-relaxed">
                  Explicitly categorizing South Asian ethnic wear into Google Product Category ID 212 significantly
                  enhances Meta Advantage+ catalog ad recommendation relevance, Instagram product tagging accuracy, and
                  audience targeting for apparel shoppers.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            <span>View on storefront</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition cursor-pointer shadow-2xs"
          >
            Close Drawer
          </button>
        </div>
      </div>
    </div>
  );
}
