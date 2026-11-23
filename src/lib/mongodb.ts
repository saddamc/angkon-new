import dns from "node:dns";
import mongoose from "mongoose";
import {
  validateDatabaseConnection,
  getAppEnvironment,
} from "../server/env/app-environment";
import { isSrvResolutionError } from "./mongodb-dns";

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.DATABASE_URL;

if (!MONGODB_URI) {
  console.warn("MONGODB_URI, MONGODB_URL, or DATABASE_URL is not defined in environment variables.");
}

/**
 * Node's MongoDB driver resolves `mongodb+srv://` with c-ares, which queries
 * the configured DNS servers directly. Some ISP resolvers refuse SRV queries
 * (EREFUSED) even though the operating-system resolver succeeds by falling
 * back to a public resolver. Set MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1 when that
 * happens. Leave it unset on Vercel unless a specific resolver is required.
 */
const DNS_OVERRIDE = process.env.MONGODB_DNS_SERVERS?.trim();
const DNS_OVERRIDE_SERVERS = DNS_OVERRIDE
  ? DNS_OVERRIDE.split(/[,;]/).map((server) => server.trim()).filter(Boolean)
  : [];
const SYSTEM_DNS_SERVERS = dns.getServers();
if (DNS_OVERRIDE_SERVERS.length > 0) {
  try {
    dns.setServers(DNS_OVERRIDE_SERVERS);
    console.info(`[MongoDB] DNS override active: ${DNS_OVERRIDE_SERVERS.join(", ")}`);
  } catch (error) {
    console.warn("[MongoDB] Could not apply MONGODB_DNS_SERVERS:", error);
  }
}

export interface PoolTelemetry {
  poolCreatedCount: number;
  connectionsCreated: number;
  connectionsClosed: number;
  connectionsCheckedOut: number;
  connectionsCheckedIn: number;
  connectionCheckOutFailed: number;
  serverSelectionFailures: number;
  lastConnectedAt: string | null;
  lastFailureAt: string | null;
  lastFailureReason: string | null;
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  telemetry: PoolTelemetry;
  listenersAttached: boolean;
}

// Global cache to maintain a single active connection across hot-reloads and serverless invocations
declare global {
  var mongooseCache: MongooseCache | undefined;
}

const initialTelemetry: PoolTelemetry = {
  poolCreatedCount: 0,
  connectionsCreated: 0,
  connectionsClosed: 0,
  connectionsCheckedOut: 0,
  connectionsCheckedIn: 0,
  connectionCheckOutFailed: 0,
  serverSelectionFailures: 0,
  lastConnectedAt: null,
  lastFailureAt: null,
  lastFailureReason: null,
};

const cached: MongooseCache = global.mongooseCache || {
  conn: null,
  promise: null,
  telemetry: { ...initialTelemetry },
  listenersAttached: false,
};

if (!cached.telemetry) {
  cached.telemetry = { ...initialTelemetry };
}
if (cached.listenersAttached === undefined) {
  cached.listenersAttached = false;
}

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

let lastFailureTime = 0;
const FAILURE_COOLDOWN_MS = 1000;

/**
 * Connects with Mongoose. If the configured DNS resolver refuses the SRV
 * lookup, retry once with the operating-system resolver before failing. This
 * keeps local development usable when a public resolver is unreachable while
 * still preferring the explicitly configured resolver.
 */
async function connectMongoose(uri: string, opts: mongoose.ConnectOptions) {
  try {
    return await mongoose.connect(uri, opts);
  } catch (error) {
    if (
      !uri.startsWith("mongodb+srv://") ||
      !DNS_OVERRIDE ||
      !isSrvResolutionError(error)
    ) {
      throw error;
    }

    const fallbackServers =
      SYSTEM_DNS_SERVERS.length > 0 ? SYSTEM_DNS_SERVERS : ["1.1.1.1", "8.8.8.8"];

    console.warn(
      "[MongoDB] SRV resolution failed with configured DNS; retrying with the system resolver."
    );
    try {
      dns.setServers(fallbackServers);
    } catch {
      // If the resolver cannot be changed, surface the original error.
      throw error;
    }

    try {
      return await mongoose.connect(uri, opts);
    } finally {
      // DNS servers are process-global. Restore the configured override after
      // this one-shot fallback; otherwise one transient failure permanently
      // switches every later Mongo connection to a broken system resolver.
      if (DNS_OVERRIDE_SERVERS.length > 0) {
        try {
          dns.setServers(DNS_OVERRIDE_SERVERS);
        } catch (restoreError) {
          console.warn("[MongoDB] Could not restore MONGODB_DNS_SERVERS:", restoreError);
        }
      }
    }
  }
}

