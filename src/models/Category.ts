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
  description: string;
  count: number;
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
    description: { type: String, default: "" },
    count: { type: Number, default: 0 },
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

export const Category: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);

export default Category;
