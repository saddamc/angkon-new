import mongoose from "mongoose";
import {
  RateLimitBucket,
  type IRateLimitBucket,
} from "./RateLimitBucket";

export type IRateLimit = IRateLimitBucket;

/**
 * Backward-compatible export pointing to the dedicated RateLimitBucket collection.
 */
export const RateLimit =
  mongoose.models.RateLimitBucket || RateLimitBucket;

export { RateLimitBucket };
export default RateLimit;
