/**
 * Pure helpers for MongoDB SRV DNS failure classification.
 * Kept import-free so they can be unit-tested without loading Mongoose.
 */

export function isSrvResolutionError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : String((error as { message?: string })?.message || error || "");

  if (/querySrv|queryTxt|_mongodb\._tcp|serverselection.*srv/i.test(message)) {
    return true;
  }

  return /ENOTFOUND|EAI_AGAIN|ESERVFAIL|EREFUSED/i.test(message);
}

export function isTransientDatabaseError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String((error as { message?: string })?.message || error || "");

  return (
    message.includes("MONGODB_CONNECTION_COOLDOWN") ||
    message.includes("MONGODB_CONNECTION_NOT_READY") ||
    isSrvResolutionError(error) ||
    /MongoNetworkError|MongoServerSelectionError|ETIMEDOUT|ECONNRESET|ECONNREFUSED/i.test(
      message
    )
  );
}
