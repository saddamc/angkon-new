export interface SslcommerzCustomerPayload {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postalCode?: string;
}

export interface SslcommerzSessionInput {
  tranId: string;
  totalAmount: number;
  customer: SslcommerzCustomerPayload;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
  multiCardName?: string;
}

export interface SslcommerzSessionResponse {
  status: "SUCCESS" | "FAILED" | string;
  failedreason?: string;
  sessionkey?: string;
  GatewayPageURL?: string;
  storeBanner?: string;
  storeLogo?: string;
  desc?: string[];
  is_direct_pay_enable?: string;
}

export interface SslcommerzValidationResponse {
  status: string;
  tran_date?: string;
  tran_id?: string;
  val_id?: string;
  amount?: string;
  store_amount?: string;
  currency?: string;
  currency_type?: string;
  bank_tran_id?: string;
  card_type?: string;
  card_no?: string;
  card_issuer?: string;
  card_brand?: string;
  card_issuer_country?: string;
  currency_amount?: string;
  risk_level?: string | number;
  risk_title?: string;
  APIConnect?: string;
  error?: string;
}

export interface SslcommerzQueryResponse {
  APIConnect?: string;
  status?: string;
  total_records?: number;
  element?: SslcommerzValidationResponse[] | SslcommerzValidationResponse;
}

export interface SslcommerzRefundInitiateResponse {
  APIConnect?: string;
  status: "success" | "failed" | string;
  refund_ref_id?: string;
  errorReason?: string;
}

export interface SslcommerzRefundQueryResponse {
  APIConnect?: string;
  bank_tran_id?: string;
  trans_id?: string;
  initiated_on?: string;
  refunded_on?: string;
  status: "refunded" | "processing" | "cancelled" | string;
  refund_ref_id?: string;
  errorReason?: string;
}
