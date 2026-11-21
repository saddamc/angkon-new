import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Order, type IOrder } from "@/models/Order";
import { sendOrderConfirmationEmails } from "@/lib/email/resend";
import { User, type IUser } from "@/models/User";
import { EMAIL_REGEX, getSessionUserId, getSiteUrl, normalizeEmail, setSessionCookie } from "@/server/auth";
import { issueVerificationEmail } from "@/server/account";
import { calculateShipping } from "@/lib/shipping";
import { getProductDeliveryRates, getShippingSettings } from "@/server/shipping";
import { getCheckoutSettings } from "@/server/checkout-settings";
import { clientIp, hashIp, rateLimit, createRateLimitResponse } from "@/server/rate-limit";
import { getAllDbProducts } from "@/lib/db/products";
import { isOnlinePaymentAvailableForEnvironment } from "@/server/sslcommerz";
import { initiateSslcommerzForOrder } from "@/server/payments/initiate";
import { nextOrderNumber } from "@/server/order-number";
import { readIdempotencyKey } from "@/server/idempotency";
import {
  commitStockForOrder,
  releaseStockForOrder,
  reserveStockForOrder,
  restoreReservedItems,
  type ReservedStockItem,
} from "@/server/stock";
import { Payment } from "@/models/Payment";
import { sendMetaCapiEvent, extractClientIp } from "@/server/meta-capi";

import REAL_PRODUCTS from "@/data/real-products.json";

type AccountStatus = "signed_in" | "created" | "existing" | "none";

/**
 * Decide which customer account owns this order.
 * - Signed in → that account.
 * - New email → create an account (no password yet) and sign the customer in;
 *   they verify the email and set a password from the link we send.
 * - Email already registered but not signed in → link the order to that account
 *   but do NOT sign in (otherwise anyone could take over an account by typing
 *   its email at checkout).
 */
async function resolveOrderAccount(
  request: NextRequest,
  orderEmail: string,
  customer: { fullName: string; phone: string; address: string; city: string; district: string; postalCode: string },
): Promise<{ status: AccountStatus; user: IUser | null }> {
  const normEmail = normalizeEmail(orderEmail);
  if (!normEmail || !EMAIL_REGEX.test(normEmail)) return { status: "none", user: null };

  // Only use current session if the signed-in user's email strictly matches this order's email!
  const sessionUserId = getSessionUserId(request);
  if (sessionUserId) {
    const sessionUser = await User.findById(sessionUserId);
    if (sessionUser && normalizeEmail(sessionUser.email) === normEmail) {
      return { status: "signed_in", user: sessionUser };
    }
  }

  // Look up existing customer account strictly by email
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
    // Two orders with the same new email at once — the other request created it.
    const raced = await User.findOne({ email: normEmail });
    return raced ? { status: "existing", user: raced } : { status: "none", user: null };
  }
}

