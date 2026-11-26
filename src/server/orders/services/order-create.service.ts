import { NextRequest, NextResponse } from "next/server";
import { Order, type IOrder } from "@/models/Order";
import { User, type IUser } from "@/models/User";
import { Payment } from "@/models/Payment";
import { EMAIL_REGEX, getSessionUserId, getSiteUrl, normalizeEmail, setSessionCookie } from "@/server/auth/auth";
import { issueVerificationEmail } from "@/server/auth/account";
import { calculateShipping } from "@/lib/shipping";
import { getProductDeliveryRates, getShippingSettings } from "@/server/settings/shipping";
import { getCheckoutSettings } from "@/server/settings/checkout-settings";
import { getAllDbProducts } from "@/lib/db/products";
import { initiateSslcommerzForOrder } from "@/server/payments/initiate";
import { getPaymentCallbackBaseUrl } from "@/server/payments/config/sslcommerz";
import {
  COD_PAYMENT_METHOD,
  isOnlinePaymentMethod,
  normalizePaymentMethod,
} from "@/lib/payment-methods";
import { nextOrderNumber } from "../order-number";
import {
  commitStockForOrder,
  releaseStockForOrder,
  reserveStockForOrder,
  restoreReservedItems,
  type ReservedStockItem,
} from "@/server/products/stock";
import { sendMetaCapiEvent, extractClientIp } from "@/server/meta/capi/meta-capi";
import { sendOrderConfirmationEmails } from "@/lib/email/resend";
import REAL_PRODUCTS from "@/data/real-products.json";

export type AccountStatus = "signed_in" | "created" | "existing" | "none";

export interface ReplayOrderShape {
  orderNumber: string;
  paymentMethod: string;
  shippingFee: number;
  subtotal: number;
  discount?: number | null;
  promoCode?: string | null;
  total: number;
  customer: { email?: string };
  userId?: unknown;
}

export async function resolveOrderAccount(
  request: NextRequest,
  orderEmail: string,
  customer: { fullName: string; phone: string; address: string; city: string; district: string; postalCode: string }
): Promise<{ status: AccountStatus; user: IUser | null }> {
  const normEmail = normalizeEmail(orderEmail);
  if (!normEmail || !EMAIL_REGEX.test(normEmail)) return { status: "none", user: null };

  const sessionUserId = getSessionUserId(request);
  if (sessionUserId) {
    const sessionUser = await User.findById(sessionUserId);
    if (sessionUser && normalizeEmail(sessionUser.email) === normEmail) {
      return { status: "signed_in", user: sessionUser };
    }
  }

  const existing = await User.findOne({ email: normEmail });
  if (existing) return { status: "existing", user: existing };

  try {
    const created = await User.create({
      name: customer.fullName,
      email: normEmail,
      password: "",
      phone: customer.phone,
      role: "customer",
      emailVerified: false,
      source: "checkout",
      addresses: [{ ...customer, isDefault: true }],
    });
    return { status: "created", user: created };
  } catch {
    const raced = await User.findOne({ email: normEmail });
    return raced ? { status: "existing", user: raced } : { status: "none", user: null };
  }
}

export async function respondWithExistingOrder(existing: ReplayOrderShape, request: NextRequest) {
  let gatewayUrl: string | null = null;
  const isOnlineExisting = existing.paymentMethod !== "cod";
  if (isOnlineExisting) {
    const existingPayment = await Payment.findOne({ tranId: existing.orderNumber }).lean();
    gatewayUrl = existingPayment?.gatewayPageUrl || null;
    if (!gatewayUrl) {
      const resumed = await initiateSslcommerzForOrder(
        existing as unknown as IOrder,
        getPaymentCallbackBaseUrl()
      );
      if (resumed.ok) gatewayUrl = resumed.gatewayUrl;
    }
  }

  let existingVerified = false;
  if (existing.userId) {
    const existingUser = await User.findById(existing.userId as string)
      .select("emailVerified")
      .lean();
    existingVerified = Boolean(existingUser?.emailVerified);
  }

  return NextResponse.json(
    {
      orderId: existing.orderNumber,
      orderNumber: existing.orderNumber,
      shippingFee: existing.shippingFee,
      subtotal: existing.subtotal,
      discount: existing.discount ?? 0,
      promoCode: existing.promoCode || "",
      total: existing.total,
      status: "success",
      gatewayUrl,
      idempotent: true,
      account: {
        status: existing.userId ? "signed_in" : "none",
        email: existing.customer.email || "",
        emailVerified: existingVerified,
      },
    },
    { status: 200 }
  );
}

