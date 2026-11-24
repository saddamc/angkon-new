export interface OrderCustomerInput {
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  district: string;
  postalCode?: string;
}

export interface OrderItemInput {
  productId: number;
  name?: string;
  price?: number;
  quantity: number;
  size?: string;
  color?: string;
  image?: string;
}

export interface CreateOrderInput {
  customer: OrderCustomerInput;
  items: OrderItemInput[];
  paymentMethod: string;
  shippingCity: string;
  shippingFee?: number;
  promoCode?: string;
  discount?: number;
  notes?: string;
  idempotencyKey?: string;
}

export interface CreateAdminOrderInput {
  customer: OrderCustomerInput;
  items: Array<{
    productId: number;
    size?: string;
    color?: string;
    quantity: number;
    price?: number;
  }>;
  shippingCity: string;
  shippingFee?: number;
  paymentMethod?: string;
  paymentStatus?: "pending" | "paid";
  discount?: number;
  orderNotes?: string;
}

export function validateCustomerInput(input: unknown): {
  valid: boolean;
  errors: string[];
  data?: OrderCustomerInput;
} {
  const errors: string[] = [];
  if (!input || typeof input !== "object") {
    return { valid: false, errors: ["Customer information is required."] };
  }

  const c = input as Record<string, unknown>;
  const fullName = typeof c.fullName === "string" ? c.fullName.trim() : "";
  const phone = typeof c.phone === "string" ? c.phone.trim() : "";
  const address = typeof c.address === "string" ? c.address.trim() : "";
  const city = typeof c.city === "string" ? c.city.trim() : "";
  const district = typeof c.district === "string" ? c.district.trim() : city;
  const postalCode = typeof c.postalCode === "string" ? c.postalCode.trim() : "";
  const email = typeof c.email === "string" ? c.email.trim() : undefined;

  if (!fullName) errors.push("Full name is required.");
  if (!phone) errors.push("Phone number is required.");
  if (!address) errors.push("Street address is required.");
  if (!city) errors.push("City is required.");

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      fullName,
      phone,
      email,
      address,
      city,
      district,
      postalCode,
    },
  };
}

export function validateOrderItemsInput(items: unknown): {
  valid: boolean;
  errors: string[];
  data?: OrderItemInput[];
} {
  const errors: string[] = [];
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, errors: ["Order must contain at least one item."] };
  }

  const validatedItems: OrderItemInput[] = [];

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    if (!item || typeof item !== "object") {
      errors.push(`Item at index ${idx} is invalid.`);
      continue;
    }

    const productId = Number(item.productId);
    const quantity = Number(item.quantity);

    if (!Number.isFinite(productId) || productId <= 0) {
      errors.push(`Item at index ${idx} has an invalid productId.`);
    }

    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) {
      errors.push(`Item at index ${idx} quantity must be between 1 and 99.`);
    }

    validatedItems.push({
      productId,
      name: typeof item.name === "string" ? item.name.trim() : undefined,
      price: typeof item.price === "number" ? item.price : undefined,
      quantity: Math.min(99, Math.max(1, Math.floor(quantity))),
      size: typeof item.size === "string" ? item.size.trim() : undefined,
      color: typeof item.color === "string" ? item.color.trim() : undefined,
      image: typeof item.image === "string" ? item.image.trim() : undefined,
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], data: validatedItems };
}
