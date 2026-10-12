import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICategoryImage {
  id?: number;
  src: string;
  alt?: string;
}

export interface ICategory extends Document {
  id: number;
  name: string;
  slug: string;
  parent: number;
  linked_parents: number[];
  menu_order: number;
  description: string;
  count: number;
  /** Hidden from the storefront (menus, collection pages) when false. */
  is_active: boolean;
  /** Admin presentation settings (icon, theme…) as key/value pairs. */
  meta_data: { key: string; value: string }[];
  image: ICategoryImage | null;
  createdAt: Date;
  updatedAt: Date;
}

const CategoryImageSchema = new Schema<ICategoryImage>(
  {
    id: { type: Number, default: 0 },
    src: { type: String, default: "" },
    alt: { type: String, default: "" },
  },
  { _id: false }
);

const CategorySchema = new Schema<ICategory>(
  {
    id: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, trim: true },
    parent: { type: Number, default: 0, index: true },
    linked_parents: { type: [Number], default: [], index: true },
    menu_order: { type: Number, default: 0, index: true },
    description: { type: String, default: "" },
    count: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
    meta_data: {
      type: [new Schema({ key: { type: String, required: true }, value: { type: String, default: "" } }, { _id: false })],
      default: [],
    },
    image: { type: CategoryImageSchema, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, __v, ...rest } = ret as Record<string, unknown>;
        return rest;
      },
    },
  }
);

// In development, hot reload keeps the first compiled model alive, so a schema change (e.g. a newly
// added field) would be silently ignored until the server restarts. Rebuild the model each reload.
if (process.env.NODE_ENV !== "production" && mongoose.models.Category) {
  delete mongoose.models.Category;
}

export const Category: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);

export default Category;
