import { getSslcommerzConfig } from "./config";
import { SslcommerzClient } from "./client";
import type { SslcommerzSessionInput, SslcommerzSessionResponse } from "./types";
import { PaymentError } from "../../payment-errors";

export async function createSslcommerzSession(
  input: SslcommerzSessionInput
): Promise<SslcommerzSessionResponse> {
  const config = getSslcommerzConfig();

  if (!config.isConfigured) {
    throw new PaymentError(
      "SSLCOMMERZ store credentials are not configured.",
      "PAYMENT_GATEWAY_NOT_CONFIGURED",
      503
    );
  }

  const formattedAmount = (Math.round(input.totalAmount * 100) / 100).toFixed(2);

  const payload: Record<string, string> = {
    store_id: config.storeId,
    store_passwd: config.storePasswd,
    total_amount: formattedAmount,
    currency: "BDT",
    tran_id: input.tranId,
    success_url: input.successUrl,
    fail_url: input.failUrl,
    cancel_url: input.cancelUrl,
    ipn_url: input.ipnUrl,
    shipping_method: "NO",
    product_name: "ANGKON Luxury Apparel",
    product_category: "Apparel",
    product_profile: "physical-goods",
    cus_name: input.customer.fullName || "Valued Customer",
    cus_email: input.customer.email || "support@angkon.com",
    cus_add1: input.customer.address || "Dhaka, Bangladesh",
    cus_city: input.customer.city || input.customer.district || "Dhaka",
    cus_state: input.customer.district || "Dhaka",
    cus_postcode: input.customer.postalCode || "1200",
    cus_country: "Bangladesh",
    cus_phone: input.customer.phone || "01700000000",
    ship_name: input.customer.fullName || "Valued Customer",
    ship_add1: input.customer.address || "Dhaka, Bangladesh",
    ship_city: input.customer.city || input.customer.district || "Dhaka",
    ship_state: input.customer.district || "Dhaka",
    ship_postcode: input.customer.postalCode || "1200",
    ship_country: "Bangladesh",
    ...(input.multiCardName ? { multi_card_name: input.multiCardName } : {}),
  };

  const response = await SslcommerzClient.postForm<SslcommerzSessionResponse>(
    config.sessionUrl,
    payload
  );

  return response;
}
