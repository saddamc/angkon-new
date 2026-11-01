import mongoose, { Schema, Document, Model } from "mongoose";
import {
  encryptToken,
  decryptToken,
  maskToken,
  type EncryptedPayload,
} from "@/lib/security/token-encryption";

export type MetaCatalogConnectionStatus =
  | "DISCONNECTED"
  | "CONNECTED"
  | "PERMISSION_ERROR"
  | "INVALID_CREDENTIALS"
  | "ERROR";

export type MetaFeedRegistrationStatus =
  | "UNREGISTERED"
  | "ACTIVE"
  | "PAUSED"
  | "FAILED";

export type MetaImportStatus =
  | "SUCCESS"
  | "PARTIAL"
  | "FAILED"
  | "RUNNING"
  | "NOT_STARTED";

export interface IMetaFeedSchedule {
  interval: "HOURLY" | "DAILY" | "WEEKLY";
  hour: number;
  minute: number;
}

export interface IMetaImportStats {
  productsProcessed: number;
  productsAccepted: number;
  productsRejected: number;
  errorCount: number;
}

export interface IMetaCatalogConfig extends Document {
  tenantId: string;
  businessId: string;
  catalogId: string;
  productFeedId: string;
  graphApiVersion: string;
  feedName: string;
  feedUrl: string;
  feedSchedule: IMetaFeedSchedule;
  encryptedAccessToken: string;
  tokenIv: string;
  tokenTag: string;
  hasToken: boolean;
  connectionStatus: MetaCatalogConnectionStatus;
  feedRegistrationStatus: MetaFeedRegistrationStatus;
  catalogName?: string;
  catalogProductCount?: number;
  lastConnectionCheckAt?: Date | null;
  lastConnectionError?: string | null;
  lastSuccessfulImportAt?: Date | null;
  lastImportStatus: MetaImportStatus;
  lastImportError?: string | null;
  lastImportStats: IMetaImportStats;
  createdAt: Date;
  updatedAt: Date;

  setAccessToken(token: string): void;
  getDecryptedToken(): string;
  toSafeJSON(): Record<string, unknown>;
}

const MetaFeedScheduleSchema = new Schema<IMetaFeedSchedule>(
  {
    interval: {
      type: String,
      enum: ["HOURLY", "DAILY", "WEEKLY"],
      default: "DAILY",
    },
    hour: { type: Number, default: 4, min: 0, max: 23 },
    minute: { type: Number, default: 0, min: 0, max: 59 },
  },
  { _id: false }
);

const MetaImportStatsSchema = new Schema<IMetaImportStats>(
  {
    productsProcessed: { type: Number, default: 0 },
    productsAccepted: { type: Number, default: 0 },
    productsRejected: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const MetaCatalogConfigSchema = new Schema<IMetaCatalogConfig>(
  {
    tenantId: { type: String, required: true, default: "default", index: true },
    businessId: { type: String, default: "" },
    catalogId: { type: String, default: "" },
    productFeedId: { type: String, default: "" },
    graphApiVersion: { type: String, default: "v22.0" },
    feedName: { type: String, default: "ANGKON Production Catalog Feed" },
    feedUrl: { type: String, default: "" },
    feedSchedule: { type: MetaFeedScheduleSchema, default: () => ({}) },
    encryptedAccessToken: { type: String, default: "" },
    tokenIv: { type: String, default: "" },
    tokenTag: { type: String, default: "" },
    hasToken: { type: Boolean, default: false },
    connectionStatus: {
      type: String,
      enum: ["DISCONNECTED", "CONNECTED", "PERMISSION_ERROR", "INVALID_CREDENTIALS", "ERROR"],
      default: "DISCONNECTED",
    },
    feedRegistrationStatus: {
      type: String,
      enum: ["UNREGISTERED", "ACTIVE", "PAUSED", "FAILED"],
      default: "UNREGISTERED",
    },
    catalogName: { type: String, default: "" },
    catalogProductCount: { type: Number, default: 0 },
    lastConnectionCheckAt: { type: Date, default: null },
    lastConnectionError: { type: String, default: null },
    lastSuccessfulImportAt: { type: Date, default: null },
    lastImportStatus: {
      type: String,
      enum: ["SUCCESS", "PARTIAL", "FAILED", "RUNNING", "NOT_STARTED"],
      default: "NOT_STARTED",
    },
    lastImportError: { type: String, default: null },
    lastImportStats: { type: MetaImportStatsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

MetaCatalogConfigSchema.methods.setAccessToken = function (token: string): void {
  if (!token || !token.trim()) {
    this.encryptedAccessToken = "";
    this.tokenIv = "";
    this.tokenTag = "";
    this.hasToken = false;
    return;
  }
  const payload: EncryptedPayload = encryptToken(token.trim());
  this.encryptedAccessToken = payload.ciphertext;
  this.tokenIv = payload.iv;
  this.tokenTag = payload.tag;
  this.hasToken = true;
};

MetaCatalogConfigSchema.methods.getDecryptedToken = function (): string {
  if (!this.encryptedAccessToken || !this.tokenIv || !this.tokenTag) {
    return "";
  }
  try {
    return decryptToken({
      ciphertext: this.encryptedAccessToken,
      iv: this.tokenIv,
      tag: this.tokenTag,
    });
  } catch {
    return "";
  }
};

MetaCatalogConfigSchema.methods.toSafeJSON = function (): Record<string, unknown> {
  const decrypted = this.getDecryptedToken();
  return {
    tenantId: this.tenantId,
    businessId: this.businessId,
    catalogId: this.catalogId,
    productFeedId: this.productFeedId,
    graphApiVersion: this.graphApiVersion,
    feedName: this.feedName,
    feedUrl: this.feedUrl,
    feedSchedule: this.feedSchedule,
    hasToken: this.hasToken,
    maskedToken: maskToken(decrypted),
    connectionStatus: this.connectionStatus,
    feedRegistrationStatus: this.feedRegistrationStatus,
    catalogName: this.catalogName,
    catalogProductCount: this.catalogProductCount,
    lastConnectionCheckAt: this.lastConnectionCheckAt,
    lastConnectionError: this.lastConnectionError,
    lastSuccessfulImportAt: this.lastSuccessfulImportAt,
    lastImportStatus: this.lastImportStatus,
    lastImportError: this.lastImportError,
    lastImportStats: this.lastImportStats,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const MetaCatalogConfig: Model<IMetaCatalogConfig> =
  mongoose.models.MetaCatalogConfig ||
  mongoose.model<IMetaCatalogConfig>("MetaCatalogConfig", MetaCatalogConfigSchema);

export default MetaCatalogConfig;
