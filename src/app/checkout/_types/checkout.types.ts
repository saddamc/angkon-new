export interface CheckoutFormValues {
  name: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  email: string;
  streetAddress: string;
  district: string;
  city: string;
  postcode?: string;
  orderNotes?: string;
  deliveryMethod?: "home" | "pickup";
  pickupLocation?: string;
  policyAccepted?: boolean;
}

export interface CheckoutConfig {
  requireEmailVerification: boolean;
  allowGuestCheckout?: boolean;
  enablePromoCodes?: boolean;
  /** True only when the gateway credentials are configured server-side. */
  onlinePaymentAvailable?: boolean;
  user: {
    name: string;
    email: string;
    phone: string;
    emailVerified: boolean;
    address?: { address: string; city: string; district: string; postalCode?: string };
  } | null;
}

export interface AppliedPromo {
  code: string;
  discount: number;
  description?: string;
}

export interface ConfirmedCustomer {
  name: string;
  phone: string;
  address: string;
}

export interface AccountInfo {
  status: "signed_in" | "created" | "existing" | "none";
  email: string;
  emailVerified: boolean;
}

export interface VerifyDialogState {
  email: string;
  name: string;
  phone: string;
  resendAfter: number;
}

export type CheckoutPaymentMethod = "cod" | "sslcommerz" | "bkash" | "nagad" | "cards";
