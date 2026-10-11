import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getSessionUserId } from "@/server/auth";
import { getCheckoutSettings } from "@/server/checkout-settings";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

/**
 * GET /api/checkout/config
 * What the checkout needs on load: whether email verification is required and,
 * if the visitor is signed in, the details to pre-fill.
 */
export async function GET(request: NextRequest) {
  const settings = await getCheckoutSettings();

  let user: {
    name: string;
    email: string;
    phone: string;
    emailVerified: boolean;
    address?: { address: string; city: string; district: string; postalCode?: string };
  } | null = null;

  try {
    const userId = getSessionUserId(request);
    if (userId) {
      await connectToDatabase();
      const doc = await User.findById(userId).lean();
      if (doc) {
        const saved = (doc.addresses ?? []).find((a) => a.isDefault) ?? doc.addresses?.[0];
        user = {
          name: doc.name,
          email: doc.email,
          phone: doc.phone || "",
          emailVerified: Boolean(doc.emailVerified),
          address: saved
            ? { address: saved.address, city: saved.city, district: saved.district, postalCode: saved.postalCode }
            : undefined,
        };
      }
    }
  } catch (error) {
    console.warn("Checkout config: could not read the signed-in user:", error);
  }

  return NextResponse.json({ requireEmailVerification: settings.requireEmailVerification, user }, { headers: NO_STORE });
}
