import mongoose, { Schema, Model } from "mongoose";

/**
 * Atomic sequence counters (order numbers, future invoice numbers).
 * `_id` is the counter name, e.g. `order:261112`.
 */
export interface ICounter {
  _id: string;
  seq: number;
  updatedAt?: Date;
}

const CounterSchema = new Schema<ICounter>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { versionKey: false, timestamps: true }
);

export const Counter: Model<ICounter> =
  mongoose.models.Counter || mongoose.model<ICounter>("Counter", CounterSchema);

export default Counter;
