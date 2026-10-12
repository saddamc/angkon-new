import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { EmailCode } from "@/models/EmailCode";

/**
 * One-time email codes used to verify an address during checkout.
 * - 6 digits, valid for 10 minutes, at most 5 wrong guesses, then a new code is needed.
 * - Only an HMAC of the code is stored, never the code itself.
 */
export const CODE_LENGTH = 6;
export const CODE_TTL_MS = 10 * 60 * 1000;
export const CODE_RESEND_COOLDOWN_MS = 60 * 1000;
export const CODE_MAX_ATTEMPTS = 5;

const SECRET = process.env.JWT_SECRET || "angkon_secure_jwt_secret_2026";

export function generateCode(): string {
  return String(crypto.randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

export function isWellFormedCode(value: unknown): value is string {
  return typeof value === "string" && value.length === CODE_LENGTH && [...value].every((c) => c >= "0" && c <= "9");
}

export function hashCode(email: string, code: string): string {
  return crypto.createHmac("sha256", SECRET).update(`${email}:${code}`).digest("hex");
}

/** Create (or replace) the pending code for an email. Returns the code, cooldown, or a db-error sentinel. */
export async function issueEmailCode(
  email: string
): Promise<{ code: string } | { cooldownSeconds: number } | { dbError: string }> {
  const normalized = email.trim().toLowerCase();
  const now = Date.now();

  // Connect – surface a clear error sentinel instead of throwing into the route handler
  try {
    await connectToDatabase();
  } catch (connErr) {
    const msg = connErr instanceof Error ? connErr.message : "Database connection failed";
    console.error("issueEmailCode: DB connect failed:", msg);
    return { dbError: msg };
  }

  try {
    const existing = await EmailCode.findOne({ email: normalized }).lean();
    if (existing && existing.lastSentAt) {
      const lastSentMs = new Date(existing.lastSentAt).getTime();
      if (!isNaN(lastSentMs)) {
        const waitMs = CODE_RESEND_COOLDOWN_MS - (now - lastSentMs);
        if (waitMs > 0) return { cooldownSeconds: Math.ceil(waitMs / 1000) };
      }
    }
  } catch (findErr) {
    console.warn("Could not check existing EmailCode:", findErr);
  }

  const code = generateCode();
  const hash = hashCode(normalized, code);

  try {
    // Delete any previous code for this email and insert fresh to prevent Mongo duplicate key collisions
    await EmailCode.deleteMany({ email: normalized });
    await EmailCode.create({
      email: normalized,
      codeHash: hash,
      attempts: 0,
      expiresAt: new Date(now + CODE_TTL_MS),
      lastSentAt: new Date(now),
    });
  } catch (writeErr) {
    console.warn("EmailCode direct create failed, falling back to updateOne:", writeErr);
    try {
      await EmailCode.updateOne(
        { email: normalized },
        {
          $set: {
            codeHash: hash,
            attempts: 0,
            expiresAt: new Date(now + CODE_TTL_MS),
            lastSentAt: new Date(now),
          },
        },
        { upsert: true }
      );
    } catch (updateErr) {
      const msg = updateErr instanceof Error ? updateErr.message : "Database write failed";
      console.error("issueEmailCode: DB write failed:", msg);
      return { dbError: msg };
    }
  }

  return { code };
}

/** Forget a pending code (e.g. when the email could not be sent). */
export async function discardEmailCode(email: string): Promise<void> {
  try {
    await connectToDatabase();
    await EmailCode.deleteMany({ email: email.trim().toLowerCase() });
  } catch (err) {
    console.warn("Could not discard email code:", err);
  }
}

export type CodeCheck =
  | { status: "ok" }
  | { status: "invalid"; attemptsLeft: number }
  | { status: "expired" }
  | { status: "locked" }
  | { status: "error"; error: string };

/** Check a submitted code. A correct code is consumed and can't be used again. */
export async function consumeEmailCode(email: string, code: string): Promise<CodeCheck> {
  try {
    await connectToDatabase();

    const normalized = email.trim().toLowerCase();
    // Count this attempt first (atomically) so parallel guesses can't beat the limit.
    const doc = await EmailCode.findOneAndUpdate(
      { email: normalized, expiresAt: { $gt: new Date() } },
      { $inc: { attempts: 1 } },
      { new: true },
    );
    if (!doc) return { status: "expired" };
    if (doc.attempts > CODE_MAX_ATTEMPTS) return { status: "locked" };

    const expected = Buffer.from(doc.codeHash, "hex");
    const actual = Buffer.from(hashCode(normalized, code), "hex");
    const matches = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

    if (matches) {
      await EmailCode.deleteMany({ email: normalized });
      return { status: "ok" };
    }
    return doc.attempts >= CODE_MAX_ATTEMPTS
      ? { status: "locked" }
      : { status: "invalid", attemptsLeft: CODE_MAX_ATTEMPTS - doc.attempts };
  } catch (err) {
    console.error("consumeEmailCode error:", err);
    return { status: "error", error: err instanceof Error ? err.message : "Database error" };
  }
}
