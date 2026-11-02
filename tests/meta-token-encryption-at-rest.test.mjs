import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import {
  encryptTokenString,
  decryptTokenString,
  isEncryptedToken,
  rotateTokenCiphertext,
  maskSecret,
  redactTokens,
  deriveKeyFromSecret,
  encryptToken,
  decryptToken,
  ENCRYPTED_PREFIX,
} from "../src/lib/security/token-encryption.ts";

test("Token Encryption: 1. AES-256-GCM produces valid authenticated envelope", () => {
  const sampleToken = "EAAGm0PX4ZCpsBAK1234567890abcdefghijklmnopqrstuvwxyz";
  const encrypted = encryptTokenString(sampleToken);

  assert.ok(encrypted.startsWith(ENCRYPTED_PREFIX), "Must start with enc:v1:");
  assert.ok(isEncryptedToken(encrypted), "isEncryptedToken must return true");

  const parts = encrypted.split(":");
  assert.strictEqual(parts.length, 5, "Envelope must have 5 colon-separated parts");
  const [, version, iv, tag, ciphertext] = parts;

  assert.strictEqual(version, "v1");
  assert.strictEqual(iv.length, 24, "IV must be 12 bytes = 24 hex characters");
  assert.strictEqual(tag.length, 32, "Auth tag must be 16 bytes = 32 hex characters");
  assert.ok(ciphertext.length > 0, "Ciphertext must not be empty");
});

test("Token Encryption: 2. Decrypts back to identical plaintext", () => {
  const sampleToken = "EAAB9876543210zyxwvutsrqponmlkjihgfedcba";
  const encrypted = encryptTokenString(sampleToken);
  const decrypted = decryptTokenString(encrypted);

  assert.strictEqual(decrypted, sampleToken, "Decrypted token must match original plaintext");
});

test("Token Encryption: 3. Backward-compatible transparent passthrough for legacy plaintext", () => {
  const legacyToken = "EAAGlegacyTokenNotYetMigrated12345";
  // decryptTokenString should see that it's NOT in enc:v1: format and return as-is
  const result = decryptTokenString(legacyToken);

  assert.strictEqual(result, legacyToken, "Unencrypted legacy tokens must pass through transparently");
});

test("Token Encryption: 4. Idempotency: encrypting an already-encrypted token does not double-encrypt", () => {
  const sampleToken = "EAABtestTokenForIdempotency123";
  const firstPass = encryptTokenString(sampleToken);
  const secondPass = encryptTokenString(firstPass);

  assert.strictEqual(secondPass, firstPass, "Double encryption must be prevented");
  assert.strictEqual(decryptTokenString(secondPass), sampleToken);
});

test("Token Encryption: 5. Tamper Resistance: modified ciphertext or tag fails authentication", () => {
  const sampleToken = "EAABtamperProofValidationToken999";
  const encrypted = encryptTokenString(sampleToken);
  const parts = encrypted.split(":");

  // Tamper with tag
  const tamperedTagParts = [...parts];
  tamperedTagParts[3] = "0".repeat(32); // forged tag
  const tamperedTag = tamperedTagParts.join(":");

  assert.strictEqual(
    decryptTokenString(tamperedTag),
    "",
    "Tampered tag must fail authentication and return empty string"
  );

  // Tamper with ciphertext
  const tamperedCipherParts = [...parts];
  const originalCipher = tamperedCipherParts[4];
  tamperedCipherParts[4] =
    originalCipher.slice(0, -2) + (originalCipher.slice(-2) === "aa" ? "bb" : "aa");
  const tamperedCipher = tamperedCipherParts.join(":");

  assert.strictEqual(
    decryptTokenString(tamperedCipher),
    "",
    "Tampered ciphertext must fail authentication and return empty string"
  );
});

test("Token Encryption: 6. Key Rotation: tokens encrypted with custom key can be rotated", () => {
  const oldSecret = "historical_meta_secret_key_2025";
  const newSecret = "new_production_meta_key_2026";
  const oldKey = deriveKeyFromSecret(oldSecret);

  const sampleToken = "EAABrotatedSecretTokenABCDEF";
  const oldPayload = encryptToken(sampleToken, oldKey);
  const oldEnvelope = `${ENCRYPTED_PREFIX}${oldPayload.iv}:${oldPayload.tag}:${oldPayload.ciphertext}`;

  // Rotate from old secret to new secret
  const rotation = rotateTokenCiphertext(oldEnvelope, newSecret, oldSecret);

  assert.ok(rotation.rotated, "Rotation must report success");
  assert.notStrictEqual(rotation.value, oldEnvelope, "Rotated ciphertext must be different");

  // Verify new envelope decrypts with new key
  const newKey = deriveKeyFromSecret(newSecret);
  const newParts = rotation.value.split(":");
  const decrypted = decryptToken(
    { iv: newParts[2], tag: newParts[3], ciphertext: newParts[4] },
    newKey
  );
  assert.strictEqual(decrypted, sampleToken, "Decrypted rotated token must match original");
});

test("Token Encryption: 7. Safe Masking: never leaks middle characters of tokens", () => {
  const plainToken = "EAAG1234567890abcdef9999";
  const maskedPlain = maskSecret(plainToken);

  assert.ok(maskedPlain.startsWith("EAAG"), "Must show first 4 characters");
  assert.ok(maskedPlain.endsWith("9999"), "Must show last 4 characters");
  assert.ok(!maskedPlain.includes("abcdef"), "Must not leak middle characters");
  assert.ok(maskedPlain.includes("••••••••"), "Must contain bullet mask");

  // Masking an encrypted token should decrypt in-memory and mask identically
  const encrypted = encryptTokenString(plainToken);
  const maskedEncrypted = maskSecret(encrypted);

  assert.strictEqual(
    maskedEncrypted,
    maskedPlain,
    "Masking encrypted token must produce identical safe mask"
  );

  // Short tokens
  assert.strictEqual(maskSecret("short"), "••••••••");
  assert.strictEqual(maskSecret(""), "");
  assert.strictEqual(maskSecret(null), "");
});

test("Token Encryption: 8. Redaction: scrubs plaintext Meta tokens and encrypted envelopes from logs", () => {
  const logMessage =
    "Error in Meta request: Bearer EAAG9876543210abcdef0123456789 failed on endpoint with payload enc:v1:0123456789abcdef01234567:0123456789abcdef0123456789abcdef:fedcba9876543210";
  const redacted = redactTokens(logMessage);

  assert.ok(!redacted.includes("EAAG9876543210"), "Plaintext Meta token must be redacted");
  assert.ok(!redacted.includes("fedcba9876543210"), "Ciphertext payload must be redacted");
  assert.ok(redacted.includes("[REDACTED_META_TOKEN]"), "Must insert redaction placeholder");
  assert.ok(redacted.includes("[REDACTED_ENCRYPTED_TOKEN]"), "Must insert encrypted placeholder");
});
