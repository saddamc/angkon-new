import test from "node:test";
import assert from "node:assert/strict";
import {
  ACCOUNTS,
  verifyAccount,
  evaluatePrincipal,
  runVerification,
} from "../scripts/verify-atlas-credentials.mjs";

const DEV = ACCOUNTS.find((account) => account.environment === "development");
const URI = "mongodb+srv://angkon_dev_app:secret@cluster.example/angkon_dev";

function statusFor({
  user = DEV.name,
  roles = [{ role: "readWrite", db: DEV.targetDb }],
  privileges = [
    {
      resource: { db: DEV.targetDb, collection: "" },
      actions: ["find", "insert", "update", "remove"],
    },
  ],
} = {}) {
  return {
    authInfo: {
      authenticatedUsers: [{ user }],
      authenticatedUserRoles: roles,
      authenticatedUserPrivileges: privileges,
    },
  };
}

function fakeClient({ status = statusFor(), ownRead = true, crossRead = false } = {}) {
  return {
    async connect() {},
    async close() {},
    db(name) {
      return {
        async command() {
          return status;
        },
        collection() {
          return {
            async findOne() {
              if (name === DEV.targetDb) {
                if (ownRead === false) {
                  const err = new Error("not authorized on angkon_dev");
                  err.code = 13;
                  throw err;
                }
                return { _id: 1 };
              }
              if (crossRead) return { _id: 1 };
              const err = new Error("not authorized");
              err.code = 13;
              throw err;
            },
          };
        },
      };
    },
  };
}

async function run(overrides = {}, env = { [DEV.envVar]: URI }) {
  return verifyAccount(DEV, {
    env,
    createClient: () => fakeClient(overrides),
  });
}

test("correct restricted user passes every check", async () => {
  const result = await run();
  assert.equal(result.status, "PASS");
  assert.equal(result.authUser, DEV.name);
  assert.deepEqual(result.authRoles, [DEV.role]);
  assert.equal(result.failed.length, 0);
});

test("wrong authenticated username fails even when the connection works", async () => {
  const result = await run({
    status: statusFor({
      user: "saddam15bds_db_user",
      roles: [{ role: "atlasAdmin", db: "admin" }],
      privileges: [{ resource: { anyResource: true }, actions: ["anyAction"] }],
    }),
  });
  assert.equal(result.status, "FAIL");
  const ids = result.failed.map((check) => check.id);
  assert.ok(ids.includes("authenticated_user"));
  assert.ok(ids.includes("exact_role"));
  assert.ok(ids.includes("no_broad_privileges"));
});

test("legacy atlasAdmin account fails despite successful authentication", async () => {
  const result = await run({
    status: statusFor({
      user: DEV.name,
      roles: [{ role: "atlasAdmin", db: "admin" }],
      privileges: [{ resource: { anyResource: true }, actions: ["anyAction"] }],
    }),
  });
  assert.equal(result.status, "FAIL");
  const ids = result.failed.map((check) => check.id);
  assert.ok(ids.includes("exact_role"));
  assert.ok(ids.includes("no_broad_privileges"));
});

test("anyResource privilege fails even with the expected role name", async () => {
  const result = await run({
    status: statusFor({
      privileges: [{ resource: { anyResource: true }, actions: ["find"] }],
    }),
  });
  assert.equal(result.status, "FAIL");
  assert.ok(result.failed.some((check) => check.id === "no_broad_privileges"));
});

test("missing exact connection variable is NOT VERIFIED", async () => {
  const result = await verifyAccount(DEV, { env: {}, createClient: () => fakeClient() });
  assert.equal(result.status, "NOT_VERIFIED");
  assert.match(result.checks[0].detail, /ANGKON_DEV_DATABASE_URL/);
});

test("DATABASE_URL and legacy aliases are never used as fallback", async () => {
  const result = await verifyAccount(DEV, {
    env: { DATABASE_URL: URI, DEV_DATABASE_URL: URI },
    createClient: () => fakeClient(),
  });
  assert.equal(result.status, "NOT_VERIFIED");
  assert.match(result.checks[0].detail, /refusing to use DATABASE_URL/);
});

test("wrong database name fails", async () => {
  const result = await verifyAccount(DEV, {
    env: { [DEV.envVar]: "mongodb+srv://angkon_dev_app:secret@cluster.example/angkon_preview" },
    createClient: () => fakeClient(),
  });
  assert.equal(result.status, "FAIL");
  assert.ok(result.failed.some((check) => check.id === "database_name"));
});

test("cross-database read permission fails", async () => {
  const result = await run({ crossRead: true });
  assert.equal(result.status, "FAIL");
  assert.ok(result.failed.some((check) => check.id === "cross_db_denied"));
});

test("own database read denial fails", async () => {
  const result = await run({ ownRead: false });
  assert.equal(result.status, "FAIL");
  assert.ok(result.failed.some((check) => check.id === "own_db_read"));
});

test("principal evaluator reports broad roles explicitly", () => {
  const evaluation = evaluatePrincipal(
    DEV,
    statusFor({
      roles: [{ role: "readWriteAnyDatabase", db: "admin" }],
      privileges: [],
    })
  );
  assert.equal(evaluation.checks.find((check) => check.id === "exact_role").passed, false);
  assert.equal(
    evaluation.checks.find((check) => check.id === "no_broad_privileges").passed,
    false
  );
});

test("runner exit code is non-zero for missing credentials, failures, and zero on PASS", async () => {
  const logger = { log() {} };
  const missing = await runVerification({ accounts: [DEV], env: {}, logger });
  assert.equal(missing.exitCode, 1);
  assert.equal(missing.results[0].status, "NOT_VERIFIED");

  const failed = await runVerification({
    accounts: [DEV],
    env: { [DEV.envVar]: URI },
    createClient: () =>
      fakeClient({
        status: statusFor({
          user: "saddam15bds_db_user",
          roles: [{ role: "atlasAdmin", db: "admin" }],
          privileges: [{ resource: { anyResource: true }, actions: ["anyAction"] }],
        }),
      }),
    logger,
  });
  assert.equal(failed.exitCode, 1);
  assert.equal(failed.results[0].status, "FAIL");

  const pass = await runVerification({
    accounts: [DEV],
    env: { [DEV.envVar]: URI },
    createClient: () => fakeClient(),
    logger,
  });
  assert.equal(pass.exitCode, 0);
  assert.equal(pass.results[0].status, "PASS");
});