function assertDatabaseReady(m: typeof mongoose): typeof mongoose {
  if (m.connection.readyState !== 1) {
    throw new Error(
      `MONGODB_CONNECTION_NOT_READY (readyState=${m.connection.readyState})`
    );
  }
  return m;
}

// Controlled pool settings tuned for Vercel Serverless & Atlas Free (M0)
const DEFAULT_MAX_POOL_SIZE = 5;
const DEFAULT_MIN_POOL_SIZE = 0;
const DEFAULT_MAX_CONNECTING = 2;
const DEFAULT_MAX_IDLE_TIME_MS = 30000;
const DEFAULT_WAIT_QUEUE_TIMEOUT_MS = 5000;
const DEFAULT_SERVER_SELECTION_TIMEOUT_MS = 10000;
const DEFAULT_CONNECT_TIMEOUT_MS = 10000;

function attachTelemetryListeners(m: typeof mongoose) {
  if (cached.listenersAttached) return;
  try {
    const client = m.connection.getClient() as unknown as {
      on?: (event: string, listener: (...args: unknown[]) => void) => void;
    };
    if (client && typeof client.on === "function") {
      cached.listenersAttached = true;
      client.on("connectionPoolCreated", () => {
        cached.telemetry.poolCreatedCount++;
      });
      client.on("connectionCreated", () => {
        cached.telemetry.connectionsCreated++;
      });
      client.on("connectionClosed", () => {
        cached.telemetry.connectionsClosed++;
      });
      client.on("connectionCheckedOut", () => {
        cached.telemetry.connectionsCheckedOut++;
      });
      client.on("connectionCheckedIn", () => {
        cached.telemetry.connectionsCheckedIn++;
      });
      client.on("connectionCheckOutFailed", () => {
        cached.telemetry.connectionCheckOutFailed++;
      });
    }

    m.connection.on("error", (err: unknown) => {
      cached.telemetry.serverSelectionFailures++;
      cached.telemetry.lastFailureAt = new Date().toISOString();
      cached.telemetry.lastFailureReason =
        err instanceof Error ? err.message : String(err);
    });
  } catch {
    // Graceful fallback if getClient() is not available in mock/test environments
  }
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  // Enforce strict environment isolation before connecting
  const isolation = validateDatabaseConnection();
  if (!isolation.valid) {
    throw new Error(isolation.error);
  }

  const uri = isolation.uri;

  // 1. If actively connected (readyState === 1), return cached connection immediately
  if (cached.conn && cached.conn.connection.readyState === 1) {
    return cached.conn;
  }

  // 2. If connection promise is actively in-flight, await and reuse it (prevents concurrent initialization races)
  if (cached.promise) {
    try {
      cached.conn = assertDatabaseReady(await cached.promise);
      return cached.conn;
    } catch {
      // If previous promise rejected, reset to allow fresh reconnection attempt
      cached.promise = null;
      cached.conn = null;
    }
  }

  // 3. Cooldown guard (prevents request storms when Atlas connection is down)
  if (Date.now() - lastFailureTime < FAILURE_COOLDOWN_MS) {
    throw new Error("MONGODB_CONNECTION_COOLDOWN");
  }

  // 4. Controlled connection pool settings optimized for Vercel Serverless & Atlas Free (M0)
  const maxPoolSize = Number(process.env.MONGODB_MAX_POOL_SIZE || DEFAULT_MAX_POOL_SIZE);
  const minPoolSize = Number(process.env.MONGODB_MIN_POOL_SIZE || DEFAULT_MIN_POOL_SIZE);
  const maxConnecting = Number(process.env.MONGODB_MAX_CONNECTING || DEFAULT_MAX_CONNECTING);
  const maxIdleTimeMS = Number(process.env.MONGODB_MAX_IDLE_TIME_MS || DEFAULT_MAX_IDLE_TIME_MS);
  const waitQueueTimeoutMS = Number(process.env.MONGODB_WAIT_QUEUE_TIMEOUT_MS || DEFAULT_WAIT_QUEUE_TIMEOUT_MS);
  const serverSelectionTimeoutMS = Number(
    process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || DEFAULT_SERVER_SELECTION_TIMEOUT_MS
  );
  const connectTimeoutMS = Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || DEFAULT_CONNECT_TIMEOUT_MS);
  const autoIndex = process.env.NODE_ENV !== "production";

  const opts: mongoose.ConnectOptions = {
    bufferCommands: false,
    autoIndex,
    maxPoolSize,
    minPoolSize,
    maxConnecting,
    maxIdleTimeMS,
    waitQueueTimeoutMS,
    serverSelectionTimeoutMS,
    connectTimeoutMS,
  };

  cached.promise = connectMongoose(uri, opts).then((m) => {
    assertDatabaseReady(m);
    cached.telemetry.lastConnectedAt = new Date().toISOString();
    attachTelemetryListeners(m);
    return m;
  });

  try {
    cached.conn = assertDatabaseReady(await cached.promise);
    lastFailureTime = 0;
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    cached.conn = null;
    lastFailureTime = Date.now();
    cached.telemetry.serverSelectionFailures++;
    cached.telemetry.lastFailureAt = new Date().toISOString();
    cached.telemetry.lastFailureReason = err instanceof Error ? err.message : String(err);
    throw err;
  }
}

