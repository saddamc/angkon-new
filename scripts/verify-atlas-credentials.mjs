/**
 * ANGKON — Atlas dedicated credential and role isolation verification.
 *
 * Read-only authorization checks:
 * 1. the exact environment-specific connection variable is present;
 * 2. the connection string points at the expected database;
 * 3. the authenticated principal is the expected user;
 * 4. the user has exactly the intended database role;
 * 5. no atlasAdmin / global / anyResource privilege is present;
 * 6. the assigned database is readable;
 * 7. a different database is denied by the MongoDB engine (code 13).
 *
 * Any missing credential is NOT VERIFIED. Any failed or unverified check
 * produces a non-zero exit status. Credentials and full URIs are never logged.
 *
 * Run: npm run verify:atlas-credentials
 */

import { MongoClient } from "mongodb";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const APP_ENVIRONMENTS = ["development", "preview", "test", "production"];

/**
 * One exact variable per environment. There are deliberately no aliases,
 * no `DATABASE_URL` fallback and no cross-account fallback.
 */
export const ACCOUNTS = [
  {
    name: "angkon_dev_app",
    environment: "development",
    role: "readWrite@angkon_dev",
    targetDb: "angkon_dev",
    forbiddenDb: "angkon",
    envVar: "ANGKON_DEV_DATABASE_URL",
  },
  {
    name: "angkon_preview_app",
    environment: "preview",
    role: "readWrite@angkon_preview",
    targetDb: "angkon_preview",
    forbiddenDb: "angkon",
    envVar: "ANGKON_PREVIEW_DATABASE_URL",
  },
  {
    name: "angkon_test_app",
    environment: "test",
    role: "readWrite@angkon_test",
    targetDb: "angkon_test",
    forbiddenDb: "angkon",
    envVar: "ANGKON_TEST_DATABASE_URL",
  },
  {
    name: "angkon_prod_app",
    environment: "production",
    role: "readWrite@angkon",
    targetDb: "angkon",
    forbiddenDb: "angkon_dev",
    envVar: "ANGKON_PROD_DATABASE_URL",
  },
];

const BROAD_ROLE_PATTERN =
  /(^|@)(atlasAdmin|root|clusterAdmin|clusterManager|hostManager|dbAdminAnyDatabase|userAdminAnyDatabase|readAnyDatabase|readWriteAnyDatabase|backup|restore)(@|$)/i;

