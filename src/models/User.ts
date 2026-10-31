import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface IUser extends Document {
  name: string;
  email: string;
  /** scrypt hash; empty for accounts auto-created at checkout until a password is set */
  password: string;
  phone: string;
  role: "customer" | "admin" | "superadmin";
  addresses: IUserAddress[];
  emailVerified: boolean;
  emailVerifiedAt?: Date | null;
  /** sha256 of the one-time email-verification token */
  verifyTokenHash?: string | null;
  verifyTokenExpires?: Date | null;
  /** sha256 of the one-time password-reset token */
  resetTokenHash?: string | null;
  resetTokenExpires?: Date | null;
  lastVerificationSentAt?: Date | null;
  lastResetSentAt?: Date | null;
  /** "register" | "checkout" — how the account was created */
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserAddressSchema = new Schema<IUserAddress>(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    postalCode: { type: String, default: "", trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, default: "" },
    phone: { type: String, default: "", trim: true },
    role: { type: String, enum: ["customer", "admin", "superadmin"], default: "customer" },
    addresses: { type: [UserAddressSchema], default: [] },
    emailVerified: { type: Boolean, default: false, index: true },
    emailVerifiedAt: { type: Date, default: null },
    verifyTokenHash: { type: String, default: null, index: true },
    verifyTokenExpires: { type: Date, default: null },
    resetTokenHash: { type: String, default: null, index: true },
    resetTokenExpires: { type: Date, default: null },
    lastVerificationSentAt: { type: Date, default: null },
    lastResetSentAt: { type: Date, default: null },
    source: { type: String, default: "register" },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, _id, __v, verifyTokenHash, resetTokenHash, ...rest } = ret as Record<string, unknown>;
        return rest;
      },
    },
  }
);

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
