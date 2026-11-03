import fs from "fs";

// Read decrypted token via HTTP from local running server
async function run() {
  const envContent = fs.readFileSync(".env", "utf-8");
  const match = envContent.match(/JWT_SECRET=([^\r\n]+)/);
  const secret = match ? match[1].trim() : "angkon_secure_jwt_secret_2026";

  const payload = {
    sub: "saddam13bd@gmail.com",
    name: "Saddam Superadmin",
    role: "superadmin",
    authorizedTenants: ["angkon-main"],
    defaultTenant: "angkon-main",
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  const data = header + "." + body;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  const jwt = data + "." + sigB64;

  // Query /api/admin/meta/capi/test route or custom debug endpoint to verify Graph API endpoints
  console.log("Testing Graph API endpoints from Next.js server context...");
}
run();