function sanitizeMessage(input) {
  return String(input || "")
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"']+/gi, "[redacted-uri]")
    .replace(/(password\s*[=:]\s*)[^&\s,;"']+/gi, "$1[redacted]")
    .replace(/(store_passwd\s*[=:]\s*)[^&\s,;"']+/gi, "$1[redacted]")
    .slice(0, 300);
}

export function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const full = path.resolve(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, raw] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = raw.replace(/^["']|["']$/g, "").trim();
    }
  }
}

/** Extracts the database path from a Mongo URI without exposing credentials. */
export function parseDatabaseName(uri) {
  try {
    const parsed = new URL(uri);
    const name = decodeURIComponent(parsed.pathname.replace(/^\//, "")).trim();
    return name || null;
  } catch {
    return null;
  }
}

function normalizeRole(role) {
  return `${String(role?.role || "").trim()}@${String(role?.db || "").trim()}`;
}

function isBroadRole(roleString) {
  return BROAD_ROLE_PATTERN.test(roleString);
}

function hasBroadPrivilege(privileges) {
  if (!Array.isArray(privileges)) return false;
  return privileges.some((privilege) => {
    const resource = privilege?.resource || {};
    const actions = Array.isArray(privilege?.actions) ? privilege.actions : [];
    if (resource.anyResource === true || resource.cluster === true) return true;
    if (actions.some((action) => String(action).toLowerCase() === "anyaction")) return true;
    if (String(resource.db || "") === "") return true;
    return false;
  });
}

/**
 * Evaluates the server-reported principal. Pure function so tests can exercise
 * every failure mode without a database.
 */
export function evaluatePrincipal(account, status) {
  const checks = [];
  const authInfo = status?.authInfo || {};

  const authenticatedUser = String(authInfo.authenticatedUsers?.[0]?.user || "").trim();
  checks.push({
    id: "authenticated_user",
    passed: authenticatedUser === account.name,
    detail:
      authenticatedUser === account.name
        ? `authenticated as ${authenticatedUser}`
        : `authenticated as "${authenticatedUser || "unknown"}", expected "${account.name}"`,
  });

  const roles = Array.isArray(authInfo.authenticatedUserRoles)
    ? authInfo.authenticatedUserRoles.map(normalizeRole)
    : [];

  const exactRole = roles.length === 1 && roles[0] === account.role;
  checks.push({
    id: "exact_role",
    passed: exactRole,
    detail: exactRole
      ? `role ${account.role}`
      : `roles [${roles.join(", ") || "none"}], expected exactly [${account.role}]`,
  });

  const broadRoles = roles.filter(isBroadRole);
  const broadPrivileges = hasBroadPrivilege(authInfo.authenticatedUserPrivileges);
  const noBroadPrivileges = broadRoles.length === 0 && !broadPrivileges;
  checks.push({
    id: "no_broad_privileges",
    passed: noBroadPrivileges,
    detail: noBroadPrivileges
      ? "no atlasAdmin/global/anyResource privilege"
      : `broad privilege detected (${[
          broadRoles.length ? `roles: ${broadRoles.join(", ")}` : "",
          broadPrivileges ? "anyResource/anyAction privilege" : "",
        ]
          .filter(Boolean)
          .join("; ")})`,
  });

  return { authenticatedUser, roles, checks };
}

export function evaluateAccount(account, { uri, status, ownDbRead, ownDbError, crossDbDenied, crossDbError }) {
  const checks = [];
  const databaseName = parseDatabaseName(uri);

  checks.push({
    id: "connection_variable",
    passed: Boolean(uri),
    detail: uri ? `${account.envVar} is set` : `${account.envVar} is missing`,
  });

  checks.push({
    id: "database_name",
    passed: databaseName === account.targetDb,
    detail:
      databaseName === account.targetDb
        ? `database ${account.targetDb}`
        : `database "${databaseName || "missing"}", expected "${account.targetDb}"`,
  });

  const principal = status
    ? evaluatePrincipal(account, status)
    : {
        authenticatedUser: null,
        roles: [],
        checks: [
          {
            id: "authenticated_user",
            passed: false,
            detail: "connectionStatus did not return an authenticated principal",
          },
        ],
      };
  checks.push(...principal.checks);

  checks.push({
    id: "own_db_read",
    passed: ownDbRead === true,
    detail:
      ownDbRead === true
        ? `read allowed on ${account.targetDb}`
        : `read denied/failed on ${account.targetDb}${ownDbError ? `: ${sanitizeMessage(ownDbError)}` : ""}`,
  });

  checks.push({
    id: "cross_db_denied",
    passed: crossDbDenied === true,
    detail:
      crossDbDenied === true
        ? `access to ${account.forbiddenDb} denied by MongoDB (code 13)`
        : `access to ${account.forbiddenDb} was not engine-denied${
            crossDbError ? `: ${sanitizeMessage(crossDbError)}` : ""
          }`,
  });

  const failed = checks.filter((check) => !check.passed);
  return {
    name: account.name,
    environment: account.environment,
    intendedRole: account.role,
    targetDb: account.targetDb,
    status: failed.length === 0 ? "PASS" : "FAIL",
    checks,
    failed,
    authUser: principal.authenticatedUser,
    authRoles: principal.roles,
  };
}

export async function verifyAccount(account, options = {}) {
  const env = options.env || process.env;
  const createClient =
    options.createClient ||
    ((uri) => new MongoClient(uri, { serverSelectionTimeoutMS: 5000 }));

  const uri = String(env[account.envVar] || "").trim();
  if (!uri) {
    return {
      name: account.name,
      environment: account.environment,
      intendedRole: account.role,
      targetDb: account.targetDb,
      status: "NOT_VERIFIED",
      checks: [
        {
          id: "connection_variable",
          passed: false,
          detail: `${account.envVar} is missing; refusing to use DATABASE_URL or any other legacy credential`,
        },
      ],
      failed: [],
      authUser: null,
      authRoles: [],
    };
  }

  let client;
  try {
    client = createClient(uri);
    await client.connect();
  } catch (error) {
    return {
      name: account.name,
      environment: account.environment,
      intendedRole: account.role,
      targetDb: account.targetDb,
      status: "FAIL",
      checks: [
        {
          id: "connection",
          passed: false,
          detail: `Could not authenticate: ${sanitizeMessage(error?.message || error)}`,
        },
      ],
      failed: [],
      authUser: null,
      authRoles: [],
    };
  }

  try {
    const ownDb = client.db(account.targetDb);
    let status = null;
    let statusError = null;
    try {
      status = await ownDb.command({ connectionStatus: 1, showPrivileges: true });
    } catch (error) {
      statusError = error;
    }

    let ownDbRead = false;
    let ownDbError = null;
    try {
      await ownDb.collection("products").findOne({}, { projection: { _id: 1 } });
      ownDbRead = true;
    } catch (error) {
      ownDbError = sanitizeMessage(error?.message || error);
    }

    let crossDbDenied = false;
    let crossDbError = null;
    try {
      const forbidden = client.db(account.forbiddenDb);
      await forbidden.collection("products").findOne({}, { projection: { _id: 1 } });
      crossDbError = "read was allowed";
    } catch (error) {
      const code = error?.code;
      const message = String(error?.message || "");
      if (code === 13 || /not authorized|unauthorized/i.test(message)) {
        crossDbDenied = true;
      } else {
        crossDbError = sanitizeMessage(message);
      }
    }

    const result = evaluateAccount(account, {
      uri,
      status: status || { authInfo: { authenticatedUsers: [], authenticatedUserRoles: [] } },
      ownDbRead,
      ownDbError: statusError ? sanitizeMessage(statusError.message) : ownDbError,
      crossDbDenied,
      crossDbError,
    });

    if (statusError && result.status === "PASS") {
      result.status = "FAIL";
      result.failed = [
        ...result.failed,
        { id: "connection_status", detail: "connectionStatus failed" },
      ];
    }

    return result;
  } finally {
    await client.close().catch(() => {});
  }
}

export async function runVerification(options = {}) {
  const accounts = options.accounts || ACCOUNTS;
  const env = options.env || process.env;
  const logger = options.logger || console;
  const results = [];

  logger.log("================================================================================");
  logger.log(" ANGKON — Atlas Credential, Role & Cross-Database Isolation Audit");
  logger.log("================================================================================");

  for (const account of accounts) {
    logger.log(`\nChecking ${account.name} (${account.role}) [${account.environment}]...`);
    const result = await verifyAccount(account, { ...options, env });
    results.push(result);

    if (result.status === "PASS") {
      logger.log(`  [PASS] Authenticated user: ${result.authUser}`);
      logger.log(`  [PASS] Roles: ${result.authRoles.join(", ")}`);
      for (const check of result.checks) {
        if (check.id !== "authenticated_user" && check.id !== "exact_role") {
          logger.log(`  [PASS] ${check.detail}`);
        }
      }
    } else if (result.status === "NOT_VERIFIED") {
      logger.log("  [NOT VERIFIED]");
      for (const check of result.checks) logger.log(`    - ${check.detail}`);
    } else {
      logger.log("  [FAIL]");
      for (const check of result.failed.length ? result.failed : result.checks) {
        logger.log(`    - ${check.detail}`);
      }
    }
  }

  const failures = results.filter((result) => result.status !== "PASS");
  logger.log(
    `\nSummary: ${results.length - failures.length}/${results.length} accounts PASS; ${failures.length} failed or not verified.`
  );

  return {
    results,
    exitCode: failures.length === 0 ? 0 : 1,
  };
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  loadEnv();
  runVerification()
    .then(({ exitCode }) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error("[FAIL] Verification crashed:", sanitizeMessage(error?.message || error));
      process.exitCode = 1;
    });
}