/**
 * Returns safe diagnostic metrics without exposing connection strings,
 * credentials, or sensitive customer information.
 */
export function getDatabaseDiagnostics() {
  const readyStates = [
    "disconnected",
    "connected",
    "connecting",
    "disconnecting",
    "uninitialized",
  ];
  const readyState = mongoose.connection ? mongoose.connection.readyState : 0;
  const readyStateText = readyStates[readyState] || "unknown";

  let isolationInfo = {
    environment: "unknown",
    expectedDatabase: "unknown",
    actualDatabase: "unknown",
    sanitizedHost: "unknown",
    isolationValid: false,
  };

  try {
    const iso = validateDatabaseConnection();
    isolationInfo = {
      environment: iso.environment,
      expectedDatabase: iso.expectedDatabase,
      actualDatabase: iso.actualDatabase,
      sanitizedHost: iso.sanitizedHost,
      isolationValid: iso.valid,
    };
  } catch {
    isolationInfo.environment = getAppEnvironment();
  }

  return {
    runtime: {
      nodeVersion: process.version,
      runtime: process.env.NEXT_RUNTIME || "nodejs",
      vercelEnv: process.env.VERCEL_ENV || "development",
      vercelRegion: process.env.VERCEL_REGION || "local",
      isVercel: Boolean(process.env.VERCEL),
      uptimeSeconds: Math.floor(process.uptime()),
      pid: process.pid,
    },
    isolation: isolationInfo,
    connection: {
      readyState,
      readyStateText,
      isCached: Boolean(cached.conn && cached.conn.connection.readyState === 1),
      hasActivePromise: Boolean(cached.promise),
    },
    poolConfig: {
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || DEFAULT_MAX_POOL_SIZE),
      minPoolSize: Number(process.env.MONGODB_MIN_POOL_SIZE || DEFAULT_MIN_POOL_SIZE),
      maxConnecting: Number(process.env.MONGODB_MAX_CONNECTING || DEFAULT_MAX_CONNECTING),
      maxIdleTimeMS: Number(process.env.MONGODB_MAX_IDLE_TIME_MS || DEFAULT_MAX_IDLE_TIME_MS),
      waitQueueTimeoutMS: Number(process.env.MONGODB_WAIT_QUEUE_TIMEOUT_MS || DEFAULT_WAIT_QUEUE_TIMEOUT_MS),
      serverSelectionTimeoutMS: Number(
        process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || DEFAULT_SERVER_SELECTION_TIMEOUT_MS
      ),
      connectTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || DEFAULT_CONNECT_TIMEOUT_MS),
      autoIndex: process.env.NODE_ENV !== "production",
      bufferCommands: false,
    },
    metrics: { ...cached.telemetry },
  };
}

export default connectToDatabase;
