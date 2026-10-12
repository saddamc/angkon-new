/** Clean, whitelisted category fields from an admin request body (never trust the raw body). */
export interface CleanCategoryInput {
  name?: string;
  slug?: string;
  description?: string;
  parent?: number;
  linked_parents?: number[];
  menu_order?: number;
  is_active?: boolean;
  meta_data?: { key: string; value: string }[];
  image?: { id?: number; src: string; alt?: string } | null;
}

export function slugifyCategory(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cleanCategoryInput(body: any): CleanCategoryInput {
  const out: CleanCategoryInput = {};
  if (typeof body?.name === "string") out.name = body.name.trim();
  if (typeof body?.slug === "string" && body.slug.trim()) out.slug = slugifyCategory(body.slug);
  if (typeof body?.description === "string") out.description = body.description;
  if (body?.parent !== undefined) out.parent = Math.max(0, Number(body.parent) || 0);
  if (Array.isArray(body?.linked_parents)) {
    out.linked_parents = body.linked_parents
      .map((n: unknown) => Number(n))
      .filter((n: number) => !isNaN(n) && n > 0 && n !== out.parent);
  }
  const order = body?.menu_order ?? body?.sortOrder;
  if (order !== undefined) out.menu_order = Number(order) || 0;

  if (Array.isArray(body?.meta_data)) {
    out.meta_data = body.meta_data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((m: any) => m && typeof m.key === "string")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => ({ key: m.key, value: String(m.value ?? "") }));
    const active = out.meta_data?.find((m) => m.key === "_is_active");
    if (active) out.is_active = active.value !== "false";
  }
  if (typeof body?.is_active === "boolean") out.is_active = body.is_active;

  if (body?.image === null) {
    out.image = null;
  } else if (body?.image && typeof body.image === "object" && body.image.src) {
    out.image = {
      id: body.image.id ? Number(body.image.id) : undefined,
      src: String(body.image.src),
      alt: String(body.image.alt || body.name || ""),
    };
  }
  return out;
}
