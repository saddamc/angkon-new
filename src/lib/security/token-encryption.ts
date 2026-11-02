import crypto from "crypto";

const SALT = "angkon-meta-token-salt-2026";
const ALGORITHM = "aes-256-gcm";
export const ENCRYPTED_PREFIX = "enc:v1:";

/**
 * Derives a 32-byte AES-256 key from a secret string.
 * If secret is already a 64-char hex string, parses it directly as 32 bytes;
 * otherwise derives via scrypt with a fixed application salt.
 */
export function deriveKeyFromSecret(secret: string): Buffer {
  const clean = secret.trim();
  if (/^[0-9a-fA-F]{64}$/.test(clean)) {
    return Buffer.from(clean, "hex");
  }
  return crypto.scryptSync(clean, SALT, 32);
}

/**
 * Returns the primary encryption key derived from environment variables.
 * Priority:
 * 1. META_TOKEN_ENCRYPTION_KEY (Dedicated Meta token secret)
 * 2. ENCRYPTION_KEY (General application encryption secret)
 * 3. JWT_SECRET (Application JWT secret)
 * 4. Resilient server-side fallback
 */
export function getMasterKey(): Buffer {
  const secret =
    process.env.META_TOKEN_ENCRYPTION_KEY ||
    process.env.ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    "angkon_meta_secure_token_secret_key_2026_primary";
  return deriveKeyFromSecret(secret);
}

/**
 * Returns an array of historical / secondary decryption keys for zero-downtime key rotation.
 * Sourced from comma- or semicolon-separated META_TOKEN_ROTATION_KEYS.
 */
export function getRotationKeys(): Buffer[] {
  const rotationStr = process.env.META_TOKEN_ROTATION_KEYS || "";
  const secrets = rotationStr
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Also include standard fallbacks as secondary rotation keys so existing tokens continue to decrypt
  const fallbacks = [
    process.env.ENCRYPTION_KEY,
    process.env.JWT_SECRET,
    "angkon_secure_jwt_secret_2026",
    "angkon_catalog_secret_key_2026_fallback",
    "angkon_meta_secure_token_secret_key_2026_primary",
  ]
    .filter((s): s is string => Boolean(s && s.trim()))
    .map((s) => s.trim());

  const allSecrets = Array.from(new Set([...secrets, ...fallbacks]));
  return allSecrets.map(deriveKeyFromSecret);
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  tag: string;
}

/**
 * Checks whether a given string is serialized in the authenticated envelope format:
 * `enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>`
 */
export function isEncryptedToken(value: unknown): boolean {
  if (typeof value !== "string" || !value.startsWith(ENCRYPTED_PREFIX)) {
    return false;
  }
  const parts = value.split(":");
  // parts: ["enc", "v1", iv, tag, ciphertext] -> length 5
  if (parts.length !== 5) return false;
  const [, , iv, tag, ciphertext] = parts;
  return (
    /^[0-9a-fA-F]{24}$/.test(iv) && // 12 bytes = 24 hex
    /^[0-9a-fA-F]{32}$/.test(tag) && // 16 bytes = 32 hex
    /^[0-9a-fA-F]+$/.test(ciphertext)
  );
}

/**
 * Encrypts a sensitive string (such as a Meta access token) using AES-256-GCM.
 * Returns a structured EncryptedPayload object (for MetaCatalogConfig backward compatibility).
 */
export function encryptToken(plaintext: string, customKey?: Buffer): EncryptedPayload {
  if (!plaintext || typeof plaintext !== "string") {
    return { ciphertext: "", iv: "", tag: "" };
  }

  const key = customKey || getMasterKey();
  const iv = crypto.randomBytes(12); // Recommended 96-bit IV for AES-GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");

  return {
    ciphertext,
    iv: iv.toString("hex"),
    tag,
  };
}

/**
 * Encrypts a sensitive string into the compact string envelope:
 * `enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>`
 *
 * Safe & Idempotent: If the string is already encrypted, returns it unchanged.
 */
export function encryptTokenString(plaintext?: string | null): string {
  if (!plaintext || typeof plaintext !== "string") return "";
  const trimmed = plaintext.trim();
  if (!trimmed) return "";
  if (isEncryptedToken(trimmed)) {
    return trimmed; // Already encrypted
  }

  const payload = encryptToken(trimmed);
  return `${ENCRYPTED_PREFIX}${payload.iv}:${payload.tag}:${payload.ciphertext}`;
}

