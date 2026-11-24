import { Order } from "@/models/Order";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import { nextOrderNumber } from "../order-number";
import {
  reserveStockForOrder,
  commitStockForOrder,
  restoreReservedItems,
} from "@/server/products/stock";
import { getAllDbProducts } from "@/lib/db/products";
import { calculateShipping } from "@/lib/shipping";
import { getProductDeliveryRates, getShippingSettings } from "@/server/settings/shipping";
import REAL_PRODUCTS from "@/data/real-products.json";

export interface AdminCreateOrderInput {
  customer?: {
    fullName?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    district?: string;
    postalCode?: string;
  };
  items?: {
    productId?: number | string;
    slug?: string;
    quantity?: number | string;
    size?: string;
    color?: string;
  }[];
  paymentMethod?: string;
  shippingFee?: number | string;
  discount?: number | string;
  notes?: string;
  idempotencyKey?: string;
  markPaid?: boolean;
}

export interface AdminOrderActorContext {
  actor: string;
  tenantId?: string;
  ip: string;
  userAgent: string;
}

export interface ResolvedAdminItem {
  productId: number;
  slug: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  color: string;
  image: string;
}

export async function createAdminOrder(
  body: AdminCreateOrderInput,
  context: AdminOrderActorContext
) {
  const customer = body.customer || {};
  const fullName = String(customer.fullName || "").trim();
  const phone = String(customer.phone || "").trim();
  const address = String(customer.address || "").trim();
  const city = String(customer.city || "").trim();
  const district = String(customer.district || city || "").trim();
  const email = String(customer.email || "").trim();

  if (!fullName || !phone || !address || !city) {
    return {
      status: 400 as const,
      data: { error: "Customer name, phone, address and city are required." },
    };
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length === 0) {
    return {
      status: 400 as const,
      data: { error: "Add at least one product to the order." },
    };
  }

  const rawPaymentMethod = String(body.paymentMethod || "cod").trim().toLowerCase();
  if (rawPaymentMethod !== "cod" && rawPaymentMethod !== "manual_paid") {
    return {
      status: 400 as const,
      data: { error: "Manual orders support Cash on Delivery or a recorded manual payment." },
    };
  }
  const isPaidUpfront = rawPaymentMethod === "manual_paid" || body.markPaid === true;

  // Resolve the authoritative catalog price for every line item.
  const allDbCatalog = await getAllDbProducts();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fallbackCatalog = REAL_PRODUCTS as any[];

  const itemsData: ResolvedAdminItem[] = [];
  let subtotal = 0;

  for (const rawItem of rawItems) {
    const pId = Number(rawItem.productId || 0);
    const rawSlug = String(rawItem.slug || "").trim().toLowerCase();
    const matched =
      allDbCatalog.find((p) => p.id === pId || (rawSlug && p.slug.toLowerCase() === rawSlug)) ||
      fallbackCatalog.find((p) => p.id === pId || (rawSlug && p.slug.toLowerCase() === rawSlug));

    if (!matched) {
      return {
        status: 400 as const,
        data: { error: `Product "${rawItem.productId ?? rawItem.slug ?? "unknown"}" is not in the catalog.` },
      };
    }

    const qty = Math.max(1, Math.min(99, parseInt(String(rawItem.quantity || "1"), 10) || 1));
    const rawPriceStr = String(
      matched.price || matched.sale_price || matched.regular_price || "0"
    ).trim();
    const unitPrice = parseFloat(rawPriceStr);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return {
        status: 400 as const,
        data: { error: `Invalid pricing for "${matched.name}".` },
      };
    }

    subtotal += unitPrice * qty;

    let resolvedImage = "";
    if (Array.isArray(matched.images) && matched.images[0]?.src) {
      resolvedImage = String(matched.images[0].src);
    }

    itemsData.push({
      productId: matched.id,
      slug: matched.slug || "",
      name: matched.name,
      price: unitPrice,
      quantity: qty,
      size: rawItem.size ? String(rawItem.size).trim() : "",
      color: rawItem.color ? String(rawItem.color).trim() : "",
      image: resolvedImage,
    });
  }

  // Delivery fee: computed server-side from store settings unless an admin
  // explicitly overrides it (bounded so a typo cannot create an absurd total).
  let shippingFee: number;
  if (body.shippingFee !== undefined && body.shippingFee !== null && body.shippingFee !== "") {
    const parsed = Number(body.shippingFee);
    shippingFee = Number.isFinite(parsed) ? Math.max(0, Math.min(5000, Math.round(parsed))) : 0;
  } else {
    const [shippingSettings, productRates] = await Promise.all([
      getShippingSettings(),
      getProductDeliveryRates(itemsData.map((item) => item.productId)),
    ]);
    shippingFee = calculateShipping({
      subtotal,
      district,
      city,
      settings: shippingSettings,
      itemRates: itemsData.map((item) => productRates.get(item.productId) ?? {}),
    }).fee;
  }

  const rawDiscount = Number(body.discount || 0);
  const discount = Number.isFinite(rawDiscount)
    ? Math.max(0, Math.min(subtotal, Math.round(rawDiscount)))
    : 0;

  const total = Math.max(0, subtotal - discount + shippingFee);
  const initialOrderStatus = "confirmed";
  const paymentStatus = isPaidUpfront ? "paid" : "unpaid";

  // Reserve stock before the order exists so an oversell never creates a
  // confirmed order. The reservation is rolled back if creation fails.
  const reservation = await reserveStockForOrder(itemsData);
  if (!reservation.ok) {
    return {
      status: 409 as const,
      data: {
        error: reservation.item
          ? `${reservation.item.name} does not have enough stock for the requested quantity.`
          : "One or more items are out of stock.",
        code: "OUT_OF_STOCK",
      },
    };
  }

  const orderNumber = await nextOrderNumber();
  const now = new Date();
  const actor = context.actor || "admin";

  let newOrder;
  try {
    newOrder = await Order.create({
      orderNumber,
      idempotencyKey: body.idempotencyKey ? String(body.idempotencyKey).slice(0, 120) : undefined,
      userId: null,
      customer: {
        fullName,
        email,
        phone,
        address,
        city,
        district,
        postalCode: customer.postalCode ? String(customer.postalCode).trim() : "",
      },
      items: itemsData,
      subtotal,
      discount,
      promoCode: "",
      shippingFee,
      total,
      channel: "admin",
      paymentMethod: "cod",
      paymentStatus,
      paidAmount: isPaidUpfront ? total : 0,
      paidAt: isPaidUpfront ? now : null,
      expectedCodAmount: isPaidUpfront ? 0 : total,
      collectedCodAmount: 0,
      settledCodAmount: 0,
      courierCharge: 0,
      codSettlementStatus: isPaidUpfront ? "none" : "expected",
      shipmentBookingState: "not_booked",
      orderStatus: initialOrderStatus,
      statusHistory: [
        {
          status: initialOrderStatus,
          previousStatus: "",
          actor,
          note: `Manual order created from admin panel (${isPaidUpfront ? "recorded paid" : "COD"})`,
          source: "admin",
          at: now,
        },
      ],
      stockReservedAt: reservation.reserved.length ? now : null,
      notes: body.notes ? String(body.notes).trim().slice(0, 2000) : "",
    });
  } catch (createErr) {
    // Roll the stock reservation back so a failed insert cannot leak inventory.
    await restoreReservedItems(reservation.reserved).catch(() => {});
    throw createErr;
  }

  // COD (or recorded-paid) is confirmed immediately: mark the stock commitment.
  await commitStockForOrder(newOrder);

  try {
    await AdminAuditLog.create({
      tenantId: context.tenantId,
      actor,
      action: "order.create",
      targetType: "order",
      targetId: orderNumber,
      before: null,
      after: {
        orderNumber,
        channel: "admin",
        total,
        paymentMethod: "cod",
        paymentStatus,
        items: itemsData.map((i) => `${i.name} x${i.quantity}`),
      },
      ip: context.ip,
      userAgent: context.userAgent || "",
    });
  } catch (auditErr) {
    console.warn("Admin audit log write failed:", auditErr);
  }

  return {
    status: 201 as const,
    data: {
      ok: true,
      order: {
        id: String(newOrder._id),
        orderNumber,
        total,
        orderStatus: initialOrderStatus,
        paymentStatus,
      },
    },
  };
}
