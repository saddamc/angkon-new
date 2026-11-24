import { MetaEventStatus } from "@/models/MetaEventLog";

export const MAX_RETRY_ATTEMPTS = 5;

export interface MetaCapiUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  district?: string;
  postalCode?: string;
  country?: string;
  clientIp?: string;
  clientUserAgent?: string;
  fbp?: string;
  fbc?: string;
}

export interface MetaCapiCustomData {
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  content_ids?: (string | number)[];
  content_type?: string;
  contents?: Array<{ id: string | number; quantity: number; item_price?: number }>;
  order_id?: string | number;
  num_items?: number;
  status?: string;
  [key: string]: unknown;
}

export interface MetaCapiEventPayload {
  eventName: "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase" | string;
  eventId: string; // Critical for browser/server deduplication
  eventTime?: number; // Unix seconds
  eventSourceUrl?: string;
  actionSource?: "website" | "app" | "physical_store" | "system_generated";
  userData?: MetaCapiUserData;
  customData?: MetaCapiCustomData;
  testEventCode?: string;
  tenantId?: string;
}

export interface MetaCapiResponse {
  success: boolean;
  status: MetaEventStatus;
  eventsReceived?: number;
  fbtraceId?: string;
  error?: string;
  code?: number;
  logId?: string;
}
