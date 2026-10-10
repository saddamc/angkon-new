import { NextRequest, NextResponse } from "next/server";

const WC_BASE        = (process.env.NEXT_PUBLIC_WC_API_URL ?? "https://netbazarbd.net").replace(/\/$/, "");
// Use the real WordPress user login or email for the account that owns the application password.
const WP_USERNAME    = process.env.WP_ADMIN_USERNAME ?? "";
const WP_APP_PASSWORD = (process.env.WP_APP_PASSWORD ?? "").replace(/\s+/g, "");

// Upload image to WordPress Media Library via REST API.
// Requires a WordPress Application Password:
//   WP Admin → Users → Your Profile → Application Passwords → Add New
// Set in .env.local:
//   WP_ADMIN_USERNAME=your-wp-username-or-email
//   WP_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx
export async function POST(request: NextRequest) {
  if (!WP_USERNAME || !WP_APP_PASSWORD) {
    return NextResponse.json(
      { error: "WordPress credentials not configured. Set WP_ADMIN_USERNAME and WP_APP_PASSWORD in .env.local" },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const filename = (file as File).name ?? "upload.jpg";
    const mimeType = file.type || "image/jpeg";
    const buffer   = Buffer.from(await file.arrayBuffer());

    const auth = Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString("base64");

    // The host's WAF rejects raw-binary POST bodies to this endpoint with a 403;
    // sending as multipart/form-data (like a browser file input) passes through.
    const wpForm = new FormData();
    wpForm.append("file", new Blob([buffer], { type: mimeType }), filename);

    const wpRes = await fetch(`${WC_BASE}/wp-json/wp/v2/media`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
      },
      body: wpForm,
    });

    if (!wpRes.ok) {
      const rawError = await wpRes.text();
      let err: { message?: string; code?: string } = {};

      try {
        err = JSON.parse(rawError) as { message?: string; code?: string };
      } catch {
        err = { message: rawError };
      }

      console.error("WP media upload failed:", err);
      return NextResponse.json(
        {
          error: err.message ?? "Upload failed",
          code: err.code,
        },
        { status: wpRes.status },
      );
    }

    const media = await wpRes.json();
    return NextResponse.json({
      url: media.source_url as string,
      id:  media.id as number,
      alt: (media.alt_text as string) || filename.replace(/\.[^.]+$/, ""),
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

// DELETE /api/admin/upload — delete a WordPress media item by ID
export async function DELETE(request: NextRequest) {
  if (!WP_USERNAME || !WP_APP_PASSWORD) {
    return NextResponse.json(
      { error: "WordPress credentials not configured" },
      { status: 503 },
    );
  }

  let mediaId: number | undefined;

  // Accept both JSON body { id } and query param ?id=
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const body = await request.json() as { id?: number };
      mediaId = body.id;
    } catch {
      // fall through to query param
    }
  }

  if (!mediaId) {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    mediaId = idParam ? Number(idParam) : undefined;
  }

  if (!mediaId || !Number.isInteger(mediaId) || mediaId <= 0) {
    return NextResponse.json({ error: "Invalid or missing media id" }, { status: 400 });
  }

  try {
    const auth = Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString("base64");

    // force=true permanently deletes (skips trash)
    const wpRes = await fetch(`${WC_BASE}/wp-json/wp/v2/media/${mediaId}?force=true`, {
      method: "DELETE",
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!wpRes.ok) {
      const rawError = await wpRes.text();
      let err: { message?: string } = {};
      try { err = JSON.parse(rawError) as { message?: string }; } catch { err = { message: rawError }; }
      // 404 means already gone — treat as success
      if (wpRes.status !== 404) {
        console.error("WP media delete failed:", err);
        return NextResponse.json({ error: err.message ?? "Delete failed" }, { status: wpRes.status });
      }
    }

    return NextResponse.json({ success: true, id: mediaId });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
