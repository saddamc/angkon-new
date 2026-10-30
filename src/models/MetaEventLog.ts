import mongoose, { Schema, Document, Model } from "mongoose";

export type MetaEventSource = "browser" | "server" | "test_simulator";
export type MetaEventStatus =
  | "queued"
  | "processing"
  | "sent"
  | "accepted"
  | "retrying"
  | "failed"
  | "silenced";

export interface IMetaEventLog extends Document {
  tenantId: string;
  eventName: "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase" | string;
  eventId: string;
  source: MetaEventSource;
  status: MetaEventStatus;
  eventTime: number; // Unix seconds
  url?: string;
  parameters?: Record<string, unknown>;
  testEventCode?: string;

  // Delivery & Worker Claim metadata
  attemptCount: number;
  nextAttemptAt?: Date;
  claimToken?: string | null;
  claimedAt?: Date | null;

  // Meta API Response telemetry
  responseStatus?: number;
  eventsReceived?: number;
  fbtraceId?: string;
  errorCode?: number;
  error?: string;

  // Deduplication & Matching Telemetry
  isDeduplicated?: boolean;
  orderId?: string;

  createdAt: Date;
  updatedAt: Date;
}

const MetaEventLogSchema = new Schema<IMetaEventLog>(
  {
    tenantId: {
      type: String,
      required: true,
      default: "angkon-main",
      index: true,
      trim: true,
    },
    eventName: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    eventId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    source: {
      type: String,
      required: true,
      enum: ["browser", "server", "test_simulator"],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["queued", "processing", "sent", "accepted", "retrying", "failed"],
      default: "queued",
      index: true,
    },
    eventTime: {
      type: Number,
      required: true,
      default: () => Math.floor(Date.now() / 1000),
      index: true,
    },
    url: {
      type: String,
      default: "/",
    },
    parameters: {
      type: Schema.Types.Mixed,
      default: {},
    },
    testEventCode: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },

    // Worker claim & retry handling
    attemptCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    nextAttemptAt: {
      type: Date,
      index: true,
    },
    claimToken: {
      type: String,
      default: null,
      index: true,
    },
    claimedAt: {
      type: Date,
      default: null,
      index: true,
    },

    // Meta API response fields
    responseStatus: {
      type: Number,
    },
    eventsReceived: {
      type: Number,
    },
    fbtraceId: {
      type: String,
      trim: true,
    },
    errorCode: {
      type: Number,
    },
    error: {
      type: String,
      trim: true,
    },

    isDeduplicated: {
      type: Boolean,
      default: false,
    },
    orderId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ── Compound Indexes ──

// 1. Uniqueness per tenant, logical event ID, and source channel.
// Ensures browser and server records for the SAME logical event never collide,
// while preventing duplicate records on retry or duplicate emissions.
MetaEventLogSchema.index(
  { tenantId: 1, eventId: 1, source: 1 },
  { unique: true }
);

// 2. Querying event logs by tenant and creation time for admin activity stream
MetaEventLogSchema.index({ tenantId: 1, createdAt: -1 });

// 3. Worker queue polling index: finding retryable or queued server events ready for delivery
MetaEventLogSchema.index({
  tenantId: 1,
  source: 1,
  status: 1,
  nextAttemptAt: 1,
});

// 4. Stale lease recovery index
MetaEventLogSchema.index({
  status: 1,
  claimedAt: 1,
});

// 5. Configurable retention TTL index: Automatically removes telemetry records after 90 days.
// (Store financial orders in Order.ts are never affected by this TTL).
const RETENTION_SECONDS = Number(process.env.META_EVENT_LOG_TTL_SECONDS) || 90 * 24 * 60 * 60; // 90 days
MetaEventLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });

export const MetaEventLog: Model<IMetaEventLog> =
  mongoose.models.MetaEventLog ||
  mongoose.model<IMetaEventLog>("MetaEventLog", MetaEventLogSchema);
