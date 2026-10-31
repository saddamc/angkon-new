import { NextRequest, NextResponse } from "next/server";
import { promises as dns } from "dns";
import { getPixelSettings } from "@/server/pixel-settings";
import { requireSuperAdminSession } from "@/server/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdminSession(request);
    if (!auth.authorized) {
      return auth.response || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getPixelSettings(auth.tenantId);
    const token = (settings.domainVerificationToken || "").trim();

    const host = request.headers.get("host") || "angkon.com.bd";
    const cleanDomain = host.replace(/:\d+$/, "");
    const targetDomain = cleanDomain.includes("localhost") ? "angkon.com.bd" : cleanDomain;
    const protocol = host.includes("localhost") ? "http" : "https";
    const siteUrl = `${protocol}://${host}`;

    if (!token) {
      return NextResponse.json({
        ok: true,
        verified: false,
        tokenConfigured: false,
        domain: targetDomain,
        message: "No Meta Domain Verification Token is configured in store settings.",
      });
    }

    // 1. Verify HTML <meta> tag by fetching the storefront
    let htmlFound = false;
    let htmlDetectedToken: string | null = null;
    let htmlDetails = "";

    try {
      const response = await fetch(`${siteUrl}/`, {
        headers: { "User-Agent": "Meta-Domain-Verification-Agent/1.0" },
        cache: "no-store",
      });

      if (response.ok) {
        const html = await response.text();
        const match = html.match(
          /<meta[^>]+name=["']facebook-domain-verification["'][^>]+content=["']([^"']+)["']/i
        ) || html.match(
          /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']facebook-domain-verification["']/i
        );

        if (match && match[1]) {
          htmlDetectedToken = match[1].trim();
          htmlFound = htmlDetectedToken === token;
          htmlDetails = htmlFound
            ? `Meta tag verified: <meta name="facebook-domain-verification" content="${token}" /> is active in <head>.`
            : `Meta tag found in <head> but token does not match. Expected "${token}", found "${htmlDetectedToken}".`;
        } else {
          htmlDetails = "No facebook-domain-verification meta tag found in root HTML response.";
        }
      } else {
        htmlDetails = `Storefront returned HTTP ${response.status} when checking HTML head.`;
      }
    } catch (fetchErr) {
      htmlDetails = `Could not fetch storefront HTML: ${
        fetchErr instanceof Error ? fetchErr.message : "Network error"
      }`;
    }

    // 2. Verify DNS TXT Record
    let dnsFound = false;
    let dnsRecordsExamined = 0;
    let dnsDetails = "";

    try {
      const txtRecords = await dns.resolveTxt(targetDomain);
      dnsRecordsExamined = txtRecords.length;

      const flatRecords = txtRecords.map((chunk) => chunk.join(""));
      const match = flatRecords.find((rec) =>
        rec.includes(`facebook-domain-verification=${token}`)
      );

      if (match) {
        dnsFound = true;
        dnsDetails = `DNS TXT record found on ${targetDomain}: "${match}"`;
      } else {
        dnsDetails = `Queried ${dnsRecordsExamined} TXT records on ${targetDomain}. No matching facebook-domain-verification found.`;
      }
    } catch (dnsErr) {
      dnsDetails = `DNS lookup for ${targetDomain} returned: ${
        dnsErr instanceof Error ? dnsErr.message : "Lookup failed"
      }`;
    }

    const isVerified = htmlFound || dnsFound;
    let message = "";
    if (htmlFound && dnsFound) {
      message = "Domain verified via both HTML Meta Tag and DNS TXT record!";
    } else if (htmlFound) {
      message = "Domain verified via HTML <head> Meta Tag.";
    } else if (dnsFound) {
      message = "Domain verified via DNS TXT Record.";
    } else {
      message = "Domain not verified yet. Neither HTML tag nor DNS TXT record was detected.";
    }

    return NextResponse.json({
      ok: true,
      verified: isVerified,
      tokenConfigured: true,
      domain: targetDomain,
      htmlMetaTag: {
        found: htmlFound,
        detectedToken: htmlDetectedToken,
        details: htmlDetails,
      },
      dnsTxtRecord: {
        found: dnsFound,
        recordsExamined: dnsRecordsExamined,
        details: dnsDetails,
      },
      message,
    });
  } catch (error) {
    console.error("GET /api/admin/meta/domain-verification/check error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal error checking domain verification" },
      { status: 500 }
    );
  }
}
