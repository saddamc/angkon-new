import mongoose, { Schema, Document, Model } from "mongoose";

/** A pending one-time email code (checkout verification). Only a hash is stored. */
export interface IEmailCode extends Document {
  email: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  lastSentAt: Date;
}

const EmailCodeSchema = new Schema<IEmailCode>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    // MongoDB deletes the document automatically once this time has passed.
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    lastSentAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const EmailCode: Model<IEmailCode> =
  mongoose.models.EmailCode || mongoose.model<IEmailCode>("EmailCode", EmailCodeSchema);

export default EmailCode;
