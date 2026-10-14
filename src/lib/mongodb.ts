import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.DATABASE_URL;

if (!MONGODB_URI) {
  console.warn("MONGODB_URI, MONGODB_URL, or DATABASE_URL is not defined in environment variables.");
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Global cache to maintain a single active connection across hot-reloads and serverless invocations
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

let lastFailureTime = 0;
const FAILURE_COOLDOWN_MS = 5000;

export async function connectToDatabase(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.DATABASE_URL;
  if (!uri) {
    throw new Error("Please define the MONGODB_URI, MONGODB_URL, or DATABASE_URL environment variable.");
  }

  // Only return cached connection if it is actively connected (readyState === 1)
  if (cached.conn && cached.conn.connection.readyState === 1) {
    return cached.conn;
  }

  // If connection is dead or dropped, reset cached handles
  if (cached.conn && cached.conn.connection.readyState !== 1) {
    cached.conn = null;
    cached.promise = null;
  }

  // If connection failed within the last 3s, fail immediately without stalling requests
  if (Date.now() - lastFailureTime < FAILURE_COOLDOWN_MS) {
    throw new Error("MONGODB_CONNECTION_COOLDOWN");
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    };

    cached.promise = mongoose.connect(uri, opts).then((m) => {
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
    lastFailureTime = 0;
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
    lastFailureTime = Date.now();
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
