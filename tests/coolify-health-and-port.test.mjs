import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");

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

test("6. Safety invariant: Local development environment uses angkon_dev and sandbox modes", () => {
  const envContent = read(".env");
  assert.ok(
    envContent.includes("angkon_dev"),
    "Safety requirement: database must be angkon_dev, never production angkon"
  );
  assert.ok(
    !envContent.includes("/angkon?") && !envContent.includes("/angkon\n"),
    "Safety requirement: must not target production angkon database"
  );
  assert.ok(
    envContent.includes("SSLCOMMERZ_MODE=sandbox") && envContent.includes("SSLCOMMERZ_IS_LIVE=false"),
    "Safety requirement: SSLCOMMERZ must remain in Sandbox mode"
  );
  assert.ok(
    envContent.includes("COURIER_MODE=mock") && envContent.includes("STEADFAST_LIVE_BOOKING_ENABLED=false"),
    "Safety requirement: Steadfast must remain in Mock mode"
  );
});
