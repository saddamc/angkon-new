import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

const WC_BASE = (process.env.NEXT_PUBLIC_WC_API_URL ?? "").replace(/\/$/, "");
const WP_USERNAME = process.env.WP_ADMIN_USERNAME ?? "";
const WP_APP_PASSWORD = (process.env.WP_APP_PASSWORD ?? "").replace(/\s+/g, "");
const wcAuth = () => Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString("base64");
const WC_HEADERS = () => ({
  Authorization: `Basic ${wcAuth()}`,
  "Content-Type": "application/json",
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });

  const body = await request.json();

  const res = await fetch(`${WC_BASE}/wp-json/wc/v3/products/categories/${id}`, {
    method: "PUT",
    headers: WC_HEADERS(),
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (res.ok) revalidateTag("categories", undefined as any);
  return NextResponse.json(data, { status: res.status });
}
