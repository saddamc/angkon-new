import { NextRequest, NextResponse } from "next/server";
import { deleteFromCloudinary } from "@/lib/cloudinary";

const WC_BASE = (process.env.NEXT_PUBLIC_WC_API_URL ?? "https://netbazarbd.net").replace(/\/$/, "");
const WC_CK = process.env.NEXT_PUBLIC_WC_CONSUMER_KEY ?? "";
const WC_CS = process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET ?? "";
const wcAuth = () => Buffer.from(`${WC_CK}:${WC_CS}`).toString("base64");
const WC_HEADERS = () => ({ Authorization: `Basic ${wcAuth()}`, "Content-Type": "application/json" });

// PUT /api/admin/products/[id] — update product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const res = await fetch(`${WC_BASE}/wp-json/wc/v3/products/${id}`, {
    method: "PUT",
    headers: WC_HEADERS(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

// DELETE /api/admin/products/[id] — delete product
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await fetch(`${WC_BASE}/wp-json/wc/v3/products/${id}?force=true`, {
    method: "DELETE",
    headers: WC_HEADERS(),
  });
  const data = await res.json();

  // If deletion was successful and product has Cloudinary images, clean them up
  if (res.ok && data && Array.isArray(data.images)) {
    for (const img of data.images) {
      const src = typeof img === "string" ? img : img?.src;
      if (src && src.includes("res.cloudinary.com")) {
        try {
          await deleteFromCloudinary(src);
        } catch (e) {
          console.warn("Cloudinary cleanup error on product deletion:", e);
        }
      }
    }
  }

  return NextResponse.json(data, { status: res.status });
}
