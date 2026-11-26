/**
 * ANGKON — Application Environment & Database Isolation Engine
 *
 * Implements strict environment boundaries between Production, Preview,
 * Development, and Test environments to guarantee zero shared writable database
 * access and strict safety containment.
 */

export type AppEnvironment = "production" | "preview" | "development" | "test";

export const APP_ENVIRONMENTS: readonly AppEnvironment[] = [
  "production",
  "preview",
  "development",
  "test",
] as const;

/**
 * Supported Application Databases for Manual Selection.
 * The operator explicitly chooses 'angkon_dev' or 'angkon' via DATABASE_URL.
 */
export const SUPPORTED_APPLICATION_DATABASES = [
  "angkon_dev",
  "angkon",
] as const;

export const ALL_SUPPORTED_DATABASES = [
  "angkon_dev",
  "angkon",
  "angkon_preview",
  "angkon_test",
] as const;

export type SupportedDatabase = typeof ALL_SUPPORTED_DATABASES[number];

/**
 * Authoritative Environment-to-Database Mapping
 *
 * Each environment is strictly mapped to its own isolated database:
 * - production  -> angkon
 * - development -> angkon_dev
 * - preview     -> angkon_preview
 * - test        -> angkon_test
 */
export const ENVIRONMENT_DATABASE_MAP: Record<AppEnvironment, string> = {
  production: "angkon",
  development: "angkon_dev",
  preview: "angkon_preview",
  test: "angkon_test",
};

/**
 * Resolves the active application environment.
 *
 * Resolution Order:
 * 1. APP_ENVIRONMENT (explicit operator override)
 * 2. VERCEL_ENV (automated Vercel hosting platform environment)
 * 3. NODE_ENV === "test" or testing frameworks -> "test"
 * 4. NODE_ENV === "production" -> "production"
 * 5. Default fallback -> "development"
 */
export function getAppEnvironment(): AppEnvironment {
  const explicit = process.env.APP_ENVIRONMENT?.trim().toLowerCase();
  if (explicit && explicit !== "undefined") {
    if (APP_ENVIRONMENTS.includes(explicit as AppEnvironment)) {
      return explicit as AppEnvironment;
    }
    throw new Error(
      `Invalid APP_ENVIRONMENT "${explicit}". Allowed values: ${APP_ENVIRONMENTS.join(", ")}`
    );
  }

  const vercelEnv = process.env.VERCEL_ENV?.trim().toLowerCase();
  if (vercelEnv && vercelEnv !== "undefined") {
    if (APP_ENVIRONMENTS.includes(vercelEnv as AppEnvironment)) {
      return vercelEnv as AppEnvironment;
    }
  }

  if (
    process.env.NODE_ENV === "test" ||
    Boolean(process.env.VITEST) ||
    Boolean(process.env.JEST_WORKER_ID)
  ) {
    return "test";
  }

  if (process.env.NODE_ENV === "production") {
    return "production";
  }

  return "development";
}

export function isProductionEnvironment(): boolean {
  return getAppEnvironment() === "production";
}

export function isDevelopmentEnvironment(): boolean {
  return getAppEnvironment() === "development";
}

export function isPreviewEnvironment(): boolean {
  return getAppEnvironment() === "preview";
}

export function isTestEnvironment(): boolean {
  return getAppEnvironment() === "test";
}

export interface ParsedMongoUri {
  protocol: string;
  host: string;
  databaseName: string;
  sanitizedUri: string;
}

/**
 * Parses and extracts database name and host from MongoDB connection URI without exposing credentials.
 */
