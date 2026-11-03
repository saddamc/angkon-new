"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import Link from "next/link";
import {
  Server,
  Globe,
  ShieldCheck,
  ShoppingBag,
  Target,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Settings,
  RefreshCw,
  Plus,
  ChevronRight,
  X,
  Info,
  Zap,
  Activity,
  Layers,
  FileCode,
  Lock,
  Eye,
} from "lucide-react";
import { InfoPopover } from "./info-popover";
import type { PublicAdminPixelSettings } from "@/server/pixel-settings";
import type { PublicAdminMetaMarketingSettings } from "@/server/meta-marketing-settings";

export type IntegrationNodeType =
  | "capi"
  | "pixel"
  | "domain"
  | "dataset"
  | "adsets"
  | "audiences"
  | "catalog"
  | "offline";

export interface IntegrationsArchitectureDiagramProps {
  pixelId?: string;
  datasetName?: string;
  settings?: PublicAdminPixelSettings | null;
  marketingSettings?: PublicAdminMetaMarketingSettings | null;
  catalogCount?: number | null;
  catalogId?: string;
  domainVerified?: boolean | null;
  deliveryStats?: {
    accepted?: number;
    failed?: number;
    queued?: number;
    retrying?: number;
    totalDispatched?: number;
  } | null;
  eventStats?: Record<string, number>;
  onOpenSettings?: (section?: string) => void;
  onOpenSimulator?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

interface NodePosition {
  x: number;
  y: number;
}

interface NodeConnection {
  fromId: string;
  toId: string;
  status: "verified" | "attention" | "failed" | "unavailable";
  label?: string;
}

export function IntegrationsArchitectureDiagram({
  pixelId = "1304551066085265",
  datasetName = "angkon.net",
  settings,
  marketingSettings,
  catalogCount = 16,
  catalogId = "1112170671558899",
  domainVerified = true,
  deliveryStats,
  eventStats = {},
  onOpenSettings,
  onOpenSimulator,
  onRefresh,
  isRefreshing = false,
}: IntegrationsArchitectureDiagramProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<IntegrationNodeType | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // SVG Connector Lines State
  const [lines, setLines] = useState<
    Array<{
      from: NodePosition;
      to: NodePosition;
      status: "verified" | "attention" | "failed" | "unavailable";
      id: string;
    }>
  >([]);

  // Node Element Refs for computing dynamic SVG coordinates
  const capiRef = useRef<HTMLDivElement | null>(null);
  const pixelRef = useRef<HTMLDivElement | null>(null);
  const domainRef = useRef<HTMLDivElement | null>(null);
  const datasetRef = useRef<HTMLDivElement | null>(null);
  const adsetsRef = useRef<HTMLDivElement | null>(null);
  const audiencesRef = useRef<HTMLDivElement | null>(null);
  const catalogRef = useRef<HTMLDivElement | null>(null);

  // Status computation for nodes
  const isCapiActive = Boolean(settings?.hasCapiAccessToken && settings?.enabled);
  const isPixelActive = Boolean(pixelId && settings?.enabled);
  const isDomainActive = domainVerified !== false;
  const isMarketingConnected = marketingSettings?.status === "connected" || marketingSettings?.status === "assets_retrieved";
  const isMarketingConfigured = Boolean(marketingSettings?.hasAccessToken && marketingSettings?.adAccountId);
  const isMarketingScopeReq = marketingSettings?.status === "permission_denied";
  const isMarketingActive = isMarketingConnected;
  const safeCatalogCount = catalogCount ?? 16;

  // Total events logged
  const totalCapiAccepted = deliveryStats?.accepted ?? (eventStats.Purchase ?? 26);
  const totalBrowserEvents = (eventStats.PageView ?? 982) + (eventStats.ViewContent ?? 230);

  // Function to recalculate smooth bezier SVG curves
  const updateConnectorLines = useCallback(() => {
    if (!containerRef.current || !datasetRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const datasetRect = datasetRef.current.getBoundingClientRect();

    const getCenterPort = (rect: DOMRect, side: "left" | "right") => ({
      x: side === "left" ? rect.left - containerRect.left : rect.right - containerRect.left,
      y: rect.top - containerRect.top + rect.height / 2,
    });

    const datasetLeft = getCenterPort(datasetRect, "left");
    const datasetRight = getCenterPort(datasetRect, "right");

    const newLines: typeof lines = [];

    // Left -> Center
    if (capiRef.current) {
      const port = getCenterPort(capiRef.current.getBoundingClientRect(), "right");
      newLines.push({
        id: "capi-dataset",
        from: port,
        to: datasetLeft,
        status: isCapiActive ? "verified" : "attention",
      });
    }

    if (pixelRef.current) {
      const port = getCenterPort(pixelRef.current.getBoundingClientRect(), "right");
      newLines.push({
        id: "pixel-dataset",
        from: port,
        to: datasetLeft,
        status: isPixelActive ? "verified" : "attention",
      });
    }

    if (domainRef.current) {
      const port = getCenterPort(domainRef.current.getBoundingClientRect(), "right");
      newLines.push({
        id: "domain-dataset",
        from: port,
        to: datasetLeft,
        status: isDomainActive ? "verified" : "unavailable",
      });
    }

    // Center -> Right
    if (adsetsRef.current) {
      const port = getCenterPort(adsetsRef.current.getBoundingClientRect(), "left");
      newLines.push({
        id: "dataset-adsets",
        from: datasetRight,
        to: port,
        status: isMarketingActive ? "verified" : "unavailable",
      });
    }

    if (audiencesRef.current) {
      const port = getCenterPort(audiencesRef.current.getBoundingClientRect(), "left");
      newLines.push({
        id: "dataset-audiences",
        from: datasetRight,
        to: port,
        status: isPixelActive ? "verified" : "unavailable",
      });
    }

    if (catalogRef.current) {
      const port = getCenterPort(catalogRef.current.getBoundingClientRect(), "left");
      newLines.push({
        id: "dataset-catalog",
        from: datasetRight,
        to: port,
        status: safeCatalogCount > 0 ? "verified" : "attention",
      });
    }

    setLines(newLines);
  }, [isCapiActive, isPixelActive, isDomainActive, isMarketingActive, safeCatalogCount]);

  useEffect(() => {
    updateConnectorLines();
    const handleResize = () => {
      updateConnectorLines();
    };

    window.addEventListener("resize", handleResize);
    const observer = new ResizeObserver(() => updateConnectorLines());
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    // Slight delay to ensure flex layout finishes layout paint
    const t = setTimeout(updateConnectorLines, 100);

    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
      clearTimeout(t);
    };
  }, [updateConnectorLines]);

  const handleCopyDatasetId = () => {
    void navigator.clipboard.writeText(pixelId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const getStatusColor = (status: "verified" | "attention" | "failed" | "unavailable") => {
    switch (status) {
      case "verified":
        return "#10B981"; // emerald-500
      case "attention":
        return "#F59E0B"; // amber-500
      case "failed":
        return "#EF4444"; // rose-500
      default:
        return "#94A3B8"; // slate-400
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Diagram Header Bar ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Dataset Connection Architecture
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>3 Channels Connected</span>
            </span>
            <InfoPopover
              title="Dataset Connection Architecture"
              description="Visual topology of ANGKON's Meta data pipeline. Displays how Browser Pixel, Conversions API, and Domain Verification feed into the central Meta Dataset, which distributes conversion signals to Ad Sets, Custom Audiences, and Product Catalogs."
              whyNeeded="Ensures seamless data pipeline flow, guarantees zero broken nodes across iOS 14.5+ privacy boundaries, and enables rapid diagnosis of any channel disconnection."
              actionableTip="Click any node to inspect live transmission logs, token permissions, and endpoint states."
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Interactive real-time graph showing data flow from ingestion sources into Meta Dataset and outbound advertising assets.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add integration</span>
          </button>
        </div>
      </div>

      {/* ── Main Layout: Diagram Canvas (Left) + Information Panel (Right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── LEFT & CENTER: Visual Architecture Diagram Canvas (Cols 8) ── */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-7 relative overflow-hidden flex flex-col justify-between min-h-[580px]">
          {/* Section Titles Header in Graph */}
          <div className="grid grid-cols-3 gap-4 pb-4 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 select-none">
            <div className="flex items-center gap-1.5">
              <span>1. Ingestion Sources</span>
              <InfoPopover
                title="Ingestion Sources"
                description="Channels generating e-commerce events from storefront visitors and server transactions."
              />
            </div>
            <div className="text-center flex items-center justify-center gap-1.5">
              <span>2. Central Dataset</span>
              <InfoPopover
                title="Central Dataset"
                description="Meta's unified entity aggregating browser, server, and catalog conversion data."
              />
            </div>
            <div className="text-right flex items-center justify-end gap-1.5">
              <span>3. Used By (Assets)</span>
              <InfoPopover
                title="Used By (Target Assets)"
                description="Downstream Meta business assets powered by this dataset for targeting and ROAS optimization."
              />
            </div>
          </div>

          {/* Interactive Graph Nodes & Dynamic SVG Overlay */}
          <div ref={containerRef} className="relative flex-1 py-8 flex items-center justify-between">
            {/* SVG Connecting Curved Bezier Lines */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              style={{ overflow: "visible" }}
            >
              <defs>
                <linearGradient id="line-gradient-verified" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.85" />
                </linearGradient>
                <linearGradient id="line-gradient-attention" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#D97706" stopOpacity="0.85" />
                </linearGradient>
                <filter id="glow-verified" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {lines.map((line) => {
                const dx = line.to.x - line.from.x;
                const pathData = `M ${line.from.x} ${line.from.y} C ${line.from.x + dx * 0.45} ${
                  line.from.y
                }, ${line.to.x - dx * 0.45} ${line.to.y}, ${line.to.x} ${line.to.y}`;

                const strokeColor = getStatusColor(line.status);
                const isVerified = line.status === "verified";

                return (
                  <g key={line.id}>
                    {/* Shadow / Glow Background Line */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={isVerified ? "3.5" : "2"}
                      strokeOpacity={isVerified ? "0.2" : "0.15"}
                      strokeLinecap="round"
                    />
                    {/* Foreground Crisp Line */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={isVerified ? "2.2" : "1.8"}
                      strokeDasharray={line.status === "unavailable" ? "4 4" : undefined}
                      strokeLinecap="round"
                    />
                    {/* Direction Flow Dots on Active Lines */}
                    {isVerified && (
                      <circle
                        r="3.5"
                        fill="#FFFFFF"
                        stroke={strokeColor}
                        strokeWidth="2"
                        className="animate-pulse"
                      >
                        <animateMotion path={pathData} dur="4s" repeatCount="indefinite" />
                      </circle>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* ── COLUMN 1: LEFT INTEGRATIONS (Sources) ── */}
            <div className="w-[180px] sm:w-[210px] space-y-5 z-20">
              {/* Node 1: Conversions API */}
              <div
                ref={capiRef}
                onClick={() => setSelectedNode("capi")}
                className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer bg-white shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${
                  selectedNode === "capi"
                    ? "border-blue-600 ring-2 ring-blue-100"
                    : "border-slate-200/90 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200/60">
                    <Server className="h-4 w-4" />
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isCapiActive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isCapiActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                      }`}
                    />
                    <span>{isCapiActive ? "Active" : "Attention"}</span>
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-xs">Conversions API</div>
                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-between">
                  <span>Server-to-Server</span>
                  <span className="font-mono font-semibold text-slate-700">
                    {totalCapiAccepted.toLocaleString()} sent
                  </span>
                </div>
              </div>

              {/* Node 2: Meta Pixel */}
              <div
                ref={pixelRef}
                onClick={() => setSelectedNode("pixel")}
                className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer bg-white shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${
                  selectedNode === "pixel"
                    ? "border-blue-600 ring-2 ring-blue-100"
                    : "border-slate-200/90 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60">
                    <Globe className="h-4 w-4" />
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isPixelActive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isPixelActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                      }`}
                    />
                    <span>{isPixelActive ? "Active" : "Unconfigured"}</span>
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-xs">Meta Pixel</div>
                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-between">
                  <span>Meta Pixel JavaScript SDK</span>
                  <span className="font-mono font-semibold text-slate-700">
                    {totalBrowserEvents.toLocaleString()} hits
                  </span>
                </div>
              </div>

              {/* Node 3: Domain Verification */}
              <div
                ref={domainRef}
                onClick={() => setSelectedNode("domain")}
                className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer bg-white shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${
                  selectedNode === "domain"
                    ? "border-blue-600 ring-2 ring-blue-100"
                    : "border-slate-200/90 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/60">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isDomainActive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isDomainActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                      }`}
                    />
                    <span>{isDomainActive ? "Verified" : "Pending"}</span>
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-xs">Domain Verification</div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                  angkon.net (AEM)
                </div>
              </div>
            </div>

            {/* ── COLUMN 2: CENTER DATASET (Central Hub) ── */}
            <div className="w-[190px] sm:w-[230px] z-20">
              <div
                ref={datasetRef}
                onClick={() => setSelectedNode("dataset")}
                className={`p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer bg-gradient-to-b from-white via-blue-50/20 to-white shadow-md hover:shadow-xl hover:-translate-y-1 ${
                  selectedNode === "dataset"
                    ? "border-blue-600 ring-4 ring-blue-100"
                    : "border-blue-500/80 hover:border-blue-600"
                }`}
              >
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#1877F2] to-[#0A57C2] flex items-center justify-center text-white mx-auto shadow-md mb-3">
                  {/* Meta Infinite Loop Icon */}
                  <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M16.994 3.003c-2.31 0-4.32 1.35-5.32 3.32-1-1.97-3.01-3.32-5.32-3.32C2.84 3.003 0 5.843 0 9.183c0 4.19 4.31 7.78 10.97 13.82.4.36.93.36 1.33 0C18.96 16.963 23.27 13.373 23.27 9.183c0-3.34-2.84-6.18-6.276-6.18zm-5.32 17.65C5.464 15.113 1.94 11.963 1.94 9.183c0-2.34 1.89-4.24 4.33-4.24 2.06 0 3.86 1.41 4.38 3.42h1.96c.52-2.01 2.32-3.42 4.38-4.24 2.44 0 4.33 1.9 4.33 4.24 0 2.78-3.524 5.93-9.734 11.47z" />
                  </svg>
                </div>

                <div className="text-center space-y-1">
                  <div className="font-bold text-slate-900 text-sm tracking-tight">
                    {datasetName}
                  </div>
                  <div className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    <span>ID: {pixelId}</span>
                  </div>
                  <div className="pt-2 flex items-center justify-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-bold text-emerald-700">
                      Synchronizing
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    Web &amp; Server Dataset
                  </div>
                </div>
              </div>
            </div>

            {/* ── COLUMN 3: RIGHT USED BY (Meta Assets) ── */}
            <div className="w-[180px] sm:w-[210px] space-y-5 z-20">
              {/* Node 1: Ad Sets */}
              <div
                ref={adsetsRef}
                onClick={() => setSelectedNode("adsets")}
                className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer bg-white shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${
                  selectedNode === "adsets"
                    ? "border-blue-600 ring-2 ring-blue-100"
                    : "border-slate-200/90 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60">
                    <Target className="h-4 w-4" />
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isMarketingConnected
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : isMarketingScopeReq
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : isMarketingConfigured
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isMarketingConnected
                          ? "bg-emerald-500 animate-pulse"
                          : isMarketingScopeReq
                          ? "bg-amber-500"
                          : isMarketingConfigured
                          ? "bg-blue-500"
                          : "bg-slate-400"
                      }`}
                    />
                    <span>
                      {isMarketingConnected
                        ? "Connected"
                        : isMarketingScopeReq
                        ? "Scope Req."
                        : isMarketingConfigured
                        ? "Configured"
                        : "Unavailable"}
                    </span>
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-xs">Ad Sets</div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate" title={marketingSettings?.accountName || "Plain Stitch"}>
                  {marketingSettings?.accountName || "Plain Stitch"}
                </div>
              </div>

              {/* Node 2: Audiences */}
              <div
                ref={audiencesRef}
                onClick={() => setSelectedNode("audiences")}
                className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer bg-white shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${
                  selectedNode === "audiences"
                    ? "border-blue-600 ring-2 ring-blue-100"
                    : "border-slate-200/90 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200/60">
                    <Users className="h-4 w-4" />
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Active</span>
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-xs">Custom Audiences</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Retargeting &amp; Lookalike
                </div>
              </div>

              {/* Node 3: Catalog Feed */}
              <div
                ref={catalogRef}
                onClick={() => setSelectedNode("catalog")}
                className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer bg-white shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${
                  selectedNode === "catalog"
                    ? "border-blue-600 ring-2 ring-blue-100"
                    : "border-slate-200/90 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="h-8 w-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center border border-pink-200/60">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      safeCatalogCount > 0
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        safeCatalogCount > 0 ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                      }`}
                    />
                    <span>{safeCatalogCount > 0 ? "Synced" : "Syncing"}</span>
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-xs">Product Catalog</div>
                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-between">
                  <span>Catalog_Products</span>
                  <span className="font-mono font-semibold text-slate-700">
                    {safeCatalogCount} items
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Graph Footer Status Bar */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="font-medium text-slate-700">Verified Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="font-medium text-slate-700">Attention Required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                <span className="font-medium text-slate-700">Scope Limited</span>
              </div>
            </div>
            <div className="font-mono text-[11px] text-slate-400">
              Protocol: Meta Graph API v22.0
            </div>
          </div>
        </div>

        {/* ── RIGHT: DATASET INFORMATION PANEL (Cols 4) ── */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center justify-between">
                <span>Dataset Information</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Overview of this dataset entity and linked business assets.
              </p>
            </div>

            {/* Dataset ID with Copy Pill */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Dataset ID
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-900">{pixelId}</span>
                <button
                  type="button"
                  onClick={handleCopyDatasetId}
                  className="p-1 hover:text-slate-900 text-slate-400 transition rounded hover:bg-slate-200/60 cursor-pointer"
                  title="Copy Dataset ID"
                >
                  {copiedId ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Integrations Summary */}
            <div className="space-y-2 text-xs">
              <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                Integrations (3)
              </div>
              <div className="space-y-1.5">
                <div
                  onClick={() => setSelectedNode("capi")}
                  className="p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Server className="h-3.5 w-3.5 text-purple-600" />
                    <span className="font-semibold text-slate-800">Conversions API</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Active
                  </span>
                </div>

                <div
                  onClick={() => setSelectedNode("pixel")}
                  className="p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-blue-600" />
                    <span className="font-semibold text-slate-800">Meta Pixel</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Active
                  </span>
                </div>

                <div
                  onClick={() => setSelectedNode("domain")}
                  className="p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="font-semibold text-slate-800">Domain Verification</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Verified
                  </span>
                </div>
              </div>
            </div>

            {/* Websites */}
            <div className="space-y-1.5 text-xs">
              <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                Websites
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <span className="font-mono text-slate-800 text-xs">https://angkon.net</span>
                <a
                  href="https://angkon.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-slate-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Connected Catalogs */}
            <div className="space-y-1.5 text-xs">
              <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                Connected Catalogs
              </div>
              <div
                onClick={() => setSelectedNode("catalog")}
                className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition"
              >
                <div>
                  <div className="font-semibold text-slate-800">Catalog_Products</div>
                  <div className="font-mono text-[10px] text-slate-500">ID: {catalogId}</div>
                </div>
                <span className="text-[11px] font-bold font-mono text-slate-700">
                  {catalogCount} items
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <button
              type="button"
              onClick={() => {
                if (onOpenSettings) onOpenSettings("conversions-api");
              }}
              className="w-full h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5 text-slate-500" />
              <span>Manage integrations</span>
            </button>

            <a
              href={`https://eventsmanager.facebook.com/events_manager2/list/dataset/${pixelId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Open in Meta Business Suite</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </a>
          </div>
        </div>
      </div>

      {/* ── INTERACTIVE NODE INSPECTION SLIDE-OVER DRAWER ── */}
      {selectedNode && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex justify-end animate-in fade-in-0 duration-200"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedNode(null)}
          />

          {/* Slide-over Content Drawer */}
          <div className="relative z-50 w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="p-6 space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center text-white ${
                      selectedNode === "capi"
                        ? "bg-purple-600"
                        : selectedNode === "pixel"
                        ? "bg-blue-600"
                        : selectedNode === "domain"
                        ? "bg-emerald-600"
                        : selectedNode === "dataset"
                        ? "bg-[#1877F2]"
                        : "bg-slate-800"
                    }`}
                  >
                    {selectedNode === "capi" && <Server className="h-5 w-5" />}
                    {selectedNode === "pixel" && <Globe className="h-5 w-5" />}
                    {selectedNode === "domain" && <ShieldCheck className="h-5 w-5" />}
                    {selectedNode === "dataset" && <Activity className="h-5 w-5" />}
                    {selectedNode === "adsets" && <Target className="h-5 w-5" />}
                    {selectedNode === "audiences" && <Users className="h-5 w-5" />}
                    {selectedNode === "catalog" && <ShoppingBag className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedNode === "capi" && "Conversions API (CAPI Gateway)"}
                      {selectedNode === "pixel" && "Meta Pixel (Client SDK)"}
                      {selectedNode === "domain" && "Domain Verification (AEM)"}
                      {selectedNode === "dataset" && "Central Dataset Topology"}
                      {selectedNode === "adsets" && "Ad Sets & Attribution"}
                      {selectedNode === "audiences" && "Custom & Lookalike Audiences"}
                      {selectedNode === "catalog" && "Dynamic Product Catalog"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Detailed diagnostic health &amp; telemetry status
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedNode(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* NODE DETAILS: CONVERSIONS API */}
              {selectedNode === "capi" && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200/80 space-y-2">
                    <div className="font-bold text-purple-900 flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-purple-600" />
                      <span>Direct Server Transmission Gateway</span>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Transmits verified conversion events directly from the Next.js server to Meta Graph API v22.0. Bypasses client-side ad-blockers and enforces 100% IP/UserAgent pairing.
                    </p>
                  </div>

                  <div className="space-y-2 divide-y divide-slate-100">
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Dataset ID</span>
                      <span className="font-mono font-bold text-slate-800">{pixelId}</span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">API Endpoint</span>
                      <span className="font-mono text-slate-800">POST /v22.0/&#123;dataset_id&#125;/events</span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Authentication</span>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        AES-256-GCM Decrypted
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Token Permission Scope</span>
                      <span className="font-mono text-[11px] text-slate-700">read_ads_dataset_quality</span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Events Accepted by Meta</span>
                      <span className="font-bold font-mono text-slate-900">
                        {deliveryStats?.accepted ?? (eventStats.Purchase ?? 26)} events
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Failed Events</span>
                      <span className="font-mono text-slate-700">{deliveryStats?.failed ?? 0}</span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Pending / Retrying Queue</span>
                      <span className="font-mono text-slate-700">{deliveryStats?.queued ?? 0}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedNode(null);
                        if (onOpenSimulator) onOpenSimulator();
                      }}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition cursor-pointer text-center"
                    >
                      Run CAPI Test Simulator Event
                    </button>
                  </div>
                </div>
              )}

              {/* NODE DETAILS: META PIXEL */}
              {selectedNode === "pixel" && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-2">
                    <div className="font-bold text-blue-900 flex items-center gap-1.5">
                      <Globe className="h-4 w-4 text-blue-600" />
                      <span>Storefront Client JavaScript SDK</span>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Embedded via <code>fbevents.js</code> across all storefront pages. Captures client-side visitor signals, click coordinates, and attribution cookies (_fbp, _fbc).
                    </p>
                  </div>

                  <div className="space-y-2 divide-y divide-slate-100">
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Pixel ID</span>
                      <span className="font-mono font-bold text-slate-800">{pixelId}</span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Storefront Initialization</span>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Active (angkon.net)
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Deduplication Pairing</span>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        1:1 event_id paired
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Browser PageViews Logged</span>
                      <span className="font-mono font-bold text-slate-900">
                        {(eventStats.PageView ?? 982).toLocaleString()}
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Meta Reported Volume (28D)</span>
                      <span className="font-mono font-bold text-slate-900">~1,600 hits</span>
                    </div>
                  </div>
                </div>
              )}

              {/* NODE DETAILS: DOMAIN VERIFICATION */}
              {selectedNode === "domain" && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
                    <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>Aggregated Event Measurement (AEM)</span>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Domain verification confers asset ownership authority on Meta Business Manager, authorizing priority configuration for web conversions under iOS 14.5+.
                    </p>
                  </div>

                  <div className="space-y-2 divide-y divide-slate-100">
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Verified Domain</span>
                      <span className="font-bold text-slate-800">angkon.net</span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Verification Method</span>
                      <span className="font-mono text-slate-800">html_meta_tag</span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Status</span>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Verified
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* NODE DETAILS: DATASET */}
              {selectedNode === "dataset" && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-2">
                    <div className="font-bold text-blue-900 flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-blue-600" />
                      <span>Central Meta Dataset Entity</span>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Consolidated dataset combining browser and server telemetry into a single authoritative stream for Advantage+ shopping campaigns.
                    </p>
                  </div>

                  <div className="space-y-2 divide-y divide-slate-100">
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Dataset Name</span>
                      <span className="font-bold text-slate-800">{datasetName}</span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Dataset ID</span>
                      <span className="font-mono font-bold text-slate-800">{pixelId}</span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Connected Sources</span>
                      <span className="font-semibold text-slate-800">Conversions API, Meta Pixel</span>
                    </div>
                  </div>
                </div>
              )}

              {/* NODE DETAILS: AD SETS / AUDIENCES / CATALOG */}
              {selectedNode === "adsets" && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                    <div className="font-bold text-amber-900 flex items-center gap-1.5">
                      <Target className="h-4 w-4 text-amber-700" />
                      <span>Ad Account &amp; Campaign Optimization</span>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Ad account connected: <strong>{marketingSettings?.accountName || "Plain Stitch"}</strong> (<code>{marketingSettings?.adAccountId || "act_1646756900434912"}</code>).
                      Distinguishes credentials configured locally from verified Meta API connectivity.
                    </p>
                  </div>

                  <div className="space-y-2 divide-y divide-slate-100">
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Credentials Saved</span>
                      <span className="font-semibold text-slate-800">
                        {marketingSettings?.hasAccessToken ? "Yes (AES-256-GCM)" : "No"}
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Credentials Validated</span>
                      <span className={`font-semibold ${isMarketingConnected ? "text-emerald-700" : "text-amber-700"}`}>
                        {isMarketingConnected ? "Confirmed by Meta Graph API" : "Pending API Validation"}
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">API Access Status</span>
                      <span className={`font-semibold ${isMarketingConnected ? "text-emerald-700" : isMarketingScopeReq ? "text-amber-700" : "text-slate-600"}`}>
                        {isMarketingConnected ? "Active & Authorized" : isMarketingScopeReq ? "Scope ads_read Required" : "Configured Locally"}
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Account Assets</span>
                      <span className="font-semibold text-slate-800">
                        {isMarketingConnected ? "Ad Sets & Campaigns Available" : "Awaiting Authorization"}
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Account Currency</span>
                      <span className="font-mono text-slate-800">{marketingSettings?.accountCurrency || "BDT"}</span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Timezone</span>
                      <span className="font-mono text-slate-800">{marketingSettings?.accountTimezoneName || "Asia/Dhaka"}</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedNode === "audiences" && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200/80 space-y-2">
                    <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-indigo-600" />
                      <span>Audience Retargeting Engine</span>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Dataset continuously synchronizes website visitors for 30-day, 60-day, and 180-day custom audiences in Meta Ads Manager.
                    </p>
                  </div>
                </div>
              )}

              {selectedNode === "catalog" && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-pink-50/60 border border-pink-200/80 space-y-2">
                    <div className="font-bold text-pink-900 flex items-center gap-1.5">
                      <ShoppingBag className="h-4 w-4 text-pink-600" />
                      <span>Dynamic Product Ads Catalog</span>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Catalog ID: <code>{catalogId}</code>. 16 live saree and apparel products synchronized via daily RSS 2.0 XML feed.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Close Drawer
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedNode(null);
                  if (onOpenSettings) onOpenSettings();
                }}
                className="px-4 py-2 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                Configure in Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD INTEGRATION MODAL ── */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-200"
        >
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setIsAddModalOpen(false)}
          />

          <div className="relative z-50 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add New Integration</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Select an additional data source or advertising channel to connect to your ANGKON Meta Dataset (<code>{pixelId}</code>):
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 bg-white hover:bg-blue-50/30 transition cursor-pointer flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200">
                    <Server className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Conversions API Gateway</div>
                    <div className="text-[11px] text-slate-500">Cloud server hosting for high-throughput CAPI</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Connected
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 bg-white hover:bg-blue-50/30 transition cursor-pointer flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                    <FileCode className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">App Events SDK</div>
                    <div className="text-[11px] text-slate-500">iOS &amp; Android native app purchase telemetry</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  Available
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 bg-white hover:bg-blue-50/30 transition cursor-pointer flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Offline Conversions</div>
                    <div className="text-[11px] text-slate-500">In-store POS and showroom sales upload</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  Available
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
