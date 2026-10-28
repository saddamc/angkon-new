import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";

export const dynamic = "force-dynamic";

function escapeXml(unsafe: string): string {
  return (unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const products = await Product.find({}).sort({ createdAt: -1 }).limit(500).lean();

    const host = request.headers.get("host") || "angkon.com.bd";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");

    if (format === "json") {
      const jsonItems = products.map((p) => {
        const id = String(p.id || p.slug);
        const title = p.name;
        const description = (p.short_description || p.description || p.name).replace(/<[^>]*>/g, "");
        const price = `${parseFloat(p.price || p.regular_price || "0").toFixed(2)} BDT`;
        const link = `${baseUrl}/products/${p.slug}`;
        const image = p.images?.[0]?.src || `${baseUrl}/og-image.jpg`;
        const availability = p.stock_status === "outofstock" ? "out of stock" : "in stock";

        return {
          id,
          title,
          description,
          availability,
          condition: "new",
          price,
          link,
          image_link: image,
          brand: "ANGKON",
          google_product_category: "Apparel & Accessories > Clothing > Traditional & Cultural Clothing",
        };
      });

      return NextResponse.json({
        catalog: "Maison ANGKON Meta Product Feed",
        total: jsonItems.length,
        items: jsonItems,
      });
    }

    // Standard Meta Commerce Manager XML / RSS Data Feed
    const xmlItems = products
      .map((p) => {
        const id = escapeXml(String(p.id || p.slug));
        const title = escapeXml(p.name);
        const rawDesc = (p.short_description || p.description || p.name).replace(/<[^>]*>/g, "");
        const description = escapeXml(rawDesc.slice(0, 500));
        const price = escapeXml(`${parseFloat(p.price || p.regular_price || "0").toFixed(2)} BDT`);
        const link = escapeXml(`${baseUrl}/products/${p.slug}`);
        const image = escapeXml(p.images?.[0]?.src || `${baseUrl}/og-image.jpg`);
        const availability = p.stock_status === "outofstock" ? "out of stock" : "in stock";

        return `    <item>
      <g:id>${id}</g:id>
      <g:title>${title}</g:title>
      <g:description>${description}</g:description>
      <g:link>${link}</g:link>
      <g:image_link>${image}</g:image_link>
      <g:brand>ANGKON</g:brand>
      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${price}</g:price>
      <g:google_product_category>Apparel &amp; Accessories &gt; Clothing &gt; Traditional &amp; Cultural Clothing</g:google_product_category>
    </item>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Maison ANGKON Product Catalog</title>
    <link>${baseUrl}</link>
    <description>Authentic Ethnic Luxury Apparel Catalog for Facebook &amp; Instagram Dynamic Product Ads</description>
${xmlItems}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    console.error("GET /api/meta/catalog error:", error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Error</title></channel></rss>`,
      { status: 500, headers: { "Content-Type": "application/xml" } }
    );
  }
}
