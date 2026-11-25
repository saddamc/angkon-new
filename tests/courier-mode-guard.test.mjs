import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

/**
 * Courier safety guard.
 *
 * The raw `.env` may contain `COURIER_MODE=live` on a developer machine, so
 * the guarantee that no real Steadfast booking can happen outside production
 * lives in `getCourierModeConfig()`. These tests exercise that guard directly
 * instead of trusting the text of an env file.
 */
registerHooks({
  resolve(specifier, context, nextResolve) {
    let target = specifier;
    if (target.startsWith("@/")) {
      target = pathToFileURL(`src/${target.slice(2)}`).href;
    }
    if (!/\.[cm]?[jt]s$/.test(target)) {
      target = `${target}.ts`;
    }
    return nextResolve(target, context);
  },
});

const { getCourierModeConfig } = await import("../src/server/courier/core/courier-mode.ts");

const COURIER_KEYS = [
  "APP_ENVIRONMENT",
  "NODE_ENV",
  "COURIER_MODE",
  "STEADFAST_LIVE_BOOKING_ENABLED",
  "STEADFAST_API_KEY",
  "STEADFAST_SECRET_KEY",
  "FORCE_LIVE_COURIER_TEST",
  "VITEST",
  "JEST_WORKER_ID",
];

/** Runs `fn` with a clean, explicit courier environment, then restores it. */
function withEnv(overrides, fn) {
  const saved = new Map();
  for (const key of COURIER_KEYS) {
    saved.set(key, process.env[key]);
    delete process.env[key];
  }

  try {
    Object.assign(process.env, overrides);
    return fn();
  } finally {
    for (const key of COURIER_KEYS) {
      const previous = saved.get(key);
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    }
  }
}

const LIVE_FLAGS = {
  COURIER_MODE: "live",
  STEADFAST_LIVE_BOOKING_ENABLED: "true",
  STEADFAST_API_KEY: "fake-key-for-test",
  STEADFAST_SECRET_KEY: "fake-secret-for-test",
};

test("courier guard: development never books live, even with live flags", () => {
  for (const appEnv of ["development", "preview", "test"]) {
    const config = withEnv({ ...LIVE_FLAGS, APP_ENVIRONMENT: appEnv }, getCourierModeConfig);
    assert.equal(config.mode, "mock", `${appEnv} must resolve to mock mode`);
    assert.equal(config.isLive, false, `${appEnv} must not be live`);
    assert.equal(config.liveBookingEnabled, false, `${appEnv} must not allow live booking`);
  }
});

test("courier guard: automated test runner is forced to mock in production", () => {
  const config = withEnv(
    { ...LIVE_FLAGS, APP_ENVIRONMENT: "production", NODE_ENV: "test" },
    getCourierModeConfig
  );
  assert.equal(config.mode, "mock");
  assert.equal(config.liveBookingEnabled, false);
});

test("courier guard: FORCE_LIVE_COURIER_TEST=false does not bypass the mock guard", () => {
  for (const raw of ["false", "0", "no", ""]) {
    const config = withEnv(
      { ...LIVE_FLAGS, APP_ENVIRONMENT: "development", FORCE_LIVE_COURIER_TEST: raw },
      getCourierModeConfig
    );
    assert.equal(config.mode, "mock", `FORCE_LIVE_COURIER_TEST="${raw}" must not enable live mode`);
    assert.equal(config.liveBookingEnabled, false);
  }
});

test("courier guard: FORCE_LIVE_COURIER_TEST=true is the only explicit escape hatch", () => {
  const config = withEnv(
    { ...LIVE_FLAGS, APP_ENVIRONMENT: "development", FORCE_LIVE_COURIER_TEST: "true" },
    getCourierModeConfig
  );
  assert.equal(config.mode, "live");
  assert.equal(config.liveBookingEnabled, true);
});

test("courier guard: production books live only with explicit opt-in and credentials", () => {
  const config = withEnv({ ...LIVE_FLAGS, APP_ENVIRONMENT: "production" }, getCourierModeConfig);
  assert.equal(config.mode, "live");
  assert.equal(config.isLive, true);
  assert.equal(config.liveBookingEnabled, true);
  assert.equal(config.hasCredentials, true);
});

test("courier guard: production blocks live booking when the opt-in flag is absent", () => {
  const config = withEnv(
    {
      APP_ENVIRONMENT: "production",
      COURIER_MODE: "live",
      STEADFAST_API_KEY: "fake-key-for-test",
      STEADFAST_SECRET_KEY: "fake-secret-for-test",
    },
    getCourierModeConfig
  );
  assert.equal(config.isLive, true);
  assert.equal(config.liveBookingEnabled, false);
  assert.match(config.reason || "", /STEADFAST_LIVE_BOOKING_ENABLED/);
});

test("courier guard: production without credentials never claims it can book", () => {
  const config = withEnv(
    {
      APP_ENVIRONMENT: "production",
      COURIER_MODE: "live",
      STEADFAST_LIVE_BOOKING_ENABLED: "true",
    },
    getCourierModeConfig
  );
  assert.equal(config.hasCredentials, false);
  assert.match(config.reason || "", /credentials/i);
});