export interface ResolvedCustomerOrderItem {
  productId: number;
  slug: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  color?: string;
  image: string;
}

export interface ProcessCustomerOrderParams {
  request: NextRequest;
  body: Record<string, any>;
  idempotencyKey?: string | null;
}

export async function processCustomerOrder({
  request,
  body,
  idempotencyKey,
}: ProcessCustomerOrderParams): Promise<NextResponse> {
  const {
    fullName,
    email,
    phone,
    address,
    city,
    district,
    postalCode,
    orderNotes,
    paymentMethod = "cod",
    items = [],
  } = body;

  const testEventCode =
    (typeof body.testEventCode === "string" && body.testEventCode.trim() ? body.testEventCode.trim() : undefined) ||
    request.headers.get("x-meta-test-code")?.trim() ||
    undefined;
  const fbp =
    (typeof body.fbp === "string" && body.fbp.trim() ? body.fbp.trim() : undefined) ||
    request.cookies.get("_fbp")?.value;
  const fbc =
    (typeof body.fbc === "string" && body.fbc.trim() ? body.fbc.trim() : undefined) ||
    request.cookies.get("_fbc")?.value;

  const isOnlineMethod = isOnlinePaymentMethod(paymentMethod);
  const normalizedPaymentMethod = isOnlineMethod
    ? normalizePaymentMethod(paymentMethod)
    : COD_PAYMENT_METHOD;

  const resolvedDistrict = district || city || "Dhaka";
  const orderEmail = normalizeEmail(email);

  // Verification & Account gate
  let verifiedUser: IUser | null = null;
  const checkoutSettings = await getCheckoutSettings();

  let sessionUser: IUser | null = null;
  try {
    const sessionUserId = getSessionUserId(request);
    if (sessionUserId) {
      sessionUser = await User.findById(sessionUserId);
      if (sessionUser && sessionUser.emailVerified && normalizeEmail(sessionUser.email) === orderEmail) {
        verifiedUser = sessionUser;
      }
    }
  } catch (gateErr) {
    console.error("Order session check:", gateErr);
  }

  if (!checkoutSettings.allowGuestCheckout && !sessionUser) {
    return NextResponse.json(
      { error: "Guest checkout is disabled. Please log in or create an account to place your order.", code: "LOGIN_REQUIRED" },
      { status: 403 }
    );
  }

  if (checkoutSettings.requireEmailVerification) {
    if (!sessionUser || !sessionUser.emailVerified || normalizeEmail(sessionUser.email) !== orderEmail) {
      return NextResponse.json(
        { error: "Please verify your email address to place your order.", code: "EMAIL_VERIFICATION_REQUIRED" },
        { status: 403 }
      );
    }
  }

  // Authoritative catalog resolution
  const allDbCatalog = await getAllDbProducts();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fallbackCatalog = REAL_PRODUCTS as any[];

  const itemsData: ResolvedCustomerOrderItem[] = [];
  let subtotal = 0;

  for (const rawItem of items) {
    const pId = Number(rawItem.productId || 0);
    const rawSlug = String(rawItem.slug || "").trim().toLowerCase();

    const matched =
      allDbCatalog.find((p) => p.id === pId || (rawSlug && p.slug.toLowerCase() === rawSlug)) ||
      fallbackCatalog.find((p) => p.id === pId || (rawSlug && p.slug.toLowerCase() === rawSlug));

    if (!matched) {
      return NextResponse.json(
        { error: `Item "${rawItem.name || pId}" is not available in our current catalog.` },
        { status: 400 }
      );
    }

    const qty = Math.max(1, Math.min(99, parseInt(String(rawItem.quantity || "1"), 10) || 1));
    const rawPriceStr = String(matched.price || matched.sale_price || matched.regular_price || "0").trim();
    const unitPrice = parseFloat(rawPriceStr);
    if (isNaN(unitPrice) || unitPrice <= 0) {
      return NextResponse.json(
        { error: `Invalid pricing for item "${matched.name}". Please contact support.` },
        { status: 400 }
      );
    }

    subtotal += unitPrice * qty;

    let resolvedImage = rawItem.image ? String(rawItem.image) : "";
    if (!resolvedImage && Array.isArray(matched.images) && matched.images[0]?.src) {
      resolvedImage = matched.images[0].src;
    }

    itemsData.push({
      productId: matched.id,
      slug: matched.slug,
      name: matched.name,
      price: unitPrice,
      quantity: qty,
      size: rawItem.size ? String(rawItem.size).trim() : "",
      color: rawItem.color ? String(rawItem.color).trim() : "",
      image: resolvedImage,
    });
  }

  const [shippingSettings, productRates] = await Promise.all([
    getShippingSettings(),
    getProductDeliveryRates(itemsData.map((item) => item.productId)),
  ]);

  let discount = 0;
  const submittedPromo = String(body.promoCode || "").trim().toUpperCase();
  if (submittedPromo && checkoutSettings.enablePromoCodes) {
    const match = checkoutSettings.promoCodes.find((p) => p.code.toUpperCase() === submittedPromo);
    if (match && match.active) {
      if (!match.minSpend || subtotal >= match.minSpend) {
        if (match.type === "percentage") {
          discount = Math.round((subtotal * match.value) / 100);
        } else {
          discount = Math.min(subtotal, match.value);
        }
      }
    }
  }

  const shippingQuote = calculateShipping({
    subtotal: Math.max(0, subtotal - discount),
    district: resolvedDistrict,
    city,
    settings: shippingSettings,
    itemRates: itemsData.map((item) => productRates.get(item.productId) ?? {}),
  });
  const shippingFee = shippingQuote.fee;
  const total = Math.max(0, subtotal - discount) + shippingFee;

  const customerData = {
    fullName: String(fullName).trim(),
    email: normalizeEmail(email),
    phone: String(phone).trim(),
    address: String(address).trim(),
    city: String(city || resolvedDistrict).trim(),
    district: String(resolvedDistrict).trim(),
    postalCode: postalCode ? String(postalCode).trim() : "",
  };

  let reservedStock: ReservedStockItem[] = [];
  let orderCreated = false;

  try {
    if (idempotencyKey) {
      const existing = await Order.findOne({ idempotencyKey }).lean();
      if (existing) return respondWithExistingOrder(existing as unknown as ReplayOrderShape, request);
    }

    let account: { status: AccountStatus; user: IUser | null } = { status: "none", user: null };
    try {
      account =
        verifiedUser && normalizeEmail(verifiedUser.email) === customerData.email
          ? { status: "signed_in", user: verifiedUser }
          : await resolveOrderAccount(request, customerData.email, customerData);
    } catch (accountErr) {
      console.warn("Order account linking failed (order still placed):", accountErr);
    }
    const accountUser = account.user;

    const orderClientIp = extractClientIp(request) || "";
    const orderUserAgent = request.headers.get("user-agent") || "";

    const reservation = await reserveStockForOrder(itemsData);
    if (!reservation.ok) {
      return NextResponse.json(
        {
          error: reservation.item
            ? `${reservation.item.name} does not have enough stock for the requested quantity.`
            : "One or more items are out of stock.",
          code: "OUT_OF_STOCK",
          item: reservation.item || null,
        },
        { status: 409 }
      );
    }
    reservedStock = reservation.reserved;

    const orderNumber = await nextOrderNumber();

    const newOrder = await Order.create({
      orderNumber,
      idempotencyKey: idempotencyKey || undefined,
      userId: accountUser?._id ?? null,
      customer: customerData,
      visitorContext: {
        clientIp: orderClientIp,
        clientUserAgent: orderUserAgent,
        fbp: fbp || "",
        fbc: fbc || "",
        recordedAt: new Date(),
      },
      items: itemsData,
      subtotal,
      discount,
      promoCode: discount > 0 ? submittedPromo : "",
      shippingFee,
      total,
      paymentMethod: normalizedPaymentMethod,
      paymentStatus: normalizedPaymentMethod === "cod" ? "unpaid" : "pending",
      paidAmount: 0,
      expectedCodAmount: normalizedPaymentMethod === "cod" ? total : 0,
      collectedCodAmount: 0,
      settledCodAmount: 0,
      courierCharge: 0,
      codSettlementStatus: normalizedPaymentMethod === "cod" ? "expected" : "none",
      shipmentBookingState: "not_booked",
      orderStatus: normalizedPaymentMethod === "cod" ? "confirmed" : "pending",
      policyVersion: typeof body.policyVersion === "string" && body.policyVersion.trim() ? body.policyVersion.trim() : "2026.1",
      policyAcceptedAt: body.policyAccepted === false ? null : new Date(),
      statusHistory: [
        {
          status: normalizedPaymentMethod === "cod" ? "confirmed" : "pending",
          previousStatus: "",
          actor: "customer",
          note: `Order created (${normalizedPaymentMethod.toUpperCase()})`,
          source: "checkout",
          at: new Date(),
        },
      ],
      stockReservedAt: reservedStock.length ? new Date() : null,
      notes: orderNotes ? String(orderNotes).trim() : "",
    });

    orderCreated = true;

    if (newOrder.paymentMethod === "cod") {
      await commitStockForOrder(newOrder);
    }

    const isAuthorizedSession = account.status === "signed_in" || account.status === "created";
    if (isAuthorizedSession && accountUser && normalizeEmail(accountUser.email) === customerData.email) {
      try {
        let updated = false;
        if (customerData.fullName && customerData.fullName !== accountUser.name) {
          accountUser.name = customerData.fullName;
          updated = true;
        }
        if (customerData.phone && customerData.phone !== accountUser.phone) {
          accountUser.phone = customerData.phone;
          updated = true;
        }
        if (verifiedUser && !accountUser.emailVerified) {
          accountUser.emailVerified = true;
          accountUser.emailVerifiedAt = new Date();
          updated = true;
        }

        const newAddr = {
          fullName: customerData.fullName,
          phone: customerData.phone,
          address: customerData.address,
          city: customerData.city,
          district: customerData.district,
          postalCode: customerData.postalCode || "",
          isDefault: true,
        };

        const currentAddresses = Array.isArray(accountUser.addresses) ? [...accountUser.addresses] : [];
        currentAddresses.forEach((a) => {
          a.isDefault = false;
        });

        const normAddress = newAddr.address.toLowerCase().trim();
        const normDistrict = newAddr.district.toLowerCase().trim();
        const matchIdx = currentAddresses.findIndex(
          (a) => a.address.toLowerCase().trim() === normAddress && a.district.toLowerCase().trim() === normDistrict
        );

        if (matchIdx >= 0) {
          currentAddresses[matchIdx] = newAddr;
        } else {
          currentAddresses.unshift(newAddr);
        }

        accountUser.addresses = currentAddresses.slice(0, 10);
        updated = true;

        if (updated) {
          await accountUser.save();
        }
      } catch (profileErr) {
        console.warn("Could not synchronize customer profile:", profileErr);
      }
    }

    let gatewayUrl: string | null = null;
    if (isOnlineMethod) {
      const gateway = await initiateSslcommerzForOrder(newOrder, getPaymentCallbackBaseUrl());
      if (!gateway.ok) {
        await releaseStockForOrder(newOrder);
        await Order.updateOne(
          { _id: newOrder._id },
          {
            $set: {
              paymentStatus: "failed",
              failedAt: new Date(),
              orderStatus: "on-hold",
            },
          }
        );
        return NextResponse.json(
          {
            error: gateway.error
              ? `Online payment could not be started: ${gateway.error}. Please retry or choose Cash on Delivery.`
              : "Online payment could not be started. Please retry or choose Cash on Delivery.",
            code: "PAYMENT_INIT_FAILED",
            orderNumber: newOrder.orderNumber,
          },
          { status: 502 }
        );
      }
      gatewayUrl = gateway.gatewayUrl;
    }

    try {
      const emailTasks: Promise<unknown>[] = [
        sendOrderConfirmationEmails({
          orderNumber: newOrder.orderNumber,
          customer: customerData,
          items: itemsData,
          subtotal: newOrder.subtotal,
          shippingFee: newOrder.shippingFee,
          total: newOrder.total,
          paymentMethod: newOrder.paymentMethod,
          notes: newOrder.notes,
          createdAt: newOrder.createdAt,
        }).catch((emailErr) => {
          console.warn("Order confirmation email dispatch warning:", emailErr);
        }),
      ];

      if (account.status === "created" && accountUser) {
        emailTasks.push(
          issueVerificationEmail(accountUser, request, "checkout", newOrder.orderNumber).catch((err) => {
            console.warn("Checkout verification email failed:", err);
          })
        );
      }

      Promise.allSettled(emailTasks).catch((emailErr) => {
        console.warn("Email background dispatch warning:", emailErr);
      });

      if (newOrder.paymentMethod === "cod") {
        try {
          const nameParts = (customerData.fullName || "").trim().split(/\s+/);
          const firstName = nameParts[0] || customerData.fullName;
          const lastName = nameParts.slice(1).join(" ") || undefined;

          await sendMetaCapiEvent({
            eventName: "Purchase",
            eventId: `order_${newOrder.orderNumber}`,
            eventSourceUrl: `${getSiteUrl(request)}/checkout`,
            userData: {
              email: customerData.email,
              phone: customerData.phone,
              firstName,
              lastName,
              city: customerData.city,
              district: customerData.district,
              postalCode: customerData.postalCode,
              clientIp: extractClientIp(request),
              clientUserAgent: request.headers.get("user-agent") || undefined,
              fbp,
              fbc,
            },
            customData: {
              value: newOrder.total,
              currency: "BDT",
              order_id: newOrder.orderNumber,
              num_items: itemsData.reduce((acc, it) => acc + it.quantity, 0),
              content_ids: itemsData.map((it) => it.productId),
              content_type: "product",
              contents: itemsData.map((it) => ({
                id: String(it.productId),
                quantity: it.quantity,
                item_price: it.price,
              })),
            },
            testEventCode,
          });
        } catch (capiErr) {
          console.warn("[Meta CAPI] Server COD purchase dispatch error:", capiErr);
        }
      }
    } catch (emailErr) {
      console.warn("Email task dispatch warning:", emailErr);
    }

    const response = NextResponse.json(
      {
        orderId: newOrder.orderNumber,
        orderNumber: newOrder.orderNumber,
        shippingFee,
        subtotal,
        discount,
        promoCode: newOrder.promoCode,
        total,
        status: "success",
        gatewayUrl,
        account: {
          status: account.status,
          email: accountUser?.email ?? customerData.email,
          emailVerified: Boolean(accountUser?.emailVerified),
        },
      },
      { status: 201 }
    );

    if (isAuthorizedSession && accountUser && normalizeEmail(accountUser.email) === customerData.email) {
      setSessionCookie(response, {
        id: String(accountUser._id),
        email: accountUser.email,
        name: accountUser.name,
        role: accountUser.role,
      });
    }
    return response;
  } catch (dbErr) {
    if (!orderCreated && reservedStock.length > 0) {
      try {
        await restoreReservedItems(reservedStock);
      } catch (stockErr) {
        console.error("Stock rollback after order failure failed:", stockErr);
      }
    }

    const mongoErr = dbErr as { code?: number };
    if (mongoErr?.code === 11000 && idempotencyKey) {
      const existing = await Order.findOne({ idempotencyKey }).lean();
      if (existing) return respondWithExistingOrder(existing as unknown as ReplayOrderShape, request);
    }

    console.error("Order persistence failed:", dbErr);
    return NextResponse.json(
      {
        error: "We could not save your order. Please try again.",
        code: "ORDER_PERSIST_FAILED",
        retryable: true,
      },
      { status: 503 }
    );
  }
}
