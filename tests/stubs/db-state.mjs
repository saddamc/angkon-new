/**
 * Shared mutable state for the fake Mongo layer used by the catalog feed tests.
 *
 * The feed route resolves `@/lib/mongodb` and `@/models/Product` to stubs (see
 * `catalog-feed-eligibility.test.mjs`), so tests can drive the exact document
 * set the route sees without touching a real database.
 */

export const state = {
  docs: [],
  shouldFail: false,
  connects: 0,
};

/** Replaces the fake collection contents with a plain list of product documents. */
export function setProducts(docs) {
  state.docs = docs.map((doc) => ({ ...doc }));
  state.shouldFail = false;
}

/** Makes the next connection attempt throw, simulating an unreachable database. */
export function setDatabaseFailure(shouldFail = true) {
  state.shouldFail = shouldFail;
}

export function resetDb() {
  state.docs = [];
  state.shouldFail = false;
  state.connects = 0;
}
