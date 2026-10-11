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
const FAILURE_COOLDOWN_MS = 15000;

export async function connectToDatabase(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.DATABASE_URL;
  if (!uri) {
    throw new Error("Please define the MONGODB_URI, MONGODB_URL, or DATABASE_URL environment variable.");
  }

  if (cached.conn) {
    return cached.conn;
  }

  // If connection failed within the last 15s, fail immediately without stalling requests
  if (Date.now() - lastFailureTime < FAILURE_COOLDOWN_MS) {
    throw new Error("MONGODB_CONNECTION_COOLDOWN");
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000,
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
