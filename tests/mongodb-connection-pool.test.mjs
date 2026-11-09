import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Phase 2: mongodb.ts enforces controlled connection pool defaults", () => {
  const content = fs.readFileSync("src/lib/mongodb.ts", "utf8");

  // Verify pool configuration defaults
  assert.match(content, /DEFAULT_MAX_POOL_SIZE\s*=\s*5/, "maxPoolSize default must be 5");
  assert.match(content, /DEFAULT_MIN_POOL_SIZE\s*=\s*0/, "minPoolSize default must be 0");
  assert.match(content, /DEFAULT_MAX_CONNECTING\s*=\s*2/, "maxConnecting default must be 2");
  assert.match(content, /DEFAULT_MAX_IDLE_TIME_MS\s*=\s*30000/, "maxIdleTimeMS default must be 30000ms");
  assert.match(content, /DEFAULT_WAIT_QUEUE_TIMEOUT_MS\s*=\s*5000/, "waitQueueTimeoutMS default must be 5000ms");
  assert.match(content, /DEFAULT_SERVER_SELECTION_TIMEOUT_MS\s*=\s*10000/, "serverSelectionTimeoutMS default must be 10000ms");
  assert.match(content, /autoIndex/, "autoIndex must be explicitly controlled");
  assert.match(content, /bufferCommands:\s*false/, "bufferCommands must be false");
});

test("Phase 2: mongodb.ts prevents concurrent connection race conditions", () => {
  const content = fs.readFileSync("src/lib/mongodb.ts", "utf8");

  // Must reuse in-flight promise if cached.promise is present
  assert.ok(content.includes("if (cached.promise)"), "Must check for in-flight cached.promise");
  assert.ok(content.includes("cached.conn = await cached.promise"), "Must await in-flight promise rather than wiping it");
  // ReadyState === 1 check
  assert.ok(content.includes("readyState === 1"), "Must check readyState === 1 before returning cached connection");
});

test("Phase 4: mongodb.ts exposes safe diagnostics without secrets or credentials", () => {
  const content = fs.readFileSync("src/lib/mongodb.ts", "utf8");

  assert.ok(content.includes("export function getDatabaseDiagnostics"), "Must export getDatabaseDiagnostics()");
  // Diagnostics must NOT expose MONGODB_URI or passwords
  assert.ok(!content.includes("diagnostics.uri"), "Must not expose URI in diagnostics");
  assert.ok(!content.includes("diagnostics.password"), "Must not expose password in diagnostics");

  // Must track pool events
  assert.ok(content.includes("connectionPoolCreated"), "Must track connectionPoolCreated");
  assert.ok(content.includes("connectionCreated"), "Must track connectionCreated");
  assert.ok(content.includes("connectionClosed"), "Must track connectionClosed");
  assert.ok(content.includes("connectionCheckedOut"), "Must track connectionCheckedOut");
  assert.ok(content.includes("connectionCheckedIn"), "Must track connectionCheckedIn");
  assert.ok(content.includes("connectionCheckOutFailed"), "Must track connectionCheckOutFailed");
});

test("Phase 4: Protected admin diagnostics API route exists", () => {
  assert.ok(
    fs.existsSync("src/app/api/admin/system/db-diagnostics/route.ts"),
    "src/app/api/admin/system/db-diagnostics/route.ts must exist"
  );

  const routeContent = fs.readFileSync("src/app/api/admin/system/db-diagnostics/route.ts", "utf8");
  assert.ok(routeContent.includes("getDatabaseDiagnostics"), "Route must call getDatabaseDiagnostics()");
  assert.ok(routeContent.includes("no-store"), "Must set no-store Cache-Control header");
});

test("Phase 3: Admin polling incorporates visibilityState guards to prevent idle CPU burn", () => {
  const layoutContent = fs.readFileSync("src/app/admin/layout.tsx", "utf8");
  assert.ok(
    layoutContent.includes("document.visibilityState"),
    "AdminLayout must check document.visibilityState to pause polling when tab is inactive"
  );
  assert.ok(
    layoutContent.includes("visibilitychange"),
    "AdminLayout must listen to visibilitychange events"
  );

  const ordersHookContent = fs.readFileSync("src/app/admin/orders/_hooks/use-admin-orders.ts", "utf8");
  assert.ok(
    ordersHookContent.includes("document.visibilityState"),
    "useAdminOrders must check document.visibilityState to pause polling when tab is inactive"
  );
  assert.ok(
    ordersHookContent.includes("visibilitychange"),
    "useAdminOrders must listen to visibilitychange events"
  );
});

test("Phase 3: Meta queue worker disables in-process intervals on Vercel serverless", () => {
  const workerContent = fs.readFileSync("src/server/meta-queue-worker.ts", "utf8");
  assert.ok(
    workerContent.includes("process.env.VERCEL"),
    "startMetaQueueWorker must check process.env.VERCEL to prevent in-process intervals in serverless lambdas"
  );
});
