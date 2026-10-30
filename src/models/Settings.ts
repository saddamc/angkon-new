import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISettings extends Document {
  tenantId: string;
  key: string;
  value: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    tenantId: { type: String, required: true, default: "angkon-main", index: true },
    key: { type: String, required: true, index: true },
    value: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, strict: false }
);

// Compound unique index guaranteeing (tenantId, key) uniqueness
SettingsSchema.index({ tenantId: 1, key: 1 }, { unique: true });

// Purge cached model if it lacks tenantId path (fixes Next.js hot-reload singleton drift)
if (mongoose.models && mongoose.models.Settings) {
  if (!mongoose.models.Settings.schema?.path("tenantId")) {
    delete (mongoose.models as Record<string, unknown>).Settings;
  }
}

export const Settings: Model<ISettings> =
  mongoose.models.Settings || mongoose.model<ISettings>("Settings", SettingsSchema);

export default Settings;
