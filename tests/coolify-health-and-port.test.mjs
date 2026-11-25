import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");

/**
 * Parses only the *active* assignments in an env file.
 *
 * A commented-out `# DATABASE_URL=.../angkon` is documentation, not a target,
 * so it must not trip the production-database guard below.
 */
function parseActiveEnv(contents) {
  const env = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, raw] = match;
    env[key] = raw.replace(/^["']|["']$/g, "").trim();
  }
  return env;
}

/** Extracts the database name from a MongoDB URI without exposing credentials. */
function databaseNameFromUri(uri) {
  if (!uri) return "";
  const afterProtocol = uri.replace(/^mongodb(\+srv)?:\/\//, "");
  const slash = afterProtocol.indexOf("/");
  if (slash === -1) return "";
  return afterProtocol.slice(slash + 1).split("?")[0].split("/")[0].trim();
}

test("1. package.json start script listens on 0.0.0.0:3000", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(
    pkg.scripts.start,
    "next start -H 0.0.0.0 -p 3000",
    "Production start script must strictly listen on 0.0.0.0:3000"
  );
});

test("2. /api/health route exists and returns HTTP 200 with ok status", async () => {
  const healthRouteSource = read("src/app/api/health/route.ts");
  assert.ok(
    healthRouteSource.includes('export const dynamic = "force-dynamic"'),
    "Health route must be force-dynamic so orchestrators receive real-time status"
  );
  assert.ok(
    healthRouteSource.includes("export function GET"),
    "Health route must export a GET handler"
  );
  assert.ok(
    healthRouteSource.includes("export function HEAD"),
    "Health route must export a HEAD handler"
  );
  assert.ok(
    healthRouteSource.includes('status: "ok"'),
    "Health route must return status: 'ok'"
  );
  assert.ok(
    healthRouteSource.includes("status: 200"),
    "Health route must respond with HTTP 200"
  );
  assert.ok(
    healthRouteSource.includes("port: 3000"),
    "Health route must report port 3000"
  );
  assert.ok(
    healthRouteSource.includes("Cache-Control"),
    "Health route must set Cache-Control headers"
  );
});

test("3. Dockerfile standardizes on port 3000 and installs curl + wget", () => {
  const dockerfile = read("Dockerfile");
  assert.ok(
    dockerfile.includes("EXPOSE 3000"),
    "Dockerfile must expose port 3000"
  );
  assert.ok(
    dockerfile.includes("apk add --no-cache curl wget"),
    "Dockerfile must install both curl and wget for container health checks"
  );
  assert.ok(
    dockerfile.includes('ENV PORT=3000'),
    "Dockerfile must set PORT=3000"
  );
  assert.ok(
    dockerfile.includes('ENV HOSTNAME="0.0.0.0"'),
    "Dockerfile must set HOSTNAME=0.0.0.0"
  );
  assert.ok(
    dockerfile.includes("http://localhost:3000/api/health"),
    "Dockerfile HEALTHCHECK must target http://localhost:3000/api/health"
  );
  assert.ok(
    dockerfile.includes('CMD ["npm", "run", "start"]'),
    "Dockerfile CMD must run npm run start"
  );
});

test("4. nixpacks.toml packages curl and wget and sets port 3000", () => {
  const nixpacks = read("nixpacks.toml");
  assert.ok(
    nixpacks.includes('"curl"') && nixpacks.includes('"wget"'),
    "nixpacks.toml must include curl and wget in nixPkgs"
  );
  assert.ok(
    nixpacks.includes('PORT = "3000"'),
    "nixpacks.toml must configure PORT = 3000"
  );
  assert.ok(
    nixpacks.includes('HOSTNAME = "0.0.0.0"'),
    "nixpacks.toml must configure HOSTNAME = 0.0.0.0"
  );
  assert.ok(
    nixpacks.includes('cmd = "npm run start"'),
    "nixpacks.toml must execute npm run start"
  );
});

test("5. .dockerignore excludes unwanted files from build context", () => {
  const dockerignore = read(".dockerignore");
  assert.ok(dockerignore.includes("node_modules"), ".dockerignore must ignore node_modules");
  assert.ok(dockerignore.includes(".next"), ".dockerignore must ignore .next");
  assert.ok(dockerignore.includes(".git"), ".dockerignore must ignore .git");
});

test("6. Safety invariant: local environment is database-isolated and sandboxed", () => {
  const env = parseActiveEnv(read(".env"));
  const appEnv = (env.APP_ENVIRONMENT || "development").toLowerCase();
  const database = databaseNameFromUri(
    env.DATABASE_URL || env.MONGODB_URI || env.MONGODB_URL || ""
  );

  const expectedDatabase = {
    production: "angkon",
    development: "angkon_dev",
    preview: "angkon_preview",
    test: "angkon_test",
  }[appEnv];

  assert.ok(expectedDatabase, `Unknown APP_ENVIRONMENT "${appEnv}" in .env`);
  assert.equal(
    database,
    expectedDatabase,
    `APP_ENVIRONMENT=${appEnv} must target database "${expectedDatabase}", not "${database}"`
  );

  // Outside production, every side-effecting integration must stay in sandbox.
  if (appEnv !== "production") {
    assert.equal(
      (env.SSLCOMMERZ_MODE || "").toLowerCase(),
      "sandbox",
      "Safety requirement: SSLCOMMERZ must remain in Sandbox mode outside production"
    );
    assert.equal(
      (env.SSLCOMMERZ_IS_LIVE || "").toLowerCase(),
      "false",
      "Safety requirement: SSLCOMMERZ_IS_LIVE must be false outside production"
    );
  }

  assert.notEqual(
    (env.ENABLE_REAL_EMAIL || "").toLowerCase(),
    "true",
    "Safety requirement: real transactional email must stay disabled in local development"
  );
});
