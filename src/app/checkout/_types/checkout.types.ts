export interface CheckoutFormValues {
  name: string;
  phone: string;
  email: string;
  streetAddress: string;
  district: string;
  city: string;
  postcode?: string;
  orderNotes?: string;
}

export interface CheckoutConfig {
  requireEmailVerification: boolean;
  allowGuestCheckout?: boolean;
  enablePromoCodes?: boolean;
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