/**
 * Decrypts an AES-256-GCM encrypted payload back into plaintext.
 * Throws an error if authentication tag does not match or payload is tampered.
 */
export function decryptToken(payload: EncryptedPayload, customKey?: Buffer): string {
  if (!payload.ciphertext || !payload.iv || !payload.tag) {
    return "";
  }

  const key = customKey || getMasterKey();
  const iv = Buffer.from(payload.iv, "hex");
  const tag = Buffer.from(payload.tag, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  decipher.setAuthTag(tag);
  let decrypted = decipher.update(payload.ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Decrypts a token string.
 *
 * Backward-compatible & Transparent:
 * - If string is in envelope format `enc:v1:...`, decrypts using AES-256-GCM.
 * - If string is legacy plaintext (e.g. starts with "EAA..."), returns it directly!
 * - If decryption fails across all candidate keys, returns empty string without leaking exceptions.
 */
export function decryptTokenString(
  encryptedOrPlaintext?: string | null,
  customKeyOrSecret?: Buffer | string
): string {
  if (!encryptedOrPlaintext || typeof encryptedOrPlaintext !== "string") return "";
  const trimmed = encryptedOrPlaintext.trim();
  if (!trimmed) return "";

  // If not encrypted, return transparently as legacy plaintext
  if (!isEncryptedToken(trimmed)) {
    return trimmed;
  }

  const parts = trimmed.split(":");
  const [, , iv, tag, ciphertext] = parts;

  const candidateKeys = customKeyOrSecret
    ? [
        typeof customKeyOrSecret === "string"
          ? deriveKeyFromSecret(customKeyOrSecret)
          : customKeyOrSecret,
        getMasterKey(),
        ...getRotationKeys(),
      ]
    : [getMasterKey(), ...getRotationKeys()];

  for (const key of candidateKeys) {
    try {
      return decryptToken(
        {
          iv,
          tag,
          ciphertext,
        },
        key
      );
    } catch {
      continue;
    }
  }

  return "";
}

/**
 * Rotates an encrypted token string to a new key.
 * Decrypts with existing key/rotation keys (or optional oldSecret) and re-encrypts using the new key.
 */
export function rotateTokenCiphertext(
  tokenStr: string,
  newSecret?: string,
  oldSecret?: string
): { rotated: boolean; value: string } {
  if (!tokenStr || typeof tokenStr !== "string") {
    return { rotated: false, value: "" };
  }

  const plaintext = decryptTokenString(tokenStr, oldSecret);
  if (!plaintext) {
    return { rotated: false, value: tokenStr };
  }

  const newKey = newSecret ? deriveKeyFromSecret(newSecret) : getMasterKey();
  const payload = encryptToken(plaintext, newKey);
  const nextEnvelope = `${ENCRYPTED_PREFIX}${payload.iv}:${payload.tag}:${payload.ciphertext}`;

  return {
    rotated: true,
    value: nextEnvelope,
  };
}

/**
 * Safely masks an access token for display in admin UI or API responses.
 * Never leaks the full token.
 * If the provided token is encrypted, it is safely decrypted in-memory first to display
 * the real prefix/suffix mask.
 */
export function maskSecret(secret?: string | null): string {
  if (!secret || typeof secret !== "string") return "";
  const trimmed = secret.trim();
  if (!trimmed) return "";

  // If it's an encrypted token, decrypt in-memory to get actual prefix/suffix
  const realToken = isEncryptedToken(trimmed) ? decryptTokenString(trimmed) : trimmed;
  if (!realToken) return "";

  if (realToken.length <= 8) return "••••••••";
  const start = realToken.slice(0, 4);
  const end = realToken.slice(-4);
  return `${start}••••••••${end}`;
}

/**
 * Backward compatibility alias for maskSecret.
 */
export const maskToken = maskSecret;

/**
 * Redacts any Meta access tokens or encrypted payloads from log messages or strings.
 */
export function redactTokens(input: string): string {
  if (!input || typeof input !== "string") return input;
  return input
    .replace(/\b(EAA[a-zA-Z0-9_-]{15,})\b/g, "[REDACTED_META_TOKEN]")
    .replace(/enc:v1:[0-9a-fA-F:]+/g, "[REDACTED_ENCRYPTED_TOKEN]")
    .replace(/(Bearer\s+)[a-zA-Z0-9._~+/-]+=*/gi, "$1[REDACTED_TOKEN]");
}