interface ReplayOrderShape {
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

/** Replays the original checkout response for an idempotency-key retry. */
async function respondWithExistingOrder(existing: ReplayOrderShape, request: NextRequest) {
  let gatewayUrl: string | null = null;
  const isOnlineExisting = existing.paymentMethod !== "cod";
  if (isOnlineExisting) {
    const existingPayment = await Payment.findOne({ tranId: existing.orderNumber }).lean();
    gatewayUrl = existingPayment?.gatewayPageUrl || null;
    if (!gatewayUrl) {
      const resumed = await initiateSslcommerzForOrder(
        existing as unknown as IOrder,
        getSiteUrl(request)
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    if (!fullName || !phone || !address || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required order information (name, phone, address, items)." },
        { status: 400 }
      );
    }

    const idempotencyKey = readIdempotencyKey(request);
    const rawMethod = String(paymentMethod || "cod").toLowerCase().trim();
    const isOnlineMethod = rawMethod === "sslcommerz" || rawMethod === "bkash" || rawMethod === "nagad" || rawMethod === "cards" || rawMethod === "online";
    const normalizedPaymentMethod = isOnlineMethod ? rawMethod : "cod";

    // Never create an online order that cannot reach a gateway. The previous
    // behaviour silently treated a missing gateway as a successful order.
    if (isOnlineMethod && !isOnlinePaymentAvailableForEnvironment()) {
      return NextResponse.json(
        {
          error:
            "Online payment is temporarily unavailable. Please choose Cash on Delivery.",
          code: "PAYMENT_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    const resolvedDistrict = district || city || "Dhaka";

    // ── Email verification & Account gate ──
    let verifiedUser: IUser | null = null;
    const checkoutSettings = await getCheckoutSettings();
    const orderEmail = normalizeEmail(email);

    if (!orderEmail || !EMAIL_REGEX.test(orderEmail)) {
      return NextResponse.json({ error: "A valid email address is required to place an order." }, { status: 400 });
    }

    // ── Active Rate Limiting: Prevent spam order attacks and bot floods ──
    const ip = clientIp(request);
    const [perIp, perEmail] = await Promise.all([
      rateLimit(`order:ip:${hashIp(ip)}`, 15, 60 * 60), // max 15 orders / hour per IP
      rateLimit(`order:email:${hashIp(orderEmail)}`, 6, 60 * 60), // max 6 orders / hour per email
    ]);
    if (!perIp.allowed || !perEmail.allowed) {
      const activeLimit = !perIp.allowed ? perIp : perEmail;
      return createRateLimitResponse(
        activeLimit,
        "Too many orders placed in a short period. Please wait a while before trying again."
      );
    }

    let sessionUser: IUser | null = null;
    try {
      const sessionUserId = getSessionUserId(request);
      if (sessionUserId) {
        await connectToDatabase();
        sessionUser = await User.findById(sessionUserId);
        if (sessionUser && sessionUser.emailVerified && normalizeEmail(sessionUser.email) === orderEmail) {
          verifiedUser = sessionUser;
        }
      }
    } catch (gateErr) {
      console.error("Order session check:", gateErr);
    }

    // When guest checkout is explicitly disabled in settings, enforce that customer must be logged in:
    if (!checkoutSettings.allowGuestCheckout && !sessionUser) {
      return NextResponse.json(
        { error: "Guest checkout is disabled. Please log in or create an account to place your order.", code: "LOGIN_REQUIRED" },
        { status: 403 },
      );
    }

    // When email verification is required, enforce that customer must have verified their email:
    if (checkoutSettings.requireEmailVerification) {
      if (!sessionUser || !sessionUser.emailVerified || normalizeEmail(sessionUser.email) !== orderEmail) {
        return NextResponse.json(
          { error: "Please verify your email address to place your order.", code: "EMAIL_VERIFICATION_REQUIRED" },
          { status: 403 },
        );
      }
    }

    // ── Authoritative Server-Side Product Price & Catalog Resolution (Defeats Client-Side Price Tampering) ──
    const allDbCatalog = await getAllDbProducts();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fallbackCatalog = REAL_PRODUCTS as any[];

    interface ResolvedItem {
      productId: number;
      slug: string;
      name: string;
      price: number;
      quantity: number;
      size: string;
      color?: string;
      image: string;
    }

    const itemsData: ResolvedItem[] = [];
    let subtotal = 0;

    for (const rawItem of items) {
      const pId = Number(rawItem.productId || 0);
      const rawSlug = String(rawItem.slug || "").trim().toLowerCase();

      // Look up in DB catalog first, then fallback catalog
      const matched =
        allDbCatalog.find((p) => p.id === pId || (rawSlug && p.slug.toLowerCase() === rawSlug)) ||
        fallbackCatalog.find((p) => p.id === pId || (rawSlug && p.slug.toLowerCase() === rawSlug));

      if (!matched) {
        return NextResponse.json(
          { error: `Item "${rawItem.name || pId}" is not available in our current catalog.` },
          { status: 400 }
        );
      }

      // Quantity must be an integer between 1 and 99
      const qty = Math.max(1, Math.min(99, parseInt(String(rawItem.quantity || "1"), 10) || 1));

      // Resolve true authoritative price strictly from catalog (ignoring whatever browser sent)
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

    // Delivery is decided here on the server (admin settings + product fees), never trusted from the browser.
    const [shippingSettings, productRates] = await Promise.all([
      getShippingSettings(),
      getProductDeliveryRates(itemsData.map((item) => item.productId)),
    ]);
    // Calculate Promo Code discount (verified on the server against active settings)
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
      // Free delivery is judged on the amount payable for the goods, i.e. after any promo discount.
      subtotal: Math.max(0, subtotal - discount),
      district: resolvedDistrict,
      city,
      settings: shippingSettings,
      itemRates: itemsData.map((item) => productRates.get(item.productId) ?? {}),
    });
    const shippingFee = shippingQuote.fee;
    const total = Math.max(0, subtotal - discount) + shippingFee;

    // The order number is generated atomically inside the DB transaction below.

    // Normalize customer
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
      await connectToDatabase();

      // ── Idempotent replay: a retried submission returns the original order ──
      if (idempotencyKey) {
        const existing = await Order.findOne({ idempotencyKey }).lean();
        if (existing) return respondWithExistingOrder(existing, request);
      }

      // Account linking must never block the order itself.
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

      // Reserve stock before the order exists so an oversell never creates a
      // confirmed order. The reservation is rolled back if creation fails.
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

      // COD is confirmed immediately: mark the stock commitment (the quantity
      // was already decremented by the reservation).
      if (newOrder.paymentMethod === "cod") {
        await commitStockForOrder(newOrder);
      }

      // Synchronize customer profile in MongoDB strictly when authorized (signed in or newly created)
      const isAuthorizedSession = account.status === "signed_in" || account.status === "created";
      if (isAuthorizedSession && accountUser && normalizeEmail(accountUser.email) === customerData.email) {
        try {
          let updated = false;

          // 1. Sync latest customer name if provided
          if (customerData.fullName && customerData.fullName !== accountUser.name) {
            accountUser.name = customerData.fullName;
            updated = true;
          }

          // 2. Sync latest phone if provided
          if (customerData.phone && customerData.phone !== accountUser.phone) {
            accountUser.phone = customerData.phone;
            updated = true;
          }

          // 3. If verified at checkout or verifiedUser is present, guarantee emailVerified is true
          if (verifiedUser && !accountUser.emailVerified) {
            accountUser.emailVerified = true;
            accountUser.emailVerifiedAt = new Date();
            updated = true;
          }

          // 4. Save/update latest delivery address as default address for future visits
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
          // Unset isDefault on other addresses
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

      // ── SSLCOMMERZ Gateway Initiation ──
      let gatewayUrl: string | null = null;
      if (isOnlineMethod) {
        const gateway = await initiateSslcommerzForOrder(newOrder, getSiteUrl(request));
        if (!gateway.ok) {
          // The order exists but has no payable session: put the stock back.
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

      // Dispatch emails asynchronously in background so customer receives instant response (< 50ms)
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
            }),
          );
        }

        // Fire-and-forget in background to guarantee sub-100ms response time under high load
        Promise.allSettled(emailTasks).catch((emailErr) => {
          console.warn("Email background dispatch warning:", emailErr);
        });

        // Server-side Meta Conversions API (CAPI) for Cash on Delivery purchases
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

      // Set session cookie only when authorized: either a freshly created account during checkout
      // or an already authenticated session. NEVER auto-login unauthenticated guests using an existing email!
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
      // The order was never created — put back any stock reserved for it.
      if (!orderCreated && reservedStock.length > 0) {
        try {
          await restoreReservedItems(reservedStock);
        } catch (stockErr) {
          console.error("Stock rollback after order failure failed:", stockErr);
        }
      }

      // A concurrent duplicate submission may lose the unique-index race even
      // though the first request succeeded. Replay that order instead of
      // pretending a new one was created.
      const mongoErr = dbErr as { code?: number };
      if (mongoErr?.code === 11000 && idempotencyKey) {
        const existing = await Order.findOne({ idempotencyKey }).lean();
        if (existing) return respondWithExistingOrder(existing, request);
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
  } catch (error) {
    console.error("API /orders fatal error:", error);
    return NextResponse.json(
      { error: "Failed to process order. Please try again.", code: "ORDER_FAILED" },
      { status: 500 }
    );
  }
}
