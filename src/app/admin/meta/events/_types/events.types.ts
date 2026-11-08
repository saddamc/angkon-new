import type { ComponentType } from "react";
import type { PerformanceDataPoint } from "@/components/admin/meta/performance-chart";
import type { PixelEventRecord, PublicAdminPixelSettings } from "@/server/pixel-settings";
import type { PublicAdminMetaMarketingSettings } from "@/server/meta-marketing-settings";

export type EventsTabType =
  | "telemetry"
  | "integrations"
  | "test-events"
  | "diagnostics"
  | "history"
  | "settings"
  | "overview"
  | "events-manager"
  | "conversions-api"
  | "event-logs";

export interface MetaEventRow {
  id: string;
  funnelStep: string;
  funnelName: string;
  name: string;
  displayName: string;
  icon: ComponentType<{ className?: string }>;
  status: string;
  usedBy: string;
  integration: string;
  hasMultiple: boolean;
  emq: string;
  emqQuality: string;
  emqScore: number | null;
  total: number;
  metaReported: number | null;
  metaNote: string;
  lastReceived: string;
  description: string;
  browserPct: number;
  serverPct: number;
  parametersList: string[];
}

export interface DeliveryStats {
  queued: number;
  processing: number;
  accepted: number;
  retrying: number;
  failed: number;
  deliverySuccessRate: number | null;
}

export interface DeduplicationStats {
  pairedCount: number;
  browserOnlyCount: number;
  serverOnlyCount: number;
  dedupRate: number | null;
  totalUniqueEvents: number;
}

export interface ChannelStats {
  browserCount: number;
  serverCount: number;
  testCount: number;
  browserRatio: number | null;
  serverRatio: number | null;
}

export interface RecentTestDispatch {
  eventName: string;
  eventId: string;
  fbtraceId?: string;
  status: string;
  timestamp: string;
  source: string;
}
