export const CATEGORY_IMAGE_META = "angkon_category_image";

type MetaItem = { key?: string; value?: unknown };

export function applyCategoryImageMeta<T extends {
  name?: string;
  image?: { id?: number; src?: string; alt?: string } | null;
  meta_data?: MetaItem[];
}>(category: T): T {
  if (category.image?.src) return category;
  const metaSrc = category.meta_data?.find((item) => item.key === CATEGORY_IMAGE_META || item.key === "ps_category_image")?.value;
  if (typeof metaSrc === "string" && (metaSrc.startsWith("http") || metaSrc.startsWith("/"))) {
    return {
      ...category,
      image: { src: metaSrc, alt: category.name ?? "" },
    };
  }
  return category;
}

export function withCategoryImageMeta(body: {
  image?: { id?: number; src?: string; alt?: string } | null;
  meta_data?: MetaItem[];
  [key: string]: unknown;
}) {
  const srcFromImage = body.image?.src ?? "";
  const meta = Array.isArray(body.meta_data) ? [...body.meta_data] : [];
  const existing = meta.find((item) => item.key === CATEGORY_IMAGE_META || item.key === "ps_category_image");
  const existingSrc = typeof existing?.value === "string" ? existing.value : "";
  const src = srcFromImage || existingSrc;
  if (src && !existing) {
    meta.push({ key: CATEGORY_IMAGE_META, value: src });
  }
  return { ...body, meta_data: meta };
}
