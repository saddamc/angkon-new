import { Order, type IOrder } from "@/models/Order";
import { Product, type IProduct } from "@/models/Product";

/**
 * Stock lifecycle.
 *
 * Stock is decremented atomically when an order is accepted, and restored when
 * the order is cancelled/refunded or an online payment fails. Every mutation is
 * guarded so concurrent checkouts cannot oversell and a retry cannot release
 * the same order twice.
 *
 * `Product.manage_stock` opts a product in. Products without managed stock are
 * left untouched. Variant-level stock is not modelled yet, so the decrement is
 * product-level.
 */

export interface StockItem {
  productId: number;
  quantity: number;
  name?: string;
}

export interface ReservedStockItem {
  productId: number;
  quantity: number;
  name: string;
}

export type ReserveStockResult =
  | { ok: true; reserved: ReservedStockItem[] }
  | {
      ok: false;
      reason: "insufficient-stock" | "error";
      item?: { productId: number; name: string };
    };

function aggregate(items: StockItem[]): Map<number, { quantity: number; name: string }> {
  const needed = new Map<number, { quantity: number; name: string }>();
  for (const item of items) {
    const productId = Number(item.productId);
    const quantity = Math.max(0, Math.floor(Number(item.quantity) || 0));
    if (!Number.isInteger(productId) || productId <= 0 || quantity <= 0) continue;
    const existing = needed.get(productId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      needed.set(productId, { quantity, name: String(item.name || `#${productId}`) });
    }
  }
  return needed;
}

async function syncStockStatus(productId: number, quantity: number | null | undefined) {
  if (typeof quantity !== "number") return;
  await Product.updateOne(
    { id: productId, manage_stock: true },
    { $set: { stock_status: quantity <= 0 ? "outofstock" : "instock" } }
  );
}

/** Restores a list previously returned by `reserveStockForOrder`. */
export async function restoreReservedItems(items: ReservedStockItem[]): Promise<void> {
  for (const item of items) {
    const updated = (await Product.findOneAndUpdate(
      { id: item.productId, manage_stock: true, stock_quantity: { $ne: null } },
      { $inc: { stock_quantity: item.quantity } },
      { new: true }
    )) as IProduct | null;
    if (updated) await syncStockStatus(item.productId, updated.stock_quantity);
  }
}

/**
 * Atomically reserves stock for every managed product in the order.
 * If one line cannot be reserved, the lines already decremented are restored
 * before returning, so the cart is never left half-reserved.
 */
export async function reserveStockForOrder(items: StockItem[]): Promise<ReserveStockResult> {
  const needed = aggregate(items);
  if (needed.size === 0) return { ok: true, reserved: [] };

  const products = await Product.find({
    id: { $in: [...needed.keys()] },
    manage_stock: true,
  })
    .select("id name manage_stock stock_quantity")
    .lean();

  const byId = new Map(products.map((product) => [product.id as number, product]));
  const reserved: ReservedStockItem[] = [];

  for (const [productId, need] of needed) {
    const product = byId.get(productId);
    if (!product || !product.manage_stock || typeof product.stock_quantity !== "number") {
      continue; // not managed, or quantity unset — nothing to reserve
    }

    const updated = (await Product.findOneAndUpdate(
      {
        id: productId,
        manage_stock: true,
        stock_quantity: { $gte: need.quantity },
      },
      { $inc: { stock_quantity: -need.quantity } },
      { new: true }
    )) as IProduct | null;

    if (!updated) {
      await restoreReservedItems(reserved);
      return {
        ok: false,
        reason: "insufficient-stock",
        item: { productId, name: product.name || need.name },
      };
    }

    await syncStockStatus(productId, updated.stock_quantity);
    reserved.push({ productId, quantity: need.quantity, name: product.name || need.name });
  }

  return { ok: true, reserved };
}

const ACTIVE_SHIPMENT_STATUSES = new Set([
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "partial_delivered",
]);

/**
 * Restores stock for an order exactly once.
 * The atomic `stockReleasedAt` claim makes concurrent failure webhooks safe.
 *
 * Pass `options.skipIfShipped = true` when called from automated cancellation
 * or return status transitions so parcels that are already with the courier
 * or delivered are not restocked until physical receipt is confirmed.
 */
export async function releaseStockForOrder(
  order: IOrder,
  options?: { skipIfShipped?: boolean }
): Promise<{ released: boolean; reason?: string }> {
  const skipIfShipped = options?.skipIfShipped ?? true;
  if (
    skipIfShipped &&
    order.shipmentStatus &&
    ACTIVE_SHIPMENT_STATUSES.has(String(order.shipmentStatus).toLowerCase())
  ) {
    return { released: false, reason: "shipment_active" };
  }

  const claimed = await Order.findOneAndUpdate(
    {
      _id: order._id,
      stockReservedAt: { $exists: true, $ne: null },
      $or: [{ stockReleasedAt: null }, { stockReleasedAt: { $exists: false } }],
    },
    { $set: { stockReleasedAt: new Date() } },
    { new: true }
  );

  if (!claimed) return { released: false };

  try {
    const needed = aggregate(
      (claimed.items || []).map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        name: item.name,
      }))
    );
    const products = await Product.find({
      id: { $in: [...needed.keys()] },
      manage_stock: true,
    })
      .select("id stock_quantity")
      .lean();
    const managed = new Set(products.map((product) => product.id as number));

    await restoreReservedItems(
      [...needed.entries()]
        .filter(([productId]) => managed.has(productId))
        .map(([productId, need]) => ({
          productId,
          quantity: need.quantity,
          name: need.name,
        }))
    );

    return { released: true };
  } catch (error) {
    // Allow a later retry if the product updates failed.
    await Order.updateOne({ _id: order._id }, { $set: { stockReleasedAt: null } });
    throw error;
  }
}

/** Marks reserved stock as committed (payment collected / COD delivered). */
export async function commitStockForOrder(order: IOrder): Promise<{ committed: boolean }> {
  const result = await Order.updateOne(
    {
      _id: order._id,
      stockReservedAt: { $exists: true, $ne: null },
      $and: [
        { $or: [{ stockCommittedAt: null }, { stockCommittedAt: { $exists: false } }] },
        { $or: [{ stockReleasedAt: null }, { stockReleasedAt: { $exists: false } }] },
      ],
    },
    { $set: { stockCommittedAt: new Date() } }
  );
  return { committed: Boolean(result.modifiedCount) };
}
