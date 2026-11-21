import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { requireAdminSessionCore } from "@/server/admin-auth";
import { clientIp } from "@/server/rate-limit";
import { normalizeUnitWeightToKg } from "@/server/courier/parcel-classifier";

export const dynamic = "force-dynamic";

async function findProduct(id: string) {
  const numericId = Number(id);
  const query =
    !isNaN(numericId) && numericId > 0
      ? { $or: [{ id: numericId }, ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : [])] }
      : mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { slug: id };

  return Product.findOne(query);
}

/**
 * PATCH /api/admin/products/[id]/shipping-weight
 *
 * Saves verified product unit weight and shipping category to the Product database
 * so future orders automatically compute accurate parcel weight.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSessionCore(request);
  if (!auth.authorized) {
    return auth.response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    await connectToDatabase();

    const product = await findProduct(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const rawWeight = body.weight;
    const weightUnit = body.weightUnit === "g" ? "g" : "kg";
    const shippingCategory =
      typeof body.shippingCategory === "string" && body.shippingCategory.trim()
        ? body.shippingCategory.trim().toLowerCase()
        : product.shippingCategory || "";

    const normalizedKg = normalizeUnitWeightToKg(rawWeight, weightUnit);
    if (normalizedKg === null) {
      return NextResponse.json(
        { error: "Please enter a valid positive unit weight." },
        { status: 400 }
      );
    }

    const before = {
      weight: product.weight,
      weightUnit: product.weightUnit,
      shippingCategory: product.shippingCategory,
      weightUpdatedAt: product.weightUpdatedAt,
    };

    // Weight represents one product unit.
    product.weight = String(rawWeight);
    product.weightUnit = weightUnit;
    product.shippingCategory = shippingCategory;
    product.weightUpdatedAt = new Date();

    await product.save();

    const after = {
      weight: product.weight,
      weightUnit: product.weightUnit,
      shippingCategory: product.shippingCategory,
      weightUpdatedAt: product.weightUpdatedAt,
      normalizedKg,
    };

    // Record admin audit log
    await AdminAuditLog.create({
      actor: auth.user || "admin",
      action: "product.weight.update",
      targetType: "product",
      targetId: String(product.id),
      before,
      after,
      ip: clientIp(request),
    }).catch(() => null);

    return NextResponse.json({
      ok: true,
      message: `Verified weight for "${product.name}" saved successfully.`,
      product: {
        id: product.id,
        name: product.name,
        weight: product.weight,
        weightUnit: product.weightUnit,
        shippingCategory: product.shippingCategory,
        weightUpdatedAt: product.weightUpdatedAt,
        normalizedKg,
      },
    });
  } catch (error) {
    console.error("PATCH /api/admin/products/[id]/shipping-weight error:", error);
    return NextResponse.json(
      { error: "Failed to update product shipping weight." },
      { status: 500 }
    );
  }
}
