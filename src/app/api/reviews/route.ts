import { NextRequest, NextResponse } from "next/server";

const WC_BASE = (process.env.NEXT_PUBLIC_WC_API_URL ?? "https://netbazarbd.net").replace(/\/$/, "");
const WC_CK   = process.env.NEXT_PUBLIC_WC_CONSUMER_KEY    ?? "";
const WC_CS   = process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET ?? "";

function wcAuth(): string {
  return Buffer.from(`${WC_CK}:${WC_CS}`).toString("base64");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, reviewer, reviewer_email, review, rating } = body;

    // ── Server-side validation ──────────────────────────────────────
    if (!productId || !reviewer || !reviewer_email || !review || !rating) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    const parsedId     = Number(productId);
    const parsedRating = Number(rating);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return NextResponse.json({ error: "Invalid product." }, { status: 400 });
    }
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
    }

    const cleanEmail    = String(reviewer_email).trim().toLowerCase();
    const cleanReviewer = String(reviewer).trim().replace(/[<>]/g, "").slice(0, 100);
    // Strip all HTML tags from review body to prevent stored XSS
    const cleanReview   = String(review).replace(/<[^>]*>/g, "").trim().slice(0, 2000);

    if (!EMAIL_RE.test(cleanEmail)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }
    if (cleanReviewer.length < 2) {
      return NextResponse.json({ error: "Name must be at least 2 characters." }, { status: 400 });
    }
    if (cleanReview.length < 10) {
      return NextResponse.json({ error: "Review must be at least 10 characters." }, { status: 400 });
    }

    // ── Save to WooCommerce / WordPress database ────────────────────
    // POST /wp-json/wc/v3/products/reviews  (official WC REST API v3 endpoint)
    const wcRes = await fetch(`${WC_BASE}/wp-json/wc/v3/products/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${wcAuth()}`,
      },
      body: JSON.stringify({
        product_id:     parsedId,
        reviewer:       cleanReviewer,
        reviewer_email: cleanEmail,
        review:         cleanReview,
        rating:         parsedRating,
        status:         "approved", // admin credentials → visible immediately
      }),
    });

    const wcData = await wcRes.json();

    if (!wcRes.ok) {
      // WC returns a code + message object on error
      const msg: string =
        typeof wcData?.message === "string"
          ? wcData.message
          : "Failed to save review. Please try again.";
      return NextResponse.json({ error: msg }, { status: wcRes.status });
    }

    // Return the full review object so the client can append it immediately
    return NextResponse.json({ success: true, review: wcData }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const productId = new URL(req.url).searchParams.get("productId");
    if (!productId || isNaN(Number(productId))) {
      console.warn("[GET /api/reviews] Invalid productId:", productId);
      return NextResponse.json({ error: "productId required" }, { status: 400 });
    }
    const wcUrl = `${WC_BASE}/wp-json/wc/v3/products/reviews?product=${Number(productId)}&per_page=50&status=approved`;
    console.log("[GET /api/reviews] Fetching from:", wcUrl);
    const res = await fetch(wcUrl, {
      headers: { Authorization: `Basic ${wcAuth()}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("[GET /api/reviews] WC error:", res.status, errText);
      return NextResponse.json(
        { error: `WC API error: ${res.status}`, details: errText },
        { status: res.status }
      );
    }
    const data = await res.json();
    console.log("[GET /api/reviews] Success, reviews count:", Array.isArray(data) ? data.length : 0);
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/reviews] Exception:", msg);
    return NextResponse.json(
      { error: "Failed to fetch reviews", details: msg },
      { status: 500 }
    );
  }
}
