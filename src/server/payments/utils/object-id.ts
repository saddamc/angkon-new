import { Types } from "mongoose";

/** Guards route params before Mongoose casts them (invalid ids must be 400/404, not 500). */
export function isValidObjectId(value: unknown): value is string {
  return typeof value === "string" && Types.ObjectId.isValid(value);
}
