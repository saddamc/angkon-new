/**
 * Pure customer profile & delivery address validators shared across
 * API routes (`profile`, `addresses`) and `node --test` suites.
 */

export interface ValidatedAddressInput {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postalCode?: string;
  isDefault?: boolean;
}

export function normalizeAccountPhone(
  raw: unknown,
  options: { required?: boolean } = {}
): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (!trimmed) {
    if (options.required) {
      return { ok: false, error: "Mobile number is required." };
    }
    return { ok: true, value: "" };
  }

  const compact = trimmed.replace(/[\s\-().]/g, "");
  const bdMatch = compact.match(/^(?:\+?88)?(01[3-9]\d{8})$/);
  if (bdMatch) {
    return { ok: true, value: bdMatch[1] };
  }

  const digits = compact.replace(/\D/g, "");
  if (!/^[+\d][\d\-()\s]{6,20}$/.test(trimmed) || digits.length < 8 || digits.length > 16) {
    return {
      ok: false,
      error: "Please enter a valid mobile number (e.g. 01712345678).",
    };
  }
  return { ok: true, value: trimmed };
}

export function validateAccountProfileInput(raw: Record<string, unknown>, fallbackName = "") {
  const nameRaw = typeof raw.name === "string" ? raw.name.trim().replace(/\s+/g, " ") : fallbackName;
  if (!nameRaw || nameRaw.length < 2 || nameRaw.length > 80) {
    return {
      ok: false as const,
      code: "INVALID_NAME" as const,
      error: "Full name must be between 2 and 80 characters.",
    };
  }

  const parsedPhone =
    raw.phone !== undefined ? normalizeAccountPhone(raw.phone, { required: false }) : { ok: true as const, value: "" };
  if (!parsedPhone.ok) {
    return {
      ok: false as const,
      code: "INVALID_PHONE" as const,
      error: parsedPhone.error,
    };
  }

  return {
    ok: true as const,
    name: nameRaw,
    phone: raw.phone !== undefined ? parsedPhone.value : undefined,
  };
}

export function validateAccountAddressInput(
  body: Record<string, unknown>
): { ok: true; address: ValidatedAddressInput } | { ok: false; error: string } {
  const fullName =
    typeof body.fullName === "string" ? body.fullName.trim().replace(/\s+/g, " ") : "";
  if (fullName.length < 2 || fullName.length > 80) {
    return { ok: false, error: "Recipient name must be between 2 and 80 characters." };
  }

  const parsedPhone = normalizeAccountPhone(body.phone, { required: true });
  if (!parsedPhone.ok) {
    return { ok: false, error: "Please enter a valid recipient mobile number (e.g. 01712345678)." };
  }

  const address = typeof body.address === "string" ? body.address.trim() : "";
  if (address.length < 5 || address.length > 260) {
    return { ok: false, error: "Street address must be between 5 and 260 characters." };
  }

  const city = typeof body.city === "string" ? body.city.trim() : "";
  if (city.length < 2 || city.length > 80) {
    return { ok: false, error: "Area / City is required." };
  }

  const district = typeof body.district === "string" ? body.district.trim() : "";
  if (district.length < 2 || district.length > 80) {
    return { ok: false, error: "District is required." };
  }

  const postalCode = typeof body.postalCode === "string" ? body.postalCode.trim().slice(0, 20) : "";

  return {
    ok: true,
    address: {
      fullName,
      phone: parsedPhone.value,
      address,
      city,
      district,
      postalCode,
      isDefault: Boolean(body.isDefault),
    },
  };
}

export function ensureSingleDefaultAddress<T extends { isDefault?: boolean }>(
  addresses: T[],
  preferredIndex?: number
): T[] {
  if (addresses.length === 0) return addresses;
  let targetIndex =
    typeof preferredIndex === "number" && preferredIndex >= 0 && preferredIndex < addresses.length
      ? preferredIndex
      : addresses.findIndex((a) => Boolean(a.isDefault));
  if (targetIndex < 0) targetIndex = 0;

  for (let i = 0; i < addresses.length; i++) {
    addresses[i].isDefault = i === targetIndex;
  }
  return addresses;
}
