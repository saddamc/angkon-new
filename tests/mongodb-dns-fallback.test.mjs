import test from "node:test";
import assert from "node:assert/strict";
import {
  isSrvResolutionError,
  isTransientDatabaseError,
} from "../src/lib/mongodb-dns.ts";

test("SRV resolver refusal is classified as a DNS failure", () => {
  const error = new Error(
    "querySrv ECONNREFUSED _mongodb._tcp.cluster0.example.mongodb.net"
  );
  assert.equal(isSrvResolutionError(error), true);
  assert.equal(isTransientDatabaseError(error), true);
});

test("ENOTFOUND/EAI_AGAIN are DNS failures", () => {
  assert.equal(isSrvResolutionError(new Error("querySrv ENOTFOUND _mongodb._tcp.x")), true);
  assert.equal(isSrvResolutionError(new Error("EAI_AGAIN")), true);
  assert.equal(isSrvResolutionError(new Error("queryTxt ESERVFAIL x")), true);
});

test("application validation errors are not treated as DNS/transient", () => {
  assert.equal(
    isSrvResolutionError(new Error("Database isolation mismatch for environment")),
    false
  );
  assert.equal(
    isTransientDatabaseError(new Error("Invalid APP_ENVIRONMENT")),
    false
  );
});

test("connection cooldown is transient, not a fatal error", () => {
  assert.equal(isTransientDatabaseError(new Error("MONGODB_CONNECTION_COOLDOWN")), true);
});

test("database socket errors are transient but not DNS errors", () => {
  const error = new Error("MongoNetworkError: connect ECONNREFUSED 127.0.0.1:27017");
  assert.equal(isSrvResolutionError(error), false);
  assert.equal(isTransientDatabaseError(error), true);
});
