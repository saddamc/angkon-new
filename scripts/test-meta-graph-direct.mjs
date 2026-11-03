import dotenv from "dotenv";
import mongoose from "mongoose";
import crypto from "crypto";

dotenv.config();

const DATABASE_URL =
  process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.DATABASE_URL;

const SALT = "angkon-meta-token-salt-2026";

function deriveKeyFromSecret(secret) {
  const clean = secret.trim();
  if (/^[0-9a-fA-F]{64}$/.test(clean)) {
    return Buffer.from(clean, "hex");
  }
  return crypto.scryptSync(clean, SALT, 32);
}

function decryptToken(envelope) {
  if (!envelope || typeof envelope !== "string") return "";
  if (!envelope.startsWith("enc:v1:")) return envelope; // legacy plaintext

  const parts = envelope.split(":");
  if (parts.length !== 5) return "";
  const [, , ivHex, tagHex, ciphertextHex] = parts;

  const secrets = [
    process.env.META_TOKEN_ENCRYPTION_KEY,
    process.env.TOKEN_ENCRYPTION_KEY,
    process.env.ENCRYPTION_KEY,
    process.env.JWT_SECRET,
    "angkon_secure_jwt_secret_2026",
    "angkon_catalog_secret_key_2026_fallback",
    "angkon_meta_secure_token_secret_key_2026_primary",
  ].filter(Boolean);

  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  for (const s of secrets) {
    try {
      const key = deriveKeyFromSecret(s);
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
      decrypted += decipher.final("utf8");
      if (decrypted) return decrypted;
    } catch {
      // try next
    }
  }
  return "";
}

async function run() {
  await mongoose.connect(DATABASE_URL);
  console.log("Connected to MongoDB");

  const Settings = mongoose.model(
    "Settings",
    new mongoose.Schema({}, { strict: false, collection: "settings" })
  );

  const pixelDoc = await Settings.findOne({ key: "pixel", tenantId: "angkon-main" });
  if (!pixelDoc) {
    console.log("No pixel doc found for angkon-main");
    process.exit(1);
  }

  const val = pixelDoc.get("value") || {};
  console.log("Pixel ID:", val.pixelId);
  const token = decryptToken(val.capiAccessToken);
  console.log("Token decrypted length:", token.length, "prefix:", token.slice(0, 10));

  const pixelId = val.pixelId || "1304551066085265";

  // 1. Test GET /{pixel_id}
  console.log("\n--- Testing GET /" + pixelId + " ---");
  const res1 = await fetch(`https://graph.facebook.com/v22.0/${pixelId}?fields=id,name,is_unavailable,creation_time`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Status:", res1.status, await res1.json());

  // 2. Test GET /{pixel_id}/stats
  console.log("\n--- Testing GET /" + pixelId + "/stats ---");
  const res2 = await fetch(`https://graph.facebook.com/v22.0/${pixelId}/stats?aggregation=event`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Status:", res2.status, await res2.json());

  // 3. Test GET /dataset_quality?dataset_id={pixel_id}
  console.log("\n--- Testing GET /dataset_quality ---");
  const res3 = await fetch(`https://graph.facebook.com/v22.0/dataset_quality?dataset_id=${pixelId}&fields=web{event_name,event_match_quality,event_coverage}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const emqData = await res3.json();
  console.log("Status:", res3.status, JSON.stringify(emqData, null, 2));

  // 4. Test GET /debug_token to inspect actual token permissions
  console.log("\n--- Testing GET /debug_token ---");
  const res4 = await fetch(`https://graph.facebook.com/v22.0/debug_token?input_token=${token}&access_token=${token}`);
  console.log("Status:", res4.status, await res4.json());

  await mongoose.disconnect();
}

run().catch((e) => {
  console.error("Script error:", e);
  process.exit(1);
});
