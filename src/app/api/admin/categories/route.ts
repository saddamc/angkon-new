import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import REAL_CATEGORIES from "@/data/real-categories.json";

const WC_BASE = (process.env.NEXT_PUBLIC_WC_API_URL ?? "https://netbazarbd.net").replace(/\/$/, "");
const WP_USERNAME = process.env.WP_ADMIN_USERNAME ?? "";
const WP_APP_PASSWORD = (process.env.WP_APP_PASSWORD ?? "").replace(/\s+/g, "");
const wcAuth = () => Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString("base64");
const WC_HEADERS = () => ({
  Authorization: `Basic ${wcAuth()}`,
  "Content-Type": "application/json",
});

const isWpLive = Boolean(
  process.env.NEXT_PUBLIC_WC_API_URL &&
  !process.env.NEXT_PUBLIC_WC_API_URL.includes("netbazarbd.net") &&
  WP_USERNAME &&
  WP_APP_PASSWORD
);

export const dynamic = "force-dynamic";

export async function GET() {
  if (isWpLive) {
    const perPage = 100;
    const all: unknown[] = [];
    let page = 1;

    try {
      while (true) {
        const url = new URL(`${WC_BASE}/wp-json/wc/v3/products/categories`);
        url.searchParams.set("per_page", String(perPage));
        url.searchParams.set("page", String(page));
        url.searchParams.set("hide_empty", "false");

        const res = await fetch(url.toString(), {
          headers: WC_HEADERS(),
          signal: AbortSignal.timeout(3500),
        });

        if (!res.ok) {
          if (page === 1) return NextResponse.json(REAL_CATEGORIES, { status: 200 });
          break;
        }

        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) break;

        all.push(...data);
        if (data.length < perPage) break;
        page += 1;
      }

      if (all.length > 0) {
        return NextResponse.json(all, { status: 200 });
      }
    } catch (err) {
      console.warn("WooCommerce categories fetch failed, using local fallback:", err);
    }
  }

  // Instant local categories fallback
  return NextResponse.json(REAL_CATEGORIES, { status: 200 });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const slug = (body.name as string)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");

  try {
    const res = await fetch(`${WC_BASE}/wp-json/wc/v3/products/categories`, {
      method: "POST",
      headers: WC_HEADERS(),
      body: JSON.stringify({
        name: body.name,
        slug,
        description: body.description ?? "",
        parent: body.parent ?? 0,
        menu_order: body.menu_order ?? 0,
        ...(body.meta_data ? { meta_data: body.meta_data } : {}),
        ...(body.image ? { image: body.image } : {}),
      }),
    });

    const data = await res.json();
    if (res.ok) revalidateTag("categories", { expire: 0 });
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Create category failed:", err);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const urlParams = new URL(request.url);
  const id = urlParams.searchParams.get("id");
  if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });

  try {
    const res = await fetch(`${WC_BASE}/wp-json/wc/v3/products/categories/${id}?force=true`, {
      method: "DELETE",
      headers: WC_HEADERS(),
    });
    const data = await res.json();
    if (res.ok) revalidateTag("categories", { expire: 0 });
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Delete category failed:", err);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