export function parseMongoUri(rawUri: string): ParsedMongoUri {
  const uri = (rawUri || "").trim();
  if (!uri) {
    throw new Error("MongoDB connection URI is empty or not defined.");
  }

  const protocolMatch = uri.match(/^(mongodb(?:\+srv)?):\/\//);
  if (!protocolMatch) {
    throw new Error("Invalid MongoDB connection URI protocol. Must start with mongodb:// or mongodb+srv://");
  }
  const protocol = `${protocolMatch[1]}:`;

  try {
    const afterProto = uri.slice(protocolMatch[0].length);
    // Find path boundary (first slash after protocol)
    const pathIdx = afterProto.indexOf("/");
    const beforeSlash = pathIdx !== -1 ? afterProto.slice(0, pathIdx) : afterProto;
    const afterSlash = pathIdx !== -1 ? afterProto.slice(pathIdx + 1) : "";

    const atIdx = beforeSlash.lastIndexOf("@");
    const hostsPart = atIdx !== -1 ? beforeSlash.slice(atIdx + 1) : beforeSlash;
    const pathAndQuery = afterSlash.split("?")[0];
    const databaseName = pathAndQuery.split("/")[0].trim();

    if (!databaseName) {
      throw new Error("MongoDB connection URI does not specify a target database in its pathname.");
    }

    const sanitizedUri = `${protocol}//${hostsPart}/${databaseName}`;

    return {
      protocol,
      host: hostsPart,
      databaseName,
      sanitizedUri,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("MongoDB")) {
      throw err;
    }
    throw new Error(`Failed to parse MongoDB connection URI: ${(err as Error).message}`);
  }
}

export interface DatabaseValidationResult {
  valid: boolean;
  environment: AppEnvironment;
  expectedDatabase: string;
  actualDatabase: string;
  isProductionDatabase: boolean;
  productionWarning: string | null;
  sanitizedHost: string;
  uri: string;
  error?: string;
}

/**
 * Validates that the active database connection URI complies with environment isolation rules.
 *
 * Rules:
 * 1. Checks for conflicting connection variables (DATABASE_URL, MONGODB_URI, MONGODB_URL).
 * 2. Compares actual database against ALL_SUPPORTED_DATABASES.
 * 3. FORBIDS non-production environments (development, preview, test) from connecting to "angkon"
 *    unless explicitly authorized via ALLOW_PRODUCTION_DB_ACCESS=true.
 * 4. FORBIDS production from connecting to any database other than "angkon".
 * 5. Rejects any database mismatch rather than silently rewriting it.
 */
export function validateDatabaseConnection(
  explicitUri?: string,
  explicitEnv?: AppEnvironment
): DatabaseValidationResult {
  const env = explicitEnv || getAppEnvironment();
  const expectedDatabase = ENVIRONMENT_DATABASE_MAP[env];

  // Check conflicting variables if explicitUri is not provided
  if (!explicitUri) {
    const candidates = [
      { name: "DATABASE_URL", val: process.env.DATABASE_URL?.trim() },
      { name: "MONGODB_URI", val: process.env.MONGODB_URI?.trim() },
      { name: "MONGODB_URL", val: process.env.MONGODB_URL?.trim() },
    ].filter((c) => Boolean(c.val));

    if (candidates.length > 1) {
      const parsedList = candidates.map((c) => ({
        name: c.name,
        parsed: parseMongoUri(c.val!),
      }));

      const first = parsedList[0].parsed;
      for (let i = 1; i < parsedList.length; i++) {
        const other = parsedList[i];
        if (
          other.parsed.host !== first.host ||
          other.parsed.databaseName !== first.databaseName
        ) {
          const err = `Conflicting database connection strings: ${parsedList[0].name} points to "${first.databaseName}" on "${first.host}", but ${other.name} points to "${other.parsed.databaseName}" on "${other.parsed.host}". Set a single unambiguous connection variable.`;
          return {
            valid: false,
            environment: env,
            expectedDatabase,
            actualDatabase: first.databaseName,
            isProductionDatabase: first.databaseName === "angkon",
            productionWarning: null,
            sanitizedHost: first.host,
            uri: "",
            error: err,
          };
        }
      }
    }
  }

  const rawUri =
    explicitUri ||
    process.env.DATABASE_URL?.trim() ||
    process.env.MONGODB_URI?.trim() ||
    process.env.MONGODB_URL?.trim() ||
    "";

  if (!rawUri) {
    return {
      valid: false,
      environment: env,
      expectedDatabase,
      actualDatabase: "",
      isProductionDatabase: false,
      productionWarning: null,
      sanitizedHost: "",
      uri: "",
      error: `Missing database configuration. Define DATABASE_URL for environment "${env}".`,
    };
  }

  let parsed: ParsedMongoUri;
  try {
    parsed = parseMongoUri(rawUri);
  } catch (err: unknown) {
    return {
      valid: false,
      environment: env,
      expectedDatabase,
      actualDatabase: "",
      isProductionDatabase: false,
      productionWarning: null,
      sanitizedHost: "",
      uri: "",
      error: (err as Error).message,
    };
  }

  const actualDatabase = parsed.databaseName;
  const isProductionDatabase = actualDatabase === "angkon";
  const isCiDatabase = process.env.CI?.trim().toLowerCase() === "true" && actualDatabase === "angkon_ci";

  // RULE 0: Check supported database names
  const isRecognized = (ALL_SUPPORTED_DATABASES as readonly string[]).includes(actualDatabase) || isCiDatabase;
  if (!isRecognized) {
    return {
      valid: false,
      environment: env,
      expectedDatabase,
      actualDatabase,
      isProductionDatabase: false,
      productionWarning: null,
      sanitizedHost: parsed.host,
      uri: rawUri,
      error: `UNSUPPORTED_DATABASE: "${actualDatabase}" is not a recognized ANGKON database. Supported databases: ${SUPPORTED_APPLICATION_DATABASES.join(", ")}.`,
    };
  }

  // RULE 1: Non-production MUST NOT connect to production database "angkon" unless ALLOW_PRODUCTION_DB_ACCESS=true
  const allowProdDbAccess = process.env.ALLOW_PRODUCTION_DB_ACCESS?.trim().toLowerCase() === "true";
  if (env !== "production" && isProductionDatabase) {
    if (!allowProdDbAccess) {
      return {
        valid: false,
        environment: env,
        expectedDatabase,
        actualDatabase,
        isProductionDatabase: true,
        productionWarning: null,
        sanitizedHost: parsed.host,
        uri: rawUri,
        error: `CRITICAL ISOLATION VIOLATION: Environment "${env}" is configured with production database "angkon". Non-production environments must connect to their dedicated isolated database "${expectedDatabase}". Refusing unsafe connection. To explicitly allow manual production DB access, set ALLOW_PRODUCTION_DB_ACCESS=true.`,
      };
    }
  }

  // RULE 2: Production MUST connect to "angkon" (unless running CI build with angkon_ci)
  if (env === "production" && actualDatabase !== "angkon" && !isCiDatabase) {
    return {
      valid: false,
      environment: env,
      expectedDatabase,
      actualDatabase,
      isProductionDatabase: false,
      productionWarning: null,
      sanitizedHost: parsed.host,
      uri: rawUri,
      error: `CRITICAL PRODUCTION CONFIGURATION ERROR: Production environment requires database "angkon", but connection string specifies "${actualDatabase}".`,
    };
  }

  // RULE 3: Exact mapping match for standard isolation (unless ALLOW_PRODUCTION_DB_ACCESS or CI angkon_ci)
  if (
    actualDatabase !== expectedDatabase &&
    !(env !== "production" && isProductionDatabase && allowProdDbAccess) &&
    !isCiDatabase
  ) {
    return {
      valid: false,
      environment: env,
      expectedDatabase,
      actualDatabase,
      isProductionDatabase,
      productionWarning: null,
      sanitizedHost: parsed.host,
      uri: rawUri,
      error: `Database isolation mismatch for environment "${env}": expected database "${expectedDatabase}", but connection string specifies "${actualDatabase}".`,
    };
  }

  const productionWarning = isProductionDatabase
    ? env === "production"
      ? "⚠️ [SECURITY WARNING] ACTIVE DATABASE IS PRODUCTION: 'angkon'. Any modifications affect real production data!"
      : `⚠️ [SECURITY WARNING] ACTIVE DATABASE IS PRODUCTION: 'angkon' running under non-production environment '${env}' with ALLOW_PRODUCTION_DB_ACCESS=true. Extreme caution advised!`
    : null;

  return {
    valid: true,
    environment: env,
    expectedDatabase,
    actualDatabase,
    isProductionDatabase,
    productionWarning,
    sanitizedHost: `${parsed.host}/${actualDatabase}`,
    uri: rawUri,
  };
}

/**
 * A safe, credential-free snapshot of the runtime environment.
 *
 * This is the single source of truth for any UI that shows an environment
 * badge. It resolves the environment with `getAppEnvironment()` (the same
 * resolver used by the database isolation guard and the Meta CAPI dispatcher)
 * and reports the database the process is actually connected to.
 */
export interface RuntimeEnvironmentInfo {
  environment: AppEnvironment;
  expectedDatabase: string;
  actualDatabase: string;
  isProductionDatabase: boolean;
  productionWarning: string | null;
  sanitizedHost: string;
  isolationValid: boolean;
  /** True when the process is a development server (`next dev`). */
  isDevServer: boolean;
  isVercel: boolean;
}

export function getRuntimeEnvironmentInfo(): RuntimeEnvironmentInfo {
  const environment = getAppEnvironment();
  // `next dev` forces NODE_ENV=development even when APP_ENVIRONMENT says
  // production. That combination is what produces a "production database on a
  // development server" split-brain, so surface it explicitly.
  const isDevServer = process.env.NODE_ENV !== "production";
  const isVercel = Boolean(process.env.VERCEL);

  try {
    const validation = validateDatabaseConnection();
    return {
      environment: validation.environment,
      expectedDatabase: validation.expectedDatabase,
      actualDatabase: validation.actualDatabase || "unknown",
      isProductionDatabase: Boolean(validation.isProductionDatabase),
      productionWarning: validation.productionWarning || null,
      sanitizedHost: validation.sanitizedHost || "unknown",
      isolationValid: validation.valid,
      isDevServer,
      isVercel,
    };
  } catch {
    return {
      environment,
      expectedDatabase: ENVIRONMENT_DATABASE_MAP[environment],
      actualDatabase: "unknown",
      isProductionDatabase: false,
      productionWarning: null,
      sanitizedHost: "unknown",
      isolationValid: false,
      isDevServer,
      isVercel,
    };
  }
}
