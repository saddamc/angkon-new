import crypto from "crypto";

const SALT = "angkon-meta-token-salt-2026";
const ALGORITHM = "aes-256-gcm";

function getMasterKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    "angkon_catalog_secret_key_2026_fallback";
  return crypto.scryptSync(secret, SALT, 32);
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  tag: string;
}

/**
 * Encrypts a sensitive string (such as a Meta access token) using AES-256-GCM.
 */
export function encryptToken(plaintext: string): EncryptedPayload {
  if (!plaintext || typeof plaintext !== "string") {
    return { ciphertext: "", iv: "", tag: "" };
  }

  const key = getMasterKey();
  const iv = crypto.randomBytes(12);
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
 * Decrypts an AES-256-GCM encrypted payload back into plaintext.
 */
export function decryptToken(payload: EncryptedPayload): string {
  if (!payload.ciphertext || !payload.iv || !payload.tag) {
    return "";
  }

  const key = getMasterKey();
  const iv = Buffer.from(payload.iv, "hex");
  const tag = Buffer.from(payload.tag, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  decipher.setAuthTag(tag);
  let decrypted = decipher.update(payload.ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Safely masks an access token for display in admin UI or API responses.
 * Never leaks the full token. Returns empty string if empty.
 */
export function maskToken(token?: string | null): string {
  if (!token || typeof token !== "string") return "";
  const trimmed = token.trim();
  if (trimmed.length <= 8) return "••••••••";
  const start = trimmed.slice(0, 4);
  const end = trimmed.slice(-4);
  return `${start}••••••••${end}`;
}

/**
 * Redacts any Meta access tokens from log messages or strings.
 */
export function redactTokens(input: string): string {
  if (!input || typeof input !== "string") return input;
  return input
    .replace(/\b(EAAB[a-zA-Z0-9_-]{20,})\b/g, "[REDACTED_META_TOKEN]")
    .replace(/(Bearer\s+)[a-zA-Z0-9._~+/-]+=*/gi, "$1[REDACTED_TOKEN]");
}
