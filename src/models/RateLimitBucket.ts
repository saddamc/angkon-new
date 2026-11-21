import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Dedicated RateLimitBucket collection for MongoDB-backed rate limiting.
 *
 * Implements atomic windowed rate limiting without external Redis dependencies.
 * The TTL index provides automatic background cleanup of expired buckets,
 * while window enforcement is computed mathematically from timestamps.
 */
export interface IRateLimitBucket extends Document {
  key: string;
  windowStart: Date;
  count: number;
  expiresAt: Date;
  /** Legacy alias for expiresAt */
  resetAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RateLimitBucketSchema = new Schema<IRateLimitBucket>(
  {
    key: {
      type: String,
      required: true,
      // `unique` already creates the only index this collection needs for
      // lookups. Declaring `index: true` as well makes Mongoose warn about a
      // duplicate `{ key: 1 }` index.
      unique: true,
      trim: true,
    },
    windowStart: {
      type: Date,
      required: true,
    },
    count: {
      type: Number,
      required: true,
      default: 1,
      min: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
    collection: "ratelimitbuckets",
  }
);

// The TTL index on `expiresAt` is the only additional index. Window
// enforcement is mathematical (see `rateLimit`), so cleanup lag can never
// extend or shorten a window.

// Compatibility getter/setter for legacy resetAt property
RateLimitBucketSchema.virtual("resetAt")
  .get(function (this: IRateLimitBucket) {
    return this.expiresAt;
  })
  .set(function (this: IRateLimitBucket, val: Date) {
    this.expiresAt = val;
  });

export const RateLimitBucket: Model<IRateLimitBucket> =
  mongoose.models.RateLimitBucket ||
  mongoose.model<IRateLimitBucket>("RateLimitBucket", RateLimitBucketSchema);

export default RateLimitBucket;
