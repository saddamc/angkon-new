import mongoose, { Schema, Document, Model } from "mongoose";

/** Counter for a rate-limit bucket (e.g. "code-send:email:a@b.com"). Cleans itself up. */
export interface IRateLimit extends Document {
  key: string;
  count: number;
  resetAt: Date;
}

const RateLimitSchema = new Schema<IRateLimit>({
  key: { type: String, required: true, unique: true, index: true },
  count: { type: Number, default: 0 },
  resetAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

export const RateLimit: Model<IRateLimit> =
  mongoose.models.RateLimit || mongoose.model<IRateLimit>("RateLimit", RateLimitSchema);

export default RateLimit;
