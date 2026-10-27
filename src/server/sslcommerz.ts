/**
 * ANGKON Luxury Apparel — SSLCOMMERZ Payment Gateway Integration
 * Supports Sandbox and Production live environments with bKash, Nagad, Rocket,
 * VISA, Mastercard, AMEX, and automated IPN verification.
 */

export interface SslcommerzInitParams {
  orderNumber: string;
  total: number;
  customer: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    district: string;
    postalCode?: string;
  };
  appBaseUrl: string;
}

export interface SslcommerzInitResult {
  success: boolean;
  gatewayUrl?: string | null;
  sessionKey?: string;
  simulated?: boolean;
  message?: string;
  error?: string;
}

export interface SslcommerzValidationResult {
  isValid: boolean;
  status: string;
  amount: number;
  tranId: string;
  valId: string;
  bankTranId?: string;
  cardType?: string;
  cardBrand?: string;
}

export async function initiateSslcommerzPayment(
  params: SslcommerzInitParams
): Promise<SslcommerzInitResult> {
  const storeId = process.env.SSLCOMMERZ_STORE_ID?.trim();
  const storePasswd = process.env.SSLCOMMERZ_STORE_PASSWORD?.trim();
  const isLive = process.env.SSLCOMMERZ_IS_LIVE === "true";

  // If merchant credentials are not configured, gracefully simulate or return pending payment
  if (!storeId || !storePasswd) {
    return {
      success: true,
      simulated: true,
      gatewayUrl: null,
      message: "SSLCOMMERZ credentials not configured in environment. Order recorded as pending online payment.",
    };
  }

  const endpoint = isLive
    ? "https://securepay.sslcommerz.com/gwprocess/v4/api.php"
    : "https://sandbox.sslcommerz.com/gwprocess/v4/api.php";

  const baseUrl = params.appBaseUrl.replace(/\/$/, "");

  const postData = new URLSearchParams({
    store_id: storeId,
    store_passwd: storePasswd,
    total_amount: Math.max(1, Math.round(params.total)).toString(),
    currency: "BDT",
    tran_id: params.orderNumber,
    success_url: `${baseUrl}/api/payment/sslcommerz/callback?status=success`,
    fail_url: `${baseUrl}/api/payment/sslcommerz/callback?status=fail`,
    cancel_url: `${baseUrl}/api/payment/sslcommerz/callback?status=cancel`,
    ipn_url: `${baseUrl}/api/payment/sslcommerz/ipn`,
    shipping_method: "NO",
    product_name: "ANGKON Luxury Apparel",
    product_category: "Apparel",
    product_profile: "physical-goods",
    cus_name: params.customer.fullName || "Valued Customer",
    cus_email: params.customer.email || "support@angkon.com",
    cus_add1: params.customer.address || "Dhaka, Bangladesh",
    cus_city: params.customer.city || params.customer.district || "Dhaka",
    cus_state: params.customer.district || "Dhaka",
    cus_postcode: params.customer.postalCode || "1200",
    cus_country: "Bangladesh",
    cus_phone: params.customer.phone || "01700000000",
    ship_name: params.customer.fullName || "Valued Customer",
    ship_add1: params.customer.address || "Dhaka, Bangladesh",
    ship_city: params.customer.city || params.customer.district || "Dhaka",
    ship_state: params.customer.district || "Dhaka",
    ship_postcode: params.customer.postalCode || "1200",
    ship_country: "Bangladesh",
  });

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: postData.toString(),
    });

    const data = await res.json();

    if (data.status === "SUCCESS" && data.GatewayPageURL) {
      return {
        success: true,
        gatewayUrl: data.GatewayPageURL,
        sessionKey: data.sessionkey,
      };
    }

    return {
      success: false,
      error: data.failedreason || "Payment gateway rejected initiation request.",
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Network error contacting SSLCOMMERZ gateway";
    return { success: false, error: msg };
  }
}

export async function validateSslcommerzTransaction(
  valId: string
): Promise<SslcommerzValidationResult> {
  const storeId = process.env.SSLCOMMERZ_STORE_ID?.trim();
  const storePasswd = process.env.SSLCOMMERZ_STORE_PASSWORD?.trim();
  const isLive = process.env.SSLCOMMERZ_IS_LIVE === "true";

  if (!storeId || !storePasswd) {
    return {
      isValid: false,
      status: "UNCONFIGURED",
      amount: 0,
      tranId: "",
      valId,
    };
  }

  const endpoint = isLive
    ? "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php"
    : "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php";

  const url = `${endpoint}?val_id=${encodeURIComponent(valId)}&store_id=${encodeURIComponent(
    storeId
  )}&store_passwd=${encodeURIComponent(storePasswd)}&format=json`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    const isValid = data.status === "VALID" || data.status === "VALIDATED";

    return {
      isValid,
      status: data.status || "INVALID",
      amount: parseFloat(data.amount || "0"),
      tranId: data.tran_id || "",
      valId: data.val_id || valId,
      bankTranId: data.bank_tran_id,
      cardType: data.card_type,
      cardBrand: data.card_brand,
    };
  } catch (error) {
    console.error("SSLCOMMERZ validation error:", error);
    return {
      isValid: false,
      status: "ERROR",
      amount: 0,
      tranId: "",
      valId,
    };
  }
}
