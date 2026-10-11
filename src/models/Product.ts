import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProductImage {
  id: number;
  src: string;
  name?: string;
  alt?: string;
}

export interface IProductCategoryRef {
  id: number;
  name: string;
  slug: string;
  parent?: number;
}

export interface IProductTagRef {
  id: number;
  name: string;
  slug: string;
}

export interface IProductAttribute {
  id: number;
  name: string;
  options: string[];
  visible: boolean;
}

export interface IProductMetaData {
  id?: number;
  key: string;
  value: string;
}

export interface IProduct extends Document {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  stock_status: "instock" | "outofstock" | "onbackorder";
  sizes: string[];
  images: IProductImage[];
  categories: IProductCategoryRef[];
  tags: IProductTagRef[];
  attributes: IProductAttribute[];
  sku?: string;
  weight?: string;
  shipping_class_id: number;
  stock_quantity?: number | null;
  meta_data: IProductMetaData[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductImageSchema = new Schema<IProductImage>(
  {
    id: { type: Number, default: 0 },
    src: { type: String, required: true },
    name: { type: String, default: "" },
    alt: { type: String, default: "" },
  },
  { _id: false }
);

const ProductCategoryRefSchema = new Schema<IProductCategoryRef>(
  {
    id: { type: Number, required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    parent: { type: Number, default: 0 },
  },
  { _id: false }
);

const ProductTagRefSchema = new Schema<IProductTagRef>(
  {
    id: { type: Number, required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
  },
  { _id: false }
);

const ProductAttributeSchema = new Schema<IProductAttribute>(
  {
    id: { type: Number, default: 0 },
    name: { type: String, required: true },
    options: { type: [String], default: [] },
    visible: { type: Boolean, default: true },
  },
  { _id: false }
);

const ProductMetaDataSchema = new Schema<IProductMetaData>(
  {
    id: { type: Number, default: 0 },
    key: { type: String, required: true },
    value: { type: String, default: "" },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    id: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, trim: true },
    permalink: { type: String, default: "" },
    description: { type: String, default: "" },
    short_description: { type: String, default: "" },
    price: { type: String, required: true, default: "0" },
    regular_price: { type: String, default: "" },
    sale_price: { type: String, default: "" },
    on_sale: { type: Boolean, default: false, index: true },
    stock_status: {
      type: String,
      enum: ["instock", "outofstock", "onbackorder"],
      default: "instock",
    },
    sizes: { type: [String], default: [] },
    images: { type: [ProductImageSchema], default: [] },
    categories: { type: [ProductCategoryRefSchema], default: [] },
    tags: { type: [ProductTagRefSchema], default: [] },
    attributes: { type: [ProductAttributeSchema], default: [] },
    sku: { type: String, default: "" },
    weight: { type: String, default: "" },
    shipping_class_id: { type: Number, default: 0 },
    stock_quantity: { type: Number, default: null },
    meta_data: { type: [ProductMetaDataSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        // Remove MongoDB internal _id & __v when serializing for the frontend
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, __v, ...rest } = ret as Record<string, unknown>;
        return rest;
      },
    },
  }
);

// Compound & Search Indexes
ProductSchema.index({ "categories.slug": 1 });
ProductSchema.index({ "categories.id": 1 });
ProductSchema.index({ name: "text", description: "text" });

export const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
